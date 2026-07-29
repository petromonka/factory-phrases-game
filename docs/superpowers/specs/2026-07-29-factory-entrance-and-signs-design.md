# Factory Entrance and Room Signs Design

## Goal

Make the factory entrance read as a believable sequence: the player first sees the factory identity, then passes through the security checkpoint, and only afterward reaches the factory interior. Every office or destination room must be clearly identified by a sign.

## Entrance Flow

The player starts outside the factory-facing entrance near a prominent sign reading **«Блядер»**.

From the spawn point, the only route into the factory passes through the security checkpoint. The checkpoint is the first interior location on the route and contains the security guard. The guard does not physically block the player, and talking to the guard is optional. Map walls and entrances, rather than invisible gameplay rules, make the checkpoint impossible to bypass.

After crossing the checkpoint, the player enters the shared factory area and can freely visit the other rooms.

## Signs

Signs are world-space objects attached to the map, so they move naturally with the camera. They remain legible at the game's normal zoom and do not overlap doors, characters, or the heads-up display.

The entrance and rooms use these exact labels:

- **Блядер** — main factory entrance sign
- **KPP** — security checkpoint
- **IT** — IT office
- **Відділ змін** — shifts department
- **QM** — QM office
- **Склад швейного цеху** — sewing workshop storage

Each room sign is positioned immediately above or beside its doorway so the room is identifiable before the player enters it.

## Implementation Boundaries

The existing Phaser scene remains responsible for loading the Tiled map and rendering gameplay. The map geometry, player spawn, and security NPC position will be adjusted to establish the entrance sequence.

A dedicated map object layer will define sign text and positions. The scene will read that layer and render consistent world-space text labels. Keeping sign content in the map avoids hard-coded coordinates in scene logic and makes future room renaming or repositioning straightforward.

No conversation gate, locked door, access-card system, or new progression requirement will be added.

## Error Handling

The sign layer is required because signs are part of the requested navigation experience. If it is missing, scene creation fails through the existing fatal-error path rather than silently presenting an unlabeled map. Individual malformed sign objects without text or coordinates are skipped with a console error so one bad sign does not prevent the game from loading.

## Verification

Automated tests will verify:

- the map contains the sign layer and every required exact label;
- the spawn and collision layout provide no route into the factory that bypasses the checkpoint;
- the security NPC is located inside the checkpoint;
- the scene renders map-defined signs in world space;
- existing movement, interaction, progress, build, and browser smoke tests still pass.

A browser check will confirm that **«Блядер»** is visible at the entrance, **KPP** is the first destination, every room sign is readable, and the player can walk through the checkpoint without speaking to the guard.
