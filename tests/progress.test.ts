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
    hasMouse: false,
    hasScanner: false,
    mouseDelivered: false,
    scannerDelivered: false,
    objectiveCount: 1,
    objectiveTotal: 5,
    parkingUnlocked: false
  });

  progress.completeCollectible("it-vasyl");
  progress.completeController();
  progress.pickupMouse();
  progress.deliverMouse();
  progress.pickupScanner();
  progress.deliverScanner();
  expect(progress.isParkingUnlocked()).toBe(true);

  progress.reset();
  expect(progress.snapshot().collectibleCount).toBe(0);
  expect(progress.snapshot().objectiveCount).toBe(0);
  expect(progress.snapshot().controllerCompleted).toBe(false);
  expect(progress.snapshot().hasMouse).toBe(false);
  expect(progress.snapshot().hasScanner).toBe(false);
  expect(progress.snapshot().mouseDelivered).toBe(false);
  expect(progress.snapshot().scannerDelivered).toBe(false);
});

it("ignores unknown collectible ids", () => {
  const progress = new RunProgress(["security-serhii"]);

  progress.completeCollectible("unknown");

  expect(progress.snapshot().collectibleCount).toBe(0);
});

it("counts the first controller request as one required objective", () => {
  const progress = new RunProgress(["security-serhii", "it-vasyl"]);

  expect(progress.snapshot().objectiveTotal).toBe(5);
  progress.completeCollectible("security-serhii");
  expect(progress.snapshot().objectiveCount).toBe(1);
  progress.completeController();
  expect(progress.snapshot().objectiveCount).toBe(2);
  progress.completeController();
  expect(progress.snapshot().objectiveCount).toBe(2);
});

it("counts mouse and scanner deliveries as required objectives", () => {
  const progress = new RunProgress([
    "security-serhii",
    "it-vasyl",
    "shifts-serhii",
    "qm-olena",
    "sewing-sasha"
  ]);

  expect(progress.snapshot().objectiveTotal).toBe(8);
  for (const id of progress.snapshot().collectibles) {
    progress.completeCollectible(id);
  }
  progress.completeCollectible("security-serhii");
  progress.completeCollectible("it-vasyl");
  progress.completeCollectible("shifts-serhii");
  progress.completeCollectible("qm-olena");
  progress.completeCollectible("sewing-sasha");
  progress.completeController();
  expect(progress.isParkingUnlocked()).toBe(false);

  progress.pickupMouse();
  expect(progress.snapshot().hasMouse).toBe(true);
  expect(progress.snapshot().objectiveCount).toBe(6);
  progress.deliverMouse();
  expect(progress.snapshot().hasMouse).toBe(false);
  expect(progress.snapshot().mouseDelivered).toBe(true);
  expect(progress.snapshot().objectiveCount).toBe(7);
  progress.pickupScanner();
  progress.deliverScanner();
  expect(progress.snapshot().hasScanner).toBe(false);
  expect(progress.snapshot().scannerDelivered).toBe(true);
  expect(progress.snapshot().objectiveCount).toBe(8);
  expect(progress.isParkingUnlocked()).toBe(true);
});
