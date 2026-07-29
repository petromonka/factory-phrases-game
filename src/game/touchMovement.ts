export interface MovementVector {
  x: number;
  y: number;
}

function clampVector(vector: MovementVector): MovementVector {
  const magnitude = Math.hypot(vector.x, vector.y);
  return magnitude <= 1 || magnitude === 0
    ? vector
    : { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function joystickVector(
  centerX: number,
  centerY: number,
  pointerX: number,
  pointerY: number,
  radius: number
): MovementVector {
  if (radius <= 0) return { x: 0, y: 0 };

  return clampVector({
    x: (pointerX - centerX) / radius,
    y: (pointerY - centerY) / radius
  });
}

export function strongerMovement(
  keyboard: MovementVector,
  touch: MovementVector
): MovementVector {
  const safeKeyboard = clampVector(keyboard);
  const safeTouch = clampVector(touch);

  return Math.hypot(safeTouch.x, safeTouch.y) > Math.hypot(safeKeyboard.x, safeKeyboard.y)
    ? safeTouch
    : safeKeyboard;
}
