# The shops, in detail (plan, not built yet)

This fills in section 3 of `CATALOG_PLAN.md`: what each shop looks like, what it sells, and how an item
is described. Mockups of the catalog are in `docs/catalog_mockup.html` (open it from the game's server).

## The rules that keep it uncluttered

1. **One screen, one decision.** A list of things, or one thing. Never a list *and* a page of numbers.
2. **A card says three things:** the picture, the name, the price. At most one small tag under it
   ("Gentle", "Big fish", "Owned"). No descriptions on cards.
3. **An item page says five things, always in the same order:**
   1. the picture, large;
   2. the name and price;
   3. one sentence about it, in plain catalog words ("Knotless mesh that won't split a fin.");
   4. **Good for** (one or two lines) and **Not for** (one line, or none);
   5. **Against what you carry:** at most three rows, each "now → this" with an up or down mark.
      Only the rows that differ are shown.
   Then a Buy button and a small "Save for this".
4. **Plain words and real units.** "Fish 10–60 cm", "reach 2.4 m", "about 2 min of air". No percentages,
   no levels, no "harm 0.08".
5. **No upgrade levels in the catalog.** What you buy is what you get. A better one is a different item.
6. **Every item after the free one is a choice, not a strict upgrade.** Most have a "Not for" line. That
   way the right answer depends on what you are hunting, and the descriptions stay short because the
   trade-off *is* the description.

## Where things are bought

| Where | Sells | Depth it suits |
|---|---|---|
| **The catalog** (computer in the cabin) | Hand tools, suits, fins, air, bags, traps, supplies | Shallows to twilight, 0–1,000 m |
| **The sub cradle** (on deck) | The submersible and its parts: hull, engine, chambers, open tank, air rack, claw | All depths (as now) |
| **The radio** (on deck) | Contracts; a better radio (more contracts); **better buyers** (moved here from the shop) | – |
| **Dave's Haul** (a hut on the seamount's side, 1,200 m) | Tough deep-water versions of the tools | 1,000–2,500 m |
| **The old one** (her cave in the west wall, 1,800 m) | A few rare things, for cash | The abyss |

The seamount's top is at about 300 m, so the way down goes: the reef and the seamount top → Dave's hut
on its flank at 1,200 m → the old one's cave at 1,800 m.

## The catalog: Bayside Marine Supply

### How it looks
- Pressing F at the cabin computer zooms in on the screen until the page fills it. A thin beige
  monitor bezel stays round the edge, with a faint curve and scan lines, so it's still the old computer.
- The page is a plain, slightly old-fashioned shop website: an off-white page, a navy header with the
  shop's name, categories down the left, a grid of cards. The game's own fonts (EB Garamond for words,
  IBM Plex Mono for prices).
- The pictures are the game's own drawings of each item, on a soft blue-grey background.
- Esc (or "Log off" at the top right) zooms back out to the cabin.

### Pages
- **Home:** what you're saving for (one item, with a bar: "$340 of $900"), and three cards: "New in".
- **A category:** a title, one line about the category, then the cards (2 to 5 per category).
- **An item:** as in rule 3.
- No basket and no checkout. Buy is instant; the item is yours at once, ready to put on in the inventory (B).

### Categories and items

The Measures column is what that category's comparison rows show, so every item in a category is
compared on the same three things.

**Hand nets** (key 1). Measures: fish size, reach, swing.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Hand net | free | The green net he started with. | Everyday fish, 2–45 cm | – |
| Aquarium dip net | $35 | Knotless mesh that won't split a fin. | Fish arrive almost unmarked, so they sell for more | Anything over 25 cm |
| Bait-ball net | $120 | A wide, shallow net for schooling fish. | Up to three small fish from a school in one sweep | Slow to swing; rough on fish |
| Long-handle net | $260 | A telescopic pole and a deep bag. | Reach 2.4 m: net it before it bolts | Slow to swing |
| Coarse game net | $900 | Big mesh on a heavy hoop. | Big fish, 30–110 cm | Small fish slip through |

