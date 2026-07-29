# Mobile Touch Controls Design

## Goal

Make the factory game fully playable on a phone without changing the existing desktop controls or automatic proximity dialogue.

## Touch Controls

Touch-capable devices show a translucent virtual joystick in the lower-left corner above the Phaser canvas. Devices without touch capability do not show the control.

The player can place a finger anywhere inside the joystick and drag in any direction. Direction comes from the vector between the joystick center and the active touch point. Distance from the center controls speed from zero to full movement speed, with the knob clamped to the joystick radius.

Only the pointer that started the joystick gesture controls it. Releasing that pointer or receiving `pointercancel` immediately resets the joystick vector to zero and returns the knob to the center.

The joystick consumes its own touch gestures so dragging it does not scroll, select, zoom, or otherwise manipulate the page.

## Input Integration

The joystick exposes a normalized movement vector with each component in the range `-1` to `1`. The Phaser scene combines it with the existing keyboard vector.

When keyboard and touch input are both active, the input with the greater vector magnitude controls movement. This prevents two simultaneous inputs from creating movement faster than the existing maximum speed. Desktop keyboard controls remain unchanged.

Automatic proximity dialogue remains unchanged. Mobile play does not add an interaction button.

## Responsive Layout

The existing `960 × 540` game canvas continues using Phaser's `FIT` scaling and remains fully visible within the available viewport.

The page accounts for mobile safe-area insets when positioning the joystick. Touch controls remain clear of the browser edges and do not cover the dialogue panel.

In portrait orientation, a non-blocking overlay displays **«Поверніть телефон горизонтально»**. The game remains usable, and the message disappears automatically in landscape orientation.

The page disables overscroll and gesture zoom only for the game surface. It does not introduce a global browser restriction beyond what is required to keep gameplay stable.

## Components

### Touch movement model

A small pure TypeScript module converts a pointer position and joystick geometry into a clamped normalized movement vector. Keeping the math independent of the DOM allows precise unit testing.

### Joystick controller

A DOM controller owns the joystick elements and pointer lifecycle. It detects touch capability, tracks the active pointer, updates the visible knob, exposes the current normalized vector, and provides cleanup for tests or game teardown.

### Scene integration

The game entry point creates the controller and passes its movement source into the Phaser game configuration. `FactoryScene` reads the touch vector each frame and selects the stronger of keyboard and touch movement.

### Mobile presentation

HTML supplies the joystick and orientation-hint elements. CSS controls touch-only visibility, safe-area positioning, pixel-game scaling, portrait messaging, and gesture behavior.

## Error Handling

If touch controls cannot initialize, the game still starts with keyboard controls and reports the initialization error to the console. Pointer release and cancellation always clear movement so the player cannot remain stuck walking.

The controller ignores secondary pointers while one joystick gesture is active.

## Verification

Automated tests will verify:

- joystick vectors at the center, cardinal directions, diagonals, and beyond the radius;
- pointer down, move, up, cancel, and secondary-pointer behavior;
- touch controls remain hidden without touch capability;
- stronger-input selection never exceeds normalized speed;
- existing keyboard movement, proximity dialogue, persistence, map, build, and browser tests still pass;
- the production page includes the joystick and orientation hint;
- touch gestures on the joystick prevent default browser behavior.

Browser verification will confirm:

- the joystick appears on a phone-sized touch viewport and is absent in desktop mode;
- dragging the joystick moves the player and releasing it stops movement;
- the canvas remains visible and the controls respect safe areas;
- the portrait hint appears without blocking gameplay and disappears in landscape;
- automatic dialogue still opens and closes while moving with touch.
