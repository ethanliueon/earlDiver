# The economy remaster (7.2.16 to 7.2.17) and what is left

Agreed with the owner before the work; built while the owner was away. Everything below is in the game now unless it
says otherwise. The full table of old and new prices is at the end.

## 1. The rules

- **Fish pay by where they live.** Every animal's price is multiplied by a curve of the middle of the depths it usually
  keeps to (`fauna.js usualDepth`): `1 + 0.9 × ln(1 + max(0, mid − 450) / 400)`. Nothing changes down to 450 m; about
  ×1.9 at 1,300 m; about ×2.9 at 3,300 m (`specimens.js depthCurve`).
- **Legends are $150,000 times the same curve**: the coelacanth of the shallows $150,000, the tripod of the abyss about
  $435,000. The cheapest legend is 6.7 times the dearest exotic (the floor was 5 times).
- **The old bonus for catching below 1,500 m is retired** (`deepPremium`): with the curve it counted the depth twice.
- **What is met:** of the animals met in any place, exotics (undocumented ones counted with them, quietly) are 3 % and
  legendaries 0.05 % (`specimens.js rarityShare`), in the open sea's deep fill, the main spawner and the traps. Where
  nothing ordinary lives, the rest of the share is simply "nothing comes". Measured: 0–3 % exotic at every depth (it
  was 44 % at 800 m in a trap and 70 % at 1,700 m in the deep fill); the abyss is now sparse.
- **Prices by the time it takes to earn them at the depth where the thing is wanted** (section 2).

## 2. Income per hour, by submersible (measured)

What swims at each sub's working depth (85 % of its rating) was sampled in the game (`play/econ7.js`), then: animals
per dive (its tank, at most 8 a trawl), times their average value, times 0.8 for condition, over a dive (down, three
minutes of work, up and sell), at half a perfect player's pace.

| Sub | Working depth | Average animal | Income per hour |
|---|---|---|---|
| Б-7 bathyscaphe | 255 m | $121 | about $1,800 |
| Б-7М refit | 425 m | $140 | about $3,100 |
| Work submersible | 765 m | $557 | about $13,600 |
| Heavy work submersible | 1,105 m | $682 | about $16,700 |
| Research submersible | 1,615 m | $1,419 | about $29,700 |
| Deep research submersible | 2,125 m | $1,219 | about $24,000 |
| Titanium research submersible | 2,805 m | $1,003 | about $17,600 |
| Full-ocean-depth submersible | 3,825 m | $1,347 | about $20,300 |

**The important finding:** with exotics only 3 % of what is met, income stops growing past about 1,600 m. The deep's
common animals pay more than the shallows' but the trips are longer. Exotics and legends are where the deep pays (a
legend is 5 to 20 hours of income in one catch). See question A.

## 3. What changed, and why

- **Submersibles:** already on a grinding curve by this rule (0.3, 1, 0.9, 2.4, 3.4, 9 and 25 hours of the previous
  sub's income). Only the heavy work sub was under its time: $12,000 → $17,000. The rule would make the last three
  cheaper; they were left as they were (see question A).
- **Gear:** common to rare unchanged (owner). Exotic $8,000–30,000 → $25,000–60,000 (one to two hours at a research
  sub); legendary $54,000–90,000 → $100,000–180,000 (five to nine hours at the deepest). Each keeps its place in its
  band. Selling back pays a third, as before.
- **Chests:** each one's price moved with what is in it, so every chest keeps exactly its old value for money (the
  crate and the cases, with nothing above rare, did not move). Poseidon's chest is still the top chest:
  $100,000 → $225,000.
- **Traps:** priced so an average haul is about twice the trap (measured: the wire pot on a reef floor $191 a haul,
  the fish trap $165–207, the deep trap $6,100–7,300, its catch brought up dead by the winch). Wire pot $130 → $90,
  fish trap $1,600 → $100, deep trap $3,300 (the old deep cage was $90,000, the steel pot $17,500). See question B.
- **Photographs** pay on the animal's price *without* the depth curve, and one photo never more than $50,000. (With
  the legendary camera an excellent photo paid 90 % of the animal: about $390,000 for a legend, with no net, no tank
  and nothing to keep alive. That was the shortcut the owner asked about.)
- **The aquarium** pays at most $1,500 a gallery day (ten minutes of play): a legend on show would otherwise pay about
  $8,700 a day, more than diving.
