# Earl the Diver

Version 1.10.0 (shown on the home screen and in the pause menu; see `js/version.js`).

A 2D ocean diving and survival horror game that runs in the browser (desktop).

Earl makes his living from the sea: he dives, brings things up, sells them at his boat and spends
the money on better gear to go deeper. The valuable things are deep, and so is something else.
Cash and upgrades survive death; whatever he has not sold does not. See `docs/PLAN.md` for the
update in progress.

**Play:** https://ethanliueon.github.io/earlDiver/ (once GitHub Pages is switched on for this repo:
Settings → Pages → Deploy from a branch → `main` / root).

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrow keys | Swim (or steer the submersible) |
| Shift | Sprint (1.5x, upgradable), but uses air twice as fast |
| F | Interact: observe a creature, collect, cut kelp, board the submersible |
| hold F | Leave the submersible |
| C | Call the submersible: it drives itself to you (never below its rated depth). C again stops it |
| hold C | Send the submersible back to the boat |
| C (inside the sub) | Autopilot home: it steers to the boat on 0.8x air; steering, a hit or danger hands it back |
| 1 / 2 / 3 / 4 / 5 | Net / slurp gun / tag gun / camera / traps (once bought) |
| Space | Use it: sweep the net, fire the slurp gun or a tag dart, take a picture, set a trap. In the sub (with the arm fitted): reach, then Space again to close the claw |
| J | Journal (species you have observed, and your own notes) |
| L | Lights on/off. Light carries a long way in the dark. Flash it at a charging animal to make it swerve |
| Q | Throw an anglerfish lure |
| E | Wear a fangtooth necklace |
| G | Offer a lure or necklace back to the deep (below 100 m) - calms the entity |
| B | At the boat: take the helm and drive the Margaret along the surface (A / D) |
| T | In the sub: the back of the sub (the chamber room and the tank room; arrows to move between them) |
| U | The boat (at the surface): sell your haul, buy gear, radio contracts, the aquarium |
| Mouse | Earl swims toward the cursor by himself (the keys take over while you use them); left click swings the net (or uses the tool in hand; in the sub, the arm); hold the right button to sprint; the lamp follows the cursor; wheel to zoom; click the Q/E slots to use items |
| Esc | Pause |
| M | Mute |
| H | Hints on / off |

## What to know

- Air is the bar under the depth. Surface to refill. Below 300 m the pressure makes it drain
  much faster. Bigger tanks are bought at the boat.
- Everything you collect sells at the boat. Prices drop if you flood the market, and recover.
  Deep sapphires (below 500 m) are the most valuable thing in the sea.
- Once you have caught a species, 1 in 20 of its kind are rare: giant, albino, golden,
  melanistic, abnormal, or (deep, and near the thing in the deep) crimson. They pay 2-5×.
- Dying costs whatever you have not sold and a hospital bill (10 % of your cash). Cash, upgrades,
  the journal and the aquarium carry on to your next dive, but nothing is saved when you leave or
  refresh the page: every visit is a new game. Only your deepest depth is remembered.
- The aquarium (built from the boat, seen on the far shore): keep live animals instead of selling
  them; visitors pay every 10 minutes of play.
- The radio at the boat has a few contracts each dive that pay well over the market.
- H turns detailed hints on and off.
- What you take (salvage, clams, sapphires) does not come back during a dive. A new dive is a new
  sea: die, or end the dive from the pause menu (unsold catch is lost either way).
- The submersible is docked at the boat. It starts rated to 400 m. Past 1.3× its rated depth it
  implodes. Refits at the boat take it down to 3,000 m.
- Something is out there. It hears speed and engines, and it sees light. Kelp and rock overhangs
  hide you if you are slow and dark. Sea lanterns keep it away, for a while.
- It never comes above 100 m: the top 100 m are safe from it (not from sharks).
- When it is within 200 m it shows on the sonar. You will feel it before then.
- Sharks, billfish and sperm whales attack too. There is no health bar: you will see and hear how
  badly you are hurt. Wounds heal if you survive long enough.
- Air is shown in bar, like a real cylinder gauge (200 full, 50 reserve).

## Running locally

It is a static site with no build step. Serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000. (Opening `index.html` directly from disk will not work,
because browsers block ES modules on `file://`.)

`tools/gallery.html` shows every species drawing on one page, `tools/variants.html` the rare
variants (add `?ids=1,2,3` for other species) and `tools/gear.html` the catching gear.

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
js/hunters.js       animals that attack Earl or the submersible, and the encounter director
js/render.js        scene and light model
js/earl_draw.js     Earl, the submersible, the boat, the entity's shape
js/hud.js           timer, air, dive monitor (sonar, heart rate, journal)
js/audio.js         music and generated sound
js/ui.js            home screen, journal, the boat (shop and ledger), dive log
js/economy.js       the save, prices, the market, what is for sale
data/species_data.js  183 species (from Ocean_Species_Reference.pdf)
GAME_DESIGN.md      the design this is built from
```

## Credits

- Music: `assets/audio/background_music.mp3`, supplied by the project owner.
- Species facts (names, depth ranges, sizes, descriptions) from the project's
  Ocean Species Reference. All creature art is drawn in code; no photos are used.
- Fonts: EB Garamond and IBM Plex Mono (Google Fonts, SIL Open Font License).
