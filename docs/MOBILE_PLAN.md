# Mobile polish plan (5.5)

From a full playthrough on a phone held sideways (844 x 390, touch only): the title, the tutorial from the deck to
the first sale, the shop, the inventory, the quest board, the sub and its tank room, deep water at 650 and 900 m,
running out of air. Every message shown was logged with its time.

## What looks generated, unclear or unfinished

| # | Where | What is wrong | What it becomes |
|---|-------|---------------|-----------------|
| 1 | Touch buttons | Flat white icon-font silhouettes on grey see-through discs: they read as a phone's stock icon set, not as part of this game's olive-and-brass boat | Each button a small fitting of the boat: a turned brass bezel with four screws, a dark enamel face with a soft top light, the symbol engraved in cream with a cut shadow. The main button a larger gauge-style bezel. Drawn once into a picture and reused (no cost per frame) |
| 2 | Observe | Observing hides inside the "hand" button (it turns into an eye only sometimes); in the tutorial a separate grey card saying "Observe" appears in the middle of the screen while the real button is greyed out | A dedicated observe button (an eye) that rises in beside the net button when an animal you have not observed is in reach, and sinks away when none is. The hand is only for things you pick up, board or open |
| 3 | Tutorial | On touch it outlines a rectangle over the button with an arrow, or shows its own card in the middle | The button it wants is ringed on the HUD itself with a pulsing brass ring (two rings breathing outward), the words under the quest line; no cards in the middle for steps a button can do |
| 4 | Clutter | Up to six small buttons on the left at all times, most greyed out (lure, glow stick, pet, spare air when you have none) | A button shows only when it can be used: lure, glow stick, spare air only with one in the bag; the pet only with a pet |
| 5 | Clutter | The hand button is always on screen, greyed when there is nothing to do | It shows when there is something in reach and fades out otherwise |
| 6 | Messages | Netting a fish says its name, then "The compass jellyfish is stressed" at once (the bag's coloured dot already says so) | No "stressed" message: the bag dot shows it. Warnings stay for pressure and dying |
| 7 | Messages | "Out of air: surface!" is still on screen after the death, back on deck | Messages are cleared when a dive ends |
| 8 | Messages | "Air critical: surface" and "Out of air: surface!" within four seconds, as well as the red air bar | Kept (they are real danger), but the second replaces the first instead of stacking |

## How each is done

1. **Button art** (`js/glyphs.js`, `js/hud.js`): a `drawToken()` that paints bezel, screws, enamel and highlight
   into an offscreen canvas per size and state (normal, pressed, off, lit), cached by key; the symbol engraved on top
   (a dark cut line under a cream face). `plate()` and the big button use it. Symbols redrawn with a heavier, hand-cut
   stroke in the same 24-unit grid.
2. **Observe button** (`js/main.js`, `js/hud.js`): `observeTarget()` = the nearest animal in reach not yet in the
   journal; the HUD gets a key `'obs'` beside the net button (its own place, so nothing shifts), shown with a rise and
   fade; pressing it calls `interact()` on that animal. The hand button skips creatures that the eye handles.
3. **Pulsing ring** (`js/hud.js`, `js/tutspot.js`): the tutorial sets `hud.tutKey` to the key it wants; the HUD draws two
   brass rings breathing out from that button. On touch the tutorial's middle cards for observe and leave-the-sub are
   replaced by the ring on the button.
4. **Fewer buttons** (`js/hud.js`): the left column filters to what can be used now.
5. **Hand fades** (`js/hud.js`): drawn with an eased alpha when there is a target, not drawn (no hit area) without one.
6. **Messages** (`js/main.js`): the `stressed` toast dropped; `die()` clears the message line; the out-of-air message
   takes the place of the air-critical one.

## Checks after

Phone playthrough again with screenshots (tutorial on, by touch), the cover test (nothing over any button), the
desktop smoke test, and frame times on the phone.

## Done (5.5.0)

All eight, plus what turned up while doing them:

- 1 Button art: `js/tokens.js` (brass bezels, screws, enamel, porthole ring for the main button), cream engraved
  symbols; the stick restyled to match (brass ring, turned brass knob)
- 2 Observe: its own eye button (key `obs`); the hand shows only for things to take, board or open
- 3 Tutorial on touch: the HUD rings its own button, pulsing; observe and swing-the-net steps say which button
  ("Tap the eye to observe it", "Tap the net to swing it"); the middle cards are gone where a button does the step
- 4 / 5 Buttons that cannot be used are not shown; the lamp moved to the column so the ring by the net keeps three
  places (observe, hand, sub); in the sub, the tool slots (unusable there) are not drawn on a phone
- 6 / 7 No "stressed" message; a new dive starts with a clear message line
- 8 Already handled: air messages share a topic, so the second replaces the first
