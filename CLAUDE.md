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

## The game's direction (7.6, owner)

- The philosophy above is the quality bar (painted, intentional, never generated) and a description of the game as it
  is, not a limit on what it may become. Fantasy, magic, made-up animals and a 30,000 m trench are welcome.
- Pay to win is fine and wanted. Pearls are a fuel spent every day (charges, skips, the scroll shelf, coins), not a
  rare premium. Never argue against a design for being pay to win.
- Skills are the heart of the game: many families, two slots, visible effects that make progress feel earned. The plan
  is docs/PLAN_SKILLS.md.

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
  sound is "ambient" on iOS (follows the silent switch, never "now playing"). Marine snow only below 120 m, eased in to full at 260 m, in small uneven specks (7.6.0).

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
  under the money; a revive costs pearls (no ad, no $0.99; 7.6: 100-500 by the haul). (7.6.2) Pearls come from
  the daily gift (10 a day, 100 more at the week's end), legendary catches (100), Log quests (5-15), first-time depths
  (100 m 5 ... 5,000 m 500) and packs ($0.99 1,000, $2.99 5,000); spent in the shop's Scrolls, Coins and Pets tabs. Close to his pet, the interact button becomes the pet (Stay / Follow); the word
  is written above the pet, with no line. The action arc keeps its places. (7.4.12) An ability's cooldown can be skipped
  with pearls from its button: a flat 1 pearl for every 5 minutes left. The Lighthouse burns 90 s (7.6.0), pulses to half again
  as bright and sweeps two soft beams round him.
- **Pets (7.4.14, owner):** only from pearls (js/petshop.js), never from the catch; never items (not in the bag, the
  locker or the aquarium) and never sold. Tiers (7.6.2): exotic 400 pearls (plain), legendary 1,000 (a soft glow and motes),
  mythical 2,500, the giants (an ember glow, more particles). Two kinds in the shop (7.4.16): Pets, each shown once its species
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
- **No round dots for sparks (7.4.24, owner):** an ember is a thin tapered sliver of ash rising (scrolls.js ember), a
  speck of bioluminescence a tiny sharp streak; never a plain circle or soft blob. Hadal Heart gives off no embers.
- **A sub left deep (7.4.22, owner):** her crush risk runs whether he is in her or not. Empty, she can implode: he lives,
  she is lost (heard as a boom), she cannot be called, and once he is back at the surface she is in the Margaret's
  cradle again.
- **Giant and colossal squid (7.4.17, owner):** drawn from life (creatures_draw.js drawGiantSquid): deep red, mantle
  first, eight sucker-lined arms and two long club-tipped tentacles; they never hang on end or turn over.
- **Skill durations (7.6.0, owner; table in docs/PLAN_SKILLS.md):** Sprint 20 s, Sprint+ 25 s, Riptide 40 s, Maelstrom Heart 60 s; Apex 60 s, Leviathan Heart 90 s; Lighthouse 90 s, Pharos Heart 120 s; Bathysphere 60 s, Hadal Heart 90 s; Dauntless also gives air back (2/3/5/10 % a second for its first 10/15/20/30 s).
- **Mythicals are Hearts (7.4.19, owner):** Maelstrom Heart, Pharos Heart, Whalesong Heart, Leviathan Heart, Riven Heart,
  Warden Heart, Hadal Heart. Each has its own picture (scroll and coin, scrolls.js emblemTier's mythical branch), with
  a small heart at the foot of its medallion; the scroll has an ember-gilt border, carved caps and a heart-stamped seal.
- **Dauntless (7.4.19, owner):** a pressure skill, an inverted triangle that grows heavier by tier; (7.4.22) the
  diver's alone, never in the sub. While it runs the
  suit is rated deeper by its multiple and pressure's extra air cost is that many times less: Dauntless
  20 s, 30 min, x1.5; Dauntless+ 20 s, 1 h, x2, Flare+ light; Bathysphere 30 s, 1 h, x2.5, light, and past its limit air
  goes 5 times slower; Hadal Heart 45 s, 1 h, x3, past its limit 10 times slower. A force field of pressed water round
  him (render.js, g.pressFx): one twilight blue at every tier (7.4.23: never white; motes held in it, swirling), bigger and stronger by tier and by how much
  of the extra depth is used (7.4.25: its edge always slowly shifting; warping, cracking, shaking and the faster, wilder
  pressure only past 80 % of the limit, full at 100 %; 7.4.22: radius 2.2, 3.0, 3.8 and 4.6 m, closing in as the limit nears, shaking, its rim
  warping and cracking, the pressure faster and the dark outside closing in; 7.4.21: radius about 2.2 m, 3.1 m, 4.6 m, and Hadal Heart nearly the whole screen; the water
  outside darkened and squeezed, harder the more of the limit is used; the bending only in a band inside the rim, so he
  stays sharp); it bursts out and is crushed back in; Bathysphere and Hadal Heart press on the screen.
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
- **"What are your thoughts?" at the end of a message (7.5.0, owner) means thoughts on every single point in it**, one by
  one, and a plan: build nothing until a clear go.
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
- (7.6.29, owner) Nothing abrupt: every skill effect fades out (the skills' light holds its strength and fades over 1.5 s,
  g.abilOutK; Plunge's anchor over 0.8 s, g.sinkK). Dauntless's strain eases in smoothly from half its limit to the full
  limit (no 80 % switch), smoothed over time, its shakes slow (never a flicker), its pulse on an accumulated beat. The
  opening burst bends the water as a ripple of many thin rings pushed outward along a smooth wave (never a magnified pane),
  drawn over the scene so nothing behind the canvas shows. Plunge's anchor is drawn in the world pass, lit by the water.
  Coming back (Rebirth, revive) clears blood, ink and skill leftovers; the legendary wake restarts at his side after a jump.
- (7.6.30, owner) Charges grow by themselves on every scroll he owns, in real time, open or closed (abilities.js
  `growCharges`): the next one takes the cooldown times one more than it holds (1x ... 5x at most); the card says when.
  The radar is 200 m and draws out to 1,000 m (eased) while an Echo skill runs; the Echo family searches its share of it
  (Echo 40 %, Echo+ 60 %, Fathom 80 %, Whalesong 100 %): the animals about and far contacts made by the sea's own rules
  (fauna.js `echoContacts`), which become the real animal when he comes near. Plain dots: bone for Echo and Echo+, exotic
  purple and legendary amber from Fathom up. The thing's red dot is always shown. Gust 15 / 20 / 30 s. Net reach: Vigor
  2x, Vigor+ 3x, Apex 5x, Leviathan Heart 8x.
- (7.6.31, owner) The Lighthouse keeps its old beams (owner: "a light, not a beam of light"; god-ray beams were tried and
  rejected). Pharos Heart's beams and pulse run only for its first 10 s, then ease away over 1.5 s (g.beamK, g.pulseK)
  and its steady light stays to the end.
- (7.6.32, owner) Shoal's school is drawn with the world (lit by the water and his lamp); Silverstorm is six oversized
  whipnose anglers whose lures light the water; at the end every school turns away and swims off, fading (3.5 s).
  Ironskin blocks every injury, heat too (never the thing's jaws, air or pressure), and three small steel shields circle
  him on a tilted orbit, each turning on its own upright, dimmer behind him, a glint now and then. Dauntless's motes drift
  and slowly sink (never streaming sideways).
- (7.6.33, owner) The legendary wake is 26-40 marks, never a plain circle: streaks (motes), tiny fish (Magnetic), bells
  with threads (Kinship), blinking almonds (Eye of the Sea), wobbling bubble clusters (Second Wind), ember slivers and ash
  flakes (Faithless), stretched smoky flecks (Phantom). Dauntless's rings fewer and lighter (heat).
- (7.6.35, owner) The name (title_art.js, baked into assets/loading/title.png by calling `paintTitle` at 1640 x 440, t 2,
  dpr 2): pairs kerned by eye (KERN), painted bone with fine grain, small chips worn from the edges, a lit top lip and a
  darker foot; the deep getting in from the C on (its own layer, breathing slowly on the title): olive to drowned green to
  near-black teal by the S H, silt rising from the feet, rust crust and barnacles at the corners, dark threads creeping in
  from the fish's side, a few cold pricks of light; light through the surface a broken net of wavering lines (never
  rings); a tight contact shadow. The hatchetfish's light organs pale bone, its fins and teeth silver (no cyan). On the
  loading screen the subtitle sits lower, centred under the word.
- (7.6.36, owner) The name is one brightness across the word: the deep shows in hue (a 'color' blend that keeps each
  letter's light: olive to greyed drowned green, never cyan), mottling, gouged scars, mid-tone silt stains, rust,
  barnacles and threads, never by darkening. A worn scroll's card (a Heart's too) moves it to the other slot (Second slot
  / Put it on; main.js `moveslot:`), the two swapping with their own cooldowns.
- (7.6.37, owner) The painted heads' ChatGPT job is handed over: docs/HEADS_HANDOFF.pdf and tools/heads/ (templates made
  from face_draw.js's own bald head, hair 'none', on key green with corner crosses; pieces.json, 28 pieces with exact
  prompts and fix lines; check_piece.py). Helmet on in the sea; women their own four faces; no extras in batch one.
- **(7.6.28, 7.6.33, owner) Saves carry over**: a change must not wipe or break the owner's saves (economy.js `migrate` fills
  anything new from a fresh profile), and the game quietly keeps the last version's save beside each slot
  (`earl.save.slotN.prev`; economy.js `restorePrevSave`). No backup or restore buttons (7.6.34, owner: unnecessary). Superseded:
  **Never care about saves unless the owner asks (7.4.12, owner).** This is not a packaged game: the owner is the only
  player, and test saves may be wiped or changed at any time. Write no migration code, no "keep what they already
  have" handling, no compatibility for old save fields, and don't spend time on it or mention it in plans. A change
  that breaks an old save is fine; a new game is the answer.
- **Never commit keys** (the Freesound key is an environment secret). There is no developer cheat in the shipped game (the X key was removed in 5.10.10); since 6.9.0 the shop has a **Test** tab (cash, pearls, chests, abilities, any item, resets); since 7.4.26 it shows for everyone again while the game is in testing (owner): purchases.js `TEST_STORE = true`; **set it to false for the App Store build** (then only `?dev` shows it). There is no web build: the game is phone-only. Tests set money and gear through `window.__earl`.
- In code comments, say what a thing does and why, tagged with the version: `// (5.9.7) ...`. Inline comments in
  the middle of a line use `/* */`, never `//`.

### 7.4.26 notes (owner's playtest)
- Every tappable thing on screen has the same press: it sinks and brightens, a soft ring spreads from the fingertip, a short vibration (main.js `PRESSABLE`); the screens with no sound of their own (new diver, its keyboard, slots, title) also click.
- Two hands: the left half of the screen grows the stick; a finger on the right half turns the diver's lamp toward it, always in front of him (touch.js `lamp`, main.js `g.lampA/lampK`, render.js `lampAngle`). A quick tap there is still a tap on the world.
- Sales happen at the **Sell door** on the Margaret's hull by the stern (earl_draw.js), not the winch. No rubber stamps (SOLD/PAID) anywhere: a receipt ends as a till's does.
- The daily gift comes 24 h after the last claim, timed by the server's clock (store.js `serverNow`, the Date header of the game's own host) and counts down in h/min/s.
- The shop is one size on every tab; pets are one list (no Exclusive tab).
- A step that must be done before anything else (getting into the sub, the trawl lesson) darkens the screen's edges (`g.tutVig`). The trawl lesson's net stays open until its jellyfish is in.
- `tools/tests/phone.cjs` walks to the cabin door and presses the button like a player; it passes when it reaches "Get in the sub" (`reached the sub trip`) with only the three cloud 404s.
- Mid-line comments are `/* */` only: a `//` mid-line hid the line that tells the game the sub trip had started (so the sub could not be tapped).
- (7.4.27, owner) Nothing marks the chart by itself except the shops (home, Dave's, Station 7, the Old One's cave); other places are the player's to mark. Marker buoys stand only at the shops. No price board on the sell page.

