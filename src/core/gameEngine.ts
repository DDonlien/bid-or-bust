import {
  CHARACTERS,
  getCharacter,
  getItem,
  getSkill,
} from "./catalog";
import { generateMatchLots } from "./containerGenerator";
import { hashSeed, Random, roundTo } from "./rng";
import type {
  AuctionState,
  BidAction,
  ContainerLot,
  EngineResult,
  GameState,
  Intel,
  PlayerId,
  PlayerState,
} from "./types";

const DEFAULT_PLAYER_NAMES = ["Mara", "Boone", "Pike", "Nell"];

export function createDemoGame(seed = "bid-or-bust-demo"): GameState {
  const config = {
    entryFee: 75,
    minRaise: 100,
    maxRounds: 5,
    lotCount: 5,
    startingCash: 5000,
  };
  const generated = generateMatchLots(seed, config.lotCount);
  const players: PlayerState[] = DEFAULT_PLAYER_NAMES.map((name, index) => ({
    id: `p${index + 1}`,
    name,
    cash: config.startingCash,
    characterId: CHARACTERS[index % CHARACTERS.length].id,
    isBroke: false,
  }));

  return {
    version: 1,
    seed,
    rngState: hashSeed(`${seed}:engine`),
    phase: "lobby",
    config,
    players,
    lots: generated.lots,
    lotIndex: -1,
    expectedMatchValue: generated.expectedMatchValue,
    realizedValue: 0,
    log: [
      {
        id: "log-0",
        text: "Auction crew checked in. Containers are still pretending to be innocent.",
        tone: "system",
      },
    ],
  };
}

export function startNextLot(state: GameState): EngineResult {
  if (state.lotIndex + 1 >= state.lots.length) {
    state.phase = "game-over";
    state.auction = undefined;
    markBrokePlayers(state);
    addLog(state, "The yard closes. Final cash decides the bragging rights.", "system");
    return ok(state, "Match complete.");
  }

  state.lotIndex += 1;
  const lot = state.lots[state.lotIndex];
  state.players.forEach((player) => {
    if (!player.isBroke) {
      player.cash = Math.max(0, player.cash - state.config.entryFee);
      player.isBroke = player.cash < lot.openingBid;
    }
  });

  const activePlayerIds = state.players
    .filter((player) => !player.isBroke && player.cash >= lot.openingBid)
    .map((player) => player.id);

  state.auction = createAuctionState(lot, activePlayerIds);
  state.phase = "auction";
  addLog(
    state,
    `Lot ${state.lotIndex + 1} rolls in from ${lot.source}. Entry fee $${state.config.entryFee}; opening bid $${lot.openingBid}.`,
    "system",
  );

  if (activePlayerIds.length === 0) {
    state.phase = "game-over";
    addLog(state, "Nobody can cover the opening bid. The auctioneer goes for coffee.", "warning");
  }

  return ok(state, `Started ${lot.name}.`);
}

export function lookAtItem(
  state: GameState,
  playerId: PlayerId,
  itemInstanceId: string,
): EngineResult {
  const auction = requireAuction(state);
  if (!auction.activePlayerIds.includes(playerId)) {
    return fail(state, "Only active bidders can inspect this lot.");
  }
  if (auction.roundLooked[playerId]) {
    return fail(state, "This player already used the free look for this round.");
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
    detail: `${catalog.material} ${catalog.category}, appraised at $${item.value}. ${catalog.flavor}`,
    itemInstanceId,
  });
  auction.roundLooked[playerId] = true;
  auction.privateIntel[playerId].push(intel);
  addLog(
    state,
    `${playerName(state, playerId)} quietly checks one silhouette.`,
    "intel",
  );
  return ok(state, `${catalog.name} revealed to ${playerName(state, playerId)}.`);
}

