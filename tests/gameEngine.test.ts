import { describe, expect, it } from "vitest";
import {
  beginBidding,
  createDemoGame,
  lookAtItem,
  startNextLot,
  submitBidAction,
  useRandomSkill,
} from "../src/core/gameEngine";
import type { GameState } from "../src/core/types";

describe("Bid or Bust core engine", () => {
  it("starts with container lots that contain at least ten items", () => {
    const state = createStartedGame("lots");
    expect(state.auction?.lot.items.length).toBeGreaterThanOrEqual(10);
    expect(state.auction?.round).toBe(1);
  });

  it("allows exactly one free look per player per round", () => {
    const state = createStartedGame("look");
    const items = state.auction?.lot.items ?? [];
    expect(lookAtItem(state, "p1", items[0].instanceId).ok).toBe(true);
    expect(lookAtItem(state, "p1", items[1].instanceId).ok).toBe(false);
  });

  it("leaks skill intel on the next bidding round", () => {
    const state = createStartedGame("skill-leak");
    expect(useRandomSkill(state, "p1").ok).toBe(true);
    expect(state.auction?.delayedIntel.length).toBe(1);

    finishRoundWithFollows(state);

    expect(state.auction?.round).toBe(2);
    expect(state.auction?.publicIntel.some((intel) => intel.source === "public-leak")).toBe(
      true,
    );
  });

  it("does not allow follow in the final round", () => {
    const state = createStartedGame("final-follow");
    for (let round = 1; round < 5; round += 1) {
      finishRoundWithFollows(state);
    }

    expect(state.auction?.round).toBe(5);
    beginBidding(state);
    const currentTurn = state.auction?.currentTurnPlayerId;
    expect(currentTurn).toBeTruthy();
    expect(submitBidAction(state, currentTurn!, { type: "follow" }).ok).toBe(false);
  });

  it("sells the lot to the last active bidder after folds", () => {
    const state = createStartedGame("fold-sale");
    beginBidding(state);
    const legalRaise = state.auction!.currentBid + state.config.minRaise;
    expect(submitBidAction(state, "p1", { type: "raise", amount: legalRaise }).ok).toBe(true);
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

function finishRoundWithFollows(state: GameState): void {
  beginBidding(state);
  while (state.auction?.status === "bidding") {
    const playerId = state.auction.currentTurnPlayerId;
    if (!playerId) {
      break;
    }
    submitBidAction(state, playerId, { type: "follow" });
  }
}
