# Factory Entrance, Signs, and Proximity Dialogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the player through a signed KPP before the factory, label every destination, make Vasyl visibly tall, and show dialogue automatically while the player is near a character.

**Architecture:** Keep the generated Tiled JSON map as the source of truth for geometry, spawn, NPC locations, and world-space signs. Add a small pure proximity-state helper so automatic dialogue behavior can be unit tested independently, while `FactoryScene` remains responsible for Phaser rendering and progress persistence. Generate Vasyl's taller texture in the existing procedural NPC texture factory and foot-anchor all NPC sprites.

**Tech Stack:** TypeScript 5.9, Phaser 3.90, Vite 7, Vitest 3, Playwright 1.62, generated Tiled JSON, PNGJS.

## Global Constraints

- The exact main entrance label is **Блядер**.
- The exact checkpoint label is **KPP**.
- The exact room labels are **IT**, **Відділ змін**, **QM**, and **Склад швейного цеху**.
- The only route from spawn to the factory interior passes through KPP.
- The guard does not block movement and talking is not required for passage.
- Dialogue opens on proximity, closes on leaving proximity, and does not stop player movement.
- When multiple characters are in range, the nearest character is shown.
- Vasyl is visibly much taller than every other character and remains anchored at his feet.
- No conversation gate, locked door, access-card system, or new dependency is added.

## File Structure

- `scripts/generate-factory-tiles.mjs`: generate the revised checkpoint geometry, object positions, and `signs` object layer.
- `public/assets/maps/factory.json`: regenerated map artifact consumed by Phaser.
- `tests/map.test.ts`: validate exact signs, checkpoint topology, NPC placement, and generated artifact.
- `src/game/interaction.ts`: expose pure nearest-candidate selection and proximity dialogue transition logic.
- `tests/interaction.test.ts`: unit-test entry, exit, nearest-candidate switching, and stable proximity behavior.
- `src/game/FactoryScene.ts`: render signs, create the tall Vasyl texture, and apply automatic dialogue state without freezing movement.
- `tests/characters.test.ts`: retain character-content coverage and assert Vasyl's dedicated sprite key through exported texture metadata.
- `tests/browser/game.spec.ts`: validate the real automatic guard dialogue and its automatic close in a production Pages build.
- `README.md`: update controls and map-authoring documentation.

---

### Task 1: Generate a Checkpoint-First Map with Exact Signs

**Files:**
- Modify: `scripts/generate-factory-tiles.mjs`
- Modify (generated): `public/assets/maps/factory.json`
- Test: `tests/map.test.ts`

**Interfaces:**
- Consumes: existing `tileLayer`, `objectLayer`, `point`, wall, collision, and furniture helpers in the generator.
- Produces: required Tiled object layer `signs`; sign objects with `name`, `x`, `y`, and string property `{ name: "text", type: "string", value: string }`; `player-spawn` inside the south checkpoint; `npc-security` inside that checkpoint.

- [ ] **Step 1: Write failing map tests for exact signs and checkpoint topology**

Extend the test object types and add helpers/tests equivalent to:

```ts
type MapProperty = { name: string; type: string; value: string };
type MapObject = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: MapProperty[];
};

function objectText(object: MapObject): string | undefined {
  return object.properties?.find((property) => property.name === "text")?.value;
}

it("contains every exact world-space sign", () => {
  const signs = layer(readMap(), "signs").objects ?? [];
  expect(signs.map(objectText)).toEqual([
    "Блядер",
    "KPP",
    "IT",
    "Відділ змін",
    "QM",
    "Склад швейного цеху"
  ]);
});

it("places spawn and security inside the checkpoint", () => {
  const map = readMap();
  const spawn = layer(map, "spawn").objects?.find((object) => object.name === "player-spawn");
  const guard = layer(map, "npcs").objects?.find((object) => object.name === "npc-security");

  expect(spawn).toMatchObject({ x: 136, y: 472 });
  expect(guard).toMatchObject({ x: 88, y: 392 });
});
```

Update the required-layer assertion to include `"signs"`. Add a flood-fill assertion with two seed points: starting from `player-spawn`, every path to a factory-interior target such as `{ x: 320, y: 384 }` must cross a checkpoint exit cell at row `18`, columns `8` or `9`. Implement this by flood-filling from spawn while treating those two exit cells as blocked and assert the interior target is unreachable; then retain the existing full flood fill and assert every NPC is reachable when the exit is open.

- [ ] **Step 2: Run map tests and verify they fail**

Run: `npm test -- tests/map.test.ts`

