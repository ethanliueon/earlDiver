# Earl the Diver — Game Design

A 2D, side-on ocean **diving, collecting and survival horror** game for the desktop browser.
Earl makes a living from the sea: he catches live animals, tags and photographs the big ones,
salvages wrecks, sells it all at his boat, and spends the money on gear that takes him deeper.
The valuable things are deep, and going deep wakes something that lives there.
There is no end: the long goal is an aquarium on the shore with one of everything in it.

`docs/PLAN.md` is the plan this was built from; `docs/DEV_NOTES.md` covers testing.

## Sound

The music comes in short pieces (30-60 s, then a very slow fade). It always plays at the start of
a dive and on getting back to the boat, and on good moments (a sale, a rare catch, a new wing), but
never restarts a piece already playing. Stress (the entity near, marked, an attack, no air, hurt,
below 300 m outside the sub) stops it, and nothing starts it for 15 s after. In the quiet after a
piece, from one minute on, it has a chance every 30 s (10 %, 20 %, 35 %, 45 %, then 50 %), raised
by a hidden calm meter that fills with peaceful catches, sales and photos.

Recorded effects (CC0, see the README): water lapping, softly, only while air is going in at the
surface (for as long as the refill takes, fading as the tank fills), now and then
a gull by day; a plop as an animal goes into a chamber, a splash into the open tank; the hull
creaking past its rating (now and then: every 10-16 s just past it, every 4-7 s far past it, about
once a second while it fails) and the implosion;
soft clicks and a hover tick for the menus, a soft page turn as the journal opens (the other
screens open silently), coins for a sale. Nothing of Earl himself
is recorded.

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

- A faceless modern diver, about 1 m from head to fin-tips. Swims at 1.7 m/s; Shift is 1.5x (upgradable) for
  twice the air. Headlamp on below 200 m or in the dark (L).
- Air is the main limit: 50 s at first, bigger tanks at the boat (up to a 300 s rebreather that
  makes no bubbles). Below 300 m the drain grows exponentially (x30 at 1,000 m). Out of air is a
  few seconds of air hunger, shorter under pressure, then death.
- Salvage has weight: past 10 kg he slows down and breathes harder.
- No health bar: hidden injury points (bites, rams, charges), shown through the screen and sound.

## The ocean

- 3,000 m wide, 4,000 m deep, generated each dive around a fixed profile. East to west: the beach,
  seagrass and reef, kelp forest, a shelf wreck, the shelf edge (where the boat starts), a submarine
  canyon cut into it, the continental slope with a deep wreck at ~1,800 m, the abyssal plain with a
  vent field, a seamount rising from the plain to ~300 m (reef life on its top), the trench at
  4,000 m, and a sheer west wall with a reef cap at the surface and a cave hollowed into it at
  ~1,800 m. A 10-minute day/night cycle.
- The boat (the Margaret) can be driven: B at the boat takes the helm, A / D drive her along the
  surface from 1,000 m off the west wall to the shallows off the beach. A docked sub goes with her.
  Every dive starts with her back over the shelf edge.
- The water is drawn between the eye and everything in it: animals take on its colour and haze
  (reds and yellows go first, deeper), get a soft rim of light from above and a shaded belly, and
  catch the sun's dapples near the surface. Slow clouds of murk drift in the water; far off in the
  deep, tiny lights come and go. The bottom has a rock and sediment texture pinned to the world and
  small life by zone: pebbles, shells, urchins and sand ripples in the shallows; burrows, worm tubes
  and anemones on the shelf; brittle stars, sea pens and glass sponges on the slope; sea pigs,
  xenophyophores, tracks and stalked crinoids on the abyssal plain. Rocks have cracks.
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

## Suits

Bought once at the boat, one worn at a time (changed at the boat): wetsuit (start); freediving skin
(+15 % speed, +10 % air use); drysuit (pressure from 400 m, -5 % speed, warm); chain-mail shark suit
(bites do one less injury, -12 % speed); rebreather suit (-25 % air use, no bubbles so the entity
hears less, -5 % speed); atmospheric hardsuit (no pressure to 700 m, -10 % air use, turns bites,
-40 % speed). Each is drawn on Earl.

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
- From inside the sub, things within reach in the water are still offered (collect, observe, haul a
  trap). Its cabin is at surface pressure, so the pressure and the entity's sway, blur and double
  vision only ever happen in the water.
- Catches (the net's and the arm's) go in the catch bag (3/5/8). Nothing moves by itself: in the
  tank room (T) drag each one into a chamber or the open tank (4/8/12).

## Rare forms

