# Plan after 7.2.6: open ideas, agreed but not built

Written for whoever picks this up next (another Claude session or the owner). None of this is built yet. Each item
says how far the owner has agreed to it. Read CLAUDE.md first: its rules apply to all of these.

## 1. The tutorial's pointing hand (BUILT in 7.2.8)

Replaces the cream arrow (`#tut-spot .ts-arrow`, `aimArrow()` in js/tutspot.js). The arrow's black outline looks
different on every background (bright sky, dark cabin, the shop's pale screen).

- **What it is:** Earl's own diving glove, the same glove as on the interact button, with the index finger pointing.
  The pose sets it apart from the button's open glove and ties the tutorial to his gear, not a generic cursor.
  It is new art; there is no pointing hand in the game today.
- **Look:** bone-cream, a little darker towards its edges so it reads as a rounded, solid thing (CLAUDE.md rule 9),
  with a soft shadow under it. No outline, and no outline that changes with the background.
- **Motion:** a slow tap, pressing in and lifting about every 1.5 s. No glow, no flicker.
- **Place:** the fingertip rests at the edge of the thing and never covers it. It comes in from Earl's side (6.5.6
  rule; `aimArrow` already works out that direction from `g.earlScr`), and on a panel from the panel's middle. It
  turns to suit.
- **Meaning:** the hand always means "tap this" (HUD buttons, the ladder, the winch, the shop's links). The chevrons
  on the water stay for "go there".
- **Watch:** it must be about 1.3x the arrow's size to read as a hand. In tight places (the shop's link list, the
  bag button by the menu) check it never covers neighbouring words; come in from the roomier side if it would.
- **Check:** the tutorial at both phone sizes with `tools/tests/phone.cjs` (takes about 4 minutes; run the two sizes
  in parallel).

## 2. Shorter tutorial wording (agreed in principle; the owner sees the list before anything changes)

The lines are in `tutor()` in js/main.js. Name only the goal, in the game's words. The lit button and the hand
already say "tap here". For example:
- "Open your inventory and put on what you bought" becomes "Put on the dip net".
- Call it "the bag", never "inventory" (the button is the bag).

Draft the full list and show it to the owner first.

## 3. Seaweed: thinning out with depth (asked; the owner's answer was cut off)

Should the kelp forest thin out and grow shorter in deeper water, so it ends naturally instead of stopping? Ask
again before building. 7.2.6 already did the lighter, see-through, layered look (tools/kelp_kit.py, `drawKelp` in
js/render.js).

## 4. Code tidy-up (DONE in 7.3.9)

Remove dead code that was already in the game. eslint (installed globally) lists about 220 unused names. For example:
- `canOffer()` returns false;
- `fitTitle()` and `variantRow()` return early;
- unused imports in hud.js, catalog.js, economy.js;
- the `{ ... }` block left where the helm's W key was;
- `drawBoat`'s `tutDoor` is always false now;
- quests.js still has both `help` and `touchHelp`: keep the touch wording as `help`.

No behaviour changes. Run `tools/tests/phone.cjs` after.

## 5. Known gaps found in 7.2.4–7.2.6

- **Pets cannot be told to stay on a phone.** (DONE in 7.3.9: close to the pet, the interact button becomes the pet.)
- **Missing sky pictures:** `assets/sky/clouds_high.png`, `clouds_mid.png` and `clouds_low.png` are asked for but
  not in the repository.
- **No full-screen request.** Since 7.2.5 the page never asks the browser for full screen, because entering it
  dropped the page's pinned scale and made every panel 1.8x too big. The home-screen app is full screen by its
  manifest. Do not add it back.

## 6. Main storyline: "Margaret's Lost Friend" (planned, not designed yet)

What is decided (CLAUDE.md, 6.8):
- The top quest slot is the tutorial, then the main quest line.
- Margaret is the scientist the boat is named for.
- Her friend became the Old One, the last and furthest west.
- A western limit waits for the main quest: a buoy line with "Too far. Turn back."
- Sail points (numbered buoys, B-01 ...) are found by passing over them and sailed to from the chart.

Questions to settle with the owner before any building:
1. **The arc in steps.** What does each chapter ask of the player (a depth, a place, a find, a person), and what does
   it give (a new sail point, gear, a piece of the story)?
2. **How the story is told.** The game shows and does not talk (rule 8), so the story needs carriers. Candidates:
   quest notes, Margaret's logbook pages found in the deep, Dave, the Old One's trade. Which ones?
3. **The thing in the deep.** How does the friend becoming the Old One relate to the thing that hunts Earl?
   Is the thing part of the story, or kept apart as the fear under it?
4. **The west.** What lies past the buoy line, and when does the main quest open it?
5. **The ending, if any.** Does the main line finish, or open the last sail point and leave the sea to the player?
6. **Pacing against the economy.** Which gear tier should a player have at each chapter? Deep catches pay $3-8k and
   legends $60-150k (CLAUDE.md prices), so chapters should not outrun the gear ladder.
