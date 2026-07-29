import { expect, it } from "vitest";
import { nearestInteractable } from "../src/game/interaction";

it("returns the nearest candidate inside the interaction radius", () => {
  const result = nearestInteractable(
    { x: 0, y: 0 },
    [{ id: "far", x: 90, y: 0 }, { id: "near", x: 20, y: 0 }]
  );

  expect(result?.id).toBe("near");
});

it("returns undefined when every candidate is outside the radius", () => {
  expect(nearestInteractable({ x: 0, y: 0 }, [{ id: "far", x: 65, y: 0 }])).toBeUndefined();
});

it("does not reorder the candidate input while finding the nearest match", () => {
  const candidates = [{ id: "far", x: 50, y: 0 }, { id: "near", x: 20, y: 0 }];

  nearestInteractable({ x: 0, y: 0 }, candidates);

  expect(candidates.map((candidate) => candidate.id)).toEqual(["far", "near"]);
});

it("keeps a usable interaction range without reaching across the proven 61px wall gap", () => {
  const result = nearestInteractable(
    { x: 0, y: 0 },
    [{ id: "wall-adjacent", x: 61, y: 0 }, { id: "same-room", x: 20, y: 0 }]
  );

  expect(result?.id).toBe("same-room");
});
