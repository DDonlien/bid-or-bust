import {
  CATALOG_ITEMS,
  CHARACTERS,
  getCharacter,
  getItem,
  getSkill,
  getVenue,
} from "./catalog";
import { generateMatchLots, shapeSize } from "./containerGenerator";
import { hashSeed, Random, roundTo } from "./rng";
import type {
  AuctionPlayerState,
  AuctionResult,
  AuctionState,
  BidAction,
  ContainerLot,
  EngineResult,
  GameState,
  Intel,
  ItemCategory,
  ItemQuality,
  KeptItem,
  MaterialTag,
  PlayerId,
  PlayerState,
} from "./types";

const DEFAULT_PLAYER_NAMES = ["Mara", "Boone", "Pike", "Nell"];
const DIRECT_SALE_RATIOS: Record<number, number> = {
  1: 2,
  2: 1.6,
  3: 1.3,
  4: 1.1,
};

export function createDemoGame(
  seed = "bid-or-bust-demo",
  venueId = "rusty-harbor",
): GameState {
  const venue = getVenue(venueId);
  const config = {
    entryFee: venue.entryFee,
    bidStep: venue.bidStep,
    maxRounds: 5,
    lotCount: venue.lotCount,
    startingCash: Math.max(60000, venue.entryFee + venue.escrowFunds * 2),
  };
  const generated = generateMatchLots(seed, venue);
  const players: PlayerState[] = DEFAULT_PLAYER_NAMES.map((name, index) => ({
    id: `p${index + 1}`,
    name,
    totalCash: config.startingCash - venue.entryFee - venue.escrowFunds,
    escrow: venue.escrowFunds,
    characterId: CHARACTERS[index % CHARACTERS.length].id,
    isBroke: false,
    warehouse: [],
  }));

  return {
    version: 2,
    seed,
    rngState: hashSeed(`${seed}:engine`),
    phase: "lobby",
    config,
    venue,
    players,
    lots: generated.lots,
    lotIndex: -1,
    referenceLotValueRange: generated.referenceLotValueRange,
    realizedValue: 0,
    log: [
      {
        id: "log-0",
        text: `${venue.name} seats are paid. Entry $${venue.entryFee}, escrow $${venue.escrowFunds}.`,
        tone: "system",
      },
    ],
  };
}

export function startNextLot(state: GameState): EngineResult {
  if (state.lotIndex + 1 >= state.lots.length) {
    state.phase = "game-over";
    state.auction = undefined;
    state.players.forEach((player) => {
      player.totalCash += player.escrow;
      player.escrow = 0;
    });
    markBrokePlayers(state);
    addLog(state, "The auction session closes. Escrow returns to each bidder.", "system");
    return ok(state, "Session complete.");
  }

  state.lotIndex += 1;
  const lot = state.lots[state.lotIndex];
  const activePlayerIds = state.players
    .filter((player) => !player.isBroke && player.escrow > 0)
    .map((player) => player.id);

  state.auction = createAuctionState(state, lot, activePlayerIds);
  state.phase = "auction";
  publishRoundPublicIntel(state, state.auction);
  refreshAuctionDerivedState(state);
  addLog(
    state,
    `Lot ${state.lotIndex + 1}/${state.config.lotCount}: ${lot.name}. Starting bid $${lot.openingBid}.`,
    "system",
  );

  if (activePlayerIds.length === 0) {
    state.phase = "game-over";
    addLog(state, "No bidder has escrow left for the next lot.", "warning");
  }

  return ok(state, `Started ${lot.name}.`);
}

export function lookAtItem(
  state: GameState,
  playerId: PlayerId,
  itemInstanceId: string,
): EngineResult {
  const auction = requireAuction(state);
  const playerAuction = getAuctionPlayer(auction, playerId);
  if (!playerAuction.active) {
    return fail(state, "Only active bidders can inspect this lot.");
  }
  if (playerAuction.lookUsedThisRound) {
    return fail(state, "This player already used the private look for this round.");
  }
  const item = auction.lot.items.find((entry) => entry.instanceId === itemInstanceId);
  if (!item) {
    return fail(state, "That item is not in this lot.");
  }

  const catalog = getItem(item.catalogId);
  const intel = makeIntel(state, auction, playerId, {
    kind: "item-identity",
    source: "free-look",
    title: catalog.name,
    detail: `${qualityLabel(catalog.quality)} ${catalog.category}, appraised at $${item.value}. ${catalog.flavor}`,
    itemInstanceId,
    quality: catalog.quality,
    category: catalog.category,
    material: catalog.material,
    minValue: item.value,
  });
  playerAuction.lookUsedThisRound = true;
  auction.privateIntel[playerId].push(intel);
  refreshAuctionDerivedState(state);
  addLog(state, `${playerName(state, playerId)} privately checks one silhouette.`, "intel");
  return ok(state, `${catalog.name} revealed to ${playerName(state, playerId)}.`);
}

