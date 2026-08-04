# Interactive Dialogues And Parking Level Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deliberate `E` dialogue interaction, in-memory restartable progress, mobile interaction, and a second parking level with Dimon, Yura, a blue car, and restart back to KPP.

**Architecture:** Move dialogue progression and run progress into small TypeScript modules that can be unit tested without Phaser. `FactoryScene` and the new `ParkingScene` will both consume the same edge-triggered interaction input and one-line-at-a-time dialogue runner, while each scene owns its own sprites, map loading, and scene-specific completion effects.

**Tech Stack:** Phaser 3.90, Vite 7, TypeScript 5.9, Vitest 3.2, Playwright 1.62, Tiled JSON maps, generated PNG tiles.

## Global Constraints

- Proximity alone shows a prompt and never opens dialogue.
- Keyboard `E` and the mobile interaction button perform the same single edge-triggered action.
- Dialogue freezes player movement while open and advances exactly one line per discrete interaction.
- Progress is session-only; no `localStorage` read or write remains.
- Reloading the page starts at KPP with `Фрази: 0/5` and no controller completion flag.
- Parking exit unlock requires all five collectible conversations plus at least one controller conversation.
- Guard dialogue lines are exact: `Я: Привіт, Сєрий`; `Сергій: Здоров`; `Я: Як там справи? Що скажеш на Пашу?`; `Сергій: Він мені одразу не понравився, як я тільки його побачив`.
- Controller names are exact: `Контролер Галина`, `Контролер Микола`, `Контролер Таня`, `Контролер Іван`.
- Dimon line is exact: `Не міган канєшно, але піде`.
- Yura dialogue lines are exact: `Щось в мене цееееейво гальмує інтеееернееет в палатці. Гляньте до того хлопці коли буууудете мали час`; `Зараз будем сі дивили.`; `Щееее ееее катридж маєте ?`; `Глянемо Юр.`
- Extra `E` after Yura's final line restarts the complete game at factory KPP.

---

## File Structure

- `src/game/dialogue.ts`: pure dialogue definitions and a `DialogueRunner` that opens, advances, closes, and reports final-line completion.
- `src/game/progress.ts`: replace storage-backed `ProgressStore` with `RunProgress`, a pure in-memory progress model that tracks collectible IDs and one controller-completion flag.
- `src/game/interaction.ts`: keep nearest-target math and add a pure `EdgeTrigger` helper for keyboard and touch interaction.
- `src/game/touchInteraction.ts`: DOM button controller for mobile interaction, mirroring the joystick style and exposing `consumePressed()`.
- `src/game/characters.ts`: change `phrase` to `dialogue`, with the guard as a four-line conversation and other collectibles as one-line conversations.
- `src/game/controllers.ts`: rename the four controllers and keep equipment requests as one-line controller conversations.
- `src/game/FactoryScene.ts`: refactor from proximity-open dialogue to prompt-plus-`E`, freeze movement during dialogue, complete progress on dialogue finish, and transition to `ParkingScene` after unlock.
- `src/game/ParkingScene.ts`: new Phaser scene with parking map loading, Dimon, car departure, Yura, and restart.
- `src/game/config.ts`: register both scenes and add `touchInteraction` to the registry.
- `src/main.ts`: initialize `createTouchInteractionButton`, expose test hooks for factory and parking scenes.
- `src/style.css` and `index.html`: add the lower-right interaction button.
- `public/assets/maps/parking.json`: generated Tiled JSON map for the parking level.
- `scripts/generate-factory-tiles.mjs`: extend generated tilesheet with parking asphalt, parking line, tent, and blue car tiles if existing indices are insufficient.
- `tests/*.test.ts` and `tests/browser/game.spec.ts`: update stale proximity tests and add coverage for dialogue, progress, mobile interaction, parking map, and restart.

---

### Task 1: Pure Dialogue, Progress, And Interaction Models

