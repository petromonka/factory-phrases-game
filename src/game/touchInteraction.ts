export interface TouchInteractionSource {
  consumePressed(): boolean;
  destroy(): void;
}

export function createTouchInteractionButton(
  root: HTMLElement,
  touchCapable = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches
): TouchInteractionSource {
  let activePointerId: number | null = null;
  let pendingPress = false;

  root.hidden = !touchCapable;

  const reset = () => {
    activePointerId = null;
    root.classList.remove("is-pressed");
  };

  const onPointerDown = (event: PointerEvent) => {
    if (activePointerId !== null) return;

    event.preventDefault();
    activePointerId = event.pointerId;
    pendingPress = true;
    root.classList.add("is-pressed");
    if (typeof root.setPointerCapture === "function") {
      root.setPointerCapture(event.pointerId);
    }
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId === activePointerId) reset();
  };

  root.addEventListener("pointerdown", onPointerDown, { passive: false });
  window.addEventListener("pointerup", onPointerEnd);
  window.addEventListener("pointercancel", onPointerEnd);

  return {
    consumePressed: () => {
      const pressed = pendingPress;
      pendingPress = false;
      return pressed;
    },
    destroy: () => {
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      reset();
    }
  };
}
