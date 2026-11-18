# UI brief: the sonar phosphor

The rule every screen is checked against. If a choice cannot be justified from this page, it is wrong.

## The concept, in one line

**Earl knows the deep only through his instruments.** Everything the game tells him is a return on dark glass:
the same green phosphor as the Margaret's sonar and the cabin's old CRT. The sea is the picture; the UI is the
glass he reads it through.

## Why this, for this game

- The game is about not being able to see: the light fails with depth, something hunts by sound, the sonar is how
  you know it is near. An interface made of sonar returns says that on every screen.
- Phosphor is already in the world: the sonar sweep, the cabin computer ("BAYSIDE MARINE SUPPLY >_" in green on a
  beige CRT), the original UI's `--phosphor`. Nothing is imported from outside the fiction.
- Green phosphor is the complement of the sea's blue (frames: #175a81 in the shallows down to #010919 in the deep),
  so it reads on every depth without a box behind it.

## Two registers, and only two

1. **The instruments** (HUD, sub, inventory, settings, quests, title, dialogs, the yard): phosphor on dark glass.
2. **Earl's own things** (the journal, the Bayside catalog, the cabin): paper, ink and print, warm. They are
   objects he owns, not instruments, and the contrast makes both read better.

## Palette (from the game's frames, nothing else)

| Role | Colour | Source |
| --- | --- | --- |
| Glass (off screen) | `#06110e`, at 82-90% | the deep's navy pushed toward phosphor black |
| Phosphor, lit | `#b9e69a` | the original `--phosphor` |
| Phosphor, dim (labels, scales) | `#b9e69a` at 55% | the same, less beam |
| Phosphor, ghost (grids, off segments) | `#b9e69a` at 18% | afterglow |
| Danger | `#ff5a46` | already in the world: the red eye of the mark, the death timer, the sonar contact |

There is no accent colour. Emphasis is made the way a real terminal makes it: **inverse video** (a filled phosphor
block with glass-coloured text) for the selected thing and the one action to take; **flicker** for urgency.
Red appears only when the thing in the deep or death is involved, so it keeps its weight.

## Type

- **VT323** for every reading and label the instruments print: depth, air, cash, keys, button words. Set at sizes
  that are multiples of its pixel grid (16, 24, 32, 48...) so it stays crisp. Lower case for labels.
- **EB Garamond** for sentences that come from people: quest wording, descriptions, the journal. Never for
  figures.

## Shapes

- Square corners (radius 0-2 px). Screens have a thin dark bezel and a faint inner glow, nothing else.
- Lines are 1 px phosphor rules and ticks, like a scope's graticule. No drop shadows on text; a soft glow only.
- Icons are drawn as phosphor line art centred by geometry (never a font glyph in a box).

## Banned (each was in an earlier pass and read as generated)

- Spaced-out capital labels (`C A S H`, `DEPTH` tracked +0.16em).
- A short accent bar under every heading.
- One rounded dark rectangle used for every container.
- Decorative screws or rivets that fasten nothing.
- An accent colour that is not in the world (orange, gold, brass).
- Gradient buttons; glossy highlights; fake bevels.
- Font glyphs used as icons inside keys (× sits on the baseline, not the centre).

## How work is judged

1. Does it read as a return on glass, from this game's world? (concept)
2. Is it readable at a glance in the deep, at 1024x600 and 1920x1080? (function)
3. Does anything on the banned list appear? (taste)
4. Is anything overlapping, clipped or off-centre? (craft)
