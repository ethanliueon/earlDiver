# v2.0.0 handoff (branch `v2-wip`, not merged, NOT tested in the browser yet)

Standing rules: bump js/version.js + README "Version" line every change; tell the user the version;
git pull before committing; commit trailer as usual; no model ids in commits; no Earl breathing/noises;
uncluttered artistic UI; send screenshots. Final release is **v2.0.0**, merged to main only when all is tested.

## Done on this branch (uncommitted ideas are marked TODO)
- **js/specimens.js**: new `PRICE` table (real-world dollars) for almost every species; `formulaPrice` for the rest;
  `isDeep` (Deep Sea Fish or dmin >= 200) floors price at $30 (so the deep is rare or better).
  New `RARITY` tiers by price: common < $5, uncommon < $30, rare < $200, exotic < $5,000, legendary above;
  each tier has a `spawn` weight (1 / 0.4 / 0.14 / 0.05 / 0.012). `rarityPrice` = the price; `rarityOf` derives tier.
  `tagPrice` = 0.4 x price (TODO: planned 0.25). `TAG` is now only a flag for tag-only animals.
  Salmon $50, mahi $70, sardine $0.40, anchovy $0.30, mackerel $3, tunas $90-2,500.
- Legendary (real animals, no myths): humpback anglerfish, fangtooth, black dragonfish, barreleye, gulper eel,
  blobfish, coelacanth, dumbo octopus, giant/vampire/colossal/bigfin squid, yeti crab, frilled/goblin/megamouth,
  whale shark, oarfish, sperm whale, sleeper shark.
- **js/species.js**: `GIANT_FORMS` oversizes famous deep animals (anglerfish 1.8 m, gulper 2.2 m, ...); `sp.giant`.
- **js/fauna.js**: `weightOf` multiplies by `rarityOf(sp).spawn` (cached); lighter giant/shark penalties.
- **economy.js / aquarium.js / contracts.js**: fixed prices rescaled with price x R(price), where R is the
  measured new/old catch-value ratio (24x shallow -> 150x at 3,000 m). Wing upkeep scaled the same way.

## TODO, economy (task 24)
- UPGRADES `cost` are still OLD units: make `upgradeCost` scale them (x R(old cost)); for `depth` use
  cost 20, growth ~1.158 (one depth level ~ one catch at that depth, as before). Fix `replacementPrice` to sum real costs.
- `GEAR.lowlight` price 60 was missed by the script (should be ~2,400ish).
- Remove market softening entirely: `priceOf` returns base, `sell` adds no glut, drop "flooded" text in ui.js.
- Aquarium income: `drawOf` ~0.5 x value (0.8 is too rich with new prices). Check contracts/photos scale.
- No save conversion needed: profiles are not saved between visits (only best depth).
- Sanity-check pace in the browser (first upgrades ~ one shallow dive, $20-60).

## TODO, the deep (task 25)
Append ~45 real deep species to data/species_more.js (ids from 447), mostly exotic, a few rare, e.g. threadfin
dragonfish, brownsnout spookfish, giant hatchetfish, glacier lanternfish, blob sculpin, wolftrap angler,
ghostly seadevil, sea toad, pancake batfish, daggertooth, sabertooth fish, pearleye, armoured grenadier, halosaur,
cutthroat eel, bobtail snipe eel, knifenose chimaera, pocket shark, ninja lanternshark, viper dogfish, false catshark,
gulper shark, bramble shark, Dana octopus squid, piglet squid, ram's horn squid, telescope octopus,
glowing-sucker octopus, big red jelly, giant phantom jelly, giant opossum shrimp, scaly-foot snail, vent shrimp,
deep-sea mussel, dealfish, crestfish, sea lily...

## TODO, deployed sub net (task 26)
Sub add-on bought at the boat; fires from the front of the sub; once per dive; catches up to 10 animals in its cone,
including big ones (small sharks, medium fish such as salmon/sunfish, octopuses, legendaries). The haul goes to a pile
in the tank room; drag the keepers into tanks; the rest are released. Big fish keep their size in the open tank
(and take more slots: <=1 m 1, <=2 m 2, bigger 3) but are too big for the small pressure chambers.

## TODO, large pressure tank (task 27)
A second sub chamber add-on: one large pressure tank at a set pressure, holding 3 normal fish OR 1 big/legendary fish.
Drawn in the tank room (js/tankroom.js).

## NEW requests from the user (not started)
1. **No boxes/brackets around fish (or anything) when targeting** with the net or any tool. Remove target boxes everywhere.
2. **Pressure comfort zones, from the depth a fish was caught at** (js/capture.js):
   - within 50 m up or down: healthy (no harm);
   - up to 150 m either way: stressed;
   - up to 250 m either way: dying;
   - more than 350 m either way: dead.
   (250-350 m: still dying, getting worse fast.)

## More requests from the user (not started)
3. **What the deep feels like.** Deep species are mostly *rare*, and by volume the deep is dominated by
   a small core of about 3-10 rare species (lanternfish, hatchetfish, bristlemouth, firefly squid, deep red shrimp,
   and a few like them). These should make up most of what you see down there. Exotics turn up here and there;
   finding a legendary should be a big, exciting moment (consider a special toast/sound/photo card).
   Tuning: give that rare core a much higher spawn weight than other rare deep species (e.g. a `DEEP_CORE`
   set with x5-10 weight in fauna.js `weightOf`), keep exotic ~0.05 and legendary ~0.012 or lower.
4. **Aquarium revamp: replace the current wings/visitors aquarium (js/aquarium.js, aquarium_draw.js, ui.js
   aquarium tab).** It's too complicated and doesn't add much. New design:
   - An **aquarium gallery aboard the ship, the Margaret**, built like the sub's tank room (drag and drop, same
     look and feel as js/tankroom.js).
   - It still draws visitors, but the **main payout is idle income from the fish on display**.
   - Fish keep their condition in the gallery:
     - **healthy**: full idle income;
     - **stressed**: earns less until it recovers (it recovers over time);
     - **dying**: earns a little for a while, then dies;
     - **dead**: earns nothing; dead fish can be taken out and sold (at the dead price, half).
   - Fish must be put in alive. Dying and stressed fish can be added; dead ones can't.
   - **Dead fish are drawn with X eyes** (everywhere dead fish appear: gallery, tanks, bag, haul pile).
