# Interactive Dialogues and Session Progress Design

## Goal

Replace automatic proximity dialogue with deliberate `E` interaction, present conversations one line at a time, and keep all progression in the current page session so every reload starts the game from the beginning.

## Interaction Flow

When the player is within interaction range of a character and no dialogue is open, the interface shows **`E — поговорити`**. Proximity alone never opens a dialogue.

Pressing `E` starts the nearest character's conversation and freezes player movement. Each subsequent `E` advances by exactly one line. After the final line, one additional `E` closes the conversation and restores movement.

If multiple characters are in range, the nearest character receives the interaction. Keyboard `E` and a mobile interaction button trigger the same single action. Holding either control must not skip multiple lines.

## Conversation Model

Every dialogue line contains a speaker label and text. The dialogue panel displays one line at a time and clearly identifies whether the speaker is the player or the character.

The security guard's exact first conversation is:

1. **Я:** «Привіт, Сєрий»
2. **Сергій:** «Здоров»
3. **Я:** «Як там справи? Що скажеш на Пашу?»
4. **Сергій:** «Він мені одразу не понравився, як я тільки його побачив»

The other four collectible characters retain their existing phrase content. Their current single phrases become one-line conversations unless separately expanded later.

## Sewing-Line Controllers

Controller display names become:

- **Контролер Галина**
- **Контролер Микола**
- **Контролер Таня**
- **Контролер Іван**

Controllers also require `E` to begin speaking. Each controller conversation contains one randomly selected equipment request. A new request is selected when a new conversation starts, remains stable while that conversation is open, and may repeat a previous request by chance.

Controller conversations remain separate from the five collectible phrases. The first completed controller conversation sets a session flag used to unlock level progression.

## Session Progress

All `localStorage` persistence is removed. The current run tracks progress only in memory:

- which of the five collectible conversations have been completed;
- whether at least one controller conversation has been completed.

Reloading or reopening the page always starts at the KPP with zero collectible conversations and no controller completion flag. The counter continues to show progress out of five collectible conversations.

A collectible conversation counts as complete only after the player advances through its final line. Starting and abandoning a conversation does not complete it. A controller counts only after its request line has been completed.

## Parking Exit

The parking exit remains unavailable until both conditions are true:

- all five collectible conversations are complete;
- at least one sewing-line controller conversation is complete.

When unlocked and the player approaches the designated factory exit, the interface shows **`E — вийти на парковку`**. Pressing `E` transitions to the parking scene. It does not write persistence.

## Mobile Interaction

Touch devices receive a dedicated interaction button in the lower-right corner. It is visually distinct from the lower-left joystick, respects safe-area insets, and appears only on touch-capable devices.

The button starts conversations, advances lines, closes completed conversations, activates the parking exit, and later advances parking conversations. Pointer cancellation and release reset its pressed state. The control does not scroll or zoom the page.

## Error Handling

If the interaction button is unavailable, the game still starts and keyboard `E` remains usable. An empty conversation definition is rejected during scene setup with a precise error instead of opening a blank panel.

Changing scenes or restarting clears any open dialogue and pressed interaction state so an input cannot leak into the next level.

## Verification

Automated tests will verify:

- proximity shows a prompt but never opens dialogue;
- one `E` starts and each additional discrete `E` advances one line;
- movement freezes only while dialogue is open;
- completion occurs only after the final line;
- the guard conversation uses the exact four lines and speaker order;
- controller names are exact and requests reroll only on a new conversation;
- controller completion does not change the `/5` counter;
- reload starts with zero in-memory progress and does not read or write `localStorage`;
- the parking exit unlocks only after five collectible completions plus one controller completion;
- keyboard and mobile interaction controls share the same edge-triggered action;
- existing joystick, map, build, and desktop/mobile browser tests remain green.

