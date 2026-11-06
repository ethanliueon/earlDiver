# The Margaret and the catalog: plan (proposed, not built)

Two releases. **2.4.0** puts Earl on the Margaret's deck; **2.5.0** replaces the tool and suit
upgrade ladders with a catalog of things to buy, each with its own strengths and weaknesses.

## 1. Earl aboard the Margaret (2.4.0)

**Boarding.** Earl swims to the stern ladder and presses **F**. He climbs aboard and the camera
eases in (option b) until the deck fills the screen. **F** at the ladder takes him back down, and
the camera eases back out.

**On deck.**
- **A/D** walk; **W/S** use the companionway steps up to the wheelhouse and down to the gallery.
- At each station a small brass label appears ("F · Sell the catch"); **F** uses it.
- New drawing work: Earl standing and walking upright in his suit (the current drawings are all
  swimming poses), and the deck, wheelhouse and gallery door at close range.

**Stations, from stern to bow:**

| Station | Where | What it does |
|---|---|---|
| Stern ladder | stern, port side | Into the water / back aboard |
| Dive locker | stern | Pick the dive's gear: the net, slurp gun, tag gun, camera and lamp taken down, plus suit, fins and tank (see §3) |
| Sorting table | stern deck | Sell the catch: the receipt slip and the price board, as now. Animals can be sent to the gallery from here too |
| Sub cradle and winch | amidships | The sub's upgrades, kept as ladders (hull, engine, chambers, open tank, air rack, claw, add-ons) and hull patching. Traps are winched in here |
| Radio | wheelhouse | Contracts |
| Computer | wheelhouse | The catalog (§2) |
| Helm | wheelhouse | Steer the Margaret (what V does now) |
| Gallery door | below deck, by the companionway | The aquarium gallery |

The single shop popup (U) goes away. Its Sell tab becomes the sorting table, Radio the radio,
Sub the cradle, Aquarium the gallery door, and everything else moves to the computer.
**Fallback:** while Earl is aboard, **Tab** opens a small menu that jumps to any station, for
players who don't want to walk.

## 2. The catalog on the computer (2.5.0)

**The screen.** An old CRT monitor in the wheelhouse fills the screen with a shopping site in
the game's own style. It's an invented supplier, **"Bayside Marine Supply"**, with a 1990s
dial-up look: never Amazon's name or look.
- **Left:** categories (Nets, Slurp guns, Tag guns, Cameras, Lamps, Traps, Suits, Fins, Air,
  Supplies).
- **Top:** search, sort (price / newest / best for where you dive), and filters: *can afford*,
  *good for: reef / open water / deep / small fish / big fish*.
- **Grid of product cards:** the item drawn as it looks in the game, its name, price, up to
  three tag chips ("Big fish", "Gentle", "Misses small fish"), and a badge: *Owned*, *Taken
  on dives*, *Staff pick for your depth*.
- **Product page:** a large picture (slowly turning or animated, like the showcase), a
  two-line description, a **Good for / Bad for** list, and its figures *compared with what you
  dive with now* (green ↑ / red ↓). Then **Buy now**, and **Wishlist**.
- **Wishlist:** starring an item puts it on a slim "saving for: Pro capture net · $1,240 of
  $3,500" bar on the deck and in the inventory. This is how saving up for a skip feels like a
  goal.
- **Order:** a receipt prints, there is a short "delivered to the dive locker" moment, and the
  item is yours (no delivery wait).
- **Nothing is locked.** Everything can be bought the moment you can afford it, so skipping
  ahead is a matter of saving.

**What stays an upgrade, not a catalog item:** the sub (bought at the cradle) and the catch bag
size (a short ladder at the dive locker). Supplies (backup air tanks, tag darts, trawl nets,
trap bait) are sold in the catalog but used up, as now.

### 2a. How items differ (the rules behind the tags)

Every item is a set of plain numbers plus at most one special rule, so the tags never lie:

| Figure | Meaning | Tag shown |
|---|---|---|
| min-max size | Animals outside this range can't be caught: too small slip through the mesh, too big don't fit | "Misses small fish", "Big fish" |
| reach, swing/reload | As now | "Long reach", "Fast" |
| catch odds | As now | — |
| harm | Condition lost when caught | "Gentle" / "Rough" |
| noise | How much the deep notices you using it | "Quiet" / "Loud" |
| special | One rule: only certain animals, a bonus for some, several at once... | e.g. "Jellies only" |

### 2b. The catalog: about 45 items at launch

Prices are chosen by the stage at which each item becomes affordable. Per-dive income
measured in the play-tests:

| Stage | Where | Income per dive |
|---|---|---|
| S1 | shallows, by hand (0-40 m) | $15-40 |
| S2 | reef and kelp, first sub (to 300 m) | $100-400 |
| S3 | twilight (300-900 m) | $500-2,000 |
| S4 | midnight (900-2,500 m) | $3,000-15,000 |
| S5 | abyss and trench | $10,000-50,000 |

The best item in each category costs about what its whole upgrade ladder costs today, so the
pace stays the same; skipping a step means saving through it.

**Nets** (one taken per dive; key 1)

| Item | Price | Size | Reach | Swing | Odds | Harm | Special / trade-off |
|---|---|---|---|---|---|---|---|
| Hand net | free | 5-45 cm | 1.2 m | 1.0 s | 65 % | 15 % | Does everything a little |
| Aquarium dip net | $35 | 1-25 cm | 1.0 m | 0.8 s | 75 % | 5 % | Small and gentle: gobies, shrimp, seahorses |
| Bait-ball net | $120 | 4-35 cm | 1.5 m | 1.2 s | 55 % | 20 % | Takes up to 3 fish from a school in one sweep |
| Long-handle net | $260 | 8-70 cm | 2.4 m | 1.1 s | 72 % | 10 % | Reach them before they bolt |
| Jelly cup | $400 | any | 1.4 m | 1.6 s | 98 % | 0 % | Jellies and comb jellies only |
| Coarse game net | $900 | 30-110 cm | 1.8 m | 1.2 s | 75 % | 12 % | Snapper, grouper and salmon-size fish; small ones slip through |
| Pro capture net | $3,500 | 5-110 cm | 2.4 m | 0.6 s | 92 % | 4 % | The all-rounder |
| Deep-water mesh bag | $9,000 | 3-90 cm | 2.0 m | 0.9 s | 85 % | 1 % | Animals from below 200 m lose no condition; slower to swing |
| Master's net | $28,000 | 3-130 cm | 2.8 m | 0.5 s | 96 % | 2 % | The dream net |

**Slurp guns** (key 2)

| Item | Price | Size | Reach | Reload | Special |
|---|---|---|---|---|---|
| Slurp gun | $75 | ≤ 20 cm | 1.8 m | 2.0 s | — |
| Shrimp sipper | $300 | ≤ 8 cm | 1.5 m | 0.8 s | Harmless; shrimp, nudibranchs, tiny fish |
| Pro slurp gun | $1,400 | ≤ 28 cm | 2.5 m | 1.2 s | — |
| Twin-chamber slurp gun | $6,000 | ≤ 32 cm | 2.8 m | 1.0 s | Holds two animals before it must be emptied |

**Tag guns** (key 3)

| Item | Price | Range | Reload | Provoke | Pay | Special |
|---|---|---|---|---|---|---|
| Pole tagger | $160 | 2.5 m | 4 s | 50 % | ×1 | You have to get close |
| Pneumatic tag gun | $2,500 | 6 m | 3 s | 25 % | ×1 | — |
| Sling tagger | $8,000 | 10 m | 2.5 s | 35 % | ×1.2 | Fast darts for billfish and tuna; loud |
| Satellite tag gun | $40,000 | 10 m | 3 s | 15 % | ×2 | — |

**Cameras** (key 4)

| Item | Price | Shots | Range | Special |
|---|---|---|---|---|
| Waterproof compact | $50 | 5 | 8 m | Flash |
| Macro camera | $400 | 12 | 3 m | Animals under 10 cm pay ×1.5 |
| Housed camera | $2,500 | 24 | 12 m | Strobes |
| Low-light camera | $12,000 | 24 | 12 m | No flash: nothing notices the picture |

**Lamps** (new; worn on the dive)

