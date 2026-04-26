import { getCharacter, getItem } from "../core/catalog";
import {
  beginBidding,
  createDemoGame,
  itemIsKnownToPlayer,
  lookAtItem,
  startNextLot,
  submitBidAction,
  useRandomSkill,
  visibleIntelForPlayer,
} from "../core/gameEngine";
import type { BidAction, EngineResult, GameState, PlayerId } from "../core/types";
import { createHostRoom, joinClientRoom, type ClientRoom, type HostRoom } from "../net/peerRoom";
import type { ClientCommand, PeerStatus } from "../net/protocol";
import {
  candidateNamesForItem,
  drawAuctionCanvas,
  findItemAtCanvasPoint,
} from "./canvasRenderer";

type Room = HostRoom | ClientRoom;
type ViewState = "home" | "auction" | "results";

export class BidOrBustApp {
  private view: ViewState = "home";
  private state: GameState;
  private selectedPlayerId: PlayerId = "p1";
  private selectedItemId?: string;
  private room?: Room;
  private networkStatus: PeerStatus = {
    role: "local",
    connections: [],
    message: "Local hotseat mode.",
  };

  constructor(private readonly root: HTMLElement) {
    this.state = createDemoGame();
    startNextLot(this.state);
    this.installTestHooks();
    this.installKeyboardHooks();
    this.render();
  }

  private render(): void {
    if (this.view === "home") {
      this.renderHome();
    } else if (this.view === "auction") {
      this.renderAuction();
    } else if (this.view === "results") {
      this.renderResults();
    }
    this.wireEvents();
  }

  private renderHome(): void {
    this.root.innerHTML = `
      <main class="shell home-screen">
        <header class="topbar">
          <div class="brand">
            <h1>Bid or Bust</h1>
            <p>Select your next auction target</p>
          </div>
        </header>
        <div class="map-container">
          <div class="map-node active" id="btn-start-harbor">
            <div class="node-icon">⚓</div>
            <h3>Rusty Harbor</h3>
            <p>Risk: Low | Lots: ${this.state.config.lotCount}</p>
          </div>
          <div class="map-node disabled">
            <div class="node-icon">🔒</div>
            <h3>Downtown Storage</h3>
            <p>Risk: Med | Lots: 8</p>
          </div>
          <div class="map-node disabled">
            <div class="node-icon">🔒</div>
            <h3>Deep Sea Salvage</h3>
            <p>Risk: High | Lots: 5</p>
          </div>
        </div>
      </main>
    `;
  }

  private renderResults(): void {
    const sortedPlayers = [...this.state.players].sort((a, b) => b.cash - a.cash);
    this.root.innerHTML = `
      <main class="shell results-screen">
        <header class="topbar" style="justify-content: center; text-align: center;">
          <div class="brand">
            <h1>Auction Ended</h1>
            <p>Final Standings</p>
          </div>
        </header>
        <div class="results-container">
          <div class="leaderboard">
            ${sortedPlayers
              .map(
                (p, i) => `
              <div class="leaderboard-row ${i === 0 ? "winner" : ""} ${p.isBroke ? "broke" : ""}">
                <div class="rank">#${i + 1}</div>
                <div class="name">${escapeHtml(p.name)}</div>
                <div class="cash">$${p.cash} ${p.isBroke ? "(Broke)" : ""}</div>
              </div>
            `,
              )
              .join("")}
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <button class="wide" id="btn-back-home" style="font-size: 1.2rem; padding: 12px 30px;">Back to Map</button>
          </div>
        </div>
      </main>
    `;
  }

