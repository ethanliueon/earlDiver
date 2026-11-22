# Earl the Diver: how to work on this game

Read this before any change. It is the owner's design philosophy and working rules, agreed in conversation; apply it
to every request, including the small ones.

## What the game is

Being small and alone in water bigger than you, and slowly getting brave enough to go deeper. A calm loop (dive, find
animals, catch or photograph them, fill the journal, sell, buy better gear, go deeper) with the horror *under* it:
the thing in the deep is a presence that marks you, stalks, and turns the water red. Fear comes from the dark, the
depth, the air running low, and knowing something has noticed you. A collecting game in a place that does not want
you there. It is strictly a mobile game, played on phones held sideways; there is no computer version to keep working (the
last desktop build is kept on the branch `desktop-4.25.5`).

## The philosophy

1. **Made by hand, never generated.** Nothing may look AI-made, coded, app-like or clip-art. Rejected before: CSS
   gradients and plain rectangles standing in for objects, handwriting fonts, generic symbols on things (a Wi-Fi
   sign on a scroll), lines where bubbles belong, shiny "treasure" looks. Things look painted, worn, used: old matte
   paper, cloth-bound board, weathered steel, brass. If it looks like a default, it is wrong. Use the game's own
   font (Barlow Semi Condensed) only.
2. **One mood, one palette.** Olive, bronze, bone, deep water, rust. No cyan, no bright gold, nothing cheerful. Colour
   means something: rarity colour only where rarity matters (the ability button, items), every plain button one worn
   grey-brown (the sub's controls a little olive, the glow stick a faint glow). Bright things are rare and earned.
   Panels, cards and menus are olive steel (the bag's and the pause's plate), never old paper; the journal is the one
   book. Every close cross sits in a panel's top right corner.
3. **Detail is a reward.** Higher rarity = more intricate, then glow and particles at the top (legendaries give off
   sparks wherever they are shown). Detail carries information, it is never decoration for its own sake.
   Never enlarge something so it can be read more easily: small details are meant to be found by whoever looks closely,
   and a player who doesn't look need not notice them.
4. **A real game, not a web page.** Reference real mobile games: red "!" badges, joystick bottom left, an arc of
   action buttons bottom right, settings top right, padlocks on what you lack, tutorial spotlights that dim the rest.
   Ask "what would a real game do here?"
5. **Nothing left to guessing.** New players on a phone must always know what to do next, guided gently and in the
   world (chevrons on the water, a glint on a ladder, a callout on a bar), not by walls of text.
6. **Calm feedback.** Readable at a glance but quiet: nothing blinding, flickering or shouting. Presses and catches
   feel good (ripples, flicks, a net cinching). Never add breathing or any noise from Earl. Earl never speaks, with one
   exception: when Rebirth gives him back after the thing ate him, he thinks one line ("What happened? I'm still here."),
   written into the scene beside him. Add no other lines from him.
7. **Order on screen.** Things line up on one axis, spacing is even, nothing overlaps or covers anything else, no
   lopsided panels or dead space. Check at 844 x 390 and at the smallest phone, 667 x 375.
8. **The game shows; it does not talk.** Labels, cards and tables are terse names and figures, never sentences
   written as if someone were speaking ("Gold coin" beside a coin picture, not "A gold coin as well"; "Rare 9 %", not
   "What it will be:"). A picture carries what it can, a word carries the rest; no chat-like phrasing, no explaining
   the obvious. Only the world's own voices (Dave, the shop's copy, quest notes) speak in sentences.
9. **Everything in 3D, the same way.** Every item (suits, nets, cameras, tanks, bags, fins) is drawn as a turned,
   lit, solid object like the suits and nets: round things seen from the side are ovals, faces are shaded, edges
   catch light. A redrawn item changes everywhere it appears (shop, locker, cards, HUD coins, the Old One's table).
10. **Simple systems, one job each.** Prefer moving something to stacking options on it (the swap is net and camera;
   traps are used from the bag; one ability slot, one carried-over cooldown).

## How to work

- **Big changes: plan first.** Give a plan with thoughts, questions and concerns, and wait. When asked "thoughts?",
  give a real opinion and push back where warranted; do not just agree.
- **When the owner raises a problem, asks a question or says "thoughts?", reply with a proposal and wait.** Build
  only on a clear go ahead ("go ahead", "do it", "yes"). Being told to work autonomously covers the agreed plan, not
  new ideas raised later.
- **Push back** when a request, or my reading of it, does not fit the philosophy or the game; say so before building,
  and check an ambiguous request instead of guessing (e.g. "catch coral" did not mean the net should take coral).
- **Do exactly what was asked**; anything said "do not do" stays out.
- **Art must meet the bar on the first try**: aim for old, intentional, designed. Look at it in a screenshot before
  showing it.
- **Show, don't claim.** Send screenshots along the way (phone viewport, touch).
- **Every change:** bump `js/version.js` (last number for small changes) and README line 3, run
  `python3 tools/stamp.py`, test, commit, push to `claude/fish-mobile`. Merge into `main` (a fast-forward) only when
  the owner says a version is good.
- **Every version, give both links:** the home-screen link
  https://raw.githack.com/ethanliueon/earlDiver/claude/fish-mobile/index.html and the pinned
  `https://rawcdn.githack.com/ethanliueon/earlDiver/<commit>/index.html`.
- **Tutorial checklist (phone), for any change near the tutorial or the HUD:** the spotlight's dark covers the whole
  screen, edge to edge (safe areas too), and eases in softly round the button; no bright gold anywhere (arrows, rings,
  glows are bone and quiet); the highlighted button stays readable (glow behind it, never over it); the action arc
  always has its four places (greyed, never removed); every page screen (the shop's site, the bag, the yard) answers
  real taps on a phone, inside the turned frame; messages about a thing or Earl are written beside it in the scene,
  the banner keeps quests, warnings and the tutorial's line.
- **Full screenshot pass** (when asked for one): play through the whole game by screenshots instead of by pressing
  through it. Put Earl (or the sub) at the right places with the right gear, items and money through `window.__earl`
  (as if he had played there normally), and screenshot every screen, panel, HUD state and edge case on the way: title
  and saves, deck, cabin, the shop's site, the bag, every depth band, the sub and its tank room, the station, Dave,
  the Old One, journal, quests, chart, settings, pause, the thing (marked, close, red water, jaws, death, Rebirth), low
  air, over-depth, full bag and locker, at 844 x 390 and 667 x 375. Then judge every shot against the philosophy above
  and report what can be improved, ranked, with the shots. It is a look at stills, not at animation; fix nothing
  without a go.
- **Don't break anything:** after a change, the full touch tutorial (deck to shop), new game, and title screen at both
  phone sizes must still pass. Phones load the game in a turned frame (index.html's shell); tests use `?noshell`.
- **Old saves don't matter until release.** Nobody plays the game yet; until it ships on the App Store, write no
  migration code for old saves and don't keep anything just for them.
- **Never commit keys** (the Freesound key is an environment secret). There is no developer cheat any more (the X key was removed in 5.10.10); tests set money and gear through `window.__earl`.
- In code comments, say what a thing does and why, tagged with the version: `// (5.9.7) ...`. Inline comments in
  the middle of a line use `/* */`, never `//`.