export function useRandomSkill(state: GameState, playerId: PlayerId): EngineResult {
  const auction = requireAuction(state);
  const player = getPlayer(state, playerId);
  const playerAuction = getAuctionPlayer(auction, playerId);
  if (!playerAuction.active) {
    return fail(state, "Only active bidders can use a skill.");
  }
  if (playerAuction.skillUsedThisRound) {
    return fail(state, "This player already used a skill this round.");
  }

  const character = getCharacter(player.characterId);
  const rng = Random.fromState(state.rngState);
  const skill = getSkill(rng.pick(character.skillIds));
  state.rngState = rng.getState();
  const intel = resolveSkillIntel(state, auction, playerId, skill.kind);
  playerAuction.skillUsedThisRound = true;
  auction.privateIntel[playerId].push(intel);

  if (auction.round < state.config.maxRounds) {
    auction.delayedIntel.push({
      ...intel,
      source: "public-leak",
      revealAtRound: auction.round + 1,
    });
  }

  refreshAuctionDerivedState(state);
  addLog(
    state,
    `${playerName(state, playerId)} uses a sealed skill. The room sees the tell, not the read.`,
    "intel",
  );
  return ok(state, `${skill.name}: ${intel.title}`);
}

export function beginBidding(state: GameState): EngineResult {
  const auction = requireAuction(state);
  if (auction.status !== "inspection") {
    return fail(state, "Bidding is already active for this round.");
  }
  if (auction.activePlayerIds.length <= 1) {
    return sellAuction(state, auction.activePlayerIds[0], "Only one bidder stayed in.");
  }

  auction.status = "bidding";
  auction.pendingPlayerIds = [...auction.activePlayerIds];
  auction.currentTurnPlayerId = auction.pendingPlayerIds[0];
  addLog(state, `Round ${auction.round} commitments open.`, "bid");
  return ok(state, `Waiting on ${playerName(state, auction.currentTurnPlayerId)}.`);
}

export function submitBidAction(
  state: GameState,
  playerId: PlayerId,
  action: BidAction,
): EngineResult {
  const auction = requireAuction(state);
  if (auction.status !== "bidding") {
    return fail(state, "Bidding has not started for this round.");
  }
  if (auction.currentTurnPlayerId !== playerId) {
    return fail(state, `It is ${playerName(state, auction.currentTurnPlayerId)}'s turn.`);
  }
  const playerAuction = getAuctionPlayer(auction, playerId);
  if (!playerAuction.active) {
    return fail(state, "This bidder already folded.");
  }

  if (action.type === "hold") {
    return holdBid(state, playerId);
  }
  if (action.type === "raise") {
    return raiseBid(state, playerId, action.steps);
  }
  if (action.type === "all-in") {
    return allInBid(state, playerId);
  }
  return foldBid(state, playerId);
}

export function visibleIntelForPlayer(
  state: GameState,
  playerId: PlayerId,
): Intel[] {
  const auction = state.auction;
  if (!auction) {
    return [];
  }
  return [...auction.publicIntel, ...(auction.privateIntel[playerId] ?? [])];
}

export function itemIsKnownToPlayer(
  state: GameState,
  playerId: PlayerId,
  itemInstanceId: string,
): boolean {
  if (state.auction?.status === "sold") {
    return true;
  }
  return visibleIntelForPlayer(state, playerId).some(
    (intel) =>
      intel.itemInstanceId === itemInstanceId &&
      ["item-identity", "cheapest-item"].includes(intel.kind),
  );
}

export function getCommitment(state: GameState, playerId: PlayerId): number {
  return state.auction?.playerStates[playerId]?.commitmentBid ?? 0;
}

function holdBid(state: GameState, playerId: PlayerId): EngineResult {
  const auction = requireAuction(state);
  removePending(auction, playerId);
  addLog(state, `${playerName(state, playerId)} holds at $${getCommitment(state, playerId)}.`, "bid");
  if (!auction.currentTurnPlayerId) {
    return concludeBiddingRound(state);
  }
  return ok(state, "Held commitment.");
}

