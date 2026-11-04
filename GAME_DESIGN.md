# Earl Diver — Game Design

A 2D, side-on ocean **exploration and survival horror** game for the browser (desktop only).
There is no goal and no win state. Earl dives, explores, catalogues what he finds, and
tries to stay out of reach of something in the water. When the run ends, it ends.

## Tone

- Realistic, intentional, never cartoonish or clip-art. Muted natural colours,
  real light attenuation (reds vanish first, the water goes blue, then black).
- Dread instead of gore or jump scares. The threat is communicated by the
  environment: the sky dimming, waves rising, fish fleeing, the water darkening,
  the torch shifting from crisp blue-white to a sick orange-red, Earl's heart rate
  climbing, the camera losing its footing.

## Earl

- A faceless modern diver: black wetsuit and hood, full-face mask with a dark
  reflective visor, single tank, long fins. About 2 m tall.
- Swim speed 4 m/s. Shift = 1.5x speed for 2x oxygen use.
- Headlamp switches on automatically below 200 m (L toggles it; light attracts the entity).
- Cannot leave the water onto the beach.

## The ocean

- 1000 m wide, 3000 m deep. Beach on the far right; the seafloor slopes down to the left.
- Generated each run (terrain detail, kelp, rocks, creatures, lanterns, pickups),
  around a fixed overall profile: beach -> seagrass -> reef -> kelp forest -> shelf
  with a shipwreck -> a sheer cliff with overhangs -> continental slope with a deep
  wreck -> abyssal plain with hydrothermal vents.
- Light: bright near the surface, deep blue by 200 m, pitch black below ~1000 m.
- Day/night cycle: 5 min day, 1 min sunset, 3 min night, 1 min sunrise.
- 183 real species (see `data/species_data.js`), each placed only in its real depth range.

## Spawn

- Earl spawns at (x 500, depth 5) beside the boat. The entity starts at (0, 0).

## Oxygen

- Shown as cylinder pressure in bar, the way divers read it: 200 bar full, 50 bar reserve,
  with a colour bar and an estimate of time left.
- Diver: 50 s of air, +15 s per deep sapphire (a larger tank). The 8 sapphires sit in fixed hiding places that form a ladder, each just
  beyond what the earlier ones let a diver reach: beach shallows (~4 m), seagrass (~14 m), kelp
  holdfasts (~29 m), a crevice at the kelp edge (~40 m), under a ledge on the shelf (~75 m), under
  the wreck's stern (~130 m), under the cliff-edge overhang (~200 m) and under a ledge on the cliff
  wall (~240 m). None deeper: a sapphire you can only reach once you no longer need air is useless.
- Below 300 m the drain grows exponentially: x30 at 1000 m.
- Below 10 % oxygen Earl panics: speed x1.5.
- Out of air is not instant death: about 15 s of air hunger follow (the view swims, doubles, greys
  and blacks out, controls drift, he slows). Reaching the surface - or the sub's air - in time
  brings him back, gasping. The same applies to a submersible whose cabin runs dry.
  Under pressure the window shrinks: ~15 s above 300 m, ~9 s at 500 m, ~3 s at 1000 m.
- Shown as a green -> yellow -> red bar under the survival timer (top right).
- Surfacing refills oxygen quickly (a few seconds, with bubbles).

## Submersible

