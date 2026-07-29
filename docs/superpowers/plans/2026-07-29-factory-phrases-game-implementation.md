# Factory Phrases Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a small top-down pixel-art browser game in which the player explores five factory offices and discovers five employee phrases.

**Architecture:** A single Phaser scene owns rendering, collision, input, and camera behavior. Pure TypeScript modules own character data, interaction selection, and persistent phrase progress so they can be tested without a browser; the Phaser scene adapts those modules to game objects and UI.

**Tech Stack:** TypeScript, Vite, Phaser, Vitest, Tiled JSON, GitHub Actions, GitHub Pages

## Global Constraints

- The game is desktop-browser-first and supports `WASD` and arrow keys.
- The map is one continuous top-down cutaway containing five visible office zones connected by a corridor.
- The exact five character names and phrases in the approved design are preserved.
- The only objective is discovering all five phrases; there is no combat, inventory, quest system, account, server, multiplayer, voice acting, or music.
- Progress is stored in `localStorage`, with an in-memory fallback when storage is unavailable.
- Interaction uses `E`; an open dialogue closes with `E`, `Space`, or a pointer click.
- Mobile and touch movement controls are out of scope.
- The production build must run beneath a GitHub Pages repository subpath.

## File Structure

- `package.json` — scripts and dependencies.
- `vite.config.ts` — Vite, Vitest, and GitHub Pages base-path configuration.
- `src/main.ts` — browser entry point and Phaser boot.
- `src/game/config.ts` — Phaser configuration and scene registration.
- `src/game/FactoryScene.ts` — game object creation, camera, collision, interaction, and UI adaptation.
- `src/game/characters.ts` — immutable five-character content and types.
- `src/game/progress.ts` — progress parsing, update logic, completion detection, and storage adapter.
- `src/game/interaction.ts` — pure nearest-character selection.
- `src/game/movement.ts` — pure direction normalization.
- `src/game/errorScreen.ts` — readable fatal-loading-error fallback.
- `src/style.css` — page shell and pixel-font fallbacks.
- `public/assets/maps/factory.json` — Tiled-compatible object map for rooms, walls, furniture, spawn, and NPC positions.
- `tests/characters.test.ts` — exact content contract.
- `tests/progress.test.ts` — unique discovery, persistence parsing, and completion.
- `tests/interaction.test.ts` — target selection and distance boundary.
- `tests/movement.test.ts` — keyboard direction normalization.
- `tests/map.test.ts` — required Tiled layers and object identifiers.
- `tests/build.test.ts` — production asset-path smoke test.
- `.github/workflows/deploy-pages.yml` — test, build, artifact upload, and Pages deployment.
- `README.md` — setup, controls, content editing, and deployment instructions.

---

### Task 1: Scaffold a Testable Vite and Phaser Application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/game/config.ts`
- Create: `src/style.css`
- Create: `.gitignore`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: `createGameConfig(parent: string): Phaser.Types.Core.GameConfig`
- Produces: npm scripts `dev`, `test`, `build`, and `preview`

- [ ] **Step 1: Add the initial failing configuration test**

```ts
// tests/smoke.test.ts
import { describe, expect, it } from "vitest";
import { createGameConfig } from "../src/game/config";

describe("createGameConfig", () => {
  it("uses a 16:9 pixel-art canvas and Arcade physics", () => {
    const config = createGameConfig("game");
    expect(config.width).toBe(960);
    expect(config.height).toBe(540);
    expect(config.pixelArt).toBe(true);
    expect(config.physics).toMatchObject({ default: "arcade" });
  });
});
```

- [ ] **Step 2: Create the project manifest and install dependencies**

