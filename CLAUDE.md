# Earl the Diver: how to work on this game

Read this before any change. It is the owner's design philosophy and working rules, agreed in conversation; apply it
to every request, including the small ones.

## What the game is

Being small and alone in water bigger than you, and slowly getting brave enough to go deeper. A calm loop (dive, find
animals, catch or photograph them, fill the journal, sell, buy better gear, go deeper) with the horror *under* it:
the thing in the deep is a presence that marks you, stalks, and turns the water red. Fear comes from the dark, the
depth, the air running low, and knowing something has noticed you. A collecting game in a place that does not want
you there. It is played on phones held sideways; desktop is no longer a target.

## The philosophy

1. **Made by hand, never generated.** Nothing may look AI-made, coded, app-like or clip-art. Rejected before: CSS
   gradients and plain rectangles standing in for objects, handwriting fonts, generic symbols on things (a Wi-Fi
   sign on a scroll), lines where bubbles belong, shiny "treasure" looks. Things look painted, worn, used: old matte
   paper, cloth-bound board, weathered steel, brass. If it looks like a default, it is wrong. Use the game's own
   font (Barlow Semi Condensed) only.
2. **One mood, one palette.** Olive, bronze, bone, deep water, rust. No cyan, no bright gold, nothing cheerful. Colour
   means something: rarity colour only where rarity matters (the ability button, items), every plain button one worn
   grey-brown (the sub's controls a little olive, the glow stick a faint glow). Bright things are rare and earned.
3. **Detail is a reward.** Higher rarity = more intricate, then glow and particles at the top (legendaries give off
   sparks wherever they are shown). Detail carries information, it is never decoration for its own sake.
4. **A real game, not a web page.** Reference real mobile games: red "!" badges, joystick bottom left, an arc of
   action buttons bottom right, settings top right, padlocks on what you lack, tutorial spotlights that dim the rest.
   Ask "what would a real game do here?"
5. **Nothing left to guessing.** New players on a phone must always know what to do next, guided gently and in the
   world (chevrons on the water, a glint on a ladder, a callout on a bar), not by walls of text.
6. **Calm feedback.** Readable at a glance but quiet: nothing blinding, flickering or shouting. Presses and catches
   feel good (ripples, flicks, a net cinching). Never add breathing or any noise from Earl.
7. **Order on screen.** Things line up on one axis, spacing is even, nothing overlaps or covers anything else, no
   lopsided panels or dead space. Check at 844 x 390 and at the smallest phone, 667 x 375.
8. **Simple systems, one job each.** Prefer moving something to stacking options on it (the swap is net and camera;
   traps are used from the bag; one ability slot, one carried-over cooldown).

## How to work

- **Big changes: plan first.** Give a plan with thoughts, questions and concerns, and wait. When asked "thoughts?",
  give a real opinion and push back where warranted; do not just agree.
- **Do exactly what was asked**; anything said "do not do" stays out.
- **Art must meet the bar on the first try**: aim for old, intentional, designed. Look at it in a screenshot before
  showing it.
- **Show, don't claim.** Send screenshots along the way (phone viewport, touch).
- **Every change:** bump `js/version.js` (last number for small changes) and README line 3, run
  `python3 tools/stamp.py`, test, commit, push to `claude/fish-mobile`. Never merge into main.
- **Every version, give both links:** the home-screen link
  https://raw.githack.com/ethanliueon/earlDiver/claude/fish-mobile/index.html and the pinned
  `https://rawcdn.githack.com/ethanliueon/earlDiver/<commit>/index.html`.
- **Don't break anything:** after a change, the full touch tutorial (deck to shop), new game, and title screen at both
  phone sizes must still pass. Phones load the game in a turned frame (index.html's shell); tests use `?noshell`.
- **Never commit keys** (the Freesound key is an environment secret). The X developer cheat stays easy to reach.
- In code comments, say what a thing does and why, tagged with the version: `// (5.9.7) ...`. Inline comments in
  the middle of a line use `/* */`, never `//`.