Expected: FAIL because `signs` is missing and the guard remains at `{ x: 88, y: 120 }`.

- [ ] **Step 3: Revise the generated geometry and add sign objects**

In `createFactoryMap()`:

- remove the old upper `gatehouse` office and its furniture, leaving that area connected to the factory floor;
- keep the south room as the checkpoint with its spawn-side bottom wall and its two-tile north exit;
- keep the player at `{ x: 136, y: 472 }`;
- move `npc-security` to `{ x: 88, y: 392 }`, inside the south checkpoint and beside its route;
- preserve the four upper destination rooms and their NPC coordinates;
- add a sign helper:

```js
const sign = (name, text, x, y) => ({
  id: objectId++,
  name,
  type: "sign",
  x,
  y,
  width: 0,
  height: 0,
  rotation: 0,
  visible: true,
  point: true,
  properties: [{ name: "text", type: "string", value: text }]
});
```

Create signs in this exact order and place each at its relevant entrance:

```js
const signs = [
  sign("factory-name", "Блядер", 144, 488),
  sign("checkpoint", "KPP", 144, 320),
  sign("it-office", "IT", 208, 216),
  sign("shifts-office", "Відділ змін", 360, 216),
  sign("qm-office", "QM", 536, 216),
  sign("sewing-storage", "Склад швейного цеху", 728, 216)
];
```

Append `objectLayer(7, "signs", signs)` and update `nextlayerid` to `8`. Run:

```powershell
node scripts/generate-factory-tiles.mjs
```

- [ ] **Step 4: Run map tests and verify they pass**

Run: `npm test -- tests/map.test.ts`

Expected: all map tests PASS, including exact labels, mandatory KPP route, clear doors, and NPC reachability.

- [ ] **Step 5: Commit the generated map unit**

```powershell
git add scripts/generate-factory-tiles.mjs public/assets/maps/factory.json tests/map.test.ts
git commit -m "feat: route factory entrance through signed checkpoint"
```

### Task 2: Model Automatic Proximity Dialogue as Pure State

**Files:**
- Modify: `src/game/interaction.ts`
- Test: `tests/interaction.test.ts`

**Interfaces:**
- Consumes: `nearestInteractable(origin, candidates)`.
- Produces: `proximityDialogueTarget(origin, candidates): string | undefined`, returning the nearest in-range candidate ID or `undefined`; `INTERACTION_RADIUS` remains `56`.

- [ ] **Step 1: Write failing transition-focused tests**

Add tests that describe the scene-facing API:

```ts
import { nearestInteractable, proximityDialogueTarget } from "../src/game/interaction";

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
```

- [ ] **Step 2: Run interaction tests and verify they fail**

Run: `npm test -- tests/interaction.test.ts`

Expected: FAIL because `proximityDialogueTarget` is not exported.

- [ ] **Step 3: Implement the minimal pure helper**

Add:

```ts
export function proximityDialogueTarget(
  origin: { x: number; y: number },
  candidates: readonly InteractionCandidate[]
): string | undefined {
  return nearestInteractable(origin, candidates)?.id;
}
```

Do not add timers, input state, or persistence to this module.

- [ ] **Step 4: Run interaction tests and verify they pass**

Run: `npm test -- tests/interaction.test.ts`

Expected: all interaction tests PASS.

- [ ] **Step 5: Commit the proximity model**

```powershell
git add src/game/interaction.ts tests/interaction.test.ts
git commit -m "feat: model automatic proximity dialogue"
```

### Task 3: Render Map-Defined Signs

**Files:**
- Modify: `src/game/FactoryScene.ts`
- Test: `tests/map.test.ts`

**Interfaces:**
- Consumes: required map object layer `signs` and each object's string `text` property.
- Produces: `getProperty(object, name): unknown` for Tiled property lookup and world-space Phaser text objects at map coordinates with consistent styling and depth below the fixed HUD.

- [ ] **Step 1: Add a failing source-level contract test**

Add a focused assertion to `tests/map.test.ts` that reads `src/game/FactoryScene.ts` and requires both the layer lookup and property lookup:

```ts
it("renders signs from map object properties", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");
  expect(source).toContain('map.getObjectLayer("signs")');
  expect(source).toContain('getProperty(object, "text")');
  expect(source).toContain(".setOrigin(0.5)");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/map.test.ts`

Expected: FAIL because the scene does not load or render signs.

- [ ] **Step 3: Load, validate, and render sign objects**

In `create()`, retrieve `const signLayer = map.getObjectLayer("signs")` beside the collision, spawn, and NPC layers. Include `!signLayer` in the existing incomplete-layer fatal check.

