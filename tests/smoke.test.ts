import { describe, expect, it } from "vitest";
import { createGameConfig } from "../src/game/config";

describe("createGameConfig", () => {
  it("uses a 16:9 pixel-art canvas and Arcade physics", () => {
    const config = createGameConfig("game");
    expect(config.width).toBe(960);
    expect(config.height).toBe(540);
    expect(config.pixelArt).toBe(true);
    expect(config.physics).toMatchObject({ default: "arcade" });
  });
});
