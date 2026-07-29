export interface InteractionCandidate {
  id: string;
  x: number;
  y: number;
}

const INTERACTION_RADIUS = 56;

export function nearestInteractable(
  origin: { x: number; y: number },
  candidates: readonly InteractionCandidate[]
): InteractionCandidate | undefined {
  const maxDistanceSquared = INTERACTION_RADIUS ** 2;

  return candidates
    .map((candidate) => ({
      candidate,
      distanceSquared: (candidate.x - origin.x) ** 2 + (candidate.y - origin.y) ** 2
    }))
    .filter(({ distanceSquared }) => distanceSquared <= maxDistanceSquared)
    .sort((left, right) => left.distanceSquared - right.distanceSquared)[0]?.candidate;
}
