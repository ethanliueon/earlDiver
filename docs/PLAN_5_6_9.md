# Plan for 5.6.9: HUD layout, the belt, rarity colours, tutorial clarity

From the 5.6.8 phone playthrough (deck to shop, by touch, 844 x 390) and the notes on it.

## 1. The HUD on a phone

| # | Now | Becomes |
|---|-----|---------|
| 1 | Journal coin beside the money, top left | Journal coin under the radar, on top of the bag: the right-hand column holds his things (journal, bag). The top left is the money alone, the goal's line under it |
| 2 | Arc coins r = 21, big button R = 36 (finger units), empty water up the right edge | Arc coins about 20% larger (r = 25), big button about 15% larger (R = 41), column coins 15 to 19. Checked on the smallest landscape phone (667 x 375) before it ships |
| 3 | The swap chip is a small 14-unit coin on the big button's rim, hidden when there is nothing to swap to | About an arc coin's size (r = 20), showing the tool it swaps to. With nothing to swap to it stays, showing a camera behind a padlock; a tap says where cameras are sold |
| 4 | Every net coin has the same green face | The face behind the net is tinted by the net's rarity (Common grey-green, Uncommon green, Rare blue, Exotic violet, Legendary dark amber), kept dark and muddy so it sits in the olive-and-bronze palette; the rim's thin lip in the rarity's own colour. The camera coin the same, by the camera's rarity |
| 5 | Glow stick coin dimmed when he has none | A padlock over it when none are on his belt; the number on the belt as a small figure on its rim (up to 5) |
| 6 | A long press on a diver on the title makes all of them wobble (the held one looks still under the finger) | Only the diver held wobbles and shows its delete mark; a tap anywhere else stops it |
| 7 | Version number tiny in the bottom-right corner of the title (lost under a phone's rounded corner) | Bottom left, inside the safe area, larger (15 px) and brighter; also in the pause menu, as now |

## 2. The belt (glow sticks and the lure)

Today glow sticks and lures are only counts: they show nowhere in the inventory.

- Two new slots on Earl in the inventory, under Net and Camera: **3 Glow sticks** (a stack, up to 5) and **4 Lure** (one).
- Glow sticks: up to **5** can be owned and carried (was 1). Sticks not on the belt sit in the locker as one tile with their number.
- What is on the belt is what he takes into the water: the glow stick button uses the belt's sticks; the lure's red Yes/No only appears with a lure on the belt.
- Anything bought goes straight onto the belt if there is room, so forgetting to equip is rare; taking one off leaves it aboard.
- Changing the belt follows the same rule as other gear: on deck, in the cabin or in the sub; in the water the slots show but do not change.
- Saves: a diver who already owns a glow stick or lure finds it on the belt.
- Taken by the thing: what was on the belt is lost (as now); what was left in the locker is kept.
- Desktop: the E key and the Q lure follow the same belt.

## 3. The tutorial on a phone

| # | Seen in the playthrough | Fix |
|---|-------------------------|-----|
| 1 | On "Walk off the end of the deck", the cabin door is bracketed and the hand button lit; swimming down, the sub's hatch is bracketed; at "claim your quest", the ladder and winch both are | During the tutorial only the step's own thing is bracketed or lit |
| 2 | The scripted first miss sends the fish about 17 m off: a long chase, "7 s of air" in red | After the miss the fish darts 2 to 3 m and stays near; no red air figures in the first dive (the air cannot run out there) |
| 3 | The sprint button is ringed through every swim step, and pressing it says the air goes faster | Sprint is taught once, on the way back up |
| 4 | The goal line is about 11 pt | About 15 pt, the one thing to read |
| 5 | "Open your quests and claim it" while the button is a book | "Open your journal and claim it" |
| 6 | The "NEW Flick net" card slides in at the right edge, cut off, over the radar column | It comes in at the top centre, under the messages, whole |
| 7 | An observed fish's name can land on the stick | Names keep out of the stick's corner |
| 8 | The shop step lights the Clip pouch with no words | A line: "Buy the clip pouch: it carries 3 animals" |

## 4. Order and checks

1. Belt data and inventory slots (the riskiest: saves and the shop)
2. HUD: layout, sizes, swap chip, padlocks, rarity faces
3. Tutorial fixes
4. Version on the title
5. Checks: the full tutorial by touch with screenshots, nothing over any button (also at 667 x 375), desktop new game, the opening catch by finger, an old save loading with a glow stick and a lure, buying 5 sticks, being taken with sticks on the belt and in the locker

## Concerns

- Bigger buttons on a small phone: the arc may reach the radar column; sizes will scale down if it does
- Rarity colours on the face risk the bright, app-like look the HUD moved away from; they stay dark tints
- Legendary is gold, and gold was taken out of the buttons; it becomes a dark amber
- Five glow sticks make the deep much easier to light; each is still used up in 90 s and is seen by the thing
- One more step for new players (the belt); buying straight onto it is meant to cover that
