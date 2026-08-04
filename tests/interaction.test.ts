import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { hasFinitePointCoordinates, isCollectibleTarget } from "../src/game/FactoryScene";
import { EdgeTrigger, nearestInteractable, proximityDialogueTarget } from "../src/game/interaction";

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

it("keeps the legacy proximity helper as nearest-id-only math", () => {
  expect(proximityDialogueTarget(
    { x: 0, y: 0 },
    [{ id: "security", x: 40, y: 0 }]
  )).toBe("security");
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
  expect(source).toContain("this.npcs = [");
  expect(source).toContain("...this.createCollectibleTargets(npcLayer.objects)");
  expect(source).toContain("...this.createControllerTargets(controllerLayer.objects)");
});

it("does not open dialogue from proximity alone in FactoryScene", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain("nearestInteractable(");
  expect(source).toContain("interactionTrigger.update(");
  expect(source).toContain("showInteractionPrompt(");
  expect(source).not.toContain("transitionNpcTarget(");
  expect(source).not.toContain("ProgressStore");
  expect(source).not.toContain("localStorage");
});

it("draws an unlocked factory exit door and uses clear interaction copy", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain("createExitDoor");
  expect(source).toContain("setExitDoorVisible");
  expect(source).toContain("Натисни E, щоб говорити");
  expect(source).toContain("Натисни E, щоб вийти на парковку");
  expect(source).toContain('setLabel("Говорити")');
  expect(source).toContain('setLabel("Далі")');
  expect(source).toContain('setLabel("Парковка")');
  expect(source).toContain("speakerLabelFor(line)");
});

it("positions factory dialogue UI from the current scale size", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain("const width = this.scale.width");
  expect(source).toContain("const height = this.scale.height");
  expect(source).toContain("height -");
});

it("does not draw a separate advance prompt over the factory dialogue body", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).not.toContain('promptText.setText("Натисни E, щоб далі")');
  expect(source).toContain('touchInteraction?.setLabel("Далі")');
});

it("renders a dialogue footer that explains desktop E and mobile Dali controls", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain("dialogueHint");
  expect(source).toContain("dialogueAdvanceHint()");
  expect(source).toContain("Натисни E, щоб далі");
  expect(source).toContain("Натисни кнопку «Далі»");
});

it("shows the factory counter as total required objectives including controller", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain("snapshot.objectiveCount");
  expect(source).toContain("snapshot.objectiveTotal");
});