### 7.5.0 notes (owner's playtest)
- The tutorial: "Your air" sits left of the O2 mark; a swing that misses for reach says only "Get closer"; sales only at
  the Sell door (chevrons lead there), then the ladder; on deck the glove points at the cabin door; the catch step points
  at the card's close cross 2 s after the card opens, then the bag's; the sub trip teaches the sprint once.
- Words in the scene ("Home", "Get closer") are text alone, no line to their owner.
- One red "!" everywhere (coins.js `drawBang`): its diameter half the tile's width, at the tile's top right; the journal's
  HTML one is sized to match. The journal tile is as bright as the others.
- A tile that cannot be used now carries a small padlock; tapped, it says why ("The sub is at the boat", "Not yet").
- Marker buoys hang on a laid mooring rope (buoy_draw.js), never a dashed line.
- The lamp (right hand) turns from straight up to just below the net's angle, never behind him.
- Phones always run lite mode (no rim light on animals, no film grain, no far kelp, a lower-resolution light map). The
  Battery saver setting adds a 30 fps cap. Image caches are all bounded; `rockAt` is binned by x.
- The painted creator heads are planned in docs/PLAN_CREATOR.md (ChatGPT edits on one template; not built).
- (7.5.2, owner) The locker holds 60; its grid scrolls inside the frame (heading fixed, lower edge fading while more lies
  below). A chest opened from the bag returns to the bag when its reveal closes.
