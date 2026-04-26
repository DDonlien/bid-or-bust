import Peer, { type DataConnection } from "peerjs";
import type { GameState, PlayerId } from "../core/types";
import type { ClientCommand, NetworkMessage, PeerStatus } from "./protocol";

export interface HostRoom {
  role: "host";
  getStatus(): PeerStatus;
  broadcastSnapshot(state: GameState): void;
  close(): void;
}

export interface ClientRoom {
  role: "client";
  getStatus(): PeerStatus;
  sendCommand(command: ClientCommand): void;
  close(): void;
}

interface HostOptions {
  onCommand: (command: ClientCommand, assignedPlayerId: PlayerId) => void;
  onStatus: (status: PeerStatus) => void;
}

interface ClientOptions {
  hostPeerId: string;
  onSnapshot: (state: GameState) => void;
  onWelcome: (assignedPlayerId: PlayerId) => void;
  onStatus: (status: PeerStatus) => void;
}

const PLAYER_SEATS: PlayerId[] = ["p2", "p3", "p4"];

export async function createHostRoom(options: HostOptions): Promise<HostRoom> {
  const peer = new Peer();
  const connections = new Map<string, { connection: DataConnection; playerId: PlayerId }>();
  let peerId = "";

  const status = (message: string): PeerStatus => ({
    role: "host",
    peerId,
    assignedPlayerId: "p1",
    connections: [...connections.entries()].map(([id, entry]) => ({
      peerId: id,
      playerId: entry.playerId,
    })),
    message,
  });

  await new Promise<void>((resolve, reject) => {
    peer.on("open", (id) => {
      peerId = id;
      options.onStatus(status(`Hosting room ${id}.`));
      resolve();
    });
    peer.on("error", reject);
  });

  peer.on("connection", (connection) => {
    const assignedPlayerId = nextSeat(connections);
    if (!assignedPlayerId) {
      connection.close();
      options.onStatus(status("Rejected a peer because all demo seats are full."));
      return;
    }

    connections.set(connection.peer, { connection, playerId: assignedPlayerId });
    connection.on("open", () => {
      send(connection, {
        type: "welcome",
        assignedPlayerId,
        hostPeerId: peerId,
      });
      broadcastPeerList(peerId, connections);
      options.onStatus(status(`${connection.peer} joined as ${assignedPlayerId}.`));
    });
    connection.on("data", (raw) => {
      const message = raw as NetworkMessage;
      if (message.type === "client-command") {
        options.onCommand(
          { ...message.command, playerId: assignedPlayerId },
          assignedPlayerId,
        );
      }
    });
    connection.on("close", () => {
      connections.delete(connection.peer);
      broadcastPeerList(peerId, connections);
      options.onStatus(status(`${connection.peer} disconnected.`));
    });
  });

  return {
    role: "host",
    getStatus: () => status("Host room active."),
    broadcastSnapshot(state: GameState) {
      connections.forEach(({ connection }) => {
        send(connection, { type: "snapshot", state });
      });
    },
    close() {
      connections.forEach(({ connection }) => connection.close());
      peer.destroy();
    },
  };
}

export async function joinClientRoom(options: ClientOptions): Promise<ClientRoom> {
  const peer = new Peer();
  let peerId = "";
  let assignedPlayerId: PlayerId | undefined;
  let hostConnection: DataConnection | undefined;

  const status = (message: string): PeerStatus => ({
    role: "client",
    peerId,
    hostPeerId: options.hostPeerId,
    assignedPlayerId,
    connections: [],
    message,
  });

  await new Promise<void>((resolve, reject) => {
    peer.on("open", (id) => {
      peerId = id;
      options.onStatus(status(`Peer ready as ${id}. Connecting...`));
      hostConnection = peer.connect(options.hostPeerId, { reliable: true });
      hostConnection.on("open", () => {
        options.onStatus(status(`Connected to ${options.hostPeerId}.`));
        resolve();
      });
      hostConnection.on("data", (raw) => {
        const message = raw as NetworkMessage;
        if (message.type === "welcome") {
          assignedPlayerId = message.assignedPlayerId;
          options.onWelcome(assignedPlayerId);
          options.onStatus(status(`Assigned seat ${assignedPlayerId}.`));
        }
        if (message.type === "snapshot") {
          options.onSnapshot(message.state);
        }
      });
      hostConnection.on("close", () => {
        options.onStatus(status("Host connection closed."));
      });
    });
    peer.on("error", reject);
  });

  return {
    role: "client",
    getStatus: () => status("Client room active."),
    sendCommand(command: ClientCommand) {
      if (!hostConnection?.open) {
        options.onStatus(status("Cannot send: host connection is not open."));
        return;
      }
      send(hostConnection, { type: "client-command", command });
    },
    close() {
      hostConnection?.close();
      peer.destroy();
    },
  };
}

function nextSeat(
  connections: Map<string, { connection: DataConnection; playerId: PlayerId }>,
): PlayerId | undefined {
  const used = new Set([...connections.values()].map((entry) => entry.playerId));
  return PLAYER_SEATS.find((seat) => !used.has(seat));
}

function broadcastPeerList(
  hostPeerId: string,
  connections: Map<string, { connection: DataConnection; playerId: PlayerId }>,
): void {
  const peers = [...connections.entries()].map(([peerId, entry]) => ({
    peerId,
    playerId: entry.playerId,
  }));
  connections.forEach(({ connection }) => {
    send(connection, { type: "peer-list", peers: [{ peerId: hostPeerId, playerId: "p1" }, ...peers] });
  });
}

function send(connection: DataConnection, message: NetworkMessage): void {
  if (connection.open) {
    connection.send(message);
  }
}
