import { describe, expect, it } from "vitest";
import { joystickVector, strongerMovement } from "../src/game/touchMovement";

describe("joystickVector", () => {
  it("returns zero at the center", () => {
    expect(joystickVector(50, 50, 50, 50, 40)).toEqual({ x: 0, y: 0 });
  });

  it("scales cardinal movement by distance", () => {
    expect(joystickVector(50, 50, 70, 50, 40)).toEqual({ x: 0.5, y: 0 });
  });

  it("clamps diagonal movement to magnitude one", () => {
    const result = joystickVector(0, 0, 100, 100, 40);
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(1);
    expect(result.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("returns zero for a non-positive radius", () => {
    expect(joystickVector(0, 0, 10, 10, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("strongerMovement", () => {
  it("uses touch when its magnitude is greater", () => {
    expect(strongerMovement({ x: 0, y: 0 }, { x: 0.75, y: 0 }))
      .toEqual({ x: 0.75, y: 0 });
  });

  it("keeps keyboard on equal magnitude", () => {
    expect(strongerMovement({ x: 1, y: 0 }, { x: 0, y: 1 }))
      .toEqual({ x: 1, y: 0 });
  });

  it("clamps malformed input to magnitude one", () => {
    expect(Math.hypot(...Object.values(strongerMovement(
      { x: 2, y: 0 },
      { x: 0, y: 0 }
    )))).toBeCloseTo(1);
  });
});
