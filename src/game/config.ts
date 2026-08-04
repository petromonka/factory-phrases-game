import Phaser from "phaser";
import { FactoryScene } from "./FactoryScene";
import { stoppedMovementSource } from "./movement";
import type { MovementSource } from "./touchController";
import type { TouchInteractionSource } from "./touchInteraction";

const stoppedInteractionSource: TouchInteractionSource = {
  consumePressed: () => false,
  destroy: () => undefined
};

export function createGameConfig(
  parent: string,
  touchMovement: MovementSource = stoppedMovementSource,
  touchInteraction: TouchInteractionSource = stoppedInteractionSource
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#1d2420",
    pixelArt: true,
    physics: { default: "arcade", arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [FactoryScene],
    callbacks: {
      preBoot(game) {
        game.registry.set("touchMovement", touchMovement);
        game.registry.set("touchInteraction", touchInteraction);
      }
    }
  };
}