```json
{
  "name": "factory-phrases-game",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "vitest run",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

Run: `npm install`

- [ ] **Step 3: Run the test and confirm the module is missing**

Run: `npm test -- tests/smoke.test.ts`

Expected: FAIL because `src/game/config.ts` does not exist.

- [ ] **Step 4: Implement the minimum boot configuration**

```ts
// src/game/config.ts
import Phaser from "phaser";

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#1d2420",
    pixelArt: true,
    physics: { default: "arcade", arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: []
  };
}
```

```ts
// src/main.ts
import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import "./style.css";

new Phaser.Game(createGameConfig("game"));
```

Create `index.html` with a single `<main id="game"></main>`, create a strict `tsconfig.json`, configure `vite.config.ts` with `base: process.env.GITHUB_ACTIONS ? "/factory-phrases-game/" : "/"`, and add a dark full-viewport centered canvas style.

- [ ] **Step 5: Verify test and build**

Run: `npm test -- tests/smoke.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: `dist/index.html` and hashed JavaScript assets are created.

- [ ] **Step 6: Commit the scaffold**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src tests .gitignore
git commit -m "chore: scaffold Phaser TypeScript game"
```

---

### Task 2: Lock the Five Characters and Phrase Progress

**Files:**
- Create: `src/game/characters.ts`
- Create: `src/game/progress.ts`
- Test: `tests/characters.test.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Produces: `CharacterDefinition`
- Produces: `CHARACTERS: readonly CharacterDefinition[]`
- Produces: `parseProgress(raw: string | null): ReadonlySet<string>`
- Produces: `discover(progress: ReadonlySet<string>, characterId: string): ReadonlySet<string>`
- Produces: `isComplete(progress: ReadonlySet<string>): boolean`
- Produces: `ProgressStore.load(): ReadonlySet<string>` and `ProgressStore.save(progress): void`

- [ ] **Step 1: Write failing content and progress tests**

```ts
// tests/characters.test.ts
import { expect, it } from "vitest";
import { CHARACTERS } from "../src/game/characters";

it("contains the five approved characters and exact phrases", () => {
  expect(CHARACTERS).toEqual([
    { id: "security-serhii", name: "Охоронець Сергій", room: "Прохідна", phrase: "Він мені одразу не понравився", objectId: "npc-security" },
    { id: "it-vasyl", name: "Василь", room: "Кабінет ІТ", phrase: "Діми нема — поїхав кудись і казав, зараз буде", objectId: "npc-it" },
    { id: "shifts-serhii", name: "Сергій", room: "Відділ змін", phrase: "Поставте нам, будь ласка, філєр і EASY DMS", objectId: "npc-shifts" },
    { id: "qm-olena", name: "Олена", room: "Кабінет QM", phrase: "Я як той пес — хитаю головою і все розумію, але сказати не можу ніц на англійській", objectId: "npc-qm" },
    { id: "sewing-sasha", name: "Саша", room: "Склад швейного цеху", phrase: "Тут трапилася халепа — маніпулятор типу мишка маєте?", objectId: "npc-sewing" }
  ]);
});
```

```ts
// tests/progress.test.ts
import { expect, it } from "vitest";
import { discover, isComplete, parseProgress } from "../src/game/progress";

it("counts each character only once", () => {
  const once = discover(new Set(), "security-serhii");
  expect(discover(once, "security-serhii").size).toBe(1);
});

it("rejects malformed stored progress", () => {
  expect([...parseProgress("{broken")]).toEqual([]);
});

it("completes after all five known ids", () => {
  const ids = ["security-serhii", "it-vasyl", "shifts-serhii", "qm-olena", "sewing-sasha"];
  expect(isComplete(new Set(ids))).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/characters.test.ts tests/progress.test.ts`

Expected: FAIL because both source modules are missing.

- [ ] **Step 3: Implement immutable content and defensive progress parsing**

Define `CharacterDefinition` with `id`, `name`, `room`, `phrase`, and `objectId` string fields. Export the exact array from the test with `as const satisfies readonly CharacterDefinition[]`.

