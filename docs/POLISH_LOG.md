# Polish branch work log (claude/polish-opus)

What was changed on this branch and why, with the measurements behind it. Newest last.

## How it was tested

A play-test harness (Playwright, headless Chromium) drives the real game: it opens a save, skips or plays the
tutorial, moves Earl, opens every panel, and takes screenshots. A diver bot plays through the real controls
(movement keys, Space for the net, surfacing for air, selling at the boat, buying the next useful gear, claiming
quests) and runs the game's own update loop faster than real time, so an hour of play takes a few minutes. Trawl,
census and price scripts measure what the sea yields at each depth.

## 4.18.0 · the deep pays

Measured before the change:

| Depth | Expected value of one animal met (spawn-weighted) |
| --- | --- |
| 0-50 m | $63 |
| 200-500 m | $404 |
| 500-1,000 m | $926 |
| 1,000-2,000 m | $1,107 |
| 2,000-3,000 m | $1,630 |
| 3,000-4,000 m | $1,710 |
| 4,000-5,100 m | $1,339 |

Rares stopped rising at about $300-400 below 1,000 m and exotics at about $7,000 below 500 m, so the deep paid
little more than the twilight while the subs that reach it cost $100,000-450,000 and the water there is far more
dangerous. Trawl hauls were measured too: one minute of towing brought up 0-4 animals, and nothing at all at
3,000-4,700 m in most hauls (the deep held only 3-4 small groups of animals).

Changes:

- A depth premium on every animal's price (not legends, which already have their own depth-based prices), by
  the middle of the band it lives in: x1 to 500 m, x1.9 at 1,000 m, x3.4 at 2,000 m, x4.8 at 3,000 m, x6 at
  4,000 m, x7 at 5,000 m. Rarity tiers do not move (they come from the base price).
- Six groups of animals below 1,200 m (were 4, and 3 below 2,500 m).

After: one animal met is worth $1,590 at 500-1,000 m, $2,330 at 1,000-2,000 m, $4,170 at 2,000-3,000 m, $4,850
at 3,000-4,000 m and $4,540 in the trench; trawls at 2,000-3,000 m bring up $2,000-14,000.

## 4.18.1 · UI fixes

- The catalog's home page: a second row, "A step up from what you have on": for each thing he wears, the
  cheapest better one the shop sells (net by fish size, tank by air, bag by room, fins by speed, suit by depth).
  The page was mostly empty below "New in".
- The yard's refit cards: the picture, then the name and the whole description, the price under them (the
  price tag was a third column that squeezed the description into a narrow strip).
- The aquarium: "The tank is empty..." sits above the tanks; it was centred across the seam between the two.

## Performance (measured, nothing changed)

Profiling in headless Chromium: the game's own JavaScript takes about 10-20 ms a frame and is spread thin
(no hot spot over 1 %); about 90 % of the frame is the browser painting (software rendering in the test
browser). Long frames are rare and short. A/B of the lightmap's smoothing quality made no difference. Real
GPUs paint far faster, so there was nothing worth changing on this evidence.

## 4.18.2 · the trawl net

Traced tow by tow: the net closed by itself after 8 s, its mouth 1.6 m wide and trailing 13 m behind and 4 m under
the sub. Lone animals flee anything within 10 m of the sub, so the net only meets schools, and only when steered
through one. Measured, 5 hauls a depth: driven straight, 0-1 animals at 120-600 m; steered at the nearest school,
$0-14 at 120-200 m, $0-142 at 280 m, $214-773 at 600 m. A beginner net cost $120 and is used up in one haul,
so in the first sub's water (to 300 m) it lost money every time.

- The tow lasts 20 s before the net closes by itself (N still closes it sooner): time to reach a school.
- The beginner net costs $60 (was $120) and its mouth is 2.0 m (was 1.6; the advanced net stays 2.6).

## 4.18.3 · air in the sub, and out of the hatch

Measured straight dives from the surface, a full cabin each (time to depth, cabin air left):

| Sub | Cabin | 150 m | 90 % of her rating |
| --- | --- | --- | --- |
| Б-7 (300 m) | 120 s | 45 s, 75 left | 270 m at 81 s, 39 left |
| Work (900 m) | 145 s | 26 s, 95 left | 810 m at 134 s, none left |
| Research (1,900 m) | 180 s | 16 s, 104 left | 1,710 m at 175 s, none left |
| Full-ocean (4,500 m) | 260 s | 9 s, 111 left | 4,050 m at 207 s, none left |

Earl's own tank refills from the cabin, so the cabin is all the air a dive has. No sub can go near her rating and
come back without backup tanks (R refills the cabin; two carried), and at $800 each they were out of reach for
most of the game: the first sub had about 30 s of work at 150 m.

- The backup air tank costs $240 (was $800): two of them triple a dive's air, and a dive to 200-300 m now pays for them.
- Leaving the sub: Earl comes out into open water, trying each side of the hull; before, if the point behind her was
  inside the seabed (a sub hugging a cliff) the collision pushed him onto the floor above, as much as 150 m up in one frame.

## 4.18.4 · the claw, and the premium softened at the top

Measured the claw: a sub rated for the depth, three minutes hunting with the grip timed in the green (air topped
up, a full bag emptied into the tank): 9 animals and $69 at 250 m (mostly krill, worth nothing), $7,500 at 800 m,
$76,000 at 1,500 m and $194,000 at 2,400 m. A real dive is limited by its air and its chambers (deep animals in the
open tank die of pressure on the way up and fetch half), so perhaps a third to a half of that: about two or three
dives for each of the last subs, which is quicker than the danger down there deserves.

