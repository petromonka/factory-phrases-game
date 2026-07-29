import { expect, it } from "vitest";
import { renderFatalError } from "../src/game/errorScreen";

it("replaces the game container with a readable error", () => {
  const container = document.createElement("main");

  renderFatalError(container, "Не вдалося завантажити карту.");

  expect(container.getAttribute("role")).toBe("alert");
  expect(container.textContent).toContain("Гру не вдалося запустити");
  expect(container.textContent).toContain("Не вдалося завантажити карту.");
});
