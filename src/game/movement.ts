export interface MovementInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export function movementVector(input: MovementInput): { x: number; y: number } {
  const x = Number(input.right) - Number(input.left);
  const y = Number(input.down) - Number(input.up);
  const length = Math.hypot(x, y);

  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}
