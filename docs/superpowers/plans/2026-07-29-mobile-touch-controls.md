# Mobile Touch Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the factory game playable on touch phones with a responsive virtual joystick while preserving desktop keyboard controls and automatic dialogue.

**Architecture:** Add pure joystick geometry and input-selection functions, then wrap them with a small DOM pointer controller. The entry point creates the controller and injects its movement source through Phaser's registry; `FactoryScene` selects the stronger keyboard or touch vector every frame. HTML and CSS own the mobile control presentation, safe areas, and portrait hint.

**Tech Stack:** TypeScript 5.9, Phaser 3.90, Vite 7, Vitest 3 with jsdom, Playwright 1.62, HTML/CSS Pointer Events.

## Global Constraints

- The touch control is a translucent virtual joystick in the lower-left corner.
- The joystick appears only on touch-capable devices.
- Distance from center controls speed; the knob and output vector clamp at the outer radius.
- Pointer release and `pointercancel` immediately reset movement.
- Secondary pointers are ignored while a joystick gesture is active.
- Keyboard behavior remains unchanged; the stronger of keyboard and touch vectors wins.
- Combined input never exceeds normalized magnitude `1`.
- Automatic proximity dialogue remains unchanged; no interaction button is added.
- Portrait mode shows the exact non-blocking hint **Поверніть телефон горизонтально**.
- The `960 × 540` canvas remains fully visible with Phaser `FIT` scaling.
- Joystick gestures do not scroll, select, or zoom the page.
- No new runtime dependency is added.

## File Structure

- Create `src/game/touchMovement.ts`: pure joystick-vector and stronger-input selection functions.
- Create `tests/touchMovement.test.ts`: unit coverage for geometry and input selection.
- Create `src/game/touchController.ts`: DOM pointer lifecycle and movement-source interface.
- Create `tests/touchController.test.ts`: jsdom lifecycle, visibility, cancellation, and default-prevention tests.
- Modify `index.html`: joystick and portrait-hint markup.
- Modify `src/style.css`: touch-only controls, safe areas, gesture containment, and portrait presentation.
- Modify `src/main.ts`: initialize the controller safely and inject its movement source.
- Modify `src/game/config.ts`: accept and register the movement source for the scene.
- Modify `src/game/FactoryScene.ts`: select keyboard or touch movement each frame.
- Modify `tests/browser/game.spec.ts`: retain desktop smoke and add mobile touch smoke.
- Modify `README.md`: document mobile play.

---

### Task 1: Implement Pure Joystick Math and Input Selection

**Files:**
- Create: `src/game/touchMovement.ts`
- Create: `tests/touchMovement.test.ts`

**Interfaces:**
- Produces: `MovementVector = { x: number; y: number }`.
- Produces: `joystickVector(centerX, centerY, pointerX, pointerY, radius): MovementVector`.
- Produces: `strongerMovement(keyboard, touch): MovementVector`.

- [ ] **Step 1: Write failing geometry and selection tests**

Create tests covering center, cardinal directions, a normalized diagonal, clamping, invalid radius, and stronger-input selection:

```ts
import { describe, expect, it } from "vitest";
import { joystickVector, strongerMovement } from "../src/game/touchMovement";

describe("joystickVector", () => {
  it("returns zero at the center", () => {
    expect(joystickVector(50, 50, 50, 50, 40)).toEqual({ x: 0, y: 0 });
  });

  it("scales cardinal movement by distance", () => {
    expect(joystickVector(50, 50, 70, 50, 40)).toEqual({ x: 0.5, y: 0 });
  });

  it("clamps diagonal movement to magnitude one", () => {
    const result = joystickVector(0, 0, 100, 100, 40);
    expect(Math.hypot(result.x, result.y)).toBeCloseTo(1);
    expect(result.x).toBeCloseTo(Math.SQRT1_2);
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("returns zero for a non-positive radius", () => {
    expect(joystickVector(0, 0, 10, 10, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("strongerMovement", () => {
  it("uses touch when its magnitude is greater", () => {
    expect(strongerMovement({ x: 0, y: 0 }, { x: 0.75, y: 0 }))
      .toEqual({ x: 0.75, y: 0 });
  });

  it("keeps keyboard on equal magnitude", () => {
    expect(strongerMovement({ x: 1, y: 0 }, { x: 0, y: 1 }))
      .toEqual({ x: 1, y: 0 });
  });

  it("clamps malformed input to magnitude one", () => {
    expect(Math.hypot(...Object.values(strongerMovement(
      { x: 2, y: 0 },
      { x: 0, y: 0 }
    )))).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- tests/touchMovement.test.ts`

