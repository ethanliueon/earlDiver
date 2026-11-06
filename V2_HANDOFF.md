# v2.0.0 handoff (branch `v2-wip`, not merged, NOT tested in the browser yet)

Standing rules: bump js/version.js + README "Version" line every change; tell the user the version;
git pull before committing; commit trailer as usual; no model ids in commits; no Earl breathing/noises;
uncluttered artistic UI; send screenshots. Final release is **v2.0.0**, merged to main only when all is tested.

## Done on this branch (uncommitted ideas are marked TODO)
- **js/specimens.js**: new `PRICE` table (real-world dollars) for almost every species; `formulaPrice` for the rest;
  `isDeep` (Deep Sea Fish or dmin >= 200) floors price at $30 (so the deep is rare or better).
  New `RARITY` tiers by price: common < $5, uncommon < $30, rare < $200, exotic < $5,000, legendary above;
  each tier has a `spawn` weight (1 / 0.4 / 0.14 / 0.05 / 0.012). `rarityPrice` = the price; `rarityOf` derives tier.
  `tagPrice` = 0.4 x price (TODO: planned 0.25). `TAG` is now only a flag for tag-only animals.
  Salmon $50, mahi $70, sardine $0.40, anchovy $0.30, mackerel $3, tunas $90-2,500.
- Legendary (real animals, no myths): humpback anglerfish, fangtooth, black dragonfish, barreleye, gulper eel,
  blobfish, coelacanth, dumbo octopus, giant/vampire/colossal/bigfin squid, yeti crab, frilled/goblin/megamouth,
  whale shark, oarfish, sperm whale, sleeper shark.
- **js/species.js**: `GIANT_FORMS` oversizes famous deep animals (anglerfish 1.8 m, gulper 2.2 m, ...); `sp.giant`.
- **js/fauna.js**: `weightOf` multiplies by `rarityOf(sp).spawn` (cached); lighter giant/shark penalties.
- **economy.js / aquarium.js / contracts.js**: fixed prices rescaled with price x R(price), where R is the
  measured new/old catch-value ratio (24x shallow -> 150x at 3,000 m). Wing upkeep scaled the same way.

## TODO, economy (task 24)
- UPGRADES `cost` are still OLD units: make `upgradeCost` scale them (x R(old cost)); for `depth` use
  cost 20, growth ~1.158 (one depth level ~ one catch at that depth, as before). Fix `replacementPrice` to sum real costs.
- `GEAR.lowlight` price 60 was missed by the script (should be ~2,400ish).
- Remove market softening entirely: `priceOf` returns base, `sell` adds no glut, drop "flooded" text in ui.js.
- Aquarium income: `drawOf` ~0.5 x value (0.8 is too rich with new prices). Check contracts/photos scale.
- No save conversion needed: profiles are not saved between visits (only best depth).
- Sanity-check pace in the browser (first upgrades ~ one shallow dive, $20-60).

## TODO, the deep (task 25)
Append ~45 real deep species to data/species_more.js (ids from 447), mostly exotic, a few rare, e.g. threadfin
dragonfish, brownsnout spookfish, giant hatchetfish, glacier lanternfish, blob sculpin, wolftrap angler,
ghostly seadevil, sea toad, pancake batfish, daggertooth, sabertooth fish, pearleye, armoured grenadier, halosaur,
cutthroat eel, bobtail snipe eel, knifenose chimaera, pocket shark, ninja lanternshark, viper dogfish, false catshark,
gulper shark, bramble shark, Dana octopus squid, piglet squid, ram's horn squid, telescope octopus,
glowing-sucker octopus, big red jelly, giant phantom jelly, giant opossum shrimp, scaly-foot snail, vent shrimp,
deep-sea mussel, dealfish, crestfish, sea lily...

## TODO, deployed sub net (task 26)
Sub add-on bought at the boat; fires from the front of the sub; once per dive; catches up to 10 animals in its cone,
including big ones (small sharks, medium fish such as salmon/sunfish, octopuses, legendaries). The haul goes to a pile
in the tank room; drag the keepers into tanks; the rest are released. Big fish keep their size in the open tank
(and take more slots: <=1 m 1, <=2 m 2, bigger 3) but are too big for the small pressure chambers.

## TODO, large pressure tank (task 27)
A second sub chamber add-on: one large pressure tank at a set pressure, holding 3 normal fish OR 1 big/legendary fish.
Drawn in the tank room (js/tankroom.js).

## NEW requests from the user (not started)
1. **No boxes/brackets around fish (or anything) when targeting** with the net or any tool. Remove target boxes everywhere.
2. **Pressure comfort zones, from the depth a fish was caught at** (js/capture.js):
   - within 50 m up or down: healthy (no harm);
   - up to 150 m either way: stressed;
   - up to 250 m either way: dying;
   - more than 350 m either way: dead.
   (250-350 m: still dying, getting worse fast.)

## More requests from the user (not started)
3. **What the deep feels like.** Deep species are mostly *rare*, and by volume the deep is dominated by
   a small core of about 3-10 rare species (lanternfish, hatchetfish, bristlemouth, firefly squid, deep red shrimp,
   and a few like them). These should make up most of what you see down there. Exotics turn up here and there;
   finding a legendary should be a big, exciting moment (consider a special toast/sound/photo card).
   Tuning: give that rare core a much higher spawn weight than other rare deep species (e.g. a `DEEP_CORE`
   set with x5-10 weight in fauna.js `weightOf`), keep exotic ~0.05 and legendary ~0.012 or lower.
4. **Aquarium revamp: replace the current wings/visitors aquarium (js/aquarium.js, aquarium_draw.js, ui.js
   aquarium tab).** It's too complicated and doesn't add much. New design:
   - An **aquarium gallery aboard the ship, the Margaret**, built like the sub's tank room (drag and drop, same
     look and feel as js/tankroom.js).
   - It still draws visitors, but the **main payout is idle income from the fish on display**.
   - Fish keep their condition in the gallery:
     - **healthy**: full idle income;
     - **stressed**: earns less until it recovers (it recovers over time);
     - **dying**: earns a little for a while, then dies;
     - **dead**: earns nothing; dead fish can be taken out and sold (at the dead price, half).
   - Fish must be put in alive. Dying and stressed fish can be added; dead ones can't.
   - **Dead fish are drawn with X eyes** (everywhere dead fish appear: gallery, tanks, bag, haul pile).

## Ideas to decide on (proposals, NOT agreed yet; the user and Claude will pick)
Design note from the user: the game is meant to be **fun**. It is not about saving the ocean or teaching a
lesson, so don't frame features as moral "good deeds".
- **Cap aquarium idle income** so one legendary on display doesn't beat diving: e.g. 2-5 % of the fish's value
  per in-game day (earns its sale price back over 20-50 days), or pay only while the player is out at sea/diving.
