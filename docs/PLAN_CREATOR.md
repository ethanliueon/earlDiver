# Painted heads for the diver creator: the ChatGPT pipeline (planned, not built)

Written 7.5.0 at the owner's request, to be done later. A PDF version for the other Claude comes after.

## Why

The creator's heads are drawn in code (`js/face_draw.js`): a profile, four face shapes, seven hairstyles, beards. Code
draws clean shapes; it struggles with what a painted head needs (hair with volume and strands, a jaw that turns, the
soft modelling of a cheek). ChatGPT's image editor paints these well, but only when it *edits* a fixed picture: asked
to draw from scratch, every head comes out at a different size, angle and style, and nothing lines up.

## Who does what

- **The owner** opens ChatGPT and the other Claude (a computer-use or browser session) side by side.
- **The other Claude** drives ChatGPT: uploads the template, sends one edit prompt per piece, downloads each result,
  checks it against the template, and asks for a redo when it fails.
- **This repository's Claude** (later) cuts, recolours and wires the pieces into the game.

## The template (made first, by hand, in this repo)

One 1024 x 1024 PNG, the head in profile facing right, exactly as the game shows it (`face_draw.js`: X forward, Y
down, about 16 units crown to chin):

- a bald neutral head, **skin a flat mid grey-beige** (so code can recolour it to all nine skins), eye closed-ish and
  calm, no expression;
- **a flat key-colour background** (pure #00ff00 or #ff00ff, whichever is not in any piece), so pieces cut out cleanly;
- **registration marks**: four small crosses in the corners, never touched by an edit, to check that nothing moved;
- **a shared skull**: crown, forehead, ear and nape in one place for every face, so every hairstyle fits every face.
  Faces differ only in front of the ear and below the cheekbone (jaw, chin, nose, brow).

## The pieces (about 28)

| Group | Pieces | Count |
|---|---|---|
| Bare heads | 4 face shapes (Oval, Square, Narrow, Round) x man / woman, neutral skin | 8 |
| Hairstyles | Crop, Swept, Curly, Buzz, Bob, Ponytail, Bun: each alone on the key colour, on the shared skull | 7 |
| Beards | Stubble, Short, Full x the 4 jaws | 12 |
| Knit cap | one, on the shared skull | 1 |

Eye depth (Open, Even, Deep-set) stays in code: a shadow over the socket. Hair, eye and skin colours stay in code.

## The prompt shape (one edit per piece, always on the template)

> Edit this image. Keep the canvas size, the head's position, size and angle, the four corner crosses and the green
> background exactly as they are. Change only: [one thing, e.g. "give the head a square jaw: a strong, low jaw angle
> and a broad chin"]. Painted by hand, matte, muted, like an old illustrated field guide: soft light from the upper
> left, no outlines, no shine, no text, no extra objects.

For hair, beards and the cap, the request ends with: "Show only the hair (or beard / cap), on the plain green
background; remove the head." Hair is asked for in a **neutral mid grey** so code can tint it to the seven hair colours.

## The check after every image (the other Claude does it before moving on)

1. Same size (1024 x 1024), the four crosses where they were (within 2 px).
2. The background still the pure key colour round the piece.
3. Overlay on the template at 50 %: the skull line, ear and nape match (hair must sit on them).
4. Matte, muted, no outline, no text, no new objects; nothing that looks generated or glossy.
5. A failure is redone with the same prompt plus the one thing that failed ("the ear moved up: keep it where it was").

## Names

`assets/face/head_m_oval.png` ... `head_f_round.png`, `hair_crop.png` ... `hair_bun.png`,
`beard_stubble_square.png` ..., `cap_knit.png`. Delivered full size; this repo makes the small versions.

## Wiring (this repo, later)

- `tools/face_cut.py`: key out the background, trim, and save 256 px versions with the registration offset.
- `face_draw.js`: draw the head image tinted to the chosen skin (multiply over the neutral), then the beard and hair
  tinted to the hair colour, then the eye depth's shadow; the code-drawn head stays as the fallback until all
  pieces are in.
- The creator, the deck, the cabin and the Rebirth scene all use the same function, so the new heads show everywhere.

## Open questions for the owner

- Does the helmet stay on in the sea (so heads are only seen aboard, in the creator and in Rebirth)? Then 256 px is
  plenty.
- Woman's faces: the same four shapes, or their own four?
- Keep the knit cap as a creator choice, or only as a reward?
