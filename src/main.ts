import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import "./style.css";

type FactorySceneWithPlayer = Phaser.Scene & {
  player?: Phaser.Physics.Arcade.Sprite;
};

type FactoryTestWindow = Window & {
  __factoryTestPositionPlayer?: (x: number, y: number) => void;
};

const game = new Phaser.Game(createGameConfig("game"));

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
