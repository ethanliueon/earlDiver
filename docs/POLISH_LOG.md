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