Add this module-level helper:

```ts
type TiledProperty = { name: string; value: unknown };

function getProperty(object: Phaser.Types.Tilemaps.TiledObject, name: string): unknown {
  const properties = object.properties as TiledProperty[] | undefined;
  return properties?.find((property) => property.name === name)?.value;
}
```

Render each object with:

```ts
for (const object of signLayer.objects) {
  const text = getProperty(object, "text");
  if (typeof text !== "string" || object.x === undefined || object.y === undefined) {
    console.error(`Skipping malformed sign ${object.name || object.id}.`);
    continue;
  }

  this.add.text(object.x, object.y, text, {
    fontFamily: '"Courier New", monospace',
    fontSize: text === "Блядер" ? "24px" : "15px",
    color: "#fff4dc",
    backgroundColor: "#24303a",
    padding: { x: 6, y: 3 },
    stroke: "#171b18",
    strokeThickness: 2
  }).setOrigin(0.5).setDepth(15);
}
```

- [ ] **Step 4: Run map tests and the TypeScript build**

Run:

```powershell
npm test -- tests/map.test.ts
npm run build
```

Expected: tests PASS and TypeScript/Vite build succeeds.

- [ ] **Step 5: Commit sign rendering**

```powershell
git add src/game/FactoryScene.ts tests/map.test.ts
git commit -m "feat: render factory room signs"
```

### Task 4: Make Dialogue Follow Proximity Without Freezing Movement

**Files:**
- Modify: `src/game/FactoryScene.ts`
- Test: `tests/browser/game.spec.ts`

**Interfaces:**
- Consumes: `proximityDialogueTarget(origin, candidates): string | undefined`.
- Produces: scene behavior where the target ID controls dialogue visibility; dialogue discovery still calls `discover`; status mirror is `"dialogue"` in range and `"ready"` out of range.

- [ ] **Step 1: Rewrite the browser test for automatic open and close**

Remove all `E` key input. Walk from spawn toward the relocated guard, assert automatic dialogue, then walk away and assert automatic close:

```ts
test("opens and closes guard dialogue from proximity without E", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  const status = page.getByRole("status");
  await expect(status).toHaveAttribute("data-game-state", "ready");

  await page.keyboard.down("a");
  await page.waitForTimeout(260);
  await page.keyboard.up("a");
  await page.keyboard.down("w");
  await page.waitForTimeout(420);
  await page.keyboard.up("w");

  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toHaveAttribute("data-character-id", "security-serhii");

  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  await expect(status).toHaveAttribute("data-game-state", "ready");
  await expect(status).not.toHaveAttribute("data-character-id");
  expect(pageErrors).toEqual([]);
});
```

Tune only movement durations if the generated geometry requires it; do not reintroduce interaction input.

- [ ] **Step 2: Run the browser test and verify it fails**

Run: `npm run test:browser -- tests/browser/game.spec.ts`

Expected: FAIL because dialogue still requires `E` and currently freezes player velocity while open.

- [ ] **Step 3: Replace key-driven dialogue state with proximity-driven state**

In `FactoryScene`:

- import `proximityDialogueTarget` instead of calling `nearestInteractable` directly;
- remove `interactKey`, `spaceKey`, `promptText`, keyboard registration for `E`/Space, pointer-to-close handling, and `dialogueOpen`;
- keep movement calculation at the start of every ready `update()` and never return early because dialogue is visible;
- calculate the current target ID after movement state is applied;
- track `private activeCharacterId?: string`;
- when the target ID changes:
  - call `closeDialogue()` when the old target existed;
  - call `openDialogue(target)` when a new target exists;
  - set `activeCharacterId` to the new target ID;
- make `openDialogue()` show content and discover progress without stopping velocity;
- make `closeDialogue()` hide content and restore the `"ready"` status mirror.

The central update shape should be:

```ts
const targetId = proximityDialogueTarget(this.player, candidates);
if (targetId !== this.activeCharacterId) {
  if (this.activeCharacterId) this.closeDialogue();
  this.activeCharacterId = targetId;
  const target = this.npcs.find(({ character }) => character.id === targetId);
  if (target) this.openDialogue(target);
}
```

- [ ] **Step 4: Run unit, browser, and build verification**

Run:

```powershell
npm test
npm run build
npm run test:browser -- tests/browser/game.spec.ts
```

Expected: all commands PASS; dialogue opens without `E`, closes after leaving, and movement remains active.

- [ ] **Step 5: Commit automatic scene interaction**

