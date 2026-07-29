# Sewing Lines and End-Control Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse production floor with four navigable sewing lines, each staffed by an ambient final-control character who makes a new random equipment request on every approach.

**Architecture:** Keep production geometry and controller positions in the generated Tiled map. Model controller definitions and random requests separately from the five collectible characters, then merge both NPC types only at the scene's nearest-target boundary. Preserve the existing progress-aware dialogue path for collectible characters and add a non-persistent ambient dialogue path for controllers.

**Tech Stack:** TypeScript 5.9, Phaser 3.90, generated Tiled JSON, Vite 7, Vitest 3, Playwright 1.62, PNGJS.

## Global Constraints

- The production floor contains exactly four visually distinct sewing lines.
- Every line ends at a final-control station with **Контролер 1**, **Контролер 2**, **Контролер 3**, or **Контролер 4**.
- Controllers are excluded from the main `Фрази: 0/5` progress and completion condition.
- Approaching a controller automatically opens dialogue; leaving closes it.
- A new request is chosen on every new approach and remains stable while the player stays nearby.
- Requests are exactly:
  - **Дайте, будь ласка, нову мишку**
  - **Потрібен новий сканер**
  - **Потрібен новий комп’ютер**
  - **Дайте, будь ласка, новий сенсорний екран**
- Independent random selections may repeat the previous request.
- The nearest target wins across collectible characters and controllers.
- Movement remains active while dialogue is visible.
- Machines and stations have collisions, with walkable aisles and complete reachability.
- Existing KPP, office signs, collectible character copy, and planned mobile controls remain unchanged.
- No new dependency is added.

## File Structure

- Modify `scripts/generate-factory-tiles.mjs`: generate four sewing lines, final-control stations, collision geometry, and controller points.
- Modify `public/assets/maps/factory.json`: regenerated map artifact.
- Modify `tests/map.test.ts`: validate production topology, controller points, collisions, and reachability.
- Create `src/game/controllers.ts`: controller metadata and exact random-request catalog.
- Create `src/game/controllerDialogue.ts`: deterministic request selection and ambient target state.
- Create `tests/controllers.test.ts`: metadata, request selection, and reroll lifecycle tests.
- Modify `src/game/FactoryScene.ts`: render controllers and route ambient versus collectible dialogue.
- Modify `tests/browser/game.spec.ts`: exercise a real controller approach and verify progress stays unchanged.
- Modify `README.md`: describe the four production lines and ambient requests.

---

### Task 1: Generate Four Sewing Lines and Controller Map Points

**Files:**
- Modify: `scripts/generate-factory-tiles.mjs`
- Modify (generated): `public/assets/maps/factory.json`
- Test: `tests/map.test.ts`

**Interfaces:**
- Consumes: existing `stamp`, `collision`, `addFurniture`, `point`, and object-layer helpers.
- Produces: required object layer `controllers` with points `controller-1` through `controller-4`.
- Produces: collision names prefixed `sewing-line-1` through `sewing-line-4` and `final-control-1` through `final-control-4`.

- [ ] **Step 1: Write failing map tests**

Extend map tests:

```ts
it("contains four exact controller points", () => {
  const controllers = layer(readMap(), "controllers").objects ?? [];
  expect(controllers).toEqual([
    expect.objectContaining({ name: "controller-1", type: "controller" }),
    expect.objectContaining({ name: "controller-2", type: "controller" }),
    expect.objectContaining({ name: "controller-3", type: "controller" }),
    expect.objectContaining({ name: "controller-4", type: "controller" })
  ]);
});

it("contains four sewing lines and final-control stations", () => {
  const collisions = layer(readMap(), "collisions").objects ?? [];
  for (let line = 1; line <= 4; line += 1) {
    expect(collisions.some((object) => object.name.startsWith(`sewing-line-${line}`))).toBe(true);
    expect(collisions.some((object) => object.name === `final-control-${line}`)).toBe(true);
  }
});
```

