export interface MovementInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

const STOPPED_MOVEMENT = Object.freeze({ x: 0, y: 0 });

export const stoppedMovementSource = Object.freeze({
  current: () => STOPPED_MOVEMENT
});

export function movementVector(input: MovementInput): { x: number; y: number } {
  const x = Number(input.right) - Number(input.left);
  const y = Number(input.down) - Number(input.up);
  const length = Math.hypot(x, y);

  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}
