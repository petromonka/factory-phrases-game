# Parking And Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the interactive-dialogues PR with a clear factory exit door, cleaner dialogue labels, better prompts, a grouped Dimon car, richer parking visuals, and mobile-safe layout.

**Architecture:** Keep the existing Phaser scene structure and make focused changes inside `FactoryScene`, `ParkingScene`, DOM touch interaction, CSS, and map tests. Add small pure helpers only where they make UI state testable without Phaser, especially for dialogue label formatting and touch-button labels.

**Tech Stack:** Phaser 3.90, Vite 7, TypeScript 5.9, Vitest 3.2, Playwright 1.62, Tiled JSON maps, DOM/CSS mobile controls.

## Global Constraints

- The unlocked factory exit draws a visible door or gate with `Парковка`.
- Desktop character prompt is exactly `Натисни E, щоб говорити`.
- Desktop dialogue prompt is exactly `Натисни E, щоб далі`.
- Desktop exit prompt is exactly `Натисни E, щоб вийти на парковку`.
- Mobile button label is `Говорити` when a conversation can start.
- Mobile button label is `Далі` while dialogue is open.
- Mobile button label is `Парковка` near the unlocked exit.
- Lines whose speaker is `Я` do not show `Я` as the dialogue heading.
- Dimon dialogue has two lines: `Не міган канєшно, але піде`; `Ну все, я пігнав, якщо щось то не дзвоніть і не пишіть 😁`.
- Dimon's car departs only after the second Dimon line is completed.
- The Dimon car body, windows, wheels, and highlights move and hide together.
- The parking scene includes parking markings and several static parked cars.
- Mobile portrait emphasizes rotation guidance; mobile landscape avoids cropped dialogue text and control overlap.

---

## File Structure

- `src/game/dialogue.ts`: add pure presentation helpers for speaker labels.
- `src/game/touchInteraction.ts`: allow the DOM action button label to update from scene state.
- `src/main.ts`: pass the concrete touch interaction source to scenes and keep test hooks unchanged.
- `src/game/FactoryScene.ts`: show unlocked exit door/gate, clearer prompts, mobile action labels, and hide `Я` headings.
- `src/game/ParkingScene.ts`: add two-line Dimon dialogue, grouped car container, static parked cars, clearer prompts, mobile action labels, and hide `Я` headings.
- `src/style.css`: mobile-safe canvas/dialogue/control layout, stronger portrait orientation hint, responsive touch action button.
- `public/assets/maps/parking.json`: add object data for multiple parked cars, or keep static cars scene-rendered if map object data is simpler; tests should verify visible parking structure.
- `tests/dialogue.test.ts`: pure tests for player-speaker heading behavior.
- `tests/touchInteraction.test.ts`: tests for updating action button labels.
- `tests/interaction.test.ts`, `tests/parkingScene.test.ts`, `tests/parkingMap.test.ts`, `tests/browser/game.spec.ts`: update expected copy, car grouping, parking visuals, and mobile checks.

---

### Task 1: Dialogue Label And Touch Button State Helpers

**Files:**
- Modify: `src/game/dialogue.ts`
- Modify: `src/game/touchInteraction.ts`
- Test: `tests/dialogue.test.ts`
- Test: `tests/touchInteraction.test.ts`

**Interfaces:**
- Produces: `speakerLabelFor(line: DialogueLine): string` returning `""` for speaker `Я`, otherwise `line.speaker`.
- Produces: `TouchInteractionSource.setLabel(label: string): void`.
- Consumes: existing `DialogueLine`, `TouchInteractionSource.consumePressed()`, and `TouchInteractionSource.destroy()`.

- [ ] **Step 1: Write failing dialogue label test**

```ts
import { expect, it } from "vitest";
import { speakerLabelFor } from "../src/game/dialogue";

it("hides the player speaker label while keeping NPC labels", () => {
  expect(speakerLabelFor({ speaker: "Я", text: "Привіт, Сєрий" })).toBe("");
  expect(speakerLabelFor({ speaker: "Сергій", text: "Здоров" })).toBe("Сергій");
});
```

- [ ] **Step 2: Write failing touch label test**

```ts
import { expect, it } from "vitest";
import { createTouchInteractionButton } from "../src/game/touchInteraction";

it("updates the visible mobile interaction label", () => {
  const button = document.createElement("button");
  const source = createTouchInteractionButton(button, true);

  source.setLabel("Говорити");
  expect(button.textContent).toBe("Говорити");
  source.setLabel("Далі");
  expect(button.textContent).toBe("Далі");
  source.destroy();
});
```

