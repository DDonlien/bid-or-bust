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
import type { BidAction, EngineResult, GameState, PlayerId, PlayerState } from "../core/types";
import { createHostRoom, joinClientRoom, type ClientRoom, type HostRoom } from "../net/peerRoom";
import type { ClientCommand, PeerStatus } from "../net/protocol";
import auctionLevelsCsv from "../config/auction_levels.csv?raw";
import {
  candidateNamesForItem,
  drawAuctionCanvas,
  findItemAtCanvasPoint,
} from "./canvasRenderer";

type Room = HostRoom | ClientRoom;
type ViewState = "home" | "auction" | "results";
type RiskLevel = "Low" | "Medium" | "High";

interface AuctionLevelConfig {
  id: string;
  index: number;
  name: string;
  x: number;
  y: number;
  stars: number;
  risk: RiskLevel;
  coreVenueId: string;
  escrow: number;
  bidStep: number;
  entryFee: number;
  requiredKeeps: number;
  expectedReturnMin: number;
  expectedReturnMax: number;
  lotCountMin: number;
  lotCountMax: number;
}

const ASSETS = {
  logo: new URL("../../ui_assets/home/logo.png", import.meta.url).href,
  container: new URL("../../output/container_crop.png", import.meta.url).href,
  storageIcons: [
    new URL("../../ui_assets/storage/bidding_icons/icon_00.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_01.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_02.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_03.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_04.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_05.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_06.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_07.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_08.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_09.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_10.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_11.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_12.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_13.png", import.meta.url).href,
    new URL("../../ui_assets/storage/bidding_icons/icon_14.png", import.meta.url).href,
  ],
};

const AUCTION_LEVELS = parseAuctionLevels(auctionLevelsCsv);