- (7.5.3, owner) Sparks on legendary and mythical pictures are drawn on a small canvas inside each picture's own frame
  (legendfx.js), so they scroll with it and never trail; never one canvas over the page chasing positions.
- (7.5.4, owner) An observed animal's name fades out once the animal is off the screen (never held at the edge).
- (7.5.5, owner) Gear and chests sell from the bag anywhere in play. Rare and up, every scroll and every chest ask first
  ("Sell Gulper's Throat?" / "Legendary net", Keep / Sell, $...); a common or uncommon sells on a tap.
- (7.5.6, owner) A scroll's card always shows Combine 3 (greyed with "(1/3)" until three are owned; the worn one counts and
  the new scroll goes on in its place). Every orca ram damages the hull (no rest for the pod). At a hole in the sub's hull
  the interact button is a painted spanner (hold it to mend). Dash charges: rare 2, exotic 2, legendary 3, mythical 5,
  each used within 20 s of the last; a segment each round the skill button shows how many are left.
- (7.5.7, owner) A Blessed animal (caught under Apex) shows Blessed as its status, in legendary gold with Apex's emblem.

### 7.6.0 notes (owner)
- Skipping the tutorial marks every taught-once lesson done; the trawl lesson's jellyfish hangs again 12 m in front of the
  sub if it is left more than 20 m behind.
