export type PlayerId = string;

export type ItemQuality =
  | "scrap"
  | "useful"
  | "curious"
  | "rare"
  | "unregistered";

export type ItemCategory =
  | "household"
  | "industrial"
  | "collectible"
  | "oddity"
  | "contraband";

export type MaterialTag =
  | "metal"
  | "wood"
  | "glass"
  | "ceramic"
  | "paper"
  | "cloth"
  | "unknown";

export type SkillKind =
  | "spot-high-value"
  | "read-value-band"
  | "count-oddities"
  | "find-dud"
  | "material-sweep";

export interface GridShape {
  id: string;
  name: string;
  mask: string[];
}

export interface CatalogItem {
  id: string;
  name: string;
  shortName: string;
  category: ItemCategory;
  material: MaterialTag;
  quality: ItemQuality;
  baseValue: number;
  shapeId: string;
  silhouetteFamily: string;
  isKeepable: boolean;
  isCredential: boolean;
  flavor: string;
}

export interface PlacedItem {
  instanceId: string;
  catalogId: string;
  x: number;
  y: number;
  value: number;
}

export interface ContainerLot {
  id: string;
  name: string;
  source: string;
  riskTier: 1 | 2 | 3;
  grid: {
    cols: number;
    rows: number;
  };
  openingBid: number;
  expectedValueRange: [number, number];
  totalValue: number;
  items: PlacedItem[];
}

export interface VenueConfig {
  id: string;
  name: string;
  entryFee: number;
  escrowFunds: number;
  lotCount: number;
  lotValueRange: [number, number];
  bidStep: number;
  qualificationRequirements: string;
  riskLevel: "low" | "medium" | "high";
  oddityRate: number;
  contrabandRate: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  kind: SkillKind;
  description: string;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  passive: string;
  skillIds: string[];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  totalCash: number;
  escrow: number;
  characterId: string;
  isBroke: boolean;
  warehouse: KeptItem[];
}

export interface KeptItem {
  catalogId: string;
  value: number;
  sourceLotId: string;
}

export type IntelKind =
  | "item-identity"
  | "value-band"
  | "oddity-count"
  | "cheapest-item"
  | "material-read"
  | "quality-read"
  | "category-read"
  | "known-floor";

export interface Intel {
  id: string;
  kind: IntelKind;
  playerId: PlayerId;
  round: number;
  source: "free-look" | "skill" | "public-leak" | "showdown";
  title: string;
  detail: string;
  itemInstanceId?: string;
  quality?: ItemQuality;
  category?: ItemCategory;
  material?: MaterialTag;
  minValue?: number;
  revealAtRound?: number;
}

export type AuctionStatus = "inspection" | "bidding" | "sold";

export interface AuctionPlayerState {
  active: boolean;
  folded: boolean;
  commitmentBid: number;
  lookUsedThisRound: boolean;
  skillUsedThisRound: boolean;
  allIn: boolean;
}

export interface AuctionResult {
  winnerId: PlayerId;
  finalPrice: number;
  totalValue: number;
  liquidatedValue: number;
  keptValue: number;
  profit: number;
  cashProfit: number;
  keptItems: KeptItem[];
  reason: string;
}

export interface AuctionState {
  lot: ContainerLot;
  round: number;
  status: AuctionStatus;
  highestBid: number;
  secondBid: number;
  directSaleRatio?: number;
  playerStates: Record<PlayerId, AuctionPlayerState>;
  activePlayerIds: PlayerId[];
  foldedPlayerIds: PlayerId[];
  pendingPlayerIds: PlayerId[];
  currentTurnPlayerId?: PlayerId;
  privateIntel: Record<PlayerId, Intel[]>;
  publicIntel: Intel[];
  delayedIntel: Intel[];
  roundRaises: number;
  publicKnownFloor: number;
  playerKnownFloor: Record<PlayerId, number>;
  soldToPlayerId?: PlayerId;
  finalProfit?: number;
  result?: AuctionResult;
}

export type MatchPhase = "lobby" | "auction" | "reveal" | "game-over";

export interface LogEntry {
  id: string;
  text: string;
  tone: "system" | "bid" | "intel" | "payout" | "warning";
}

export interface GameConfig {
  entryFee: number;
  bidStep: number;
  maxRounds: number;
  lotCount: number;
  startingCash: number;
}

export interface GameState {
  version: number;
  seed: string;
  rngState: number;
  phase: MatchPhase;
  config: GameConfig;
  venue: VenueConfig;
  players: PlayerState[];
  lots: ContainerLot[];
  lotIndex: number;
  referenceLotValueRange: [number, number];
  realizedValue: number;
  auction?: AuctionState;
  log: LogEntry[];
  lastMessage?: string;
}

export type BidAction =
  | {
      type: "hold";
    }
  | {
      type: "raise";
      steps: number;
    }
  | {
      type: "fold";
    }
  | {
      type: "all-in";
    };

export interface EngineResult {
  ok: boolean;
  state: GameState;
  message: string;
}