Expected: FAIL because `src/game/touchMovement.ts` does not exist.

- [ ] **Step 3: Implement minimal pure functions**

Create:

```ts
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
```

- [ ] **Step 4: Run focused and full unit tests**

Run:

```powershell
npm.cmd test -- tests/touchMovement.test.ts
npm.cmd test
```

Expected: focused tests and all existing tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/game/touchMovement.ts tests/touchMovement.test.ts
git commit -m "feat: add touch movement math"
```

### Task 2: Build the DOM Joystick Controller

**Files:**
- Create: `src/game/touchController.ts`
- Create: `tests/touchController.test.ts`
- Modify: `tests/setup.ts`

**Interfaces:**
- Consumes: `joystickVector(...)`.
- Produces: `MovementSource = { current(): MovementVector }`.
- Produces: `TouchController = MovementSource & { destroy(): void }`.
- Produces: `createTouchController(root, knob, touchCapable?): TouchController`.

- [ ] **Step 1: Write failing pointer lifecycle tests**

Use real `PointerEvent` when available and a helper that defines `pointerId`, `clientX`, and `clientY` for jsdom. Cover:

```ts
it("tracks one pointer and resets on release", () => {
  const controller = createTouchController(root, knob, true);
  root.dispatchEvent(pointer("pointerdown", 7, 140, 100));
  expect(controller.current().x).toBeGreaterThan(0);

  window.dispatchEvent(pointer("pointerup", 7, 140, 100));
  expect(controller.current()).toEqual({ x: 0, y: 0 });
  expect(knob.style.transform).toBe("translate(0px, 0px)");
});

it("resets on pointercancel", () => {
  const controller = createTouchController(root, knob, true);
  root.dispatchEvent(pointer("pointerdown", 3, 100, 60));
  window.dispatchEvent(pointer("pointercancel", 3, 100, 60));
  expect(controller.current()).toEqual({ x: 0, y: 0 });
});

it("ignores a secondary pointer", () => {
  const controller = createTouchController(root, knob, true);
  root.dispatchEvent(pointer("pointerdown", 1, 140, 100));
  const first = controller.current();
  root.dispatchEvent(pointer("pointerdown", 2, 60, 100));
  expect(controller.current()).toEqual(first);
});

it("hides the root when touch is unavailable", () => {
  createTouchController(root, knob, false);
  expect(root.hidden).toBe(true);
});

it("prevents default on active joystick gestures", () => {
  const controller = createTouchController(root, knob, true);
  const event = pointer("pointerdown", 1, 120, 100);
  root.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  controller.destroy();
});
```

Mock `root.getBoundingClientRect()` as a `120 × 120` square with center `(100, 100)`.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm.cmd test -- tests/touchController.test.ts`

Expected: FAIL because the controller module does not exist.

- [ ] **Step 3: Implement active-pointer ownership and cleanup**

Implement `createTouchController` with:

- `touchCapable` defaulting to `navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches`;
- root hidden state set from that capability;
- non-passive `pointerdown` and `pointermove` listeners;
- window `pointerup` and `pointercancel` listeners;
- `setPointerCapture` when supported;
- radius equal to half the smaller root dimension;
- knob transform based on the clamped vector times radius;
- immutable `{ x, y }` snapshots returned by `current()`;
- removal of all listeners and reset inside `destroy()`.

Use:

```ts
export interface MovementSource {
  current(): MovementVector;
}

export interface TouchController extends MovementSource {
  destroy(): void;
}
```

- [ ] **Step 4: Run focused and full tests**

Run:

```powershell
npm.cmd test -- tests/touchController.test.ts
npm.cmd test
```

Expected: all tests PASS with no jsdom listener errors.

- [ ] **Step 5: Commit**

```powershell
git add src/game/touchController.ts tests/touchController.test.ts tests/setup.ts
git commit -m "feat: add virtual joystick controller"
```

### Task 3: Add Responsive Mobile Markup and Styling

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `tests/document.test.ts`

