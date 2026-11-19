# Plan 5.3: a real game, not a generated one

What the owner has asked for, in their own words, gathered from the last rounds:

- "Stop making it look like a website. This is a game." Mobile and web; touch comes later, but nothing may stand in
  its way. Desktop keeps the centred F prompt and the hotbar; touch gets a fixed arc of actions, greyed not moved,
  no key letters.
- "It still looks AI generated." The format of the new title is right; its look is not.
- One sturdy game font, no italics, no yellow or gold, readable, nothing overlapping. Short messages; details only
  on tap.
- A horror game: the deep stays dark, but not empty.
- Kept as they are: the shops (websites on purpose), the aquarium.
- Agreed from the review: a closer camera in the shallows, one message at a time (done), the sub's own hotbar, one
  sell list (done), the quest board and the radio merged, simpler animal storage, seabed texture, something to see in
  the deep, painted item art, the monster's teeth, a death moment.

## Why things look generated

The same few moves everywhere: flat rounded rectangles in a tinted gradient, letter-spaced capitals for every label,
everything centred and evenly spaced, translucent dark overlays, big plain numerals, a thin outline as the only
decoration. No material, no wear, no light, nothing that could only belong to this game. The parts that do not look
generated are the ones made as things: the locker door, the boat, the sub, the receipt, the journal's paper.

The rule from here: every screen is built from things in Earl's world, painted as images (tools/*.py), lit and worn;
CSS only places them. No CSS-gradient "cards". Labels in normal case where a person would write them; capitals only
where something is stencilled or stamped. Uneven, specific, handled.

## Phase A: the look (the root cause)

1. A painted kit (tools/front_kit.py): the title's diver tags as real stamped aluminium dog tags on a ball chain, hung
   from hooks on the Margaret's wheelhouse wall (a painted board, not a dark overlay); a hand-lettered chalk line for
   "Choose a diver"; the Dive tag ringed by a hanging work light, not a glow.
2. Title: the attract screen as it is (liked), the select screen redone from the kit. The tags swing in when it opens.
3. The same treatment, one at a time: the touch arc's buttons (painted brass-and-rubber buttons, not flat discs),
   the sell tiles (fish on the deck's wet planks, a chalked price), the quest cards (paper slips pinned to the
   clipboard board, a pencil tick), the settings (toggle switches on a steel panel), the journal grid (sketches on
   the page itself, no boxes).
4. A pass on every label: sentence case, the game's voice, no letter-spaced capitals except stencils.

## Phase B: play

5. Camera closer in the shallows (Earl readable, catches visible), pulling out with depth and speed.
6. The sub's own hotbar on desktop: the claw, the trawl, the tank's places, instead of the net and traps with text
   written over them.
7. One jobs list: the quest board and the radio contracts in one place.
8. Simpler storage: the sub puts an animal where it can live (deep ones into a chamber) by itself; moving by hand
   stays possible.
9. Death: a beat of black, a line in the game's voice, the hospital bill as a form like the sale receipt, then the
   deck.

## Phase C: the world

10. Seabed: rock texture, a lit top edge, stones, shells, sponges and coral where they belong.
11. The deep: marine snow in the lamp, the floor visible in the lamp near it, now and then a far living light.
12. The thing in the deep: teeth uneven (size, angle, some broken), an irregular jaw, scarred skin.
13. Item art: painted icons for every kind of item, readable small (suits, fins, tanks, bags, nets, cameras).

## Phase D: check

Desktop (1280x760) and phone (844x390) screenshots of every screen after each phase; the regression scripts (chaos,
tutorial, wear, slot click, stamp check); version, handoff notes, push to claude/fish.
