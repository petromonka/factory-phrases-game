import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("defines Dimon, Yura, car departure, and restart behavior", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).toContain("Не міган канєшно, але піде");
  expect(source).toContain("Щось в мене цееееейво гальмує інтеееернееет в палатці");
  expect(source).toContain("startCarDeparture");
  expect(source).toContain("restartFactory");
  expect(source).toContain('this.scene.start("factory")');
});
