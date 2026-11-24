# The economy (7.3.0): what is in the game, how it was measured, and what is left

Agreed with the owner step by step (the first remaster in 7.2.17, this second one after it). The full table of 7.2.8
against now is at the end.

## 1. Where the animals are

- **How often each kind is met at a depth** (`fauna.js depthPref`, owner): most often in its usual band; above the
  band it falls away quickly; below it, it keeps turning up all the way to the deepest it has been recorded, fading
  only to about a third. Past its busiest point inside the band a deep kind eases only a little. No depth is a swarm
  of one kind, because so many overlap.
- **What is met:** of every animal met anywhere, exotics (undocumented ones counted with them) 3 %, legendaries 0.05 %
  (`specimens.js rarityShare`). Rarity belongs to the species, never to where it is found.
- **The deep's ordinary animals** (owner): below 2,000 m the dark water is filled with the deep's own rare animals, not
  exotics: abyssal red prawns most of all, deep-sea red shrimp, bristlemouths and abyssal cusk-eels in open water, and
  near the floor grenadiers, rattails, snailfish, scavenging amphipods and swimming sea cucumbers (`fauna.js
  DEEP_FILL`). After FishBase and SeaLifeBase: the scavenging amphipod keeps near the bottom; the abyssal cusk-eel is a
  fish of the open water.
- **Measured** (every animal made at each depth, five places, five minutes each): from 1,600 m down, 96-98 % rare and
  2-4 % exotic at every depth, still plentiful at 4,500 m and thinning in the narrow trench at 5,000 m.

## 2. What they pay

- **Three times as much for every 1,000 m** of the middle of an animal's usual depths below 450 m
  (`specimens.js depthCurve`). A silver hatchetfish (about 475 m) $145, a threadfin dragonfish (2,100 m) about
  $2,600, an abyssal red prawn (4,100 m) about $9,100; a Pacific viperfish (exotic, 2,100 m) about $41,000; the
  dearest exotic (the great pale snailfish) about $662,000. The abyssal cusk-eel, whose usual depths reach far below
  the world's floor, about $284,000 (owner: keep the recorded depths).
- **Legends** never under five times the dearest exotic: the coelacanth of the shallows $3,350,000, the tripod of the
  abyss $5,000,000, each by how deep it lives.
- **Photographs** pay on the animal's price without the depth curve and never more than $50,000 a photo; the aquarium
  at most $1,500 a gallery day (owner: fair).

## 3. Income per hour, measured, and prices from it

The average worth of what is made at each submersible's working depth (85 % of its rating) was measured in the game;
then: animals a dive (its tank, the best net for it), at half a perfect player's pace, condition 0.8.

| Sub | Working depth | Average animal | Income per hour |
|---|---|---|---|
| Б-7 bathyscaphe | 255 m | $96 | about $1,400 |
| Б-7М refit | 425 m | $209 | about $4,600 |
| Work submersible | 765 m | $487 | about $11,900 |
| Heavy work submersible | 1,105 m | $838 | about $23,000 |
| Research submersible | 1,615 m | $1,014 | about $26,600 |
| Deep research submersible | 2,125 m | $1,608 | about $59,000 |
| Titanium research submersible | 2,805 m | $3,665 | about $153,000 |
| Full-ocean-depth submersible | 3,825 m | $73,767 | about $3,300,000 |

