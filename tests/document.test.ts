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
  expect(styleSource).toContain("@media (pointer: coarse) and (orientation: portrait)");
  expect(styleSource).toContain("@media (pointer: coarse)");
});

it("contains the mobile interaction button and orientation hint copy", () => {
  document.body.innerHTML = readFileSync("index.html", "utf8");

  expect(document.querySelector("#touch-interaction")?.textContent).toBe("E");
  expect(document.querySelector("#orientation-hint")?.textContent).toBe("Поверніть телефон горизонтально");
});

it("uses mobile-safe layout rules for touch controls and portrait mode", () => {
  const css = readFileSync("src/style.css", "utf8");

  expect(css).toContain("safe-area-inset-right");
  expect(css).toContain("@media (pointer: coarse)");
  expect(css).toContain("@media (pointer: coarse) and (orientation: portrait)");
  expect(css).toContain("font-size: clamp(");
});

it("reserves a portrait phone control deck below the game canvas", () => {
  const css = readFileSync("src/style.css", "utf8");

  expect(css).toContain("--mobile-controls-height");
  expect(css).toContain("--mobile-joystick-size");
  expect(css).toContain("--mobile-action-size");
  expect(css).toContain("#mobile-controls-zone");
  expect(css).toContain("height: calc(100svh - var(--mobile-controls-height))");
  expect(css).toContain("bottom: calc(var(--mobile-controls-height)");
  expect(css).toContain("width: var(--mobile-joystick-size)");
  expect(css).toContain("height: var(--mobile-action-size)");
});
