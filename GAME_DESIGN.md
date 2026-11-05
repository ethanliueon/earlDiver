# Earl the Diver — Game Design

A 2D, side-on ocean **diving, collecting and survival horror** game for the desktop browser.
Earl makes a living from the sea: he catches live animals, tags and photographs the big ones,
salvages wrecks, sells it all at his boat, and spends the money on gear that takes him deeper.
The valuable things are deep, and going deep wakes something that lives there.
There is no end: the long goal is an aquarium on the shore with one of everything in it.

`docs/PLAN.md` is the plan this was built from; `docs/DEV_NOTES.md` covers testing.

## Sound

The music is not always on. In a dive it comes in now and then when things are calm (a quiet spell,
a good sale, a rare catch, a new aquarium wing), plays a few minutes and fades; anything
frightening (the entity near, being marked, an attack, no air) stops it at once.

## Tone

- Realistic, intentional, never cartoonish. Muted natural colours, real light attenuation
  (reds vanish first, the water goes blue, then black). Gear is drawn as real gear.
- Dread instead of gore or jump scares: the water darkening, the torch turning orange-red,
  fish fleeing, Earl's heart rate climbing, the camera losing its footing.

## A game, a dive

- **Nothing is saved between visits.** Every page load is a new game; only the deepest depth
  ever reached is remembered.
- A **dive** is one life in one generated ocean. Pickups (salvage, clams, pearls, sapphires,
  lanterns, lures, necklaces) do not come back during a dive; fish keep coming.
- **Death** costs everything not yet sold (bag, sub tank, traps, tag data, photos) and a hospital
  bill of 10 % of cash; if the entity took him, his lures and necklaces too. Within the same game,
  cash, gear, the journal and the aquarium carry on to the next dive, in a new ocean.
- The pause menu ends a dive (unsold catch lost, no bill) or starts a new game.

## Earl

- A faceless modern diver, about 1 m from head to fin-tips. Swims at 2.8 m/s; Shift is 1.3x (upgradable) for
  twice the air. Headlamp on below 200 m or in the dark (L).
- Air is the main limit: 50 s at first, bigger tanks at the boat (up to a 300 s rebreather that
  makes no bubbles). Below 300 m the drain grows exponentially (x30 at 1,000 m). Out of air is a
  few seconds of air hunger, shorter under pressure, then death.
- Salvage has weight: past 10 kg he slows down and breathes harder.
- No health bar: hidden injury points (bites, rams, charges), shown through the screen and sound.

## The ocean

- 1,000 m wide, 3,000 m deep, generated each dive around a fixed profile: beach, seagrass and reef,
  kelp forest, a shelf wreck, a cliff with overhangs, a slope with a deep wreck, an abyssal plain
  with vents. A 10-minute day/night cycle.
- 183 real species, each only in its real depth range and habitat. Fish are drawn at 1.6x life
  size so their sizes read. Bait schools move as one body.

## Earning money

All of it is paid at the boat (U at the surface by the *Margaret*), on a typed receipt.

- **Rarity.** Every species is common (grey), uncommon (green), rare (blue), exotic (purple) or
  legendary (orange-gold), from how scarce and remarkable it is, and pays by its rarity: about
  3-25 cents, 30 cents-$1.20, $1.50-5, $6-20 and $30-80. Size, condition and rare forms adjust it;
  the Fish prices upgrade (+5 % a level) raises everything live, tagged or photographed.
- **Live animals** for the aquarium buyer.
  Condition matters: handling, time in the bag and coming up too fast (barotrauma) all cost.
- **Tags** for the research program on animals too big to bring up (a swordfish pays $100).
- **Photographs** for the institute: the first picture of each species and each rare form.
- **Salvage and valuables**: clams, mussels, scrap iron, ink, glass sponge, pearls, deep sapphires.
- **Radio contracts**: three (five with a better radio) jobs per dive that pay well over market.
- Each kind of thing floods its market as it is sold; prices recover over a few minutes.

## Upgrades

An upgrades game: every stat is levelled one small step at a time, each step a little dearer than
the last (about x1.3-1.4 per level, starting from 50 cents to a few dollars). Diver: air, swim
speed, sprint, bag space, fish prices, salvage prices. Net: size (from 45 cm), reach, swing speed, catch odds, gentle mesh. Slurp gun,
tag gun, camera and claw: their own stats once bought. Submersible: depth rating (+50 m a level,
400 m to 3,000 m), cabin air, engine, specimen tank. Gear itself (slurp gun, tag gun, camera,
claw, low-light sensor, canisters, traps, radio, sub add-ons, aquarium wings) is bought once.
Tools change their look as they are levelled (the hand net grows into a pro capture net).