| Item | Price | Special |
|---|---|---|
| Old headlamp | free | — |
| Wide floodlight | $1,800 | Twice the beam, but the deep notices you sooner |
| Red-filter lamp | $3,500 | Deep animals don't startle (+15 % odds below 200 m); you see less |
| Twin-beam lamp | $11,000 | A wide beam with no extra notice |

**Traps** (owned in numbers, set from the surface)

| Item | Price | Depth | Special |
|---|---|---|---|
| Wire pot | 1 free, $130 more | 40 m | — |
| Crab pot | $400 | 60 m | Crabs and lobsters twice as often; few fish |
| Fish trap | $1,600 | 150 m | — |
| Eel tube | $2,200 | 800 m | Eels and hagfish only, but often |
| Steel pot | $17,500 | 500 m | Winched |
| Deep cage | $90,000 | 1,500 m | Winched; a lit lure that draws deep animals (and other things) |

**Suits** (one worn)

| Item | Price | Special |
|---|---|---|
| Wetsuit | free | — |
| Freediving skin | $160 | +15 % speed, +10 % air use |
| Drysuit | $1,200 | Rated 400 m, keeps out the cold |
| Chain-mail shark suit | $2,400 | Bites do one less injury |
| Heated drysuit | $6,000 | Rated 450 m, cold-proof, −5 % air use |
| Rebreather suit | $19,000 | −25 % air use, no bubbles |
| Atmospheric hardsuit | $59,000 | Rated 700 m, bite-proof; slow |

**Fins**

| Item | Price | Swim | Sprint | Special |
|---|---|---|---|---|
| Rubber fins | free | ×1.0 | ×1.5 | — |
| Split fins | $70 | ×1.2 | ×1.5 | Sprinting costs less air |
| Long-blade fins | $250 | ×1.35 | ×1.65 | — |
| Jet fins | $900 | ×1.3 | ×1.85 | Best burst, heavy turns |
| Carbon freediving fins | $3,000 | ×1.8 | ×1.8 | — |
| Monofin | $9,000 | ×2.5 | ×1.95 | Fastest; turns slowly |

**Air**

| Item | Price | Air | Special |
|---|---|---|---|
| Aluminium 80 | free | 50 s | — |
| Steel 100 | $25 | 70 s | — |
| Steel 130 | $80 | 95 s | — |
| Twin set | $300 | 130 s | −5 % speed |
| Sidemount pair | $900 | 150 s | No speed loss |
| Closed-circuit rebreather | $2,500 | 200 s | No bubbles |

**Supplies** (used up): backup air tank, basic and advanced tag darts, trawl net, trap bait
(new: +2 animals in a trap), anglerfish lure.

## 3. The dive locker (the loadout)

A row of hooks and a bench at the stern. Each slot (net, slurp gun, tag gun, camera, lamp,
suit, fins, tank) shows what's on it; click a slot to choose from everything you own. Keys 1-4
in the water use the net, slurp gun, tag gun and camera carried. The figures shown are the
same ones the catalog compares against.

## 4. Building it

- **2.4.0, the deck:**
  - Walking, ladder and steps, the close camera.
  - Station labels, and Earl's standing and walking drawings.
  - The stations open today's screens (the shop's tabs split by station).
  - The Tab menu fallback.
- **2.5.0, the catalog:**
  - New item data (`js/catalog.js`) and the rules in capture.js: size range, specials, harm
    for deep animals, multi-catch.
  - Drawings: variations of the existing net, slurp, tag, camera, trap and suit drawings by
    colour, size and parts, plus the lamp drawings (new).
  - The computer-screen site, wishlist and the dive locker.
  - Retire the tool, suit, fins and air ladders. Existing saves get the items nearest to
    their levels, and are refunded the difference.
- **2.5.x:**
  - A balance script (no item useless, none the only sensible choice; time-to-afford per
    stage).
  - More items over time.

## 5. Open questions

1. Should the sub models also appear in the catalog (as a "Boat yard" page that sends you to
   the cradle), or only at the cradle?
2. Lamps are new. Keep them, or leave the lamp as it is?
3. Trap bait as a supply: yes or no?