- The depth premium is softened at the top: x1.8 at 1,000 m, x3.1 at 2,000 m, x4.2 at 3,000 m, x5 at 4,000 m, x5.6
  at 5,000 m. One animal met: $1,510 at 500-1,000 m, $2,170 at 1,000-2,000 m, $3,820 at 2,000-3,000 m, $4,370 at
  3,000-4,000 m, $4,000 in the trench (before this branch: $926, $1,107, $1,630, $1,710, $1,339).

Also run: 1,100 rounds of a chaos play-test (random keys, panels, button clicks, teleports between every region, the
sub, the mouse) over three seeds: no page errors at all.

## 4.18.5 · the claw reaches for what is worth it

The claw took the nearest animal in reach, so in a krill swarm (worth $0.10 each) it could not get at anything else.
It now takes the one most worth the reach (its worth over how far the claw must go). Measured, 3 minutes at 250 m:
$69 before (mostly krill), $747 after (firefly squid, hatchetfish).

## 4.18.6 · wording

- Messages in the house style (a colon, as most already were) instead of dashes: "Out of air: surface!" was written
  both ways; "Bag full: get to the sub or the boat"; "Something hit the hull: autopilot off"; the claw's "Close the
  claw in the green"; a species observed reads "Garibaldi · Hypsypops rubicundus". (Dashes left where they belong: an
  empty table cell, Dave signing his page.)
- The first step of the Log, for a diver who skipped the tutorial, reads in plain words ("swim down", "observe a fish
  (F)", "catch a fish", "back up to the surface") instead of pointing at an orange fish that is not there.

## 4.18.7 · two display bugs

- The diver's pressure readout printed the raw air-drain multiplier, which grows exponentially: "pressure ×367427196.6"
  at 3,250 m and "×7475884414230.2" in the trench. It now reads ×1.1 to ×9.9, ×10 to ×99, then "×100+".
- The Log's first step lowercased its key: "observe a fish (f)". Only the first letter is lowered now.

Also run: a 40-minute soak (the bot playing while memory and the game's lists were sampled): the heap held at about
15 MB, the page's element count did not grow, and the caches levelled off. No leaks.

## 4.19.0 · every sub's cabin air, and the spare air bank

- A bug since 4.16.8: removing the pressure relics left `sub.o2V = SUB_AIR[...]` inside a comment on the line above,
  so every sub had the default 120 s of cabin air instead of her own (up to 260 s for the last). Measured before and
  after: the research sub (180 s) had 109 s left at 100 m; now 169 s. Each sub now has its intended air.
- New refit in the yard: the spare air bank, $8,000, half as much cabin air again on every sub (the Б-7 120 s to 180 s,
  the last sub 260 s to 390 s). With her own air restored the deepest sub still reaches 4,050 m with only 53 s left,
  so time at depth is what a mid-game player most wants more of. It has its own picture (four bottles in brass straps
  on a manifold), shows on the spec sheet, and the new bottles come full.

## 4.19.1 · the radio's jobs worth taking (no effect in play: see the note)

Note, found after: nothing generates contracts any more (the radio became decoration in 3.0.0, when the quest board
replaced it; `js/contracts.js` is only imported for two helpers). The floor below is kept as a fix to the module, but
it changes nothing a player sees. The README's three mentions of radio contracts are removed.

Sampled the board and the radio at four stages of a game. Mid-game (a 1,900 m sub) the radio offered "a by-the-wind
sailor for the collection, alive or dead: $1", a velvet swimming crab for $4 and five clams for $24, taking slots
from real work. A job now pays at least a fiftieth of his next submersible (never under $15): $10-60 early, about
$2,000 mid-game. After: mid-game jobs $2,000-10,000, late $2,400-36,000; a new diver still gets small salvage jobs.

Also: a scan of the code for statements left behind a `//` (the shape of the cabin-air bug): one more, a
`ctx.shadowBlur = 0` in a HUD loop that no longer runs; put back in front of its comment.

## 4.19.2 · a safe harbour, and a whole sub career played

A campaign bot played a sub career dive by dive through the game's own controls and update loop: drive out on the
surface to water of the right depth, dive, hunt with the claw (grip timed in the green; the bag into the chambers
first, then the open tank), connect backup tanks when the cabin runs low, come up while there is air to, drive
home, sell; between dives buy tanks, chambers, the spare air bank and the next sub. The thing in the deep was kept
away and hull damage was counted then mended (a player dodges or patches), so this measures the economy.

From the first sub with the claw to the full-ocean-depth sub: 24 dives, about 3.4 hours of game time (six of them
ended by the bot getting its descent stuck on terrain). The Б-7 earns about $500 a 6.5-minute dive; the work sub
comes at about 50 minutes; from the heavy work sub on, dives earn $50,000-210,000 and most deep animals in the open
tank die on the way up (5-6 of 25 alive), which is what the chambers are for. A person, who misses grips and meets
the thing in the deep, will take a good deal longer: perhaps 6-10 hours for the whole game.

It counted hull hits too: 26 in an hour, nearly all from orca pods while the sub was on the surface between the
boat and the dive site (a pod about every two and a half minutes above 150 m, each orca ramming for 20 % of the hull).

- No orca pods while the sub is on the surface within 120 m of the Margaret: a safe harbour. Rams in the same hour of
  play: 26 before, 8 after. Out at sea and under the surface they come as before.
