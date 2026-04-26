export type PlayerId = string;
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
  category: ItemCategory;
  material: MaterialTag;
  baseValue: number;
  shapeId: string;
  silhouetteFamily: string;
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
  cash: number;
  characterId: string;
  isBroke: boolean;
}

export type IntelKind =
  | "item-identity"
  | "value-band"
  | "oddity-count"
  | "cheapest-item"
  | "material-read";

export interface Intel {
  id: string;
  kind: IntelKind;
  playerId: PlayerId;
  round: number;
  source: "free-look" | "skill" | "public-leak" | "showdown";
  title: string;
  detail: string;
  itemInstanceId?: string;
  revealAtRound?: number;
}

export type AuctionStatus = "inspection" | "bidding" | "sold";

export interface AuctionState {
  lot: ContainerLot;
  round: number;
  status: AuctionStatus;
  currentBid: number;
  highBidderId?: PlayerId;
  activePlayerIds: PlayerId[];
  foldedPlayerIds: PlayerId[];
  pendingPlayerIds: PlayerId[];
  currentTurnPlayerId?: PlayerId;
  roundLooked: Record<PlayerId, boolean>;
  roundSkillUsed: Record<PlayerId, boolean>;
  privateIntel: Record<PlayerId, Intel[]>;
  publicIntel: Intel[];
  delayedIntel: Intel[];
  roundRaises: number;
  soldToPlayerId?: PlayerId;
  finalProfit?: number;
}

export type MatchPhase = "lobby" | "auction" | "reveal" | "game-over";

export interface LogEntry {
  id: string;
  text: string;
  tone: "system" | "bid" | "intel" | "payout" | "warning";
}

export interface GameConfig {
  entryFee: number;
  minRaise: number;
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
  players: PlayerState[];
  lots: ContainerLot[];
  lotIndex: number;
  expectedMatchValue: number;
  realizedValue: number;
  auction?: AuctionState;
  log: LogEntry[];
  lastMessage?: string;
}

export type BidAction =
  | {
      type: "raise";
      amount: number;
    }
  | {
      type: "follow";
    }
  | {
      type: "fold";
    };

export interface EngineResult {
  ok: boolean;
  state: GameState;
  message: string;
}
