import { joystickVector, type MovementVector } from "./touchMovement";

export interface MovementSource {
  current(): MovementVector;
}

export interface TouchController extends MovementSource {
  destroy(): void;
}

const STOPPED: Readonly<MovementVector> = Object.freeze({ x: 0, y: 0 });

export function createTouchController(
  root: HTMLElement,
  knob: HTMLElement,
  touchCapable = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches
): TouchController {
  let activePointerId: number | null = null;
  let movement: MovementVector = STOPPED;

  root.hidden = !touchCapable;

  const reset = () => {
    activePointerId = null;
    movement = STOPPED;
    knob.style.transform = "translate(0px, 0px)";
  };

  const update = (event: PointerEvent) => {
    const bounds = root.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) / 2;
    movement = joystickVector(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
      event.clientX,
      event.clientY,
      radius
    );
    knob.style.transform =
      `translate(${movement.x * radius}px, ${movement.y * radius}px)`;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (activePointerId !== null) return;

    event.preventDefault();
    activePointerId = event.pointerId;
    if (typeof root.setPointerCapture === "function") {
      root.setPointerCapture(event.pointerId);
    }
    update(event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;

    event.preventDefault();
    update(event);
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId === activePointerId) reset();
  };

  root.addEventListener("pointerdown", onPointerDown, { passive: false });
  root.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerEnd);
  window.addEventListener("pointercancel", onPointerEnd);

  return {
    current: () => Object.freeze({ x: movement.x, y: movement.y }),
    destroy: () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      reset();
    }
  };
}
