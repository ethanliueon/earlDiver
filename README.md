# Earl Diver

A 2D ocean diving and survival horror game that runs in the browser (desktop).

There is no goal and nothing to win. Earl dives, explores, writes down what he sees,
and tries to stay out of reach of something in the water. When the run ends, it ends.

**Play:** https://ethanliueon.github.io/earlDiver/ (once GitHub Pages is switched on for this repo:
Settings → Pages → Deploy from a branch → `main` / root).

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrow keys | Swim (or steer the submersible) |
| Shift | Faster, but uses air twice as fast |
| F | Interact: observe a creature, collect, cut kelp, board the submersible |
| hold F | Leave the submersible |
| J | Journal (species you have observed, and your own notes) |
| L | Lights on/off. Light carries a long way in the dark |
| Q | Throw an anglerfish lure |
| E | Wear a fangtooth necklace |
| U | Boat workshop (at the surface, by the boat) |
| Esc | Pause |
| M | Mute |

## What to know

- Air is the bar under the timer. Surface to refill. Below 300 m the pressure makes it drain
  much faster. Each of the 8 deep sapphires adds 15 s of air.
- The submersible is docked at the boat. It is rated to 800 m. Past 1.3× its rated depth it
  implodes. Refit it at the boat with what you collect (3 refits, up to 2,700 m).
- Something is out there. It hears speed and engines, and it sees light. Kelp and rock overhangs
  hide you if you are slow and dark. Sea lanterns keep it away, for a while.
- When it is within 200 m it shows on the sonar. You will feel it before then.

## Running locally

It is a static site with no build step. Serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000. (Opening `index.html` directly from disk will not work,
because browsers block ES modules on `file://`.)

`tools/gallery.html` shows every species drawing on one page.

## Project layout

```
index.html          page shell and overlays
css/style.css       menus, journal, panels
js/main.js          game loop, state, interactions
js/world.js         ocean generation (terrain, kelp, wrecks, lanterns, pickups)
js/species.js       look and behaviour of each species
js/creatures_draw.js  procedural drawings of every creature
js/fauna.js         swimming life: spawning, schooling, fleeing
js/player.js        Earl and the submersible: movement, air, pressure, hull
js/entity.js        the entity's hunting behaviour
js/render.js        scene and light model
js/earl_draw.js     Earl, the submersible, the boat, the entity's shape
js/hud.js           timer, air, dive monitor (sonar, heart rate, journal)
js/audio.js         music and generated sound
js/ui.js            home screen, journal, workshop, dive log
data/species_data.js  183 species (from Ocean_Species_Reference.pdf)
GAME_DESIGN.md      the design this is built from
```

## Credits

- Music: `assets/audio/background_music.mp3`, supplied by the project owner.
- Species facts (names, depth ranges, sizes, descriptions) from the project's
  Ocean Species Reference. All creature art is drawn in code; no photos are used.
- Fonts: EB Garamond and IBM Plex Mono (Google Fonts, SIL Open Font License).