- [ ] **Step 3: Run tests to verify RED**

Run: `npm.cmd test -- tests/dialogue.test.ts tests/touchInteraction.test.ts`

Expected: FAIL because `speakerLabelFor` and `setLabel()` are not implemented.

- [ ] **Step 4: Implement helpers**

In `src/game/dialogue.ts`:

```ts
export function speakerLabelFor(line: DialogueLine): string {
  return line.speaker === "Я" ? "" : line.speaker;
}
```

In `src/game/touchInteraction.ts`, update the interface:

```ts
export interface TouchInteractionSource {
  consumePressed(): boolean;
  setLabel(label: string): void;
  destroy(): void;
}
```

Add to the returned object:

```ts
setLabel: (label) => {
  root.textContent = label;
},
```

Update `src/game/config.ts` stopped interaction source with `setLabel: () => undefined`.

- [ ] **Step 5: Run tests and commit**

Run: `npm.cmd test -- tests/dialogue.test.ts tests/touchInteraction.test.ts`

Expected: PASS.

Commit:

```bash
git add src/game/dialogue.ts src/game/touchInteraction.ts src/game/config.ts tests/dialogue.test.ts tests/touchInteraction.test.ts
git commit -m "feat: add dialogue and touch label helpers"
```

---

### Task 2: Factory Exit Door And Clearer Interaction Prompts

**Files:**
- Modify: `src/game/FactoryScene.ts`
- Modify: `tests/interaction.test.ts`
- Modify: `tests/browser/game.spec.ts`

**Interfaces:**
- Consumes: `TouchInteractionSource.setLabel(label: string): void`.
- Consumes: `speakerLabelFor(line: DialogueLine): string`.
- Produces: private `exitDoor?: Phaser.GameObjects.Container`.
- Produces: private `setTouchInteractionLabel(label: "Говорити" | "Далі" | "Парковка"): void`.

- [ ] **Step 1: Write failing source tests for door, prompts, and hidden player heading**

Add to `tests/interaction.test.ts`:

```ts
it("draws an unlocked factory exit door and uses clear interaction copy", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain("createExitDoor");
  expect(source).toContain("setExitDoorVisible");
  expect(source).toContain("Натисни E, щоб говорити");
  expect(source).toContain("Натисни E, щоб далі");
  expect(source).toContain("Натисни E, щоб вийти на парковку");
  expect(source).toContain('setLabel("Говорити")');
  expect(source).toContain('setLabel("Далі")');
  expect(source).toContain('setLabel("Парковка")');
  expect(source).toContain("speakerLabelFor(line)");
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd test -- tests/interaction.test.ts`

Expected: FAIL because the strings and methods do not exist.

- [ ] **Step 3: Implement exit door rendering**

In `FactoryScene`, add:

```ts
private exitDoor?: Phaser.GameObjects.Container;
```

After `this.createInterface()` and after `this.exitPoint` is set, create the door:

```ts
this.exitDoor = this.createExitDoor(this.exitPoint.x, this.exitPoint.y);
this.setExitDoorVisible(this.progressModel.isParkingUnlocked());
```

Add methods:

```ts
private createExitDoor(x: number, y: number): Phaser.GameObjects.Container {
  const panel = this.add.rectangle(0, 0, 56, 44, 0x3f4b55, 0.95).setStrokeStyle(3, 0xf0d18a);
  const opening = this.add.rectangle(0, 9, 34, 24, 0x151b18, 1);
  const label = this.add.text(0, -24, "Парковка", {
    fontFamily: '"Courier New", monospace',
    fontSize: "14px",
    color: "#fff4dc",
    stroke: "#171b18",
    strokeThickness: 3
  }).setOrigin(0.5);

  return this.add.container(x, y - 20, [panel, opening, label]).setDepth(18).setVisible(false);
}

private setExitDoorVisible(visible: boolean): void {
  this.exitDoor?.setVisible(visible);
}
```

Call `this.setExitDoorVisible(this.progressModel.isParkingUnlocked())` after collectible/controller completion.

- [ ] **Step 4: Implement clearer prompts and mobile labels**

Replace factory prompt strings:

```ts
this.showInteractionPrompt("Натисни E, щоб вийти на парковку", "exit-prompt");
this.showInteractionPrompt("Натисни E, щоб говорити", "prompt", this.activePromptTarget.id);
```

In the dialogue-open branch, before returning:

```ts
this.promptText.setText("Натисни E, щоб далі").setVisible(true);
this.touchInteraction?.setLabel("Далі");
```

When near a character:

```ts
this.touchInteraction?.setLabel("Говорити");
```

When near the unlocked exit:

```ts
this.touchInteraction?.setLabel("Парковка");
```

When no prompt:

```ts
this.touchInteraction?.setLabel("E");
```

- [ ] **Step 5: Hide `Я` as a heading in FactoryScene**

Import `speakerLabelFor`. In `renderCurrentDialogueLine()`:

```ts
const speakerLabel = speakerLabelFor(line);
this.dialogueName.setText(speakerLabel);
this.dialogueName.setVisible(speakerLabel.length > 0);
this.dialogueBody.setY(speakerLabel.length > 0 ? 450 : 420);
this.updateStatusMirror(
  "dialogue",
  speakerLabel ? `${speakerLabel}: ${line.text}` : line.text,
  this.activeDialogueTarget.id
);
```

- [ ] **Step 6: Update browser expectations**

In `tests/browser/game.spec.ts`, replace expected prompt text:

```ts
await expect(status).toContainText("Натисни E, щоб говорити");
await expect(status).toContainText("Натисни E, щоб вийти на парковку");
```

Add one assertion after opening the guard dialogue:

```ts
await expect(status).not.toContainText("Я:");
```

- [ ] **Step 7: Run tests and commit**

Run: `npm.cmd test -- tests/interaction.test.ts tests/dialogue.test.ts`

Expected: PASS.

Commit:

```bash
git add src/game/FactoryScene.ts tests/interaction.test.ts tests/browser/game.spec.ts
git commit -m "feat: polish factory exit and prompts"
```

---

### Task 3: Parking Dialogue, Grouped Dimon Car, And Richer Parking Scene

**Files:**
- Modify: `src/game/ParkingScene.ts`
- Modify: `public/assets/maps/parking.json`
- Modify: `tests/parkingScene.test.ts`
- Modify: `tests/parkingMap.test.ts`
- Modify: `tests/browser/game.spec.ts`

**Interfaces:**
- Consumes: `speakerLabelFor(line: DialogueLine): string`.
- Consumes: `TouchInteractionSource.setLabel(label: string): void`.
- Produces: `private car!: Phaser.GameObjects.Container`.
- Produces: `private parkedCars: Phaser.GameObjects.Container[] = []`.
- Produces: `private createCar(x: number, y: number, color: number, accent: number): Phaser.GameObjects.Container`.

- [ ] **Step 1: Write failing parking scene tests**

Update `tests/parkingScene.test.ts`:

```ts
it("defines Dimon's two-line departure dialogue and grouped car behavior", () => {
  const source = readFileSync("src/game/ParkingScene.ts", "utf8");

  expect(source).toContain("Не міган канєшно, але піде");
  expect(source).toContain("Ну все, я пігнав, якщо щось то не дзвоніть і не пишіть 😁");
  expect(source).toContain("createCar(");
  expect(source).toContain("Phaser.GameObjects.Container");
  expect(source).toContain("targets: this.car");
  expect(source).toContain("speakerLabelFor(line)");
  expect(source).toContain("Натисни E, щоб говорити");
  expect(source).toContain("Натисни E, щоб далі");
});
```

- [ ] **Step 2: Write failing parking map test for parking polish**

Update `tests/parkingMap.test.ts`:

```ts
it("contains multiple parked car objects for a real parking feel", () => {
  const map = readParkingMap();
  const parkingCars = map.layers
    .find((layer) => layer.name === "parked-cars")
    ?.objects?.filter((object) => object.type === "parked-car") ?? [];

  expect(parkingCars).toHaveLength(4);
});
```

- [ ] **Step 3: Run tests to verify RED**

Run: `npm.cmd test -- tests/parkingScene.test.ts tests/parkingMap.test.ts`

Expected: FAIL because Dimon has one line, the car is a rectangle, and `parked-cars` does not exist.

- [ ] **Step 4: Add parked cars to `parking.json`**

Add an object layer named `parked-cars` with four objects:

```json
[
  { "id": 14, "name": "parked-car-1", "type": "parked-car", "x": 160, "y": 112, "width": 50, "height": 28 },
  { "id": 15, "name": "parked-car-2", "type": "parked-car", "x": 256, "y": 112, "width": 50, "height": 28 },
  { "id": 16, "name": "parked-car-3", "type": "parked-car", "x": 496, "y": 288, "width": 50, "height": 28 },
  { "id": 17, "name": "parked-car-4", "type": "parked-car", "x": 592, "y": 288, "width": 50, "height": 28 }
]
```

