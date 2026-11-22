# Claude understands: handoff for the next session

Written at version 5.11.1, brought up to date at 6.5.3 (2026-11-22), so another Claude can pick up where this one stopped.
Read `CLAUDE.md` first (the owner's philosophy and working rules), then `docs/PLAN_6.md` (the audit, decisions and
order of work), then this file. The illustrated guide for a new Claude is `docs/earl_design_guide.pdf`.

## Where things stand

- Branch `claude/fish-mobile` holds everything up to 6.5.3, and the owner said that is good enough for `main`: it is
  merged there (fast-forward). Merge again only when the owner says a version is good.
- Done and agreed recently: the trawl takes whatever its mouth touches; the hand net as it was; Tidewarden in the jaws
  (layout stays, the rest dims, a ready Tidewarden swells); one lure in all (10 s light, then ~20 s away; pushed into
  the jaws); "too big for the net"; photos graded Poor/Good/Excellent with stamped stars and paid by the camera's
  Quality; photos developed like film and opened as a small card, never full screen; rarity price bands; rarity
  stamps in the shops; fish pass batch 8; the marked eye; no developer key; no boxed danger strip; the trap card.

## Owner decisions 6.3 to 6.5.3 (latest first; these override anything below)

- **6.5.3:** every item card is one card (js/itemcard.js, .icard): picture, name, rarity centred, then the description,
  the legendary power right under it (name in legendary colour, a "Passive" or "Every N h" tag, one sentence), then
  the skills as a short list (a few words each, the full meaning unfolds on a tap); fixed gaps, only height changes.
  Faithless reads "Animals can't hurt you, and the thing hunts you more slowly." The HUD's trawl and trap coins use
  the redrawn pictures.
- **6.5.2:** trawl nets drawn as cones of netting hung from a solid ring (kit_art.js), also in the water; film is a
  short black strip, $5, each camera holds its own load per dive (10 only on legendary cameras) and reloads at the
  surface from up to 36 spare; the count shows on the camera's button; the bag shows owned spaces as wells and the
  rest as bare plate, "used / owned"; only the one catch may tip the bag over (school extras stop at the limit).
- **6.5.1:** the daily gift's first week is a new player's own (pine crate, $1,000, 3 advanced glow sticks, fish trap,
  station case, $5,000, Siren's casket), then weeks scaled by the hidden level (store.js). Siren's casket 15/80/5.
  No frozen lessons: the Log's steps teach in the running world (quiet ring, air callout). The sub you can board
  breathes in its exact shape with a bone rim; boat parts get a soft light. Interact button: gunmetal ring inside the
  coin, a warm line inside it, larger picture. Layers that scroll with the camera move by its motion (render.js
  drift), never by its place times the zoom. Odometer depth. No guiding frame. Schools evenly spaced. Trawl net choice
  in the Catch tab. Skill names coloured by level (I uncommon .. IV legendary; flat exotic; powers legendary).
- **6.5.0:** one gain effect everywhere (as a chest find), cash only inside a gift; item names in rarity colour; the
  big button only net or camera; no rare forms; panels shown only once drawn; nothing behind a panel drawn slower;
  iOS audio "ambient"; loading screen at least 3 s; marine snow only below 150-200 m; journal pictures are small tanks.
- **6.4.x:** 12 chests as locker items with tiered openings; Shop and Events tiles; prices: common to rare gear cheap
  (rare about $2k), exotic and legendary gear at their old prices, chests $900 up to Poseidon's chest $100,000; one
  red close cross everywhere; the title's first tap shows the divers; Delete on each saved diver.
- **6.3.0:** no brackets on animals (the interact button becomes an eye); pressure curve to x80 at 1,000 m past the
  suit; nothing on screen changes past the suit's depth but a "Pressure xN" figure; "Old coin".
- Open, waiting on the owner: gear packs (what one is), the story and regions plan (docs/PLAN_STORY.md and its four
  questions), Dave as a diver met in the world (with the story round).

## Owner decisions since the proposal (latest first; these override anything below)

- **6.2.0:** the marked eye back under the money (the larger 6.1.11 eye); the chest's opening fixed (the lid's inside
  worked and in shadow, the find below the box on the olive plate, plain buttons); legendary lengths raised under 4 m
  (Oarfish 3.9, Gulper 3.8, Grenadier 3.2, Dragonfish 3.0, Coelacanth 2.8, Viperfish, Tripod and Anglerfish 2.6,
  Swallower 2.4, Fangtooth, Dumbo and Vampire Squid 2.2, Blobfish and Barreleye 2.0, Isopod 1.8); size variation about
  15 %, price about 10 %; camera ports at a tube's end drawn as ovals. The owner's grade of the 6.x work: the suits,
  shop layout, close buttons and items are right as they are (my earlier "C for suits" was withdrawn).

- **5.12.x (built on the owner's go):** suits are about depth (pressure 20 m to 1,000 m+, air saved only from Rare up,
  no speed); speed is the fins' alone, shown at half; a skill that raises a number shows it green with (+boost); fish
  swim their own fixed pace (no bolting, startle, tiring or daze); past the suit's depth the HUD slowly loses up to 40 %
  colour and past twice it the depth turns to blood; the thing in the deep goes by light and nearness only (not speed,
  not glow sticks), a mark lost only beyond 1,000 m after 30 s dark, then it waits there; tanks/bags/nets/cameras have
  even steps to Exotic and a large jump to Legendary; every item kind is drawn as a solid photographed object
  (js/suit_art.js, js/gear_art.js). Health and food are parked.