**Files:**
- Create: `src/game/dialogue.ts`
- Modify: `src/game/progress.ts`
- Modify: `src/game/interaction.ts`
- Test: `tests/dialogue.test.ts`
- Test: `tests/progress.test.ts`
- Test: `tests/interaction.test.ts`

**Interfaces:**
- Produces: `DialogueLine`, `DialogueDefinition`, `DialogueRunner`, `createSingleLineDialogue(name: string, text: string): DialogueDefinition`.
- Produces: `RunProgress` with `completeCollectible(id: string): RunProgressSnapshot`, `completeController(): RunProgressSnapshot`, `reset(): RunProgressSnapshot`, `snapshot(): RunProgressSnapshot`, `isParkingUnlocked(): boolean`.
- Produces: `EdgeTrigger` with `update(isDown: boolean): boolean` and `reset(): void`.
- Consumes: `CHARACTERS.length` and known character IDs from `characters.ts`.

- [ ] **Step 1: Write failing dialogue tests**

```ts
import { expect, it } from "vitest";
import { DialogueRunner } from "../src/game/dialogue";

it("starts on the first line and advances once per interaction", () => {
  const runner = new DialogueRunner();
  runner.open({
    id: "guard",
    lines: [
      { speaker: "Я", text: "Привіт, Сєрий" },
      { speaker: "Сергій", text: "Здоров" }
    ]
  });

  expect(runner.currentLine()).toEqual({ speaker: "Я", text: "Привіт, Сєрий" });
  expect(runner.advance()).toEqual({ state: "line", completed: false });
  expect(runner.currentLine()).toEqual({ speaker: "Сергій", text: "Здоров" });
  expect(runner.advance()).toEqual({ state: "awaiting-close", completed: true });
  expect(runner.currentLine()).toEqual({ speaker: "Сергій", text: "Здоров" });
  expect(runner.advance()).toEqual({ state: "closed", completed: false });
  expect(runner.isOpen()).toBe(false);
});

it("rejects empty conversations before a blank panel can open", () => {
  const runner = new DialogueRunner();

  expect(() => runner.open({ id: "empty", lines: [] })).toThrow("Dialogue empty has no lines.");
});
```

- [ ] **Step 2: Write failing progress and edge-trigger tests**

```ts
import { expect, it } from "vitest";
import { EdgeTrigger } from "../src/game/interaction";
import { RunProgress } from "../src/game/progress";

it("keeps collectible and controller completion in memory only", () => {
  const progress = new RunProgress(["security-serhii", "it-vasyl"]);

  progress.completeCollectible("security-serhii");
  expect(progress.snapshot()).toEqual({
    collectibles: new Set(["security-serhii"]),
    controllerCompleted: false,
    collectibleCount: 1,
    collectibleTotal: 2,
    parkingUnlocked: false
  });

  progress.completeCollectible("it-vasyl");
  progress.completeController();
  expect(progress.isParkingUnlocked()).toBe(true);

  progress.reset();
  expect(progress.snapshot().collectibleCount).toBe(0);
  expect(progress.snapshot().controllerCompleted).toBe(false);
});

it("fires once for a held key or held touch button", () => {
  const trigger = new EdgeTrigger();

  expect(trigger.update(false)).toBe(false);
  expect(trigger.update(true)).toBe(true);
  expect(trigger.update(true)).toBe(false);
  expect(trigger.update(false)).toBe(false);
  expect(trigger.update(true)).toBe(true);
});
```

- [ ] **Step 3: Run tests and confirm failure**

Run: `npm.cmd test -- tests/dialogue.test.ts tests/progress.test.ts tests/interaction.test.ts`

Expected: FAIL because `dialogue.ts`, `RunProgress`, and `EdgeTrigger` do not exist yet.

- [ ] **Step 4: Implement pure models**

