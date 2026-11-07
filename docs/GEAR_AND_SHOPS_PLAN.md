# Gear, skills, chests and shops: plan v3 (agreed with the player, not built yet)

Replaces the shop parts of `CATALOG_PLAN.md`. Everything here was decided question by question.

## 1. Four shops, one layout

Every shop uses the Margaret's website layout (categories down the side, product cards, a product page,
wishlist) plus a **cart**: add several things, see the total, check out once. Each shop is its own terminal
with its own look, so they feel like one game.

| # | Shop | Where | Look | Leans toward (no hard cutoffs) |
|---|---|---|---|---|
| 1 | Bayside Marine Supply | the Margaret's cabin computer | the beige CRT site, smoother | Common to Rare, mostly Common |
| 2 | The research station | ~280 m (reachable with the starter sub, rated 300 m) | a tidy scientific outpost; a station terminal | Uncommon to Rare and a couple of Exotics, mostly Uncommon |
| 3 | Dave's Haul | ~1,200 m (built in 2.7.0) | Dave's own homemade site on an old terminal; the chalkboard and its font go; more detail round the hut | Uncommon to Exotic, mostly Rare |
| 4 | The old one | her cave, ~1,800 m | **not** a computer: her wares laid out on the cave floor, lit by her lure, in a rustic, archaic screen | Rare to Exotic, an even split |

- Each shop **specialises**: 10+ items of each kind in its specialties, a few of the rest.
- Most gear overall is **hand nets, fins, air, bags and suits**. Slurp guns, tag guns and cameras are a small
  side line.
- Bought items go **into the inventory** (put on with B); a message says "[item] is in your inventory (B)".
- **Selling gear**: anywhere someone is there (the Margaret, the research station, Dave, the old one), for
  ~30 % of its price; chest items are valued by their rarity and skills. No merging or upgrading of items.
- **Subs**: hulls and every sub part are bought only at **the Margaret's yard** (the only thing above water).
  Reaching the research station unlocks better sub options at the yard; meeting Dave unlocks his deep hulls.
- The old one sells for cash; her gold coins, trades and cravings are removed.

## 2. Items and rarities

- Rarities: **Common, Uncommon, Rare, Exotic, Legendary** (coloured tags).
- **Base stats are fixed per item** (catch size, swing speed, reach, air, slots...), each item better or worse
  for different purposes. Descriptions: two or three plain sentences ("A bigger net, but small fish slip
  through"), plus Good for / Not for. Non-technical.
- **Shop items** have no skills, or a very basic one.
- **Chest-only items** exist in every kind and at every rarity, especially Exotic and Legendary.
- Exotics can be bought, but only a few lower-tier ones, with slightly worse stats than the chest versions.
  **Legendaries come only from chests.**
- Art: Commons, Uncommons and Rares use standard designs per kind (base shapes, materials, colours, sizes);
  a couple of Exotics and Legendaries per kind are hand-drawn.

## 3. Skills

Chest items roll their skills at random. Levelled skills go I to IV; level IV only on Legendary items.

| Skill | What it does | Fits |
|---|---|---|
| Performance | better chance a catch, tag or photo works | nets, slurp, tag, camera |
| Oversized | catches bigger fish | nets, slurp |
| Overreaching | longer reach | nets, slurp, tag, camera |
| Quickdraw | faster swing or reload | nets, slurp, tag, camera |
| Haste | swims faster | fins, suits |
| Rebreathing | air lasts longer | air, suits |
| Ambush | fish don't bolt as easily | suits, fins, nets |
| Deep Pockets | carries more animals | bags, suits |
| Featherweight | a full bag slows him less | bags, air |
| Warmth | the deep cold costs less air | suits, air |
| Hardened | bites do less harm | suits |
| Mending | injuries heal faster | suits, air |
| Shutterbug | more photos a dive | cameras |
| Scholar | tags and photos pay more | tag, camera |
| Prospector | sapphires and pearls spotted from farther | bags, cameras |
| Resilience (Exotic+) | pressure hurts Earl less | suits, air, fins |
| Bioluminescence (Exotic+) | the item gives off its own light | anything |

**Legendary skills** (no levels, at most one per item, Legendary items only):

| Skill | What it does |
|---|---|
| Eye of the Sea | rare fish glow and get a bracket, easy to spot |
| Magnetic | fish swim toward him instead of fleeing |
| Faithless | fewer creatures come for him, the monster included |
| Second Wind | once a dive, when the air runs out, it refills |
| Phantom | while he holds still, the monster can't find him |
| Kinship | animals in his bag never get stressed or die |

**Skills per rarity (chest rolls):** Common: one level I skill or none. Uncommon: one, up to II. Rare: two,
up to II. Exotic: two or three, up to III (can carry Resilience, Bioluminescence). Legendary: two or three,
up to IV, plus exactly one legendary skill.

## 4. Chests (gacha, expensive, only bought)

| Shop | Chest | Price | Odds lean |
|---|---|---|---|
| Dave | Crate | ~$2,000 | mostly Uncommon and Rare |
| Dave | Strongbox | ~$8,000 | mostly Rare, a chance of Exotic |
| The old one | Offering | ~$25,000 | Rare and Exotic |
| The old one | Reliquary | ~$90,000 | Exotic, a small chance of Legendary (the only source) |

## 5. Air, upgrades, the radio, quests, the Margaret (decided after v3's first draft)

- **Skills stack fully** across everything worn (Rebreathing II on the suit and II on the tank: both count).
  To balance that, **all air is cut to ×0.4**: Earl starts with 20 s (was 50); Steel 100 28 s, Steel 130
  38 s, twin set 56 s, sidemount ~66 s, closed-circuit rebreather 80 s; every other air figure matched.
- **Upgrades are scrapped** for the diver and the tools (air, fins, bag, net, slurp, tag, camera): the gear
  is the upgrade. **Kept at the Margaret's yard**: the sub (deeper hull, engine, pressure chambers, open tank,
  backup air rack) and the claw. Old saves don't matter (one player).
