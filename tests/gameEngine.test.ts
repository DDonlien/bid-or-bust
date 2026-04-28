import { describe, expect, it } from "vitest";
import {
  beginBidding,
  createDemoGame,
  getCommitment,
  lookAtItem,
  startNextLot,
  submitBidAction,
  useRandomSkill,
} from "../src/core/gameEngine";
import type { GameState } from "../src/core/types";

describe("Bid or Bust core engine", () => {
  it("starts a 3-lot session with lots that contain at least ten items", () => {
    const state = createStartedGame("lots");
    expect(state.config.lotCount).toBe(3);
    expect(state.auction?.lot.items.length).toBeGreaterThanOrEqual(10);
    expect(state.auction?.round).toBe(1);
    expect(state.players.every((player) => player.escrow === state.venue.escrowFunds)).toBe(
      true,
    );
  });

  it("allows exactly one private look per player per round", () => {
    const state = createStartedGame("look");
    const items = state.auction?.lot.items ?? [];
    expect(lookAtItem(state, "p1", items[0].instanceId).ok).toBe(true);
    expect(lookAtItem(state, "p1", items[1].instanceId).ok).toBe(false);
  });

  it("leaks skill intel on the next bidding round", () => {
    const state = createStartedGame("skill-leak");
    expect(useRandomSkill(state, "p1").ok).toBe(true);
    expect(state.auction?.delayedIntel.length).toBe(1);

    finishRoundWithHolds(state);

    expect(state.auction?.round).toBe(2);
    expect(state.auction?.publicIntel.some((intel) => intel.source === "public-leak")).toBe(
      true,
    );
  });

  it("raises by fixed steps and never lowers commitment on hold", () => {
    const state = createStartedGame("raise-step");
    beginBidding(state);
    const openingBid = state.auction!.lot.openingBid;
    expect(submitBidAction(state, "p1", { type: "raise", steps: 2 }).ok).toBe(true);
    expect(getCommitment(state, "p1")).toBe(openingBid + state.config.bidStep);
    expect(submitBidAction(state, "p2", { type: "hold" }).ok).toBe(true);
    expect(getCommitment(state, "p2")).toBe(0);
  });

  it("all-in immediately sells when it becomes the unique high bid", () => {
    const state = createStartedGame("all-in");
    beginBidding(state);
    expect(submitBidAction(state, "p1", { type: "all-in" }).ok).toBe(true);

    expect(state.phase).toBe("reveal");
    expect(state.auction?.soldToPlayerId).toBe("p1");
    expect(state.auction?.result?.finalPrice).toBe(state.venue.escrowFunds);
  });

  it("direct sale triggers after a dominant non-all-in commitment", () => {
    const state = createStartedGame("direct-sale");
    beginBidding(state);
    expect(submitBidAction(state, "p1", { type: "raise", steps: 1 }).ok).toBe(true);
    expect(submitBidAction(state, "p2", { type: "hold" }).ok).toBe(true);
    expect(submitBidAction(state, "p3", { type: "hold" }).ok).toBe(true);
    expect(submitBidAction(state, "p4", { type: "hold" }).ok).toBe(true);

    expect(state.phase).toBe("reveal");
    expect(state.auction?.soldToPlayerId).toBe("p1");
    expect(state.auction?.result?.reason).toContain("Direct sale");
  });

  it("sells the lot to the last active bidder after folds", () => {
    const state = createStartedGame("fold-sale");
    beginBidding(state);
    expect(submitBidAction(state, "p1", { type: "raise", steps: 1 }).ok).toBe(true);
    expect(submitBidAction(state, "p2", { type: "fold" }).ok).toBe(true);
    expect(submitBidAction(state, "p3", { type: "fold" }).ok).toBe(true);
    expect(submitBidAction(state, "p4", { type: "fold" }).ok).toBe(true);

    expect(state.phase).toBe("reveal");
    expect(state.auction?.soldToPlayerId).toBe("p1");
  });
});

function createStartedGame(seed: string): GameState {
  const state = createDemoGame(seed);
  startNextLot(state);
  return state;
}

function finishRoundWithHolds(state: GameState): void {
  beginBidding(state);
  while (state.auction?.status === "bidding") {
    const playerId = state.auction.currentTurnPlayerId;
    if (!playerId) {
      break;
    }
    submitBidAction(state, playerId, { type: "hold" });
  }
}