```ts
// src/game/dialogue.ts
export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface DialogueDefinition {
  id: string;
  lines: readonly DialogueLine[];
}

export type DialogueAdvanceResult =
  | { state: "line"; completed: false }
  | { state: "awaiting-close"; completed: true }
  | { state: "closed"; completed: false };

export class DialogueRunner {
  private active?: DialogueDefinition;
  private index = 0;
  private awaitingClose = false;

  public open(dialogue: DialogueDefinition): void {
    if (dialogue.lines.length === 0) {
      throw new Error(`Dialogue ${dialogue.id} has no lines.`);
    }
    this.active = dialogue;
    this.index = 0;
    this.awaitingClose = false;
  }

  public currentId(): string | undefined {
    return this.active?.id;
  }

  public currentLine(): DialogueLine | undefined {
    return this.active?.lines[this.index];
  }

  public isOpen(): boolean {
    return this.active !== undefined;
  }

  public advance(): DialogueAdvanceResult {
    if (!this.active) return { state: "closed", completed: false };
    if (this.awaitingClose) {
      this.close();
      return { state: "closed", completed: false };
    }
    if (this.index < this.active.lines.length - 1) {
      this.index += 1;
      return { state: "line", completed: false };
    }
    this.awaitingClose = true;
    return { state: "awaiting-close", completed: true };
  }

  public close(): void {
    this.active = undefined;
    this.index = 0;
    this.awaitingClose = false;
  }
}

export function createSingleLineDialogue(name: string, text: string): DialogueDefinition {
  return { id: name, lines: [{ speaker: name, text }] };
}
```

```ts
// src/game/progress.ts
export interface RunProgressSnapshot {
  collectibles: ReadonlySet<string>;
  controllerCompleted: boolean;
  collectibleCount: number;
  collectibleTotal: number;
  parkingUnlocked: boolean;
}

export class RunProgress {
  private readonly knownIds: ReadonlySet<string>;
  private collectibles = new Set<string>();
  private controllerCompleted = false;

  public constructor(characterIds: readonly string[]) {
    this.knownIds = new Set(characterIds);
  }

  public completeCollectible(characterId: string): RunProgressSnapshot {
    if (this.knownIds.has(characterId)) this.collectibles.add(characterId);
    return this.snapshot();
  }

  public completeController(): RunProgressSnapshot {
    this.controllerCompleted = true;
    return this.snapshot();
  }

  public reset(): RunProgressSnapshot {
    this.collectibles.clear();
    this.controllerCompleted = false;
    return this.snapshot();
  }

  public isParkingUnlocked(): boolean {
    return this.collectibles.size === this.knownIds.size && this.controllerCompleted;
  }

  public snapshot(): RunProgressSnapshot {
    return Object.freeze({
      collectibles: new Set(this.collectibles),
      controllerCompleted: this.controllerCompleted,
      collectibleCount: this.collectibles.size,
      collectibleTotal: this.knownIds.size,
      parkingUnlocked: this.isParkingUnlocked()
    });
  }
}
```

```ts
// src/game/interaction.ts
export class EdgeTrigger {
  private wasDown = false;

  public update(isDown: boolean): boolean {
    const fired = isDown && !this.wasDown;
    this.wasDown = isDown;
    return fired;
  }

  public reset(): void {
    this.wasDown = false;
  }
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm.cmd test -- tests/dialogue.test.ts tests/progress.test.ts tests/interaction.test.ts`

Expected: PASS.

Commit:

```bash
git add src/game/dialogue.ts src/game/progress.ts src/game/interaction.ts tests/dialogue.test.ts tests/progress.test.ts tests/interaction.test.ts
git commit -m "feat: add session dialogue and progress models"
```

---

### Task 2: Factory Scene Uses E Dialogue And Session Progress

**Files:**
- Modify: `src/game/characters.ts`
- Modify: `src/game/controllers.ts`
- Modify: `src/game/controllerDialogue.ts`
- Modify: `src/game/FactoryScene.ts`
- Test: `tests/characters.test.ts`
- Test: `tests/controllers.test.ts`
- Test: `tests/interaction.test.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Consumes: `DialogueRunner`, `DialogueDefinition`, `RunProgress`, `EdgeTrigger`, `nearestInteractable()`.
- Produces: factory status mirror states `ready`, `prompt`, `dialogue`, and `exit-prompt`.
- Produces: registry key `runProgress` containing one shared `RunProgress` instance.

- [ ] **Step 1: Write failing data tests for exact names and dialogue lines**

```ts
import { expect, it } from "vitest";
import { CHARACTERS } from "../src/game/characters";
import { CONTROLLERS } from "../src/game/controllers";