export class BidOrBustApp {
  private view: ViewState = "home";
  private state: GameState;
  private selectedPlayerId: PlayerId = "p1";
  private selectedItemId?: string;
  private selectedVenueId = "old-harbor";
  private campaignCash = 60000;
  private ownedCredentialCount = 1;
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
    } else {
      this.renderResults();
    }
    this.wireEvents();
  }

  private renderHome(): void {
    const venue = AUCTION_LEVELS.find((entry) => entry.id === this.selectedVenueId) ?? AUCTION_LEVELS[0];
    const canEnter = this.canEnterVenue(venue);
    this.root.innerHTML = `
      <main class="game-shell home-shell">
        <aside class="home-sidebar ornate-panel">
          <div class="brand-row">
            <img class="home-logo" src="${ASSETS.logo}" alt="Bid or Bust">
            <div class="copy-toggle" role="group" aria-label="Text mode">
              <button class="active">中文</button>
              <button>EN</button>
            </div>
          </div>
          <div class="account-stack">
            ${metricBlock("💵", "Cash Balance", `$${this.campaignCash}`)}
            <button class="storage-home-button" id="btn-open-storage">📦 库存 ${this.ownedCredentialCount} 件藏品</button>
          </div>
          <section class="venue-brief">
            <header>
              <span class="large-badge">${venue.index}</span>
              <div>
                <h1>${escapeHtml(venue.name)}</h1>
                <p>${starString(venue.stars)} · ${escapeHtml(venue.risk)} Risk</p>
              </div>
            </header>
            <div class="brief-grid">
              <h2>入门条件</h2>
              <dl>
                <dt>托管金额</dt><dd>$${venue.escrow}</dd>
                <dt>最小加价</dt><dd>$${venue.bidStep}</dd>
                <dt>入场费</dt><dd>$${venue.entryFee}</dd>
                <dt>藏品要求</dt><dd>${venue.requiredKeeps} 件</dd>
              </dl>
              <h2>收益</h2>
              <dl>
                <dt>预期收益</dt><dd>$${venue.expectedReturnMin} - $${venue.expectedReturnMax}</dd>
                <dt>集装箱数量</dt><dd>${venue.lotCountMin} - ${venue.lotCountMax}</dd>
              </dl>
            </div>
            ${canEnter ? "" : `<p class="locked-note">${escapeHtml(this.venueLockReason(venue))}</p>`}
          </section>
          <button class="start-auction ${canEnter ? "" : "locked"}" id="btn-start-harbor" ${canEnter ? "" : "disabled"}>⚖ Start Auction</button>
        </aside>

        <section class="world-map">
          <div class="map-water"></div>
          <div class="route route-a"></div>
          <div class="route route-b"></div>
          <div class="route route-c"></div>
          ${AUCTION_LEVELS.map((node) => `
            <button class="map-marker ${node.id === venue.id ? "selected" : ""} ${this.canEnterVenue(node) ? "" : "locked"}" data-venue="${node.id}" style="left: ${node.x}%; top: ${node.y}%">
              <span class="marker-badge">${node.index}</span>
              <span class="marker-copy">${escapeHtml(node.name)}<small>${starString(node.stars)}</small></span>
            </button>
          `).join("")}
        </section>
      </main>
    `;
  }

  private renderAuction(): void {
    const auction = this.state.auction;
    const currentPlayer = getPlayer(this.state, this.selectedPlayerId);
    const selectedItem = auction?.lot.items.find((item) => item.instanceId === this.selectedItemId);
    const selectedCatalog = selectedItem ? getItem(selectedItem.catalogId) : undefined;
    const selectedKnown =
      Boolean(selectedItem) &&
      itemIsKnownToPlayer(this.state, this.selectedPlayerId, this.selectedItemId ?? "");
    const highBidderId = auction ? getHighBidderId(auction) : undefined;
    const highBidder = highBidderId ? getPlayer(this.state, highBidderId) : undefined;
    const playerAuction = auction?.playerStates[this.selectedPlayerId];
    const canInspect =
      Boolean(auction && selectedItem) &&
      auction?.status !== "sold" &&
      auction?.activePlayerIds.includes(this.selectedPlayerId) &&
      !playerAuction?.lookUsedThisRound;
    const canUseSkill =
      Boolean(auction) &&
      auction?.status !== "sold" &&
      auction?.activePlayerIds.includes(this.selectedPlayerId) &&
      !playerAuction?.skillUsedThisRound;
    const canBeginBidding = auction?.status === "inspection" && this.state.phase === "auction";
    const canActBid =
      auction?.status === "bidding" &&
      auction.currentTurnPlayerId === this.selectedPlayerId &&
      this.state.phase === "auction";

    this.root.innerHTML = `
      <main class="game-shell table-shell">
        <aside class="bidder-panel ornate-panel">
          <header>
            <h2>Auction Round <b>${auction?.round ?? 1}/5</b></h2>
            <p>${highBidder ? "Current Leader" : "Awaiting Opening Bid"}</p>
          </header>
          <section class="leader-card">
            <div class="portrait">⚓</div>
            <div>
              <strong>${escapeHtml(highBidder?.name ?? currentPlayer?.name ?? "Ironhook")}</strong>
              <span>$${auction?.highestBid ?? 0}</span>
            </div>
            <i>♛</i>
          </section>
          <section class="bidder-list">
            ${this.state.players.map((player, index) => this.renderBidderRow(player, index + 1)).join("")}
          </section>
          <section class="your-bid">
            <h3>Your Bid</h3>
            <strong>$${playerAuction?.commitmentBid ?? 0}</strong>
            <p>Wallet <b>$${currentPlayer?.escrow ?? 0}</b></p>
            <div class="quick-raise">
              <button id="btn-plus-one" ${canActBid ? "" : "disabled"}>+ $${this.state.config.bidStep}</button>
              <button id="btn-plus-two" ${canActBid ? "" : "disabled"}>+ $${this.state.config.bidStep * 2}</button>
              <button id="btn-all-in" ${canActBid ? "" : "disabled"}>Max</button>
            </div>
            <input id="raise-steps" type="number" min="1" step="1" value="1" ${canActBid ? "" : "disabled"} aria-label="Raise steps">
            <button class="gold-action" id="btn-raise" ${canActBid ? "" : "disabled"}>Raise Bid</button>
            <button class="red-action" id="btn-fold" ${canActBid ? "" : "disabled"}>Fold</button>
            <button class="teal-action" id="btn-hold" ${canActBid && (auction?.round ?? 5) < 5 ? "" : "disabled"}>Follow</button>
          </section>
          <section class="skill-card">
            <button id="btn-skill" ${canUseSkill ? "" : "disabled"}>?</button>
            <div>
              <h3>Skill ${playerAuction?.skillUsedThisRound ? "(Used)" : "(1 Left)"}</h3>
              <strong>Random Skill</strong>
              <p>Reveal a random skill effect</p>
            </div>
          </section>
        </aside>

        <section class="auction-board ornate-panel">
          <header class="lot-header">
            <div>
              <h1>Lot #${(3047 + Math.max(0, this.state.lotIndex)).toString()}</h1>
              <p>${escapeHtml(auction?.lot.name ?? "Seaside Salvage Container")}</p>
            </div>
            <div>
              <span>Starting Bid</span>
              <strong>$${auction?.lot.openingBid ?? 0}</strong>
            </div>
          </header>
          <div class="container-hero">
            <img src="${ASSETS.container}" alt="Seaside salvage container">
            <aside class="container-info">
              <h2>Container Info</h2>
              <dl>
                <dt>Size</dt><dd>▣ ▣ ◩ □ □</dd>
                <dt>Condition</dt><dd>★★★☆☆</dd>
                <dt>Source</dt><dd>${escapeHtml(auction?.lot.source ?? "Seaside Salvage")}</dd>
                <dt>Estimate Value</dt><dd>$${auction?.lot.expectedValueRange[0] ?? 0} - $${auction?.lot.expectedValueRange[1] ?? 0}</dd>
              </dl>
            </aside>
          </div>
          <section class="public-info parchment">
            <h2>Public Information</h2>
            <div class="public-columns">
              <article>
                <h3>Revealed Items</h3>
                ${selectedItem && selectedCatalog ? `
                  <div class="revealed-item">
                    <span class="item-icon">${iconForMaterial(selectedCatalog.material)}</span>
                    <div>
                      <strong>${selectedKnown ? escapeHtml(selectedCatalog.name) : "Unknown Silhouette"}</strong>
                      <em>${selectedKnown ? escapeHtml(selectedCatalog.quality) : "Candidate"}</em>
                      <p>${selectedKnown ? `Value: $${selectedItem.value}` : candidateNamesForItem(this.state, selectedItem.instanceId).slice(0, 2).map(escapeHtml).join(" / ")}</p>
                    </div>
                  </div>
                ` : `<div class="revealed-item unknown"><span>?</span><p>Select a grid silhouette.</p></div>`}
                <button id="btn-inspect" ${canInspect ? "" : "disabled"}>Inspect Selected</button>
              </article>
              <article>
                <h3>Grid Clues</h3>
                <canvas class="lot-canvas" id="lot-canvas" aria-label="Container lot grid"></canvas>
              </article>
            </div>
          </section>
          <section class="event-card parchment">
            <h2>Event Card</h2>
            <div>
              <strong>${escapeHtml(visibleIntelForPlayer(this.state, this.selectedPlayerId)[0]?.title ?? "Market Surge")}</strong>
              <p>${escapeHtml(visibleIntelForPlayer(this.state, this.selectedPlayerId)[0]?.detail ?? "All players' next bid increments are increased this round.")}</p>
            </div>
            <aside>
              <b>Reveal Next Round</b>
              <span>All extra revealed items will be made public.</span>
            </aside>
          </section>
          <footer class="round-timer">
            ${
              this.state.phase === "reveal"
                ? `<button id="btn-view-results">Auction Result</button><button id="btn-next-lot">Next Lot</button>`
                : `<button id="btn-begin-bidding" ${canBeginBidding ? "" : "disabled"}>Open Bidding</button>`
            }
            <span>Round Ends In <b>00:45</b></span>
          </footer>
        </section>

        ${this.renderStoragePanel("bidding")}
        ${this.renderStatusBar()}
      </main>
    `;

    this.draw();
  }

  private renderResults(): void {
    const auction = this.state.auction;
    const result = auction?.result;
    const revenue = result?.liquidatedValue ?? this.state.realizedValue;
    const costs = result?.finalPrice ?? auction?.highestBid ?? 0;
    const profit = result?.cashProfit ?? revenue - costs;
    this.root.innerHTML = `
      <main class="game-shell result-shell">
        <section class="result-board ornate-panel">
          <div class="result-hero parchment">
            <div class="complete-copy">
              <span>⚓</span>
              <h1>Auction Complete</h1>
              <p>The bidding has ended.</p>
            </div>
            <img src="${ASSETS.container}" alt="Completed salvage lot">
          </div>
          <div class="result-grid">
            <section class="parchment acquired-panel">
              <h2>Result</h2>
              <div class="won-count">
                <span>📦</span>
                <strong>${this.state.lotIndex + 1}</strong>
                <p>Lots Acquired</p>
              </div>
              ${this.renderWonLot("#3047", auction?.lot.name ?? "Seaside Salvage Container", result?.finalPrice ?? 0)}
              ${this.renderWonLot("#3041", "Old Dock Storage", Math.max(0, Math.round((result?.finalPrice ?? 4500) * 0.7)))}
            </section>
            <section class="parchment profit-panel">
              <h2>Profit Summary</h2>
              ${summaryRow("🚜", "Sales Revenue", "Items sold after appraisal", revenue, "good")}
              ${summaryRow("⚖", "Auction Costs", "Total winning bids", -costs, "bad")}
              ${summaryRow("🪙", "Total Profit", "Revenue - Costs", profit, profit >= 0 ? "good large" : "bad large")}
              <blockquote>
                Great haul! These containers really paid off.
                <cite>- Harbor Master</cite>
              </blockquote>
              <button id="btn-next-lot">${this.state.phase === "game-over" ? "Back to Map" : "Next Auction"}</button>
            </section>
          </div>
        </section>
        ${this.renderStoragePanel("result")}
        ${this.renderStatusBar()}
      </main>
    `;
  }

  private renderBidderRow(player: PlayerState, rank: number): string {
    const auction = this.state.auction;
    const auctionPlayer = auction?.playerStates[player.id];
    const active = player.id === this.selectedPlayerId ? "active" : "";
    const folded = auctionPlayer?.folded ? "folded" : "";
    const turn = auction?.currentTurnPlayerId === player.id ? "turn" : "";
    return `
      <button class="bidder-row ${active} ${folded} ${turn}" data-player="${player.id}">
        <span>${rank}</span>
        <i>${avatarForRank(rank)}</i>
        <strong>${escapeHtml(player.name)}</strong>
        <b>$${auctionPlayer?.commitmentBid ?? 0}</b>
      </button>
    `;
  }

  private renderStoragePanel(mode: "bidding" | "result"): string {
    return `
      <aside class="storage-panel ornate-panel ${mode}">
        <header>
          <h2>Your Storage</h2>
          <span>📦</span>
          <b>18 / 28</b>
        </header>
        <div class="storage-grid">
          ${Array.from({ length: 30 }, (_, index) => {
            if (index >= 20) {
              return `<div class="storage-slot locked">🔒</div>`;
            }
            const icon = ASSETS.storageIcons[index % ASSETS.storageIcons.length];
            return `<div class="storage-slot"><img src="${icon}" alt=""></div>`;
          }).join("")}
        </div>
        <footer>
          <div><span>Estimated Value</span><strong>$23,450</strong></div>
          <button>📖 View Collection</button>
        </footer>
      </aside>
    `;
  }

  private renderStatusBar(): string {
    return `
      <footer class="ship-status">
        <strong>🚢 S.S. Salvager</strong>
        <span>Class: Diver</span>
        <span>📦 Hold: 18 / 28</span>
        <span>⛽ 180</span>
        <span>🔧 93%</span>
        <span>☀ Clear</span>
        <span>24°C</span>
      </footer>
    `;
  }

  private renderWonLot(id: string, name: string, value: number): string {
    return `
      <article class="won-lot">
        <img src="${ASSETS.container}" alt="">
        <div>
          <strong>${escapeHtml(id)}</strong>
          <p>${escapeHtml(name)}</p>
        </div>
        <b>$${value}</b>
        <span>Won</span>
      </article>
    `;
  }

  private canEnterVenue(venue: AuctionLevelConfig): boolean {
    return (
      this.campaignCash >= venue.entryFee + venue.escrow &&
      this.ownedCredentialCount >= venue.requiredKeeps
    );
  }

  private venueLockReason(venue: AuctionLevelConfig): string {
    const missing: string[] = [];
    const neededCash = venue.entryFee + venue.escrow;
    if (this.campaignCash < neededCash) {
      missing.push(`现金不足，需要 $${neededCash}`);
    }
    if (this.ownedCredentialCount < venue.requiredKeeps) {
      missing.push(`藏品不足，需要 ${venue.requiredKeeps} 件`);
    }
    return `条件不足：${missing.join("；")}`;
  }

  private enterVenue(venue: AuctionLevelConfig): void {
    this.campaignCash -= venue.entryFee + venue.escrow;
    this.state = createDemoGame(`bid-or-bust-${Date.now()}`, venue.coreVenueId);
    this.state.venue = {
      ...this.state.venue,
      name: venue.name,
      entryFee: venue.entryFee,
      escrowFunds: venue.escrow,
      lotCount: venue.lotCountMin,
      lotValueRange: [venue.expectedReturnMin, venue.expectedReturnMax],
      bidStep: venue.bidStep,
      qualificationRequirements:
        venue.requiredKeeps === 0 ? "None" : `${venue.requiredKeeps} credential item(s)`,
      riskLevel: venue.risk.toLowerCase() as "low" | "medium" | "high",
    };
    this.state.config = {
      ...this.state.config,
      entryFee: venue.entryFee,
      bidStep: venue.bidStep,
      lotCount: venue.lotCountMin,
      startingCash: this.campaignCash + venue.escrow,
    };
    this.state.referenceLotValueRange = [venue.expectedReturnMin, venue.expectedReturnMax];
    this.state.lots = this.state.lots.slice(0, venue.lotCountMin);
    this.state.players.forEach((player, index) => {
      player.escrow = venue.escrow;
      player.totalCash = index === 0 ? this.campaignCash : Math.max(this.campaignCash, venue.escrow);
      player.isBroke = false;
    });
    startNextLot(this.state);
  }

  private wireEvents(): void {
    if (this.view === "home") {
      this.root.querySelector("#btn-start-harbor")?.addEventListener("click", () => {
        const venue = AUCTION_LEVELS.find((entry) => entry.id === this.selectedVenueId) ?? AUCTION_LEVELS[0];
        if (!this.canEnterVenue(venue)) {
          this.render();
          return;
        }
        this.enterVenue(venue);
        this.selectedPlayerId = this.networkStatus.assignedPlayerId ?? "p1";
        this.selectedItemId = undefined;
        this.view = "auction";
        this.broadcast();
        this.render();
      });
      this.root.querySelectorAll<HTMLButtonElement>("[data-venue]").forEach((button) => {
        button.addEventListener("click", () => {
          this.selectedVenueId = button.dataset.venue ?? "old-harbor";
          this.render();
        });
      });
      this.root.querySelector("#btn-open-storage")?.addEventListener("click", () => {
        this.root.querySelector(".storage-home-button")?.classList.toggle("active");
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
    this.root.querySelector("#btn-plus-one")?.addEventListener("click", () => {
      this.root.querySelector<HTMLInputElement>("#raise-steps")!.value = "1";
    });
    this.root.querySelector("#btn-plus-two")?.addEventListener("click", () => {
      this.root.querySelector<HTMLInputElement>("#raise-steps")!.value = "2";
    });
    this.root.querySelector("#btn-all-in")?.addEventListener("click", () => {
      this.sendOrApply({
        type: "bid",
        playerId: this.selectedPlayerId,
        action: { type: "all-in" },
      });
    });
    this.root.querySelector("#btn-raise")?.addEventListener("click", () => {
      const steps = Number(
        this.root.querySelector<HTMLInputElement>("#raise-steps")?.value ?? 1,
      );
      this.sendOrApply({
        type: "bid",
        playerId: this.selectedPlayerId,
        action: { type: "raise", steps },
      });
    });
    this.root.querySelector("#btn-hold")?.addEventListener("click", () => {
      this.sendOrApply({
        type: "bid",
        playerId: this.selectedPlayerId,
        action: { type: "hold" },
      });
    });
    this.root.querySelector("#btn-fold")?.addEventListener("click", () => {
      this.sendOrApply({
        type: "bid",
        playerId: this.selectedPlayerId,
        action: { type: "fold" },
      });
    });
    this.root.querySelector("#btn-view-results")?.addEventListener("click", () => {
      this.view = "results";
      this.render();
    });
    this.root.querySelector("#btn-next-lot")?.addEventListener("click", () => {
      if (this.view === "results" && this.state.phase === "game-over") {
        this.view = "home";
        this.render();
        return;
      }
      this.selectedItemId = undefined;
      this.sendOrApply({ type: "next-lot", playerId: this.selectedPlayerId });
      this.view = this.state.phase === "game-over" ? "results" : "auction";
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
        view: this.view,
        phase: this.state.phase,
        perspectivePlayerId: this.selectedPlayerId,
        lotIndex: this.state.lotIndex,
        auction: this.state.auction
          ? {
              round: this.state.auction.round,
              status: this.state.auction.status,
              highestBid: this.state.auction.highestBid,
              secondBid: this.state.auction.secondBid,
              highBidderId: getHighBidderId(this.state.auction),
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
          totalCash: player.totalCash,
          escrow: player.escrow,
          bankroll: playerBankroll(player),
          isBroke: player.isBroke,
        })),
        latestLog: this.state.log.slice(0, 5).map((entry) => entry.text),
      });

    window.advanceTime = () => {
      this.draw();
    };
  }
}