- **Show a stressed fish recovering:** colour coming back, calmer swimming, so keeping it feels like a choice.
- **Deep fish need pressure slots in the gallery** (an upgrade, like the sub's chambers): mirrors the sub and
  stops the gallery filling up with only legendaries.
- **Legendary moment:** when one appears, the music quietens, a subtle lit glimpse/camera beat, and a full-page
  journal entry. Something worth a screenshot.
- **Collection sets:** bonuses for completing groups (e.g. all the deep's common rare species, every anglerfish),
  so players chase more than legendaries.
- **Net aim preview:** a faint cone while aiming the once-per-dive sub net, so the one shot feels deliberate.
- **Released catch:** throwing back a fish from the haul could give something small and fun (e.g. a tiny
  reputation boost that raises visitor numbers), not a moral reward. Or simply nothing.
- **Price board on the Margaret:** a chalkboard listing what's been caught and what each sold for, to help
  players learn the new economy.
- **Hospital bill:** 10 % of cash may be huge late game with the new prices; consider a cap.

## Aquarium: the user's latest direction (supersedes "main payout is idle income" and the income-cap idea)
The aquarium gallery on the Margaret is **for fun, not money**. Idle income stays, but it's small and not really
worth it on its own, and that's fine. What it's for:
- **Seeing your fish**, and interacting: **pet them, feed them, adjust the lighting** (e.g. dim/red light for
  deep-sea fish).
- **Fish gain value by living there** (timers count **gameplay time**):
  - a **healthy** fish that spends **5 min** in the aquarium becomes **Happy**: sells for **x1.2**;
  - **15 min after** becoming happy it earns the **Famous** tag: sells for **x2**;
  - stressed fish must recover to healthy before the happy timer starts; dying fish never get there.
- Selling from the aquarium uses these multipliers. Dead fish (X eyes) can be taken out and sold at the dead price.
Open questions: do the x1.2 and x2 stack (x2.4) or does Famous replace Happy? Does the timer keep running while
Earl is diving (yes, if "gameplay time" means any time playing)? Does feeding/petting speed up the timers?
**Decided:** Famous **stacks on top of** Happy (a happy famous fish sells for x1.2 x2 = x2.4). Famous is **not a
status** like Happy; it's a **tag like the rare forms (albino, etc.)**: permanent once earned, shown the way rare
forms are shown (js/variants.js), and it stays with the fish when sold or moved. Happy is the status (it presumably
lapses if the fish becomes stressed/dying again).

## Released aquarium fish become part of the world (user's request)
- Fish in the aquarium can be **named** by the player.
- Releasing a **Happy** (or Happy + Famous) aquarium fish back into the ocean:
  - it **can't be recaptured**;
  - it **keeps its name**;
  - it's **saved permanently** and **always spawns** in its habitat (near its home depth/area) on every dive;
  - it becomes part of the background, but the player can still **interact with it in its habitat**
    (e.g. pet/feed it, see its name);
  - a shop item, the **tag tracker**, draws a **trail leading to your released fish**.
- **Important:** right now nothing is saved between visits except the deepest depth (economy.js
  `saveProfile`/`loadProfile`). This feature needs a real persistent save, at least for the released fish
  (species, rare form, Famous tag, name, home x/depth), in localStorage. Decide whether the rest of the
  profile becomes saved too.
- Open question: what interacting with a released fish gives the player (just fun? a small buff? journal page?).
**Decided:**
- **How to release:** an aquarium fish has to be moved into the **sub's pressure tank** (small chamber or the large
  pressure tank, depending on its size), driven down to **its habitat / habitat depth**, and released there.
  (Pressure-tank rules still apply: it has to be kept at its own pressure on the way down.)
- **Saving: yes, a full persistent save.** The user plans to **publish the game**, so cash, gear, upgrades,
  journal, aquarium, named and released fish, etc. all persist (localStorage; versioned save format so later
  updates can migrate it; consider several save slots and a "new game" option).
- **New title/loading screen**, separate from the death/respawn screen: e.g. Continue / New game / save slots,
  and a short loading moment while the world generates. The death screen stays its own thing.

## Suggested plan for the overnight session (from the previous Claude, the user agreed)
This is several releases' worth of work. Do it **in order**, testing in the browser (Playwright, screenshots)
and committing + pushing to `v2-wip` after each step, so a partial night still leaves a working game.
Bump the version in js/version.js + README at each step (2.0.0-alpha.1, -alpha.2, ...; final is 2.0.0).
1. **Saves + title screen**: versioned persistent save (localStorage, save slots, New game), new
   title/loading screen separate from the death screen. Everything later depends on this.
2. **Economy**: finish task 24 (upgrade costs, lowlight price, replacement sub, no market softening at all,
   tag share), pressure comfort zones (50 / 150 / 250 / 350 m), check contracts/photos.
3. **The deep**: rare core dominates by volume, exotics occasional, legendaries an event; ~45 new species.
4. **Sub net + large pressure tank** (tasks 26, 27), big fish taking more open-tank slots.
5. **Aquarium gallery on the Margaret**: pet/feed/lighting, Happy (x1.2) and Famous tag (x2, stacks), X eyes on
   dead fish, naming, releasing via the sub's pressure tank, saved released fish, tag tracker.
6. **Polish**: no target boxes anywhere, README + GAME_DESIGN.md, screenshots, then merge to main as **v2.0.0**
   only if everything works. If the night runs out, leave `main` alone and summarise where you stopped.

**Checks before calling it done:**
- Early game: the first dive is still fun and the first upgrades are affordable after about one shallow dive ($20-60).
- Legendaries are rare but findable (a player should meet one within a reasonable number of deep dives; measure
  spawn odds with a script rather than guessing).
- Saves survive a page reload; New game really resets; an old/missing save never crashes the game.
- Performance: the extra species and giant forms don't bring back the reef/school lag (see v1.16.2).
- Ask the user before any design choice not covered in these notes; open questions are marked above.

---

# The agreed overnight plan (Claude session of 2026-11-06, agreed with the owner)

Supersedes anything above where they differ. Work happens on `v2-wip`, 2.0.0-alpha.N per step, merged to
`main` as 2.0.0 only when everything works. Progress log at the end of this file.

## alpha.1 quick fixes
No target boxes/brackets anywhere (fish or anything, any tool). Autopilot does not lock the lights (L).
The monster 0.6x as fast (7.2 m/s travel, 9 m/s burst), its red eye glow softer. Cloud glitches and
snapping. Animals never spawn inside rock or move into it.

## alpha.2 saves + title screen
As in the handoff above (versioned localStorage save, slots, New game, migration, title/loading screen
separate from the death screen). Also saved: the sub's name.

## alpha.3 economy and catching
- Finish task 24 (upgrade costs in new money, lowlight price, replacement sub, no market softening,
  contracts/photos/tag share).
- Upgrades Cat Goes Fishing style: each level costs much more and gives a bigger jump (gains ~x1.5 per
  level from tiny to big); count upgrades in steps where it makes sense; fish prices upgrade keeps its x3 max.
- Earl's tank 50 -> 200 s. The sub cabin air upgrade is removed: cabin air comes with each sub (below).
- Tag ammo: basic $5 (max 3) for common/uncommon/rare and mid-size tag-only animals under ~2 m; advanced
  $200 (max 3) for exotic, legendary, undocumented and large animals, bigger hit area, faint glow.
  Tiny animals (krill...) "too small to tag"; medium fish (mackerel, herring) taggable, pay $0.50-2.
- Animals the player can't capture show no rarity; they get a hidden tier for spawn rates only.
- Lure and necklace: not sellable, carry 1 each; the necklace only gives light (a glowstick), no
  protection, no longer an escape when taken.
- Removed items: ink, fish scales, scrap iron, rock, kelp blades, squid tentacles.
- Pressure comfort zones from the catch depth: 50 / 150 / 250 / 350 m (healthy / stressed / dying / dead
  beyond), times a tolerance: x3 gelatinous animals, x2 daily migrators (lanternfish, hatchetfish, firefly
  squid, krill, red shrimp, most squid), x1.5 no swim bladder (sharks, rays, octopus, crustaceans, sea
  cucumbers, echinoderms), x1 swim-bladder fish; deep bonus x1.5 below 1,000 m, x2 below 2,500 m; the
  higher of kind and bonus. Shown on the catch card and journal ("Pressure tolerance x2 - migrates daily").
- Hospital bill capped. A price board on the Margaret.

## alpha.4 the deep, the trench, the subs
- Map 3,000 -> 5,000 m wide: the west wall (cave) stays; everything east of the old trench shifts 2,000 m
  east; the new space is a wide trench floor ~4,800-4,950 m (swells, outcrops, dropstones) with one pit
  to 5,100 m. All hard-coded x positions moved onto one offset; every zone re-tested.
- The trench floor is the monster's lair; a quiet first-visit milestone.
- Eight subs, each depth upgrade buying the next (shop names by type):
  1 Б-7 bathyscaphe 300 m (crush ~x1.6, 150 s air) · 2 Б-7М refit 500 m (x1.55, 160 s) ·
  3 Work submersible 900 m (x1.5, 170 s; new design: yellow 1960s work sub, acrylic bow dome) ·
  4 Heavy work submersible 1,300 m (x1.45, 185 s; new: white oilfield sub, red sail) ·
  5 Research submersible 1,900 m (x1.38, 200 s; orange foam float, skids) ·
  6 Deep research submersible 2,500 m (x1.32, 225 s; new: Alvin-type) ·
  7 Titanium research submersible 3,300 m (x1.28, 260 s) · 8 Full-ocean-depth submersible 4,000 m
  (x1.25, 300 s). Relics +100 m each (4,400 m, ~x1.2). Risk window narrows on deep subs. The trench floor
  is a risk even for sub 8; the 5,100 m pit likely implodes it without relics.
- Naming: subs 1-2 keep Cyrillic lettering; from sub 3 a brass panel asks for a name (default EARL),
  painted on the hull, carried to later subs, renamable free in the shop, used in messages, kept in saves.
  "Margaret" is only ever the ship.
- Common crowd per zone (spawn weight ~5-10x other rare deep species): twilight - lanternfish,
  hatchetfish, bristlemouth, firefly squid, red shrimp, glass and strawberry squid; midnight - red shrimp,
  Atolla and helmet jellies, grenadiers, slickheads, sea cucumbers near the floor; abyss and trench -
  grenadiers, cusk-eels, tripod fish, sea pigs. Exotics occasional, legendaries an event (measure with a script).
- Legendary: ONLY humpback anglerfish, fangtooth, pelican gulper eel, barreleye, blobfish, coelacanth,
  oarfish (those exact species), each at least 1.5 m in game (giant forms; journal gives the real size).
  Everything else at realistic size (dragonfish, dumbo, vampire squid, yeti crab back to real size).
- New species: the handoff's ~45 real deep species; 5 real trench animals (abyssal grenadier, abyssal
  snailfish, highfin lizardfish, supergiant amphipod; abyssal sea pens and xenophyophores as seabed life);
  12 invented ones with a new tier/tag "Undocumented" (like exotic, ~$1,000-5,000, own badge colour,
  journal "Undocumented: no scientific record"): silvered mirrorfish, banded glow eel, canyon ember-lure
  angler, glassbone hatchetfish, nodule-armoured crab, vent skate, crowned hagfish, brine-shore cusk-eel,
  falling-star squid (3 m), silt-walking tripodfish, steadylight dragonfish, great pale snailfish (4 m,
  only the 5,100 m pit). Their drawings: js/undocumented_draw.js style, real family anatomy.