## Catching

- 1 **net** (four, from a hand net for fish up to 45 cm to a 1.1 m pro capture net) and
  2 **slurp gun**: stats are reach, speed, the biggest animal, catch chance and harm. A slow approach
  lets him sweep from just outside a fish's comfort zone.
- 3 **tag gun** (pole tagger, pneumatic, satellite x2 pay) and 4 **camera** (compact, housed with
  strobes, low-light without flash): aim with the mouse. A missed dart can provoke a shark; a flash
  in the deep is seen.
- 5 **traps**: set on the bottom, a line to a buoy; they fill with crustaceans, octopus, eels and
  bottom fish. Haul from the buoy or empty underwater. The deep trap's lit bait draws the entity.
- **Sub arm**: from inside the sub, reach for an animal up to a metre long and time the grip.
- Catches go in a belt bag (3/5/8) and move into the sub's tank when he boards (4/8/12).

## Rare forms

Once a species has been caught or tagged, 1 in 20 of its kind are rare: giant (x2), albino (x2.5),
golden (x3), melanistic (x3), abnormal (x3, swims wrong) and crimson (x5, glows red, only below
200 m and likelier near the entity). Only bigger, solitary fish have rare forms.

## The submersible

- An old riveted bathyscaphe at the boat (F to board, hold F to leave). Cruises at 3.4 m/s
  (Engine upgrades), dives no faster, rises 1.2x faster. Rated 400 m at first,
  refits to 3,000 m. Past 1.3x its rating it implodes; a replacement can be bought.
- C calls it: it drives itself to Earl, routing around rock, and stops beside him; never below its
  rating. Hold C to send it home. Its engine is heard in the deep.
- C from inside: autopilot home, on 0.8x air. Steering, a hit to the hull, an attack starting or
  the entity coming near drop it out of autopilot.
- Hull damage from whales and orcas leaks air; patch it at the boat. If the cabin runs out of air,
  Earl bails out at once onto his own tank; an empty sub can't be boarded below the surface, and
  airs out again at the surface or the boat.
- A button under the journal icon shows what C does right now (call the sub, or the autopilot home).
- Rarely, between 120 and 1,600 m, a vast dim shape hangs in the water 20-30 m off, drifting, with
  a distant call: the thing in the deep, long before it notices him. Swim toward it and it is gone.
- The claw: three arms (claw arm 3 m / 1 m / slow, hydraulic 4.5 m / 1.4 m, heavy-lift 6 m / 2 m /
  fast), each with a wider grip window. Add-ons: recall unit, quiet engine, bigger specimen tanks.

## The aquarium

- Built from the boat, seen on the far shore. Six wings in order: reef hall, kelp tower,
  open ocean dome, twilight gallery, deep-sea gallery, and an abyss tank only for animals caught
  below 2,500 m.
- Live animals can be kept for display instead of sold; each species and each rare form is a slot.
  Visitors pay every 10 minutes of play by the value of the collection; wings in use cost a
  little to run.

## The entity

- Lives at 1,500-3,000 m by day, 500-2,000 m at night. A hidden attention meter fills when Earl
  disturbs the deep: depth, noise (sprinting, engines, the empty sub on autopilot), light, flashes,
  taking things from its domain, crimson animals, deep traps. Below 500 m without the sub marks him
  at once.
- Marked, it hunts by sound and light; hiding in kelp or under overhangs loses it. It cannot reach
  him above ~120 m. Good deeds calm it: freeing animals from nets, planting coral, offering a lure
  or necklace back to the deep (G). Sea lanterns and the necklace keep it away; a lure distracts it.
- It is never fully seen, except once: the first time Earl reaches the bottom of the ocean.

## Other animals

Sharks circle and bite, billfish line up and charge, sperm whales click then lunge in the deep,
orcas ram the sub. All are telegraphed; dolphins nearby make sharks leave; flashing the lamp at a
charging animal makes it swerve.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows, mouse | Swim / steer; the lamp follows the cursor |
| Shift | Faster (2x air) |
| F / hold F | Interact (observe, collect, board, haul a trap) / leave the sub |
| 1-5, Space | Net, slurp gun, tag gun, camera, traps; Space uses it (in the sub: the arm) |
| C / hold C | Call the sub / send it home |
| U | The boat: sell, buy, radio, aquarium |
| J | Journal |
| L, Q, E, G | Lights, throw a lure, wear a necklace, offer something to the deep |
| H | Hints on / off |
| Esc, M | Pause, mute |