function raiseBid(
  state: GameState,
  playerId: PlayerId,
  rawSteps: number,
): EngineResult {
  const auction = requireAuction(state);
  const player = getPlayer(state, playerId);
  const playerAuction = getAuctionPlayer(auction, playerId);
  const steps = Math.max(1, Math.floor(rawSteps));
  const current = playerAuction.commitmentBid;
  const newBid =
    current === 0
      ? auction.lot.openingBid + (steps - 1) * state.config.bidStep
      : current + steps * state.config.bidStep;

  if (newBid <= current) {
    return fail(state, "Raise must increase your commitment.");
  }
  if (newBid > player.escrow) {
    return fail(state, `${player.name} cannot commit $${newBid}; escrow is $${player.escrow}.`);
  }

  playerAuction.commitmentBid = newBid;
  auction.roundRaises += 1;
  refreshAuctionDerivedState(state);
  removePending(auction, playerId);
  addLog(state, `${player.name} raises commitment to $${newBid}.`, "bid");

  if (!auction.currentTurnPlayerId) {
    return concludeBiddingRound(state);
  }
  return ok(state, `Raised to $${newBid}.`);
}

function allInBid(state: GameState, playerId: PlayerId): EngineResult {
  const auction = requireAuction(state);
  const player = getPlayer(state, playerId);
  const playerAuction = getAuctionPlayer(auction, playerId);
  if (player.escrow <= playerAuction.commitmentBid) {
    return fail(state, "All-in requires remaining escrow above your commitment.");
  }

  playerAuction.commitmentBid = player.escrow;
  playerAuction.allIn = true;
  auction.roundRaises += 1;
  refreshAuctionDerivedState(state);
  addLog(state, `${player.name} goes ALL-IN at $${player.escrow}.`, "warning");

  const uniqueHighest = uniqueHighestPlayerId(auction);
  if (uniqueHighest === playerId) {
    return sellAuction(state, playerId, "All-in locks the lot.");
  }

  removePending(auction, playerId);
  if (!auction.currentTurnPlayerId) {
    return concludeBiddingRound(state);
  }
  return ok(state, "All-in committed, but it is not the unique high bid.");
}

function foldBid(state: GameState, playerId: PlayerId): EngineResult {
  const auction = requireAuction(state);
  const playerAuction = getAuctionPlayer(auction, playerId);
  playerAuction.active = false;
  playerAuction.folded = true;
  auction.activePlayerIds = auction.activePlayerIds.filter((id) => id !== playerId);
  auction.foldedPlayerIds.push(playerId);
  removePending(auction, playerId);
  refreshAuctionDerivedState(state);
  addLog(state, `${playerName(state, playerId)} folds out of this lot.`, "bid");

  if (auction.activePlayerIds.length === 1) {
    return sellAuction(state, auction.activePlayerIds[0], "Everyone else folded.");
  }
  if (!auction.currentTurnPlayerId) {
    return concludeBiddingRound(state);
  }
  return ok(state, "Folded.");
}

function concludeBiddingRound(state: GameState): EngineResult {
  const auction = requireAuction(state);
  refreshAuctionDerivedState(state);

  if (auction.activePlayerIds.length === 1) {
    return sellAuction(state, auction.activePlayerIds[0], "Only one bidder remains.");
  }

  const winnerId = uniqueHighestPlayerId(auction);
  if (auction.round >= state.config.maxRounds) {
    if (winnerId) {
      return sellAuction(state, winnerId, "Final round closes.");
    }
    return sellAuction(state, auction.activePlayerIds[0], "Final round tie goes to seat order.");
  }

  const ratio = DIRECT_SALE_RATIOS[auction.round];
  auction.directSaleRatio = ratio;
  if (
    winnerId &&
    auction.highestBid > 0 &&
    (auction.secondBid === 0 || auction.highestBid >= auction.secondBid * ratio)
  ) {
    return sellAuction(state, winnerId, `Direct sale threshold ${ratio.toFixed(2)}x is met.`);
  }

  auction.round += 1;
  auction.status = "inspection";
  auction.pendingPlayerIds = [];
  auction.currentTurnPlayerId = undefined;
  auction.roundRaises = 0;
  Object.values(auction.playerStates).forEach((playerState) => {
    playerState.lookUsedThisRound = false;
    playerState.skillUsedThisRound = false;
  });
  leakDueIntel(state, auction);
  publishRoundPublicIntel(state, auction);
  refreshAuctionDerivedState(state);
  addLog(state, `Round ${auction.round} inspection opens.`, "system");
  return ok(state, `Advanced to round ${auction.round}.`);
}