Everything is priced as hours of income at the depth where it is wanted (owner's table):

- **Submersibles:** each one 1, 1.5, 2, 2.5, 3, 4 and 5 hours of the one before: $1,400, $6,800, $24,000, $58,000,
  $80,000, $240,000, $765,000.
- **Gear:** common about ten minutes of the first sub's income ($25-250, unchanged); uncommon fifteen of the refit's
  ($400-1,200); rare half an hour of the work subs' ($5,000-14,000); exotic one to two hours at research depth
  ($40,000-120,000); legendary three to five hours of the deepest sub's ($10-17 million). Each keeps its place in its
  rarity. Selling back pays a third.
- **Chests:** each moved with what is in it, keeping its 7.2.8 value for money (pine crate $2,300 ... Poseidon's chest
  about $5.45 million).
- **The deep trawl net** (new, owner): holds twenty-four, as many as the deepest submersibles carry; $25,000.
- **Traps** (owner): up to three set at a time, up to three of each owned. The wire pot $90 (5 animals in 5 minutes;
  a haul averages $40 on sand, $314 on the reef), the fish trap $150 (15 animals in 30 minutes, about $285), the deep
  trap $4,500 (Dave's; 20 animals in 4 hours, $5,000-13,000 brought up dead by the winch). At the buoy a full trap can
  be **cashed out** (the whole catch sold there, the climb from deep water counted) or put in the bag.
- **Quests:** each tier a quarter of an hour to an hour of the income at the depth it asks for.
- **The hospital bill:** 10 % of cash, at most half an hour of what his submersible earns.
- **Unchanged:** supplies (bought over and over), the daily gift (its chests are worth more now by themselves), radio
  contracts (they pay the market price and follow it), the revive (a real purchase).

## 4. Left for later (the owner's list)

- The engine and other refit steps (fifty small steps, about $275,000 in all) were not re-priced: say if they should
  follow the same rule.
- Tutorial wording, seaweed thinning with depth, the code tidy-up, a "stay" button for pets, the main storyline
  (`docs/PLAN_7.3.md`); later by the owner's word: scroll merging and a scroll chest, removing contracts and passive
  income, the character creator (an artist), reinforcement, bosses, a health bar, paid deeper zones, rebirth.

## 5. Design audit (7.2.18): against the philosophy

Fixed: the inventory's compare arrow (a brass-yellow CSS circle with a typed arrow, now a painted riveted tab); the
daily gift's "$" (the painted notes) and its ticks (a "Claimed" stamp); keyboard hints on the trap panel ("Space",
"↑ ↓ or the wheel, with Shift") hidden on a phone; the glove drawn through curves (no rectangles or ovals); Riptide's
round glow (a wide soft light now); legendary sparks spilling onto the card beside them.

Found, for the owner to decide (not changed):
- **Settings toggles** are phone-app switches (a pill with a sliding knob): app-like. A brass toggle lever or a
  rocker switch on the steel plate would suit.
- **Typed symbols standing in for things**: a ★ before a famous pet's name (world label and prompt); a floating ♥ over
  happy fish in the aquarium (cheerful, and a typed glyph); "✓ safe at the surface" in bright green (#78dc8c, off the
  palette) in the tank room and the bag; ▲ ▼ beside better and worse figures (the yard, the compare table). The
  journal's ✓ for a caught animal reads as a pencil tick in a book, so it may be fine.
- **Round "i" badges** on the shop's chests and on quest rows: a generic info symbol; a small tag or a "?" stamped on
  the plate would be the game's own.
- **The shop's Test tab** shows in every web build (by 6.9.0's design: never in an App Store build). The rules say
  there is no developer cheat in the shipped game; if the web build is shipped to players, it should go behind a
  hidden switch.