  private renderAuction(): void {
    const auction = this.state.auction;
    const currentPlayer = this.state.players.find(
      (player) => player.id === this.selectedPlayerId,
    );
    const highBidder = auction?.highBidderId
      ? this.state.players.find((player) => player.id === auction.highBidderId)
      : undefined;
    const selectedItem = auction?.lot.items.find(
      (item) => item.instanceId === this.selectedItemId,
    );
    const selectedCatalog = selectedItem ? getItem(selectedItem.catalogId) : undefined;
    const selectedKnown =
      Boolean(selectedItem) &&
      itemIsKnownToPlayer(this.state, this.selectedPlayerId, this.selectedItemId ?? "");
    const canInspect =
      Boolean(auction && selectedItem) &&
      auction?.status !== "sold" &&
      auction?.activePlayerIds.includes(this.selectedPlayerId) &&
      !auction?.roundLooked[this.selectedPlayerId];
    const canUseSkill =
      Boolean(auction) &&
      auction?.status !== "sold" &&
      auction?.activePlayerIds.includes(this.selectedPlayerId) &&
      !auction?.roundSkillUsed[this.selectedPlayerId];
    const canBeginBidding = auction?.status === "inspection" && this.state.phase === "auction";
    const canActBid =
      auction?.status === "bidding" &&
      auction.currentTurnPlayerId === this.selectedPlayerId &&
      this.state.phase === "auction";
    const raiseDefault = auction
      ? Math.min(
          currentPlayer?.cash ?? 0,
          auction.currentBid + this.state.config.minRaise,
        )
      : 0;

    this.root.innerHTML = `
      <main class="shell">
        <header class="topbar">
          <div class="brand">
            <h1>Bid or Bust</h1>
            <p>Odd salvage, bad instincts, five rounds to regret both.</p>
          </div>
          <div class="status-strip">
            <span class="pill">Phase: ${escapeHtml(this.state.phase)}</span>
            <span class="pill">Lot: ${this.state.lotIndex + 1}/${this.state.config.lotCount}</span>
            <span class="pill">Min Raise: $${this.state.config.minRaise}</span>
            <span class="pill">Current Bid: $${auction?.currentBid ?? 0}</span>
          </div>
        </header>

        <section class="workspace">
          <div class="stage">
            <canvas class="lot-canvas" id="lot-canvas" aria-label="Container lot grid"></canvas>
          </div>

          <aside class="side">
            <section class="panel">
              <h2>${escapeHtml(auction?.lot.name ?? "No Active Lot")}</h2>
              <div class="mini muted">
                ${escapeHtml(auction?.lot.source ?? "The yard is quiet.")}
                ${auction ? `<br>Risk Tier ${auction.lot.riskTier} | ${auction.lot.items.length} silhouettes | Opening $${auction.lot.openingBid}` : ""}
                ${highBidder ? `<br>High bidder: ${escapeHtml(highBidder.name)}` : "<br>High bidder: none"}
              </div>
            </section>

            <section class="panel">
              <h2>Bidders</h2>
              ${this.state.players.map((player) => this.renderPlayer(player.id)).join("")}
            </section>

            <section class="panel">
              <h2>Actions</h2>
              <div class="controls">
                ${
                  this.state.phase === "reveal"
                    ? `<button class="wide" id="btn-next-lot">Next Lot</button>`
                    : ""
                }
                ${
                  this.state.phase === "game-over"
                    ? `<button class="wide" id="btn-view-results">View Results</button>`
                    : ""
                }
                <button id="btn-inspect" ${canInspect ? "" : "disabled"}>Inspect Selected</button>
                <button id="btn-skill" ${canUseSkill ? "" : "disabled"}>Use Skill</button>
                <button class="wide" id="btn-begin-bidding" ${canBeginBidding ? "" : "disabled"}>Open Bidding</button>
              </div>
              <div class="bid-line">
                <input id="raise-amount" type="number" min="0" step="5" value="${raiseDefault}" ${canActBid ? "" : "disabled"} />
                <button id="btn-raise" ${canActBid ? "" : "disabled"}>Raise</button>
              </div>
              <div class="controls" style="margin-top: 8px;">
                <button id="btn-follow" ${canActBid && (auction?.round ?? 5) < 5 ? "" : "disabled"}>Follow</button>
                <button id="btn-fold" ${canActBid ? "" : "disabled"}>Fold</button>
              </div>
              <p class="mini muted">${escapeHtml(this.state.lastMessage ?? "The auctioneer taps the crate and waits.")}</p>
            </section>

            <section class="panel">
              <h2>Selected Silhouette</h2>
              <div class="item-detail">
                ${
                  selectedItem && selectedCatalog
                    ? `
                      <strong>${selectedKnown ? escapeHtml(selectedCatalog.name) : "Unknown item"}</strong>
                      <span class="mini muted">
                        ${selectedKnown ? `$${selectedItem.value} | ${escapeHtml(selectedCatalog.material)} ${escapeHtml(selectedCatalog.category)}<br>${escapeHtml(selectedCatalog.flavor)}` : `Family: ${escapeHtml(selectedCatalog.silhouetteFamily)} | Shape candidates:`}
                      </span>
                      ${selectedKnown ? "" : `<ul class="candidate-list">${candidateNamesForItem(this.state, selectedItem.instanceId).map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`}
                    `
                    : `<span class="muted">No silhouette tagged.</span>`
                }
              </div>
            </section>

            <section class="panel">
              <h2>Intel for ${escapeHtml(currentPlayer?.name ?? this.selectedPlayerId)}</h2>
              <ul class="intel-list">
                ${visibleIntelForPlayer(this.state, this.selectedPlayerId)
                  .slice(0, 6)
                  .map((intel) => `<li><strong>${escapeHtml(intel.title)}</strong><br><span class="mini">${escapeHtml(intel.detail)}</span></li>`)
                  .join("")}
              </ul>
            </section>

            <section class="panel">
              <h2>P2P Room</h2>
              <div class="mini muted">${escapeHtml(this.networkStatus.message)}</div>
              <div class="network-grid" style="margin-top: 8px;">
                <button id="btn-host" ${this.room ? "disabled" : ""}>Host</button>
                <input id="join-peer-id" placeholder="Host Peer ID" ${this.room ? "disabled" : ""} />
                <button id="btn-join" ${this.room ? "disabled" : ""}>Join</button>
              </div>
              <div class="mini muted" style="margin-top: 8px;">
                Role: ${escapeHtml(this.networkStatus.role)}
                ${this.networkStatus.peerId ? `<br>Peer: ${escapeHtml(this.networkStatus.peerId)}` : ""}
                ${this.networkStatus.assignedPlayerId ? `<br>Seat: ${escapeHtml(this.networkStatus.assignedPlayerId)}` : ""}
              </div>
            </section>

            <section class="panel">
              <h2>Room Log</h2>
              <ul class="log-list">
                ${this.state.log
                  .slice(0, 8)
                  .map((entry) => `<li class="${entry.tone}">${escapeHtml(entry.text)}</li>`)
                  .join("")}
              </ul>
            </section>
          </aside>
        </section>
      </main>
    `;

    this.draw();
  }

