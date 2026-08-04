import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { AmbientDialogueState } from "../src/game/controllerDialogue";
import { CONTROLLER_REQUESTS } from "../src/game/controllers";
import {
  hasFinitePointCoordinates,
  isCollectibleTarget,
  transitionNpcTarget,
  type NpcTarget
} from "../src/game/FactoryScene";
import { EdgeTrigger, nearestInteractable, proximityDialogueTarget } from "../src/game/interaction";

function ambientTarget(id: string): Extract<NpcTarget, { kind: "ambient" }> {
  return { kind: "ambient", id, name: id, sprite: {} as never };
}

function collectibleTarget(id: string): Extract<NpcTarget, { kind: "collectible" }> {
  return { kind: "collectible", id, name: id, phrase: id, sprite: {} as never };
}

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

it("fires once for a held key or held touch button", () => {
  const trigger = new EdgeTrigger();

  expect(trigger.update(false)).toBe(false);
  expect(trigger.update(true)).toBe(true);
  expect(trigger.update(true)).toBe(false);
  expect(trigger.update(false)).toBe(false);
  expect(trigger.update(true)).toBe(true);
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

it("opens dialogue by returning a character id on entry", () => {
  expect(proximityDialogueTarget(
    { x: 0, y: 0 },
    [{ id: "security", x: 40, y: 0 }]
  )).toBe("security");
});

it("closes dialogue by returning undefined after exit", () => {
  expect(proximityDialogueTarget(
    { x: 0, y: 0 },
    [{ id: "security", x: 57, y: 0 }]
  )).toBeUndefined();
});

it("switches directly to the nearest character in overlapping range", () => {
  expect(proximityDialogueTarget(
    { x: 0, y: 0 },
    [
      { id: "security", x: 45, y: 0 },
      { id: "vasyl", x: 20, y: 0 }
    ]
  )).toBe("vasyl");
});

it("chooses the nearest target from one collectible and ambient candidate list", () => {
  const candidates = [
    { id: "sewing-sasha", x: 45, y: 0 },
    { id: "controller-1", x: 20, y: 0 }
  ];

  expect(proximityDialogueTarget({ x: 0, y: 0 }, candidates)).toBe("controller-1");
});

it("routes only collectible targets through progress discovery", () => {
  expect(isCollectibleTarget({ kind: "collectible" })).toBe(true);
  expect(isCollectibleTarget({ kind: "ambient" })).toBe(false);
});

it("routes ambient entry only through the presentation handler", () => {
  const target = ambientTarget("controller-1");
  const openCollectible = vi.fn();
  const openAmbient = vi.fn();
  const close = vi.fn();

  const activeId = transitionNpcTarget(
    undefined,
    target,
    new AmbientDialogueState(() => 0),
    { close, openCollectible, openAmbient }
  );

  expect(activeId).toBe("controller-1");
  expect(openCollectible).not.toHaveBeenCalled();
  expect(openAmbient).toHaveBeenCalledWith(target, CONTROLLER_REQUESTS[0]);
  expect(close).not.toHaveBeenCalled();
});

it("closes and clears ambient state on exit before selecting again", () => {
  const target = ambientTarget("controller-1");
  const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.5);
  const ambientState = new AmbientDialogueState(random);
  const openAmbient = vi.fn();
  const actions = { close: vi.fn(), openCollectible: vi.fn(), openAmbient };

  const enteredId = transitionNpcTarget(undefined, target, ambientState, actions);
  const exitedId = transitionNpcTarget(enteredId, undefined, ambientState, actions);
  transitionNpcTarget(exitedId, target, ambientState, actions);

  expect(actions.close).toHaveBeenCalledTimes(1);
  expect(ambientState.active()).toEqual({ id: "controller-1", request: CONTROLLER_REQUESTS[2] });
  expect(openAmbient).toHaveBeenNthCalledWith(1, target, CONTROLLER_REQUESTS[0]);
  expect(openAmbient).toHaveBeenNthCalledWith(2, target, CONTROLLER_REQUESTS[2]);
});

it("closes the previous ambient dialogue before switching controllers", () => {
  const first = ambientTarget("controller-1");
  const second = ambientTarget("controller-2");
  const events: string[] = [];
  const ambientState = new AmbientDialogueState(() => 0);
  const actions = {
    close: () => events.push("close"),
    openCollectible: () => events.push("collectible"),
    openAmbient: (target: Extract<NpcTarget, { kind: "ambient" }>) => events.push(target.id)
  };

  const firstId = transitionNpcTarget(undefined, first, ambientState, actions);
  const secondId = transitionNpcTarget(firstId, second, ambientState, actions);

  expect(secondId).toBe("controller-2");
  expect(events).toEqual(["controller-1", "close", "controller-2"]);
  expect(ambientState.active()?.id).toBe("controller-2");
});

it("switches from collectible discovery to ambient presentation without rediscovering", () => {
  const collectible = collectibleTarget("sewing-sasha");
  const ambient = ambientTarget("controller-1");
  const events: string[] = [];
  const actions = {
    close: () => events.push("close"),
    openCollectible: () => events.push("discover"),
    openAmbient: () => events.push("ambient")
  };
  const ambientState = new AmbientDialogueState(() => 0);

  const collectibleId = transitionNpcTarget(undefined, collectible, ambientState, actions);
  transitionNpcTarget(collectibleId, ambient, ambientState, actions);

  expect(events).toEqual(["discover", "close", "ambient"]);
});

it("rejects malformed or non-finite NPC point coordinates", () => {
  expect(hasFinitePointCoordinates({ x: 10, y: 20 })).toBe(true);
  expect(hasFinitePointCoordinates({ x: Number.NaN, y: 20 })).toBe(false);
  expect(hasFinitePointCoordinates({ x: 10, y: Number.POSITIVE_INFINITY })).toBe(false);
  expect(hasFinitePointCoordinates({ x: "10", y: 20 })).toBe(false);
  expect(hasFinitePointCoordinates(undefined)).toBe(false);
});

it("loads controller points and constructs one combined scene target list", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain('map.getObjectLayer("controllers")');
  expect(source).toContain("this.npcs = [...collectibleNpcs, ...ambientNpcs]");
});