it("uses exact guard dialogue as a four-line conversation", () => {
  const guard = CHARACTERS.find((character) => character.id === "security-serhii");

  expect(guard?.dialogue.lines).toEqual([
    { speaker: "Я", text: "Привіт, Сєрий" },
    { speaker: "Сергій", text: "Здоров" },
    { speaker: "Я", text: "Як там справи? Що скажеш на Пашу?" },
    { speaker: "Сергій", text: "Він мені одразу не понравився, як я тільки його побачив" }
  ]);
});

it("uses exact controller display names", () => {
  expect(CONTROLLERS.map((controller) => controller.name)).toEqual([
    "Контролер Галина",
    "Контролер Микола",
    "Контролер Таня",
    "Контролер Іван"
  ]);
});
```

- [ ] **Step 2: Write failing scene-source interaction test**

```ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("does not open dialogue from proximity alone in FactoryScene", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain("nearestInteractable(");
  expect(source).toContain("interactionTrigger.update(");
  expect(source).toContain("showInteractionPrompt(");
  expect(source).not.toContain("transitionNpcTarget(");
  expect(source).not.toContain("ProgressStore");
  expect(source).not.toContain("localStorage");
});
```

- [ ] **Step 3: Run tests and confirm failure**

Run: `npm.cmd test -- tests/characters.test.ts tests/controllers.test.ts tests/interaction.test.ts tests/progress.test.ts`

Expected: FAIL because character records still expose `phrase`, controller names are numbered, and `FactoryScene` still opens from proximity.

- [ ] **Step 4: Convert character and controller definitions**

Change `CharacterDefinition` to include `dialogue: DialogueDefinition`. Replace the guard entry with:

```ts
{
  id: "security-serhii",
  name: "Охоронець Сергій",
  room: "Прохідна",
  objectId: "npc-security",
  spriteKey: "npc-security",
  dialogue: {
    id: "security-serhii",
    lines: [
      { speaker: "Я", text: "Привіт, Сєрий" },
      { speaker: "Сергій", text: "Здоров" },
      { speaker: "Я", text: "Як там справи? Що скажеш на Пашу?" },
      { speaker: "Сергій", text: "Він мені одразу не понравився, як я тільки його побачив" }
    ]
  }
}
```

Convert the other four characters to one-line `dialogue` values with `speaker` set to `character.name`. Rename controllers to the four exact names from the global constraints and leave `CONTROLLER_REQUESTS` as four exact one-line request texts for mouse, scanner, computer, and touchscreen.

- [ ] **Step 5: Refactor `FactoryScene` to prompt and advance on E**

Replace `activeCharacterId` and automatic `transitionNpcTarget()` with:

```ts
private readonly dialogueRunner = new DialogueRunner();
private readonly interactionTrigger = new EdgeTrigger();
private activePromptTarget?: NpcTarget;
private progressModel!: RunProgress;
private controllerCompletedThisRun = false;
```

In `create()`, initialize shared progress:

```ts
const existingProgress = this.registry.get("runProgress") as RunProgress | undefined;
this.progressModel = existingProgress ?? new RunProgress(CHARACTERS.map((character) => character.id));
this.registry.set("runProgress", this.progressModel);
this.updateCounter();
```

In `update()`, compute `interactPressed` from `Phaser.Input.Keyboard.JustDown(keyboardE)` plus `touchInteraction.consumePressed()`. If `dialogueRunner.isOpen()`, set velocity to zero, call `advanceDialogue()` only when pressed, and return. If no dialogue is open, use `nearestInteractable()` to set `activePromptTarget`, show `E — поговорити`, and start the target only when `interactPressed` is true.

When a collectible dialogue returns `{ state: "awaiting-close", completed: true }`, call `progressModel.completeCollectible(target.id)`. When an ambient controller dialogue completes, call `progressModel.completeController()`. Do not increment the `/5` count for controllers.

- [ ] **Step 6: Add factory exit prompt and transition hook**

Add a factory exit object to `public/assets/maps/factory.json` under an `exits` object layer, or add one point property to the existing object layer if the map already has a suitable place. In `FactoryScene`, load it with `map.getObjectLayer("exits")`, and when `progressModel.isParkingUnlocked()` and the player is in range, show `E — вийти на парковку`. On interaction, call:

```ts
this.dialogueRunner.close();
this.interactionTrigger.reset();
this.scene.start("parking");
```

The exit prompt must not use `localStorage`, and `completionText` should announce that parking is available instead of saying the game is finished.

- [ ] **Step 7: Run tests and commit**

Run: `npm.cmd test -- tests/characters.test.ts tests/controllers.test.ts tests/interaction.test.ts tests/progress.test.ts tests/map.test.ts`

Expected: PASS.

Commit:

```bash
git add src/game/characters.ts src/game/controllers.ts src/game/controllerDialogue.ts src/game/FactoryScene.ts src/game/progress.ts src/game/interaction.ts public/assets/maps/factory.json tests/characters.test.ts tests/controllers.test.ts tests/interaction.test.ts tests/progress.test.ts tests/map.test.ts
git commit -m "feat: require interaction for factory dialogue"
```

---

### Task 3: Mobile Interaction Button

**Files:**
- Create: `src/game/touchInteraction.ts`
- Modify: `index.html`
- Modify: `src/main.ts`
- Modify: `src/game/config.ts`
- Modify: `src/style.css`
- Test: `tests/touchInteraction.test.ts`
- Test: `tests/document.test.ts`
- Test: `tests/browser/game.spec.ts`

**Interfaces:**
- Produces: `TouchInteractionSource` with `consumePressed(): boolean` and `destroy(): void`.
- Produces: `createTouchInteractionButton(root: HTMLElement, touchCapable?: boolean): TouchInteractionSource`.
- Consumes: Factory and Parking scenes read registry key `touchInteraction`.

- [ ] **Step 1: Write failing touch interaction tests**

```ts
import { afterEach, expect, it } from "vitest";
import { createTouchInteractionButton } from "../src/game/touchInteraction";

