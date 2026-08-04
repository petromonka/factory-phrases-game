import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { expect, it } from "vitest";

it("defines Dimon, Yura, car departure, and restart behavior", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).toContain("Не міган канєшно, але піде");
  expect(source).toContain("Щось в мене цееееейво гальмує інтеееернееет в палатці");
  expect(source).toContain("startCarDeparture");
  expect(source).toContain("restartFactory");
  expect(source).toContain('this.scene.start("factory")');
});

it("defines Dimon's two-line departure dialogue and grouped car behavior", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).toContain("Не міган канєшно, але піде");
  expect(source).toContain("Ну все, я пігнав, якщо щось то не дзвоніть і не пишіть 😁");
  expect(source).toContain("createCar(");
  expect(source).toContain("Phaser.GameObjects.Container");
  expect(source).toContain("targets: this.car");
  expect(source).toContain("speakerLabelFor(line)");
  expect(source).toContain("Натисни E, щоб говорити");
});

it("positions parking dialogue UI from the current scale size", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).toContain("const width = this.scale.width");
  expect(source).toContain("const height = this.scale.height");
  expect(source).toContain("height -");
});

it("does not draw a separate advance prompt over the parking dialogue body", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).not.toContain('promptText.setText("Натисни E, щоб далі")');
  expect(source).toContain('touchInteraction?.setLabel("Далі")');
});

it("renders a dialogue footer that explains desktop E and mobile Dali controls", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).toContain("dialogueHint");
  expect(source).toContain("dialogueAdvanceHint()");
  expect(source).toContain("Натисни E, щоб далі");
  expect(source).toContain("Натисни кнопку «Далі»");
});

it("uses Dimon's transparent BYD image asset for the departing car", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(existsSync("public/assets/sprites/dimon-byd.png")).toBe(true);
  expect(source).toContain('const DIMON_CAR_KEY = "dimon-byd"');
  expect(source).toContain('this.load.image(DIMON_CAR_KEY, "assets/sprites/dimon-byd.png")');
  expect(source).toContain("createDimonCar(");
  expect(source).toContain("setDisplaySize(96, 54)");
});
