# Earl the Diver

Version 1.26.0 (shown on the home screen and in the pause menu; see `js/version.js`).

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
| Space | Use it: sweep the net, fire the slurp gun or a tag dart, take a picture; with a trap, at the surface: choose its depth and set it. In the sub (with the arm fitted): reach, then Space again to close the claw |
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
- The submersible is docked at the boat. Past its rated depth the hull creaks, the viewports fog
  and the seams weep. Each dive it has its own hidden crush depth (on average about 1.6× its
  rating: around 470 m for a 300 m sub, rarely above 400 m or past 540 m); nearing it the chance of
  failing rises fast, and when the hull gives it implodes in half a second.
  Refits at the boat take it down to 3,000 m.
- The sub changes as she is refitted. Her depth rating sets the hull: Mk I, the old riveted Б-7;
  Mk II, the yard's welded refit (from 675 m); Mk III, a research sub with an orange foam float and
  skids (from 1,200 m); Mk IV, titanium (from 1,950 m); Mk V, full ocean depth (from 2,925 m). Every
  other upgrade shows on her: more prop blades and side thrusters, air bottles, ballast hoppers, the
  backup tank rack, the sample basket and its pressure chambers, a heavier claw, the quiet engine's
  shroud and the recall transponder.
- A damaged hull leaks cabin air. Repairs during a dive use supplies bought at the boat: a leak
  sealant kit (K, inside: +20 %, but only up to 85 %, since a seal is not steel) or a hull patch
  plate (hold F outside at the hatch: 10 s of wet welding, +40 %; the arc's light is seen below 200 m).
- Something is out there: a gulper some 100 m long, nearly all head and mouth, with red lights
  flickering fast and unevenly along its length and red eyes. It hears speed and engines, and it
  sees light. Kelp and rock overhangs hide you if you are slow and dark. Sea lanterns keep it away,
  for a while.
- Catch it in your lamp and every light on it goes out. A second of black, one blue flash (it has
  seen you), black again; then only its eyes, brightening, while its red seeps into the water
  around you. Go dark and still, or hide, before the red peaks and it may lose you; run and it comes.
  The pause menu has a "Reduce flashing" setting that slows and softens its lights.
- It hunts in stages you can read: it stalks at the edge of your light, sweeps past you once, draws
  back (a low swell) and strikes. Keep still and dark and it may lose you; in the sub, it may come and
  look in at the viewport, and leave if you do not move. When it takes you, everything goes silent
  and a long pale arm reaches out of its mouth: flash the lights (L, once: it learns), throw a lure
  (Q) or wear a necklace (E) to make it let go. Otherwise the jaws open.
- It travels at about 12 m/s, bursting to 15 m/s only on screen, and only when you flee.
- The headlamp (L) works at any depth; it comes on by itself below 200 m and at night.
- An offering to the deep (G, a lure or necklace let go below 100 m) ends its hunt, and for three
  minutes it will not notice you at all. Good deeds that calm it fully do the same.
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
js/earl_draw.js     Earl, the submersible, the boat, the arm from the entity's mouth
js/monster_draw.js  the entity itself: its body (painted once into sprites), its lights
js/hud.js           timer, air, dive monitor (sonar, heart rate, journal)
js/audio.js         music and generated sound
js/ui.js            home screen, journal, the boat (shop and ledger), dive log
js/economy.js       the save, prices, the market, what is for sale
data/species_data.js  183 species (from Ocean_Species_Reference.pdf)
GAME_DESIGN.md      the design this is built from
```

## Credits

- Music: "Polaroid II" (`assets/audio/polaroid_ii.mp3`), an original piece composed for the game.
- Sound effects (`assets/audio/sfx/`), all CC0 (public domain), trimmed, levelled and processed here:
  - chamber_plop, tank_plop, surface_lapping: OpenGameArt "Bubble Sound Effects" and
    "40 CC0 water / splash / slime SFX"
  - seagull: OpenGameArt "Solo Seagull Sound Effects"
  - hull_creak_1-3: made here from Kenney "Impact Sounds" metal hits
  - sub_implosion: made here from OpenGameArt "Battle at sea", Kenney "Impact Sounds" and
    synthesised rush and rumble
  - journal_page: Kenney "RPG Audio" (a page turn, softened)
  - ui_click: Kenney "Interface Sounds"; ui_click_soft, ui_rollover: OpenGameArt
    "51 UI sound effects (buttons, switches and clicks)"; ui_sale_coins: made here from Kenney
    "Impact Sounds" and "Interface Sounds"
- Species facts (names, depth ranges, sizes, descriptions) from the project's
  Ocean Species Reference. All creature art is drawn in code; no photos are used.
- Fonts: EB Garamond and IBM Plex Mono (Google Fonts, SIL Open Font License).
