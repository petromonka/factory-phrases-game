import { expect, it } from "vitest";
import { DialogueRunner } from "../src/game/dialogue";

it("starts on the first line and advances once per interaction", () => {
  const runner = new DialogueRunner();

  runner.open({
    id: "guard",
    lines: [
      { speaker: "Я", text: "Привіт, Сєрий" },
      { speaker: "Сергій", text: "Здоров" }
    ]
  });

  expect(runner.currentLine()).toEqual({ speaker: "Я", text: "Привіт, Сєрий" });
  expect(runner.advance()).toEqual({ state: "line", completed: false });
  expect(runner.currentLine()).toEqual({ speaker: "Сергій", text: "Здоров" });
  expect(runner.advance()).toEqual({ state: "awaiting-close", completed: true });
  expect(runner.currentLine()).toEqual({ speaker: "Сергій", text: "Здоров" });
  expect(runner.advance()).toEqual({ state: "closed", completed: false });
  expect(runner.isOpen()).toBe(false);
});

it("rejects empty conversations before a blank panel can open", () => {
  const runner = new DialogueRunner();

  expect(() => runner.open({ id: "empty", lines: [] })).toThrow("Dialogue empty has no lines.");
});
