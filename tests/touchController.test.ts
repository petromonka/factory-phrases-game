import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTouchController,
  type TouchController
} from "../src/game/touchController";

function pointer(
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number
): PointerEvent {
  const event = typeof PointerEvent === "function"
    ? new PointerEvent(type, { bubbles: true, cancelable: true, clientX, clientY })
    : new Event(type, { bubbles: true, cancelable: true });

  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY }
  });

  return event as PointerEvent;
}

describe("createTouchController", () => {
  let root: HTMLDivElement;
  let knob: HTMLDivElement;
  let controller: TouchController | undefined;

  beforeEach(() => {
    root = document.createElement("div");
    knob = document.createElement("div");
    root.append(knob);
    document.body.append(root);

    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
      x: 40,
      y: 40,
      width: 120,
      height: 120,
      top: 40,
      right: 160,
      bottom: 160,
      left: 40,
      toJSON: () => ({})
    });
  });

  afterEach(() => {
    controller?.destroy();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  function makeController(touchCapable?: boolean): TouchController {
    controller = touchCapable === undefined
      ? createTouchController(root, knob)
      : createTouchController(root, knob, touchCapable);
    return controller;
  }

  it("tracks one pointer and resets on release", () => {
    const controller = makeController(true);
    root.dispatchEvent(pointer("pointerdown", 7, 140, 100));

    expect(controller.current().x).toBeGreaterThan(0);
    expect(knob.style.transform).toBe("translate(40px, 0px)");

    window.dispatchEvent(pointer("pointerup", 7, 140, 100));
    expect(controller.current()).toEqual({ x: 0, y: 0 });
    expect(knob.style.transform).toBe("translate(0px, 0px)");
  });

  it("updates movement while the active pointer moves", () => {
    const controller = makeController(true);
    root.dispatchEvent(pointer("pointerdown", 4, 100, 100));
    const move = pointer("pointermove", 4, 100, 40);

    root.dispatchEvent(move);

    expect(controller.current()).toEqual({ x: 0, y: -1 });
    expect(knob.style.transform).toBe("translate(0px, -60px)");
    expect(move.defaultPrevented).toBe(true);
  });

  it("resets on pointercancel", () => {
    const controller = makeController(true);
    root.dispatchEvent(pointer("pointerdown", 3, 100, 60));

    window.dispatchEvent(pointer("pointercancel", 3, 100, 60));

    expect(controller.current()).toEqual({ x: 0, y: 0 });
  });

  it("ignores a secondary pointer", () => {
    const controller = makeController(true);
    root.dispatchEvent(pointer("pointerdown", 1, 140, 100));
    const first = controller.current();

    root.dispatchEvent(pointer("pointerdown", 2, 60, 100));
    root.dispatchEvent(pointer("pointermove", 2, 60, 100));

    expect(controller.current()).toEqual(first);
  });

  it("hides the root when touch is unavailable", () => {
    makeController(false);

    expect(root.hidden).toBe(true);
  });

  it("shows the root when touch is available", () => {
    root.hidden = true;

    makeController(true);

    expect(root.hidden).toBe(false);
  });

  it("uses coarse pointer media queries for default touch capability", () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(pointer: coarse)",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    });

    makeController();

    expect(matchMedia).toHaveBeenCalledWith("(pointer: coarse)");
    expect(root.hidden).toBe(false);
  });

  it("prevents default on active joystick gestures", () => {
    const controller = makeController(true);
    const event = pointer("pointerdown", 1, 120, 100);

    root.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    controller.destroy();
  });

  it("captures the active pointer when supported", () => {
    const setPointerCapture = vi.fn();
    root.setPointerCapture = setPointerCapture;
    makeController(true);

    root.dispatchEvent(pointer("pointerdown", 8, 120, 100));

    expect(setPointerCapture).toHaveBeenCalledWith(8);
  });

  it("returns immutable movement snapshots", () => {
    const controller = makeController(true);
    root.dispatchEvent(pointer("pointerdown", 5, 130, 100));

    const snapshot = controller.current();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(controller.current()).not.toBe(snapshot);
  });

  it("destroy removes listeners and resets movement", () => {
    const controller = makeController(true);
    root.dispatchEvent(pointer("pointerdown", 5, 140, 100));

    controller.destroy();

    expect(controller.current()).toEqual({ x: 0, y: 0 });
    expect(knob.style.transform).toBe("translate(0px, 0px)");

    root.dispatchEvent(pointer("pointerdown", 6, 60, 100));
    root.dispatchEvent(pointer("pointermove", 5, 60, 100));
    window.dispatchEvent(pointer("pointerup", 5, 60, 100));
    expect(controller.current()).toEqual({ x: 0, y: 0 });
  });
});
