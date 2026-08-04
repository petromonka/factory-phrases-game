# Parking Level Design

## Goal

Add a second playable level outside the factory: a parking area with Dimon beside a light-blue car and Yura at a tent-style warehouse. The level ends through Yura's conversation and restarts the game from the KPP.

## Scene and Map

The parking level is a separate Phaser scene with its own generated Tiled map. Separating it from the factory keeps collision geometry, NPC state, camera setup, and teardown independent.

The map contains:

- a readable parking surface with marked spaces or lanes;
- a light-blue car with Dimon standing beside it;
- a tent-style warehouse in one corner;
- Yura standing at the tent entrance;
- collision geometry around the car, tent walls, and map boundaries;
- walkable routes from player spawn to both characters.

The player enters near the factory-side edge of the parking lot. Keyboard controls and the mobile joystick work exactly as on the factory level. Nearby characters show `E — поговорити`, and the mobile interaction button performs the same action.

## Dimon Sequence

Dimon is available immediately. His conversation contains one exact line:

1. **Дімон:** «Не міган канєшно, але піде»

After the player advances past the final line, Dimon walks to or visually enters the car. The car then drives smoothly along a collision-free route beyond the map boundary and disappears. Player movement resumes during the departure animation.

The sequence runs only once per parking visit. Repeated `E` presses cannot spawn another Dimon or car animation. The moving car is not allowed to trap or push the player.

## Yura Sequence and Restart

Yura is available immediately, independently of whether the Dimon sequence has occurred. He stands at the entrance to the tent warehouse.

His exact conversation is:

1. **Юра:** «Щось в мене цееееейво гальмує інтеееернееет в палатці. Гляньте до того хлопці коли буууудете мали час»
2. **Я:** «Зараз будем сі дивили.»
3. **Юра:** «Щееее ееее катридж маєте ?»
4. **Я:** «Глянемо Юр.»

Each `E` advances one line. After the fourth line, the next `E` restarts the complete game:

- the parking scene stops;
- the factory scene starts at the KPP spawn;
- collectible progress returns to `0/5`;
- the controller-completion flag resets;
- all random controller dialogue state resets;
- the parking level returns to its initial state for a future visit.

There is no `localStorage` write during restart.

## Scene State and Cleanup

The parking scene owns Dimon's availability, car departure state, Yura's conversation, and parking NPC sprites. Each new parking entry initializes a fresh state.

Scene shutdown removes timers, tweens, pointer state, and references to parking objects. Restart is a deliberate game-session reset, not a page reload.

## Rendering

The car is approximately light blue and visually distinct from the gray factory floor. The tent warehouse reads as temporary storage through fabric walls, a visible entrance, and stored boxes or supplies without blocking Yura.

Dimon and Yura use distinct character sprites and remain foot-anchored. World-space signs may label the warehouse if needed for readability, but no extra dialogue or progression requirement is introduced.

## Error Handling

Missing parking map layers, spawn, Dimon, Yura, car, or tent collision data use the existing fatal-error presentation with a parking-specific message.

If the car departure route cannot run, the dialogue still completes and the car is safely hidden rather than leaving the scene stuck. Repeated restart input is guarded so only one factory scene start occurs.

## Verification

Automated tests will verify:

- the parking map contains required layers, reachable spawn, Dimon, Yura, car, and tent;
- both characters are available immediately;
- Dimon's exact line appears through `E` interaction;
- finishing Dimon's conversation triggers one car departure only;
- the car is light blue, follows its route, and disappears;
- Yura's exact four lines advance one at a time;
- the extra `E` after Yura's final line restarts at the factory KPP;
- restart resets all collectible, controller, random-dialogue, and parking state;
- no restart or level transition uses `localStorage`;
- keyboard, mobile joystick, and mobile interaction controls work on both scenes;
- existing factory, sewing-line, build, and browser coverage remains green.

Browser verification will cover the complete path from a test-ready unlocked factory exit to parking, Dimon's departure, Yura's restart, and the new `0/5` factory state.
