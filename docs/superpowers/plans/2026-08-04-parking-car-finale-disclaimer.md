# Parking Car Finale and Disclaimer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible fiction disclaimer and make the parking finale trigger from the player's car with a final “Робочий час з 9 до 17:30!” interruption.

**Architecture:** Keep the disclaimer in the document shell so it is present for every scene. Extend `ParkingScene` with a small final-car interaction state that becomes active after Yura’s dialogue; interacting with that car spawns a hidden NPC and opens the final work-hours dialogue before showing the existing restart finale.

**Tech Stack:** Vite, TypeScript, Phaser, Vitest, Playwright.

## Global Constraints

- Do not persist run progress to localStorage.
- Keep mobile controls below the portrait canvas.
- Keep the final restart behavior: `Натисніть R, щоб почати з початку`.
- Continue updating the existing PR branch.

---

### Task 1: Disclaimer

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Test: `tests/document.test.ts`

**Interfaces:**
- Produces: visible element `#fiction-disclaimer` with exact Ukrainian disclaimer text.

- [ ] **Step 1: Write failing test**
- [ ] **Step 2: Run document test and verify RED**
- [ ] **Step 3: Add HTML and CSS**
- [ ] **Step 4: Run document test and verify GREEN**

### Task 2: Parking final car interaction

**Files:**
- Modify: `src/game/ParkingScene.ts`
- Test: `tests/parkingScene.test.ts`
- Test: `tests/browser/game.spec.ts`

**Interfaces:**
- Produces: `readyForFinalCar` state, `findFinalCarTarget`, `startWorktimeFinale`, and `npc-worktime`.
- Behavior: Yura completion activates the car prompt instead of immediate finale; car interaction opens `Робочий час з 9 до 17:30!`; completing that line shows the existing finale/restart screen.

- [ ] **Step 1: Write failing static and browser tests**
- [ ] **Step 2: Run tests and verify RED**
- [ ] **Step 3: Implement minimal Phaser scene changes**
- [ ] **Step 4: Run targeted tests and verify GREEN**

### Task 3: Verification and publish

**Files:**
- All modified files.

- [ ] **Step 1: Run `npm.cmd test`**
- [ ] **Step 2: Run `npm.cmd run build`**
- [ ] **Step 3: Run `npm.cmd run test:browser`**
- [ ] **Step 4: Commit and push to `codex/interactive-dialogues-parking`**