Generalize the existing flood-fill helper so it checks both `npcs` and `controllers`. Add aisle samples between adjacent line rectangles and assert every sample is unblocked and reachable from spawn.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/map.test.ts`

Expected: FAIL because `controllers` and named sewing-line collisions do not exist.

- [ ] **Step 3: Replace placeholder production equipment**

In the generator, remove the six generic `production-machine-*` clusters and the isolated `production-supplies` placeholder.

Add four horizontal lines in the central floor. Each line should contain repeated two-tile sewing-machine workstations with one-tile walking gaps, plus one larger final-control station. Keep at least two walkable tiles between line collision rectangles.

Use a data table instead of four copied blocks:

```js
const sewingLines = [
  { id: 1, y: 20, controllerX: 744, controllerY: 344 },
  { id: 2, y: 23, controllerX: 744, controllerY: 392 },
  { id: 3, y: 26, controllerX: 744, controllerY: 440 },
  { id: 4, y: 29, controllerX: 744, controllerY: 488 }
];
```

For each line:

- stamp a row of repeated machine tiles from columns `19` through `43`;
- use compact collision rectangles for each workstation, not one wall spanning the aisle gaps;
- stamp a visually distinct final-control station near columns `46–48`;
- add its named collision;
- place the controller on the walkable side of the station.

If these suggested coordinates conflict with the existing checkpoint boundary or map height, adjust the table while preserving four separate horizontal lines, two-tile aisles, and controller reachability. Record final exact coordinates in the test expectations.

Create:

```js
const controllers = sewingLines.map(({ id, controllerX, controllerY }) =>
  point(`controller-${id}`, controllerX, controllerY, "controller")
);
```

Append `objectLayer(8, "controllers", controllers)` and increment `nextlayerid`.

Regenerate:

```powershell
node scripts/generate-factory-tiles.mjs
```

- [ ] **Step 4: Run map tests and full unit suite**

Run:

```powershell
npm.cmd test -- tests/map.test.ts
npm.cmd test
```

Expected: map and full unit suites PASS; every existing NPC and controller is reachable.

- [ ] **Step 5: Commit**

```powershell
git add scripts/generate-factory-tiles.mjs public/assets/maps/factory.json tests/map.test.ts
git commit -m "feat: add four sewing production lines"
```

### Task 2: Model Ambient Controllers and Random Requests

**Files:**
- Create: `src/game/controllers.ts`
- Create: `src/game/controllerDialogue.ts`
- Create: `tests/controllers.test.ts`

**Interfaces:**
- Produces: `ControllerDefinition = { id: string; name: string; objectId: string }`.
- Produces: `CONTROLLERS` with four exact definitions.
- Produces: `CONTROLLER_REQUESTS` with four exact strings.
- Produces: `selectControllerRequest(random?: () => number): string`.
- Produces: `AmbientDialogueState` with `enter(id)`, `leave()`, and `active()`.

- [ ] **Step 1: Write failing metadata and selection tests**

Create:

```ts
import { expect, it, vi } from "vitest";
import { CONTROLLERS, CONTROLLER_REQUESTS } from "../src/game/controllers";
import { AmbientDialogueState, selectControllerRequest } from "../src/game/controllerDialogue";

it("defines four non-collectible final-control characters", () => {
  expect(CONTROLLERS).toEqual([
    { id: "controller-1", name: "Контролер 1", objectId: "controller-1" },
    { id: "controller-2", name: "Контролер 2", objectId: "controller-2" },
    { id: "controller-3", name: "Контролер 3", objectId: "controller-3" },
    { id: "controller-4", name: "Контролер 4", objectId: "controller-4" }
  ]);
});

it.each([
  [0, "Дайте, будь ласка, нову мишку"],
  [0.25, "Потрібен новий сканер"],
  [0.5, "Потрібен новий комп’ютер"],
  [0.999, "Дайте, будь ласка, новий сенсорний екран"]
])("maps random value %s to the expected request", (value, expected) => {
  expect(selectControllerRequest(() => value)).toBe(expected);
});

it("selects once per entry and selects again after leaving", () => {
  const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.5);
  const state = new AmbientDialogueState(random);

  expect(state.enter("controller-1")?.request).toBe(CONTROLLER_REQUESTS[0]);
  expect(state.enter("controller-1")?.request).toBe(CONTROLLER_REQUESTS[0]);
  expect(random).toHaveBeenCalledTimes(1);
  state.leave();
  expect(state.enter("controller-1")?.request).toBe(CONTROLLER_REQUESTS[2]);
  expect(random).toHaveBeenCalledTimes(2);
});
```

Also test non-finite, negative, and `1` random values clamp to valid indexes.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm.cmd test -- tests/controllers.test.ts`

Expected: FAIL because controller modules do not exist.

- [ ] **Step 3: Implement exact metadata and safe random selection**

In `controllers.ts`, export the exact four definitions and requests as readonly arrays.

In `controllerDialogue.ts`, calculate:

```ts
const safe = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
const index = Math.floor(safe * CONTROLLER_REQUESTS.length);
```

`AmbientDialogueState.enter(id)` returns the existing active selection when `id` is unchanged. For a different ID or after `leave()`, it selects a new request. `active()` returns an immutable snapshot or `undefined`.

- [ ] **Step 4: Run focused and full unit tests**

Run:

```powershell
npm.cmd test -- tests/controllers.test.ts
npm.cmd test
```

Expected: all tests PASS; existing progress total remains five.

- [ ] **Step 5: Commit**

```powershell
git add src/game/controllers.ts src/game/controllerDialogue.ts tests/controllers.test.ts
git commit -m "feat: model controller equipment requests"
```

### Task 3: Render Controllers and Route Ambient Dialogue

**Files:**
- Modify: `src/game/FactoryScene.ts`
- Modify: `tests/characters.test.ts`
- Modify: `tests/interaction.test.ts`

