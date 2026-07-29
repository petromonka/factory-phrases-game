import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import "./style.css";

new Phaser.Game(createGameConfig("game"));