**Interfaces:**
- Produces: `#touch-joystick`, `#touch-joystick-knob`, and `#orientation-hint`.
- Consumes: `hidden` state controlled by the joystick controller.

- [ ] **Step 1: Write failing document contract tests**

Extend the document test to require:

```ts
expect(documentSource).toContain('id="touch-joystick"');
expect(documentSource).toContain('id="touch-joystick-knob"');
expect(documentSource).toContain('id="orientation-hint"');
expect(documentSource).toContain("Поверніть телефон горизонтально");
expect(styleSource).toContain("touch-action: none");
expect(styleSource).toContain("env(safe-area-inset-left)");
expect(styleSource).toContain("@media (orientation: portrait)");
expect(styleSource).toContain("@media (pointer: coarse)");
```

- [ ] **Step 2: Run document test and verify RED**

Run: `npm.cmd test -- tests/document.test.ts`

Expected: FAIL because mobile markup and styles are absent.

- [ ] **Step 3: Add accessible control markup**

Inside `<body>` after `<main id="game">` add:

```html
<div id="touch-joystick" aria-label="Керування рухом" hidden>
  <div id="touch-joystick-knob"></div>
</div>
<p id="orientation-hint" role="status">Поверніть телефон горизонтально</p>
```

The joystick is not a button because it uses continuous pointer input.

- [ ] **Step 4: Add touch-only, safe-area-aware styles**

Add CSS that:

- gives the joystick a fixed `7rem × 7rem` circular base;
- positions it with `calc(1rem + env(safe-area-inset-left))` and `calc(1rem + env(safe-area-inset-bottom))`;
- uses `touch-action: none`, `user-select: none`, `z-index: 20`, and translucent colors;
- centers a `2.75rem` circular knob;
- keeps `[hidden]` controls hidden;
- shows the joystick only inside `@media (pointer: coarse)`;
- hides the orientation hint by default;
- shows the hint inside `@media (pointer: coarse) and (orientation: portrait)`;
- positions the hint at the top center with safe-area padding and `pointer-events: none`;
- sets `overscroll-behavior: none` on `#game` and the joystick, not globally on unrelated pages;
- preserves the existing canvas `FIT` behavior with `max-width: 100vw; max-height: 100dvh`.

- [ ] **Step 5: Run document tests and build**

Run:

```powershell
npm.cmd test -- tests/document.test.ts
npm.cmd run build
```

Expected: document tests and TypeScript/Vite build PASS.

- [ ] **Step 6: Commit**

```powershell
git add index.html src/style.css tests/document.test.ts
git commit -m "feat: add mobile joystick layout"
```

### Task 4: Inject Touch Movement into Phaser

**Files:**
- Modify: `src/main.ts`
- Modify: `src/game/config.ts`
- Modify: `src/game/FactoryScene.ts`
- Modify: `src/game/movement.ts`
- Modify: `tests/movement.test.ts`
- Modify: `tests/errorScreen.test.ts`

**Interfaces:**
- Consumes: `MovementSource.current()` and `strongerMovement(...)`.
- Produces: `createGameConfig(parent, touchMovement): Phaser.Types.Core.GameConfig`.
- Produces: Phaser registry key `"touchMovement"` containing the movement source.

- [ ] **Step 1: Write failing integration-level unit contracts**

Add tests that verify keyboard normalization remains unchanged and the config accepts a movement source:

```ts
it("registers the touch movement source for scenes", () => {
  const source = { current: () => ({ x: 0.5, y: 0 }) };
  const config = createGameConfig("game", source);
  expect(config.callbacks?.preBoot).toBeTypeOf("function");
});
```

Add a source contract test requiring `FactoryScene` to call:

```ts
strongerMovement(keyboardDirection, touchDirection)
```