Increment `nextlayerid` and `nextobjectid` accordingly. Add collision rectangles for the parked cars only if their positions do not block spawn-to-Dimon or spawn-to-Yura routes.

- [ ] **Step 5: Implement grouped car rendering**

Change:

```ts
private car!: Phaser.GameObjects.Rectangle;
```

to:

```ts
private car!: Phaser.GameObjects.Container;
private parkedCars: Phaser.GameObjects.Container[] = [];
```

Add:

```ts
private createCar(x: number, y: number, color: number, accent: number): Phaser.GameObjects.Container {
  const body = this.add.rectangle(0, 0, 54, 28, color).setStrokeStyle(3, accent);
  const windshield = this.add.rectangle(-12, -6, 11, 7, 0xd9f4ff);
  const window = this.add.rectangle(10, -6, 12, 7, 0xd9f4ff);
  const frontWheel = this.add.rectangle(-16, 15, 10, 5, 0x111111);
  const backWheel = this.add.rectangle(16, 15, 10, 5, 0x111111);
  const light = this.add.rectangle(25, 2, 4, 6, 0xffe08a);

  return this.add.container(x, y, [body, windshield, window, frontWheel, backWheel, light]).setDepth(12);
}
```

Create Dimon's car:

```ts
this.car = this.createCar((carObject.x ?? 0) + 24, (carObject.y ?? 0) + 14, 0x75bde8, 0x245a77);
```

Remove separate `this.add.rectangle(...)` window calls.

- [ ] **Step 6: Render static parked cars**

Read `const parkedCarLayer = map.getObjectLayer("parked-cars");` and require it in the incomplete layer guard.

After rendering Dimon's car:

```ts
const parkedColors = [
  [0x58606a, 0x24282d],
  [0x8a6f4d, 0x3b3024],
  [0x7b3f4a, 0x2c1820],
  [0x4d6f5f, 0x1d332a]
] as const;
this.parkedCars = parkedCarLayer.objects.map((object, index) =>
  this.createCar(
    (object.x ?? 0) + (object.width ?? 50) / 2,
    (object.y ?? 0) + (object.height ?? 28) / 2,
    parkedColors[index % parkedColors.length][0],
    parkedColors[index % parkedColors.length][1]
  ).setDepth(11)
);
```

- [ ] **Step 7: Implement two-line Dimon dialogue and delayed departure**

Change Dimon dialogue:

```ts
lines: [
  { speaker: "Дімон", text: "Не міган канєшно, але піде" },
  { speaker: "Дімон", text: "Ну все, я пігнав, якщо щось то не дзвоніть і не пишіть 😁" }
]
```

Keep `startCarDeparture()` inside `if (result.completed && this.activeTarget?.id === "dimon")`, which means it starts only after the second line is completed. Do not close the dialogue after the first line.

- [ ] **Step 8: Add parking prompt labels and hide `Я` heading**

Use the same pattern as FactoryScene:

```ts
this.showInteractionPrompt("Натисни E, щоб говорити", target.id);
this.promptText.setText("Натисни E, щоб далі").setVisible(true);
this.touchInteraction?.setLabel("Говорити");
this.touchInteraction?.setLabel("Далі");
this.touchInteraction?.setLabel("E");
```

In `renderCurrentDialogueLine()`, use `speakerLabelFor(line)` and hide the heading for player lines exactly as in Task 2.

- [ ] **Step 9: Update browser parking expectations**

In the parking browser test, after first Dimon line:

```ts
await pressInteractionKey(page);
await expect(status).toContainText("Ну все, я пігнав, якщо щось то не дзвоніть і не пишіть");
await pressInteractionKey(page);
await expect(status).toHaveAttribute("data-dimon-departed", "true", { timeout: 3_000 });
```

Make sure it no longer expects departure immediately after the first line.

- [ ] **Step 10: Run tests and commit**

Run: `npm.cmd test -- tests/parkingScene.test.ts tests/parkingMap.test.ts`

Expected: PASS.

Commit:

```bash
git add src/game/ParkingScene.ts public/assets/maps/parking.json tests/parkingScene.test.ts tests/parkingMap.test.ts tests/browser/game.spec.ts
git commit -m "feat: polish parking scene"
```

---

### Task 4: Mobile Layout And Browser Verification

