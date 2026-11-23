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
   Nothing in the game is "she" or "her" (not the Old One, not the sub, not the boat): name the thing ("the Old One's
   shop", "the sub's cradle").
9. **Everything in 3D, the same way.** Every item (suits, nets, cameras, tanks, bags, fins) is drawn as a turned,
   lit, solid object like the suits and nets: round things seen from the side are ovals, faces are shaded, edges
   catch light. A redrawn item changes everywhere it appears (shop, locker, cards, HUD coins, the Old One's table).
10. **Simple systems, one job each.** Prefer moving something to stacking options on it (the swap is net and camera;
   traps are used from the bag; one ability slot, one carried-over cooldown).

## How to work

- **The game as it is (6.2) is the standard.** What is in the game now is the owner's taste made real: the suits'
  orientation and 3D, the shop's layout, the close buttons (easy to find beats quiet), the HUD. Build on it; change it
  only where asked or where it clearly fails the philosophy, and say why.
- **Think holistically, have opinions.** Do not read the philosophy word by word or play the owner's words back. Ask
  what the change does to the whole game (the economy, the gear ladder, the fear, what a player feels), push back with
  reasons, and offer your own ideas. The owner talks by voice and sometimes contradicts himself; the last thing said,
  or the clarified thing, is the intention, and a "what do you think?" invites a real answer.
- **Sizes**: legendaries are oversized trophies under the 4 m catch limit (long ones near it, round ones smaller,
  6.2.0); an animal whose species is under 4 m never spawns over it; size varies about 15 % and price about 10 %
  round the species' base; weight follows length and shape and is only a figure to read. Hand nets, the claw (2 m)
  and the trawls (2 m, 4 m) decide what can be caught purely by length. The giant jellies stay photo-only.

- **Prices (6.4.1)**: common to rare gear is cheap (rare at most about $2,000), for players earning tens of dollars a
  catch; exotic ($8-40k, suits to $30k) and legendary ($45k up) gear keep their old prices, because deep catches pay
  $3-8k and legends $60-150k. The deep pays more because it is scary and slow to reach: leave fish pay alone. Chests:
  pine crate $900 up to Poseidon's chest $100,000 (owner's figures, docs in js/chests.js).

- **Decided in 6.5**: the big button is only ever the net or the camera (greyed aboard); the interact button (brass
  porthole ring, a warm rim when something is in reach) does everything else: ladder, hatch, door, eye, winch. One
  gain effect everywhere, as a find comes out of a chest (cash only inside a gift; otherwise it counts up by the
  money). Item names always in their rarity's colour. No rare forms (albino, golden, giant...). Things to use are
  outlined, never bracketed. Panels appear only when drawn; nothing behind a panel is drawn at a lower rate. The game's
  sound is "ambient" on iOS (follows the silent switch, never "now playing"). Marine snow only below 150-200 m.

- **Decided in 6.5.1**: the daily gift's first week is a new player's own, once (pine crate, $1,000, 3 advanced
  glow sticks, fish trap, station case, $5,000, Siren's casket); from week 2 it repeats scaled by the hidden level
  (store.js). Siren's casket 15/80/5 (rare/exotic/legendary). No frozen lessons: the Log's steps teach in the running
  world with a quiet ring. Things to use breathe in their own shape (the sub's exact silhouette), nothing drawn round
  them. Skill names coloured by level (I uncommon .. IV legendary; flat skills exotic; powers legendary); item cards
  centre only the picture, name and rarity. Layers that scroll with the camera move by its motion, never by its
  place times the zoom. Only the catch that tipped the bag over is marked.

- **Decided in 6.5.6**: nothing important sits in a screen's very corner (the phone's rounded corners cut it off): a
  full-screen room's close cross is about 40 pt in and 14 pt down. Tutorial arrows and chevrons start at Earl (or, in a
  panel, come in from the panel's middle) and point along the line to the thing. Nothing is drawn at a lower rate behind
  any panel; paused, the still world is drawn once and held.

- **Decided in 6.5.7-6.5.9**: a missed fish flees about 5 m at 1.5x its pace, then swims on. Nothing glows in the top
  100 m but a deep animal come up. Guardian jellyfish (the sea lanterns) only in open water below 200 m, and rare; the
  hand on one writes "Guardian jellyfish / Its light keeps the deep away" beside it. The starter wetsuit is the one suit
  worse than any bought (15 m, air x1.05); fins show their real figures (1 to about 3). Rarity always names the kind of
  thing ("Rare suit", "Exotic item"); glow sticks rare, advanced exotic; traps and trawls have rarities. The revive
  offer (js/purchases.js; web build = test store): only when the haul is worth more than 15 % of cash (at least $200,
  never more than $100,000 asked), one revive a dive (the first ever an ad, every later one $0.99), never in the tutorial; back where he was with
  the haul and 30 % air, the thing draws off but the mark stays. One close cross on screen at a time.

- **Decided in 6.6**: the tutorial never draws a line, box or ring round what it shows: the thing itself glows and
  breathes in its own shape (its own outline, never a white circle or rectangle). Don't teach what any phone player
  knows (the stick). The tutorial ends with the first sub trip (one Log step in parts). The revive card is large: the
  death and its depth, a broken heart under REVIVE, every kind carried with its picture and worth, the haul's total,
  one way back (one revive a dive; the first a diver ever takes is an ad, every later one $0.99) and Give up ("The haul is lost").

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
