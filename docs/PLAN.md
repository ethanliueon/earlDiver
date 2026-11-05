# Plan: the money update

Agreed with the project owner on 2026-11-05. This turns Earl the Diver from a pure survival dive into an
endless diving business: earn money from the sea, spend it on gear, build an aquarium on the beach.
The horror stays the same: the valuable things are deep, and going deep is what wakes the entity.

## Decisions

- **Money.** Earl earns from live specimens (aquarium buyer), tags on big animals (research
  program), first photos of each species (institute), salvage, and valuables. He never kills anything.
- **Persistence.** Within one sitting, cash, upgrades, the journal and the aquarium survive death.
  Nothing is saved between page loads (owner's request): every refresh is a new game; only the
  deepest depth ever reached is remembered. Unsold cargo is lost.
  Death costs a hospital bill (10 % of cash). Taken by the entity: carried lures and necklaces go too.
- **Runs.** Fish regenerate all the time, rare ones included. Pickups (salvage, clams, pearls,
  sapphires, lanterns, lures, necklaces) are finite in a run. A fresh ocean comes from a new run:
  dying, or ending the dive from the pause menu. (Seasons were dropped at the owner's request.)
- **Sapphires** are rare valuables below 500 m. They no longer add air; air comes only from tanks.
- **Goal: endless.** Earl's aquarium on the beach grows as he displays species and rare variants.
  Reaching 3,000 m for the first time is a hidden moment (the entity shows itself), not an ending.
- **Art.** Tools, specimens and variants are drawn with the same care as the creatures: real
  objects with real construction (mesh, handles, hoses, valves), lit by the game's light model.
  No placeholder shapes.

## Calling the submersible (C)

- C: the empty sub drives itself to Earl at its normal speed (ballast boost when diving straight),
  routing around rock on a coarse grid, and stops ~4 m from him. C again cancels. Hold C: back to dock.
- Never below its rated depth: it holds there ("Sub holding at 400 m: rated depth").
- Its engine is noisy to the entity below 200 m (quiet engine upgrade halves it). Whales and orcas can
  ram it on the way (not built yet: animals only target the sub with Earl inside). No air is used while it is empty.
- Sonar marker with distance and ETA. Recall unit upgrade ($2,500): 1.5x faster when called.

## Rare variants

A species' variants unlock once Earl has caught or tagged a normal one. Then each spawn of that
species has a 5 % chance to be rare, split as:

| Variant | Share | Look | Pay |
|---|---|---|---|
| Giant | 35 % | 1.6-2x size, scarred, slower to flee | x2 |
| Albino | 20 % | bone white, pink eyes, translucent fins | x2.5 |
| Golden (xanthic) | 15 % | deep gold, faint sheen | x3 |
| Melanistic | 15 % | near-black, pale ghost markings | x3 |
| Abnormal | 10 % | extra fins, doubled dorsal, odd eyes, twisted spine; swims wrong | x3 |
| Crimson | 5 % | dull red inner glow, veins of light; only below 200 m, likelier near the entity | x5 |

Each is a visual layer over the species drawing. The journal gets 6 variant slots per species.

## Upgrades (revised again)

At the owner's request the tiers became an incremental upgrades system: every stat has its own
level, each step a little more expensive (UPGRADES in `js/economy.js`); only gear is bought once
(GEAR). The tables below are the original tier design, kept for reference.

## Prices (revised)

At the owner's request the economy starts at cents and climbs in steps: small fish pay cents to a
couple of dollars, a swordfish tag $100. Gear ladders start at $5-$10 (fine-mesh net $5, first tank
$10, 700 m refit $50) and climb roughly x4-x8 per step to $15,000 for the 3,000 m sub. The prices
in the tables below are the original reference figures; `js/economy.js` and `js/specimens.js` hold
the live ones. Rare variants come only on bigger solitary fish (`canBeRare` in `js/variants.js`).

## Tools

Stats: speed (sweep / reload), effectiveness (catch chance, size limit), harm (condition lost),
range, and noise (entity attention below 200 m).

| Tool | Price | Range | Speed | Handles | Success | Harm |
|---|---|---|---|---|---|---|
| Hand net | free | 1.2 m | 1.0 s | <= 30 cm | 55 % | -15 % |
| Fine-mesh net | $250 | 1.5 m | 0.8 s | <= 40 cm | 70 % | -8 % |
| Long-handle net | $1,200 | 2.4 m | 1.1 s | <= 60 cm | 75 % | -10 % |
| Pro capture net | $5,000 | 2.4 m | 0.6 s | <= 90 cm | 90 % | -4 % |
| Slurp gun | $400 | 1.8 m | 2.0 s | <= 15 cm, fast fish | 85 % | -5 % |
| Pro slurp gun | $2,000 | 2.5 m | 1.2 s | <= 20 cm | 95 % | -3 % |
| Pole tagger | $600 | 2.5 m | 4 s | tag-only animals | aim | a miss may provoke |
| Pneumatic tag gun | $4,000 | 6 m | 3 s | tag-only animals | aim | provokes less |
| Satellite tag gun | $15,000 | 10 m | 3 s | tag-only animals | aim | tags pay x2 |
| Wire pot trap | $150 | placed | ~3 min | crabs, eels (<= 200 m) | holds 2 | none |
| Deep trap | $3,000 | placed | ~4 min | deep fish (<= 2,000 m) | holds 4 | bait draws the entity |
| Disposable camera | $50 | 8 m | 5 shots | first photo per species | - | flash draws the entity |
| Housing camera | $1,500 | 12 m | 24 shots | | - | flash draws the entity |
| Low-light camera | $9,000 | 12 m | 24 shots | | - | no flash |
| Sub manipulator arm | $6,000 | 4 m | timing bar | deep animals | grip / crush | - |

Tag-only: sharks over 1.5 m, billfish, marine mammals, giant squid, large rays.
Belt bag 3 -> 5 -> 8 specimen slots (slow condition loss); sub tank 4 -> 8 -> 12 (no loss).
Salvage has weight: heavy loads slow Earl and cost air. Deep animals brought up faster than
~1 m/s lose condition (barotrauma) unless kept in pressure canisters.

## Upgrades

- Tanks: 50 s -> 90 s ($800) -> 140 s ($3,500) -> twin set 200 s ($10,000) -> rebreather 300 s,
  no bubbles, quiet to the entity ($30,000).
- Fins (2 tiers, +15 % each), drysuit (absorbs one injury), lamp with a red-light mode.
- Sub rated depth: 400 m (start) -> 700 ($1,500) -> 1,000 ($5,000) -> 1,500 ($12,000) ->
  2,000 ($22,000) -> 2,700 ($35,000) -> 3,000 ($50,000), each with more air.
  Add-ons: quiet engine, red lights, hull plating, arm, recall unit, tank slots, pressure canisters.
  A replacement after an implosion costs 30 % of the current tier.
- Boat: fish-finder, better radio, deck tank. Supplies: lures, necklaces, hull patches.

## Economy

Price = base x depth x size x rarity x variant x condition, with set prices for key animals
(sardine $0.20, clownfish $25, moray $90, swordfish tag $100, great white tag $800, live
anglerfish $2,500, giant squid tag $25,000). Each sale of a kind lowers its price ~15 %, recovering
over a few minutes. Radio contracts: 3 at a time, refreshed each dive. Selling: a basket winches
down, and a ledger slip types out the sale. Core upgrades in about 5-7 hours.

## The aquarium

A building on the beach that grows as wings are added (reef hall $2k, kelp $6k, open ocean $15k,
twilight $30k, deep-sea $60k, abyss $120k). Keep live catches for display; each species and each
variant is a slot. Ticket income each in-game day from reputation, minus small upkeep. Completion
percentage on the menu. The abyss tank needs the 3,000 m sub.

## Build order

1. Economy core: cash, saves, boat shop, sub tiers, tanks, sapphires, finite pickups per dive,
   death penalties, selling, HUD cash.
2. Calling the sub.
3. Live capture: nets, slurp guns, specimens, condition, weight, barotrauma, ledger, saturation.
4. Rare variants.
5. Tagging and cameras.
6. Traps and the sub arm.
7. The aquarium and the 3,000 m moment.
8. Radio contracts, balance pass, docs.

## Map v2 (agreed 2026-11-05, from the owner's sketch)

- **v1.3.0 Suits.** Bought once at the boat, one worn at a time: wetsuit (start), freediving skin
  (+15 % speed, x1.1 air), drysuit (pressure starts 100 m deeper, -5 % speed, keeps out the cold),
  chain-mail shark suit (bites one injury less, -12 % speed), rebreather suit (x0.75 air, no
  bubbles, quieter to the entity, -5 % speed), atmospheric hardsuit (no pressure to 700 m, x0.9 air,
  -40 % speed).
- **v1.4.0 (done) The new map, 3,000 m wide x 4,000 m deep.** Shore and home on the right (east); the
  Margaret can be driven along the surface from the shore out to 1,000 m from the west wall, with
  the sub docked on board (it travels with the boat). East to west: beach, seagrass and reef, kelp
  on cold upwelling water, the shelf with its wreck, a submarine canyon through the shelf break,
  the continental slope (cold-water coral mounds, a cold seep), the abyssal plain (~3,200-3,600 m:
  manganese nodules, a whale fall, a vent field, a brine pool), a seamount rising to ~300 m, and a
  trench along the foot of the west wall down to 4,000 m. The entity's range moves deeper to match
  (it lives in the trench).
- **v1.5.0 (done) The zones' mechanics.** Cold water costs air without a drysuit; vent water damages the
  hull and Earl; canyon currents push; the brine pool kills; nodules are collected; the whale fall
  is rich in rare life. The anglerfish's cave on the west wall (~1,800 m): an ancient giant
  anglerfish buys animals at market -30 %, once a dive, choosing which (paid in old gold coins),
  with one craving a dive that it pays full or 1.5x for; its lure keeps the entity out of the cave.
  A ballast upgrade for faster vertical travel.

(Superseded in v1.19.0: the seabed traps above were replaced by four tiers of box traps on a line
from a buoy, set at a chosen depth; see GAME_DESIGN.md.)