- **The deep trap's picture** is cut off at the top on the shop's wide cards (the tall cage in a wide frame).

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
| Sand Dollar | common | 0–950 m | $0.50 | $0.51 | 1.02 |
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
| Longnose Lancetfish | uncommon | 100–1000 m | $25 | $28 | 1.12 |
| Ram's Horn Squid | uncommon | 450–700 m | $12 | $14 | 1.15 |
| Telescope Octopus | uncommon | 100–1200 m | $12 | $15 | 1.25 |
| Snow Crab | uncommon | 13–1300 m | $6.00 | $7.53 | 1.26 |
| Piglet Squid | uncommon | 1000–1500 m | $12 | $29 | 2.41 |
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
| Silver Hatchetfish | rare | 350–600 m | $140 | $145 | 1.04 |
| Lovely Hatchetfish | rare | 400–600 m | $175 | $185 | 1.06 |
| Basket Star | rare | 10–1000 m | $270 | $285 | 1.06 |
| Pacific Hagfish | rare | 350–850 m | $215 | $250 | 1.16 |
| Giant Hatchetfish | rare | 500–700 m | $220 | $255 | 1.16 |
| Escolar | rare | 450–850 m | $300 | $370 | 1.23 |
| Glacier Lanternfish | rare | 500–850 m | $180 | $230 | 1.28 |
| Strawberry Squid | rare | 450–950 m | $360 | $475 | 1.32 |
| Pocket Shark | rare | 450–950 m | $250 | $330 | 1.32 |
| Sea Lily | rare | 450–950 m | $250 | $325 | 1.30 |
| Spotted Lanternfish | rare | 550–950 m | $185 | $255 | 1.38 |
| Pearleye | rare | 650–1000 m | $350 | $530 | 1.51 |
| Snaggletooth | rare | 650–1000 m | $375 | $570 | 1.52 |
| Gulper Shark | rare | 550–1200 m | $480 | $765 | 1.59 |
| Glass Squid | rare | 600–1200 m | $270 | $440 | 1.63 |
| Roundnose Grenadier | rare | 650–1200 m | $410 | $685 | 1.67 |
| Black Scabbardfish | rare | 800–1200 m | $380 | $695 | 1.83 |
| Smooth Oreo | rare | 800–1200 m | $425 | $775 | 1.82 |
| Sablefish | rare | 700–1400 m | $230 | $445 | 1.93 |
| Bristlemouth | rare | 700–1400 m | $150 | $290 | 1.93 |
| Giant Opossum Shrimp | rare | 700–1400 m | $195 | $380 | 1.95 |
| Orange Roughy | rare | 850–1500 m | $305 | $680 | 2.23 |
| Atolla Jellyfish | rare | 850–1500 m | $320 | $715 | 2.23 |
| Smallscale Slickhead | rare | 850–1500 m | $295 | $655 | 2.22 |
| Deep-sea Red Shrimp | rare | 850–1500 m | $200 | $440 | 2.20 |
| Brownsnout Spookfish | rare | 850–1500 m | $400 | $885 | 2.21 |
| Big Red Jelly | rare | 900–1500 m | $220 | $495 | 2.25 |
| Cutthroat Eel | rare | 950–1900 m | $335 | $980 | 2.93 |
| Helmet Jellyfish | rare | 1000–1900 m | $305 | $915 | 3.00 |
| Pacific Grenadier | rare | 1100–1900 m | $395 | $1,250 | 3.16 |
| Crested Bigscale | rare | 1100–1900 m | $240 | $755 | 3.15 |
| Halosaur | rare | 1300–2000 m | $376 | $1,310 | 3.48 |
| Threadfin Dragonfish | rare | 1300–2900 m | $559 | $2,620 | 4.69 |
| Ghostly Seadevil | rare | 1400–2900 m | $510 | $2,495 | 4.89 |
| Glowing Sucker Octopus | rare | 1800–2500 m | $451 | $2,205 | 4.89 |
| Deep-sea Mussel | rare | 2000–2900 m | $339 | $2,065 | 6.09 |
| Scaly-foot Snail | rare | 2600–2900 m | $536 | $4,115 | 7.67 |
| Vent Shrimp | rare | 2500–3900 m | $398 | $4,430 | 11.14 |
| Tripod Fish | rare | 2200–4500 m | $837 | $10,480 | 12.52 |
| Swimming Sea Cucumber | rare | 2000–4800 m | $790 | $10,320 | 13.07 |
| Rattail Cusk | rare | 3200–4400 m | $828 | $15,280 | 18.46 |
| Abyssal Grenadier | rare | 3300–4900 m | $977 | $23,430 | 23.97 |
| Abyssal Red Prawn | rare | 3300–4900 m | $379 | $9,130 | 24.06 |
| Giant Scavenging Amphipod | rare | 3400–5000 m | $400 | $10,460 | 26.18 |
| Sea Pig | rare | 2700–5800 m | $938 | $25,745 | 27.44 |
| Abyssal Snailfish | rare | 4700–5100 m | $984 | $54,510 | 55.40 |
| Xenophyophore | rare | 2800–7200 m | $552 | $34,455 | 62.42 |
| Supergiant Amphipod | rare | 5500–6900 m | $984 | $227,880 | 231.59 |
| Abyssal Cusk-eel | rare | 4800–8100 m | $936 | $284,265 | 303.70 |
| Wonderpus Octopus | exotic | 2–20 m | $1,250 | $1,250 | 1.00 |
| Weedy Seadragon | exotic | 3–50 m | $1,420 | $1,420 | 1.00 |
| Leafy Seadragon | exotic | 4–50 m | $1,435 | $1,435 | 1.00 |
| Japanese Spider Crab | exotic | 50–400 m | $5,245 | $5,245 | 1.00 |
| Giant Larvacean | exotic | 100–350 m | $3,555 | $3,555 | 1.00 |
| Velvet Belly Lanternshark | exotic | 300–500 m | $5,135 | $5,135 | 1.00 |
| Crestfish | exotic | 270–600 m | $5,795 | $5,795 | 1.00 |
| Chambered Nautilus | exotic | 350–700 m | $5,920 | $6,430 | 1.09 |
| Sea Toad | exotic | 350–700 m | $6,700 | $7,275 | 1.09 |
| Tube-eye | exotic | 450–800 m | $6,915 | $8,385 | 1.21 |
| Dealfish | exotic | 500–850 m | $7,775 | $9,960 | 1.28 |
| Deep-sea Spiny Eel | exotic | 450–950 m | $7,055 | $9,280 | 1.32 |
| Glass Octopus | exotic | 450–950 m | $7,210 | $9,485 | 1.32 |
| Cockatoo Squid | exotic | 450–950 m | $6,320 | $8,315 | 1.32 |
| Bramble Shark | exotic | 550–900 m | $7,490 | $10,130 | 1.35 |
| Giant Siphonophore | exotic | 550–950 m | $7,450 | $10,360 | 1.39 |
| Bloody-belly Comb Jelly | exotic | 550–950 m | $6,510 | $9,050 | 1.39 |
| Dana Octopus Squid | exotic | 550–950 m | $7,490 | $10,415 | 1.39 |
| Vampire Squid | exotic | 750–1000 m | $7,165 | $11,430 | 1.60 |
| Shining Tubeshoulder | exotic | 750–1200 m | $6,385 | $11,365 | 1.78 |
| Cookiecutter Shark | exotic | 800–1200 m | $6,785 | $12,415 | 1.83 |
| Knifenose Chimaera | exotic | 800–1200 m | $7,530 | $13,780 | 1.83 |
| Flapjack Octopus | exotic | 650–1400 m | $7,025 | $13,210 | 1.88 |
| Scaly Dragonfish | exotic | 850–1500 m | $6,690 | $14,835 | 2.22 |
| Atlantic Footballfish | exotic | 850–1500 m | $7,280 | $16,150 | 2.22 |
| False Catshark | exotic | 850–1500 m | $7,490 | $16,610 | 2.22 |
| Highfin Dragonfish | exotic | 850–1500 m | $6,290 | $13,955 | 2.22 |
| Hairy Angler | exotic | 900–1500 m | $6,960 | $15,870 | 2.28 |
| Ninja Lanternshark | exotic | 1000–1400 m | $6,670 | $15,205 | 2.28 |
| Deepstaria | exotic | 1000–1700 m | $7,350 | $19,755 | 2.69 |
| Snipe Eel | exotic | 850–1900 m | $7,155 | $19,765 | 2.76 |
| Portuguese Dogfish | exotic | 950–1900 m | $7,180 | $20,960 | 2.92 |
| Black Dragonfish | exotic | 1000–1900 m | $7,370 | $22,105 | 3.00 |
| Pacific Blackdragon | exotic | 1000–1900 m | $6,925 | $20,780 | 3.00 |
| Triplewart Seadevil | exotic | 1000–1900 m | $7,090 | $21,265 | 3.00 |
| Telescopefish | exotic | 1000–1900 m | $6,700 | $20,100 | 3.00 |
| Sabertooth Fish | exotic | 1000–1900 m | $6,385 | $19,155 | 3.00 |
| Wolftrap Angler | exotic | 1100–1900 m | $6,180 | $19,585 | 3.17 |
| Giant Isopod | exotic | 950–2100 m | $7,113 | $22,880 | 3.22 |
| Blob Sculpin | exotic | 1300–2000 m | $7,719 | $26,835 | 3.48 |
| Daggertooth | exotic | 1200–2600 m | $8,838 | $36,230 | 4.10 |
| Deep-sea Lizardfish | exotic | 1500–2400 m | $8,679 | $36,810 | 4.24 |
| Sloane's Viperfish | exotic | 1300–2900 m | $9,048 | $42,640 | 4.71 |
| Black Swallower | exotic | 1500–2700 m | $9,100 | $42,895 | 4.71 |
| Pacific Viperfish | exotic | 1300–2900 m | $8,697 | $40,990 | 4.71 |
| Yeti Crab | exotic | 2200–2201 m | $9,350 | $47,370 | 5.07 |
| Stoplight Loosejaw | exotic | 1600–2900 m | $9,453 | $49,665 | 5.25 |
| Whipnose Angler | exotic | 1700–2900 m | $9,968 | $54,325 | 5.45 |
| Bobtail Snipe Eel | exotic | 1700–2900 m | $8,806 | $48,025 | 5.45 |
| Giant Sea Spider | exotic | 1700–3800 m | $11,562 | $89,045 | 7.70 |
| Dumbo Octopus | exotic | 2300–3900 m | $12,897 | $131,740 | 10.21 |
| Highfin Lizardfish | exotic | 3600–4800 m | $17,026 | $445,935 | 26.19 |
| Silvered Mirrorfish | undocumented | 700–1300 m | $1,200 | $2,195 | 1.83 |
| Glassbone Hatchetfish | undocumented | 850–1500 m | $1,000 | $2,220 | 2.22 |
| Canyon Ember-lure Angler | undocumented | 1200–1600 m | $2,400 | $6,815 | 2.84 |
| Banded Glow Eel | undocumented | 1400–2500 m | $1,960 | $8,315 | 4.24 |
| Steadylight Dragonfish | undocumented | 1500–2500 m | $2,500 | $10,980 | 4.39 |
| Crowned Hagfish | undocumented | 2200–3400 m | $2,970 | $23,795 | 8.01 |
| Falling-star Squid | undocumented | 2200–3400 m | $6,600 | $52,880 | 8.01 |
| Vent Skate | undocumented | 3000–3500 m | $5,625 | $65,020 | 11.56 |
| Brine-shore Cusk-eel | undocumented | 3300–3400 m | $5,390 | $67,735 | 12.57 |
| Nodule-armoured Crab | undocumented | 3500–4000 m | $5,525 | $97,605 | 17.67 |
| Silt-walking Tripodfish | undocumented | 4300–5000 m | $8,400 | $353,165 | 42.04 |
| Great Pale Snailfish | undocumented | 5100–5101 m | $9,600 | $662,085 | 68.97 |
| the Coelacanth | legendary | 200–290 m | $80,000 | $3,350,000 | 41.88 |
| the Oarfish | legendary | 450–950 m | $96,000 | $3,591,785 | 37.41 |
| the Barreleye | legendary | 650–800 m | $97,000 | $3,605,070 | 37.17 |
| the Vampire Squid | legendary | 750–1000 m | $104,000 | $3,684,785 | 35.43 |
| the Blobfish | legendary | 800–1200 m | $108,000 | $3,751,210 | 34.73 |
| the Dragonfish | legendary | 1000–1900 m | $121,000 | $3,990,340 | 32.98 |
| the Isopod | legendary | 950–2100 m | $124,538 | $4,030,195 | 32.36 |
| the Grenadier | legendary | 1200–2400 m | $148,350 | $4,176,330 | 28.15 |
| the Fangtooth | legendary | 1300–2900 m | $174,200 | $4,335,750 | 24.89 |
| the Viperfish | legendary | 1300–2900 m | $174,200 | $4,335,750 | 24.89 |
| the Swallower | legendary | 1500–2700 m | $174,200 | $4,335,750 | 24.89 |
| the Anglerfish | legendary | 1400–2900 m | $178,875 | $4,362,320 | 24.39 |
| the Gulper Eel | legendary | 1500–2900 m | $183,600 | $4,388,890 | 23.90 |
| the Dumbo | legendary | 2300–3900 m | $264,600 | $4,867,150 | 18.39 |
| the Tripod | legendary | 2200–4500 m | $288,750 | $5,000,000 | 17.32 |