**Files:**
- Modify: `src/style.css`
- Modify: `tests/browser/game.spec.ts`
- Modify: `tests/document.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: existing `#touch-joystick`, `#touch-interaction`, `#orientation-hint`, and Phaser canvas.
- Produces: CSS rules that keep mobile controls safe-area aware and prevent portrait from looking like a broken cropped game.

- [ ] **Step 1: Write failing document/source tests**

Add to `tests/document.test.ts`:

```ts
it("contains the mobile interaction button and orientation hint copy", () => {
  document.body.innerHTML = readFileSync("index.html", "utf8");

  expect(document.querySelector("#touch-interaction")?.textContent).toBe("E");
  expect(document.querySelector("#orientation-hint")?.textContent).toBe("Поверніть телефон горизонтально");
});
```

Add a CSS source assertion if `tests/document.test.ts` already imports `readFileSync`:

```ts
it("uses mobile-safe layout rules for touch controls and portrait mode", () => {
  const css = readFileSync("src/style.css", "utf8");

  expect(css).toContain("safe-area-inset-right");
  expect(css).toContain("@media (pointer: coarse)");
  expect(css).toContain("@media (pointer: coarse) and (orientation: portrait)");
  expect(css).toContain("font-size: clamp(");
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd test -- tests/document.test.ts`

Expected: FAIL if CSS does not yet include the stronger portrait/mobile-safe rules.

- [ ] **Step 3: Update CSS for mobile polish**

Add/adjust:

```css
#touch-interaction {
  min-width: 5rem;
  padding: 0 0.65rem;
  border-radius: 999px;
  font-size: clamp(0.85rem, 3vw, 1.05rem);
}

@media (pointer: coarse) and (orientation: portrait) {
  #game canvas {
    opacity: 0.35;
  }

  #orientation-hint {
    display: block;
    top: 42%;
    box-sizing: border-box;
    padding: 1rem 1.25rem;
    border: 1px solid rgb(247 230 210 / 35%);
    border-radius: 0.75rem;
    background: rgb(16 20 17 / 88%);
    font-size: clamp(1rem, 4vw, 1.35rem);
  }
}

@media (pointer: coarse) and (orientation: landscape) {
  #touch-joystick {
    width: 6rem;
    height: 6rem;
  }

  #touch-interaction {
    right: calc(0.75rem + env(safe-area-inset-right));
    bottom: calc(0.75rem + env(safe-area-inset-bottom));
  }
}
```

Do not scale Phaser canvas fonts with viewport width inside CSS; keep canvas scaling through Phaser's existing FIT mode.

- [ ] **Step 4: Update mobile browser checks**

In `tests/browser/game.spec.ts`, add to the mobile interaction test:

```ts
await expect(interaction).toHaveText("Говорити");
```

After opening dialogue:

```ts
await expect(interaction).toHaveText("Далі");
```

In parking exit mobile or desktop flow, if running under mobile project, assert `Парковка` before pressing the button:

```ts
if (testInfo.project.name === "mobile-chromium") {
  await expect(page.locator("#touch-interaction")).toHaveText("Парковка");
}
```

- [ ] **Step 5: Update README**

Replace the phone controls line with:

```md
On a phone, rotate to landscape. The lower-left joystick moves the character, and the lower-right action button changes between `Говорити`, `Далі`, and `Парковка` depending on what you can do.
```

- [ ] **Step 6: Run full verification**

Run:

```bash
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
npm.cmd run test:browser
```

Expected:

- `npm.cmd test`: all Vitest files pass.
- `npm.cmd run build`: exits 0.
- `npm.cmd run build:pages`: exits 0.
- `npm.cmd run test:browser`: Playwright passes with existing intentionally skipped cross-project mobile/desktop-only tests.

- [ ] **Step 7: Commit final polish verification updates**

```bash
git add src/style.css tests/browser/game.spec.ts tests/document.test.ts README.md
git commit -m "test: verify mobile polish"
```

---

## Self-Review

- Spec coverage: Task 1 covers hidden `Я` labels and mobile button label API. Task 2 covers factory exit door, clearer desktop prompts, mobile labels, and browser expectations. Task 3 covers two-line Dimon dialogue, grouped car, no leftover wheels, richer parking scene, and parking prompt labels. Task 4 covers mobile layout, orientation hint, README, and full verification.
- Placeholder scan: every task has concrete files, exact strings, code snippets, commands, and expected outcomes.
- Type consistency: `speakerLabelFor()` and `TouchInteractionSource.setLabel()` are defined before FactoryScene and ParkingScene consume them.