- Bristlemouth to 2,500 m. Legendary moment (music quiet, a lit glimpse, special toast/sound/photo card,
  full journal page). Size audit ~1.25x, outliers fixed. Better shared fish drawing (fins with rays, gill
  covers, lateral lines, countershading, scales) for most species.
- A fish longer than its tank is drawn shrunk to fit (tank room, gallery); its real size still sets
  value, slots and chamber fit.

## alpha.5 sub net + large pressure tank (tasks 26, 27)
N fires the sub net once per dive: up to 10 animals in a cone, sharks up to ~2.5 m, big fish, octopus,
legendaries; bigger things tear through. Loud below 200 m. Haul to a pile in the tank room. Big fish
take more open-tank slots; the large pressure tank holds 3 fish or 1 big.

## alpha.6 the Margaret and her aquarium
Helm: heavy, 5 m/s top speed, anywhere along the surface; anchor (drop/raise, chain); shop and dock
wherever she is. Traps winched aboard from the helm over the buoy. The aquarium gallery aboard as in the
handoff (pet/feed/lighting just for fun; Happy x1.2 -> Famous tag x2 stacking; X eyes; naming; release
via the sub's pressure tank; saved released fish with name + journal page; tag tracker).

## 2.0.0
Docs, screenshots, the handoff's checks, merge to main.

## Decided by the owner during planning
- Ideas taken: legendary moment, price board, hospital bill cap. Not taken: collection sets, net aim
  preview, release reward. Feeding/petting is just fun; meeting a released fish shows its name + journal page.
- No other new fish beyond the lists above.

# Progress log

## 2.0.0-alpha.1: quick fixes (tested)
- No target brackets round what a tool will go for (render.js); the prompt still names it.
- Autopilot: the running lights are forced on only while the sub drives itself empty; with Earl aboard,
  L decides (render.js `lights`).
- The monster at 0.6x pace: one `ENTITY_PACE = 0.6` applied where it moves (entity.js), so every speed
  (travel, burst, the approaches) scales; measured 7.2 m/s hunting. Its eye glow softer (monster_draw.js:
  smaller, fainter haze; same hot centre).
- Clouds: the 20-40 px jumps were the adaptive render resolution. The cloud offset was camX x screen
  width, wrapped by a tile width that follows the screen height; 0.85 - 0.05 = 0.7999.. rounds the canvas
  to 1023 x 575 (not 1024 x 576), a tiny aspect change that, multiplied by camX in the thousands, moved
  the clouds ~19 px at 1280 wide (~28 at 1920) in one frame, a few times a second while moving.
  Now the phase is a fraction of a tile in fixed reference units (clouds.js); measured worst move 2 px
  (normal drift). Also drawn as a sub-pixel repeating pattern, and the cached sky redraws when the view
  has moved more than 2 px (was 6). No extra per-frame cost of note.
- Animals never inside rock (fauna.js): a step into the seabed, a wall or a boulder is undone and the
  animal turns; if inside anyway it is lifted out; newcomers spawned in rock are lifted or dropped;
  schools get the rock check too; hidden residents in their crevice are left alone. Measured over
  30 s at six steep places: before, 96 samples inside the canyon wall (one 938 m deep in the seabed);
  after, 0 of ~63,000.

## 2.0.0-alpha.2: saves and the title screen (tested)
- economy.js: three save slots in localStorage (`earl.save.slotN` = { format: 2, game, saved, profile });
  `migrate` fills anything a save lacks from a new profile (old/partial saves load; unreadable ones show
  as damaged and can be deleted or started over, never a crash); saving is automatic (`saveProfile`
  writes within ~0.8 s; `flushSave` at once on death, quitting and leaving the page).
- A title screen (index.html #title, ui.showTitle): Continue (last slot), the slots on riveted plates
  (cash, dives, deepest, species, when), delete with a confirm, Controls, Full screen; Enter continues
  or starts a new diver. "Charting the sea" card while the world is made. The death screen stays its
  own (#menu) with a "Title screen" link; the pause menu has "Save and quit to the title". The dive log
  is kept per slot.
- Tested: new slot, buy, reload, Continue (kept), save & quit, a damaged slot, delete, an old partial save.

## 2.0.0-alpha.3: the economy (tested)
- Rarity (specimens.js): the price ladder sets the tier, except: Legendary is exactly LEGENDARY (humpback
  anglerfish 100, fangtooth 101, barreleye 104, gulper 105, blobfish 107, coelacanth 108, giant oarfish 54),
  each priced at least $5,000; any other capturable animal is capped at $4,800 (exotic); tag-only animals
  (not legendary) get a hidden tier (`hidden: true`, badge not shown) that only sets their spawn rate
  (the colossal squid is a hidden legendary). `UNDOCUMENTED` tier ready for alpha.4 (species carry `undoc`).
  Counts: 90 common, 120 uncommon, 92 rare, 46 exotic, 7 legendary, 91 hidden.
- GIANT_FORMS (species.js) only for the legendaries, each >= 1.5 m (coelacanth 2 m); the dragonfish,
  dumbo, vampire squid and yeti crab back to real size.
- Upgrades (economy.js): `statAt(id, level)`: base -> top with gains growing x1.5 a level (or `lin` +1, or
  `vals`); price `cost x growth^level` (~x1.7), or `costs`. Earl's air 50 -> 200 s in 9 levels
  (52, 55, 60, 66, 76, 92, 114, 149, 200) for $8 ... $704. The depth upgrade is the next submersible:
  300/500/900/1,300/1,900/2,500/3,300/4,000 m for $150 ... $80,000. The cabin air upgrade is gone:
  SUB_AIR by sub, 150 ... 300 s. Multipliers shown to three places so the small first levels show.
  A bag of five common reef fish ~ $90, so the first upgrades ($8-20) come after one shallow dive.
- No market softening (priceOf = base); the price board on the Margaret (P.board, the Sell tab).
  Low-light sensor $2,400. Tag share 0.25. Hospital bill capped at $1,500. Replacement sub: 30 % of the
  subs it replaces + $40.
- Tags (survey.js): ammunition, basic $5 / advanced $200, 3 of each (SUPPLIES, shown once he owns the
  tag gun). canTag: tag-only animals, and anything that swims and is 12 cm or more; smaller is "too small
  to tag" (prompt, and a dart through one says so). needsAdvanced: exotic, legendary, undocumented, or
  tag-only >= 2 m. A tag on a fish he could catch pays 25 % of its value kept to $0.50-2. Advanced
  darts: 1.8x hit radius, a faint glow. The prompt shows the tags left.
- Lure and necklace: carry 1 each, not sold. The necklace is only a light now (E on/off, a soft green
  glow; it counts as a dim light to the monster): no protection, not an escape.
- Removed pickups: rock, scrap iron, squid tentacles, ink sacs, fish scales; kelp is no longer cut.
- Pressure (capture.js, specimens.js): comfort zones ZONE 50/150/250/350 m times pressureTolerance
  (x3 gelatinous, x2 daily migrators and most squid, x1.5 no swim bladder, x1 swim-bladder fish; x1.5
  caught below 1,000 m, x2 below 2,500 m; the higher). Shown on the catch toast and the journal page.

### 2.0.0-alpha.3.1 — seabed follows the slope
- `seabedPose()` in render.js: things that lie on the floor (brain coral, shells, stars, urchins, crabs, octopus, cucumbers, flatfish...) rotate to the local slope; things that grow up (kelp, seagrass, staghorn, sea fans, sponges, anemones) stay upright and sink in a little on the downhill side.
- Applied to baked static chunks, live statics, pickups resting on the floor, and floor-walking animals near the seabed. Pose is computed once per static (cached on it) — no per-frame cost.

### Queued for the very end (after 2.0.0 works)
- Restyle the title + loading screens so they feel like the Margaret / sub tank UI (brass, rivets, gauges), not a generic menu.
- A detail pass on game assets (fish, subs, scenery) — design only, no extra per-frame cost.

### 2.0.0-alpha.3.2 — the map is 5,000 m wide (alpha.4, part 1)
- world.js: WORLD_W 5000, WORLD_D 5200, EAST 4000, new `SH = 2000`. The west wall (x < 46) is unchanged; a 2,000 m hadal trench (`TRENCH` x 70–2220, floor ~4,800–4,990 m, swells + dropstone boulders) was inserted, and everything east of the old trench moved +2,000 (seamount ~3,150, plain/vents/brine ~3,500–3,800, seep 3,960, wreck 4,110, canyon 4,385–4,495, shelf/kelp/reef/beach 4,500–5,000, the Margaret 4,512).
- `PIT` x 1180: one bowl to 5,100 m, the deepest place (beyond the best sub + relics: still implodable).
- All hard-coded x literals in fauna/entity/hud/hunters/traps/render shifted. Test scripts: reef is now x≈4945.
- The monster's lair: by day it mostly roams the trench floor (65 % of roam picks), band down to 4,950 m; it starts there.
- Quiet milestones (saved in `profile.marks`): first time on the trench floor, and the bottom of the pit.

### 2.0.0-alpha.3.3 — eight submersibles (alpha.4, part 2)
- economy.js `SUBS` (name, rating, mean crush multiple, cabin air) replaces the old `SUB_TIERS` (kept as an alias). `crushMean(rated)` interpolates 1.6 → 1.25 (and 1.2 at 4,400 m with four relics); `rollCrush` draws each dive's hidden crush multiple with a spread proportional to the margin, never past `CRUSH_CEILING` 5,080 m — so the 5,100 m pit kills every hull.
- main.js crushDepth: the risk window is 40 % of the margin (narrower on deeper hulls). Measured: best sub, no relics, median crush ~5,000 m (trench floor is a gamble); with four relics the trench floor is mostly safe; the pit never.
- earl_draw.js SUB_MARKS is now eight hulls keyed by the depth level; index checks became flags (sleek, nozzle, refit, oldSphere, tiRim, xtail). New designs: 3 yellow 1960s work sub (acrylic pilot dome), 4 white oilfield sub (red sail, tool frame), 6 Alvin-type (tall orange sail, sample basket).
- Naming: from sub 3 a brass "Name her" plate (shop overlay, `ui.askSubName`) — default EARL, saved as `profile.subName`, painted on every later hull; "rename" in the shop header is free. Subs 1–2 keep Б-7 / Б-7М.
- Fixed: subLook's ballast/rack had been swallowed by a comment (alpha.3 regression).

### 2.0.0-alpha.3.4 — 63 new species, the deep's everyday crowd (alpha.4, part 3)
- data/species_more.js ids 447–509: 43 real deep animals (handoff list + a few: lovely hatchetfish, crested bigscale, shining tubeshoulder, highfin dragonfish, snaggletooth, rattail cusk, giant scavenging amphipod, abyssal red prawn), 6 trench animals (abyssal grenadier, abyssal snailfish, highfin lizardfish, supergiant amphipod, abyssal sea pen, xenophyophore), and the 12 Undocumented (x.undoc → `sp.undoc`, own tier, price from x.price, ~$1,000–4,800).
- js/undocumented_draw.js (from the scratch designs) merged into RENDERERS. Convention reminder: creatures are drawn head toward -x (the creatures_draw header comment saying +x is wrong).
- fauna.js `CROWD` (and x.crowd): spawn multipliers for each zone's everyday animals. Crowd animals priced into Rare (specimens.js Object.assign(PRICE, …)); hidden tag-only giants now take their spawn tier from their tag value (the phantom jelly/bigfin squid had flooded the trench).
- Measured (scratchpad rates.js, groups met): twilight 83 % rare / 7 % exotic / 0.5 % undocumented / 0.1 % legendary; midnight 75 / 11 / 2 / 0.1; abyss 97 / 1.2 / 1.7; trench water and floor ~all rare (amphipods, prawns, cusk-eels, grenadiers, snailfish).
- Bristlemouth range to 2,500 m. drawHatchet redrawn (keeled silver body, tube eye, belly lights) — used by the silver hatchetfish too.

## 2.0.0-alpha.4: the deep (tested) — map, subs, species above, plus:
- The legendary moment (main.js, render.js, audio.js): the first legend within 16 m on a dive → the music falls away (musicSession stops the piece), a pale light comes up on it for ~8 s, a big toast + a hint with its real record size, a low chord (`audio.legend`). Met legends are counted in `profile.legends`.
- Size audit: fishDrawLen 1.6 → 2.0 (everything drawn 1.25× larger; real lengths still set value, slots and what a tool can hold). Line-up sheets (scratchpad lineup.js) show no outliers worth a special case. Tanks already shrink a fish to fit (`tankLen` clamps to the tank).
- Test harness note: `sub.rated` is a getter; tests must set `sub.ratedV`, and `sub.crushFor = sub.ratedV` with `crushR`, or the crush depth is re-rolled.
- Still open from alpha.4: the shared fish drawing realism pass — moved to the final asset pass.

## 2.0.0-alpha.5: the sub's net and the large pressure tank (tested)
- Add-ons (economy.js SUB_ADDONS): `subNet` "Trawl net" $1,800 and `bigTank` "Large pressure tank" $4,500.
- capture.js: `fireSubNet` (N, in the sub, once a dive; `g.subNetUsed` resets when docked), `updateSubNet` — the net pays out ahead of the bow over ~1 s into a 20 m × 9 m box that moves with the sub, takes up to 10 animals ≤ 2.5 m that can be taken alive or are legends, closes at 3.2 s. Below 200 m it disturbs the entity (0.35). The haul is pushed to `g.subTank` with `pile: true` (on the tank-room floor, out of water: −0.002 cond/s, not counted in tank places), and logged in the journal.
- Big animals take more of the open tank: `slotsOf` 1 (<0.6 m) / 2 (<1.2 m) / 3; `tankUsed` sums places, `tankFits` checks.
- Large pressure tank = chamber `BIG` (100): `bigFits` — three animals, or one ≥ 1.2 m alone. Same pressure logic as the chambers.
- tankroom.js: the heap (`drawPile`, mesh over the animals, grabbable), the steel cylinder with a window (`drawBigTank`, its fish swim, grabbable, tags below), drop targets/highlights for both, tag line "room for N more places".
- render.js: the trawl drawn in the water (warps, a brass mouth frame, mesh bag, the catch bunched in the cod end).

## 2.0.0-alpha.6: the Margaret and her gallery (tested)
- Helm (main.js): 5 m/s flat out, slow to get under way (rate 0.28) and slower to stop (0.18); `BOAT_MIN` 60 → she can go anywhere on the surface. Anchor: **G** at the helm (G's offering is skipped while at the helm). Anchored she holds and `profile.boatX` is saved — the next dive starts there; anchor up with nobody at the wheel she drifts slowly. Every dive starts anchored. Shop/dock/cradle already followed `BOAT.x`.
- Winching from the helm: traps.js `trapNear` — at the helm, a trap within 14 m of the boat can be hauled with F.
- js/gallery.js (new): the gallery aboard — each built wing a lit tank, animals swimming (sized `36 + √len·120` px, capped to the tank), names under them, ★ for Famous, dead ones belly-up with X eyes (`xEyes`, also used in the tank room). Lighting: Daylight / Dim / Red (`aquarium.light`). A brass tag per animal: name field, state + time to Happy/Famous, sale price, Pet (hearts), Feed (90 s faster recovery), Name, Sell, To the sub.
- aquarium.js: display records now carry len/cond/from/name/happyT/famT/famous; `tickGallery` (Happy after 300 s healthy, Famous 900 s later, permanent; Happy lapses below 0.7); `gallerySale` (×1.2 Happy × 2 Famous, dead 10 %). Opened from the shop's Aquarium tab ("Walk the gallery").
- Release: "To the sub" seals it into a chamber (or the large tank if ≥ 1.2 m) with `spec.aq`; in the tank room, releasing a Happy one works only within 60 m of its home depth → saved in `profile.released` and re-spawned at its spot every dive (`spawnReleased`, kept near home, `c.pet`), can't be netted/slurped/clawed/tagged, its name shown when close.
- Tag tracker (sub add-on, $900): a dotted trail to the nearest released fish with its name and distance.

## 2.0.0 (merged to main)
- README controls and "What to know" rewritten for 2.0; GAME_DESIGN.md has a "Version 2.0" summary at the top; README project layout lists the new files.
- Checks before the merge: smoke (reef, sub deep, monster hunting, X), saves (8 cases), walls (0 animals in rock at 8 places incl. trench + pit), spawn rates, sub net, helm, gallery + release, and a keyboard playthrough (title → net reef fish → sell → shop → board → dive → autopilot → pause → save & quit → continue). No errors.
- Next (queued): the title/loading screen restyle and the asset detail pass, on `v2-wip`, merged as 2.0.x.

## 2.0.1 — the title, loading and pause screens in the Margaret's style
- Title: one riveted steel panel (same recipe as the shop), "Earl the Diver" on a brass nameplate with a stencilled strapline, Continue as a brass push-button, the save slots as recessed "Divers' log" plates, stencilled links.
- Loading: a brass porthole with a depth gauge whose needle sweeps while the sea is charted.
- Pause: the same steel panel, "Paused" on a brass plate, Resume brass, the rest steel push-buttons.
- CSS only (+ small markup changes in index.html); no per-frame cost.

## 2.0.2 — detail pass on the shared fish drawing (157 species use it)
- drawFish: a darker head, light catching the upper scale rows, a silver sheen low on the flank, a fine darker outline, a shaded operculum with a light rim and a fainter preopercle, an eye socket, a curved mouth. `spiny` is now a single gill-cover spine (the old radial ring of spikes looked like a halo). All of it is baked into the cached sprites: no per-frame cost.
- Squirrelfish: long pale stripes (it was using the 'lines' pattern, which carries a black flank patch meant for another fish).

## 2.0.3 — the brackets are back (as a setting), the Margaret starts near the beach, an ocean map
- js/settings.js (new): `SETTINGS.brackets` and `SETTINGS.catchTags`, both on by default, kept in localStorage (`earl.brackets`, `earl.catchTags`). Pause menu buttons "Target brackets: on/off" and "Catch tags: on/off".
- render.js: the brackets round `g.catchTarget` restored (from before alpha.1), a little bolder (line ≥ 1.6 px), drawn only with `SETTINGS.brackets`. hud.js: the "[Space] Net the …" tag is hidden when catch tags are off and there is a catch target; other Space prompts (claw, traps) stay.
- world.js `BOAT_HOME` 4512 → 4850: the Margaret and the sub start 150 m from the east edge, over ~32 m of water at the kelp. (A save with an anchored spot still starts there.)
- docs/ocean_profile.png: a side section of the whole ocean drawn from the generator (zones, every landmark, sub ratings, the 5,080 m crush ceiling, the Margaret), with an inset of the eastern shallows.

## 2.0.4 — settings gear, no narration, the monster roams
- Settings panel (`#settings`, ui.js `toggleSettings`/`renderSettings`): Reduce flashing, Target brackets, Catch tags, Hints, Sound, and the full controls list (now with N, K/Z, G at the helm). Opened by a brass ⚙ on the title panel, in the journal header, and "⚙ Settings and controls" in the pause menu (which no longer carries the loose toggles). Esc closes it first. The title's "Controls" link is gone (the gear covers it).
- No narration while exploring (main.js): removed the toasts that commented on places or on the monster's mood — canyon current, vent heat, brine, the cave's breathing, the trench/pit milestones, the cold, "Air.", "Outside. The pressure is immense.", "Headlamp on (200 m)", "Something noticed you.", "The water feels lighter/calmer", "The feeling of being watched fades", "It has lost you", "Something bumped you", "It turns away from the light" — and the lines the game wrote into the player's journal notes on those events. Replies to the player's own actions (catches, purchases, critical air) stay.
- The monster (entity.js): a new random spawn every run anywhere across the map at 1,500-3,500 m in open water (≥ 40 m above the floor); no trench lair; day band 1,500-3,500 m, rising to 900-2,800 at night. `closeIn`: once a run, when Earl is below 100 m and it is not hunting, it jumps 500 m toward him if that still leaves it more than 1,000 m away (never into rock, above 150 m or below the floor). Tested: spawns 1,501-3,486 m, 0 bad of 400; one jump only.

## 2.0.5 — rare necklaces and lures, anywhere in their depth
- world.js `scatter`: each run, 6 fangtooth necklaces on the seabed where it lies 300-3,000 m deep, and 6 anglerfish lures where it lies 1,500-4,000 m deep, anywhere across the map, at least 120 m apart, never in rock (was 30 necklaces / 40 lures over a narrower stretch). Rarer than an exotic animal, commoner than a legend. (The 300-3,000 m seabed only exists on the slope and around the seamount, x ~2,950-4,550: the west wall drops straight past it.)

## 2.0.6
- The legendary moment is wordless now: no toast or hint; the music still falls away, the pale light still comes up, the chord still plays, `profile.legends` still counts it.
- The settings gear is an SVG shape (CSS mask) filling ~72 % of its brass button, instead of the ⚙ font glyph; title gear 40 px, journal 32 px.

## 2.0.7 — title music, loading card everywhere, smoother frames, reef fish swim higher
- Music on the title screen: the audio starts with the first key or click (browsers keep a page silent until then).
- `withLoading` (main.js): the porthole card covers every new sea (a slot, Dive / Dive again, Start a new game, Save and quit, the menu after a death) and stays up while the animals on screen are built into sprites at full speed (`warmSprites(g, 60, true)`, at most 1.5 s), so the first moments don't stutter. Measured ~0.5-1 s.
- Performance (render.js), measured with a per-method profiler (scratchpad perf.js):
  - sprite cache keyed on the full-quality scale (`spriteKey`): the adaptive quality stepping no longer throws every sprite away (it had been a feedback loop: slow → lower quality → rebuild everything → slower); same for the baked seabed chunks (`ppmB`);
  - 16 frames per swim cycle (was 32); coarser size buckets (1.4×), so one sprite set serves a species' big and small individuals; the look-ahead warming only for species within +60/-40 m, and only when frames are quick; when frames are slow, building only every third frame;
  - kelp: a blade every ~1.9 m (was 1.45), a little longer — a third fewer draws;
  - Settings → Graphics: Auto / Fast (Fast lets the resolution drop to 55 % and keeps lite mode on).
- Reef fish: day-active reef residents now swim 3-15 m above the seabed (never closer than 1.2 m to the surface), spawn there, and only horizontal distance counts as straying; at rest or hiding they still keep to their home. Measured: 41 of 57 reef fish 3 m+ above the floor (was 6 of 61), none in rock.
- Fixed: `f.act`, `f.nightR` and `f.tT` for housed animals had been swallowed by a comment (residents never rested by day/night).

## 2.0.8
- Settings panel: the brass plate and the × stay fixed on the frame; only the list below them scrolls (`.set-body`).

## 2.0.9 — inventory on B; the helm moves to V; dev X gives money
- B opens the inventory (`#inventory`, ui.js `renderInventory`, the same steel panel as the settings — those styles are shared with `:is(#settings, #inventory)`): cash and old gold coins; carried supplies (count of max); finds to sell; the catch bag (each animal: condition, depth found, value); what is in the sub (by chamber / open tank / large tank / the net's heap); equipment (tools, suit, the sub). B again, Esc, × or a click outside closes it.
- The Margaret's helm is now V (prompts, README, controls list updated).
- Developer key X: +$500,000 cash and nothing else (it used to max every upgrade).

## 2.0.10
- Inventory order: cash, the catch bag, what is in the submersible; then carried supplies, finds and equipment at the bottom.

## 2.0.11 — hull damage as patches, mended by hand; a leaner inventory
- Removed: leak sealant kits (K) and hull patch plates / wet welding (hold Z) — supplies, keys, HUD slots, shop specs, prompts.
- Hull damage (main.js `syncPatches`): every 15 % of lost hull is one patch (up to 6) at a random spot along her side, stored in `sub.patches` (sub-local units). earl_draw.js draws each: a dark dent with a dull rim, cracks, a rust streak, and a thread of bubbles leaking up.
- Mending: outside the sub, within 1.5 m of a patch (`patchNear`, `patchWorld` — mirrored by the sub's yaw as the renderer draws her), the target is `repair`: hold F for 5 s → the patch is gone and the hull +15 % (sound when the last goes). Near a patch, F mends rather than boards. The boat's paid patch still works.
- Inventory: the lure, necklace, clams and pearls are no longer listed (they show on screen already); rows with nothing in them, and empty sections, are hidden.
- The journal's controls list updated (F mending, N net, B inventory, V helm, X = +$500,000).

## 2.0.12
- Mending the hull is hold R at a damaged patch (outside the sub), not F: F always boards. R inside the sub still connects a backup air tank. Prompts, controls lists and README updated.

## 2.0.13 — "are you sure?" plates; a pared-down pause menu
- `ui.confirm(title, body, yes, no, onYes)`: a brass plate (`#confirm`) with Keep (focused, so Enter keeps) and a red button for the drastic choice; Esc or a click outside closes it; game keys are ignored while it is up.
- Title screen: each save slot has a Delete button that asks "Delete diver N?" with the save's details before deleting (was a two-click text link).
- Pause menu: Resume, Save and quit, and the brass gear in the corner; "End this dive" and "Start a new game" are quiet links that each ask first (their warnings moved into the plates, the paragraph is gone).

## 2.0.14 — contracts that scale; nothing hides out of reach
- contracts.js `payFor`: market value + a premium (30-100 % of the market, plus ~15 cents a metre of the depth the job needs), the premium capped at the next submersible's price — so a reef pearl is ~$520 (was ~$2,000 at 5-6.5× the market), while deep work pays thousands. Live jobs lean (65 %) to the deeper part of his reach. Salvage jobs: clams, mussels, pearls, glass sponge, sapphires, whalebone, nodules (the removed scrap iron / ink / tentacles are gone — those jobs could never be filled).
- No animal tucks itself into its home any more (`f.hide = false` for every resident; the "tucked into its home: wait" message and the dimmed drawing are gone). A frightened reef fish darts off like any other. Measured: 0 hidden animals while chasing across the reef.

## 2.0.15 — the shop as 14 ladders; the trawl net built in
- economy.js `TRACKS` (tTank, tFins, tBag, tBuyers · tNet, tSlurp, tTag, tCam · tHull, tEngine, tChambers, tOpen, tRack, tClaw): one ladder per tool or part (was 39 separate stats). Levels live in `profile.tlv`; `lv(P, statId)` derives a stat's level from its track (track level / track max × stat max, rounded), so every reader of stats is unchanged. A step costs the stat steps it covers (`upgradeCost(P, trackId)`), so a full ladder costs what its stats did. Old saves migrate on first read (`migrateTracks`: each track = the average progress of its old stats).
- ui.js: one row per track (lamps for its level, the price, and a sheet listing every stat it moves now → next; the hull names the next submersible). Tabs: Sell · Diver (tank, fins, bag, buyers, suits) · Tools (net, slurp gun, tag gun, camera, traps) · Sub (hull, engine, chambers, open tank, rack, claw, add-ons) · Supplies · Radio · Aquarium. `recommend()` marks one track Recommended (a deeper sub once his dives near the rating; else air or the bag while basic; else the cheapest affordable step) and puts an amber dot on its tab.
- The trawl net is no longer an add-on: every sub carries one in its bow canister (supply `trawl`, max 1, a new diver's first is free, $300 a new one); using it uses it up (no "once a dive").

## 2.0.16 — the sub's engine and ballast upgrades work again
- main.js `applySub`: `sub.speedMul` and `sub.ballast` had been swallowed by the end-of-line comment, so the Engine ladder did nothing. Split onto their own line.

## Play-test of 2.0.15 (other Claude session, new save, Playwright), for the next session to work through
Screenshots were sent to the user. Bugs:
1. Aquarium is half old, half new: the shop's Aquarium tab is still the old wings system (build Reef hall on the
   beach, upkeep, "visitors a day"; 3 fish gave 837 visitors and $271/day). The user wants the gallery aboard the
   Margaret, for fun, with only a small idle income. Retire the wings/upkeep/visitors-per-wing UI.
2. Sell screen rows say "needs the open ocean dome" (old wing refusal, ui.js ~583 `displayRefusal`).
3. A dying fish (cond 0.3) was refused "too weak to display"; the user said dying fish CAN go in (earn a little,
   then die), stressed earn less until recovered.
4. Rare forms aren't drawn in the gallery (an albino queen angelfish had the label but normal colours).
5. Toasts stack into unreadable overlapping lines (e.g. "Built..." + two "On display..." at once).
6. Target brackets are ON by default (settings.js `read` default true); the user originally asked for none:
   default it to off.
Could be better:
7. Upgrade steps are tiny (air 50 -> 52 s, swim x1 -> x1.013, fish prices +1.8 %): ladders derived from the old
   small stats. The user wanted Cat Goes Fishing style: fewer, noticeably bigger steps.
8. The deep looks empty on screen even with hundreds of animals spawned (3 cm bristlemouths are invisible at this
   zoom). Ideas: clearer photophore glow on the common deep fish, a slightly closer camera in the sub, small
   schools passing through the sub's lights.
9. The abyss's most common animal was an invented Undocumented species (Steadylight Dragonfish ~ top of the
   counts at 2,600 m). Undocumented should stay a rare surprise; a real grenadier/cusk-eel should be the everyday fish.
10. The gallery is one thin tank with a big empty black area under it: bigger tanks, a floor, gentle sway, room
    for the pet/feed/name controls.
11. Earl is ~30 px tall in the shallows: consider a slightly closer camera in shallow water.

## User request: a shop UI revamp (not started)
The shop should look less generic and more like a polished game shop. Show pictures of what you're buying:
the submersible (the current and next hull, drawn with the game's own sub drawings), the dive suits on a
figure/mannequin, the net/slurp gun/tag gun/camera as they look at their current and next level, traps, the
chambers and tanks. Keep the Margaret's brass-and-steel style; e.g. a large preview pane for the selected item
with its drawing, stats now -> next and the buy button, and a list of items on the side. Reuse the existing
canvas drawings (earl_draw.js, tools_draw.js, the sub hulls) rather than new art where possible.

## 2.0.17 — quick fixes from the play-test
- Gallery draws rare forms (albino, melanistic...) with the variant sprite, as the sea does (gallery.js `drawVariantFish`).
- Toasts: each line spaced by its own size, with a soft shadow; the same line again while up counts "×N" instead of stacking.
- Target brackets off by default (settings.js); still a setting.
- Undocumented species spawn at 0.015 (was 0.05, the same as exotics). Measured at random open-water spots:
  600 m lanternfish 79 %, hatchetfish 12 %, bristlemouth 6 %; 1,400 m bristlemouth 77 %; 2,600 m amphipods 73 %,
  abyssal red prawn 18 %, undocumented ~5 %.

## 2.1.0 — the aquarium is the gallery aboard the Margaret
- aquarium.js: no wings to build, no upkeep, nothing on the shore (render.js no longer draws the shore aquarium).
  Four tanks (`WINGS` = reef / kelp / open / deep; older saves' twilight/deep/abyss animals share the dark tank, `tankOf`).
  Room `gallerySlots(P)` = 4 + 2 x `P.galleryLv` (steps `GALLERY_STEPS` $200 ... $150,000, max 20).
- `displayRefusal`: already in / dead / full (no more "needs the open ocean dome"). Dying animals can go in.
- `tickGallery`: below 0.3 an animal fades (-0.0007/s) and dies; 0.3+ recovers (faster when fed).
- Income: `earnsOf` = 2 % of value x Happy/Famous a day, x0.5 stressed, x0.25 dying, 0 dead; visitors cosmetic.
- ui.js Aquarium tab: summary, Walk the gallery, one grid of who's aboard with their state, "More room" card.
- gallery.js: all four tanks always shown, each with its own water and furniture (coral, kelp, bubbles, dark motes).

## 2.2.0 — shorter ladders, bigger steps
- economy.js: most tracks halved (Air tank 9→5, Fins 10→5, Buyers 10→5, Net 8→5, Slurp 8→4, Tag 8→5, Camera 8→5,
  Engine 10→5, Chambers 8→4, Claw 8→5; Bag, Open tank, Rack, Hull unchanged). Each step covers ~2 stat levels at their
  summed price, so a full ladder costs the same. GAIN 1.5 → 1.12, so the first steps are felt too
  (air 50 → 72 → 99 → 114 → 152 → 200 s; fish prices +24 % → +55 % → +93 % → +140 % → +200 %).
- Saves from before: `rescaleTracks` keeps each ladder's progress (OLD_TRACK_MAX), marked by `P.tlvV = 2`.

## 2.3.0 — the shop's showcase window
- js/showcase.js: `previewOf(key, P)` / `drawShowcase(canvas, pv, t)`. On the Diver, Tools and Sub tabs a window at the
  top draws the selected item with the game's own drawings, gently moving: the sub as it is now and as the next step
  makes it (next hull, more blades on the prop, chambers...; `subLook` of the profile one step up), the net/slurp/tag/
  camera at their current and next look (`toolIcon`), Earl in the suit he wears and in the one selected, traps.
  Beside it: name, line, figures and the buy button (copied from the row). Click any row to show it there; the
  recommended item is shown first.
- The shop panel is wider (760 px) to fit it.

## 2.3.1 — a livelier deep, a closer camera
- fauna.js: more groups in the deep (6 at 200-600 m, 5 to 1,200, 4 to 2,500, 3 below; open water thins only the
  shallows); bait schools down to 1,600 m; in the deep (camera below 300 m) groups start 3-14 m off the edge of the view
  and within its middle height, so they drift through the lights. Measured with the sub still at 1,400 m: 7-8 animals
  in view after a few seconds (was 3-4).
- render.js: school photophores on every second fish (was every third), a little brighter and larger.
- Camera: the diver view is 22 m across above 40 m (26 m by 120 m; was 26 everywhere); the sub view 46 m near the
  surface to 38 m below 400 m (was 46).

## 2.3.2 — no light-from-above shading on the animals
- render.js: removed the rim-and-belly shading (the live pass in `layerEnd`, the baked rim overlay in `drawCached`,
  the baked belly shade in `buildFrame`). It popped in and out around whatever was drawn live, and as fish crossed
  the size where schools stop being simple shapes. The water-colour veil stays.

## 2.3.4 — the gallery is one big tank
- gallery.js: a single large tank in ordinary light (Daylight / Dim / Red still change it): every animal together,
  no temperature or depth zones; a sand floor, a rock, a tuft of seagrass in one corner, bubbles. Animals of the sand
  (crabs, lobsters, starfish) stay on it and creep; floor-swimmers keep low; the rest swim anywhere.
  (aquarium.js still files each animal under a zone, but nothing shows it now.)

## 2.3.5 — the trawl net under the sub; a light mast
- capture.js `NETS_SUB`: a beginner trawl ($50: holds 6, fish to 1 m, 2 m mouth, tears 70 % on anything bigger,
  15 % slip out at closing) and an advanced trawl ($400: holds 10, to 2.5 m, 3.5 m mouth, tears 30 %, 3 % slip).
  One net in the hatch at a time (`g.items.net`, saved as `P.items.net`; a new diver starts with a beginner net);
  each is used up in one haul. Buying the other one asks before replacing (ui.confirm). Sold on the Supplies tab.
- Phases (`g.subNet.phase`): drop (1.5 s, from the belly hatch, the mouth opening as weights and floats pull it
  apart) → tow (up to 8 s; it trails behind and below; it only fishes while the sub moves, the mouth sagging shut
  when she stops) → purse (N again or time: the drawstring closes it, a few slip out) → haul (the winch brings it
  up into the hatch; the catch goes to the tank-room heap). A too-big animal may tear it: the net is lost, its catch
  swims free, the net shown in rags.
- HUD: an "N" slot in the sub showing NET / BIG NET / OUT · N CLOSES / HAULING / TORN / NO NET.
- A light mast (sub add-on, $1,500, `addons.mast`): a pole aft of the tower with a floodlight, a wide flood forward
  and down with the lights on.

## 2.3.6 — bigger nets; the light mast on every sub
- Trawl mouths 3.2 m (beginner) and 5.2 m (advanced) tall, catching 3 m either side of the mouth; the net trails a
  little further back for the bigger one.
- The light mast is part of every sub (no longer an add-on): `subLook().mast` is always true.

## 2.4.0 — aboard the Margaret
- main.js (`DECK_STATIONS`, `boardDeck`, `deckInput`, `placeOnDeck`, `useStation`): a dive starts on deck at the top of
  the stern ladder. F at the ladder climbs down (a short animation) into the water; swimming back, F beside the stern
  climbs up. On deck A / D walk; the nearest station's name shows, F uses it: stern ladder · sub cradle (Sub tab) · helm
  (outside, steer; W/S steps away) · sorting table (Sell tab) · cabin door · radio (Radio tab) · gallery hatch
  (gallery) · dive locker (Diver tab). Tab or U: a list of stations (ui.stationMenu). Earl drawn standing (1.7 m)
  with his tools stowed; the camera eases in to 15 m across.
- js/cabin.js: the cabin, its own screen (#cabin): wood panelling, a porthole on the rocking sea, a lamp, a chart, the
  old green-screen computer on a desk. A / D walk, E at the desk opens the catalog (the shop's Tools tab for now),
  E at the door / Esc goes back out. The shop draws over the cabin (#workshop z-index 40).
- The U shop popup only works from the docked sub now; swimming by the boat, U says to climb aboard.

## 2.4.1 — boots aboard, a furnished cabin, the game's own buttons
- earl_draw.js: `gear.land` draws rubber deck boots instead of fins; `gear.noTank` leaves the tank off. On deck he
  wears boots (fins only on the ladder); in the cabin, boots and no tank.
- cabin.js: a working boat's cabin: tongue-and-groove panelling, beams, a pipe and cable run, a rubber mat, the door
  with daylight round it, oilskins and a sou'wester on a hook, a bunk under the porthole (dark at night), a photo of
  the Margaret, a brass clock and barometer, a galley (gimballed stove, a steaming kettle, mugs and jars behind a
  fiddle rail), the fish chart, a swinging lamp, the desk with the green-screen computer, a desk lamp and a mug, a
  fuse panel, a life jacket and a fire extinguisher. Hanging things swing with the boat's roll.
- css (end of style.css): buy buttons are manila cargo tags with a brass eyelet; big actions are oxblood enamel signs;
  rarity and "Recommended" are embossed label-maker tape; name plates (shop, title, rooms) are aged brushed brass.

## 2.4.2 — a tidier deck, a lit cabin
- Aboard, the HUD shows only cash and the contracts list: no depth, air or tool bar. The floating station
  names are gone; the one prompt at the bottom says what F does.
- Off the boat: walk past either end of the deck and Earl jumps in (an arc out, a splash). On: F by her side
  ("F  Climb aboard"); the ladder station and the sorting table are gone.
- U in the water by the boat opens the sell screen alone (its tab bar hidden). Stations open only their own
  tab: the cradle the sub, the radio the radio, the locker the diver; the cabin computer the catalog tabs.
- Contracts: the radio lists jobs with a "Take it" button. Taken jobs (saved in `profile.taken`) show on the
  right of the screen, ticked when the goods are aboard, and only taken jobs are paid on selling.
- Earl's boots faced backwards on deck (the shin frame is flipped): fixed. Aboard he has no hood, mask or tank:
  a bare head, greying, the hood rolled at his neck.
- The cabin: the brass instruction plate is gone (the F prompt alone). A procedural wood grain (boards, knots,
  bevels; floor boards with butt joints) is baked once per window size; the free texture sites were blocked
  from this environment, so the grain is drawn, in the boat's own colours. A light map multiplies over the
  room: the swinging lamp's pool, porthole and door daylight (by time of day), the screen and desk lamp; soft
  shadows cast away from the lamp, contact shadows, corner shading, brass glints, a kettle with a spout.

## 2.4.3 — the radio: accept a contract, new contracts every three hours
- The radio's button reads "Accept contract" (was "Take it"); an accepted one is marked "accepted".
- The Better radio is no longer sold. Everyone has four contracts (a save that bought it keeps five).
- "New contracts" under the list: free once every three hours of real time (`profile.refreshAt`,
  `REFRESH_MS` in contracts.js). It replaces the contracts not accepted; the accepted ones stay. While it
  waits, the line reads "New contracts in 2 h 14 min".

## 2.5.0 — a clear deck, a ladder, a walk, and the wheelhouse in the cabin
- The deck stations are gone (the locker, the radio box, the helm stand, the sorting table, the gallery
  hatch): they were drawn outside the boat's own rocking (`boatRock`) and did nothing on their own. The deck
  has one thing to use: the wheelhouse door, "F  Enter".
- The boat's geometry is shared from earl_draw.js: `BOAT_U` (0.14 m a unit), `deckLine(x)` (the sheer),
  `BOAT_LADDER`, `BOAT_DOOR`, `boatRock(t)`. render.js keeps `boatFrame` (her screen origin and angle) and
  draws Earl aboard in it (`g.aboard.lx/ly`), so he rocks with her and stands on her deck line.
- A boarding ladder hangs over her side (drawn in drawBoat). F near it: he takes hold, climbs hand over
  hand (`gear.climb` in drawEarl: knees up, hands reaching) and steps onto the deck. On deck he walks
  (`gear.walk`: thighs swing, knees bend on the swing, arms swing against the legs).
- The cabin is 1.45 screens wide; the view follows him. To the right: the radio on its shelf, three front
  windows on the sea, the wheel on its console (with a binnacle and throttle) under a second lamp. A hatch in
  the floor goes down to the gallery. Stations: door, hatch, computer (catalog + the sub's yard tab), radio,
  wheel. Leaving the wheel (W) puts him back at it in the cabin.
- The catch toast is just the animal's name in its rarity's colour (plus "hurt" etc. when it is).

## 2.5.1 — repairs, docking
- The hull's damage shows as holes of 30 % each, three at most (`PATCH_SHARE` 0.3). A new hole says "The sub
  needs repairs" (and once, a hint). Near the sub: "The sub needs repairs: swim to a hole"; at one: "Hold R
  Repair". Repairing is wet welding: the arc and glow at the hole (`g.welding` = its point), falling sparks,
  a crackle, the hiss, the rod's knocks and a stream of bubbles.
- Leaving the sub no longer docks it. When the Margaret gets under way at the wheel, a sub alongside
  (within 16 m of the cradle) is lifted into it; one still out keeps her where she is ("bring it alongside
  first (hold C to send it home)"). Moving a gallery animal to the sub needs it alongside, not docked.

## 2.5.2 — footsteps, the view from the wheel, the net light
- Footsteps on deck (`audio.footstep`, each foot as the stride's phase passes π) and a ring on each rung of
  the ladder (`audio.rung`).
- At the wheel the camera pulls back to 36 m across, framing the whole Margaret and the sub in her cradle,
  and leads a little the way she is going.
- The trawl's work lamp: low on the sub's stern, aimed down the cables at the net's mouth; it shines only
  while the net is out and the sub's lights are on (L). Drawn in the light map, with haze and motes.