afterEach(() => document.body.replaceChildren());

it("appears only on touch-capable devices and consumes one press", () => {
  const button = document.createElement("button");
  const source = createTouchInteractionButton(button, true);

  expect(button.hidden).toBe(false);
  button.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, pointerType: "touch" }));
  expect(source.consumePressed()).toBe(true);
  expect(source.consumePressed()).toBe(false);
  window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, pointerType: "touch" }));
  source.destroy();
});

it("stays hidden when touch is unavailable", () => {
  const button = document.createElement("button");
  const source = createTouchInteractionButton(button, false);

  expect(button.hidden).toBe(true);
  expect(source.consumePressed()).toBe(false);
});
```

- [ ] **Step 2: Add the DOM button**

Add to `index.html` after the joystick:

```html
<button id="touch-interaction" type="button" aria-label="Взаємодія" hidden>E</button>
```

Add CSS:

```css
#touch-interaction {
  position: fixed;
  right: calc(1rem + env(safe-area-inset-right));
  bottom: calc(1rem + env(safe-area-inset-bottom));
  display: none;
  width: 4.5rem;
  height: 4.5rem;
  border: 1px solid rgb(247 230 210 / 55%);
  border-radius: 50%;
  background: rgb(36 48 58 / 78%);
  color: #fff4dc;
  font: 800 1.45rem/1 system-ui, sans-serif;
  touch-action: none;
  user-select: none;
  z-index: 20;
}

#touch-interaction.is-pressed {
  background: rgb(230 181 102 / 82%);
  color: #151b18;
}

#touch-interaction[hidden] {
  display: none !important;
}

