import { expect, it } from "vitest";
import { movementVector } from "../src/game/movement";

it("normalizes diagonal movement", () => {
  const result = movementVector({ left: false, right: true, up: true, down: false });

  expect(Math.hypot(result.x, result.y)).toBeCloseTo(1);
  expect(result.x).toBeGreaterThan(0);
  expect(result.y).toBeLessThan(0);
});
