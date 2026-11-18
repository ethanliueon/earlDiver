# The studio pass (ui-studio branch)

What was changed so the game reads as designed and made rather than generated, and how to change it.

## The kit

`tools/ui_kit.py` paints every UI texture into `assets/ui/` (at twice the size shown, from a fixed seed, so the
same art comes out every run). `tools/art_kit.py` paints the weathering laid over the boat and the subs into
`assets/art/`. Edit the parameters there and re-run; nothing is hand-edited after.

| File | What it is | Used for |
| --- | --- | --- |
| panel-steel.png | olive deck paint on steel, worn at the edges, a rivet at each corner (nine-slice, 56 px slice) | the frame of every steel panel |
| steel-tile.png | the same paint, seamless | the middle of every steel panel |
| plate-brass.png | aged brass, a slotted screw at each end (nine-slice 30/44) | nameplates |
| btn-brass*.png, btn-steel*.png | stamped brass and blackened steel, normal / hover / pressed | buttons and tabs |
| paper-tile.png, paper-sheet.png | paper with fibres and foxing; a sheet with a deckled, tea-stained edge | the title's log, notes, quest slips |
| tag.png, tag-eyelet.png | a shipping tag and its twine | confirm and welcome dialogs |
| gauge.png, gauge-fill.png | a brass tube with a glass window, lamp-oil fill | the loading bar |
| tape.png | label-maker tape | (spare) |
| weather-boat.png, weather-sub.png | grime, salt bloom, weeping rust, scuffs, chipped paint | laid over the hulls (`source-atop`) |

`css/studio.css` loads after `style.css` and overrides it: one file to read, or to remove to go back.

## Type

IM Fell English for anything printed or stamped (titles, buttons, labels), EB Garamond for reading, Caveat only for
the hand-written log entries on the title. The monospace and the stencil stay on the instruments (depth counter,
air, hull, cash plate), where they belong.

## Screens

- Title: a page of the Margaret's dive log. One brass button (Continue, or Start diving), each diver a hand-written
  line, one "A new diver" line instead of three empty slots, "strike out" to delete.
- Dialogs: a shipping tag on its twine. Loading: a brass gauge. Quest line: a paper slip. Quest board: paper notices
  pinned to the steel, a coloured pencil stripe for rarity. Chart: a printed sea chart (depth tints, hatched seabed,
  ink figures, red pencil for the deepest dive). Top messages: no hairline-and-diamond ornament.

## Art

- The Margaret is drawn once into a stored picture (hull, house, mast, crane, weathering) and that is what goes on
  screen each frame, rocked; only the radar bar, the smoke and the tutorial's lit door are drawn live.
- The submersible is drawn into its own layer every frame so the weathering lies on the hull alone.
- Her name is signwritten in IM Fell; the wheelhouse windows reflect the sky instead of a stock diagonal glint.
- Kelp blades are painted at twice the size with ripples, translucent edges, scars and a worn tip.
- Earl's tank is steel painted a faded signal yellow, scuffed, instead of chrome.