  private renderPlayer(playerId: PlayerId): string {
    const player = this.state.players.find((entry) => entry.id === playerId);
    if (!player) {
      return "";
    }
    const character = getCharacter(player.characterId);
    const active = player.id === this.selectedPlayerId ? "active" : "";
    const auction = this.state.auction;
    const turn = auction?.currentTurnPlayerId === player.id ? " | turn" : "";
    const folded = auction?.foldedPlayerIds.includes(player.id) ? " | folded" : "";
    return `
      <div class="player-row">
        <button class="player-button ${active}" data-player="${player.id}" ${this.networkStatus.role === "client" ? "disabled" : ""}>
          ${escapeHtml(player.name)}${turn}${folded}<br>
          <span class="mini">${escapeHtml(character.name)} · ${escapeHtml(character.passive)}</span>
        </button>
        <span class="cash">$${player.cash}</span>
      </div>
    `;
  }

  private wireEvents(): void {
    if (this.view === "home") {
      this.root.querySelector("#btn-start-harbor")?.addEventListener("click", () => {
        this.state = createDemoGame(`bid-or-bust-${Date.now()}`);
        startNextLot(this.state);
        this.selectedPlayerId = this.networkStatus.assignedPlayerId ?? "p1";
        this.selectedItemId = undefined;
        this.view = "auction";
        this.broadcast();
        this.render();
      });
      return;
    }

    if (this.view === "results") {
      this.root.querySelector("#btn-back-home")?.addEventListener("click", () => {
        this.view = "home";
        this.render();
      });
      return;
    }

    this.root.querySelectorAll<HTMLButtonElement>("[data-player]").forEach((button) => {
      button.addEventListener("click", () => {
        const playerId = button.dataset.player;
        if (playerId) {
          this.selectedPlayerId = playerId;
          this.render();
        }
      });
    });

    this.root.querySelector<HTMLCanvasElement>("#lot-canvas")?.addEventListener("click", (event) => {
      const canvas = event.currentTarget as HTMLCanvasElement;
      this.selectedItemId = findItemAtCanvasPoint(
        canvas,
        this.state,
        event.clientX,
        event.clientY,
      );
      this.render();
    });

    this.root.querySelector("#btn-inspect")?.addEventListener("click", () => {
      if (!this.selectedItemId) {
        return;
      }
      this.sendOrApply({
        type: "look",
        playerId: this.selectedPlayerId,
        itemInstanceId: this.selectedItemId,
      });
    });
    this.root.querySelector("#btn-skill")?.addEventListener("click", () => {
      this.sendOrApply({ type: "use-skill", playerId: this.selectedPlayerId });
    });
    this.root.querySelector("#btn-begin-bidding")?.addEventListener("click", () => {
      this.sendOrApply({ type: "begin-bidding", playerId: this.selectedPlayerId });
    });
    this.root.querySelector("#btn-raise")?.addEventListener("click", () => {
      const amount = Number(
        this.root.querySelector<HTMLInputElement>("#raise-amount")?.value ?? 0,
      );
      this.sendOrApply({
        type: "bid",
        playerId: this.selectedPlayerId,
        action: { type: "raise", amount },
      });
    });
    this.root.querySelector("#btn-follow")?.addEventListener("click", () => {
      this.sendOrApply({
        type: "bid",
        playerId: this.selectedPlayerId,
        action: { type: "follow" },
      });
    });
    this.root.querySelector("#btn-fold")?.addEventListener("click", () => {
      this.sendOrApply({
        type: "bid",
        playerId: this.selectedPlayerId,
        action: { type: "fold" },
      });
    });
    this.root.querySelector("#btn-next-lot")?.addEventListener("click", () => {
      this.sendOrApply({ type: "next-lot", playerId: this.selectedPlayerId });
    });
    this.root.querySelector("#btn-view-results")?.addEventListener("click", () => {
      this.view = "results";
      this.render();
    });
    this.root.querySelector("#btn-host")?.addEventListener("click", () => {
      void this.hostRoom();
    });
    this.root.querySelector("#btn-join")?.addEventListener("click", () => {
      const hostPeerId =
        this.root.querySelector<HTMLInputElement>("#join-peer-id")?.value.trim() ?? "";
      if (hostPeerId) {
        void this.joinRoom(hostPeerId);
      }
    });
  }

