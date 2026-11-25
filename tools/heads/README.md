# Painted heads: the ChatGPT job (7.6.37)

Everything a Claude on the owner's computer needs to have ChatGPT paint the diver's head pieces. Read
`docs/HEADS_HANDOFF.pdf` first (the same as `handoff.html` here).

| File | |
|---|---|
| `template_m.png`, `template_f.png` | the two 1024 x 1024 templates every image is an edit of |
| `pieces.json` | the checklist: 28 pieces, each with its file name, template, exact prompt and status; the fix lines for retries |
| `check_piece.py` | the automatic check: `python3 check_piece.py <piece.png> <head\|hair\|beard\|cap> [m\|f]` (needs Pillow) |
| `ref/` | pictures of the game and an example piece with its overlay |
| `make_template.cjs`, `fill_holes.py` | how the templates were made from the game's own head (face_draw.js); run with the game served on :8765 |
| `handoff.html` | the source of the PDF |
