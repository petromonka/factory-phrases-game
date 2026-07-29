import { expect, it, vi } from "vitest";
import { createGameConfig } from "../src/game/config";
import { movementVector } from "../src/game/movement";

it("normalizes diagonal movement", () => {
  const result = movementVector({ left: false, right: true, up: true, down: false });

  expect(Math.hypot(result.x, result.y)).toBeCloseTo(1);
  expect(result.x).toBeGreaterThan(0);
  expect(result.y).toBeLessThan(0);
});

it("registers the touch movement source for scenes", () => {
  const source = { current: () => ({ x: 0.5, y: 0 }) };
  const set = vi.fn();
  const config = createGameConfig("game", source);

  expect(config.callbacks?.preBoot).toBeTypeOf("function");

  const preBoot = config.callbacks?.preBoot as unknown as
    ((game: { registry: { set: typeof set } }) => void) | undefined;
  preBoot?.({ registry: { set } });

  expect(set).toHaveBeenCalledWith("touchMovement", source);
});
