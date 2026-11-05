# Development notes

State of the build and ideas for what to do next. See `GAME_DESIGN.md` for the design itself.

## Built and tested

- Generated 1000 x 3000 m ocean around a fixed profile: beach, seagrass and reef, kelp forest,
  shelf wreck, sheer cliff with overhangs, continental slope with a deep wreck, abyssal plain
  with hydrothermal vents. Rock outlines, kelp, life, pickups and lanterns change every run.
- 183 species from the reference PDF, each drawn procedurally (`tools/gallery.html` shows all
  of them) and spawned only inside its real depth range and habitat.
- Light model: ambient light fades with depth and loses red first; pitch black below ~1000 m.
  Headlamp switches on below 200 m. God rays, caustics, marine snow, bioluminescence.
- 10-minute day/night cycle (5 day / 1 sunset / 3 night / 1 sunrise).
- Earl: swim, sprint (x1.5 speed, x2 air), low-air panic speed (x1.5 below 10 %),
  exponential pressure drain below 300 m (x30 at 1000 m), refill at the surface with bubbles.
- Submersible: board/leave (F / hold F), ballast makes vertical travel faster, hull stress past
  rated depth, implosion past 1.3x rated depth (debris, Earl stranded), 3 refits at the boat (U).
- The entity: hunts by sound and light, loses Earl in kelp or under overhangs, searches,
  periodically re-senses him; surface waves within 500 m, sky darkening when it is shallow,
  sonar contact within 200 m, heavy disorientation within 50 m, eyes and a faint outline
  when very close. Teleports 500 m below a diver who passes 500 m.
- Sea lanterns (3 m protection, dim with use and recover), fangtooth necklace (E, 15 s),
  anglerfish lure (Q, thrown, 10 s). Up to 3 of each.
- Death sequence: timer turns red, screen fades, 3-2-1, music fades, back to the live home
  screen. Run log (time, cause, deepest, species, sapphires) kept in the browser.
- Journal with observed species (drawn entries) and free-text notes.
- Audio: owner's music (muffled underwater and as dread rises), generated ambience,
  breathing, heartbeat, groans, sonar pings, hull creaks, implosion, distant calls.

Measured pacing (simulated, player doing nothing to evade): first sonar contact ~2 min,
taken at ~3 min; hiding in kelp roughly doubles that.

## Ideas for next

- Real sound effects for the entity (the owner offered to upload some); drop them in
  `assets/audio/` and wire them into `js/audio.js` (`groan`, `heartbeat`, etc.).
- Hand-made or licensed art for the most common species if the procedural look needs to go
  further (the reference PDF's photos are mostly non-commercial, so they are reference only).
- More hiding places: caves in the cliff, the inside of the wrecks.
- A short, wordless intro on first launch (the boat, the sound of the winch, Earl going over the side).
- Gamepad support.
- Settings: volume sliders, reduced motion (turn off disorientation effects).

## Versioning

`js/version.js` holds the version, shown on the home screen and in the pause menu, so the owner can
tell when a change has been published. Bump it with every change: the last number for small fixes
and tweaks, the middle one for new features or bigger changes, the first for a major overhaul.
Say the new number when reporting the change.

## Testing

Serve the folder (`python3 -m http.server`) and open it in a browser. `window.__earl` exposes
the game state (`g`), `startRun()`, `step(dt)` and the key set for automated checks;
`g.noDeath = 1` disables run endings while testing.
