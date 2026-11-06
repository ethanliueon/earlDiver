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
