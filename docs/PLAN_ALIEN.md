# The alien world (owner, after 7.9.8): plan, agreed in principle, not built

This branch (`claude/alien-world`) keeps the second sea as built up to 7.9.8 (the drop, the plain, the ice V floor, the
mush and its slabs, the keeper) for the alien update. The main line (`claude/fish-mobile`) will end the coconut island
with a radio and "Area available in a future update".

Written so the next session can pick it up. Read CLAUDE.md first; its rules apply. Nothing here is built unless marked.

## The idea
The second sea stops being a hole beside the coconut island and becomes **another world**, reached by travelling. It is
cold, dimmer and reddish under **two small suns**; it is where the thing in the deep comes from (why the thing is red and
vast). Completely alien animals (the owner designs them), its own gear, its own leaderboard depths.

## Earth side
- The coconut island no longer has water past it: the island runs on into land beyond the screen's edge (it never goes
  down), and a sign says you cannot go any further. It stops everyone, whatever they have done. The 20 m pool, the
  keeper diver and the wall gate are removed from the Earth side.
- Travel: a **radio box** (in the world, used with the interact button, no new screen button) offers the crossing.
  The price is **money** (owner: about $5-10 million; set it by the CLAUDE.md rule, hours of income at the deepest sub,
  measured with tools/econ/measure.cjs), not the main quest, so a rich player can go without the story. Paid once;
  after that travel both ways is free. A loading screen with a small painted crossing icon (no rocket launch).

## Alien side
- Arrival: a **smaller island with alien plants** and its own radio box to go back. No other human.
- The sea: the current second sea's shape (the drop, the plain, the ice V floor at 44 km), **stretched to about 2,000 m
  across** from about 50 m past its beach (now about 1,000 m). An island overhang at its start.
- **Sky:** a constant dim, reddish day; two suns, both smaller than Earth's (one larger, dim and red; one small, paler and
  harder), each on its own path, with its own day-night cycle (not Earth's clock). Night: far more stars, strange
  constellations, a faint arcane band across the sky. The focus of the first pass: realistic suns, stars and night.
- **Water, made to follow the sky:** about 30 % dimmer than Earth's and fading out earlier, because reddish light is
  the colour water swallows first (little blue light reaches down, so the deep comes sooner and darker); the surface
  reflects the reddish sky; two sets of light shafts at the two suns' angles; colder, darker colour (no cyan, no neon).
- **Ground:** a cold world: frost on the ground, rust-red sand and rock with frost in it, baked into new textures (like
  tools/seabed_tex.py), never rectangles or drawn lines.
- **Gravity 0.65 of Earth's.** Pressure grows with gravity times depth, so a rating there goes 1/0.65 = about 1.54 times
  as deep for the same strength. Also slower-rising bubbles, higher hops on land, a bag that weighs less (ask first).

## Gear: a second start
- Earth gear does not work there: worn Earth gear is **locked** on the alien side (the bag and locker keep it). Skills
  (scrolls) carry over and work.
- An **alien trader** (a diver of that world) buys Earth gear for **alien currency**, and there is a crafting area. New
  alien gear of every rarity, rated deeper, working only in the alien world; items made for it carry a small painted
  ringed-planet mark (a symbol that means "alien world") on their cards and figures.
- A new diver there needs something to dive in: a basic alien loaner suit on arrival (to decide).

## Still to do, in order
1. **Structure pass** (the next real change): the Earth island ending and its sign; the alien sea moved to its own place
   and stretched to 2,000 m; the alien sky (two suns, own clock, the night sky), the alien water, frost-and-rust
   textures; gravity 0.65 in the code; for now a Test-tab button to travel (the radio box and the price later).
2. **Ice V redo** (owner: "80 % of the problem"): back to the whiter, obvious ice of 7.9.6 and earlier, a better build-up
   with depth; keep the mush's feel (lurches, caught limbs, cracks, bubbles); the drawn slabs read as rectangles: remove
   them or repaint them as real ice pieces.
3. **Real breathing and pressure sounds:** a regulator breath and a suit / hull pressure creak (Freesound candidates
   for the owner to pick by ear; the key is an environment secret, never committed). Breathing stays capped at 1.8x.
   This overrides CLAUDE.md's old "never add breathing".
4. The radio box, the price, the arrival island and its plants, the trader, alien currency and crafting, alien gear.
5. Alien animals to the owner's designs.

## Open questions
- The exact price of the crossing; the alien currency's name.
- Does the thing hunt on the alien side (its home), and how?
- The pressure curve after x10 for Earth (proposed softer: +x10 per extra 1,000 m) is still undecided.
- Does the deep sub (the owner's Deepsea Challenger / Triton references) belong to the alien world?

## Later decisions (owner)
- Saved for its own update. Until then the coconut island is capped halfway by a radio box: "Area available in a future
  update". The crossing's price (about $5 million) is set when the update is built.
- Alien gear starts at **rare** and goes up to **mythical**: whoever paid to get there has outgrown commons.
- The alien world brings **new skills** (new families), found there and usable back on Earth. **No existing skill moves
  there**: Dauntless, Temper, Breath and the rest stay where they are.
- With no suit on, a diver is rated as the starter wetsuit (15 m, air x1.05): already so (economy.js suitOf).
- Gravity 0.65 of Earth's.