export function useRandomSkill(state: GameState, playerId: PlayerId): EngineResult {
  const auction = requireAuction(state);
  const player = getPlayer(state, playerId);
  if (!auction.activePlayerIds.includes(playerId)) {
    return fail(state, "Only active bidders can use a skill.");
  }
  if (auction.roundSkillUsed[playerId]) {
    return fail(state, "This player already used a skill this round.");
  }

  const character = getCharacter(player.characterId);
  const rng = Random.fromState(state.rngState);
  const skill = getSkill(rng.pick(character.skillIds));
  state.rngState = rng.getState();
  const intel = resolveSkillIntel(state, auction, playerId, skill.kind);
  auction.roundSkillUsed[playerId] = true;
  auction.privateIntel[playerId].push(intel);

  if (auction.round < state.config.maxRounds) {
    auction.delayedIntel.push({
      ...intel,
      source: "public-leak",
      revealAtRound: auction.round + 1,
    });
  }

  addLog(
    state,
    `${playerName(state, playerId)} burns a sealed character skill. The room notices, but not what it found.`,
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
  auction.pendingPlayerIds = auction.highBidderId
    ? auction.activePlayerIds.filter((id) => id !== auction.highBidderId)
    : [...auction.activePlayerIds];
  auction.currentTurnPlayerId = auction.pendingPlayerIds[0];

  if (!auction.currentTurnPlayerId) {
    return concludeBiddingRound(state);
  }

  addLog(state, `Round ${auction.round} bidding opens at $${auction.currentBid}.`, "bid");
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
  if (!auction.activePlayerIds.includes(playerId)) {
    return fail(state, "This bidder already folded.");
  }

  if (action.type === "raise") {
    return raiseBid(state, playerId, action.amount);
  }
  if (action.type === "follow") {
    return followBid(state, playerId);
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
    (intel) => intel.itemInstanceId === itemInstanceId && intel.kind === "item-identity",
  );
}

function raiseBid(
  state: GameState,
  playerId: PlayerId,
  amount: number,
): EngineResult {
  const auction = requireAuction(state);
  const player = getPlayer(state, playerId);
  const minAllowed = auction.currentBid + state.config.minRaise;
  const normalizedAmount = roundTo(amount, 5);

  if (normalizedAmount < minAllowed) {
    return fail(state, `Raise must be at least $${minAllowed}.`);
  }
  if (player.cash < normalizedAmount) {
    return fail(state, `${player.name} cannot cover $${normalizedAmount}.`);
  }

  auction.currentBid = normalizedAmount;
  auction.highBidderId = playerId;
  auction.roundRaises += 1;
  auction.pendingPlayerIds = auction.activePlayerIds.filter((id) => id !== playerId);
  auction.currentTurnPlayerId = auction.pendingPlayerIds[0];
  addLog(state, `${player.name} raises to $${normalizedAmount}.`, "bid");

  if (!auction.currentTurnPlayerId) {
    return concludeBiddingRound(state);
  }
  return ok(state, `Raised to $${normalizedAmount}.`);
}

function followBid(state: GameState, playerId: PlayerId): EngineResult {
  const auction = requireAuction(state);
  if (auction.round >= state.config.maxRounds) {
    return fail(state, "Follow is not available in the final round.");
  }
  const player = getPlayer(state, playerId);
  if (player.cash < auction.currentBid) {
    return fail(state, `${player.name} cannot stay live at $${auction.currentBid}.`);
  }

  removePending(auction, playerId);
  addLog(state, `${player.name} follows and stays live.`, "bid");
  if (!auction.currentTurnPlayerId) {
    return concludeBiddingRound(state);
  }
  return ok(state, "Followed.");
}

function foldBid(state: GameState, playerId: PlayerId): EngineResult {
  const auction = requireAuction(state);
  auction.activePlayerIds = auction.activePlayerIds.filter((id) => id !== playerId);
  auction.foldedPlayerIds.push(playerId);
  removePending(auction, playerId);
  addLog(state, `${playerName(state, playerId)} folds.`, "bid");

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
  if (auction.round >= state.config.maxRounds) {
    const winnerId = auction.highBidderId ?? auction.activePlayerIds[0];
    return sellAuction(state, winnerId, "Final round closes.");
  }

  auction.round += 1;
  auction.status = "inspection";
  auction.pendingPlayerIds = [];
  auction.currentTurnPlayerId = undefined;
  auction.roundRaises = 0;
  auction.roundLooked = emptyPlayerBoolRecord(state);
  auction.roundSkillUsed = emptyPlayerBoolRecord(state);
  leakDueIntel(state, auction);
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
  const finalBid = Math.min(auction.currentBid, winner.cash);
  winner.cash -= finalBid;
  winner.cash += auction.lot.totalValue;
  winner.isBroke = winner.cash <= 0;
  auction.status = "sold";
  auction.soldToPlayerId = winnerId;
  auction.finalProfit = auction.lot.totalValue - finalBid;
  state.realizedValue += auction.lot.totalValue;
  state.phase = "reveal";
  auction.currentTurnPlayerId = undefined;
  auction.pendingPlayerIds = [];

  addLog(
    state,
    `${reason} ${winner.name} wins ${auction.lot.name} for $${finalBid}. Value: $${auction.lot.totalValue}, profit: $${auction.finalProfit}.`,
    "payout",
  );
  markBrokePlayers(state);
  return ok(state, `${winner.name} wins the lot.`);
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
    const materialCounts = new Map<string, number>();
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
      detail: `${count} item silhouettes read mostly as ${material}.`,
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
    detail: `${catalog.material} ${catalog.category}, appraised at $${item.value}. ${catalog.flavor}`,
    itemInstanceId: item.instanceId,
  });
}

function createAuctionState(lot: ContainerLot, activePlayerIds: PlayerId[]): AuctionState {
  const base = Object.fromEntries(activePlayerIds.map((id) => [id, false]));
  const privateIntel = Object.fromEntries(activePlayerIds.map((id) => [id, [] as Intel[]]));
  return {
    lot,
    round: 1,
    status: "inspection",
    currentBid: lot.openingBid,
    activePlayerIds,
    foldedPlayerIds: [],
    pendingPlayerIds: [],
    roundLooked: { ...base },
    roundSkillUsed: { ...base },
    currentTurnPlayerId: undefined,
    privateIntel,
    publicIntel: [
      {
        id: `lot-${lot.id}-estimate`,
        kind: "value-band",
        playerId: "public",
        round: 1,
        source: "public-leak",
        title: "Broad yard estimate",
        detail: `Expected resale range: $${lot.expectedValueRange[0]}-$${lot.expectedValueRange[1]}.`,
      },
    ],
    delayedIntel: [],
    roundRaises: 0,
  };
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
    addLog(
      state,
      `Leaked intel from ${playerName(state, intel.playerId)}: ${intel.title}.`,
      "intel",
    );
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

function requireAuction(state: GameState): AuctionState {
  if (!state.auction) {
    throw new Error("No active auction.");
  }
  return state.auction;
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

function emptyPlayerBoolRecord(state: GameState): Record<PlayerId, boolean> {
  return Object.fromEntries(state.players.map((player) => [player.id, false]));
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
  state.log = state.log.slice(0, 18);
}

function markBrokePlayers(state: GameState): void {
  state.players.forEach((player) => {
    player.isBroke = player.cash <= 0;
  });
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