Implement `parseProgress` by JSON-parsing an array, filtering values against `new Set(CHARACTERS.map(character => character.id))`, and returning an empty set after any exception. Implement `discover` as a copied set, and implement `isComplete` by checking all five known ids.

Implement `ProgressStore` around a `Storage | undefined` constructor argument and key `"factory-phrases-progress-v1"`. `load()` calls `parseProgress`; `save()` catches storage errors so private-mode or blocked storage never stops the game.

- [ ] **Step 4: Verify focused and full tests**

Run: `npm test -- tests/characters.test.ts tests/progress.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit character content and progress**

```bash
git add src/game/characters.ts src/game/progress.ts tests/characters.test.ts tests/progress.test.ts
git commit -m "feat: add factory characters and phrase progress"
```

---

### Task 3: Implement Testable Movement and Interaction Rules

**Files:**
- Create: `src/game/movement.ts`
- Create: `src/game/interaction.ts`
- Test: `tests/movement.test.ts`
- Test: `tests/interaction.test.ts`

**Interfaces:**
- Produces: `movementVector(input: MovementInput): { x: number; y: number }`
- Produces: `nearestInteractable(origin, candidates, maxDistance): InteractionCandidate | undefined`
- Consumes later: `FactoryScene` multiplies the normalized vector by `160` pixels per second.

- [ ] **Step 1: Write failing rule tests**

```ts
// tests/movement.test.ts
import { expect, it } from "vitest";
import { movementVector } from "../src/game/movement";

it("normalizes diagonal movement", () => {
  const result = movementVector({ left: false, right: true, up: true, down: false });
  expect(Math.hypot(result.x, result.y)).toBeCloseTo(1);
  expect(result.x).toBeGreaterThan(0);
  expect(result.y).toBeLessThan(0);
});
```

```ts
// tests/interaction.test.ts
import { expect, it } from "vitest";
import { nearestInteractable } from "../src/game/interaction";

it("returns the nearest candidate inside the interaction radius", () => {
  const result = nearestInteractable(
    { x: 0, y: 0 },
    [{ id: "far", x: 90, y: 0 }, { id: "near", x: 20, y: 0 }],
    64
  );
  expect(result?.id).toBe("near");
});

