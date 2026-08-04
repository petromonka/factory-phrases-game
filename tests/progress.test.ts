import { expect, it } from "vitest";
import { RunProgress } from "../src/game/progress";

it("keeps collectible and controller completion in memory only", () => {
  const progress = new RunProgress(["security-serhii", "it-vasyl"]);

  progress.completeCollectible("security-serhii");
  expect(progress.snapshot()).toEqual({
    collectibles: new Set(["security-serhii"]),
    controllerCompleted: false,
    collectibleCount: 1,
    collectibleTotal: 2,
    parkingUnlocked: false
  });

  progress.completeCollectible("it-vasyl");
  progress.completeController();
  expect(progress.isParkingUnlocked()).toBe(true);

  progress.reset();
  expect(progress.snapshot().collectibleCount).toBe(0);
  expect(progress.snapshot().controllerCompleted).toBe(false);
});

it("ignores unknown collectible ids", () => {
  const progress = new RunProgress(["security-serhii"]);

  progress.completeCollectible("unknown");

  expect(progress.snapshot().collectibleCount).toBe(0);
});