@media (pointer: coarse) {
  #touch-interaction {
    display: block;
  }
}
```

- [ ] **Step 3: Implement `touchInteraction.ts`**

```ts
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
    if (typeof root.setPointerCapture === "function") root.setPointerCapture(event.pointerId);
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
```

- [ ] **Step 4: Wire the button into `main.ts` and registry**

In `main.ts`, find `#touch-interaction`, create the source, destroy it on `pagehide`, and pass it to `createGameConfig("game", touchMovement, touchInteraction)`. In `config.ts`, add a third parameter and set `game.registry.set("touchInteraction", touchInteraction)` in `preBoot`.

- [ ] **Step 5: Update mobile browser coverage**

Change the mobile test that currently expects dialogue from joystick proximity. It should move near the guard, verify `#game-status[data-game-state="prompt"]`, tap `#touch-interaction`, verify dialogue opens, tap four more times to advance/close the guard dialogue, and verify movement resumes after close.

- [ ] **Step 6: Run tests and commit**

Run: `npm.cmd test -- tests/touchInteraction.test.ts tests/document.test.ts`

Expected: PASS.

Commit:

```bash
git add src/game/touchInteraction.ts index.html src/main.ts src/game/config.ts src/style.css tests/touchInteraction.test.ts tests/document.test.ts tests/browser/game.spec.ts
git commit -m "feat: add mobile interaction button"
```

---

### Task 4: Parking Map And Parking Scene

**Files:**
- Create: `src/game/ParkingScene.ts`
- Create: `public/assets/maps/parking.json`
- Modify: `src/game/config.ts`
- Modify: `src/game/FactoryScene.ts`
- Modify: `scripts/generate-factory-tiles.mjs`
- Test: `tests/parkingMap.test.ts`
- Test: `tests/parkingScene.test.ts`
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `DialogueRunner`, `EdgeTrigger`, `TouchInteractionSource`, `movementVector()`, `strongerMovement()`.
- Produces: Phaser scene key `parking`.
- Produces: test hooks `__factoryTestUnlockParking()` and `__factoryTestPositionParkingPlayer(x: number, y: number)`.

- [ ] **Step 1: Write failing parking map tests**

```ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

type Layer = { name: string; type: string; data?: number[]; objects?: Array<{ name: string; type?: string; x: number; y: number; width?: number; height?: number }> };
type ParkingMap = { width: number; height: number; tilewidth: number; tileheight: number; layers: Layer[] };

function readParkingMap(): ParkingMap {
  return JSON.parse(readFileSync("public/assets/maps/parking.json", "utf8")) as ParkingMap;
}

it("contains required parking layers and objects", () => {
  const map = readParkingMap();
  const layers = new Map(map.layers.map((layer) => [layer.name, layer]));

  expect([...layers.keys()]).toEqual(expect.arrayContaining(["floor", "paint", "objects", "collisions", "spawn", "npcs", "car", "tent"]));
  expect(layers.get("spawn")?.objects?.map((object) => object.name)).toContain("player-spawn");
  expect(layers.get("npcs")?.objects?.map((object) => object.name).sort()).toEqual(["npc-dimon", "npc-yura"]);
  expect(layers.get("car")?.objects?.map((object) => object.name)).toContain("dimon-car");
  expect(layers.get("tent")?.objects?.map((object) => object.name)).toContain("warehouse-tent");
});
```

- [ ] **Step 2: Create `parking.json`**

Use the same 16px tile size and tileset reference as `factory.json`. Required object points:

```json
{
  "spawn": [{ "name": "player-spawn", "type": "spawn", "x": 96, "y": 456, "width": 0, "height": 0 }],
  "npcs": [
    { "name": "npc-dimon", "type": "npc", "x": 304, "y": 336, "width": 0, "height": 0 },
    { "name": "npc-yura", "type": "npc", "x": 792, "y": 184, "width": 0, "height": 0 }
  ],
  "car": [{ "name": "dimon-car", "type": "car", "x": 340, "y": 328, "width": 48, "height": 28 }],
  "tent": [{ "name": "warehouse-tent", "type": "tent", "x": 728, "y": 80, "width": 144, "height": 112 }]
}
```