- **The radio and "better buyers" are removed.**
- **Quests**: an easy-to-find Quests button in the right-hand HUD; rewards are claimed straight from it.
  - **The main quest line** is a handmade tutorial ("Net 1 fish", sell it, buy from the catalog, the sub, the
    aquarium...) and can pay gear. It ends once the basics are taught; it never points to the station, Dave
    or the old one (they are found by exploring).
  - **Normal quests** pay cash only. The board rolls **3 quests**, mostly Common, with chances of Uncommon and
    Rare, and very rarely Exotic (the highest). A quest's rarity follows its payout and difficulty. Refreshed
    free every 3 hours, or at once for money (refresh by watching an ad: later, not built).
- **The Margaret** keeps: the wheel, the aquarium, the cabin computer (Bayside Marine Supply) and the yard.
  **Steering**: taking the wheel zooms out to a wide view of the whole boat; she is driven and turns like the
  sub (facing the way she goes), no up or down.

## 6. Build order (each step its own version, with screenshots)

1. The item system: rarities, fixed stats, skills and their effects in play, the new items and descriptions;
   air ×0.4; diver/tool upgrades, the radio and buyers removed; the shared shop engine with the cart and
   inventory delivery; the Margaret's shop on it; selling gear.
1b. Quests (the button, the main quest line, the board) and the new steering view.
2. The research station at ~280 m: the place, its art, its terminal; the yard unlocks.
3. Dave reworked onto the shared engine, his chests, more detail round the hut.
4. The old one: her floor-of-the-cave screen, her wares and chests, coins removed.
5. Hand-drawn Exotics and Legendaries.

## 7. More decisions (asked one at a time, 7 Nov)

- **Air** stays as planned: Earl starts with **20 s**.
- **Bought gear** goes into the inventory and is put on by hand ("… is in your inventory (B)").
- **The cabin radio** stays as decoration; quests live only behind the HUD's Quests button.
- **Shop specialties** (10+ items in each; 3-4 of every other kind):
  Bayside Marine Supply: hand nets, fins, bags. The research station: cameras, tag guns, slurp guns, and
  suits for the cold. Dave's Haul: air (deep tanks, rebreathers), suits for depth, big-game nets.
  **The old one** sells only ~5 things at a time, of any kind, and they change every ~3 in-game days.
- **Chest-only items** (the main way to get good gear), per main kind (nets, fins, air, bags, suits):
  5 Common, 5 Uncommon, 15 Rare, 15 Exotic, a few Legendary. Per side tool (slurp gun, tag gun, camera):
  about 2 Common, 2 Uncommon, 5 Rare, 5 Exotic, 1-2 Legendary.
- **The feel of the special items:** Exotics are lost expedition gear (real, storied: a 1930s bathysphere
  helmet, a navy prototype rebreather); Legendaries are eerie things from the deep (a net of gulper-eel
  sinew, fins cut from an oarfish's crest, a lamp with a living lure). Real design effort on every Legendary
  and Exotic, and on the Rares.
- **On Earl:** Commons and Uncommons use the standard look of their kind; Rares have their own colours;
  Exotics and Legendaries are drawn individually, in the shops and on Earl underwater.
- **Opening a chest:** a short reveal (~3 s, skippable): it creaks open, light in the rarity's colour,
  the item rises out with its name and skills.
- **The locker:** 40 items, fixed (what is worn counts). When it is full, a chest can't be opened and
  nothing can be bought or picked up until something is sold.
- **Sets:** 8 sets of 5 pieces each (suit, fins, air, bag, net), on top of the other items: 4 Rare sets and
  4 Exotic sets, no Legendary set. Any 3 pieces of one set worn turns on its set trait (stronger at Exotic).
  All pieces of a set share its rarity. A set piece rolls one skill fewer than a normal item of its rarity.
  Any chest can give a set piece, at that chest's usual odds.