- **Waiting on the owner:** docs/PROPOSAL_prices.md (prices on the new stats) and docs/poc/shops/*.png (three shop
  identities inside the same layout, and a studio-lit photo backdrop). Nothing of either is applied.

- **5.11.2 (built on the owner's go):** the shop's rarity is now the small word already on each card and page, in its
  rarity's ink; the stamps are gone. The money is out of the website; it shows above the monitor, top left, drawn as
  the HUD draws it in play (the monitor stands a little lower to make room). Two new suit samples are in
  `docs/poc/suits_samples.png` (+ `.html`), waiting for the owner's verdict before any suit goes into the game.

- **Chest prices stay as they are.** Do not reopen it. (The table below is kept only as a record.)
- **The Bayside mock (docs/poc/bayside_page.png) is REJECTED**: "a massive step down", "everything about this looks
  completely AI". The current shop layout stays, and the rest of the site (header, Cart, Log off, navigation) needs
  no change. Only the anchor-and-net logo was liked.
- **Fake-vintage props read as AI**: rubber stamps, "printed" price tags, faux paper textures, neat one-line
  "flavour" descriptions. Do not use them anywhere.
- **The rarity stamps in the live shop (5.11.0) look AI-made.** The owner flagged them; if they are changed, make the
  rarity part of what is already there (e.g. colour the existing small rarity word), never a new badge or shape.
  Not changed yet: ask before building.
- **The website does not know the player.** Showing the player's cash inside the supplier's site was questioned
  ("the website does not belong to the player"). Not changed yet: ask before building.
- **The concept suits are far from finished**: they are cylinders, and the Iron Lung hardsuit looks wrong. Real suits
  need shape (shoulders, slack fabric, folds where they hang; a hardsuit built from its real joints), two samples
  shown first.

## Chest prices (decided: unchanged; kept as a record)

## The earlier proposal, in full (the owner liked the direction, then rejected the shop mock; see the decisions above)

You're right, and I'd push it further: the shop pages are a generic web template (white boxes, gradient picture
backgrounds, a soft blurred oval for a shadow). Those are exactly the things your philosophy rules out. The website
doesn't need to be detailed; it needs to look intentional. Here's what I'd do.

### The shop websites
Simple, but every element chosen, never a default:
- **Real photographs, not gradient boxes.** Each item sits on a real surface lit from one side (a worn canvas backdrop,
  a workbench, a steel deck plate), with a true contact shadow: tight and dark where it touches, fading off. No
  floating ovals.
- **Each shop is its own business**, not one template in three colours:
  - **Bayside Marine Supply** (a family harbour supplier): an off-white paper page, printed rules instead of boxes, a
    small hand-drawn anchor-and-net mark in the masthead, prices on printed tags.
  - **Dave's Haul** (one man at 1,200 m): his own flash photos on the station's corrugated steel, slightly crooked,
    a little overexposed; his notes in plain type (and lose the script font, which the philosophy forbids).
  - **The station stores**: an institutional stock list, typed, stencilled part codes, grey and plain.
- **Fewer, firmer lines**: no rounded cards or soft drop shadows; a clear hierarchy in the game font (one big name,
  small spaced capitals for details).
- **The rarity stamps stay**: they're the one part that already reads as designed.

### The suits
Not lying flat but **standing in three quarters, turned away from you**, the way a dive shop photographs a suit on
a stand:
- **Real depth**: the suit turned about 35 degrees away; the near arm and leg larger and in front, the far ones smaller
  and half hidden behind the body; the torso and limbs shaded as round forms lit from one side.
- **Each suit posed by its kind**, not one template: a wetsuit hangs a little limp, a drysuit stands stiffer with its
  boots and brass zip, a hardsuit stands like a machine, a skin suit drapes; within a kind each one's arm and leg
  angles vary a little, so no two match.
- **Rarity still shows as craft**: trim, then piping and a maker's patch, then glowing seams on legendaries.
- Upright on a stand (recommended) rather than lying on a table seen at an angle.
- Draw two first (a wetsuit and a hardsuit), show them, then the rest.

Order: the two sample suits, then all suits, then the three shops' new look one shop at a time (Bayside first),
with screenshots.

## Proofs of concept (in `docs/poc/`, drawn outside the game, not wired in; FAR FROM FINISHED)

- `suits_three_quarter.png` (+ `.html`): a wetsuit on a steel stand and a brass hardsuit, both turned away, round
  shading lit from the left, near limbs in front, far limbs darker behind, a contact shadow on a canvas sweep.
  Weak points to fix when building: the backdrop's horizontal streaks read a little like scanlines; the wetsuit's
  legs are a touch wide; poses need per-suit variation.
- `bayside_page.png` (+ `.html`, uses `wet.png`, `hard.png`): **REJECTED by the owner, do not build or copy it.** Bayside as a printed catalogue page: paper, a double
  rule under the masthead, the anchor mark, spaced-capital navigation, rules between items instead of boxes, printed
  price tags, rarity stamps. In the game each photograph would be drawn to fill its frame.

## Pending later phases (from PLAN_6, owner-agreed order)

Coins and small art; item pictures (all 411, last, only if time allows); phone panels (owner: text size is fine,
do not enlarge); painted chests; the deep's polish (zones, lit landmarks, death and implosion cards); quests tied to
people and places; a depth ladder. Parked: journal milestones.
