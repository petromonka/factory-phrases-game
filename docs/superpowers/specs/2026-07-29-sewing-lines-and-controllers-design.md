# Sewing Lines and End-Control Characters Design

## Goal

Make the central production floor clearly read as a sewing factory by replacing the sparse placeholder equipment with four sewing lines, each ending at a staffed final-control station.

## Production Layout

The central open factory area contains four distinct sewing lines. Each line consists of repeated sewing workstations arranged in a clear row, with a final-control station at one end.

The four lines use the currently sparse production floor without changing the signed KPP or office rooms. Walkable aisles remain between and around the lines. Collision geometry prevents the player from walking through machines while preserving routes from the checkpoint to every office, existing character, line, and final-control character.

## End-Control Characters

Each line has one dedicated character positioned beside its final-control station:

- **Контролер 1**
- **Контролер 2**
- **Контролер 3**
- **Контролер 4**

These characters are ambient production-floor NPCs. They do not count toward the main `Фрази: 0/5` discovery progress and do not change the existing completion condition.

The same proximity interaction used by existing characters applies to controllers:

- approaching a controller automatically opens dialogue;
- walking away automatically closes it;
- when multiple characters are in range, the nearest character is shown;
- movement remains active while dialogue is visible.

## Random Requests

Every time the player newly enters a controller's proximity zone, the controller chooses one request at random:

- **«Дайте, будь ласка, нову мишку»**
- **«Потрібен новий сканер»**
- **«Потрібен новий комп’ютер»**
- **«Дайте, будь ласка, новий сенсорний екран»**

The selected request remains stable while that dialogue is open. Leaving the zone clears the active request. Re-entering selects again, and the new selection may coincidentally match the previous request because each choice is independent.

Random selection is injected behind a small function boundary so tests can choose deterministic request indexes without weakening production randomness.

## Data and Rendering

Controller definitions live separately from the five main collectible characters. Each definition contains an ID, display name, and map object ID.

The generated Tiled map gains controller points in the existing `npcs` layer or a dedicated `controllers` layer. A dedicated layer is preferred because it makes their non-collectible role explicit and lets map tests validate the four production characters independently.

The scene renders controllers with a consistent final-control worker sprite variant. Their world positions remain foot-anchored like other NPCs.

The nearest-character calculation receives both collectible characters and controllers through one shared candidate list. Once a target is selected, the scene routes collectible characters through the existing progress-aware dialogue path and controllers through the ambient random-request path.

## Error Handling

The controller map layer is required once the production layout is present. A missing layer uses the existing fatal scene error path.

If an individual controller map point is missing or malformed, the scene logs a precise error and skips that controller without preventing the remaining game from loading.

Random request selection clamps invalid injected values to a valid request index so a bad test double or unexpected random value cannot produce an empty dialogue.

## Verification

Automated tests will verify:

- the generated map contains four sewing lines and four final-control stations;
- all machine and station collision rectangles preserve walkable aisles;
- spawn can still reach every existing NPC and all four controllers;
- controller IDs, names, and map points are exact;
- controllers are excluded from main progress and completion totals;
- each deterministic random index selects the expected request;
- entering selects once, remaining nearby does not reroll, leaving closes dialogue, and re-entering selects again;
- nearest-target behavior works across collectible and ambient NPCs;
- existing map, movement, dialogue, persistence, build, desktop browser, and planned mobile tests still pass.

Visual browser verification will confirm that the open floor reads as four sewing lines, each line ends at a clearly identifiable control station, controller characters are reachable, and the new equipment does not obstruct navigation or obscure mobile controls.
