import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import { stoppedMovementSource } from "./game/movement";
import {
  createTouchController,
  type MovementSource,
  type TouchController
} from "./game/touchController";
import "./style.css";

type FactorySceneWithPlayer = Phaser.Scene & {
  player?: Phaser.Physics.Arcade.Sprite;
};

type FactoryTestWindow = Window & {
  __factoryTestPositionPlayer?: (x: number, y: number) => void;
};

const joystick = document.getElementById("touch-joystick");
const joystickKnob = document.getElementById("touch-joystick-knob");
let controller: TouchController | undefined;
let touchMovement: MovementSource = stoppedMovementSource;

if (!joystick || !joystickKnob) {
  console.error(
    "Unable to initialize touch controls: missing #touch-joystick or #touch-joystick-knob."
  );
} else {
  try {
    controller = createTouchController(joystick, joystickKnob);
    touchMovement = controller;
  } catch (error) {
    console.error("Unable to initialize touch controls: controller creation failed.", error);
  }
}

const game = new Phaser.Game(createGameConfig("game", touchMovement));

window.addEventListener("pagehide", () => controller?.destroy(), { once: true });

if (import.meta.env.VITE_TEST_HOOKS === "1") {
  (window as FactoryTestWindow).__factoryTestPositionPlayer = (x, y) => {
    const scene = game.scene.getScene("factory") as FactorySceneWithPlayer;
    if (!scene.player) {
      throw new Error("Factory player is not ready");
    }

    scene.player.setPosition(x, y);
    scene.player.body?.reset(x, y);
  };
}