- An old riveted bathyscaphe docked at the boat. F to enter/exit.
- Speed 1.2x Earl's. Its ballast lets it descend/ascend faster than it moves sideways.
- Oxygen 3:00 at first. Drain rises with depth relative to its rated depth.
- Rated depth 800 m. Past 1.3x rated depth, critical failure: it implodes and Earl is stranded.
- Leaving the sub at depth exposes Earl to pressure (the diver's oxygen rules apply).
- 3 upgrades at the boat: 800 -> 1300 -> 1950 -> 2700 m (each also adds oxygen).

- Hull integrity: rams and bites from large mammals damage the hull (sperm whale -40 %, orca -20 %).
  A damaged hull leaks: air drains 1 / integrity times faster. Integrity does not recover by
  surfacing. Patch it at the boat (2 iron + 2 rock, +40 %) or refit (back to 100 %).

## Wildlife

- Every animal roams its real depth range; night migrators (lanternfish, hatchetfish, squid, krill,
  viperfish, dragonfish...) rise toward the surface after dark.
- Bait schools (herring, sardine, anchovy, mackerel, pollock, krill, lanternfish) move as one body,
  part around Earl and ball up under attack. Predators hunt and eat small fish.
- Most fish flee from a fast or careless diver at 0.7-1.3x Earl's speed; a slow approach lets him
  get close enough to observe. Slow or curious animals never flee.
- Marine mammals added for the game: sperm whale, bottlenose and common dolphins, orca.

## Attacks and injury

- No health bar. Hidden injury points: swordfish/marlin/sailfish 1, great white/tiger/mako 3,
  sperm whale 5; blue and reef sharks, morays, nesting titan triggerfish and Humboldt squid 1 when
  provoked. One point heals every 15 s; 5 at once is fatal.
- Attacks are telegraphed: sharks circle, bump, then bite; billfish line up, hold still, then charge
  in a straight line; sperm whales click in the dark before lunging (below 250 m); orcas ram the sub
  only. More common in open water, at night, and when Earl is bleeding.
- Defences: hiding, a sea lantern or the necklace, a dolphin pod nearby (sharks leave), and flashing
  the lamp (L) at a charging animal at the last moment.
- Injury levels: 1 grazed, 2 wounded (blood trail draws sharks), 3 badly hurt (pulsing red edges,
  muffled hearing, more air), 4 critical (vision narrows and greys, ringing, controls drift),
  5 death: its own ending, red closing in and the heartbeat stopping, no countdown.
- The submersible protects Earl from everything except the entity and the large mammals' rams.

## Resources

Clams, mussels, rocks, kelp, iron (wreck debris), fish scales, squid tentacles, ink,
pearls (rare, in clams), glass sponge shards (deep). They are spent on sub upgrades.

## The entity

- Home range: 1500-3000 m by day, 500-2000 m at night. At the start of a run it is not hunting.
- A hidden attention meter fills when Earl disturbs the deep: being below 200 m (more the
  deeper), noise (sprinting, the sub's engine) and light below 300 m, taking things from its domain
  (deep sapphires, necklaces, lures), and being noticed by it. Below 500 m without the sub marks
  him at once. Quiet, shallow water drains the meter.
- When it fills, Earl is MARKED: a deep sound, a dark pulse, a journal line, MARKED on the monitor.
  It rises from the deep and hunts him by sound and light; hiding makes it lose him; it searches
  and every so often gets a vague fix on him.
- Depth limits: while actively chasing it can push up toward ~120 m, slowing as it rises (no hard
  line); otherwise it keeps below ~200 m. Above ~120 m Earl cannot be taken.
- The mark fades after ~60 s above 120 m.
- It is never fully seen: eyes, a faint outline, a body that shows only where a lamp falls.
- Within 200 m it shows on sonar; the dread effects (darkness, ink, torch shift, disorientation)
  belong to the deep and fade out above ~100 m.

## Items

- Sea lanterns: odd bioluminescent blobs (~1 m), procedurally placed, more common deeper.
  Within 3 m of one, the entity will not approach. They dim with use and slowly recover.
- Fangtooth necklace (E): the same protection as a lantern, carried with Earl, for a short time.
- Anglerfish lure (Q): thrown; the entity goes after its light for a while.
- Up to 3 of each.

## Ending a run

Run out of oxygen, the submersible implodes, or the entity reaches Earl:
the survival timer turns red, the screen fades to black, the last 3 seconds count
down in red, the music fades, and the game returns to the home screen.
Nothing carries over except a run log (time survived, cause, deepest depth, species found, ...).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Swim / steer |
| Shift | Faster (2x oxygen) |
| F | Interact: note a creature, collect, enter/exit sub, boat workshop |
| J | Journal |
| L | Headlamp on/off |
| Q | Throw anglerfish lure |
| E | Activate fangtooth necklace |
| Esc | Pause |