```powershell
git add src/game/FactoryScene.ts tests/browser/game.spec.ts
git commit -m "feat: show dialogue automatically near characters"
```

### Task 5: Give Vasyl a Dedicated Tall, Foot-Anchored Sprite

**Files:**
- Modify: `src/game/FactoryScene.ts`
- Modify: `src/game/characters.ts`
- Test: `tests/characters.test.ts`

**Interfaces:**
- Consumes: `CharacterDefinition.spriteKey`.
- Produces: exact sprite key `"npc-vasyl-tall"` for `it-vasyl`; all other characters retain their existing keys; NPC sprites use `.setOrigin(0.5, 1)`.

- [ ] **Step 1: Write failing character metadata tests**

Update `CharacterDefinition` and test expectations:

```ts
it("assigns Vasyl the dedicated tall sprite", () => {
  const vasyl = CHARACTERS.find((character) => character.id === "it-vasyl");
  expect(vasyl?.spriteKey).toBe("npc-vasyl-tall");
  expect(CHARACTERS.filter((character) => character.id !== "it-vasyl"))
    .not.toContainEqual(expect.objectContaining({ spriteKey: "npc-vasyl-tall" }));
});
```

- [ ] **Step 2: Run the character test and verify it fails**

Run: `npm test -- tests/characters.test.ts`

Expected: FAIL because character definitions do not contain `spriteKey`.

- [ ] **Step 3: Add sprite metadata and generate the tall texture**

Add `spriteKey: string` to `CharacterDefinition` and assign explicit keys:

```ts
{ id: "it-vasyl", spriteKey: "npc-vasyl-tall", /* existing fields */ }
```

Assign the existing keys to the other four definitions. Replace the index-based `npcColors` lookup in `FactoryScene` with `character.spriteKey`.

Generate `"npc-vasyl-tall"` at `16 × 32` pixels with the same head width as other NPCs, a longer green torso, and longer legs. Keep the standard sprites at `16 × 20`. When creating every NPC:

```ts
this.add.sprite(point.x, point.y, character.spriteKey)
  .setOrigin(0.5, 1)
  .setDepth(20);
```

Because map NPC points now represent feet, adjust the visual placement of standard sprites only through the shared origin, not through per-character coordinate offsets.

- [ ] **Step 4: Run character tests and build**

Run:

```powershell
npm test -- tests/characters.test.ts
npm run build
```

Expected: tests PASS and the generated tall texture compiles without missing texture keys.

- [ ] **Step 5: Commit Vasyl's sprite**

```powershell
git add src/game/characters.ts src/game/FactoryScene.ts tests/characters.test.ts
git commit -m "feat: make Vasyl visibly taller"
```

### Task 6: Update Player Documentation and Complete Release Verification

**Files:**
- Modify: `README.md`
- Verify: all changed source, generated assets, and tests.

**Interfaces:**
- Consumes: completed map, sign, proximity-dialogue, and sprite behavior.
- Produces: accurate player and map-authoring documentation.

- [ ] **Step 1: Update controls and map documentation**

Replace the interaction controls with:

```markdown
- Move with `W`, `A`, `S`, and `D`, or the arrow keys.
- Walk close to a character to see their phrase automatically.
- Walk away to close the dialogue.
```

Update the map-editing paragraph so required object layers are `collisions`, `spawn`, `npcs`, and `signs`, and document that every sign stores its visible copy in a string property named `text`.

- [ ] **Step 2: Run the complete verification suite**

Run:

```powershell
npm test
npm run build
npm run test:browser
git diff --check
git status --short
```

Expected: all unit/document/map tests PASS, TypeScript and Vite build PASS, Playwright production smoke PASS, `git diff --check` prints no errors, and status contains only the intended README change before the final commit.

- [ ] **Step 3: Perform visual browser verification**

Start `npm run dev`, open the game, and confirm:

1. **Блядер** is prominent at the starting entrance.
2. **KPP** is the first unavoidable location.
3. The guard is visible in KPP but does not block the player.
4. **IT**, **Відділ змін**, **QM**, and **Склад швейного цеху** are readable at their doors.
5. Dialogue appears without `E`, remains visible while near, and closes after walking away.
6. Movement continues while dialogue is visible.
7. Vasyl is clearly taller than every other character and stands on the same foot line.

- [ ] **Step 4: Commit documentation**

```powershell
git add README.md
git commit -m "docs: explain proximity dialogue and map signs"
```

- [ ] **Step 5: Confirm a clean final state**

Run:

```powershell
git status --short
git log -6 --oneline
```

Expected: no uncommitted files and six focused implementation commits listed above.