(7.2.8 here includes its old bonus for deep catches below 1,500 m, at the middle of the usual depths; that bonus is retired.)

## Gear

Common, uncommon and rare gear: unchanged ($25–250, $300–1,000, $1,000–2,000). Exotic and legendary, each item:

| Item | Rarity | Where | 7.2.8 | Now |
|---|---|---|---|---|
| Echo+ | exotic | chest (scroll) | $12,000 | $56,000 |
| Flare+ | exotic | chest (scroll) | $12,000 | $56,000 |
| Dash+ | exotic | chest (scroll) | $12,000 | $56,000 |
| Vigor+ | exotic | chest (scroll) | $12,000 | $56,000 |
| Sprint+ | exotic | chest (scroll) | $12,000 | $56,000 |
| Trieste Descent net | exotic | chest | $10,000 | $48,000 |
| Trieste Descent catch bag | exotic | chest | $8,000 | $40,000 |
| Trieste Descent cylinder | exotic | chest | $14,500 | $66,000 |
| Trieste Descent fins | exotic | chest | $15,500 | $69,000 |
| Trieste Descent suit | exotic | chest | $21,500 | $91,000 |
| Sealab Aquanaut net | exotic | chest | $8,900 | $44,000 |
| Sealab Aquanaut catch bag | exotic | chest | $13,500 | $62,000 |
| Sealab Aquanaut cylinder | exotic | chest | $25,500 | $105,000 |
| Sealab Aquanaut fins | exotic | chest | $8,000 | $40,000 |
| Sealab Aquanaut suit | exotic | chest | $24,500 | $101,000 |
| Challenger Expedition net | exotic | chest | $30,000 | $120,000 |
| Challenger Expedition catch bag | exotic | chest | $10,000 | $48,000 |
| Challenger Expedition cylinder | exotic | chest | $8,800 | $43,000 |
| Challenger Expedition fins | exotic | chest | $15,500 | $69,000 |
| Challenger Expedition suit | exotic | chest | $22,500 | $94,000 |
| Bathysphere 1934 net | exotic | chest | $23,000 | $96,000 |
| Bathysphere 1934 catch bag | exotic | chest | $10,000 | $48,000 |
| Bathysphere 1934 cylinder | exotic | chest | $11,000 | $52,000 |
| Bathysphere 1934 fins | exotic | chest | $14,500 | $66,000 |
| Bathysphere 1934 suit | exotic | chest | $30,000 | $120,000 |
| Abyssal strobe camera, 1954 | exotic | chest | $13,500 | $62,000 |
| Galathea plate camera | exotic | chest | $17,000 | $75,000 |
| Sealab strobe rig | exotic | chest | $21,000 | $89,000 |
| Trieste porthole camera, 1960 | exotic | chest | $25,500 | $105,000 |
| Bathysphere window camera, 1934 | exotic | chest | $10,000 | $48,000 |
| Galathea expedition wetsuit | exotic | chest | $9,400 | $46,000 |
| Deep Quest pilot's suit | exotic | chest | $22,000 | $93,000 |
| Hydrolab saturation suit | exotic | chest | $21,000 | $89,000 |
| Kalymnos skafandro | exotic | chest | $28,000 | $113,000 |
| Pearl lugger's canvas suit | exotic | chest | $29,500 | $118,000 |
| Trieste crew coveralls | exotic | chest | $20,000 | $86,000 |
| Polar survey drysuit | exotic | chest | $21,000 | $89,000 |
| Shark researcher's mesh | exotic | chest | $13,500 | $62,000 |
| Clearance diver's suit | exotic | chest | $14,500 | $66,000 |
| Frogman's drysuit, 1944 | exotic | chest | $21,000 | $89,000 |
| Tektite habitat suit | exotic | chest | $11,500 | $54,000 |
| Conshelf aquanaut suit | exotic | chest | $8,000 | $40,000 |
| Sealab heated suit | exotic | chest | $19,500 | $84,000 |
| Standard diving dress | exotic | chest | $30,000 | $120,000 |
| Bathysphere observer's woollens, 1934 | exotic | chest | $20,500 | $87,000 |
| Vitiaz bottom pouch | exotic | chest | $21,000 | $89,000 |
| Hirondelle fishing creel | exotic | chest | $10,000 | $48,000 |
| Conshelf garden bag | exotic | chest | $21,000 | $89,000 |
| Meteor survey haversack | exotic | chest | $17,000 | $75,000 |
| Trieste tool roll | exotic | chest | $8,000 | $40,000 |
| Valdivia specimen crate | exotic | chest | $30,000 | $120,000 |
| Albatross core pouch | exotic | chest | $17,000 | $75,000 |
| Bathysphere sample box | exotic | chest | $30,000 | $120,000 |
| Sealab collection bag | exotic | chest | $25,500 | $105,000 |
| Siboga reef basket | exotic | chest | $25,500 | $105,000 |
| Kalymnos sponge sack | exotic | chest | $25,500 | $105,000 |
| Pearl lugger's net bag | exotic | chest | $21,000 | $89,000 |
| Dana larva pouch | exotic | chest | $13,500 | $62,000 |
| Galathea sample jar case | exotic | chest | $17,000 | $75,000 |
| Challenger specimen satchel | exotic | chest | $13,500 | $62,000 |
| Polar survey cylinders | exotic | chest | $12,000 | $56,000 |
| Salvage diver's bailout | exotic | chest | $8,000 | $40,000 |
| Lake Zurich mixed-gas rig, 1962 | exotic | chest | $27,500 | $112,000 |
| Argonaut diving bell tank | exotic | chest | $9,700 | $47,000 |
| Deep Quest gas bank | exotic | chest | $15,500 | $69,000 |
| Trieste reserve sphere | exotic | chest | $14,000 | $64,000 |
| Frogman's chest pack | exotic | chest | $10,500 | $50,000 |
| Hydrolab bottle | exotic | chest | $16,500 | $73,000 |
| Naval oxygen rebreather, 1940 | exotic | chest | $30,000 | $120,000 |
| Tektite rebreather | exotic | chest | $29,000 | $117,000 |
| Conshelf twin set | exotic | chest | $13,500 | $62,000 |
| Aqualung prototype, 1943 | exotic | chest | $8,300 | $41,000 |
| Bathysphere oxygen flask, 1934 | exotic | chest | $12,500 | $58,000 |
| Sealab II mixed-gas pack | exotic | chest | $26,500 | $108,000 |
| Navy reserve cylinder | exotic | chest | $9,400 | $46,000 |
| La Jolla survey fins | exotic | chest | $28,500 | $115,000 |
| Galathea deck fins | exotic | chest | $11,500 | $54,000 |
| Kalymnos sponge diver's blades | exotic | chest | $17,500 | $77,000 |
| Pearl lugger paddles | exotic | chest | $18,500 | $80,000 |
| Hydrolab fins | exotic | chest | $8,500 | $42,000 |
| Bikini Atoll survey fins, 1946 | exotic | chest | $19,500 | $84,000 |
| Clearance diver fins | exotic | chest | $30,000 | $120,000 |
| Trieste crew fins | exotic | chest | $10,500 | $50,000 |
| Arctic survey fins | exotic | chest | $21,000 | $89,000 |
| Spearfisher's blades, 1933 | exotic | chest | $12,500 | $58,000 |
| Tektite habitat fins | exotic | chest | $19,500 | $84,000 |
| Conshelf habitat fins | exotic | chest | $9,500 | $46,000 |
| Sealab II diver's fins | exotic | chest | $18,500 | $80,000 |
| Ligurian prototype blades, 1938 | exotic | chest | $16,500 | $73,000 |
| Frogman fins, 1944 | exotic | chest | $26,000 | $107,000 |
| Atlantis line net | exotic | chest | $8,400 | $42,000 |
| Dana eel net | exotic | chest | $8,900 | $44,000 |
| Carnegie survey net | exotic | chest | $9,300 | $45,000 |
| Hirondelle fishing net | exotic | chest | $8,400 | $42,000 |
| Vitiaz bottom net | exotic | chest | $30,000 | $120,000 |
| Siboga reef scoop | exotic | chest | $8,000 | $40,000 |
| Valdivia deep-sea net, 1898 | exotic | chest | $10,000 | $48,000 |
| Discovery ring net | exotic | chest | $23,000 | $96,000 |
| Meteor survey hoop net | exotic | chest | $9,300 | $45,000 |
| Galathea trawl purse | exotic | chest | $30,000 | $120,000 |
| Albatross plankton net | exotic | chest | $8,000 | $40,000 |
| Sealab hand seine | exotic | chest | $8,900 | $44,000 |
| Trieste collecting scoop, 1960 | exotic | chest | $10,000 | $48,000 |
| Bathysphere sampling net, 1934 | exotic | chest | $23,000 | $96,000 |
| Challenger dredge bag | exotic | chest | $30,000 | $120,000 |
| Bathythermal prototype suit | exotic | station | $23,500 | $98,000 |
| Deep lander optic, 1985 | exotic | station | $30,000 | $120,000 |
| Grand Banks trawl-wing net | exotic | dave | $30,000 | $120,000 |
| Iron Lung hardsuit | exotic | dave | $29,500 | $118,000 |
| North Sea heated suit | exotic | dave | $25,000 | $103,000 |
| Combat swimmer's drysuit | exotic | dave | $21,000 | $89,000 |
| Gulf oilfield hardsuit | exotic | dave | $30,000 | $120,000 |
| Navy prototype rebreather | exotic | dave | $24,500 | $101,000 |
| Clearance diver's rebreather suit | exotic | dave | $22,000 | $93,000 |
| Navy low-light camera, 1971 | exotic | dave | $8,000 | $40,000 |
| Tidewarden | legendary | chest (scroll) | $72,000 | $13,500,000 |
| Fathom | legendary | chest (scroll) | $72,000 | $13,500,000 |
| Lighthouse | legendary | chest (scroll) | $72,000 | $13,500,000 |
| Undertow | legendary | chest (scroll) | $72,000 | $13,500,000 |
| Apex | legendary | chest (scroll) | $72,000 | $13,500,000 |
| Riptide | legendary | chest (scroll) | $72,000 | $13,500,000 |
| Flashlight Fish Strobe | legendary | chest | $54,000 | $10,000,000 |
| Barreleye Lens | legendary | chest | $54,000 | $10,000,000 |
| Hagfish Mantle | legendary | chest | $90,000 | $17,000,000 |
| Abyssal Hide | legendary | chest | $90,000 | $17,000,000 |
| Skin of the Old One | legendary | chest | $90,000 | $17,000,000 |
| Eel-skin Purse | legendary | chest | $90,000 | $17,000,000 |
| The Stomach | legendary | chest | $90,000 | $17,000,000 |
| Brood Pouch | legendary | chest | $90,000 | $17,000,000 |
| Vent Heart | legendary | chest | $90,000 | $17,000,000 |
| Whalefall Breath | legendary | chest | $90,000 | $17,000,000 |
| The Black Lung | legendary | chest | $90,000 | $17,000,000 |
| Glasswing Fins | legendary | chest | $90,000 | $17,000,000 |
| Leviathan's Pinions | legendary | chest | $90,000 | $17,000,000 |
| Oarfish Crest | legendary | chest | $90,000 | $17,000,000 |
| The Old One's Tithe | legendary | chest | $90,000 | $17,000,000 |
| Jonah's Seine | legendary | chest | $90,000 | $17,000,000 |
| The Hagfish's Knot | legendary | chest | $90,000 | $17,000,000 |
| Lanternmesh | legendary | chest | $90,000 | $17,000,000 |
| The Drowned Choir's Veil | legendary | chest | $90,000 | $17,000,000 |
| Gulper's Throat | legendary | chest | $90,000 | $17,000,000 |