Add collision rectangles for map boundaries, the tent walls, and the parked car. Leave clear walkable cells from spawn to Dimon and Yura.

- [ ] **Step 3: Write failing `ParkingScene` source tests**

```ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("defines Dimon, Yura, car departure, and restart behavior", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).toContain("Не міган канєшно, але піде");
  expect(source).toContain("Щось в мене цееееейво гальмує інтеееернееет в палатці");
  expect(source).toContain("startCarDeparture");
  expect(source).toContain("restartFactory");
  expect(source).toContain('this.scene.start("factory")');
});
```

- [ ] **Step 4: Implement `ParkingScene`**

Create a scene mirroring `FactoryScene` setup for map layers, collisions, player movement, camera, prompts, and `E` input. Define parking targets:

```ts
const PARKING_DIALOGUES = {
  dimon: {
    id: "parking-dimon",
    lines: [{ speaker: "Дімон", text: "Не міган канєшно, але піде" }]
  },
  yura: {
    id: "parking-yura",
    lines: [
      { speaker: "Юра", text: "Щось в мене цееееейво гальмує інтеееернееет в палатці. Гляньте до того хлопці коли буууудете мали час" },
      { speaker: "Я", text: "Зараз будем сі дивили." },
      { speaker: "Юра", text: "Щееее ееее катридж маєте ?" },
      { speaker: "Я", text: "Глянемо Юр." }
    ]
  }
} as const;
```

On Dimon completion, hide Dimon after a short tween toward the car, then tween the light-blue car out past the right edge. Guard with `private dimonDeparted = false`. On Yura completion, set `private yuraAwaitingRestart = true`; the next `E` calls:

```ts
private restartFactory(): void {
  if (this.restartQueued) return;
  this.restartQueued = true;
  const progress = this.registry.get("runProgress") as RunProgress | undefined;
  progress?.reset();
  this.dialogueRunner.close();
  this.interactionTrigger.reset();
  this.scene.start("factory");
}
```

- [ ] **Step 5: Register scene and factory transition**

In `config.ts`, import `ParkingScene` and change `scene: [FactoryScene]` to `scene: [FactoryScene, ParkingScene]`. In `FactoryScene`, ensure the unlocked exit calls `this.scene.start("parking")` and the `runProgress` instance remains in the registry when changing scenes.

- [ ] **Step 6: Run tests and commit**

Run: `npm.cmd test -- tests/parkingMap.test.ts tests/parkingScene.test.ts tests/build.test.ts`

Expected: PASS.

Commit:

```bash
git add src/game/ParkingScene.ts public/assets/maps/parking.json src/game/config.ts src/game/FactoryScene.ts scripts/generate-factory-tiles.mjs tests/parkingMap.test.ts tests/parkingScene.test.ts tests/build.test.ts
git commit -m "feat: add parking level"
```

---

### Task 5: Browser Flow, Build, And PR Readiness

