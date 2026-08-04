import { describe, expect, it } from "vitest";
import { createGameConfig, gameSizeForViewport } from "../src/game/config";

describe("createGameConfig", () => {
  it("uses a 16:9 pixel-art canvas and Arcade physics", () => {
    const config = createGameConfig("game");
    expect(config.width).toBe(960);
    expect(config.height).toBe(540);
    expect(config.pixelArt).toBe(true);
    expect(config.physics).toMatchObject({ default: "arcade" });
  });

  it("uses a vertical game canvas for touch portrait phones", () => {
    expect(gameSizeForViewport({ width: 412, height: 915, coarsePointer: true })).toEqual({
      width: 540,
      height: 960
    });
    expect(gameSizeForViewport({ width: 915, height: 412, coarsePointer: true })).toEqual({
      width: 960,
      height: 540
    });
  });
});