- iOS makes no click from a tap while another finger is down: main.js presses a button by hand on such a touchend (the
  cooldown skip and every panel work with a thumb on the stick).
- The marked eye sits beside the pearls' plate; on the radar the thing is a plain red dot (no bracket).
- Red water is the pre-4.0 blood-red glow again, over a red multiply that pulls every skill effect toward red.
- The Barreleye Lens's glass grows out of a bone neck on the housing (no face-on oval).
- "A better sub is for sale" (once ever, the first time cash covers the next sub): deck, cabin, the computer's new
  Submersibles link, All submersibles, that sub's price tag.
- Reach skills: a light in the hoop by tier and a wake of churned water along each swing (no dashed arc).
- The diver's lure is gone from the code (the Old One's lure, the deep trap's light and Lanternmesh stay).

- (7.6.1) Speed: the diver's own (fins, suit, bag) times the strongest boost running (a skill, the sprint button, the
  low-air push), never the boosts multiplied; the sub the same. Light already took the strongest.
- (7.6.2, owner) The shop's tabs: Chests, Scrolls (three scrolls, each on a 12-hour clock, rare 80 / exotic 15 /
  legendary 5 %, 250 / 750 / 2,000 pearls, pure 1.6 times; a fourth card restocks all three for 50), Pets, Coins (50 / 100
  / 300 pearls for $5,000 / $15,000 / $65,000 and a daily deal, 150 for $30,000), Pearls (packs). Scrolls sell only for
  pearls, a quarter of their shelf price. A revive costs 100-500 pearls by the haul's share of cash (shelf.js, main.js).

