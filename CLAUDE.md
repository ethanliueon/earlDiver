# Hatchetfish — Deep Sea Survival (formerly Earl the Diver): how to work on this game

The game is called **Hatchetfish — Deep Sea Survival** (6.8.2). Earl stays the default diver's name; the repository
and its links keep their old name.

Read this before any change. New to the game? Start with `docs/ONBOARDING.pdf` (a picture guide: what the game is, what was accepted and rejected, how the code works, testing traps), then `docs/PLAN_7.3.md` and `docs/PLAN_7.4.md` (the economy remaster). It is the owner's design philosophy and working rules, agreed in conversation; apply it
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
6. **Nothing is boxed (7.3.1, owner).** A chosen, focused or current thing shows it by itself: its own plate lit a
   little brighter, a light rising inside it, a glow in its lettering. Never a ring, outline, focus rectangle or extra
   box drawn round or over it. Make every design look intentional and artistic.
7. **Calm feedback.** Readable at a glance but quiet: nothing blinding, flickering or shouting. Presses and catches
   feel good (ripples, flicks, a net cinching). Never add breathing or any noise from Earl. Earl never speaks, with one
   exception: when Rebirth gives him back after the thing ate him, he thinks one line ("What happened? I'm still here."),
   written into the scene beside him. Add no other lines from him.
8. **Order on screen.** Things line up on one axis, spacing is even, nothing overlaps or covers anything else, no
   lopsided panels or dead space. Check at 844 x 390 and at the smallest phone, 667 x 375.
   Keep the HUD and icons as constant as makes sense: a dialogue or card fits round the HUD (money, menu column,
   depth, radar, stick and buttons stay), it never makes them vanish. Test every screen in its real place in the game
   (Dave at his door in a dive, not over the title).
