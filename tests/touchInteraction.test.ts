import { afterEach, expect, it } from "vitest";
import { createTouchInteractionButton } from "../src/game/touchInteraction";

afterEach(() => document.body.replaceChildren());

it("appears only on touch-capable devices and consumes one press", () => {
  const button = document.createElement("button");
  const source = createTouchInteractionButton(button, true);

  expect(button.hidden).toBe(false);
  button.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, pointerType: "touch" }));
  expect(source.consumePressed()).toBe(true);
  expect(source.consumePressed()).toBe(false);
  window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, pointerType: "touch" }));
  expect(button.classList.contains("is-pressed")).toBe(false);
  source.destroy();
});

it("stays hidden when touch is unavailable", () => {
  const button = document.createElement("button");
  const source = createTouchInteractionButton(button, false);

  expect(button.hidden).toBe(true);
  expect(source.consumePressed()).toBe(false);
  source.destroy();
});