- (7.6.3, owner) Charges: loaded onto a scroll at the surface (aboard, the cabin, or 0 m) from its card, 1 pearl per 5 min of
  its cooldown each, up to 5 (rare, exotic) or 10 (legendary, mythical), Tidewarden and Warden Heart 1. A charge fires the
  skill at once (running, it starts over); with none, the cooldown runs free or is skipped at 3 pearls per 5 min left. The
  count shows at the skill button's foot (×8).
- (7.6.4, owner) Two scroll slots: Ability and Ability 2 in the bag (a scroll's card: Put it on / Second slot); never two of
  one family, one Heart (mythical skill) at a time. A swap chip at the skill button's upper left brings the second onto the
  button with its own cooldown; the other keeps running, and each kind of effect takes the stronger of the two.
- (7.6.5, owner) The first new families (docs/PLAN_SKILLS.md), painted in the same stencil style by tier: pure Breath /
  Breath+ / Bellows (air back at once, then a steady refill; the air bar and his outline lit blue), Gust / Gust+ /
  Splintering Gale (speed, x4.2 at legendary), Temper / Temper+ / Adamant (depth rating, x3.5), Plunge / Plunge+ /
  Drowned Anchor (an iron anchor drags him or the sub down; stick up holds against it, the chain taut, bubbles driven
  up); hybrid Lookout / Lookout+ / Eagle Eye (the view drawn out, light; Eagle Eye darkens the edges into a lid's almond).
  Pure scrolls carry "Pure" on their card and are a third as likely in chests and on the shelf.
- (7.6.6, owner) The second batch: Cast / Cast+ / Dragnet (pressed, it waits 4 s for a tap; every fish it can take within its
  throw is lit from behind along its own body; a meshed net with a lead-weighted rim flies there and takes what its mouth
  holds, up to 2 m, one by one until the bag tips over); Snatch / Snatch+ / Talon (tap 3/5/8 fish, each caught by the net's
  chance plus its bonus); Ironskin (injuries healed, 30 s no animal hurts him, never the thing's jaws; a steel sheen and
  glints on him, no ring); Calm (refused while it hunts; the mark wiped, 30 s unnoticed); Tidecall (schools of the kinds
  near gather round him, and the thing's attention rises); Nacre (60 s, a pearl a catch at 25 %); Bloodmoon (Test tab
  only: 60 s red water, the thing placed just past the radar, marking and hunting; catches Cursed, ×5, never stressed,
  Bloodmoon's emblem in oxblood on the card); Shoal, Revel (coloured shafts of light from above in time, never round
  glows), Ink (the water round him tinted, Inkstorm's trail) for the eye alone. The same line said again restarts the
  one shown, never stacks.
- (7.6.7, owner) Every skill opens with a burst (main.js `fireBurst`, render.js): never a drawn circle but a lens rolling out
  from him, the water magnified in a soft band round its front (a soft-masked blend, no edges) and the front lit unevenly
  round its way. Rare about 4 m; exotic 10 m with a second wave; legendary across the screen; a Heart first pulls the water
  in and darkens it, then bursts with the brightest light in the game and ripples across the radar. Every Heart (never
  Bloodmoon) throws the thing 200 m further off when it is on the radar and at least 100 m away, red water or not; the mark
  stays. Calm's and Tidewarden's drawn rings are gone; Echo stays as it is.
- (7.6.7, owner) Lure / Lure+ / Tidecall: 15 / 25 / 40 fish of the kinds that live at his depth (2 m or less, no hunters, no
  reef residents) come in from just past the screen's edges on every side and mill round him; exotics 5 / 7 / 10 %.
  Bloodmoon calls 40 the same way (exotics 15 %, legendaries 2 %), still summons the thing to just outside the radar, never
  pushes it, and draws no sweep (radar marks only). Revel / Revel+ / Carnival: light as a Flare+ (Carnival more), vivid
  lantern colours (the water's colour swinging in time, soft-edged coloured shafts, lantern jellies that light the water
  round them); hunters that bite keep 15 / 25 / 40 m off (never the thing). Temper: no field; heat colours on his own
  figure (copper with a straw-purple-blue band sweeping head to foot, his shading kept), laid over after the deep's dark.
- (7.6.7, owner) A scroll's card: charges inside the card under its description (Charges n / max, notches, Load and Load
  full; away from the surface the same buttons greyed under a padlock, "At the surface"); one centred action bar; a worn
  scroll's card and frame fit what they hold. The swap chip sits on the skill button's upper right rim (as the camera chip
  on the net's), sized to clear the hand button.
- (7.6.8, owner) Siphon / Siphon+ / Kraken (pure; the old Ink family is gone): pressed, it waits for a tap (the world
  slowed, the view drawn out); he (or the sub) greys and fades, the game's own Humboldt / giant / colossal squid fades in
  (1.5 times larger for the sub), jets mantle first 20 / 30 / 45 m along the tapped way (stopped short of rock), ink
  puffing behind (small smoky lobes, stretched along the jet, thinning; no outline) and a soft-sided beam lighting the water
  ahead; Kraken's eyes burn amber, with sharp living specks along its arms; then it fades back into him. Nothing bites him
  meanwhile; a hunter on his trail breaks off. Dash's trail is torn water: tapered foam slivers, small tapering curls off
  its sides (Dash+), sharp specks swirling (Undertow), a cavitation trail of bubbles; no tube, rings or round glows.
- (7.6.9, owner) The rest of the cheap effects redone: the reach skills light the hoop's own rim (slivers chasing round it),
  Apex and Leviathan Heart ring it with hooked teeth of light, the swing leaves a torn streak (no round glows); Ironskin
  turns his own figure to gunmetal with a cold sheen sweeping down (Temper's pipeline); Snatch throws a sagging weighted
  line with a lead sinker and a barbed hook that glints, the bite a puff of bubbles, Talon three hooked claws of amber
  light; Shoal is real sardines (the game's own drawing) in one ragged school wheeling round him, flashing as they turn;
  Breath draws pale slivers of water streaming in to his tank; Nacre's shimmer chases round the net's rim and a lucky
  catch lets a real pearl rise (no "+1 pearl"); Eagle Eye closes real lids (feathered dark curves with lash shadows) round
  an almond of sight. Gust keeps Sprint's water streaks while he moves.
- (7.6.10, owner) The loading screen's depth gauge is set in the game's olive steel (bezel, knurling, lip, screws and needle cap), no brass.
- (7.6.11, owner) Siphon: no beam ahead and no Lighthouse beams; the water round him is lit as by a Flare (Kraken a Flare+'s light; Carnival too: light 2 and over draws the Lighthouse's sweeping beams, so only that family reaches it). Its ink is let out by distance along the whole jet, lighter and see-through, spreading wider.
- (7.6.12, owner, from a photograph) Siphon's ink is threads and veils, never clouds: from a faint knot, four long filaments wind out (dark and thick at the root, hair-fine at the tip), curling slowly as they spread and sink, torn translucent veils between them; sepia-black at low strength, let out every 1.3 m.
- (7.6.13, owner) Siphon jets 30 / 45 / 100 m at 80 m/s (a brief kick, steady speed, a brief stop; ink capped at about 40
  puffs a jet). Never a line in a skill: Snatch is a point of light darting to the fish, small ripples blooming where it
  passed and a ripple bursting round the fish (Talon larger, amber); Cast's throw line is gone. Called fish (Lure,
  Tidecall, Bloodmoon) come as small schools of one kind, each at its own place a few metres round him (exotics and
  legendaries alone), never one ball. Shoal is one school with its own momentum that trails, overtakes and sweeps round
  him, fish facing the way it swims and flashing together as it turns. Item cards carry no outline in their rarity's
  colour and the pop-up's frame is plain olive steel (nothing is boxed); a card's plate is lit faintly from within instead.
- (7.6.14, owner rated 2/10) Shoal is a small flock: each sardine its own place and speed, keeping to the school (its own loose spot, from a bell curve, never a pattern or rows), matching its heading, keeping a body's length from its neighbours, a little restless; the school follows a point drifting round him within a few metres.
- (7.6.15, owner) Shoal protects: sardines (1 strike), mackerel (2), whipnose anglers with their lit lures (4, and their bite
  drives the hunter off for 90 s instead of 40); a hunter coming in to strike him or the sub (never the thing) takes a
  mouthful of the school instead and breaks off, the school bursting open and thinning. The school has twice the room
  round each fish. Charges loaded on a scroll show as lit bone beads along the skill button's left rim (no "×N"). The swap
  chip is the camera chip's size and the skill's ring is cut away behind it. The bursts are wide, soft and long (rare 1 s
  to mythical 2.6 s), bending the water most just past the front and on beyond it, as if the water stretched.
- (7.6.23, owner) Everything for the sub is bought at the **shipyard barge** moored off the Margaret's bow (world.js `yardX`, drawn once into a picture in barge_draw.js; F/tap there, or P beside it, opens the yard page). The cabin computer no longer sells subs. The home buoy stays.
- (7.6.23) The tank room has unseen part outlines (`.tr-zone[data-z=tank|chambers|pile|bag]`) so lessons can point at its parts. A one-time tour of the tank room runs in the first trawl lesson or the first time he comes into the sub with live animals in his bag (then: drag them into the tank).

- (7.6.26, owner) Ability and Ability 2 sit on one row at the foot of the bag's two gear columns (the pet slot moved up).
  Charges load at the surface in the sub too; Load and Fill are one width; loading keeps the card open, the new notch fills
  in with a flare, and the notches glow more the fuller the scroll (full ones shine, each at its own pace); one charge spans
  the whole bar; two compared scrolls both show their charges. With a charge loaded a use spends it and no cooldown starts
  (main.js `coolAfter`); the cooldown runs only with none left. A scroll's emblem (and a Heart's seal) is saturated by its
  charges, half at none to twice at full (scrolls.js `satPixels`). Money and pearls share one plate. "A better sub is for
  sale" shows about 10 s, once. The shipyard page scrolls only up and down. Eagle Eye draws no lids; Lookout 1.6, Lookout+
  2.1, Eagle Eye 3 times the view. The camera's look-ahead eases off toward a fifth of the view and never leaves him more
  than a quarter of it away.
  Heat (7.6.26): the opening burst's lens is worked at half resolution (a quarter of the pixels).
- (7.6.27, owner) The money and pearls plate is one L-shaped piece: the money's row full width, the pearls' row only as
  wide as its own plate was, one dark well following it. A Heart's radar ripple is bright enough to see: the scope's glass
  flashes, then three bands run out to the rim over 2.4 s.
- (7.6.28, owner) Revel's and Carnival's shafts are god rays (render.js `godRay`): each one many faint wedges fanned from a
  narrow top, thin single rays inside a broad faint body, soft sides, fading in at the top and out below, broken along
  their length by slowly drifting bands, tinted toward the water's blue; two (Revel+) or three (Carnival), wide, swaying.

- **Before release**: see `docs/RELEASE.md` (remove the test shop, connect real purchases, new redeem codes).
