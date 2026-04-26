import type { BidAction, GameState, PlayerId } from "../core/types";

export type ClientCommand =
  | {
      type: "look";
      playerId: PlayerId;
      itemInstanceId: string;
    }
  | {
      type: "use-skill";
      playerId: PlayerId;
    }
  | {
      type: "begin-bidding";
      playerId: PlayerId;
    }
  | {
      type: "bid";
      playerId: PlayerId;
      action: BidAction;
    }
  | {
      type: "next-lot";
      playerId: PlayerId;
    };

export type NetworkMessage =
  | {
      type: "welcome";
      assignedPlayerId: PlayerId;
      hostPeerId: string;
    }
  | {
      type: "client-command";
      command: ClientCommand;
    }
  | {
      type: "snapshot";
      state: GameState;
    }
  | {
      type: "peer-list";
      peers: Array<{ peerId: string; playerId: PlayerId }>;
    };

export interface PeerStatus {
  role: "local" | "host" | "client";
  peerId?: string;
  hostPeerId?: string;
  assignedPlayerId?: PlayerId;
  connections: Array<{ peerId: string; playerId: PlayerId }>;
  message: string;
}