9. **The game shows; it does not talk.** Labels, cards and tables are terse names and figures, never sentences
   written as if someone were speaking ("Gold coin" beside a coin picture, not "A gold coin as well"; "Rare 9 %", not
   "What it will be:"). A picture carries what it can, a word carries the rest; no chat-like phrasing, no explaining
   the obvious. Only the world's own voices (Dave, the shop's copy, quest notes) speak in sentences.
   Nothing in the game is "she" or "her" (not the Old One, not the sub, not the boat): name the thing ("the Old One's
   shop", "the sub's cradle").
10. **Everything in 3D, the same way.** Every item (suits, nets, cameras, tanks, bags, fins) is drawn as a turned,
   lit, solid object like the suits and nets: round things seen from the side are ovals, faces are shaded, edges
   catch light. A redrawn item changes everywhere it appears (shop, locker, cards, HUD coins, the Old One's table).
11. **Simple systems, one job each.** Prefer moving something to stacking options on it (the swap is net and camera;
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

- **Prices and animals (7.3.0, owner; supersedes 6.4.1 and the first remaster; details and the full table in
  `docs/PLAN_7.4.md`)**: an animal pays three times as much for every 1,000 m of the middle of its usual depths below
  450 m; a legend $3.35-5 million by depth, never under five times the dearest exotic. Rarity belongs to the species.
  Of everything met anywhere: exotics (undocumented with them) 3 %, legendaries 0.05 %; below 2,000 m the deep's own
  rare animals fill the water (prawns most). A kind is met most in its band, falls away fast above it and fades gently
  below it to its deepest record. Everything else is priced as hours of income at the depth where it is wanted (income
  measured per sub): subs 1-5 hours of the one before; gear common 10 min of the first sub ... legendary 3-5 h of the
  deepest; chests with their contents; quests a quarter to a full hour; hospital at most half an hour; a photo no depth
  curve and at most $50,000; the aquarium at most $1,500 a gallery day. Re-measure and re-price if the curve changes.
- **Jackpots and the sea (7.3.6-7.3.8, owner; supersedes the legend figures above; table in `docs/PLAN_7.4.md`)**: an
  exotic (and an undocumented animal) pays about one hour, a legend about fifteen hours, of the ordinary income where it
  lives (`specimens.js ORD_INCOME`, measured, below 255 m the first sub's), so jackpots grow as steeply as the danger.
  Usual depths are fitted into this sea (nothing priced below the 5,100 m floor). The sea is never one fish deep: the
  bristlemouths thin below 1,000 m, the mid-water's rare hunters fill 1,100-2,900 m, the deep's animals fade in from
  1,400 m, and the trench's own animals make the pit the richest water. The abyssal sleeper shark (camera only) is 0.5 %
  of what is met below 3,000 m. Income is measured with `tools/econ/measure.cjs` (only what can go in the tank, legends
  out); subs keep their depths and cost 1-5 hours of the one before's income; common and uncommon gear are hand-set.
- **Traps (7.3.0, owner)**: the wire pot (5 min, 5 animals), the fish trap (30 min, 15) and the deep trap (Dave's;
  4 h, 20); up to three of each owned and three set at a time; real time, the game open or closed; a set trap belongs
  to the save (a death does not take it) and its catch waits in it; at the buoy a full trap is cashed out (sold there)
  or put in the bag; deep animals suffer the climb and the dead sell for half; emptied at depth into the sub's chamber
  they live. Priced in order of depth at half a typical haul.

- **Decided in 6.5**: the big button is only ever the net or the camera (greyed aboard); the interact button (brass
  porthole ring, a warm rim when something is in reach) does everything else: ladder, hatch, door, eye, winch. One
  gain effect everywhere, as a find comes out of a chest (cash only inside a gift; otherwise it counts up by the
  money). Item names always in their rarity's colour (7.3.0: a common one in black on the catalog's pale pages, where its grey was faint). Every item has a written card line and description (js/item_words.js), never figures in place of words: the figures (Speed 1.18, sprint 1.5, as calculated before) stay on the item's page and in the inventory. Descriptions are plain and factual, like a catalogue or a museum label: no character voices (owner, 7.3.0). Exotics and Legendaries get a longer one. No rare forms (albino, golden, giant...). Things to use are
  outlined, never bracketed. Panels appear only when drawn; nothing behind a panel is drawn at a lower rate. The game's
  sound is "ambient" on iOS (follows the silent switch, never "now playing"). Marine snow only below 150-200 m.

- **Decided in 6.5.1**: the daily gift's first week is a new player's own, once (pine crate, $250, 3 advanced
  glow sticks, fish trap, station case, $1,000 (7.3.9), Siren's casket); from week 2 it repeats scaled by the hidden level
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
  offer (js/purchases.js; a stand-in store until the app's is connected): only when the haul is worth more than 15 % of cash (at least $200,
  never more than $100,000 asked), one revive a dive (the first ever an ad, every later one $0.99), never in the tutorial; back where he was with
  the haul and 30 % air, the thing draws off but the mark stays. One close cross on screen at a time.

- **Decided in 6.6**: the tutorial never draws a line, box or ring round what it shows: the thing itself glows and
  breathes in its own shape (its own outline, never a white circle or rectangle). Don't teach what any phone player
  knows (the stick). The tutorial ends with the first sub trip (one Log step in parts). The revive card is large: the
  death and its depth, a broken heart under REVIVE, every kind carried with its picture and worth, the haul's total,
  one way back (one revive a dive; the first a diver ever takes is an ad, every later one $0.99) and Give up ("The haul is lost").

- **Decided in 6.7**: a new diver is made in the creator (a name up to 12 letters, Earl if empty; man or woman, four
  face shapes, three eye depths, seven hairstyles, six skins; Skip keeps Earl). The head is a real profile (forehead,
  brow, nose, lips, chin, a jaw that turns under the ear), and the hair sits on top with volume above the skull, from
  the hairline to behind the ear (face_draw.js). Earl himself is younger: dark swept hair, a shadow of stubble.
  The first trawl, the first chamber and the first backup air tank are taught once each, on the tutorial's spotlight;
  backup air tanks are used from the bag.

- **Decided in 6.8**: the top quest slot is the tutorial, later the main quest line (Margaret's Lost Friend, planned, not
  built: Margaret is the scientist the boat is named for; the friend became the Old One, last and furthest west). The
  basics left the Log: a new diver's first board is "Take the sub below 200 m", "Bring up a live animal from below 100 m",
  "Set a trap and empty it". Rare omens from a diver's third dive: the radar ghost and a far-off low call. Sail points:
  numbered buoys (B-01 ...) above places, found by passing over them, sailed to from the chart (aboard, sub docked) with a
  short loading screen. The game is **Hatchetfish — Deep Sea Survival**. A western limit (buoy line, "Too far. Turn back.")
  waits for the main quest.

- **Decided in 6.9**: every item says Unequip; a net unequipped leaves the hands empty and greys the big button (no hand
  net put back). The journal is sorted by depth; a newly met animal carries a New tag until opened or an hour passes; its
  tank is sized to the animal (small: close beside big growth; large: a wide floor of small growth), only bare seabed
  behind a coral, fan, sponge or anemone, and the deep has its own life. The loading screen holds 3 s from when its art
  is seen; its bar is centred with a hatchetfish at the fill's front. Log rewards show the item (picture, name in its
  rarity's ink) or the money. No handwriting font anywhere. Swimmers keep 3 m from the seabed and walls. The name is a
  worn steel plate; save slots are steel locker doors. Dave's name is painted plain (never in a box).

- **Decided in 7.2.7-7.2.8**: the app icon is the game's own legendary anglerfish close up, lit only by its lure, Earl
  upright in its light (assets/app, 1024 master). The tutorial points with Earl's own glove (tut-point.png, no outline),
  its fingertip just short of the thing, from Earl's side or a panel's middle, turned to the side where it covers no other
  button or word; the chevrons on the water still mean "go there". A step about anything in the left menu opens it. An
  observed animal shows its name alone, in its rarity's colour. The creator's name is typed on the game's own keyboard.
  Effects that speed up never multiply the clock by a changing speed (it made them jump): they move by their speed each frame.

- **Decided in 7.3.9**: subs have no sinking speed of their own (they sink at their speed); speeds 1 to 2.5, the best
  2.5x the first. An exotic pays 1 hour of ordinary income at 1,000 m and above, rising to 2 hours at 4,800 m; a legend is
  always 15x an exotic at its depth. The abyssal sleeper shark is an ordinary hunter (0.5 % of what is met below 3,000 m,
  no ambush timer): a far call and a radar ghost warn before it strikes; its bite is 4 injury points, or 80 % of the hull
  in the sub. **Pearls** are the premium currency: a new diver starts with 20, shown on their own small steel plate
  under the money; a revive costs 50 pearls (no ad, no $0.99); no pay-to-win unless the owner asks. (7.4.12) Pearls come from
  the daily gift (2 a day, 5 more on the seventh) and from legendary catches (10 each); events and pearl packs are
  planned, not built (docs/PLAN_7.4.md). Close to his pet, the interact button becomes the pet (Stay / Follow); the word
  is written above the pet, with no line. The action arc keeps its places. (7.4.12) An ability's cooldown can be skipped
  with pearls from its button: a flat 1 pearl for every 5 minutes left. The Lighthouse burns 60 s, pulses to half again
  as bright and sweeps two soft beams round him.
- **Pets (7.4.14, owner):** only from pearls (js/petshop.js), never from the catch; never items (not in the bag, the
  locker or the aquarium) and never sold. Tiers: exotic 80 pearls (plain), legendary 150 (a soft glow and motes),
  mythical 500, the giants (an ember glow, more particles). Two kinds in the shop (7.4.16): Pets, each shown once its species
  is caught (until then a dark outline, "Catch one to unlock"), and Exclusive, the animals no net can take (the
  photo-only legends, anything over 4 m), each unlocked by photographing one. Every pet starts at its real size. The pet slot shows a red "!" while he
  owns pets and none is out; tapped, it lists his pets. Feeding (js/petfeed.js): at the surface, once a day, one live
  animal brought up, dragged into the pet's aquarium (it eats, loops, gives off pink hearts for about 5 s); points by
  rarity (common 5, uncommon 10, rare 20, exotic 40, legendary 100); levels at 10, 50, 100, 500 points, each +20 % size,
  with the screen darkening as it grows; a star a level on its card; the size can be set back without losing the level;
  pearls top up points, 1 for 10.
- **The coconut island (7.4.17, owner):** the sea ends on the east at a sand island (world.js ISLE, isleDepth): 1.5 m
  above the water at its top, about 18 m long, one coconut palm near its far end, a 20 m pool beyond it (no fish: a
  second ocean, later). Swimming into its shallows he wades out and walks it (g.ashore), helmet and tank off as on deck;
  past the palm: "Area available in a future update". It is a wall for the sub and the boat; pets wait in the sea.
  Nothing of the sea is placed past SEA_END. The seabed is painted with assets/textures/seabed.png (tools/seabed_tex.py),
  multiplied over its colour when the floor is baked, so phones show it too.
- **Giant and colossal squid (7.4.17, owner):** drawn from life (creatures_draw.js drawGiantSquid): deep red, mantle
  first, eight sucker-lined arms and two long club-tipped tentacles; they never hang on end or turn over.
- **Sprint durations (7.4.17, owner):** Sprint 15 s, Sprint+ 15 s, Riptide 20 s, Maelstrom Heart 30 s.
- **Mythicals are Hearts (7.4.19, owner):** Maelstrom Heart, Pharos Heart, Whalesong Heart, Leviathan Heart, Riven Heart,
  Warden Heart, Hadal Heart. Each has its own picture (scroll and coin, scrolls.js emblemTier's mythical branch), with
  a small heart at the foot of its medallion; the scroll has an ember-gilt border, carved caps and a heart-stamped seal.
- **Dauntless (7.4.19, owner):** a pressure skill, an inverted triangle that grows heavier by tier. While it runs the
  suit (or the hull) is rated deeper by its multiple and pressure's extra air cost is that many times less: Dauntless
  20 s, 30 min, x1.5; Dauntless+ 20 s, 1 h, x2, Flare+ light; Bathysphere 30 s, 1 h, x2.5, light, and past its limit air
  goes 5 times slower; Hadal Heart 45 s, 1 h, x3, past its limit 10 times slower. A force field of pressed water round
  him or the sub (render.js, g.pressFx): one pale water colour at every tier, bigger and stronger by tier and by how much
  of the extra depth is used; it bursts out and is crushed back in; Bathysphere and Hadal Heart press on the screen.
- **Mythical scrolls (7.4.15, owner):** a rarity above legendary, oxblood red with an ember glow (never the bright warning
  red). Only from three legendaries of the same scroll combined: never in chests, the Old One's table or a shop. Worth
  three legendaries. Maelstrom (Riptide), Pharos (Lighthouse), Whalesong (Fathom), Leviathan's Maw (Apex), Rift
  (Undertow), The Last Tide (Tidewarden). Every one, for the 10 s after it fires: at least Flare+ light, at least
  Sprint+ speed (the sub too), and air back (+5 % a second, up to +50 %, none lost). Usable any time; cooldowns at least
  20 minutes.
- **Decided in 7.4.0**: a net catches only what its hoop passes over in the swing (tools_draw.js netGeom); reach is a
  multiple of the hand net's (1x the hoop, 2x twice its radius), and the hand net takes 0.7 s to land. Ambush I-IV: 25 %
  a level that a fish holds still instead of darting or bolting, "Ambushed" written beside one caught that way. Observing
  (and the eye) only what is in front of Earl or the sub's nose. Orcas ram the sub (20 % of the hull) and billfish charge
  more in open water. The left menu starts folded and folds after 10 s. New tags are olive green everywhere (red is for
  warnings). The tutorial's highlight is the thing glowing in its own outline, the dark's edge feathered (no lit box);
  the sub trip keeps the interact button to the step and fences the water. The price board shows each animal's picture;
  after a sale the panel shows what was sold, stamped Sold. A fish in the bag can always be let go from its card.
  Overencumbered: a red "speed −50 %" warning, no tremor. The autopilot's arrival: the sub's rim flares, the view leans
  in and out, "Home" beside it. At the cabin door the big button and walking on into the door also take him out.
- **Big changes: plan first.** Give a plan with thoughts, questions and concerns, and wait. When asked "thoughts?",
  give a real opinion and push back where warranted; do not just agree.
- **When the owner raises a problem, asks a question or says "thoughts?", reply with a proposal and wait.** Build
  only on a clear go ahead ("go ahead", "do it", "yes"). Being told to work autonomously covers the agreed plan, not
  new ideas raised later.
- **Push back** when a request, or my reading of it, does not fit the philosophy or the game; say so before building,
  and check an ambiguous request instead of guessing (e.g. "catch coral" did not mean the net should take coral).
- **Do exactly what was asked**; anything said "do not do" stays out.
- **Finish everything agreed in the same run** (6.8.4): every item discussed and not ruled out is built, tested and
  screenshot in that run. Never end with "next I will..." or leave a part for the owner to check later.
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
- **Never care about saves unless the owner asks (7.4.12, owner).** This is not a packaged game: the owner is the only
  player, and test saves may be wiped or changed at any time. Write no migration code, no "keep what they already
  have" handling, no compatibility for old save fields, and don't spend time on it or mention it in plans. A change
  that breaks an old save is fine; a new game is the answer.
- **Never commit keys** (the Freesound key is an environment secret). There is no developer cheat in the shipped game (the X key was removed in 5.10.10); since 6.9.0 the shop has a **Test** tab (cash, pearls, chests, abilities, any item, resets); since 7.4.13 it shows only with `?dev` in the address (purchases.js `isTestStore()`), never in the App Store app. There is no web build: the game is phone-only. Tests set money and gear through `window.__earl`.
- In code comments, say what a thing does and why, tagged with the version: `// (5.9.7) ...`. Inline comments in
  the middle of a line use `/* */`, never `//`.