Once a species has been caught or tagged, 1 in 20 of its kind are rare: giant (x2), albino (x2.5),
golden (x3), melanistic (x3), abnormal (x3, swims wrong) and crimson (x5, glows red, only below
200 m and likelier near the entity). Only bigger, solitary fish have rare forms.

## The submersible

- An old riveted bathyscaphe at the boat (F to board, hold F to leave). Cruises at 3.4 m/s
  (Engine upgrades), dives no faster, rises 1.2x faster. Rated 300 m at first,
  refits to 4,050 m, 75 m at a time. Ballast upgrades make it dive and rise faster. Past 1.2x its rating the hull groans (and creaks ever faster); past 1.5x it can
  give at any moment (1 in 20 a second at 1.5x, about 1 in 3 at 1.75x). When it starts to go there are
  3.5 s of loud creaking and shaking: climb 6 m (or back above 1.45x) and it holds. If not, it
  implodes with Earl inside: the hull folds in for a fifth of a second, a white flash, the gas
  crushed to a point and thrown out as a cloud with a shock front, wreckage scattering, then the dark
  and, in silence, the cause. The sub is lost; a replacement can be bought.
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

(Frenzies, timed lucky streaks, were removed in v1.15.1.)

## The deep places

- Cold: below 200 m the water is near freezing. Without a warm suit (drysuit or hardsuit) Earl uses
  up to 35 % more air, growing with depth (full at 1,000 m).
- The canyon: below its rim (~1,000 m) a current pours down the canyon toward the deep, pushing
  Earl (and the sub, half as hard). It can be swum against.
- The vent field (~3,300 m): the water over a chimney scalds Earl (one injury every 2 s, armour
  does not help) and slowly cooks the sub's hull.
- The brine pool (~3,250 m): a lake under the sea, heavier than seawater. The sub floats on it; Earl
  drowns in it within 3 seconds.
- Manganese nodules lie all over the abyssal plain ($3 each, heavy). The whale fall on the plain
  has whalebone to take ($5) and three times the chance of rare forms around it; the cold seep on
  the rise (a terrace of mussels, bacterial mats and methane bubbles) has clams that often hold
  pearls, and twice the chance of rare forms.

## Old gold coins

A second currency, only from the deep, never turned into cash. Every live animal caught below
500 m pays coins when it is sold or handed to a contract (1 a head, 2 below 1,500 m, 3 below
2,500 m, one more for a rare form); every deep sapphire sold pays 1; the old one pays some in every
trade (the same, plus 1 for her craving). Coins are kept through death. They buy her wares, the
sub's depth refits past 2,000 m (1 coin each to 2,600 m, 2 to 3,200 m, 3 to 3,800 m, then 4, on top
of the cash) and the abyss tank (10 coins). Shown as a small stack at the end of the slot row, and
beside the cash at the boat and in the cave.

Her wares: an old lure (2 coins, up to 3: burns 25 s instead of 10, thrown first with Q); her
blessing (2 coins, this dive: the entity notices you half as fast); a sapphire eye (8 coins, kept:
sapphires within 150 m show on the sonar); a pressure relic (5 coins, up to 4: the sub is rated
100 m deeper each).

## Pressure, and the tank room

Every animal has the pressure it lives at (its home depth: where it was caught, or where it has
been slowly brought up to). What hurts it is the gap between that and the pressure it is under: in
the bag, Earl's depth; in the open tank, the sub's; in a pressure chamber, what the chamber holds.
Up to 150 m short, it lives, more stressed the bigger the gap (its condition sinks toward a ceiling,
down to 'weak' at 150 m). Past 150 m it is dying, slowly at first and faster the bigger the gap.
So a shallow animal can never die of the trip up, and a deep one dies unless it is in a chamber.
Nothing protects an animal in Earl's net: the bag is at his depth. When one starts to feel the climb
(40 m short) a warning says to get it into one of the sub's chambers; when it starts dying (150 m
short) a second one says so, and its dot in the bag row pulses red. In the tank room the bag hangs
on its hook with its animals visible through the mesh and their tags on a cord below it; a rare
form is written on the tag ("rare form: albino").

T in the sub opens the back of the sub, full screen: two steel compartments joined by a round
hatch (click it, or the arrow keys). The walls are riveted steel plates with weld seams and rust
weeping from the rivets, a deck grating underfoot and a caged lamp overhead; nothing is a UI panel.

