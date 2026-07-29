export interface InteractionCandidate {
  id: string;
  x: number;
  y: number;
}

export function nearestInteractable(
  origin: { x: number; y: number },
  candidates: readonly InteractionCandidate[],
  maxDistance: number
): InteractionCandidate | undefined {
  const maxDistanceSquared = maxDistance ** 2;

  return candidates
    .map((candidate) => ({
      candidate,
      distanceSquared: (candidate.x - origin.x) ** 2 + (candidate.y - origin.y) ** 2
    }))
    .filter(({ distanceSquared }) => distanceSquared <= maxDistanceSquared)
    .sort((left, right) => left.distanceSquared - right.distanceSquared)[0]?.candidate;
}
