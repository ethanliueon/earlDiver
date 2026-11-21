# Claude understands: handoff for the next session

Written at version 5.11.1 (commit after `dcc30be`), 2026-11-21, so another Claude can pick up where this one stopped.
Read `CLAUDE.md` first (the owner's philosophy and working rules), then `docs/PLAN_6.md` (the audit, decisions and
order of work), then this file. The illustrated guide for a new Claude is `docs/earl_design_guide.pdf`.

## Where things stand

- Branch `claude/fish-mobile` holds everything up to 5.11.1. `main` is at fb6c0c9 (5.10.x); merge only when the owner
  says a version is good.
- Done and agreed recently: the trawl takes whatever its mouth touches; the hand net as it was; Tidewarden in the jaws
  (layout stays, the rest dims, a ready Tidewarden swells); one lure in all (10 s light, then ~20 s away; pushed into
  the jaws); "too big for the net"; photos graded Poor/Good/Excellent with stamped stars and paid by the camera's
  Quality; photos developed like film and opened as a small card, never full screen; rarity price bands; rarity
  stamps in the shops; fish pass batch 8; the marked eye; no developer key; no boxed danger strip; the trap card.

## Owner decisions since the proposal (latest first; these override anything below)

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