function sellAuction(
  state: GameState,
  winnerId: PlayerId,
  reason: string,
): EngineResult {
  const auction = requireAuction(state);
  const winner = getPlayer(state, winnerId);
  const finalPrice = Math.min(getCommitment(state, winnerId), winner.escrow);
  const keptItems = auction.lot.items
    .filter((placed) => {
      const catalog = getItem(placed.catalogId);
      return catalog.isKeepable && catalog.isCredential;
    })
    .map<KeptItem>((placed) => ({
      catalogId: placed.catalogId,
      value: placed.value,
      sourceLotId: auction.lot.id,
    }));
  const keptValue = keptItems.reduce((sum, item) => sum + item.value, 0);
  const liquidatedValue = auction.lot.totalValue - keptValue;
  const profit = auction.lot.totalValue - finalPrice;
  const cashProfit = liquidatedValue - finalPrice;

  winner.escrow = Math.max(0, winner.escrow - finalPrice + liquidatedValue);
  winner.warehouse.push(...keptItems);
  winner.isBroke = winner.escrow <= 0;

  const result: AuctionResult = {
    winnerId,
    finalPrice,
    totalValue: auction.lot.totalValue,
    liquidatedValue,
    keptValue,
    profit,
    cashProfit,
    keptItems,
    reason,
  };

  auction.status = "sold";
  auction.soldToPlayerId = winnerId;
  auction.finalProfit = profit;
  auction.result = result;
  state.realizedValue += auction.lot.totalValue;
  state.phase = "reveal";
  auction.currentTurnPlayerId = undefined;
  auction.pendingPlayerIds = [];
  refreshAuctionDerivedState(state);

  addLog(
    state,
    `${reason} ${winner.name} wins for $${finalPrice}. Appraisal $${auction.lot.totalValue}, profit $${profit}.`,
    "payout",
  );
  markBrokePlayers(state);
  return ok(state, `${winner.name} wins the lot.`);
}

function publishRoundPublicIntel(state: GameState, auction: AuctionState): void {
  const rng = Random.fromState(state.rngState);
  const mode = rng.int(0, 2);
  let intel: Intel;

  if (mode === 0) {
    const item = rng.pick(auction.lot.items);
    const catalog = getItem(item.catalogId);
    intel = makeIntel(state, auction, "public", {
      kind: "quality-read",
      source: "public-leak",
      title: `Public scan: ${qualityLabel(catalog.quality)} quality`,
      detail: `One silhouette reads as ${qualityLabel(catalog.quality)}. The name stays sealed.`,
      itemInstanceId: item.instanceId,
      quality: catalog.quality,
    });
  } else if (mode === 1) {
    const item = [...auction.lot.items].sort(
      (a, b) =>
        shapeSize(getItem(b.catalogId).shapeId).area -
        shapeSize(getItem(a.catalogId).shapeId).area,
    )[0];
    const catalog = getItem(item.catalogId);
    intel = makeIntel(state, auction, "public", {
      kind: "category-read",
      source: "public-leak",
      title: `Largest silhouette: ${catalog.category}`,
      detail: "The biggest outline gets a rough category tag.",
      itemInstanceId: item.instanceId,
      category: catalog.category,
    });
  } else {
    const item = rng.pick(auction.lot.items);
    const floor = Math.max(25, roundTo(item.value * rng.float(0.42, 0.68), 25));
    intel = makeIntel(state, auction, "public", {
      kind: "known-floor",
      source: "public-leak",
      title: `Minimum appraisal ping: $${floor}`,
      detail: "A random sealed piece has at least this much appraised value.",
      itemInstanceId: item.instanceId,
      minValue: floor,
    });
  }

  state.rngState = rng.getState();
  auction.publicIntel.push(intel);
  addLog(state, `Public intel: ${intel.title}.`, "intel");
}