**Interfaces:**
- Consumes: required map layer `controllers`, `CONTROLLERS`, and `AmbientDialogueState`.
- Produces: `NpcTarget` discriminated union:

```ts
type NpcTarget =
  | { kind: "collectible"; id: string; name: string; phrase: string; sprite: Phaser.GameObjects.Sprite }
  | { kind: "ambient"; id: string; name: string; sprite: Phaser.GameObjects.Sprite };
```

- [ ] **Step 1: Add failing source and behavior contracts**

Add tests that require:

- `CHARACTERS.length` remains `5`;
- `CONTROLLERS.length` is `4`;
- IDs are unique across both arrays;
- the scene looks up `map.getObjectLayer("controllers")`;
- the scene constructs one combined candidate list;
- controller dialogue does not call `discover`.

Extract a pure routing helper if source-only assertions would otherwise lock tests to private implementation:

```ts
export function isCollectibleTarget(
  target: { kind: "collectible" | "ambient" }
): target is { kind: "collectible" } {
  return target.kind === "collectible";
}
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm.cmd test -- tests/characters.test.ts tests/interaction.test.ts`

Expected: FAIL because the scene and target model do not include controllers.

- [ ] **Step 3: Load and render controller NPCs**

Require the `controllers` map layer in the existing incomplete-layer check. Generate a `"npc-controller"` procedural `16 × 20` texture with a distinct high-visibility vest or quality-control color.

Resolve every `ControllerDefinition.objectId` against the layer. Log and skip malformed individual points. Create sprites with `.setOrigin(0.5, 1)` and no physics body so controllers cannot block movement.

- [ ] **Step 4: Unify proximity targeting and split dialogue effects**

Build one `NpcTarget[]` and pass every target's `id`, `sprite.x`, and `sprite.y` to `proximityDialogueTarget`.

On target change:

- close the previous dialogue;
- call `AmbientDialogueState.leave()`;
- for a collectible, call the existing `openDialogue()` with progress discovery;
- for an ambient controller, call `ambientState.enter(id)` and open a presentation-only dialogue with controller name and selected request;
- never update `ProgressStore`, counter, or completion state for ambient dialogue.

Keep movement updates before proximity handling.

- [ ] **Step 5: Run unit tests and build**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: all unit tests and build PASS; progress tests still use total five.

- [ ] **Step 6: Commit**

```powershell
git add src/game/FactoryScene.ts tests/characters.test.ts tests/interaction.test.ts
git commit -m "feat: add ambient final-control characters"
```

### Task 4: Add Browser Coverage, Documentation, and Visual QA

**Files:**
- Modify: `tests/browser/game.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: production map, controller dialogue, and `#game-status`.
- Produces: browser smoke proving ambient dialogue and unchanged main progress.

- [ ] **Step 1: Add a failing controller browser smoke**

Add a test that clears local storage, walks from spawn to the nearest production controller, and asserts:

```ts
await expect(status).toHaveAttribute("data-game-state", "dialogue");
await expect(status).toHaveAttribute("data-character-id", "controller-1");
await expect(status).toContainText("Контролер 1");
await expect(page.locator("canvas")).toBeVisible();
expect(await page.evaluate(() => localStorage.getItem("factory-phrases-progress-v1")))
  .toBeNull();
```

Walk away and re-enter. Assert dialogue closes and reopens. Do not assert the second random request differs, because repetition is allowed.

- [ ] **Step 2: Run browser smoke and verify RED**

Run: `npm.cmd run test:browser -- --grep "controller"`

Expected: FAIL until movement timing reaches the newly generated controller.

- [ ] **Step 3: Stabilize real controller movement**

Use keyboard movement durations derived from the final generated coordinates. Assert status transitions rather than sleeping after every key when a concrete status wait can be used. Capture page errors and require none.

- [ ] **Step 4: Update README**

Document that the central floor contains four sewing lines with final-control workers whose equipment requests change on each approach and do not count toward the five collectible phrases.

- [ ] **Step 5: Run complete verification**

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
git diff --check
git status --short
```

Expected: unit, build, Chromium, and Firefox checks PASS; only intended browser test and README remain uncommitted.

- [ ] **Step 6: Perform visual QA**

Verify:

1. four distinct sewing lines replace the sparse placeholder clusters;
2. every line ends at a visible final-control station;
3. Контролер 1–4 stand beside their own station;
4. aisles remain comfortably walkable;
5. KPP, office routes, room signs, and collectible NPCs remain reachable;
6. controller dialogue opens, stays stable while nearby, closes on exit, and rerolls on re-entry;
7. the main counter remains `/5`;
8. the production layout leaves the lower-left mobile joystick area usable.

- [ ] **Step 7: Commit**

```powershell
git add tests/browser/game.spec.ts README.md
git commit -m "test: cover sewing line controller dialogue"
```
