# Plan 6: the audit of 5.9.7, and what comes next

A full pass over the game on a phone (844 x 390 and 667 x 375): every screen, panel, chest, gain card, item, coin,
scroll and a sample of species, every zone and landmark, night, the sub, the thing, drowning, implosion and death.
Judged against CLAUDE.md's philosophy. Skill and balance-by-feel (how hard fish are, how fast air goes) are left out.

## Verdict

The surface game is close to the bar: the boat, the cabin, the sunset, the night sea, the thing itself, the journal
and the HUD now look deliberate. The game falls short in three places:

1. **Pictures that look coded.** Item art, chests, shop pages, several coin icons, the aquarium and tank water, and the
   seafloor are flat vector shapes on gradients.
2. **Panels made for a laptop and shrunk to a phone.** Text is 6 to 9 pt; targets are small.
3. **The deep is empty.** Below about 600 m the screen is black: the sub, its lights and every landmark disappear.
   The deep is what the game promises.

There are also real bugs: one makes escaping the thing impossible by touch.

## A. Bugs and broken edge cases (fix first)

| # | What happens | Fix |
|---|---|---|
| A1 | **The flash escape is impossible on a phone.** In the kill window (0.7 s) the escape is a lamp flash or a lure. All touch controls hide while it runs, so the lamp cannot be pressed. Only the lure (if carried) is offered | During the kill keep one large lamp button (and the lure) on screen, lit and pulsing in the window |
| A2 | **Dave's shop cannot be closed by the game.** Closing Dave does nothing once his computer is up, and "close everything" (used on death) never closes a shop. It stayed open through night, the hunt and death | Close the shop panels in closeAll and in toggleDave(false) |
| A3 | **The sea runs under the shops and the bag** (the cabin air ran out while shopping at Dave's). This is wanted: the time pressure is part of the fear | Keep the clock running in every in-world panel (shops, bag, tank room, journal). Only Settings and Pause stop time. Make sure the danger reaches you through any panel: the air bar and depth stay visible, the alarms and red edges show over panels, warnings are never hidden behind them, and the thing's arrival closes the panel |
| A4 | **Keyboard words reach the phone.** "Press null to put it on" after buying. Also "Press 5, then Space", "Press 2 for the camera", "Hold R at a hole", "Press C to take the helm", "Space reaches for an animal", about 15 in all | Sweep every hint and toast; on touch name the button by its picture, never a key |
| A5 | The journal's coin (a page element) stays on screen when the HUD hides (the hunt, cinematics) | Hide it with the HUD |
| A6 | Settings opened from the title appear under the "Welcome to the tutorial" box | Order the layers; the welcome waits |
| A7 | A gain card can sit in the middle of an open panel (the Margaret) | Cards wait for panels to close, or go to the corner by the bag |
| A8 | The sale receipt (ledger) never showed on the phone | Check it on touch; it is the reward moment of selling |
| A9 | A new diver's journal shows a blank right page titled "Notes" | An empty state: "Nothing met yet. Observe an animal and it is drawn here" |
| A10 | Implosion: the screen fills flat light grey, then black, then the loading dial. It reads as a rendering bug | A real moment (see D3) |
| A11 | Death: one toast line and you are back on deck. What was lost is not shown | A death card (see D3) |
| A12 | "Near her 300 m" floats mid-right beside the buttons; "Tank 0/3 Chambers 0/1" is tiny at the bottom centre | Put sub warnings in the instrument column under the radar; sub tank counts on the bag row style |
| A13 | The Margaret panel changes size on every tab (Sell small, Sub full screen, Supplies medium) | One size for the panel; tabs change only the contents |
| A14 | Below ~600 m the sub cannot be seen with its lights on; brine lake, vents, whale fall, trench, pit and cave are black screens | See D1 |

## B. Art: things that look coded (philosophy 1 and 2)

| # | Now | Becomes |
|---|---|---|
| B1 | **Item pictures**: flat vector shapes on a pale blue-grey gradient. 411 items are drawn from about 8 templates; every bag, tank and suit is the same drawing in a new colour. Legendaries have their own shapes but are flat (the Brood Pouch is a pink blob, the Vent Heart a black slab, the legendary suits a recoloured stick figure) | Painted still lifes: each item family drawn once, properly, on a dark oilcloth or in a worn field-photo frame; versions differ by material and wear (scuffed rubber, verdigris brass, patched neoprene), not hue. Rarity shows in the frame and the detail. Legendaries each drawn by hand, as the scrolls were |
| B2 | **Chests**: rectangles with stripes. The Reliquary ("a box of black bone") is a black box with white straps; its lid floats off when it opens; the reveal card covers the chest | Each chest painted (pine crate, aluminium case, tea chest, riveted strongbox, footlocker, expedition trunk, net-bound offering, bone reliquary). Opening: it settles with weight, silt or dust, the lid lifts on its hinge, light from inside in the rarity's colour (stronger with rarity), the item rises out of it, then its card |
| B3 | **The shop computer** is a modern web store: navy header, blue underlined links, "Buy now", "Add to cart". Dave's Haul puts its name in a script font | A period mail-order catalogue on the cabin desk (paper pages, printed photographs, an order slip), or a green telex terminal. The game font only |
| B4 | **Water in panels**: the aquarium, the tank room and the catch tab are flat cyan gradients; the pressure chamber is a saturated blue-purple cylinder | Painted water in the game's deep greens and blues, glass with grime, brass fittings |
| B5 | **Coins off the palette**: sprint is a cyan lightning bolt, observe a cyan eye, the tank room a cyan aquarium, dive blue water, the lure a teal bulb, the glow stick neon green, the camera bright yellow; swap is a stock refresh-arrows sign | Every glyph redrawn in bone and bronze, hand-drawn: a kicking fin for sprint, a diver's-eye porthole for observe, a ladder and water line for dive, a coiled line for swap |
| B6 | **Settings** use iPhone-style green toggle switches | Brass toggle levers or knife switches on the olive plate |
| B7 | **The seafloor** is a smooth pale-mint plane | Sediment with texture, stones, strata where it is cut, ripples, colour going down from sand to grey silt to black ooze with depth |
| B8 | **Dave's Haul** is a bright cartoon-yellow capsule | Weathered: faded yellow, rust weeping from its rivets, growth on its underside |
| B9 | **Legendary sparks** in item cards are large blurry orbs over the text | Small sharp motes, sized to the card |
| B10 | **Gain cards**: a plain dark box with the item tiny inside, held mid-screen | The item shown large for a moment, then it flies into the bag's coin, which bounces and gets its red "!" |
| B11 | **The title**: "EARL THE DIVER" in plain type; its settings button is a flat icon | Painted lettering (weathered stencil, as on the hull); the settings coin as in the game |
| B13 | **Legendaries share their bodies with common animals.** "The Anglerfish" is drawn from the same template as 7 ordinary anglers (the Hairy Angler even has its exact lure colour); the Coelacanth uses the generic fish body shared with 156 species; the Dragonfish, Grenadier, Dumbo, Isopod, Viperfish, Blobfish, Oarfish, Swallower, Vampire Squid and Tripod each share theirs with 1 to 7 common ones. Only the Fangtooth, Barreleye and Gulper Eel are unique | Sizes stay as they are: legendaries stay oversized and dramatic, small animals stay scaled up to be seen. Every legendary gets its own hand-drawn body, more detailed than anything common (the philosophy's "detail is a reward"), and never a recolour. The common relatives get the features their descriptions promise (the Hairy Angler's whisker rays, the Whipnose's whip, the Footballfish's warts and branching lure) and colours that do not echo a legend |
| B12 | Species art is good. A few are low effort: the oyster is a grey zigzag strip, the cone shell a flat triangle, the brain coral a plain dome | Redraw the weakest dozen |

## C. Mobile: panels made for a laptop (philosophy 4 and 7)

- The inventory, the Margaret, the shop, item cards, chest reveals, supplies and settings are laptop layouts scaled
  to fit: labels are 6 to 9 pt, buttons small, slot names unreadable. Rebuild them for the phone: body text at least
  13 pt, buttons at least 44 pt, one frame family, one panel size.
- The inventory: show fewer, larger locker tiles (pages or a scroll); the slot names under the slots, readable.
- Walls of text (the aquarium tab, item descriptions, supplies' spec rows) become a short line and a few marks.
- The Margaret's tabs and the shop become one place aboard (see E5).

## D. The deep (the game's promise)

1. **Light down there.** The sub's floodlights as visible cones in the silt, its hull lit by them, Earl's lamp the
   same; marine snow in every beam; a faint glow of animal light. Landmarks lit when the lights reach them, and seen
   as dim shapes at the edge of the beams: the vents' shimmer and glow, the whale fall's ribs, the brine lake's
   mirror surface, the trench walls, the cave mouth.
2. **Zones you can tell apart**: sunlight, twilight, midnight, abyss and trench each with their own colour, snow,
   life and sound; a quiet title when you first enter one, and the chart marking them.
3. **Death and implosion as moments.** Drowning ends in black, then a card in the game's style: how he died, the
   depth, what was lost (catch, gear taken), the hospital bill, and "Back to the Margaret". Implosion: the hull's
   groan, the windows starring, a flash of water, silence, then the same card. No flat grey.
4. **The thing**: it reads well (huge, dark, red light). Keep it. Fix A1.

## E. Progression and economy

1. **Too many items, named by formula.** 411 items: 149 rare and 111 exotic, mostly colour swaps of a few drawings,
   named "Brand + line + kind" ("Northwake Basic rebreather suit"). Each find means little. Cut to about 60 to 80
   items, each with its own picture, name and reason to want it; keep the rare and up as found things with stories.
2. **Rarity ranges overlap.** Rare runs $1,080 to $42,000; exotic $9,000 to $88,000; a rare can be worth more than an
   exotic. Tighten them so the colour means the value.
3. **The cheapest crate feels bad.** The Surplus crate costs $900; common items cost $25 to $900 and it gives a
   common 60% of the time. Make it worth opening (several things, or better odds), and show the odds on every chest.
4. **The quest board is generic** ("Catch any jellyfish", "Sell $300 of catch"). Tie quests to people and places
   (Dave asks for something from the vents; the station wants a census of the twilight) and to the journal
   (find 3 animals of the midnight zone), with the board's pay rising with depth.
5. **What is next should always be clear.** A depth ladder: what your suit and sub can reach, the next zone and what
   it takes to get there, shown on the chart and in the Margaret's panel.
6. **The journal as the long goal.** 517 species: milestones (each 25 met, each zone completed) that pay in money,
   coins or a scroll, so filling the book is the spine of the game.
7. **Abilities**: Tidewarden sells for $21,600 from a $90,000 Reliquary at 15% legendary; fine as a gamble once the
   odds are shown. Keep scrolls out of the Bayside crate.

## Order of work

| Phase | Contents | Size |
|---|---|---|
| 1. Fixes | A1 to A13 | One version |
| 2. Coins and small art | B5, B6, B9, B10, B11 | One version |
| 3. Phone panels | C: inventory, item cards, the Margaret, settings, chest reveal | Two versions |
| 4. Chests | B2 | One version |
| 5. The deep | D1, D2, D3, A14, B7, B8 | Two to three versions |
| 6. Items | E1, E2, B1 (needs a decision: how far to cut) | Large |
| 7. The shop | B3 (needs a decision: catalogue or terminal) | One to two versions |
| 8. Progression | E3 to E7, B12 | Two versions |

## Decisions (owner, 2026-11-21)

- **Fish pass first.** Real body families and each species' own features; sizes stay (legendaries oversized and
  dramatic, small animals scaled up to be seen); every legendary its own body. Reviewed family by family.
- **Items keep their variety** (all 411 stay); their pictures are redrawn alongside the fish: each brand or model line
  its own shape, rarity in the detail and finish, drawn on a real surface instead of the pale gradient.
- **The shop stays a website**, made period-true and worn: photographed gear, a dated marine supplier's layout, the
  game font only (Dave's script font goes).
- **Time keeps running** in every in-world panel; only Settings and Pause stop it (see A3).
- **Death keeps its cost**; it gets a proper card showing what was lost.
- **No escape by the lamp.** In the jaws only a lure or the Tidewarden gets him out (5.10.8).
- **The tools are the net and the camera** (with traps from the bag and the sub's claw). No tag gun, no collecting kit.
  The net takes bottom animals more kindly (it only has to touch an octopus or a crab), and breaks a piece off a coral,
  sponge or anemone, leaving the colony (5.10.8). Traps take bottom animals only when they rest on the bottom.
- **Bottom animals rest and walk on the sand** in the open tank and the aquarium; only a pressure chamber holds an
  animal suspended (5.10.8).
- **Glows are quiet**: lit coins a soft rim, rarity rims muted, presses a soft ripple, the controls dimming in the
  dark (5.10.8).

## Order of work (revised)

1. Fish pass (batches by family), with the legendaries' own bodies
2. Phase-1 fixes (A1 to A14)
3. Coins and small art (B5, B6, B9, B10, B11)
4. Item pictures (B1), shop look (B3)
5. Phone panels (C)
6. Chests (B2)
7. The deep (D, A14, B7, B8)
8. Progression and economy (E2 to E7)
