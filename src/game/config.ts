import Phaser from "phaser";
import { FactoryScene } from "./FactoryScene";
import { ParkingScene } from "./ParkingScene";
import { stoppedMovementSource } from "./movement";
import type { MovementSource } from "./touchController";
import type { TouchInteractionSource } from "./touchInteraction";

const stoppedInteractionSource: TouchInteractionSource = {
  consumePressed: () => false,
  setLabel: () => undefined,
  destroy: () => undefined
};

type ViewportShape = { width: number; height: number; coarsePointer: boolean };
type GameSize = { width: number; height: number };

export function gameSizeForViewport(viewport: ViewportShape): GameSize {
  if (viewport.coarsePointer && viewport.height > viewport.width) {
    return { width: 540, height: 960 };
  }

  return { width: 960, height: 540 };
}

function currentViewportShape(): ViewportShape {
  if (typeof window === "undefined") {
    return { width: 960, height: 540, coarsePointer: false };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches
  };
}

export function createGameConfig(
  parent: string,
  touchMovement: MovementSource = stoppedMovementSource,
  touchInteraction: TouchInteractionSource = stoppedInteractionSource
): Phaser.Types.Core.GameConfig {
  const size = gameSizeForViewport(currentViewportShape());

  return {
    type: Phaser.AUTO,
    parent,
    width: size.width,
    height: size.height,
    backgroundColor: "#1d2420",
    pixelArt: true,
    physics: { default: "arcade", arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [FactoryScene, ParkingScene],
    callbacks: {
      preBoot(game) {
        game.registry.set("touchMovement", touchMovement);
        game.registry.set("touchInteraction", touchInteraction);
      }
    }
  };
}
