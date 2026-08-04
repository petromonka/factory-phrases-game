# Parking And Mobile Polish Design

## Goal

Polish the current interactive-dialogues PR so players clearly understand where to exit, what to press to talk, and so the parking scene and mobile layout feel intentional instead of rough or cropped.

## Factory Exit Door

The factory exit becomes visually obvious only after the parking unlock conditions are met. When all five collectible conversations and at least one controller request are complete, a visible door or gate appears at the factory exit point with a small readable `Парковка` sign.

Before unlock, the exit does not draw attention. After unlock, approaching the door shows a clearer prompt instead of the current terse wording.

## Dialogue Speaker Labels

Player dialogue lines no longer show `Я` as the speaker label. When the current line speaker is `Я`, the dialogue panel displays the line text without a `Я:` heading. NPC lines still show speaker names such as `Сергій`, `Дімон`, `Юра`, or controller names.

The dialogue content itself remains unchanged unless the speaker label is the only visible change.

## Interaction Prompts

Prompts should explain the action, not only name the key.

Desktop copy:

- near a character: `Натисни E, щоб говорити`;
- while dialogue is open: `Натисни E, щоб далі`;
- near the unlocked exit: `Натисни E, щоб вийти на парковку`.

Mobile copy:

- the lower-right interaction button should read `Говорити` when a conversation can start;
- it should read `Далі` while dialogue is open;
- it should read `Парковка` near the unlocked exit.

The keyboard and mobile button still perform the same single edge-triggered action.

## Parking Car Fix

Dimon's light-blue car must behave as one visual object. Body, windows, wheels, and any highlights move together during departure and hide together after leaving the map. No wheel or accessory remains on the parking lot after the car drives away.

The car remains light blue and visually distinct from other parked cars.

## Parking Visual Polish

The parking scene should read as a real parking area:

- asphalt-like surface;
- marked parking lanes or bays;
- several parked cars in different muted colors;
- the tent warehouse in the corner with Yura at the entrance;
- collision around static cars and the tent, while keeping clear walkable routes to Dimon and Yura.

Decorations must not block the main route from spawn to Dimon, Yura, or the factory restart path.

## Mobile Layout

The mobile view must not feel cropped or broken.

In portrait, the game should emphasize the orientation hint so the user understands they should rotate the phone. In landscape, the canvas, dialogue panel, joystick, and interaction button should fit without important text being cut off.

The dialogue panel should use mobile-safe dimensions and avoid being hidden behind the joystick or interaction button. Touch controls should respect safe-area insets and should not overlap the central dialogue text.

## Verification

Automated and browser checks will verify:

- the unlocked factory exit draws a visible door or gate and uses the clearer exit prompt;
- `Я` is not shown as a dialogue heading;
- desktop prompts use the clearer `Натисни E...` copy;
- mobile interaction button labels update for talk, next, and parking states;
- the Dimon car is grouped so all parts move and hide together;
- the parking map includes multiple parked cars and parking markings;
- mobile browser tests cover landscape interaction and the orientation hint without cropped dialogue text;
- existing factory dialogue, parking restart, build, Pages build, and browser tests remain green.
