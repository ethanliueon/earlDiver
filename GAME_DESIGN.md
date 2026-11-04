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

- Diver: 50 s, +15 s per deep sapphire (8 sapphires at fixed locations on the seafloor).
- Below 300 m the drain grows exponentially: x30 at 1000 m.
- Below 10 % oxygen Earl panics: speed x1.5.
- Shown as a green -> yellow -> red bar under the survival timer (top right).
- Surfacing refills oxygen quickly (a few seconds, with bubbles).

## Submersible

- An old riveted bathyscaphe docked at the boat. F to enter/exit.
- Speed 1.2x Earl's. Its ballast lets it descend/ascend faster than it moves sideways.
- Oxygen 3:00 at first. Drain rises with depth relative to its rated depth.
- Rated depth 800 m. Past 1.3x rated depth, critical failure: it implodes and Earl is stranded.
- Leaving the sub at depth exposes Earl to pressure (the diver's oxygen rules apply).
- 3 upgrades at the boat: 800 -> 1300 -> 1950 -> 2700 m (each also adds oxygen).

## Resources

Clams, mussels, rocks, kelp, iron (wreck debris), fish scales, squid tentacles, ink,
pearls (rare, in clams), glass sponge shards (deep). They are spent on sub upgrades.

## The entity

- Never fully seen: at most two glowing eyes and a faint, inhuman outline.
- 1.5x Earl's swim speed. It never kills in a fight; if it reaches Earl, the run ends.
- It hunts by sound and light: sprinting, the submersible and lights carry far.
  Hiding in kelp or under rock overhangs, moving slowly with the light off, makes it lose track.
  It then searches around the last place it sensed Earl, and every so often gets a vague
  sense of where he is, so it always comes back.
- Within 500 m: waves and ripples at the surface; if it is shallow, day turns to night.
- Within 200 m: it appears on the radar on the right-hand monitor and the dread effects begin.
- Within 50 m: heavy disorientation.
- Diving below 500 m without the submersible: it instantly appears 500 m directly below Earl.

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