**Files:**
- Modify: `tests/browser/game.spec.ts`
- Modify: `src/main.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: test hooks `__factoryTestPositionPlayer`, `__factoryTestUnlockParking`, `__factoryTestPositionParkingPlayer`.
- Produces: README run note for GitHub Pages and phone play after the interaction change.

- [ ] **Step 1: Add browser test hooks**

In `main.ts`, update the test window type:

```ts
type FactoryTestWindow = Window & {
  __factoryTestPositionPlayer?: (x: number, y: number) => void;
  __factoryTestUnlockParking?: () => void;
  __factoryTestPositionParkingPlayer?: (x: number, y: number) => void;
};
```

Implement `__factoryTestUnlockParking` by completing all known character IDs and the controller flag on the shared `RunProgress`. Implement `__factoryTestPositionParkingPlayer` against `game.scene.getScene("parking")`.

- [ ] **Step 2: Rewrite browser dialogue tests for `E`**

Replace the old proximity-open guard test with:

```ts
test("opens guard dialogue only from E and advances one line per press", async ({ page }) => {
  await page.goto("/factory-phrases-game/");
  const status = page.locator("#game-status");

  await expect(status).toHaveAttribute("data-game-state", "ready");
  await page.evaluate(() => {
    (window as any).__factoryTestPositionPlayer(88, 392);
  });
  await expect(status).toHaveAttribute("data-game-state", "prompt");
  await expect(status).toContainText("E — поговорити");

  await page.keyboard.press("e");
  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toContainText("Привіт, Сєрий");
  await page.keyboard.press("e");
  await expect(status).toContainText("Здоров");
  await page.keyboard.press("e");
  await expect(status).toContainText("Як там справи? Що скажеш на Пашу?");
  await page.keyboard.press("e");
  await expect(status).toContainText("Він мені одразу не понравився, як я тільки його побачив");
  await page.keyboard.press("e");
  await expect(status).toHaveAttribute("data-game-state", "prompt");
});
```

- [ ] **Step 3: Add browser flow for factory exit, parking, Dimon, Yura, restart**

```ts
test("plays parking level and restarts from Yura", async ({ page }) => {
  await page.goto("/factory-phrases-game/");
  const status = page.locator("#game-status");

  await page.evaluate(() => (window as any).__factoryTestUnlockParking());
  await page.evaluate(() => (window as any).__factoryTestPositionPlayer(900, 480));
  await expect(status).toHaveAttribute("data-game-state", "exit-prompt");
  await page.keyboard.press("e");
  await expect(status).toHaveAttribute("data-scene", "parking");

  await page.evaluate(() => (window as any).__factoryTestPositionParkingPlayer(304, 336));
  await page.keyboard.press("e");
  await expect(status).toContainText("Не міган канєшно, але піде");
  await page.keyboard.press("e");
  await expect(status).toHaveAttribute("data-dimon-departed", "true");

  await page.evaluate(() => (window as any).__factoryTestPositionParkingPlayer(792, 184));
  await page.keyboard.press("e");
  await expect(status).toContainText("Щось в мене цееееейво");
  await page.keyboard.press("e");
  await expect(status).toContainText("Зараз будем сі дивили.");
  await page.keyboard.press("e");
  await expect(status).toContainText("Щееее ееее катридж маєте ?");
  await page.keyboard.press("e");
  await expect(status).toContainText("Глянемо Юр.");
  await page.keyboard.press("e");
  await expect(status).toHaveAttribute("data-scene", "factory");
  await expect(status).toContainText("Фрази: 0/5");
});
```

- [ ] **Step 4: Update README run notes**

Add:

```md
### GitHub Pages and phone play

Build for Pages with `npm run build:pages`; the generated files in `dist/` must be deployed with the `/factory-phrases-game/` base path. On a phone, open the same GitHub Pages URL in landscape mode. Movement uses the lower-left joystick, and interaction uses the lower-right `E` button.
```

- [ ] **Step 5: Run full verification**

Run:

```bash
npm.cmd test
npm run build
npm run build:pages
npm run test:browser
```

Expected: all commands exit 0. Browser tests must pass in desktop and mobile Chromium projects.

- [ ] **Step 6: Commit final verification updates**

```bash
git add tests/browser/game.spec.ts src/main.ts README.md
git commit -m "test: cover parking restart flow"
```

---

## Self-Review

- Spec coverage: Task 1 covers session-only progress and edge-triggered input. Task 2 covers factory `E` dialogue, exact guard lines, exact controller names, controller completion, and exit unlock. Task 3 covers the mobile interaction button. Task 4 covers the parking scene, Dimon, car departure, Yura, and restart. Task 5 covers browser verification, GitHub Pages notes, and phone play notes.
- Placeholder scan: the plan contains concrete files, commands, exact strings, and code snippets for every code-producing step.
- Type consistency: `DialogueRunner`, `RunProgress`, `EdgeTrigger`, and `TouchInteractionSource` signatures are introduced before scene tasks consume them.