function metricBlock(icon: string, label: string, value: string): string {
  return `<div class="metric-block"><span>${icon}</span><div><small>${label}</small><strong>${value}</strong></div></div>`;
}

function summaryRow(
  icon: string,
  label: string,
  detail: string,
  amount: number,
  tone: string,
): string {
  const sign = amount < 0 ? "-" : "";
  return `
    <article class="summary-row ${tone}">
      <span>${icon}</span>
      <div><strong>${label}</strong><p>${detail}</p></div>
      <b>${sign}$${Math.abs(amount)}</b>
    </article>
  `;
}

function getPlayer(state: GameState, playerId: PlayerId): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

function playerBankroll(player: { totalCash: number; escrow: number }): number {
  return player.totalCash + player.escrow;
}

function getHighBidderId(auction: NonNullable<GameState["auction"]>): PlayerId | undefined {
  const contenders = auction.activePlayerIds.filter(
    (id) => auction.playerStates[id]?.commitmentBid === auction.highestBid,
  );
  return auction.highestBid > 0 && contenders.length === 1 ? contenders[0] : undefined;
}

function iconForMaterial(material: string): string {
  const icons: Record<string, string> = {
    metal: "🔭",
    wood: "📦",
    glass: "🍾",
    ceramic: "🏺",
    paper: "📔",
    cloth: "🧵",
    unknown: "❔",
  };
  return icons[material] ?? "📦";
}

function avatarForRank(rank: number): string {
  return ["🧔", "👩", "🧓", "🧢"][rank - 1] ?? "⚓";
}

function starString(count: number): string {
  return "★".repeat(count);
}

function parseAuctionLevels(csv: string): AuctionLevelConfig[] {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    return {
      id: record.id,
      index: Number(record.index),
      name: record.name,
      x: Number(record.x),
      y: Number(record.y),
      stars: Number(record.stars),
      risk: record.risk as RiskLevel,
      coreVenueId: record.coreVenueId,
      escrow: Number(record.escrow),
      bidStep: Number(record.bidStep),
      entryFee: Number(record.entryFee),
      requiredKeeps: Number(record.requiredKeeps),
      expectedReturnMin: Number(record.expectedReturnMin),
      expectedReturnMax: Number(record.expectedReturnMax),
      lotCountMin: Number(record.lotCountMin),
      lotCountMax: Number(record.lotCountMax),
    };
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