- **Hospital bill:** 10 % of cash, now capped at $25,000 (was $10,000, under half an hour of deep income).
- **Quests:** the two top tiers pay half again and a little over twice what they did (about an hour of a deep diver's
  income); the lower tiers and the live-animal quests (which follow the animal's value) unchanged.
- **Radio contracts** already pay the market price plus a premium capped at the next sub's price: they follow the new
  values without a change. Passive income stays, capped (above); removing either is a later decision.
- **Daily gift:** its chests are worth more now by themselves; its cash (up to $30,000, about an hour at the top) and
  the rest unchanged. Its fish trap gives its price instead when he already has one (one of each now).
- **Supplies** (lure, glow sticks, backup air): unchanged; they are bought over and over.
- **The revive** is a real purchase ($0.99), not a game price: unchanged.

## 4. Questions for the owner

- **A. The deep does not pay more per hour than 1,600 m.** Options: (1) leave it: the deep is for exotics, legends and
  the depth record; (2) let animals that are deep for their kind pay a little more; (3) more ordinary deep species, or
  larger groups of them, down there. Until then the last three subs were left at their prices.
- **B. The fish trap** catches about what the wire pot does, in six times as long (the fish at 60–150 m are cheap); at
  $100 it is priced by the rule. Should it reach deeper (to 250 m), or keep its catch alive for more?
- **C. The deep trap's catch dies on the winch** (half price). Emptied at its depth from the sub, into a pressure
  chamber, it comes up alive. That is the skill; say if it should be kinder.

## 5. Still to do from the 7.3 list

- Tutorial wording (the owner sees the list first), seaweed thinning with depth, the code tidy-up, a "stay" button for
  pets, the main storyline (all in `docs/PLAN_7.3.md`).
- Later, by the owner's word: merging scrolls (three into one) and a scroll-only chest; removing radio contracts and
  passive income; the character creator (for an artist); reinforcement with a chance to break, bosses, a health bar,
  paid deeper zones, rebirth to other parts of the ocean.

# The full price table (7.2.8 against now)

## Fish and other animals: what a healthy one of usual size pays

Sorted by rarity, then by the middle of the depths it usually keeps to.

| Animal | Rarity | Usually at | 7.2.8 | Now | × |
|---|---|---|---|---|---|
| By-the-wind Sailor | common | 0–1 m | $0.50 | $0.50 | 1.00 |
| Blue Button | common | 0–1 m | $1.00 | $1.00 | 1.00 |
| Redlip Blenny | common | 0–8 m | $2.00 | $2.00 | 1.00 |
| Blue Mussel | common | 0–10 m | $0.25 | $0.25 | 1.00 |
| Yellowtail Damselfish | common | 0–10 m | $1.20 | $1.20 | 1.00 |
| Eastern Oyster | common | 0–12 m | $1.00 | $1.00 | 1.00 |
| Tropical Two-wing Flyingfish | common | 0–20 m | $1.00 | $1.00 | 1.00 |
| Warty Comb Jelly | common | 0–20 m | $4.00 | $4.00 | 1.00 |
| Humbug Damselfish | common | 0–20 m | $1.50 | $1.50 | 1.00 |
| Bay Scallop | common | 0–20 m | $1.00 | $1.00 | 1.00 |
| Sergeant Major | common | 1–20 m | $1.00 | $1.00 | 1.00 |
| Bicolor Blenny | common | 1–25 m | $4.00 | $4.00 | 1.00 |
| Crown-of-thorns Starfish | common | 0–30 m | $3.00 | $3.00 | 1.00 |
| Leopard Sea Cucumber | common | 0–30 m | $4.00 | $4.00 | 1.00 |
| Opaleye | common | 0–30 m | $3.00 | $3.00 | 1.00 |
| Halloween Hermit Crab | common | 0–30 m | $2.00 | $2.00 | 1.00 |
| Bigclaw Snapping Shrimp | common | 0–30 m | $3.00 | $3.00 | 1.00 |
| Chocolate Chip Sea Star | common | 0–30 m | $3.00 | $3.00 | 1.00 |
| Flamingo Tongue | common | 0–30 m | $4.00 | $4.00 | 1.00 |
| Glassy Sweeper | common | 1–30 m | $1.00 | $1.00 | 1.00 |
| Bluehead Wrasse | common | 0–40 m | $1.50 | $1.50 | 1.00 |
| Peppermint Shrimp | common | 0–40 m | $4.00 | $4.00 | 1.00 |
| Long-spined Sea Urchin | common | 0–40 m | $3.00 | $3.00 | 1.00 |
| Pacific Oyster | common | 0–40 m | $1.00 | $1.00 | 1.00 |
| Bluestreak Cleaner Wrasse | common | 1–40 m | $4.00 | $4.00 | 1.00 |
| Red Rock Crab | common | 0–45 m | $4.00 | $4.00 | 1.00 |
| Velvet Swimming Crab | common | 0–50 m | $3.00 | $3.00 | 1.00 |
| Compass Jellyfish | common | 0–50 m | $4.00 | $4.00 | 1.00 |
| Atlantic Blue Crab | common | 0–55 m | $3.00 | $3.00 | 1.00 |
| Convict Surgeonfish | common | 0–55 m | $3.00 | $3.00 | 1.00 |
| Threespot Damselfish | common | 1–55 m | $1.00 | $1.00 | 1.00 |
| French Grunt | common | 0–60 m | $1.20 | $1.20 | 1.00 |
| Ochre Sea Star | common | 0–60 m | $2.00 | $2.00 | 1.00 |
| Cushion Star | common | 0–60 m | $4.00 | $4.00 | 1.00 |
| Bearded Fireworm | common | 0–60 m | $2.00 | $2.00 | 1.00 |
| Blue Chromis | common | 3–60 m | $0.80 | $0.80 | 1.00 |
| Common Brittle Star | common | 0–90 m | $1.00 | $1.00 | 1.00 |
| Coney | common | 1–90 m | $4.00 | $4.00 | 1.00 |
| Purple Sea Urchin | common | 0–95 m | $0.80 | $0.80 | 1.00 |
| Squirrelfish | common | 0–110 m | $3.00 | $3.00 | 1.00 |
| Pacific Sardine | common | 0–120 m | $0.40 | $0.40 | 1.00 |
| European Plaice | common | 0–120 m | $4.00 | $4.00 | 1.00 |
| Common Remora | common | 0–120 m | $2.00 | $2.00 | 1.00 |
| Sea Gooseberry | common | 0–120 m | $1.00 | $1.00 | 1.00 |
| Giant Salp | common | 0–120 m | $1.00 | $1.00 | 1.00 |
| Bigeye | common | 5–120 m | $3.00 | $3.00 | 1.00 |
| Atlantic Sea Scallop | common | 18–110 m | $2.00 | $2.00 | 1.00 |
| Pacific Saury | common | 0–140 m | $0.60 | $0.60 | 1.00 |
| Atlantic Mackerel | common | 0–150 m | $3.00 | $3.00 | 1.00 |
| Giant California Sea Cucumber | common | 0–150 m | $3.00 | $3.00 | 1.00 |
| Bat Star | common | 0–170 m | $2.00 | $2.00 | 1.00 |
| Red Sea Urchin | common | 0–170 m | $2.00 | $2.00 | 1.00 |
| Pilot Fish | common | 0–180 m | $3.00 | $3.00 | 1.00 |
| Capelin | common | 0–180 m | $0.30 | $0.30 | 1.00 |
| Northern Anchovy | common | 0–190 m | $0.30 | $0.30 | 1.00 |
| Atlantic Herring | common | 0–220 m | $0.50 | $0.50 | 1.00 |
| Atlantic Horse Mackerel | common | 20–200 m | $1.50 | $1.50 | 1.00 |
| Plainfin Midshipman | common | 0–220 m | $3.00 | $3.00 | 1.00 |
| Antarctic Krill | common | 0–300 m | $0.25 | $0.25 | 1.00 |
| Northern Krill | common | 0–300 m | $0.25 | $0.25 | 1.00 |
| Mauve Stinger | common | 0–300 m | $2.00 | $2.00 | 1.00 |
| Alaska Pollock | common | 30–300 m | $4.00 | $4.00 | 1.00 |
| Spiny Squat Lobster | common | 0–350 m | $4.00 | $4.00 | 1.00 |
| Sand Dollar | common | 0–950 m | $0.50 | $0.53 | 1.06 |
| Portuguese Man o' War | uncommon | 0–1 m | $8.00 | $8.00 | 1.00 |
| Picasso Triggerfish | uncommon | 0–4 m | $25 | $25 | 1.00 |
| Upside-down Jellyfish | uncommon | 0–10 m | $6.00 | $6.00 | 1.00 |
| Alligator Pipefish | uncommon | 0–10 m | $12 | $12 | 1.00 |
| Tomato Clownfish | uncommon | 1–12 m | $9.00 | $9.00 | 1.00 |
| Houndfish | uncommon | 0–13 m | $6.00 | $6.00 | 1.00 |
| Ocellaris Clownfish | uncommon | 1–15 m | $12 | $12 | 1.00 |
| Maroon Clownfish | uncommon | 1–16 m | $14 | $14 | 1.00 |
| Caribbean Reef Squid | uncommon | 0–20 m | $12 | $12 | 1.00 |
| Lettuce Sea Slug | uncommon | 0–20 m | $6.00 | $6.00 | 1.00 |
| Sea Bunny | uncommon | 0–20 m | $25 | $25 | 1.00 |
| Moon Wrasse | uncommon | 1–20 m | $6.00 | $6.00 | 1.00 |
| Razorfish | uncommon | 1–20 m | $10 | $10 | 1.00 |
| Foureye Butterflyfish | uncommon | 2–20 m | $6.00 | $6.00 | 1.00 |
| Copperband Butterflyfish | uncommon | 1–25 m | $28 | $28 | 1.00 |
| Trumpetfish | uncommon | 2–25 m | $8.00 | $8.00 | 1.00 |
| Queen Parrotfish | uncommon | 3–25 m | $15 | $15 | 1.00 |
| Garibaldi | uncommon | 0–30 m | $18 | $18 | 1.00 |
| Queen Conch | uncommon | 0–30 m | $8.00 | $8.00 | 1.00 |
| Raccoon Butterflyfish | uncommon | 0–30 m | $15 | $15 | 1.00 |
| Snowflake Moray | uncommon | 0–30 m | $25 | $25 | 1.00 |
| Red Pencil Urchin | uncommon | 0–30 m | $6.00 | $6.00 | 1.00 |
| Sea Apple | uncommon | 0–30 m | $25 | $25 | 1.00 |
| Geography Cone | uncommon | 0–30 m | $25 | $25 | 1.00 |
| Fried Egg Jellyfish | uncommon | 0–30 m | $10 | $10 | 1.00 |
| Spotted Boxfish | uncommon | 1–30 m | $20 | $20 | 1.00 |
| Spotted Drum | uncommon | 3–30 m | $20 | $20 | 1.00 |
| Map Puffer | uncommon | 4–30 m | $25 | $25 | 1.00 |
| Bird Wrasse | uncommon | 1–35 m | $15 | $15 | 1.00 |
| Scarlet Cleaner Shrimp | uncommon | 0–40 m | $6.00 | $6.00 | 1.00 |
| Arctic Char | uncommon | 0–40 m | $25 | $25 | 1.00 |
| Bennett's Feather Star | uncommon | 0–40 m | $8.00 | $8.00 | 1.00 |
| Tiger Cowrie | uncommon | 0–40 m | $8.00 | $8.00 | 1.00 |
| Willan's Chromodoris | uncommon | 0–40 m | $8.00 | $8.00 | 1.00 |
| Pink Skunk Clownfish | uncommon | 1–40 m | $10 | $10 | 1.00 |
| Spanish Hogfish | uncommon | 1–40 m | $12 | $12 | 1.00 |
| Peacock Grouper | uncommon | 1–40 m | $20 | $20 | 1.00 |
| Blue Tang | uncommon | 2–40 m | $25 | $25 | 1.00 |
| Lined Seahorse | uncommon | 0–45 m | $25 | $25 | 1.00 |
| Kelp Greenling | uncommon | 0–45 m | $5.00 | $5.00 | 1.00 |
| Kelp Bass | uncommon | 0–45 m | $6.00 | $6.00 | 1.00 |
| Sailfin Tang | uncommon | 1–45 m | $22 | $22 | 1.00 |
| Yellow Boxfish | uncommon | 1–45 m | $25 | $25 | 1.00 |
| Neon Goby | uncommon | 1–45 m | $5.00 | $5.00 | 1.00 |
| Yellow Tang | uncommon | 2–45 m | $20 | $20 | 1.00 |
| California Sheephead | uncommon | 0–50 m | $15 | $15 | 1.00 |
| Barrel Jellyfish | uncommon | 0–50 m | $6.00 | $6.00 | 1.00 |
| Red Lionfish | uncommon | 1–50 m | $22 | $22 | 1.00 |
| Titan Triggerfish | uncommon | 1–50 m | $28 | $28 | 1.00 |
| Porcupinefish | uncommon | 2–50 m | $15 | $15 | 1.00 |
| Spotted Garden Eel | uncommon | 7–45 m | $8.00 | $8.00 | 1.00 |
| Orange-lined Triggerfish | uncommon | 2–50 m | $18 | $18 | 1.00 |
| Stoplight Parrotfish | uncommon | 3–50 m | $15 | $15 | 1.00 |
| Yellowhead Jawfish | uncommon | 3–50 m | $15 | $15 | 1.00 |
| Caribbean Spiny Lobster | uncommon | 0–55 m | $25 | $25 | 1.00 |
| Lyretail Anthias | uncommon | 0–55 m | $6.00 | $6.00 | 1.00 |
| Spotted Scorpionfish | uncommon | 1–55 m | $6.00 | $6.00 | 1.00 |
| Banded Butterflyfish | uncommon | 3–55 m | $8.00 | $8.00 | 1.00 |
| Banded Pipefish | uncommon | 5–55 m | $12 | $12 | 1.00 |
| Pacific Sea Nettle | uncommon | 0–60 m | $10 | $10 | 1.00 |
| European Seabass | uncommon | 0–60 m | $20 | $20 | 1.00 |
| Edible Crab | uncommon | 0–60 m | $6.00 | $6.00 | 1.00 |
| Blue Linckia | uncommon | 0–60 m | $12 | $12 | 1.00 |
| Pacific Seahorse | uncommon | 0–60 m | $28 | $28 | 1.00 |
| Threadfin Butterflyfish | uncommon | 1–60 m | $12 | $12 | 1.00 |
| Royal Gramma | uncommon | 1–60 m | $9.00 | $9.00 | 1.00 |
| Longhorn Cowfish | uncommon | 1–60 m | $18 | $18 | 1.00 |
| Moorish Idol | uncommon | 3–60 m | $18 | $18 | 1.00 |
| Mediterranean Slipper Lobster | uncommon | 4–60 m | $25 | $25 | 1.00 |
| Coral Beauty | uncommon | 5–60 m | $25 | $25 | 1.00 |
| Pacific Geoduck | uncommon | 0–65 m | $20 | $20 | 1.00 |
| Bluespotted Cornetfish | uncommon | 0–75 m | $6.00 | $6.00 | 1.00 |
| Fire Goby | uncommon | 6–70 m | $10 | $10 | 1.00 |
| Black Sea Bass | uncommon | 2–80 m | $10 | $10 | 1.00 |
| China Rockfish | uncommon | 3–80 m | $12 | $12 | 1.00 |
| Winter Flounder | uncommon | 0–85 m | $6.00 | $6.00 | 1.00 |
| Turbot | uncommon | 20–70 m | $25 | $25 | 1.00 |
| Blue Rockfish | uncommon | 0–90 m | $5.00 | $5.00 | 1.00 |
| Summer Flounder | uncommon | 0–90 m | $12 | $12 | 1.00 |
| Longnose Butterflyfish | uncommon | 2–90 m | $18 | $18 | 1.00 |
| Rainbow Runner | uncommon | 2–90 m | $20 | $20 | 1.00 |
| Bluefin Trevally | uncommon | 0–110 m | $18 | $18 | 1.00 |
| Yellowtail Snapper | uncommon | 0–110 m | $10 | $10 | 1.00 |
| Spanner Crab | uncommon | 10–100 m | $10 | $10 | 1.00 |
| Pennant Coralfish | uncommon | 2–110 m | $12 | $12 | 1.00 |
| Moon Jelly | uncommon | 0–120 m | $5.00 | $5.00 | 1.00 |
| Mutton Snapper | uncommon | 25–95 m | $25 | $25 | 1.00 |
| Cabezon | uncommon | 0–120 m | $12 | $12 | 1.00 |
| Common Sole | uncommon | 0–120 m | $18 | $18 | 1.00 |
| Hawaiian Bobtail Squid | uncommon | 0–120 m | $20 | $20 | 1.00 |
| Crystal Jelly | uncommon | 0–120 m | $12 | $12 | 1.00 |
| Venus' Girdle | uncommon | 0–120 m | $8.00 | $8.00 | 1.00 |
| Sea Mouse | uncommon | 0–120 m | $8.00 | $8.00 | 1.00 |
| Spotted Moray | uncommon | 1–120 m | $15 | $15 | 1.00 |
| Dungeness Crab | uncommon | 0–140 m | $8.00 | $8.00 | 1.00 |
| Bluestripe Snapper | uncommon | 3–160 m | $6.00 | $6.00 | 1.00 |
| Skipjack Tuna | uncommon | 0–200 m | $12 | $12 | 1.00 |
| Saithe | uncommon | 0–200 m | $6.00 | $6.00 | 1.00 |
| John Dory | uncommon | 20–200 m | $20 | $20 | 1.00 |
| Starry Flounder | uncommon | 0–230 m | $6.00 | $6.00 | 1.00 |
| Sunflower Sea Star | uncommon | 0–260 m | $15 | $15 | 1.00 |
| Lumpsucker | uncommon | 0–300 m | $10 | $10 | 1.00 |
| Vermilion Rockfish | uncommon | 50–250 m | $15 | $15 | 1.00 |
| Sea Angel | uncommon | 0–300 m | $10 | $10 | 1.00 |
| Haddock | uncommon | 40–300 m | $8.00 | $8.00 | 1.00 |
| Pacific Cod | uncommon | 50–300 m | $12 | $12 | 1.00 |
| Spiny Dogfish | uncommon | 10–350 m | $20 | $20 | 1.00 |
| European Hake | uncommon | 70–350 m | $6.00 | $6.00 | 1.00 |
| Yelloweye Rockfish | uncommon | 50–400 m | $20 | $20 | 1.00 |
| Ling | uncommon | 100–400 m | $12 | $12 | 1.00 |
| Longnose Lancetfish | uncommon | 100–1000 m | $25 | $30 | 1.20 |
| Ram's Horn Squid | uncommon | 450–700 m | $12 | $15 | 1.24 |
| Telescope Octopus | uncommon | 100–1200 m | $12 | $16 | 1.36 |
| Snow Crab | uncommon | 13–1300 m | $6.00 | $8.25 | 1.38 |
| Piglet Squid | uncommon | 1000–1500 m | $12 | $24 | 1.99 |
| Blue Dragon | rare | 0–1 m | $13 | $13 | 1.00 |
| Achilles Tang | rare | 0–10 m | $51 | $51 | 1.00 |
| Warty Frogfish | rare | 1–15 m | $16 | $16 | 1.00 |
| Mandarinfish | rare | 1–18 m | $13 | $13 | 1.00 |
| Giant Clam | rare | 0–20 m | $64 | $64 | 1.00 |
| Blue-ringed Octopus | rare | 0–20 m | $46 | $46 | 1.00 |
| Australian Box Jellyfish | rare | 0–20 m | $37 | $37 | 1.00 |
| Irukandji Jellyfish | rare | 0–20 m | $15 | $15 | 1.00 |
| Powder Blue Tang | rare | 0–25 m | $24 | $24 | 1.00 |
| Yellow Stingray | rare | 0–25 m | $35 | $35 | 1.00 |
| Rainbow Parrotfish | rare | 3–25 m | $42 | $42 | 1.00 |
| Reef Stonefish | rare | 0–30 m | $34 | $34 | 1.00 |
| Bluespotted Ribbontail Ray | rare | 0–30 m | $38 | $38 | 1.00 |
| Red Abalone | rare | 0–30 m | $30 | $30 | 1.00 |
| Broadclub Cuttlefish | rare | 0–30 m | $34 | $34 | 1.00 |
| Harlequin Shrimp | rare | 0–30 m | $15 | $15 | 1.00 |
| Triton's Trumpet | rare | 0–30 m | $42 | $42 | 1.00 |
| Black Sea Nettle | rare | 0–30 m | $37 | $37 | 1.00 |
| Harlequin Sweetlips | rare | 1–30 m | $35 | $35 | 1.00 |
| Zebra Mantis Shrimp | rare | 1–30 m | $27 | $27 | 1.00 |
| Hogfish | rare | 3–30 m | $34 | $34 | 1.00 |
| Mimic Octopus | rare | 0–35 m | $64 | $64 | 1.00 |
| Orbicular Batfish | rare | 1–35 m | $29 | $29 | 1.00 |
| Ornate Ghost Pipefish | rare | 3–35 m | $23 | $23 | 1.00 |
| Queen Angelfish | rare | 1–40 m | $53 | $53 | 1.00 |
| Giant Frogfish | rare | 1–40 m | $39 | $39 | 1.00 |
| Peacock Mantis Shrimp | rare | 3–40 m | $28 | $28 | 1.00 |
| Clown Triggerfish | rare | 1–45 m | $47 | $47 | 1.00 |
| Guineafowl Puffer | rare | 1–45 m | $29 | $29 | 1.00 |
| Spanish Dancer | rare | 0–50 m | $27 | $27 | 1.00 |
| Bobbit Worm | rare | 10–40 m | $50 | $50 | 1.00 |
| Epaulette Shark | rare | 0–50 m | $54 | $54 | 1.00 |
| Regal Angelfish | rare | 1–50 m | $40 | $40 | 1.00 |
| Zebra Moray | rare | 1–50 m | $49 | $49 | 1.00 |
| Leopard Shark | rare | 0–55 m | $61 | $61 | 1.00 |
| Pygmy Seahorse | rare | 16–40 m | $40 | $40 | 1.00 |
| Flamboyant Cuttlefish | rare | 3–55 m | $37 | $37 | 1.00 |
| Thorny Seahorse | rare | 3–55 m | $18 | $18 | 1.00 |
| Big-belly Seahorse | rare | 0–60 m | $28 | $28 | 1.00 |
| Lion's Mane Jellyfish | rare | 0–60 m | $42 | $42 | 1.00 |
| Orangespine Unicornfish | rare | 5–55 m | $28 | $28 | 1.00 |
| Short-snouted Seahorse | rare | 0–60 m | $17 | $17 | 1.00 |
| Emperor Angelfish | rare | 1–60 m | $56 | $56 | 1.00 |
| Nassau Grouper | rare | 1–60 m | $50 | $50 | 1.00 |
| Blue Ring Angelfish | rare | 1–60 m | $48 | $48 | 1.00 |
| Noble Pen Shell | rare | 1–60 m | $42 | $42 | 1.00 |
| Leopard Coral Grouper | rare | 3–60 m | $53 | $53 | 1.00 |
| French Angelfish | rare | 3–60 m | $47 | $47 | 1.00 |
| Bat Ray | rare | 0–65 m | $48 | $48 | 1.00 |
| Flame Angelfish | rare | 15–60 m | $23 | $23 | 1.00 |
| Leaf Scorpionfish | rare | 1–80 m | $13 | $13 | 1.00 |
| Day Octopus | rare | 0–90 m | $41 | $41 | 1.00 |
| Common Octopus | rare | 0–120 m | $43 | $43 | 1.00 |
| Common Cuttlefish | rare | 0–120 m | $29 | $29 | 1.00 |
| Red King Crab | rare | 0–120 m | $54 | $54 | 1.00 |
| Steelhead | rare | 0–120 m | $42 | $42 | 1.00 |
| Coconut Octopus | rare | 0–120 m | $30 | $30 | 1.00 |
| Red Snapper | rare | 20–120 m | $38 | $38 | 1.00 |
| Sockeye Salmon | rare | 0–150 m | $53 | $53 | 1.00 |
| Pink Salmon | rare | 0–150 m | $48 | $48 | 1.00 |
| Coho Salmon | rare | 0–150 m | $62 | $62 | 1.00 |
| Queen Triggerfish | rare | 2–170 m | $58 | $58 | 1.00 |
| Thornback Ray | rare | 5–180 m | $70 | $70 | 1.00 |
| Big Skate | rare | 3–200 m | $50 | $50 | 1.00 |
| Greater Amberjack | rare | 18–220 m | $115 | $115 | 1.00 |
| Pelagic Stingray | rare | 35–240 m | $125 | $125 | 1.00 |
| American Lobster | rare | 0–290 m | $110 | $110 | 1.00 |
| Bigeye Tuna | rare | 0–300 m | $255 | $255 | 1.00 |
| Albacore | rare | 0–350 m | $245 | $245 | 1.00 |
| Diamond Squid | rare | 0–350 m | $190 | $190 | 1.00 |
| Atlantic Torpedo | rare | 0–500 m | $295 | $295 | 1.00 |
| Spotted Ratfish | rare | 50–500 m | $365 | $365 | 1.00 |
| Pyrosome | rare | 100–500 m | $140 | $140 | 1.00 |
| Pancake Batfish | rare | 200–400 m | $160 | $160 | 1.00 |
| Firefly Squid | rare | 270–400 m | $130 | $130 | 1.00 |
| Viper Dogfish | rare | 300–400 m | $290 | $290 | 1.00 |
| Silver Hatchetfish | rare | 350–600 m | $140 | $150 | 1.07 |
| Lovely Hatchetfish | rare | 400–600 m | $175 | $190 | 1.09 |
| Basket Star | rare | 10–1000 m | $270 | $300 | 1.11 |
| Pacific Hagfish | rare | 350–850 m | $215 | $275 | 1.28 |
| Giant Hatchetfish | rare | 500–700 m | $220 | $280 | 1.27 |
| Escolar | rare | 450–850 m | $300 | $405 | 1.35 |
| Glacier Lanternfish | rare | 500–850 m | $180 | $255 | 1.42 |
| Strawberry Squid | rare | 450–950 m | $360 | $515 | 1.43 |
| Pocket Shark | rare | 450–950 m | $250 | $360 | 1.44 |
| Sea Lily | rare | 450–950 m | $250 | $355 | 1.42 |
| Spotted Lanternfish | rare | 550–950 m | $185 | $275 | 1.49 |
| Pearleye | rare | 650–1000 m | $350 | $560 | 1.60 |
| Snaggletooth | rare | 650–1000 m | $375 | $600 | 1.60 |
| Gulper Shark | rare | 550–1200 m | $480 | $795 | 1.66 |
| Glass Squid | rare | 600–1200 m | $270 | $455 | 1.69 |
| Roundnose Grenadier | rare | 650–1200 m | $410 | $695 | 1.70 |
| Black Scabbardfish | rare | 800–1200 m | $380 | $675 | 1.78 |
| Smooth Oreo | rare | 800–1200 m | $425 | $750 | 1.76 |
| Sablefish | rare | 700–1400 m | $230 | $420 | 1.83 |
| Bristlemouth | rare | 700–1400 m | $150 | $275 | 1.83 |
| Giant Opossum Shrimp | rare | 700–1400 m | $195 | $360 | 1.85 |
| Orange Roughy | rare | 850–1500 m | $305 | $595 | 1.95 |
| Atolla Jellyfish | rare | 850–1500 m | $320 | $620 | 1.94 |
| Smallscale Slickhead | rare | 850–1500 m | $295 | $570 | 1.93 |
| Deep-sea Red Shrimp | rare | 850–1500 m | $200 | $380 | 1.90 |
| Brownsnout Spookfish | rare | 850–1500 m | $400 | $770 | 1.93 |
| Big Red Jelly | rare | 900–1500 m | $220 | $425 | 1.93 |
| Cutthroat Eel | rare | 950–1900 m | $335 | $710 | 2.12 |
| Helmet Jellyfish | rare | 1000–1900 m | $305 | $650 | 2.13 |
| Pacific Grenadier | rare | 1100–1900 m | $395 | $850 | 2.15 |
| Crested Bigscale | rare | 1100–1900 m | $240 | $515 | 2.15 |
| Halosaur | rare | 1300–2000 m | $376 | $790 | 2.10 |
| Threadfin Dragonfish | rare | 1300–2900 m | $559 | $1,055 | 1.89 |
| Ghostly Seadevil | rare | 1400–2900 m | $510 | $960 | 1.88 |
| Glowing Sucker Octopus | rare | 1800–2500 m | $451 | $850 | 1.89 |
| Deep-sea Mussel | rare | 2000–2900 m | $339 | $600 | 1.77 |
| Scaly-foot Snail | rare | 2600–2900 m | $536 | $895 | 1.67 |
| Vent Shrimp | rare | 2500–3900 m | $398 | $615 | 1.55 |
| Tripod Fish | rare | 2200–4500 m | $837 | $1,255 | 1.50 |
| Swimming Sea Cucumber | rare | 2000–4800 m | $790 | $1,175 | 1.49 |
| Rattail Cusk | rare | 3200–4400 m | $828 | $1,160 | 1.40 |
| Abyssal Grenadier | rare | 3300–4900 m | $977 | $1,310 | 1.34 |
| Abyssal Red Prawn | rare | 3300–4900 m | $379 | $510 | 1.34 |
| Giant Scavenging Amphipod | rare | 3400–5000 m | $400 | $530 | 1.33 |
| Sea Pig | rare | 2700–5800 m | $938 | $1,235 | 1.32 |
| Abyssal Snailfish | rare | 4700–5100 m | $984 | $1,330 | 1.35 |
| Xenophyophore | rare | 2800–7200 m | $552 | $760 | 1.38 |
| Supergiant Amphipod | rare | 5500–6900 m | $984 | $1,425 | 1.45 |
| Abyssal Cusk-eel | rare | 4800–8100 m | $936 | $1,365 | 1.46 |
| Wonderpus Octopus | exotic | 2–20 m | $1,250 | $1,250 | 1.00 |
| Weedy Seadragon | exotic | 3–50 m | $1,420 | $1,420 | 1.00 |
| Leafy Seadragon | exotic | 4–50 m | $1,435 | $1,435 | 1.00 |
| Japanese Spider Crab | exotic | 50–400 m | $5,245 | $5,245 | 1.00 |
| Giant Larvacean | exotic | 100–350 m | $3,555 | $3,555 | 1.00 |
| Velvet Belly Lanternshark | exotic | 300–500 m | $5,135 | $5,135 | 1.00 |
| Crestfish | exotic | 270–600 m | $5,795 | $5,795 | 1.00 |
| Chambered Nautilus | exotic | 350–700 m | $5,920 | $6,835 | 1.15 |
| Sea Toad | exotic | 350–700 m | $6,700 | $7,735 | 1.15 |
| Tube-eye | exotic | 450–800 m | $6,915 | $9,175 | 1.33 |
| Dealfish | exotic | 500–850 m | $7,775 | $10,900 | 1.40 |
| Deep-sea Spiny Eel | exotic | 450–950 m | $7,055 | $10,135 | 1.44 |
| Glass Octopus | exotic | 450–950 m | $7,210 | $10,355 | 1.44 |
| Cockatoo Squid | exotic | 450–950 m | $6,320 | $9,080 | 1.44 |
| Bramble Shark | exotic | 550–900 m | $7,490 | $11,015 | 1.47 |
| Giant Siphonophore | exotic | 550–950 m | $7,450 | $11,205 | 1.50 |
| Bloody-belly Comb Jelly | exotic | 550–950 m | $6,510 | $9,790 | 1.50 |
| Dana Octopus Squid | exotic | 550–950 m | $7,490 | $11,260 | 1.50 |
| Vampire Squid | exotic | 750–1000 m | $7,165 | $11,835 | 1.65 |
| Shining Tubeshoulder | exotic | 750–1200 m | $6,385 | $11,200 | 1.75 |
| Cookiecutter Shark | exotic | 800–1200 m | $6,785 | $12,065 | 1.78 |
| Knifenose Chimaera | exotic | 800–1200 m | $7,530 | $13,395 | 1.78 |
| Flapjack Octopus | exotic | 650–1400 m | $7,025 | $12,655 | 1.80 |
| Scaly Dragonfish | exotic | 850–1500 m | $6,690 | $12,915 | 1.93 |
| Atlantic Footballfish | exotic | 850–1500 m | $7,280 | $14,060 | 1.93 |
| False Catshark | exotic | 850–1500 m | $7,490 | $14,460 | 1.93 |
| Highfin Dragonfish | exotic | 850–1500 m | $6,290 | $12,150 | 1.93 |
| Hairy Angler | exotic | 900–1500 m | $6,960 | $13,580 | 1.95 |
| Ninja Lanternshark | exotic | 1000–1400 m | $6,670 | $13,010 | 1.95 |
| Deepstaria | exotic | 1000–1700 m | $7,350 | $15,145 | 2.06 |
| Snipe Eel | exotic | 850–1900 m | $7,155 | $14,865 | 2.08 |
| Portuguese Dogfish | exotic | 950–1900 m | $7,180 | $15,160 | 2.11 |
| Black Dragonfish | exotic | 1000–1900 m | $7,370 | $15,675 | 2.13 |
| Pacific Blackdragon | exotic | 1000–1900 m | $6,925 | $14,735 | 2.13 |
| Triplewart Seadevil | exotic | 1000–1900 m | $7,090 | $15,080 | 2.13 |
| Telescopefish | exotic | 1000–1900 m | $6,700 | $14,255 | 2.13 |
| Sabertooth Fish | exotic | 1000–1900 m | $6,385 | $13,580 | 2.13 |
| Wolftrap Angler | exotic | 1100–1900 m | $6,180 | $13,340 | 2.16 |
| Giant Isopod | exotic | 950–2100 m | $7,113 | $15,270 | 2.15 |
| Blob Sculpin | exotic | 1300–2000 m | $7,719 | $16,140 | 2.09 |
| Daggertooth | exotic | 1200–2600 m | $8,838 | $17,520 | 1.98 |
| Deep-sea Lizardfish | exotic | 1500–2400 m | $8,679 | $17,020 | 1.96 |
| Sloane's Viperfish | exotic | 1300–2900 m | $9,048 | $17,195 | 1.90 |
| Black Swallower | exotic | 1500–2700 m | $9,100 | $17,295 | 1.90 |
| Pacific Viperfish | exotic | 1300–2900 m | $8,697 | $16,530 | 1.90 |
| Yeti Crab | exotic | 2200–2201 m | $9,350 | $17,405 | 1.86 |
| Stoplight Loosejaw | exotic | 1600–2900 m | $9,453 | $17,420 | 1.84 |
| Whipnose Angler | exotic | 1700–2900 m | $9,968 | $18,180 | 1.82 |
| Bobtail Snipe Eel | exotic | 1700–2900 m | $8,806 | $16,075 | 1.83 |
| Giant Sea Spider | exotic | 1700–3800 m | $11,562 | $19,345 | 1.67 |
| Dumbo Octopus | exotic | 2300–3900 m | $12,897 | $20,270 | 1.57 |
| Highfin Lizardfish | exotic | 3600–4800 m | $17,026 | $22,500 | 1.32 |
| Silvered Mirrorfish | undocumented | 700–1300 m | $1,200 | $2,135 | 1.78 |
| Glassbone Hatchetfish | undocumented | 850–1500 m | $1,000 | $1,930 | 1.93 |
| Canyon Ember-lure Angler | undocumented | 1200–1600 m | $2,400 | $5,025 | 2.09 |
| Banded Glow Eel | undocumented | 1400–2500 m | $1,960 | $3,845 | 1.96 |
| Steadylight Dragonfish | undocumented | 1500–2500 m | $2,500 | $4,850 | 1.94 |
| Crowned Hagfish | undocumented | 2200–3400 m | $2,970 | $4,925 | 1.66 |
| Falling-star Squid | undocumented | 2200–3400 m | $6,600 | $10,940 | 1.66 |
| Vent Skate | undocumented | 3000–3500 m | $5,625 | $8,615 | 1.53 |
| Brine-shore Cusk-eel | undocumented | 3300–3400 m | $5,390 | $8,120 | 1.51 |
| Nodule-armoured Crab | undocumented | 3500–4000 m | $5,525 | $7,805 | 1.41 |
| Silt-walking Tripodfish | undocumented | 4300–5000 m | $8,400 | $11,195 | 1.33 |
| Great Pale Snailfish | undocumented | 5100–5101 m | $9,600 | $13,130 | 1.37 |
| the Coelacanth | legendary | 200–290 m | $80,000 | $150,000 | 1.88 |
| the Oarfish | legendary | 450–950 m | $96,000 | $215,545 | 2.25 |
| the Barreleye | legendary | 650–800 m | $97,000 | $220,640 | 2.27 |
| the Vampire Squid | legendary | 750–1000 m | $104,000 | $247,730 | 2.38 |
| the Blobfish | legendary | 800–1200 m | $108,000 | $266,775 | 2.47 |
| the Dragonfish | legendary | 1000–1900 m | $121,000 | $319,125 | 2.64 |
| the Isopod | legendary | 950–2100 m | $124,538 | $326,170 | 2.62 |
| the Grenadier | legendary | 1200–2400 m | $148,350 | $349,245 | 2.35 |
| the Fangtooth | legendary | 1300–2900 m | $174,200 | $370,610 | 2.13 |
| the Viperfish | legendary | 1300–2900 m | $174,200 | $370,610 | 2.13 |
| the Swallower | legendary | 1500–2700 m | $174,200 | $370,610 | 2.13 |
| the Anglerfish | legendary | 1400–2900 m | $178,875 | $373,860 | 2.09 |
| the Gulper Eel | legendary | 1500–2900 m | $183,600 | $377,035 | 2.05 |
| the Dumbo | legendary | 2300–3900 m | $264,600 | $424,245 | 1.60 |
| the Tripod | legendary | 2200–4500 m | $288,750 | $434,880 | 1.51 |

(7.2.8 here includes its old bonus for deep catches below 1,500 m, at the middle of the usual depths; that bonus is retired.)

## Gear

Common, uncommon and rare gear: unchanged ($25–250, $300–1,000, $1,000–2,000). Exotic and legendary, each item:

| Item | Rarity | Where | 7.2.8 | Now |
|---|---|---|---|---|
| Echo+ | exotic | chest (scroll) | $12,000 | $32,500 |
| Flare+ | exotic | chest (scroll) | $12,000 | $32,500 |
| Dash+ | exotic | chest (scroll) | $12,000 | $32,500 |
| Vigor+ | exotic | chest (scroll) | $12,000 | $32,500 |
| Sprint+ | exotic | chest (scroll) | $12,000 | $32,500 |
| Trieste Descent net | exotic | chest | $10,000 | $29,000 |
| Trieste Descent catch bag | exotic | chest | $8,000 | $25,000 |
| Trieste Descent cylinder | exotic | chest | $14,500 | $37,000 |
| Trieste Descent fins | exotic | chest | $15,500 | $38,500 |
| Trieste Descent suit | exotic | chest | $21,500 | $48,000 |
| Sealab Aquanaut net | exotic | chest | $8,900 | $27,000 |
| Sealab Aquanaut catch bag | exotic | chest | $13,500 | $35,500 |
| Sealab Aquanaut cylinder | exotic | chest | $25,500 | $54,000 |
| Sealab Aquanaut fins | exotic | chest | $8,000 | $25,000 |
| Sealab Aquanaut suit | exotic | chest | $24,500 | $52,500 |
| Challenger Expedition net | exotic | chest | $30,000 | $60,000 |
| Challenger Expedition catch bag | exotic | chest | $10,000 | $29,000 |
| Challenger Expedition cylinder | exotic | chest | $8,800 | $26,500 |
| Challenger Expedition fins | exotic | chest | $15,500 | $38,500 |
| Challenger Expedition suit | exotic | chest | $22,500 | $49,500 |
| Bathysphere 1934 net | exotic | chest | $23,000 | $50,500 |
| Bathysphere 1934 catch bag | exotic | chest | $10,000 | $29,000 |
| Bathysphere 1934 cylinder | exotic | chest | $11,000 | $31,000 |
| Bathysphere 1934 fins | exotic | chest | $14,500 | $37,000 |
| Bathysphere 1934 suit | exotic | chest | $30,000 | $60,000 |
| Abyssal strobe camera, 1954 | exotic | chest | $13,500 | $35,500 |
| Galathea plate camera | exotic | chest | $17,000 | $41,000 |
| Sealab strobe rig | exotic | chest | $21,000 | $47,500 |
| Trieste porthole camera, 1960 | exotic | chest | $25,500 | $54,000 |
| Bathysphere window camera, 1934 | exotic | chest | $10,000 | $29,000 |
| Galathea expedition wetsuit | exotic | chest | $9,400 | $28,000 |
| Deep Quest pilot's suit | exotic | chest | $22,000 | $49,000 |
| Hydrolab saturation suit | exotic | chest | $21,000 | $47,500 |
| Kalymnos skafandro | exotic | chest | $28,000 | $57,500 |
| Pearl lugger's canvas suit | exotic | chest | $29,500 | $59,500 |
| Trieste crew coveralls | exotic | chest | $20,000 | $46,000 |
| Polar survey drysuit | exotic | chest | $21,000 | $47,500 |
| Shark researcher's mesh | exotic | chest | $13,500 | $35,500 |
| Clearance diver's suit | exotic | chest | $14,500 | $37,000 |
| Frogman's drysuit, 1944 | exotic | chest | $21,000 | $47,500 |
| Tektite habitat suit | exotic | chest | $11,500 | $32,000 |
| Conshelf aquanaut suit | exotic | chest | $8,000 | $25,000 |
| Sealab heated suit | exotic | chest | $19,500 | $45,000 |
| Standard diving dress | exotic | chest | $30,000 | $60,000 |
| Bathysphere observer's woollens, 1934 | exotic | chest | $20,500 | $46,500 |
| Vitiaz bottom pouch | exotic | chest | $21,000 | $47,500 |
| Hirondelle fishing creel | exotic | chest | $10,000 | $29,000 |
| Conshelf garden bag | exotic | chest | $21,000 | $47,500 |
| Meteor survey haversack | exotic | chest | $17,000 | $41,000 |
| Trieste tool roll | exotic | chest | $8,000 | $25,000 |
| Valdivia specimen crate | exotic | chest | $30,000 | $60,000 |
| Albatross core pouch | exotic | chest | $17,000 | $41,000 |
| Bathysphere sample box | exotic | chest | $30,000 | $60,000 |
| Sealab collection bag | exotic | chest | $25,500 | $54,000 |
| Siboga reef basket | exotic | chest | $25,500 | $54,000 |
| Kalymnos sponge sack | exotic | chest | $25,500 | $54,000 |
| Pearl lugger's net bag | exotic | chest | $21,000 | $47,500 |
| Dana larva pouch | exotic | chest | $13,500 | $35,500 |
| Galathea sample jar case | exotic | chest | $17,000 | $41,000 |
| Challenger specimen satchel | exotic | chest | $13,500 | $35,500 |
| Polar survey cylinders | exotic | chest | $12,000 | $32,500 |
| Salvage diver's bailout | exotic | chest | $8,000 | $25,000 |
| Lake Zurich mixed-gas rig, 1962 | exotic | chest | $27,500 | $56,500 |
| Argonaut diving bell tank | exotic | chest | $9,700 | $28,500 |
| Deep Quest gas bank | exotic | chest | $15,500 | $38,500 |
| Trieste reserve sphere | exotic | chest | $14,000 | $36,000 |
| Frogman's chest pack | exotic | chest | $10,500 | $30,000 |
| Hydrolab bottle | exotic | chest | $16,500 | $40,500 |
| Naval oxygen rebreather, 1940 | exotic | chest | $30,000 | $60,000 |
| Tektite rebreather | exotic | chest | $29,000 | $58,500 |
| Conshelf twin set | exotic | chest | $13,500 | $35,500 |
| Aqualung prototype, 1943 | exotic | chest | $8,300 | $25,500 |
| Bathysphere oxygen flask, 1934 | exotic | chest | $12,500 | $33,500 |
| Sealab II mixed-gas pack | exotic | chest | $26,500 | $55,500 |
| Navy reserve cylinder | exotic | chest | $9,400 | $28,000 |
| La Jolla survey fins | exotic | chest | $28,500 | $58,000 |
| Galathea deck fins | exotic | chest | $11,500 | $32,000 |
| Kalymnos sponge diver's blades | exotic | chest | $17,500 | $42,000 |
| Pearl lugger paddles | exotic | chest | $18,500 | $43,500 |
| Hydrolab fins | exotic | chest | $8,500 | $26,000 |
| Bikini Atoll survey fins, 1946 | exotic | chest | $19,500 | $45,000 |
| Clearance diver fins | exotic | chest | $30,000 | $60,000 |
| Trieste crew fins | exotic | chest | $10,500 | $30,000 |
| Arctic survey fins | exotic | chest | $21,000 | $47,500 |
| Spearfisher's blades, 1933 | exotic | chest | $12,500 | $33,500 |
| Tektite habitat fins | exotic | chest | $19,500 | $45,000 |
| Conshelf habitat fins | exotic | chest | $9,500 | $28,000 |
| Sealab II diver's fins | exotic | chest | $18,500 | $43,500 |
| Ligurian prototype blades, 1938 | exotic | chest | $16,500 | $40,500 |
| Frogman fins, 1944 | exotic | chest | $26,000 | $54,500 |
| Atlantis line net | exotic | chest | $8,400 | $26,000 |
| Dana eel net | exotic | chest | $8,900 | $27,000 |
| Carnegie survey net | exotic | chest | $9,300 | $27,500 |
| Hirondelle fishing net | exotic | chest | $8,400 | $26,000 |
| Vitiaz bottom net | exotic | chest | $30,000 | $60,000 |
| Siboga reef scoop | exotic | chest | $8,000 | $25,000 |
| Valdivia deep-sea net, 1898 | exotic | chest | $10,000 | $29,000 |
| Discovery ring net | exotic | chest | $23,000 | $50,500 |
| Meteor survey hoop net | exotic | chest | $9,300 | $27,500 |
| Galathea trawl purse | exotic | chest | $30,000 | $60,000 |
| Albatross plankton net | exotic | chest | $8,000 | $25,000 |
| Sealab hand seine | exotic | chest | $8,900 | $27,000 |
| Trieste collecting scoop, 1960 | exotic | chest | $10,000 | $29,000 |
| Bathysphere sampling net, 1934 | exotic | chest | $23,000 | $50,500 |
| Challenger dredge bag | exotic | chest | $30,000 | $60,000 |
| Bathythermal prototype suit | exotic | station | $23,500 | $51,000 |
| Deep lander optic, 1985 | exotic | station | $30,000 | $60,000 |
| Grand Banks trawl-wing net | exotic | dave | $30,000 | $60,000 |
| Iron Lung hardsuit | exotic | dave | $29,500 | $59,500 |
| North Sea heated suit | exotic | dave | $25,000 | $53,000 |
| Combat swimmer's drysuit | exotic | dave | $21,000 | $47,500 |
| Gulf oilfield hardsuit | exotic | dave | $30,000 | $60,000 |
| Navy prototype rebreather | exotic | dave | $24,500 | $52,500 |
| Clearance diver's rebreather suit | exotic | dave | $22,000 | $49,000 |
| Navy low-light camera, 1971 | exotic | dave | $8,000 | $25,000 |
| Tidewarden | legendary | chest (scroll) | $72,000 | $139,000 |
| Fathom | legendary | chest (scroll) | $72,000 | $139,000 |
| Lighthouse | legendary | chest (scroll) | $72,000 | $139,000 |
| Undertow | legendary | chest (scroll) | $72,000 | $139,000 |
| Apex | legendary | chest (scroll) | $72,000 | $139,000 |
| Riptide | legendary | chest (scroll) | $72,000 | $139,000 |
| Flashlight Fish Strobe | legendary | chest | $54,000 | $100,000 |
| Barreleye Lens | legendary | chest | $54,000 | $100,000 |
| Hagfish Mantle | legendary | chest | $90,000 | $180,000 |
| Abyssal Hide | legendary | chest | $90,000 | $180,000 |
| Skin of the Old One | legendary | chest | $90,000 | $180,000 |
| Eel-skin Purse | legendary | chest | $90,000 | $180,000 |
| The Stomach | legendary | chest | $90,000 | $180,000 |
| Brood Pouch | legendary | chest | $90,000 | $180,000 |
| Vent Heart | legendary | chest | $90,000 | $180,000 |
| Whalefall Breath | legendary | chest | $90,000 | $180,000 |
| The Black Lung | legendary | chest | $90,000 | $180,000 |
| Glasswing Fins | legendary | chest | $90,000 | $180,000 |
| Leviathan's Pinions | legendary | chest | $90,000 | $180,000 |
| Oarfish Crest | legendary | chest | $90,000 | $180,000 |
| The Old One's Tithe | legendary | chest | $90,000 | $180,000 |
| Jonah's Seine | legendary | chest | $90,000 | $180,000 |
| The Hagfish's Knot | legendary | chest | $90,000 | $180,000 |
| Lanternmesh | legendary | chest | $90,000 | $180,000 |
| The Drowned Choir's Veil | legendary | chest | $90,000 | $180,000 |
| Gulper's Throat | legendary | chest | $90,000 | $180,000 |

## Chests

| Chest | 7.2.8 | Now |
|---|---|---|
| Pine crate | $900 | $900 |
| Large pine crate | $3,100 | $3,100 |
| Tea chest | $3,800 | $6,000 |
| Station case | $1,700 | $1,700 |
| Large station case | $5,000 | $5,000 |
| Footlocker | $7,500 | $16,000 |
| Strongbox | $15,000 | $35,500 |
| Salvage trunk | $14,000 | $28,500 |
| Expedition trunk | $20,000 | $42,000 |
| Siren's casket | $27,000 | $61,000 |
| Leviathan's hoard | $50,000 | $110,000 |
| Poseidon's chest | $100,000 | $225,000 |

## Submersibles

| Sub | Rated | 7.2.8 | Now |
|---|---|---|---|
| Б-7 bathyscaphe | 300 m | $0.00 | $0.00 |
| Б-7М refit | 500 m | $500 | $500 |
| Work submersible | 900 m | $3,000 | $3,000 |
| Heavy work submersible | 1,300 m | $12,000 | $17,000 |
| Research submersible | 1,900 m | $40,000 | $40,000 |
| Deep research submersible | 2,500 m | $100,000 | $100,000 |
| Titanium research submersible | 3,300 m | $220,000 | $220,000 |
| Full-ocean-depth submersible | 4,500 m | $450,000 | $450,000 |

## Traps

| Trap | 7.2.8 | Now |
|---|---|---|
| Wire pot | $130 (8 max, 4–8 fish in 5 min) | $90 (5 animals in 5 min) |
| Fish trap | $1,600 | $100 (10 animals in 30 min) |
| Steel pot | $17,500 | retired: becomes the deep trap |
| Deep cage / Deep trap (Dave's) | $90,000 | $3,300 (20 animals in 4 h) |

## Other amounts

| What | 7.2.8 | Now |
|---|---|---|
| Hospital bill (10 % of cash), at most | $10,000 | $25,000 |
| The aquarium, a gallery day (10 min), at most | no limit | $1,500 |
| One photograph, at most | no limit (up to about $390,000 now) | $50,000, and no depth curve |
| Quests, top two tiers (catch, deep, sell, photo, tag) | $1,350–13,000 | $2,000–28,600 |
| Radio contracts | market + premium | the same (follows the new values) |
| Daily gift cash | $300–30,000 | unchanged (its chests are worth more) |
| Supplies: lure, glow stick, advanced glow stick, backup air | $5,000, $370, $1,700, $800 | unchanged |
| Selling gear back | a third of its price | the same (of the new price) |
