import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("identifies the game document as Ukrainian", () => {
  const parsed = new DOMParser().parseFromString(readFileSync("index.html", "utf8"), "text/html");

  expect(parsed.documentElement.lang).toBe("uk");
});

it("provides touch controls and a portrait-orientation hint", () => {
  const documentSource = readFileSync("index.html", "utf8");
  const styleSource = readFileSync("src/style.css", "utf8");

  expect(documentSource).toContain('id="touch-joystick"');
  expect(documentSource).toContain('id="touch-joystick-knob"');
  expect(documentSource).toContain('id="orientation-hint"');
  expect(documentSource).toContain("Поверніть телефон горизонтально");
  expect(styleSource).toContain("touch-action: none");
  expect(styleSource).toContain("env(safe-area-inset-left)");
  expect(styleSource).toContain("@media (orientation: portrait)");
  expect(styleSource).toContain("@media (pointer: coarse)");
});