## Chests

| Chest | 7.2.8 | Now |
|---|---|---|
| Pine crate | $900 | $2,300 |
| Large pine crate | $3,100 | $7,800 |
| Tea chest | $3,800 | $13,000 |
| Station case | $1,700 | $6,300 |
| Large station case | $5,000 | $19,000 |
| Footlocker | $7,500 | $34,000 |
| Strongbox | $15,000 | $65,000 |
| Salvage trunk | $14,000 | $62,000 |
| Expedition trunk | $20,000 | $93,000 |
| Siren's casket | $27,000 | $1,250,000 |
| Leviathan's hoard | $50,000 | $1,500,000 |
| Poseidon's chest | $100,000 | $5,450,000 |

## Submersibles

| Sub | Rated | 7.2.8 | Now |
|---|---|---|---|
| Б-7 bathyscaphe | 300 m | $0.00 | $0.00 |
| Б-7М refit | 500 m | $500 | $1,400 |
| Work submersible | 900 m | $3,000 | $6,800 |
| Heavy work submersible | 1,300 m | $12,000 | $24,000 |
| Research submersible | 1,900 m | $40,000 | $58,000 |
| Deep research submersible | 2,500 m | $100,000 | $80,000 |
| Titanium research submersible | 3,300 m | $220,000 | $240,000 |
| Full-ocean-depth submersible | 4,500 m | $450,000 | $765,000 |