The chamber room: pressure chambers strapped to the bulkhead, drawn after the SubCAS chambers
fisheries scientists use (a clear blue acrylic cylinder under a black head, a gauge, a ball valve, a
bleed tap, a wrench handle, hose clamps and a little logger inside), a pipe run feeding them, empty
brackets where more will go, and a porthole onto the water outside (darker the deeper). You start
with one chamber and buy up to four more (Pressure chambers). A chamber's rating (Chamber rating:
400 m, 150 m more per level) is how much more than the water outside it can hold: it keeps an
animal at its own pressure from its home depth until the sub climbs above that depth less the
rating, and above that the animal feels the rest of the gap. A grenadier from 805 m in a 400 m
chamber is safe to about 405 m, then dying by the surface. The gauge's green band shows what the
chamber can hold where the sub is; the needle turns amber when the animal needs more. Sealing an
animal in pumps the chamber up to its home depth (30 m/s); held there it recovers. There is no
valve to work: a chamber simply holds what it can.

The tank room: the open tank set into the wall (gravel, weed, an airstone; room for 2 animals at
first, up to 8 with the Open tank upgrade) and the catch bag hanging on its hook.

Each animal has a small brass tag: its name, where it was found, and how it is in a word (healthy,
stressed, weak, dying, dead). Animals are moved by hand: drag one from the bag into a
chamber or the tank, from chamber to chamber, or back into the bag (the target lights up under it).
Tap the tag, the chamber or the fish to open its one choice: let go. A ? in the corner
explains the rules. How an animal swims shows how it is: a healthy one quick and alert, darting
and turning fast; a stressed one slower; a weak one lethargic, sinking to the bottom, tilted, its
tail barely moving; a dying one listing, now and then rolling over before it rights itself; a dead
one belly up at the top. Nothing goes into a chamber or the tank by itself: boarding leaves the
catch in the bag, to be dragged in.

Dead animals sell for half the plain market price of their kind: no rare-form bonus, no contract
pay. An aquarium's contract wants one alive and well; the museum's contracts
(about a third of them) take one 'alive or dead', but a dead one only fetches the dead price.

## The old one

A cave in the west wall at 1,800 m, where an ancient giant anglerfish lives, her lure lighting the
mouth. F beside her opens the trade: once a dive she takes live fish (from the bag, or the sub's
tank if the sub is there) for old gold coins at 30 % under the market, except the one species she
craves that dive, which she pays 3x the market for. Earl chooses which fish to give her. The entity will not
come into her cave.

## The aquarium

- Built from the boat, seen on the far shore. Six wings in order: reef hall, kelp tower,
  open ocean dome, twilight gallery, deep-sea gallery, and an abyss tank only for animals caught
  below 3,500 m.
- Live animals can be kept for display instead of sold; each species and each rare form is a slot.
  Visitors pay every 10 minutes of play by the value of the collection; wings in use cost a
  little to run.

## The entity

- Lives at 2,200-4,000 m by day (the trench and the plain), rising to 900-2,800 m at night. A hidden attention meter fills when Earl
  disturbs the deep: depth, noise (sprinting, engines, the empty sub on autopilot), light, flashes,
  taking things from its domain, crimson animals, deep traps. Below 500 m without the sub marks him
  at once.
- Marked, it hunts by sound and light; hiding in kelp or under overhangs loses it. It cannot reach
  him above ~120 m. Good deeds calm it: freeing animals from nets, planting coral, offering a lure
  or necklace back to the deep (G). Sea lanterns, the necklace and the old one's cave keep it away; a
  lure distracts it. Whenever one of these keeps it out or draws it off, it gives up and goes far
  away (350-500 m, and deeper) for 1.5-2.5 minutes before it starts looking again, so it is not
  waiting for him the moment he leaves.
- It is never fully seen, except once: the first time Earl reaches the bottom of the ocean.

## Other animals

Sharks circle and bite, billfish line up and charge, sperm whales click then lunge in the deep,
orcas ram the sub. All are telegraphed; dolphins nearby make sharks leave; flashing the lamp at a
charging animal makes it swerve.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows, or the mouse | Swim / steer; with the mouse Earl swims toward the cursor by himself (the keys take over while used); a left click swings the net; the lamp follows the cursor |
| Shift, or hold the right mouse button | Faster (2x air) |
| F / hold F | Interact (observe, collect, board, haul a trap) / leave the sub |
| 1-5, Space | Net, slurp gun, tag gun, camera, traps; Space uses it (in the sub: the arm) |
| C / hold C | Call the sub / send it home |
| B | At the boat: take the helm, A / D drive her |
| T | In the sub: the tank room |
| U | The boat: sell, buy, radio, aquarium |
| J | Journal |
| L, Q, E, G | Lights, throw a lure, wear a necklace, offer something to the deep |
| H | Hints on / off |
| Esc, M | Pause, mute |