it("returns undefined when every candidate is outside the radius", () => {
  expect(nearestInteractable({ x: 0, y: 0 }, [{ id: "far", x: 65, y: 0 }], 64)).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/movement.test.ts tests/interaction.test.ts`

Expected: FAIL because the modules are missing.

- [ ] **Step 3: Implement the pure rules**

`movementVector` subtracts opposing inputs for each axis and divides non-zero vectors by `Math.hypot(x, y)`. `nearestInteractable` computes squared Euclidean distance, filters candidates whose distance is at most `maxDistance`, sorts by distance, and returns the nearest candidate without mutating the input.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/movement.test.ts tests/interaction.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit movement and interaction rules**

```bash
git add src/game/movement.ts src/game/interaction.ts tests/movement.test.ts tests/interaction.test.ts
git commit -m "feat: add movement and interaction rules"
```

---

### Task 4: Build and Validate the Tiled Factory Map

**Files:**
- Create: `public/assets/maps/factory.json`
- Create: `public/assets/tiles/factory-tiles.png`
- Create: `scripts/generate-factory-tiles.mjs`
- Test: `tests/map.test.ts`

**Interfaces:**
- Produces Tiled object layers: `collisions`, `spawn`, and `npcs`
- Produces required objects: `player-spawn`, `npc-security`, `npc-it`, `npc-shifts`, `npc-qm`, `npc-sewing`
- Consumed by: `FactoryScene`

- [ ] **Step 1: Write the failing map contract test**

```ts
// tests/map.test.ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("contains required layers and game objects", () => {
  const map = JSON.parse(readFileSync("public/assets/maps/factory.json", "utf8"));
  const layers = new Map(map.layers.map((layer: { name: string; objects?: { name: string }[] }) => [layer.name, layer]));
  expect([...layers.keys()]).toEqual(expect.arrayContaining(["floor", "walls", "furniture", "collisions", "spawn", "npcs"]));
  expect(layers.get("spawn").objects.map((object: { name: string }) => object.name)).toContain("player-spawn");
  expect(layers.get("npcs").objects.map((object: { name: string }) => object.name).sort()).toEqual(
    ["npc-it", "npc-qm", "npc-security", "npc-sewing", "npc-shifts"].sort()
  );
  expect(layers.get("collisions").objects.length).toBeGreaterThan(10);
});
```

- [ ] **Step 2: Run the test to verify the map is absent**

Run: `npm test -- tests/map.test.ts`

Expected: FAIL with `ENOENT` for `factory.json`.

- [ ] **Step 3: Generate a small original pixel tilesheet**

Add `pngjs` as a development dependency. Implement `scripts/generate-factory-tiles.mjs` to create a 16×16-pixel tile sheet containing original flat-color floor, wall, doorway, desk, computer, cabinet, box, thread, and factory-machine tiles. Use a fixed palette and nearest-neighbor pixels; do not copy copyrighted game art.

Run: `node scripts/generate-factory-tiles.mjs`

Expected: `public/assets/tiles/factory-tiles.png` is created.

- [ ] **Step 4: Create the Tiled-compatible JSON map**

Create a 60×34 map using 16×16 tiles. Arrange the gatehouse and IT office on the left, the shifts/QM/sewing offices along the upper corridor, the entry at lower-left, and a decorative production area below. Add rectangle objects around outer walls and furniture, keep every door at least 32 pixels wide, and place the six named spawn/NPC point objects required by the contract test.

- [ ] **Step 5: Validate the map**

Run: `npm test -- tests/map.test.ts`

Expected: PASS.

Open `factory.json` in Tiled and confirm all rooms are reachable from `player-spawn` and no collision rectangle covers a doorway.

- [ ] **Step 6: Commit map and generated art**

```bash
git add public/assets/maps/factory.json public/assets/tiles/factory-tiles.png scripts/generate-factory-tiles.mjs package.json package-lock.json tests/map.test.ts
git commit -m "feat: add top-down factory office map"
```

---

### Task 5: Integrate the Playable Phaser Scene and Dialogue UI

**Files:**
- Create: `src/game/FactoryScene.ts`
- Create: `src/game/errorScreen.ts`
- Modify: `src/game/config.ts`
- Modify: `src/style.css`
- Test: `tests/errorScreen.test.ts`

**Interfaces:**
- Consumes: `CHARACTERS`, `ProgressStore`, `movementVector`, `nearestInteractable`
- Produces: `FactoryScene extends Phaser.Scene`
- Produces: `renderFatalError(container: HTMLElement, message: string): void`

- [ ] **Step 1: Write a failing readable-error test**

```ts
// tests/errorScreen.test.ts
import { expect, it } from "vitest";
import { renderFatalError } from "../src/game/errorScreen";

it("replaces the game container with a readable error", () => {
  const container = document.createElement("main");
  renderFatalError(container, "Не вдалося завантажити карту.");
  expect(container.getAttribute("role")).toBe("alert");
  expect(container.textContent).toContain("Не вдалося завантажити карту.");
});
```

Configure this test to use Vitest's `jsdom` environment.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npm test -- tests/errorScreen.test.ts`

Expected: FAIL because `errorScreen.ts` is missing.

- [ ] **Step 3: Implement the error renderer**

Set `role="alert"`, replace children with a heading `Гру не вдалося запустити` and the supplied message, and apply a `fatal-error` class styled in `src/style.css`.

- [ ] **Step 4: Implement `FactoryScene`**

In `preload()`, load `factory.json` and `factory-tiles.png`, and attach loader error handling. In `create()`:

- build the tilemap and visible layers;
- create invisible static Arcade bodies for every `collisions` rectangle;
- spawn the player at `player-spawn` using a generated four-direction pixel texture;
- spawn five distinguishable NPC sprites at their named points;
- create cursor and `WASD` keys plus `E` and `Space`;
- create fixed-camera text for `Фрази: N/5`, the `E — поговорити` prompt, dialogue name/body, and completion message;
- configure the camera to follow the player and stay inside the 960×544 map bounds.

In `update()`:

- set velocity to zero while dialogue is open;
- otherwise apply `movementVector(...) * 160`;
- select the nearest NPC within 64 pixels;
- show the prompt only when a target exists;
- debounce `E` with `Phaser.Input.Keyboard.JustDown`;
- on first dialogue open, call `discover`, save progress, and update the counter;
- close dialogue with `E`, `Space`, or `pointerdown`;
- show `Зміну завершено. Усі важливі питання вирішено` once when progress first reaches five.

Update `createGameConfig` to register `[FactoryScene]`.

- [ ] **Step 5: Add the DOM test runtime and verify automated behavior**

Run: `npm install -D jsdom`

Run: `npm test`

Expected: all unit and contract tests PASS.

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 6: Perform the manual playthrough**

Run: `npm run dev`

Verify both movement schemes, diagonal speed, all collision boundaries, all five exact dialogues, `0/5` through `5/5`, repeat dialogue behavior, the completion message, and progress restoration after reload. Temporarily rename the map during a local run and verify the readable fatal error appears, then restore it.

- [ ] **Step 7: Commit the playable game**

```bash
git add src/game/FactoryScene.ts src/game/errorScreen.ts src/game/config.ts src/style.css tests/errorScreen.test.ts vite.config.ts
git commit -m "feat: add playable factory phrase exploration"
```

---

### Task 6: Add Documentation and GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Create: `README.md`
- Create: `tests/build.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: npm scripts `test` and `build`
- Produces: deployable `dist/` artifact at `/factory-phrases-game/`

- [ ] **Step 1: Write the failing build-path smoke test**

```ts
// tests/build.test.ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("uses the repository subpath in GitHub Actions", () => {
  const source = readFileSync("vite.config.ts", "utf8");
  expect(source).toContain('"/factory-phrases-game/"');
  expect(source).toContain("GITHUB_ACTIONS");
});
```

- [ ] **Step 2: Run the test and verify the intended failure if configuration is incomplete**

Run: `npm test -- tests/build.test.ts`

Expected: FAIL until the repository base-path branch exists in `vite.config.ts`.

- [ ] **Step 3: Complete Vite base-path configuration**

Export `defineConfig({ base: process.env.GITHUB_ACTIONS ? "/factory-phrases-game/" : "/", test: { environmentMatchGlobs: [["tests/errorScreen.test.ts", "jsdom"]] } })`.

- [ ] **Step 4: Add the Pages workflow**

Create a workflow triggered by pushes to `main` and manual dispatch. Give it `contents: read`, `pages: write`, and `id-token: write`; use Node 24, `npm ci`, `npm test`, `npm run build`, `actions/configure-pages`, `actions/upload-pages-artifact` with `dist`, and `actions/deploy-pages` in a deployment job using the `github-pages` environment.

- [ ] **Step 5: Document usage and content editing**

In `README.md`, document Node 24+, `npm install`, `npm run dev`, controls, the five-room objective, how to edit `src/game/characters.ts`, how to edit the map in Tiled, local build/preview commands, and the repository Settings → Pages → GitHub Actions activation step.

- [ ] **Step 6: Run the complete release verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: build succeeds and `dist/index.html` refers to `/factory-phrases-game/assets/...`.

Run: `npm run preview`

Expected: the complete five-character playthrough works from the production build.

- [ ] **Step 7: Commit deployment and documentation**

```bash
git add .github/workflows/deploy-pages.yml README.md tests/build.test.ts vite.config.ts
git commit -m "ci: deploy factory game to GitHub Pages"
```
