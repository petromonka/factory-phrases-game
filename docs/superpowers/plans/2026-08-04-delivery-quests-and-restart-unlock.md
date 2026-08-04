# Delivery Quests and Restart Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix parking unlock after restarting the game and add two delivery tasks before the next level opens.

**Architecture:** Extend `RunProgress` from phrase-only progress to objective progress. Keep delivery interactions inside `FactoryScene` using the existing proximity + E/touch interaction model, and reuse the existing parking transition as the next level.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest, Playwright.

## Global Constraints

- The counter label changes from `Фрази` to `Справи`.
- Total required objectives is exactly `8`: 5 collectible phrase NPCs, 1 first controller dialogue, mouse delivered to Олександр, scanner delivered to a sewing line controller.
- Restart from the finale must fully reset objective state and allow the parking exit to unlock again after all objectives are repeated.
- Олександр needs a mouse from IT.
- A sewing line controller needs a barcode scanner.
- Mobile keeps using the large touch button with contextual labels.

---

### Task 1: Progress model

**Files:**
- Modify: `src/game/progress.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Produces: `pickupMouse()`, `deliverMouse()`, `pickupScanner()`, `deliverScanner()`, `hasMouse`, `hasScanner`, `mouseDelivered`, `scannerDelivered`, `objectiveCount`, `objectiveTotal`.

- [ ] Add failing tests that `objectiveTotal` is `8`, delivery objectives count once, and `reset()` clears pickup/delivery state.
- [ ] Implement the new progress state and make `isParkingUnlocked()` require all four non-phrase delivery flags as appropriate.
- [ ] Run `npm.cmd test -- tests/progress.test.ts`.

### Task 2: Factory restart unlock bug

**Files:**
- Modify: `src/game/FactoryScene.ts`
- Test: `tests/interaction.test.ts`

**Interfaces:**
- Consumes: `RunProgress.isParkingUnlocked()`.
- Produces: repeatable unlock after scene restart.

- [ ] Add a failing test proving `completionShown` is reset during `create()`.
- [ ] Reset `completionShown` from the current progress snapshot in `create()` so a second run can show/open the exit again.
- [ ] Run `npm.cmd test -- tests/interaction.test.ts`.

### Task 3: Item pickup and delivery interactions

**Files:**
- Modify: `src/game/FactoryScene.ts`
- Test: `tests/interaction.test.ts`

**Interfaces:**
- Consumes: progress methods from Task 1.
- Produces: mouse and scanner item targets, prompts, inventory labels, and delivery dialogues.

- [ ] Add failing tests for mouse/scanner item creation, pickup copy, delivery copy, and `Справи` counter.
- [ ] Add simple generated textures for mouse and scanner.
- [ ] Add item targets near IT and the sewing line.
- [ ] Add delivery handling: mouse to Олександр, scanner to the first controller line.
- [ ] Keep the exit hidden until all `8/8` objectives are done.
- [ ] Run `npm.cmd test -- tests/interaction.test.ts tests/progress.test.ts`.

### Task 4: Browser flow

**Files:**
- Modify: `tests/browser/game.spec.ts`

**Interfaces:**
- Consumes: test hooks and real scene interactions.

- [ ] Update browser assertions from `Фрази: 0/6` to `Справи: 0/8`.
- [ ] Add a browser flow for picking up and delivering mouse/scanner before parking unlock.
- [ ] Run `npm.cmd run test:browser`.

### Task 5: Final verification and publish

**Files:**
- All modified files.

- [ ] Run `npm.cmd test`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd run build:pages`.
- [ ] Run `npm.cmd run build:cloudflare`.
- [ ] Commit and push to `codex/interactive-dialogues-parking`.