function resolveSkillIntel(
  state: GameState,
  auction: AuctionState,
  playerId: PlayerId,
  kind: "spot-high-value" | "read-value-band" | "count-oddities" | "find-dud" | "material-sweep",
): Intel {
  if (kind === "read-value-band") {
    const spread = Math.max(120, auction.lot.totalValue * 0.08);
    return makeIntel(state, auction, playerId, {
      kind: "value-band",
      source: "skill",
      title: "Tighter value band",
      detail: `This lot is probably between $${roundTo(auction.lot.totalValue - spread, 25)} and $${roundTo(auction.lot.totalValue + spread, 25)}.`,
    });
  }

  if (kind === "count-oddities") {
    const count = auction.lot.items.filter((item) => {
      const catalog = getItem(item.catalogId);
      return catalog.category === "oddity" || catalog.category === "contraband";
    }).length;
    return makeIntel(state, auction, playerId, {
      kind: "oddity-count",
      source: "skill",
      title: `${count} non-standard asset${count === 1 ? "" : "s"}`,
      detail: "Oddities and contraband are counted together by this rough scan.",
    });
  }

  if (kind === "material-sweep") {
    const materialCounts = new Map<MaterialTag, number>();
    auction.lot.items.forEach((item) => {
      const material = getItem(item.catalogId).material;
      materialCounts.set(material, (materialCounts.get(material) ?? 0) + 1);
    });
    const [material, count] = [...materialCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    return makeIntel(state, auction, playerId, {
      kind: "material-read",
      source: "skill",
      title: `Dominant material: ${material}`,
      detail: `${count} silhouettes read mostly as ${material}.`,
      material,
    });
  }

  const sorted = [...auction.lot.items].sort((a, b) =>
    kind === "find-dud" ? a.value - b.value : b.value - a.value,
  );
  const item = sorted[0];
  const catalog = getItem(item.catalogId);
  return makeIntel(state, auction, playerId, {
    kind: kind === "find-dud" ? "cheapest-item" : "item-identity",
    source: "skill",
    title: kind === "find-dud" ? `Likely dud: ${catalog.name}` : `Hot read: ${catalog.name}`,
    detail: `${qualityLabel(catalog.quality)} ${catalog.category}, appraised at $${item.value}. ${catalog.flavor}`,
    itemInstanceId: item.instanceId,
    quality: catalog.quality,
    category: catalog.category,
    material: catalog.material,
    minValue: item.value,
  });
}

function createAuctionState(
  state: GameState,
  lot: ContainerLot,
  activePlayerIds: PlayerId[],
): AuctionState {
  const playerStates: Record<PlayerId, AuctionPlayerState> = Object.fromEntries(
    state.players.map((player) => [
      player.id,
      {
        active: activePlayerIds.includes(player.id),
        folded: false,
        commitmentBid: 0,
        lookUsedThisRound: false,
        skillUsedThisRound: false,
        allIn: false,
      },
    ]),
  );
  const privateIntel = Object.fromEntries(state.players.map((id) => [id.id, [] as Intel[]]));
  const playerKnownFloor = Object.fromEntries(state.players.map((player) => [player.id, 0]));
  return {
    lot,
    round: 1,
    status: "inspection",
    highestBid: 0,
    secondBid: 0,
    directSaleRatio: DIRECT_SALE_RATIOS[1],
    playerStates,
    activePlayerIds,
    foldedPlayerIds: [],
    pendingPlayerIds: [],
    currentTurnPlayerId: undefined,
    privateIntel,
    publicIntel: [
      {
        id: `lot-${lot.id}-estimate`,
        kind: "value-band",
        playerId: "public",
        round: 1,
        source: "public-leak",
        title: "Venue reference range",
        detail: `Typical lot range: $${state.referenceLotValueRange[0]}-$${state.referenceLotValueRange[1]}.`,
      },
    ],
    delayedIntel: [],
    roundRaises: 0,
    publicKnownFloor: 0,
    playerKnownFloor,
  };
}

function refreshAuctionDerivedState(state: GameState): void {
  const auction = state.auction;
  if (!auction) {
    return;
  }
  const activeBids = auction.activePlayerIds
    .map((id) => auction.playerStates[id]?.commitmentBid ?? 0)
    .sort((a, b) => b - a);
  auction.highestBid = activeBids[0] ?? 0;
  auction.secondBid = activeBids[1] ?? 0;
  auction.publicKnownFloor = calculateKnownFloor(auction, auction.publicIntel);
  state.players.forEach((player) => {
    auction.playerKnownFloor[player.id] = calculateKnownFloor(auction, [
      ...auction.publicIntel,
      ...(auction.privateIntel[player.id] ?? []),
    ]);
  });
}

function calculateKnownFloor(auction: AuctionState, intel: Intel[]): number {
  return auction.lot.items.reduce((sum, item) => {
    const catalog = getItem(item.catalogId);
    const itemIntel = intel.filter((entry) => entry.itemInstanceId === item.instanceId);
    const identityKnown = itemIntel.some((entry) =>
      ["item-identity", "cheapest-item"].includes(entry.kind),
    );
    if (identityKnown || auction.status === "sold") {
      return sum + item.value;
    }

    let candidates = CATALOG_ITEMS.filter(
      (candidate) => candidate.silhouetteFamily === catalog.silhouetteFamily,
    );
    const qualities = itemIntel
      .map((entry) => entry.quality)
      .filter((entry): entry is ItemQuality => Boolean(entry));
    const categories = itemIntel
      .map((entry) => entry.category)
      .filter((entry): entry is ItemCategory => Boolean(entry));
    const materials = itemIntel
      .map((entry) => entry.material)
      .filter((entry): entry is MaterialTag => Boolean(entry));

    if (qualities.length) {
      candidates = candidates.filter((candidate) => qualities.includes(candidate.quality));
    }
    if (categories.length) {
      candidates = candidates.filter((candidate) => categories.includes(candidate.category));
    }
    if (materials.length) {
      candidates = candidates.filter((candidate) => materials.includes(candidate.material));
    }

    const candidateFloor = Math.min(...candidates.map((candidate) => candidate.baseValue));
    const intelFloor = Math.max(0, ...itemIntel.map((entry) => entry.minValue ?? 0));
    const floor = Number.isFinite(candidateFloor) ? candidateFloor : 0;
    return sum + Math.max(floor, intelFloor);
  }, 0);
}

function leakDueIntel(state: GameState, auction: AuctionState): void {
  const due = auction.delayedIntel.filter(
    (intel) => (intel.revealAtRound ?? Infinity) <= auction.round,
  );
  auction.delayedIntel = auction.delayedIntel.filter(
    (intel) => (intel.revealAtRound ?? Infinity) > auction.round,
  );
  due.forEach((intel) => {
    auction.publicIntel.push(intel);
    addLog(state, `Leaked skill intel from ${playerName(state, intel.playerId)}: ${intel.title}.`, "intel");
  });
}

function makeIntel(
  state: GameState,
  auction: AuctionState,
  playerId: PlayerId,
  intel: Omit<Intel, "id" | "playerId" | "round">,
): Intel {
  return {
    ...intel,
    id: `intel-${state.log.length + auction.publicIntel.length}-${playerId}-${auction.round}`,
    playerId,
    round: auction.round,
  };
}

function removePending(auction: AuctionState, playerId: PlayerId): void {
  auction.pendingPlayerIds = auction.pendingPlayerIds.filter((id) => id !== playerId);
  auction.currentTurnPlayerId = auction.pendingPlayerIds[0];
}

function uniqueHighestPlayerId(auction: AuctionState): PlayerId | undefined {
  const contenders = auction.activePlayerIds.filter(
    (id) => auction.playerStates[id]?.commitmentBid === auction.highestBid,
  );
  return auction.highestBid > 0 && contenders.length === 1 ? contenders[0] : undefined;
}

function requireAuction(state: GameState): AuctionState {
  if (!state.auction) {
    throw new Error("No active auction.");
  }
  return state.auction;
}

function getAuctionPlayer(
  auction: AuctionState,
  playerId: PlayerId,
): AuctionPlayerState {
  const playerState = auction.playerStates[playerId];
  if (!playerState) {
    throw new Error(`Unknown auction player: ${playerId}`);
  }
  return playerState;
}

function getPlayer(state: GameState, playerId: PlayerId): PlayerState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error(`Unknown player: ${playerId}`);
  }
  return player;
}

function playerName(state: GameState, playerId?: PlayerId): string {
  if (!playerId) {
    return "nobody";
  }
  return state.players.find((player) => player.id === playerId)?.name ?? playerId;
}

function addLog(
  state: GameState,
  text: string,
  tone: "system" | "bid" | "intel" | "payout" | "warning",
): void {
  state.log.unshift({
    id: `log-${state.log.length + 1}`,
    text,
    tone,
  });
  state.log = state.log.slice(0, 22);
}

function markBrokePlayers(state: GameState): void {
  state.players.forEach((player) => {
    player.isBroke = player.escrow <= 0 && player.totalCash <= 0;
  });
}

function qualityLabel(quality: string): string {
  return quality.replace(/^\w/, (letter) => letter.toUpperCase());
}

function ok(state: GameState, message: string): EngineResult {
  state.lastMessage = message;
  return { ok: true, state, message };
}

function fail(state: GameState, message: string): EngineResult {
  state.lastMessage = message;
  addLog(state, message, "warning");
  return { ok: false, state, message };
}
