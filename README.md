# Earl the Diver

Version 4.21.1 (shown on the home screen and in the pause menu; see `js/version.js`).

A 2D ocean diving and survival horror game that runs in the browser (desktop).

Earl makes his living from the sea: he dives, brings things up, sells them at his boat and spends
the money on better gear to go deeper. The valuable things are deep, and so is something else.
Cash and upgrades survive death; whatever he has not sold does not.

**Play:** https://ethanliueon.github.io/earlDiver/ (once GitHub Pages is switched on for this repo:
Settings → Pages → Deploy from a branch → `main` / root).

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrow keys | Swim (or steer the submersible) |
| Shift | Sprint (1.5x, upgradable), but uses air twice as fast |
| F | Interact: observe a creature, collect, board the submersible, haul or empty a trap |
| hold F | Leave the submersible |
| C | Call the submersible: it drives itself to you (never below its rated depth). C again stops it |
| hold C | Send the submersible back to the boat |
| C (inside the sub) | Autopilot home: it steers to the boat on 0.8x air; steering, a hit or danger hands it back |
| 1 / 2 / 3 / 4 / 5 | Net / slurp gun / tag gun / camera / traps (once bought) |
| Space | Use it: sweep the net, fire the slurp gun or a tag dart, take a picture; with a trap, at the surface: choose its depth and set it. In the sub (with the arm fitted): reach, then Space again to close the claw |
| N | In the sub: drop the trawl net from the belly hatch; N again closes it and the winch hauls it in (each net is used up in one haul; you start with one beginner net) |
| J | Journal (species you have observed, and your own notes) |
| L | Lights on/off. Light carries a long way in the dark. Flash it at a charging animal to make it swerve |
| Q | Throw an anglerfish lure |
| E | The fangtooth necklace: a soft green light, like a glowstick |
| G | Offer a lure or necklace back to the deep (below 100 m, only while it hunts you and is within 1,000 m) - ends its hunt. At the helm: drop or raise the Margaret's anchor |
| B | Inventory: cash, supplies, finds, the catch bag, what is in the sub, your gear |
| T | In the sub: the back of the sub (the chamber room and the tank room; arrows to move between them) |
| F at the ladder | Climb aboard the Margaret, rung by rung (a dive starts on the deck). On deck, A / D walk (Shift runs, Space or W jumps); the only thing to use is the wheelhouse door (F, Enter the cabin). Walk off either end of the deck to jump in |
| F (in the cabin) | A / D walk the cabin (Shift runs), or click where to go; click a thing to use it. F at: the computer (the catalog and the sub's yard), the radio (accept contracts; new ones free every 3 hours), the wheel (A / D steer, G anchor, W leaves the wheel), the hatch in the floor (the gallery). Esc or the door goes back out on deck |
| U (in the water by the boat) | Sell the catch, without going aboard. Contracts you accepted at the radio are paid here when the goods are aboard |
| Mouse | Earl swims toward the cursor by himself (the keys take over while you use them); left click swings the net (or uses the tool in hand; in the sub, the arm); hold the right button to sprint; the lamp follows the cursor; wheel to zoom; click the Q/E slots to use items |
| Esc | Pause (save and quit to the title from there) |
| ⚙ | Settings and controls (on the title screen, in the journal and the pause menu): target brackets, catch tags, reduce flashing, hints, sound, graphics (Auto / Fast) |
| M | Mute |
| H | Hints on / off |

## What to know

- **Saves.** Three save slots on the title screen; the game saves as you play (cash, gear, the
  journal, the aquarium, named and released fish, where the Margaret is anchored). Continue picks up
  the last one.
- **Air** is the bar under the depth. Surface to refill. Earl's tank goes up to 200 s with upgrades;
  the cabin air comes with each submersible (150 s in the first, 300 s in the best).
- **The catalog** (the computer in the cabin, F) is a small shop website: hand nets, slurp guns, tag
  guns, cameras, trawl nets, traps, suits, fins, air tanks, bags and supplies, each its own item with
  what it is good for and not for. Bought items are yours at once and go on; change them in the
  inventory (B) on deck, in the cabin or in the sub (drag onto Earl, or click). "The yard" sells the
  sub's parts (hull, engine, chambers, open tank, air rack, claw); better buyers are on the radio.
- **Contracts** on the radio pay the market price plus a premium for the trip (more for deeper work),
  never more extra than your next submersible costs.
- **Selling.** Everything sells at the boat; the price board shows what the last sales fetched.
  Tiny fish are "too small" to tag; medium ones pay a dollar or two in tags. Upgrades grow like
  Cat Goes Fishing: each level worth more than the last, and dearer.
- **Rarity.** Common, uncommon, rare, exotic, legendary, and the Undocumented: twelve animals with
  no scientific record, from the deepest and strangest places. The seven legends (humpback
  anglerfish, fangtooth, pelican gulper eel, barreleye, blobfish, coelacanth, oarfish) are giants
  here, and meeting one is an event. Once you have caught a species, 1 in 20 of its kind are rare
  forms (giant, albino, golden, melanistic, abnormal, crimson) that pay 2-5×.
- **Pressure.** Every animal has the depth it lives at. Within 50 m of it, it is fine; 150, stressed;
  250, dying; 350, dying fast; beyond, dead. Jellies take three times that, daily migrators twice,
  fish without a swim bladder 1.5×, and the deeper an animal lives the more it tolerates. The sub's
  chambers (and the large pressure tank) hold animals at their own pressure.
- **Dying** costs whatever you have not sold and a hospital bill (10 % of your cash, never more than
  $1,500). Cash, upgrades, the journal and the aquarium carry on.
- **The ocean** (see `docs/ocean_profile.png` for a side section) is 5,000 m wide: the beach, reef, kelp and wreck in the east; the shelf edge, a
  canyon, the slope with its cold seep, the abyssal plain with vents, a brine pool and a whale fall,
  a seamount; and in the west, under the wall with the old one's cave, the hadal trench: a wide
  floor at 4,800-5,000 m with one pit to 5,100 m, the deepest place there is. Nothing tells you
  where you are: explore.
- **Eight submersibles**, each a deeper one from the yard: the Б-7 bathyscaphe (300 m), its refit
  (500 m), a yellow 1960s work sub with an acrylic dome (900 m), a white oilfield work sub (1,300 m),
  a research sub (1,900 m), an Alvin-type deep research sub (2,500 m), a titanium one (3,300 m) and
  a full-ocean-depth sub (4,000 m). From the third, you name her; the name is painted on every hull
  after. Pressure relics add 100 m each. Past her rating the hull creaks and the seams weep; each
  dive she has a hidden crush depth (about 1.6× the rating for the first, 1.25× for the last, a
  narrower window on deeper hulls). Nothing survives the bottom of the pit.
- **Hull damage** shows on the sub as patches: dents in the plating, cracked and leaking (each about
  15 % of her hull; the cabin air leaks faster the more there are). Get out, swim to a patch and hold
  R: five seconds mends it. The boat can still patch her up for money.
- **The trawl net** is built into every sub: N lets it out; it takes up to ten animals, sharks to
  2.5 m, even legends, and dumps the haul on the tank-room floor. It comes back torn: one net is
  carried at a time (the first is free, then $300 at the boat). It is loud below 200 m. Big
  animals take two or three places in the open tank; the large pressure tank holds three animals,
  or one big one.
- **The Margaret** goes anywhere on the surface, slowly (5 m/s flat out). Drop the anchor (G at
  the helm; V takes the helm) and she stays, and the next dive starts there. Heavy traps are winched up from her helm
  over their buoys.
- **The aquarium** is a gallery aboard the Margaret, for the fun of it: one big tank where every
  animal lives together (a deep one does fine if it came up healthy), room for 4 animals to start (more from the
  shop's Aquarium tab, up to 20). Keep live animals instead of selling them; walk the gallery to pet,
  feed, name and light them. Visitors leave a little money each day (about 2 % of the animals' worth):
  pleasant, never a living. Stressed animals earn half until they recover; a dying one fades within
  minutes; a dead one (X eyes) can be taken out and sold. A healthy animal becomes Happy after five minutes
  (sells for ×1.2), then Famous fifteen minutes later (×2, for good). Take a Happy one down in the
  sub to its own depth and let it go: it stays there under its name, every dive. The tag tracker
  shows the way back to it.
- The radio at the boat has a few contracts each dive that pay well over the market.
- Something is out there: a gulper some 60 m long, nearly all head and mouth, with red lights
  flickering along its length and red eyes. Each run it starts somewhere new, between 1,500 and 3,500 m, and roams the whole ocean; by night
  it rises. Once a run, if it is far off while you are down in its water, it is suddenly 500 m nearer. It
  hears speed and engines, and it sees light. Kelp and rock overhangs hide you if you are slow and
  dark. Sea lanterns keep it away, for a while. It travels at about 7 m/s.
- Catch it in your lamp and every light on it goes out; then only its eyes, brightening. Go dark
  and still, or hide, before the red peaks and it may lose you; run and it comes. The pause menu
  has a "Reduce flashing" setting.
- At the sub, in open water, it comes three times: its tail, then its head, then its open mouth.
  Get away (up past 120 m, to a lantern, the old one's cave) or calm it (G) before the third.
  Swimming, in the last moment: flash the lights (L, once: it learns) or throw a lure (Q).
- It never comes above 100 m. When it is within 200 m it shows on the sonar.
- Between 2,500 and 3,000 m lives the Abyssal Sleeper Shark. Sharks, billfish and sperm whales
  attack too. There is no health bar: you will see and hear how badly you are hurt.

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
js/earl_draw.js     Earl, the submersible, the boat
js/monster_draw.js  the entity itself: its body (painted once into sprites), its lights
js/sleeper_draw.js  the abyssal sleeper shark
js/undocumented_draw.js  the twelve Undocumented animals
js/capture.js       catching alive, the bag, the sub's tanks and chambers, the trawl net
js/tankroom.js      the back of the sub: chambers, the open tank, the large pressure tank, the net's haul
js/aquarium.js      the aquarium aboard: tanks, days, Happy and Famous
js/showcase.js      the shop's showcase window: the selected item drawn now and next
js/gallery.js       the gallery aboard: tanks, the brass tags, lighting, release
js/hud.js           timer, air, dive monitor (sonar, heart rate, journal)
js/audio.js         music and generated sound
js/ui.js            home screen, journal, the boat (shop and ledger), dive log
js/economy.js       save slots, prices, upgrades, the submersibles, what is for sale
data/species_data.js  the first 188 species (183 from Ocean_Species_Reference.pdf, then mammals and the sleeper)
data/species_more.js  321 more (ids 189-509), each with its look and how it lives (reef home, climate, depth band); 447+ are the v2 deep, trench and Undocumented animals
GAME_DESIGN.md      the design this is built from
```

## Credits

- Music: "Polaroid (melodic)" (the first dive, and above 20 m); "Polaroid II - deeper (B)" (`polaroid_twilight.mp3`, the main theme); "Bathyscaphe" and "Open Water" (in the sub, settled below 200 m); "Music box" (at Dave's Haul). Each plays up to ~90 s, then a 5-9 minute rest.
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