  private draw(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#lot-canvas");
    if (canvas) {
      drawAuctionCanvas(canvas, this.state, this.selectedPlayerId, this.selectedItemId);
    }
  }

  private sendOrApply(command: ClientCommand): void {
    if (this.room?.role === "client") {
      this.room.sendCommand({ ...command, playerId: this.selectedPlayerId });
      return;
    }
    this.applyCommand(command);
    this.broadcast();
    this.render();
  }

  private applyCommand(command: ClientCommand): EngineResult | undefined {
    try {
      if (command.type === "look") {
        return lookAtItem(this.state, command.playerId, command.itemInstanceId);
      }
      if (command.type === "use-skill") {
        return useRandomSkill(this.state, command.playerId);
      }
      if (command.type === "begin-bidding") {
        return beginBidding(this.state);
      }
      if (command.type === "bid") {
        return submitBidAction(this.state, command.playerId, command.action as BidAction);
      }
      if (command.type === "next-lot") {
        this.selectedItemId = undefined;
        return startNextLot(this.state);
      }
    } catch (error) {
      this.state.lastMessage = error instanceof Error ? error.message : String(error);
    }
    return undefined;
  }

  private async hostRoom(): Promise<void> {
    this.room = await createHostRoom({
      onCommand: (command, assignedPlayerId) => {
        this.selectedPlayerId = assignedPlayerId;
        this.applyCommand(command);
        this.broadcast();
        this.render();
      },
      onStatus: (status) => {
        this.networkStatus = status;
        this.render();
      },
    });
    this.networkStatus = this.room.getStatus();
    this.broadcast();
    this.render();
  }

  private async joinRoom(hostPeerId: string): Promise<void> {
    this.room = await joinClientRoom({
      hostPeerId,
      onSnapshot: (state) => {
        this.state = state;
        this.selectedItemId = undefined;
        this.render();
      },
      onWelcome: (assignedPlayerId) => {
        this.selectedPlayerId = assignedPlayerId;
      },
      onStatus: (status) => {
        this.networkStatus = status;
        this.render();
      },
    });
    this.networkStatus = this.room.getStatus();
    this.render();
  }

  private broadcast(): void {
    if (this.room?.role === "host") {
      this.room.broadcastSnapshot(this.state);
    }
  }

  private installKeyboardHooks(): void {
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() !== "f" || event.repeat) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT") {
        return;
      }
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void this.root.requestFullscreen();
      }
    });
  }

  private installTestHooks(): void {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem: "Container grid origin is top-left; x grows right, y grows down.",
        phase: this.state.phase,
        perspectivePlayerId: this.selectedPlayerId,
        lotIndex: this.state.lotIndex,
        auction: this.state.auction
          ? {
              round: this.state.auction.round,
              status: this.state.auction.status,
              currentBid: this.state.auction.currentBid,
              highBidderId: this.state.auction.highBidderId,
              currentTurnPlayerId: this.state.auction.currentTurnPlayerId,
              activePlayerIds: this.state.auction.activePlayerIds,
              selectedItemId: this.selectedItemId,
              visibleItems: this.state.auction.lot.items.map((item) => {
                const catalog = getItem(item.catalogId);
                const known = itemIsKnownToPlayer(
                  this.state,
                  this.selectedPlayerId,
                  item.instanceId,
                );
                return {
                  id: item.instanceId,
                  x: item.x,
                  y: item.y,
                  known,
                  label: known ? catalog.name : catalog.silhouetteFamily,
                  value: known || this.state.auction?.status === "sold" ? item.value : undefined,
                };
              }),
            }
          : undefined,
        players: this.state.players.map((player) => ({
          id: player.id,
          name: player.name,
          cash: player.cash,
          isBroke: player.isBroke,
        })),
        latestLog: this.state.log.slice(0, 5).map((entry) => entry.text),
      });

    window.advanceTime = () => {
      this.draw();
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