and to read `"touchMovement"` from the registry.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/movement.test.ts tests/errorScreen.test.ts`

Expected: FAIL because config and scene do not accept touch movement.

- [ ] **Step 3: Register and consume the movement source**

In `createGameConfig`, accept `touchMovement: MovementSource` and add:

```ts
callbacks: {
  preBoot(game) {
    game.registry.set("touchMovement", touchMovement);
  }
}
```

In `FactoryScene`, store the registry source during `create()`. In `update()`:

```ts
const keyboardDirection = movementVector({ /* existing keys */ });
const touchDirection = this.touchMovement.current();
const direction = strongerMovement(keyboardDirection, touchDirection);
```

Keep `MOVEMENT_SPEED` and player-direction behavior unchanged.

- [ ] **Step 4: Initialize controls with graceful fallback**

In `main.ts`, locate the joystick elements. If present, create the controller; otherwise use a zero-valued movement source and log a precise initialization error. Pass the resulting source into `createGameConfig`.

Register `pagehide` cleanup:

```ts
window.addEventListener("pagehide", () => controller?.destroy(), { once: true });
```

Do not prevent the game from starting when controls are missing.

- [ ] **Step 5: Run full unit tests and build**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: all unit tests and build PASS; keyboard tests remain unchanged.

- [ ] **Step 6: Commit**

```powershell
git add src/main.ts src/game/config.ts src/game/FactoryScene.ts src/game/movement.ts tests/movement.test.ts tests/errorScreen.test.ts
git commit -m "feat: integrate touch movement with the game"
```

### Task 5: Add Mobile Browser Coverage and Documentation

**Files:**
- Modify: `playwright.config.ts`
- Modify: `tests/browser/game.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: mobile joystick DOM and the existing `#game-status` mirror.
- Produces: Chromium mobile-touch project plus retained desktop Chromium and Firefox projects.

- [ ] **Step 1: Add a failing mobile browser smoke**

Add a mobile Chromium project using `devices["Pixel 7"]`. In the browser spec:

```ts
test("moves from the mobile joystick and resets on release", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.goto("/factory-phrases-game/");

  const joystick = page.locator("#touch-joystick");
  await expect(joystick).toBeVisible();
  await expect(page.locator("#orientation-hint")).toBeVisible();

  const box = await joystick.boundingBox();
  if (!box) throw new Error("Joystick has no bounding box");
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await page.touchscreen.tap(center.x, center.y);
  await joystick.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x,
    clientY: center.y - box.height / 2
  });
  await page.waitForTimeout(450);
  await page.dispatchEvent("body", "pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x,
    clientY: center.y - box.height / 2
  });

  await expect(page.getByRole("status")).toHaveAttribute("data-game-state", "dialogue");
});
```

Prefer a real Playwright touch gesture if the installed version exposes it reliably; otherwise dispatch pointer events with `pointerType: "touch"` as above and assert the knob transform changes before release and returns to center afterward.

Add a desktop assertion that `#touch-joystick` is hidden.

- [ ] **Step 2: Run mobile browser test and verify RED**

Run: `npm.cmd run test:browser -- --project=mobile-chromium`

Expected: FAIL until the mobile project and integrated touch behavior are complete.

- [ ] **Step 3: Configure the mobile project and stabilize assertions**

Add:

```ts
{
  name: "mobile-chromium",
  use: { ...devices["Pixel 7"] }
}
```

Use portrait Pixel 7 for hint visibility, then set a landscape viewport in a separate assertion and verify the hint becomes hidden. Assert:

- joystick visibility on touch mobile;
- portrait hint exact copy;
- knob displacement during the active pointer;
- player reaches guard dialogue through touch movement;
- pointer release restores `translate(0px, 0px)`;
- no page errors.

- [ ] **Step 4: Update README**

Add mobile controls:

```markdown
- On a phone, rotate to landscape and drag the on-screen joystick to move.
- Release the joystick to stop.
```

State that desktop keyboard controls remain available.

- [ ] **Step 5: Run complete verification**

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
git diff --check
git status --short
```

Expected: all unit tests PASS; build PASS; desktop Chromium, desktop Firefox, and mobile Chromium browser tests PASS; diff check clean; only intended files changed.

- [ ] **Step 6: Perform device visual QA**

Verify a portrait and landscape phone viewport:

1. canvas remains fully visible;
2. portrait hint is readable and non-blocking;
3. joystick respects left/bottom safe-area spacing;
4. joystick does not cover dialogue;
5. dragging moves smoothly and releasing stops immediately;
6. automatic guard dialogue opens and closes through touch movement;
7. desktop viewport has no joystick.

- [ ] **Step 7: Commit**

```powershell
git add playwright.config.ts tests/browser/game.spec.ts README.md
git commit -m "test: cover mobile touch gameplay"
```