## Trawl nets

| Net | 7.2.8 | Now |
|---|---|---|
| Beginner trawl net (holds 6) | $50 | $50 |
| Advanced trawl net (holds 10) | $1,200 | $1,200 |
| Deep trawl net (holds 24) | new | $25,000 |

## Traps

| Trap | 7.2.8 | Now |
|---|---|---|
| Wire pot | $130 (8 max, 4–8 fish in 5 min) | $90 (5 animals in 5 min) |
| Fish trap | $1,600 | $150 (10 animals in 30 min) |
| Steel pot | $17,500 | retired: becomes the deep trap |
| Deep cage / Deep trap (Dave's) | $90,000 | $4,500 (20 animals in 4 h) |
| Fish trap holds | 9 | 15 |
| Traps set at a time | any number | 3 |

## Other amounts

| What | 7.2.8 | Now |
|---|---|---|
| Hospital bill (10 % of cash), at most | $10,000 | half an hour of his sub's income ($700 to $1,650,000) |
| The aquarium, a gallery day (10 min), at most | no limit | $1,500 |
| One photograph, at most | no limit | $50,000, and no depth curve |
| Quests by tier (deep, for example) | $240 / $900 / $3,200 / $13,000 | $350 / $2,300 / $8,900 / $26,600 |
| Radio contracts | market + premium | the same (follows the new values) |
| Supplies: lure, glow stick, advanced glow stick, backup air | $5,000, $370, $1,700, $800 | unchanged |
| Selling gear back | a third of its price | the same (of the new price) |
