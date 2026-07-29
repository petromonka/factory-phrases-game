import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderFatalError } from "../src/game/errorScreen";

const mainMocks = vi.hoisted(() => ({
  createGame: vi.fn(),
  createGameConfig: vi.fn(),
  createTouchController: vi.fn()
}));

vi.mock("phaser", () => ({
  default: {
    Game: mainMocks.createGame
  }
}));

vi.mock("../src/game/config", () => ({
  createGameConfig: mainMocks.createGameConfig
}));

vi.mock("../src/game/touchController", () => ({
  createTouchController: mainMocks.createTouchController
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  document.body.replaceChildren();
  mainMocks.createGameConfig.mockReturnValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("replaces the game container with a readable error", () => {
  const container = document.createElement("main");

  renderFatalError(container, "Не вдалося завантажити карту.");

  expect(container.getAttribute("role")).toBe("alert");
  expect(container.textContent).toContain("Гру не вдалося запустити");
  expect(container.textContent).toContain("Не вдалося завантажити карту.");
});

it("starts the game with stopped touch movement when joystick markup is missing", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

  await import("../src/main");

  expect(mainMocks.createTouchController).not.toHaveBeenCalled();
  expect(mainMocks.createGameConfig).toHaveBeenCalledOnce();
  const touchMovement = mainMocks.createGameConfig.mock.calls[0]?.[1];
  expect(touchMovement?.current()).toEqual({ x: 0, y: 0 });
  expect(mainMocks.createGame).toHaveBeenCalledOnce();
  expect(error).toHaveBeenCalledWith(
    "Unable to initialize touch controls: missing #touch-joystick or #touch-joystick-knob."
  );
});

it("destroys initialized touch controls on the first pagehide", async () => {
  const root = document.createElement("div");
  root.id = "touch-joystick";
  const knob = document.createElement("div");
  knob.id = "touch-joystick-knob";
  document.body.append(root, knob);
  const controller = {
    current: () => ({ x: 0.5, y: 0 }),
    destroy: vi.fn()
  };
  mainMocks.createTouchController.mockReturnValue(controller);

  await import("../src/main");
  window.dispatchEvent(new Event("pagehide"));
  window.dispatchEvent(new Event("pagehide"));

  expect(mainMocks.createTouchController).toHaveBeenCalledWith(root, knob);
  expect(mainMocks.createGameConfig).toHaveBeenCalledWith("game", controller);
  expect(controller.destroy).toHaveBeenCalledOnce();
});

it("starts the game with stopped touch movement when controller creation fails", async () => {
  const root = document.createElement("div");
  root.id = "touch-joystick";
  const knob = document.createElement("div");
  knob.id = "touch-joystick-knob";
  document.body.append(root, knob);
  const initializationError = new Error("pointer setup failed");
  mainMocks.createTouchController.mockImplementation(() => {
    throw initializationError;
  });
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

  await import("../src/main");

  const touchMovement = mainMocks.createGameConfig.mock.calls[0]?.[1];
  expect(touchMovement?.current()).toEqual({ x: 0, y: 0 });
  expect(mainMocks.createGame).toHaveBeenCalledOnce();
  expect(error).toHaveBeenCalledWith(
    "Unable to initialize touch controls: controller creation failed.",
    initializationError
  );
});

it("reads and combines touch movement during every scene update", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain('this.registry.get("touchMovement")');
  expect(source).toContain("this.touchMovement.current()");
  expect(source).toContain("strongerMovement(keyboardDirection, touchDirection)");
});