**Slurp guns** (key 2). Measures: fish size, reach, reload.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Slurp gun | $75 | A clear tube and a spring plunger. | Small, fast fish up to 20 cm | – |
| Shrimp sipper | $300 | A thin barrel and a soft plunger. | Tiny animals up to 8 cm; harmless; quick reload | Anything bigger |

**Tag guns** (key 3). Measures: range, reload, how often a miss angers the animal.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Pole tagger | $160 | A dart on a pole, driven by a rubber sling. | Big animals you can't bring up | You have to get close |

**Cameras** (key 4). Measures: shots a dive, range.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Waterproof compact | $50 | A yellow plastic camera with a flash. | First photographs of each species | – |
| Macro camera | $400 | A close-up lens and a ring light. | Small animals (under 15 cm) pay 1.5 times | Range only 2 m |

**Trawl nets** (the sub's belly hatch; one is used up in one haul). Measures: how many it holds.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Beginner trawl | $50 | A light net for the sub's hatch. | A haul of shallow fish while you drive | Deep animals tear it |

**Traps** (set from the boat). Measures: depth, how many it holds, what it catches.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Wire pot | 1 free, then $130 | A galvanised box with one funnel. | To 40 m; up to 8 animals | – |
| Crab pot | $400 | A round pot with a narrow neck. | Crabs and lobsters, and more of them | Fish |
| Fish trap | $1,600 | A mesh box with a funnel at each end. | To 150 m; fish up to 90 cm | – |

**Suits.** Measures: speed, air use, protection.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Wetsuit | free | Black neoprene. | – | – |
| Freediving skin | $160 | Thin and slick. | Faster swimming | Uses more air |
| Drysuit | $1,200 | Sealed and dry inside. | Pressure starts 100 m deeper; keeps out the cold | – |
| Chain-mail shark suit | $2,400 | Steel mesh, as shark feeders wear. | A bite does one less injury | Heavy |

**Fins.** Measures: cruising speed, sprint.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Rubber fins | free | Standard blades. | – | – |
| Split fins | $70 | Blades split down the middle. | Easy cruising | A weaker sprint |
| Long-blade fins | $250 | Long, stiff blades. | Faster cruising and sprint | – |
| Jet fins | $900 | Heavy vented rubber. | A strong sprint, for getting away | No faster cruising |

**Air.** Measures: air, speed.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Aluminium 80 | free | Dented, honest. | About 50 s | – |
| Steel 100 | $25 | A heavier steel cylinder. | About 70 s | – |
| Steel 130 | $90 | A big high-pressure cylinder. | About 95 s | A little slower |
| Twin set | $350 | Two cylinders on a manifold. | About 2 min 20 s | Slower |
| Sidemount pair | $1,100 | Two tanks slung along his sides. | About 2 min 20 s, with no slowing | – |

**Bags.** Measures: pockets.
| Item | Price | Sentence | Good for | Not for |
|---|---|---|---|---|
| Mesh bag | free | Clipped to his belt. | 5 animals | – |
| Large catch bag | $60 | A spring-loaded mouth. | 7 animals | – |
| Divided specimen bag | $400 | A pocket for each. | 9 animals; nothing eats anything else | – |

**Supplies** (bought by the number; a small "you have 2 of 3" under each). Basic tags, a backup air
tank, trap bait (two more animals in a trap), an anglerfish lure, the fangtooth necklace.

## Equipping: in the inventory (B)

Gear is changed in the inventory screen, B, which already shows the cash, the catch and the finds.
There is no separate locker screen and no storage to manage: everything you own is always there.

**The layout**, top to bottom:
1. **Earl** in the middle, drawn in what he wears now (suit, fins, tank, bag). Eight slots round him:
   - left: suit, fins, air tank, catch bag;
   - right: the four tools, labelled 1–4 (net, slurp gun, tag gun, camera).
2. **Your gear**, beside him: everything you own, as small pictures in rows by kind (nets, suits, ...).
   What he wears is marked. Hovering over one shows its name and its Good for / Not for lines, nothing else.
3. Below, as now: the catch bag, what is in the sub, supplies and finds.

**Changing gear**
- Drag an item onto Earl or onto its slot. While dragging, the slot it fits lights up.
- Or just click an item: it goes into its own slot. (Tap on a phone.)
- What was in the slot goes back to Your gear. Nothing is ever lost, and there's no confirm box.
- Dropped in the wrong place, it slides back. A net can't go in the suit slot, so a wrong move does nothing.
- The tool slots 2–4 can be left empty (drag the tool back to Your gear). The net, suit, fins, tank and
  bag always have one in (the free ones if nothing else).

**When it's locked**
- **Unlocked** on deck, in the cabin and in the sub.
- **Locked in the water.** The screen still opens and shows everything, but the slots show a small
  padlock and one line: "Change gear on deck or in the sub." Nothing can be dragged.

The dive locker on deck stays as a place to walk to: F there just opens this screen.

## Dave's Haul (1,200 m)

- His hut: a pressurised habitat on the seamount's side, a round porthole lit from inside, a painted
  sign, nets and buoys hanging outside. Swim or dock at the airlock, press F.
- His shop is a **chalkboard**, not a website: his handwriting, items chalked up with prices, a picture of
  each. It is laid out the same way as the catalog (cards, then one item with Good for and Not for), so
  you only learn it once.
- Dave says one or two lines when you arrive (text only). He also buys odd finds (pearls, sapphires,
  whalebone) for a little more than the Margaret.

| Item | Price | Good for | Not for |
|---|---|---|---|
| Pro capture net | $3,500 | Fish to 110 cm, quick, gentle | – |
| Jelly cup | $400 | Jellies, unharmed | Anything else |
| Deep-water mesh bag | $9,000 | Deep animals arrive unharmed | – |
| Pro slurp gun | $1,400 | Fish to 28 cm, long reach | – |
| Pneumatic tag gun | $2,500 | Range 6 m; big animals barely notice | – |
| Housed camera | $2,500 | 24 shots, range 12 m | – |
| Red-filter lamp | $3,500 | Deep animals don't startle | Dimmer |
| Advanced trawl | $400 | Deeper hauls | – |
| Steel pot | $17,500 | To 500 m; hauled with the winch | – |
| Heated drysuit | $6,000 | Cold and pressure, deeper | – |
| Carbon fins | $3,000 | The fastest fins | – |
| Closed-circuit rebreather | $2,500 | About 3 min of air, no bubbles | – |
| Expedition bag | $1,800 | 11 animals | – |

## The old one (1,800 m)

- Her cave, lantern-lit, with a few things laid on a rock shelf. The same card and item layout, and she
  says nothing. Gold coins are removed; she sells for cash.
- Master's net $28,000 · Satellite tag gun $40,000 · Twin-beam lamp $11,000 · Deep cage $90,000 ·
  Atmospheric hardsuit $59,000 · Monofin $9,000 · her old lure · a pressure relic (+100 m on the sub,
  up to four).

## Old saves

- The tool, fins, tank and bag ladders are retired. Each save is given the catalog item nearest to its
  ladder level, plus the difference in cash.
- Gold coins are turned into cash at a fixed rate.

## Building order

1. The catalog screen (home, category, item pages) with the items above, and equipping in the inventory (B).
2. The item rules: size windows (min and max), the bait-ball net's three fish, the macro camera's bonus,
   the crab pot's catch, the fins' cruise and sprint, the tanks' weight.
3. Retiring the ladders, and converting old saves.
4. Dave's Haul. 5. The old one as a shop. 6. Clues.
