// What there is to own (2.8.0): every piece of gear in the game, as data. items.js turns it into items
// (stats from the kind's archetype and the rarity, prices, skills) and keeps the player's locker.
// See docs/GEAR_AND_SHOPS_PLAN.md.
//
// Shop rows: [id, kind, archetype, rarity, price, name, line, good, bad, skill?]
//   (a shop item has no skill, or one very basic one: [skill, level])
// Exotics (lost expedition gear, real and storied): [name, archetype, line]
// Legendaries (eerie things from the deep): full objects, each with exactly one legendary skill
// Sets: 4 Rare and 4 Exotic, 5 pieces each; any 3 worn turn on the trait

export const RARITY = {
  common: { name: 'Common', col: '#c9cdc4', p: 1.0, k: 0 },
  uncommon: { name: 'Uncommon', col: '#7ccf7f', p: 1.12, k: 1 },
  rare: { name: 'Rare', col: '#5aa8f0', p: 1.26, k: 2 },
  exotic: { name: 'Exotic', col: '#c27af0', p: 1.42, k: 3 },
  legendary: { name: 'Legendary', col: '#f2b84a', p: 1.6, k: 4 },
};
export const RARITIES = ['common', 'uncommon', 'rare', 'exotic', 'legendary'];

// ---------- skills ----------
// level I to IV (IV only on Legendaries). fits: the kinds that can roll it. min: the lowest rarity it appears on.
export const SKILLS = {
  performance: { name: 'Performance', what: 'a better chance a catch or a tag works', fits: ['net', 'slurp', 'tag', 'cam'] },
  oversized: { name: 'Oversized', what: 'takes bigger fish', fits: ['net', 'slurp'] },
  overreaching: { name: 'Overreaching', what: 'a longer reach', fits: ['net', 'slurp', 'tag', 'cam'] },
  quickdraw: { name: 'Quickdraw', what: 'a faster swing or reload', fits: ['net', 'slurp', 'tag', 'cam'] },
  haste: { name: 'Haste', what: 'he swims faster', fits: ['fins', 'suit'] },
  rebreathing: { name: 'Rebreathing', what: 'his air lasts longer', fits: ['tank', 'suit'] },
  ambush: { name: 'Ambush', what: "fish don't bolt as easily", fits: ['suit', 'fins', 'net'] },
  pockets: { name: 'Deep Pockets', what: 'room for more animals', fits: ['bag', 'suit'] },
  feather: { name: 'Featherweight', what: 'a full bag slows him less', fits: ['bag', 'tank'] },
  warmth: { name: 'Warmth', what: 'the deep cold costs less air', fits: ['suit', 'tank'] },
  hardened: { name: 'Hardened', what: 'bites do less harm', fits: ['suit'] },
  mending: { name: 'Mending', what: 'injuries heal faster', fits: ['suit', 'tank'] },
  shutterbug: { name: 'Shutterbug', what: 'more photographs a dive', fits: ['cam'] },
  scholar: { name: 'Scholar', what: 'tags and photographs pay more', fits: ['tag', 'cam'] },
  prospector: { name: 'Prospector', what: 'pearls and sapphires show from farther off', fits: ['bag', 'cam'] },
  resilience: { name: 'Resilience', what: 'pressure hurts him less', fits: ['suit', 'tank', 'fins'], min: 'exotic' },
  biolum: { name: 'Bioluminescence', what: 'it glows while his light is on', fits: 'any', min: 'exotic', flat: true },
};
export const LEGEND = {
  eye: { name: 'Eye of the Sea', what: 'rare forms glow, and are easy to spot' },
  magnetic: { name: 'Magnetic', what: 'fish come toward him instead of fleeing' },
  faithless: { name: 'Faithless', what: 'fewer creatures come for him, the thing in the deep included' },
  secondwind: { name: 'Second Wind', what: 'once a dive, when his air runs out, it fills again' },
  phantom: { name: 'Phantom', what: 'while he holds still, the thing in the deep cannot find him' },
  kinship: { name: 'Kinship', what: 'animals in his bag are never stressed and never die there' },
};

// ---------- the free kit ----------
export const FREE_ROWS = [
  ['hand', 'net', 'everyday', 'common', 0, 'Hand net', 'The green net he started with. It has seen better days, and so has he.', 'Everyday fish, up to 45 cm', ''],
  ['rubber', 'fins', 'rubber', 'common', 0, 'Rubber fins', 'Standard blades, a little cracked at the straps.', 'Everyday swimming', ''],
  ['al80', 'tank', 'al', 'common', 0, 'Aluminium 80', 'Dented, honest, and not very big.', 'About 20 s of air', ''],
  ['mesh', 'bag', 'mesh', 'common', 0, 'Mesh bag', 'Clipped to his belt. It holds what it holds.', '5 animals', ''],
  ['wet', 'suit', 'wet', 'common', 0, 'Wetsuit', 'Black neoprene, salt-stiff at the seams.', 'Everyday diving', ''],
];

// ---------- Bayside Marine Supply (the Margaret's cabin computer): hand nets, fins and bags ----------
export const BAYSIDE_ROWS = [
  // hand nets (11)
  ['dip', 'net', 'gentle', 'common', 35, 'Aquarium dip net', "Knotless mesh that won't split a fin. Made for aquarium collectors.", 'Fish arrive almost unmarked', 'Anything over 25 cm'],
  ['shrimpnet', 'net', 'gentle', 'common', 45, 'Shrimp scoop', 'A fine, deep bag on a short handle, for things that hide in the weed.', 'Small, soft animals', 'Anything quick'],
  ['bait', 'net', 'school', 'common', 120, 'Bait-ball net', 'A wide, shallow net for schooling fish.', 'Two fish from a school in one sweep', 'Slow to swing, and rough on fish'],
  ['long', 'net', 'reach', 'common', 260, 'Long-handle net', 'A telescopic pole and a deep bag.', 'Reaching a fish before it bolts', 'Quick fish up close: it swings slowly'],
  ['flicknet', 'net', 'quick', 'common', 140, 'Flick net', 'Short, light and stiff. You can swing it before you have thought about it.', 'Quick fish up close', 'Anything out of arm\'s reach'],
  ['sturdy', 'net', 'sure', 'common', 180, 'Collector\'s hoop net', 'A heavy hoop that does not wobble. What goes in, stays in.', 'Fewer misses', ''],
  ['coarse', 'net', 'big', 'uncommon', 900, 'Coarse game net', 'Big mesh on a heavy hoop.', 'Big fish, 30 cm to over a metre', 'Small fish slip through'],
  ['finemesh', 'net', 'gentle', 'uncommon', 320, 'Fine-mesh net', 'Soft, knotless mesh on a light frame. Lighter, quicker, kinder.', 'Fish arrive almost unmarked', 'Anything over 30 cm'],
  ['reefpole', 'net', 'reach', 'uncommon', 640, 'Reef pole net', 'A carbon pole and a narrow bag, for fish that live in the gaps.', 'Reaching into the reef', 'Slow to swing', ['ambush', 1]],
  ['schooner', 'net', 'school', 'uncommon', 780, 'Schooling seine', 'A short seine on a hoop, for a diver alone.', 'Two or three from a school at once', 'Rough on fish'],
  ['prohoop', 'net', 'sure', 'rare', 2400, 'Bayside Pro hoop', 'The best net the shop sells. Ask for it by name.', 'Fewer misses, and gentle with it', '', ['performance', 1]],
  // fins (10)
  ['split', 'fins', 'split', 'common', 70, 'Split fins', 'Blades split down the middle.', 'Easy cruising', 'A weaker sprint'],
  ['longfin', 'fins', 'long', 'common', 250, 'Long-blade fins', 'Long, stiff blades.', 'Faster cruising and sprint', ''],
  ['shortfin', 'fins', 'rubber', 'common', 40, 'Snorkel fins', 'Short and soft. Good for the shallows, and not much else.', 'Turning in tight places', ''],
  ['jet', 'fins', 'jet', 'common', 900, 'Jet fins', 'Heavy vented rubber.', 'A strong sprint, for getting away', 'No faster cruising'],
  ['travelfin', 'fins', 'split', 'uncommon', 330, 'Travel split fins', 'Light enough to pack, stiff enough to use.', 'Easy cruising', 'A weaker sprint'],
  ['freefin', 'fins', 'free', 'uncommon', 620, 'Freediving blades', 'Very long, very thin. They reward a slow, patient kick.', 'Fast cruising on little air', 'A soft sprint'],
  ['powerfin', 'fins', 'long', 'uncommon', 540, 'Power blades', 'Long blades with stiff rails. Every kick counts.', 'Faster cruising and sprint', ''],
  ['tecfin', 'fins', 'jet', 'uncommon', 1400, 'Vented jet fins', 'The jet fin, lighter, with a spring strap.', 'A strong sprint', 'No faster cruising'],
  ['reeffin', 'fins', 'split', 'rare', 2600, 'Reef runner fins', 'Split blades with a quiet edge. The reef does not hear them.', 'Easy, quiet cruising', '', ['ambush', 1]],
  ['bayfin', 'fins', 'long', 'rare', 3200, 'Bayside Pro blades', 'The shop\'s own long blades, in a deep green.', 'Faster everywhere', ''],
  // bags (10)
  ['large', 'bag', 'large', 'common', 60, 'Large catch bag', 'A bigger mesh bag with a spring-loaded mouth.', '7 animals', ''],
  ['divided', 'bag', 'divided', 'common', 400, 'Divided specimen bag', 'A pocket for each.', '7 animals, kept apart', ''],
  ['lightbag', 'bag', 'light', 'common', 90, 'Light mesh bag', 'Thin mesh that the water runs through. You hardly feel it.', 'A full bag hardly slows him', 'Only 6 animals'],
  ['clipbag', 'bag', 'mesh', 'common', 25, 'Clip pouch', 'A pouch that clips to his belt. Cheap, and it holds.', '5 animals', ''],
  ['hauler', 'bag', 'large', 'uncommon', 300, 'Hauler bag', 'A deep bag with a drawstring and a handle.', '8 animals', ''],
  ['cooler', 'bag', 'divided', 'uncommon', 650, 'Live-well bag', 'Padded pockets, each with its own water.', '8 animals, kept apart', ''],
  ['dragbag', 'bag', 'light', 'uncommon', 520, 'Drag-free bag', 'Shaped to slip through the water behind him.', 'A full bag hardly slows him', ''],
  ['reefbag', 'bag', 'large', 'uncommon', 480, 'Reef collector\'s bag', 'A wide mouth for awkward shapes, and a lid that shuts itself.', '8 animals', '', ['pockets', 1]],
  ['prospbag', 'bag', 'mesh', 'rare', 1800, 'Prospector\'s pouch', 'A pouch with a pearl-diver\'s tally sewn into the flap.', 'Pearls and sapphires show from farther off', '', ['prospector', 1]],
  ['baybag', 'bag', 'divided', 'rare', 2900, 'Bayside Pro specimen case', 'The shop\'s own case: nine pockets, padded, with a window.', '9 animals, kept apart', ''],
  // a few of everything else
  ['s100', 'tank', 'steel', 'common', 25, 'Steel 100', 'A heavier steel cylinder.', 'About 28 s of air', ''],
  ['s130', 'tank', 'big', 'common', 90, 'Steel 130', 'A big high-pressure cylinder.', 'About 38 s of air', 'A little slower'],
  ['twin', 'tank', 'twin', 'uncommon', 350, 'Twin set', 'Two cylinders on a manifold.', 'About 56 s of air', 'Slower'],
  ['side', 'tank', 'side', 'uncommon', 1100, 'Sidemount pair', 'Two tanks slung along his sides.', 'About 62 s of air, with no slowing', ''],
  ['skin', 'suit', 'skin', 'common', 160, 'Freediving skin', "Thin as a seal's hide: quick, and hungry for breath.", 'Faster swimming', 'Uses more air'],
  ['dry', 'suit', 'dry', 'uncommon', 1200, 'Drysuit', 'Sealed and dry inside, with a little air in it.', 'Pressure starts deeper; keeps out the cold', ''],
  ['chain', 'suit', 'chain', 'uncommon', 2400, 'Chain-mail shark suit', 'Steel mesh over neoprene, as shark feeders wear.', 'A bite does one less injury', 'Heavy'],
  ['slurp', 'slurp', 'normal', 'common', 75, 'Slurp gun', 'A clear tube and a spring plunger.', 'Small, fast fish up to 20 cm', ''],
  ['sipper', 'slurp', 'sipper', 'common', 300, 'Shrimp sipper', 'A thin barrel and a soft plunger.', 'Tiny animals, unharmed, a quick reload', 'Anything over 8 cm'],
  ['wideslurp', 'slurp', 'wide', 'uncommon', 520, 'Wide-bore slurp gun', 'A fat barrel and a strong spring.', 'Fish up to 30 cm', 'Slow to reload'],
  ['pole', 'tag', 'pole', 'common', 160, 'Pole tagger', 'A dart on a pole, driven by a rubber sling.', "Big animals you can't bring up", 'You have to get close'],
  ['gastag', 'tag', 'gas', 'uncommon', 1300, 'Spring tag gun', 'A sprung barrel that throws a dart five metres.', 'Tagging from further off', ''],
  ['compact', 'cam', 'compact', 'common', 50, 'Waterproof compact', 'A yellow plastic camera with a flash.', 'First photographs of each species', ''],
  ['macro', 'cam', 'macro', 'common', 400, 'Macro camera', 'A close-up lens and a ring light.', 'Animals under 15 cm pay one and a half times', 'Range only 2 m'],
  ['housedlite', 'cam', 'housed', 'uncommon', 1500, 'Housed compact', 'A good compact in a proper housing, with one strobe.', 'More shots, a longer range', ''],
];

// ---------- Dave's Haul (until his shop moves onto the shared engine) ----------
// (3.0.0) the research station's stores, ~280 m on the seamount: kit the scientists use and release to visiting
// divers. Its specialties are cameras, tag guns, slurp guns and suits for the cold; a few of everything else.
// Mostly Uncommon, some Rare, two Exotics (bought Exotics are a shade below the chest ones).
export const STATION_ROWS = [
  // cameras (11)
  ['st_survey', 'cam', 'compact', 'uncommon', 380, 'Survey compact', 'The station issue camera, scuffed at the corners, a lanyard tied through it.', 'Plenty of shots for a survey', ''],
  ['st_fieldmacro', 'cam', 'macro', 'uncommon', 620, 'Field macro', 'A macro lens on a short housing, for things the size of a fingernail.', 'Small animals pay more', 'Range'],
  ['st_quadrat', 'cam', 'compact', 'uncommon', 540, 'Quadrat camera', 'Fixed on a frame for photographing one square metre at a time. Unbolted for you.', 'Steady, many shots', '', ['shutterbug', 1]],
  ['st_strobe', 'cam', 'housed', 'uncommon', 1400, 'Twin-strobe housing', 'Two old strobes on bent arms. They still fire.', 'A long range', 'Heavy'],
  ['st_nightcam', 'cam', 'lowlight', 'uncommon', 2600, 'Night-survey camera', 'A grainy sensor that needs no flash. The pictures look like ghosts, but they count.', 'Nothing sees the picture taken', 'Fewer shots'],
  ['st_specimen', 'cam', 'macro', 'rare', 2200, 'Specimen camera', 'A ring light and a scale bar in the frame. The institute likes these.', 'Small animals pay more', '', ['scholar', 1]],
  ['st_transect', 'cam', 'housed', 'rare', 3600, 'Transect camera', 'Built to photograph a line of seabed a kilometre long.', 'Many shots, a long range', '', ['shutterbug', 1]],
  ['st_cold', 'cam', 'lowlight', 'rare', 6800, 'Cold-light camera', 'A deep-sea sensor salvaged from a lander.', 'No flash, and sharp in the dark', ''],
  ['st_census', 'cam', 'compact', 'rare', 1900, 'Census camera', 'For counting fish. It counts them for you, if you let it.', 'Many shots', '', ['scholar', 1]],
  ['st_drop', 'cam', 'housed', 'uncommon', 900, 'Drop camera', 'Meant to be lowered on a line. Held in a hand, it works just as well.', 'A long range', ''],
  ['st_lander', 'cam', 'lowlight', 'exotic', 14000, 'Lander optic', 'The eye of an autonomous lander that never came back up. They found it on the seamount.', 'No flash, long range, many shots', 'Costly'],
  // tag guns (10)
  ['st_poletag', 'tag', 'pole', 'uncommon', 300, 'Station pole tagger', 'The station spear: a tag on the end of a long stick.', 'Cheap and reliable', 'Short'],
  ['st_dart', 'tag', 'gas', 'uncommon', 1100, 'Dart applicator', 'A gas cartridge pushes the dart. It hisses.', 'Range', ''],
  ['st_acoustic', 'tag', 'sat', 'uncommon', 1500, 'Acoustic tagger', 'Tags that ping a receiver on the station. They pay for the data.', 'Tags pay more', 'Slow'],
  ['st_quiet', 'tag', 'gas', 'uncommon', 1300, 'Quiet tag gun', 'A muffled barrel: the animal hardly notices.', 'Big animals barely startle', '', ['ambush', 1]],
  ['st_longpole', 'tag', 'pole', 'uncommon', 650, 'Long tag pole', 'A three-section carbon pole.', 'Reach', 'Slow to set'],
  ['st_archival', 'tag', 'sat', 'rare', 3400, 'Archival tagger', 'Tags that record depth and temperature for a year.', 'Tags pay much more', '', ['scholar', 1]],
  ['st_rapid', 'tag', 'gas', 'rare', 2900, 'Rapid tagger', 'A drum of six darts. Reloads itself.', 'Quick reloads', '', ['quickdraw', 1]],
  ['st_popup', 'tag', 'sat', 'rare', 4200, 'Pop-up satellite tagger', 'The tag lets go after a season, floats up and calls home.', 'Tags pay much more', ''],
  ['st_marker', 'tag', 'pole', 'uncommon', 450, 'Marker tagger', 'Plain yellow tags. Every fisherman knows them.', 'Cheap', ''],
  ['st_biolog', 'tag', 'sat', 'exotic', 12500, 'Biologging rig', 'Camera tags that ride on the animal and film where it goes.', 'Tags pay the most', 'Costly'],
  // slurp guns (10)
  ['st_sampler', 'slurp', 'normal', 'uncommon', 420, 'Sampling slurp gun', 'The station standard: a clear tube and a plunger.', 'Small fish', ''],
  ['st_pipette', 'slurp', 'sipper', 'uncommon', 520, 'Pipette gun', 'A tiny bore for tiny things.', 'The very small, unharmed', 'Anything bigger'],
  ['st_wide', 'slurp', 'wide', 'uncommon', 760, 'Wide-bore sampler', 'A fat tube for fat little fish.', 'Bigger small fish', 'Slow'],
  ['st_reach', 'slurp', 'long', 'uncommon', 880, 'Long sampler', 'An extension on the nozzle, for crevices.', 'Reaching into gaps', ''],
  ['st_suction', 'slurp', 'normal', 'rare', 1800, 'Suction sampler', 'A pump in place of a plunger. It does not tire.', 'Quick and sure', '', ['quickdraw', 1]],
  ['st_gentle', 'slurp', 'sipper', 'rare', 1600, 'Larval sampler', 'For plankton and larvae. It would not hurt a soap bubble.', 'The very small, unharmed', '', ['performance', 1]],
  ['st_bulk', 'slurp', 'wide', 'rare', 2400, 'Bulk sampler', 'Two chambers, so it takes two before you empty it.', 'Bigger small fish', ''],
  ['st_crevice', 'slurp', 'long', 'rare', 2100, 'Crevice sampler', 'A thin steel nozzle, a long reach.', 'Reaching into gaps', '', ['overreaching', 1]],
  ['st_trap', 'slurp', 'normal', 'uncommon', 600, 'Trap-door sampler', 'A flap shuts behind what goes in.', 'Small fish stay in', ''],
  ['st_benthic', 'slurp', 'wide', 'uncommon', 980, 'Benthic sampler', 'For things that sit on the bottom and do not want to come.', 'Bigger small fish', ''],
  // suits for the cold (10)
  ['st_shell', 'suit', 'dry', 'uncommon', 1300, 'Shell drysuit', 'A thin shell suit with a fleece under it. Station issue.', 'Keeps the cold out', ''],
  ['st_neodry', 'suit', 'dry', 'uncommon', 1700, 'Neoprene drysuit', 'Thick, crushed neoprene. Warm even when torn.', 'Keeps the cold out', 'A little slower'],
  ['st_thermal', 'suit', 'dry', 'uncommon', 2100, 'Thermal drysuit', 'An undersuit you could sleep in.', 'Cold costs less air', '', ['warmth', 1]],
  ['st_ice', 'suit', 'dry', 'rare', 3900, 'Ice-diving suit', 'Made for under the ice, where a cold minute is a long one.', 'Cold costs much less air', '', ['warmth', 1]],
  ['st_vulc', 'suit', 'dry', 'rare', 4600, 'Vulcanised drysuit', 'A rubber suit that shrugs off the deep.', 'Cold and pressure, deeper', ''],
  ['st_warmskin', 'suit', 'skin', 'uncommon', 900, 'Warm skin', 'A lined freediving skin. Quick, and not quite as hungry.', 'Speed', 'Air'],
  ['st_hotwater', 'suit', 'dry', 'rare', 5400, 'Hot-water suit', 'A hose would pump warm water through it. Without the hose, it is still a good suit.', 'Cold costs much less air', '', ['mending', 1]],
  ['st_survival', 'suit', 'dry', 'uncommon', 1500, 'Survival suit', 'Bright orange. Never lost.', 'Keeps the cold out', ''],
  ['st_chainwarm', 'suit', 'chain', 'rare', 4200, 'Lined chain suit', 'Chain-mail over a drysuit, for the station\'s shark work.', 'Bites and cold', 'Heavy'],
  ['st_bathy', 'suit', 'dry', 'exotic', 16000, 'Bathythermal suit', 'A prototype that kept a diver warm at four degrees for six hours. The only one they made.', 'Cold and pressure, much deeper', 'Costly', ['warmth', 2]],
  // a few of everything else
  ['st_samplenet', 'net', 'gentle', 'uncommon', 460, 'Sample net', 'A fine bag on a short frame, numbered on the handle.', 'Fish arrive unmarked', 'Small'],
  ['st_trawlhoop', 'net', 'sure', 'uncommon', 820, 'Hoop sampler', 'A rigid hoop that does not flinch.', 'Fewer misses', ''],
  ['st_polenet', 'net', 'reach', 'rare', 2300, 'Survey pole net', 'A long, light pole for the station\'s transects.', 'Reach', 'Slow'],
  ['st_flipper', 'fins', 'split', 'uncommon', 520, 'Station fins', 'Split blades, the station\'s spare pairs.', 'Easy cruising', ''],
  ['st_longfin', 'fins', 'long', 'uncommon', 900, 'Long survey fins', 'For long transects.', 'Fast cruising', ''],
  ['st_jetfin', 'fins', 'jet', 'rare', 2200, 'Vented power fins', 'Stiff and vented: a fast kick.', 'Sprint', ''],
  ['st_steel', 'tank', 'steel', 'uncommon', 600, 'Station steel cylinder', 'Stamped with the station\'s number.', 'More air', ''],
  ['st_bigsteel', 'tank', 'big', 'uncommon', 1300, 'Long steel cylinder', 'Long and heavy.', 'Much more air', 'A little slower'],
  ['st_side', 'tank', 'side', 'rare', 3200, 'Sidemount rig', 'Two cylinders along the body, for tight spaces.', 'A lot of air', ''],
  ['st_samplebag', 'bag', 'divided', 'uncommon', 520, 'Sample bag', 'Numbered pockets, one animal in each.', 'Room, and they keep apart', ''],
  ['st_cooler', 'bag', 'large', 'uncommon', 780, 'Insulated bag', 'Keeps what is inside cool and calm.', 'Room', ''],
  ['st_mesh', 'bag', 'light', 'rare', 1900, 'Light mesh bag', 'Light, and it rides close.', 'Room, and it hardly slows him', ''],
];

export const DAVE_ROWS = [
  ['pronet', 'net', 'sure', 'rare', 3500, 'Pro capture net', 'A D-frame with a padded rim and a clear rubber bag.', 'Fish up to a metre, quick and gentle', ''],
  ['deepnet', 'net', 'big', 'rare', 4200, 'Deep-water game net', 'Heavy hoop, heavy mesh, a weighted rim that falls fast.', 'Big fish', 'Small fish slip through'],
  ['proslurp', 'slurp', 'long', 'rare', 1400, 'Pro slurp gun', 'A longer barrel, a stronger spring, a pistol grip.', 'Fish up to 20 cm, from further off', ''],
  ['pneumatic', 'tag', 'gas', 'rare', 2500, 'Pneumatic tag gun', 'Air-powered, accurate to six metres.', 'Big animals barely notice', ''],
  ['housed', 'cam', 'housed', 'rare', 2500, 'Housed camera', 'A real camera in an aluminium housing, two strobes on arms.', 'Many shots, a long range', ''],
  ['lowlight', 'cam', 'lowlight', 'rare', 12000, 'Low-light camera', 'A huge sensor that needs no flash.', 'Nothing in the dark sees you take the picture', ''],
  ['carbon', 'fins', 'long', 'rare', 3000, 'Carbon fins', 'Carbon fibre blades.', 'Fast everywhere', ''],
  ['ccr', 'tank', 'rebreather', 'rare', 2500, 'Closed-circuit rebreather', 'Recycles every breath.', 'About 80 s of air, and no bubbles', ''],
  ['deeptwin', 'tank', 'twin', 'rare', 3800, 'Deep twin set', 'Two big steel cylinders, painted to say whose they are.', 'A lot of air', 'Slower'],
  ['expedition', 'bag', 'large', 'rare', 1800, "Dave's expedition bag", "Dave's own design, patched twice.", 'Room for plenty', ''],
  ['rebreather', 'suit', 'rebreather', 'rare', 19000, 'Rebreather suit', 'A closed-circuit rig built into the suit.', 'Less air used, and no bubbles', ''],
  ['heated', 'suit', 'dry', 'rare', 6000, 'Heated drysuit', 'A drysuit with a battery and a warm vest under it.', 'Cold and pressure, deeper', '', ['warmth', 1]],
  // (3.0.0) the rest of Dave's stock: his specialties (air, suits for depth, big-game nets) to 10+ each, and a
  // few more of the rest. Mostly Rare; some Uncommon; a few Exotics. His own words on most of them.
  // air
  ['dv_steel', 'tank', 'steel', 'uncommon', 700, 'Steel 100, refilled', 'Hydro-tested last year. Probably.', 'More air', ''],
  ['dv_big', 'tank', 'big', 'uncommon', 1500, 'Steel 130', 'Long, heavy and full.', 'Much more air', 'A little slower'],
  ['dv_side', 'tank', 'side', 'rare', 3600, 'Sidemount pair', 'Two slung under the arms. Narrow profile for the caves.', 'A lot of air', ''],
  ['dv_bigsteel', 'tank', 'big', 'rare', 2600, 'Deep steel 130', 'Painted black so nobody borrows it.', 'Much more air', 'A little slower', ['rebreathing', 1]],
  ['dv_twin2', 'tank', 'twin', 'rare', 4600, 'Manifolded twins', 'Two cylinders, one isolator valve. If one fails, you still have half.', 'A lot of air', 'Slower', ['mending', 1]],
  ['dv_scr', 'tank', 'rebreather', 'rare', 5200, 'Semi-closed rebreather', 'Lets a little go, keeps most of it.', 'Air for ages, no bubbles', ''],
  ['dv_heliox', 'tank', 'twin', 'rare', 6400, 'Heliox twin set', "Mixed for the deep. Don't talk on it, you'll sound like a duck.", 'A lot of air, deep', 'Slower', ['warmth', 1]],
  ['dv_bailout', 'tank', 'side', 'uncommon', 1900, 'Bailout pair', 'Two small ones for when the big one goes quiet.', 'More air', ''],
  ['dv_ccr2', 'tank', 'rebreather', 'exotic', 21000, 'Navy prototype rebreather', 'Came down off a ship that was never there. Serial number filed off.', 'Air for a very long time, no bubbles', 'Costly'],
  // suits for depth
  ['dv_hard1', 'suit', 'hard', 'rare', 42000, 'Second-hand hardsuit', "Atmospheric hardsuit. Some dents. They're character.", 'Pressure hardly reaches him', 'Slow'],
  ['dv_deepdry', 'suit', 'dry', 'uncommon', 2400, 'Deep drysuit', 'A thick trilaminate suit for the cold under the light.', 'Cold and pressure', ''],
  ['dv_armour', 'suit', 'chain', 'rare', 5400, 'Shark armour', 'Chain-mail and plates. You will hear yourself coming.', 'Bites do little', 'Heavy'],
  ['dv_crushdry', 'suit', 'dry', 'rare', 7800, 'Crush drysuit', 'Compressed neoprene: it does not get thinner as you go down.', 'Pressure, deeper', '', ['resilience', 1]],
  ['dv_quietsuit', 'suit', 'rebreather', 'rare', 21000, 'Rebreather drysuit', 'The rebreather and a drysuit, all one. Warm and silent.', 'Less air, no bubbles, warm', ''],
  ['dv_skin', 'suit', 'skin', 'uncommon', 800, 'Freediver skin', "Thin as anything. Don't go deep in it.", 'Speed', 'Air'],
  ['dv_hot', 'suit', 'dry', 'rare', 9200, 'Heated deep suit', 'Wires in the lining and a battery on the hip.', 'Cold costs little, pressure deeper', '', ['warmth', 2]],
  ['dv_iron', 'suit', 'hard', 'exotic', 88000, 'Iron Lung hardsuit', 'An old atmospheric suit from an oil company. It has been deeper than anything I own.', 'Pressure barely matters', 'Slow, and costly'],
  // big-game nets
  ['dv_bignet', 'net', 'big', 'uncommon', 1600, 'Big-game net', 'A wide hoop and big mesh.', 'Big fish', 'Small ones slip through'],
  ['dv_dframe', 'net', 'big', 'rare', 5600, 'Heavy D-frame', 'Steel frame, net like rope.', 'Big fish, surely', 'Small ones slip through', ['performance', 1]],
  ['dv_longbig', 'net', 'big', 'rare', 6200, 'Long big-game net', 'A long pole on the big hoop.', 'Big fish from further off', 'Slow', ['overreaching', 1]],
  ['dv_gentlebig', 'net', 'big', 'rare', 5900, 'Soft big net', 'Knotless mesh, big enough for a shark pup.', 'Big fish arrive unmarked', ''],
  ['dv_quickbig', 'net', 'big', 'rare', 6800, 'Light big-game net', 'Aluminium hoop: big, but it swings.', 'Big fish, and quicker', '', ['quickdraw', 1]],
  ['dv_sure', 'net', 'sure', 'rare', 3900, "Dave's own hoop", "I made this. Don't tell anyone it's an old bicycle wheel.", 'Fewer misses', ''],
  ['dv_reach', 'net', 'reach', 'uncommon', 1300, 'Deep pole net', 'A long pole, weighted so it does not float up.', 'Reach', 'Slow'],
  ['dv_monster', 'net', 'big', 'exotic', 24000, 'Trawl-wing net', 'Cut from the wing of a deep trawl and put on a hoop. Holds anything.', 'The biggest fish', 'Costly, slow'],
  // a few more of the rest
  ['dv_slurp2', 'slurp', 'wide', 'rare', 1900, 'Deep slurp gun', 'A wide barrel and a strong spring.', 'Bigger small fish', ''],
  ['dv_slurp3', 'slurp', 'sipper', 'uncommon', 700, 'Little sipper', 'For the tiny things that live in the sponges.', 'The very small', ''],
  ['dv_tag2', 'tag', 'sat', 'rare', 3800, 'Satellite tagger', 'Off a research boat that went bust.', 'Tags pay more', ''],
  ['dv_tag3', 'tag', 'pole', 'uncommon', 600, 'Old pole tagger', 'Works. Mostly.', 'Cheap', ''],
  ['dv_cam2', 'cam', 'housed', 'uncommon', 1800, 'Second-hand housing', 'A real camera in a housing with one cracked strobe.', 'Range', ''],
  ['dv_fins2', 'fins', 'jet', 'rare', 2400, 'Deep jet fins', 'Heavy rubber, a big kick.', 'Sprint', ''],
  ['dv_fins3', 'fins', 'split', 'uncommon', 700, 'Spare fins', 'From the box by the hatch.', 'Easy cruising', ''],
  ['dv_bag2', 'bag', 'divided', 'rare', 2100, 'Sorting bag', 'Pockets, so the eels and the crabs keep apart.', 'Room, and they keep apart', ''],
  ['dv_bag3', 'bag', 'light', 'uncommon', 900, 'Light bag', 'Mesh and webbing.', 'It hardly slows him', ''],
];

// ---------- chest-only Exotics: lost expedition gear ----------
export const EXOTICS = {
  net: [
    ['Challenger dredge bag', 'big', 'From the corvette that sounded the whole ocean in 1872. The mesh is hemp, and still sound.'],
    ['Bathysphere sampling net, 1934', 'reach', 'Lowered on a line beside the steel ball, half a mile down. It came back up with a fish nobody has seen since.'],
    ['Trieste collecting scoop, 1960', 'sure', 'Made for the deepest dive there has ever been. It was never used: there was nothing to scoop at the bottom but silt.'],
    ['Sealab hand seine', 'school', "A navy aquanaut's seine, from the houses they built on the sea floor."],
    ['Albatross plankton net', 'gentle', 'Silk gauze, from a Swedish ship that went round the world for its mud.'],
    ['Galathea trawl purse', 'big', 'From the Danish ship that proved life lives at the bottom of the trenches.'],
    ['Meteor survey hoop net', 'everyday', 'A plain net from the German ship that mapped the Atlantic floor with sound.'],
    ['Discovery ring net', 'reach', 'From the old whaling surveys in the far south. Brass ring, long handle, and a name scratched off.'],
    ['Valdivia deep-sea net, 1898', 'sure', 'From the first ship to bring up a vampire squid. The bag is stained black.'],
    ['Siboga reef scoop', 'gentle', "A collector's scoop from the Dutch East Indies survey. The handle is teak."],
    ['Vitiaz bottom net', 'big', 'From the Soviet ship that fished the Mariana Trench. Heavy as a door.'],
    ['Hirondelle fishing net', 'quick', 'From a prince\'s yacht that went fishing for science in the 1880s. Light, and very good.'],
    ['Carnegie survey net', 'everyday', 'From the ship that burned in Samoa in 1929. This was in the boat when it went ashore.'],
    ['Dana eel net', 'school', 'The Danish expedition used nets like this to find where eels are born.'],
    ['Atlantis line net', 'quick', 'From the first ship of the Woods Hole institute. Quick, light and well kept.'],
  ],
  fins: [
    ['Frogman fins, 1944', 'jet', 'Navy issue, from the men who swam into harbours at night. Heavy, black, and fast.'],
    ['Ligurian prototype blades, 1938', 'long', 'Among the first fins ever made to sell. The rubber is going, but the shape is right.'],
    ['Sealab aquanaut fins', 'free', 'Worn on the sea floor for weeks at a time, by people who lived down there.'],
    ['Conshelf habitat fins', 'split', 'From the undersea village of 1962. Someone painted a starfish on the strap.'],
    ['Tektite habitat fins', 'long', 'From the 1969 habitat in the Virgin Islands. One pair belonged to a scientist who stayed fifty-nine days.'],
    ['Spearfisher\'s blades, 1933', 'rubber', 'Hand-cut rubber, from the first summers of goggles and spearguns on the Riviera.'],
    ['Arctic survey fins', 'long', 'Made to work in water just above freezing. The straps are fur-lined.'],
    ['Trieste crew fins', 'split', 'The bathyscaphe\'s swimmers wore these to check her over before each dive.'],
    ['Clearance diver fins', 'jet', 'Navy fins from mine clearance work. They never let anyone down.'],
    ['Bikini Atoll survey fins, 1946', 'free', 'From the survey divers sent in before and after the tests. They are not radioactive. Probably.'],
    ['Hydrolab fins', 'split', 'From the habitat that stayed down off the Bahamas for years.'],
    ['Pearl lugger paddles', 'long', 'From a pearling crew in the Torres Strait, cut from a lugger\'s old sail-rubber.'],
    ['Kalymnos sponge diver\'s blades', 'free', 'From the island of sponge divers, where diving was a trade for three thousand years.'],
    ['Galathea deck fins', 'rubber', 'They hung on a hook on the Danish expedition\'s deck for two years and went round the world.'],
    ['La Jolla survey fins', 'jet', 'From the canyon surveys off California. Bright yellow once.'],
  ],
  tank: [
    ['Navy reserve cylinder', 'big', 'A heavy navy cylinder with its reserve valve still wired shut.'],
    ['Sealab II mixed-gas pack', 'rebreather', 'Breathing gas for people who lived at sixty metres for a month.'],
    ['Bathysphere oxygen flask, 1934', 'twin', 'Two of the flasks that kept two men breathing inside a steel ball.'],
    ['Aqualung prototype, 1943', 'steel', 'One of the first regulators that gave air when you breathed in. It changed everything.'],
    ['Conshelf twin set', 'twin', 'The twin set from the 1962 undersea village. Still holds pressure.'],
    ['Tektite rebreather', 'rebreather', 'A closed-circuit rig from the 1969 habitat. It purrs.'],
    ['Naval oxygen rebreather, 1940', 'rebreather', 'A wartime oxygen set: no bubbles at all, so nobody on the surface knew you were there.'],
    ['Hydrolab bottle', 'side', 'A long slim bottle from the Bahamas habitat, worn along the side.'],
    ['Frogman\'s chest pack', 'big', 'Worn on the chest, not the back. Strange, but it works.'],
    ['Trieste reserve sphere', 'twin', 'A spare gas sphere from the bathyscaphe, fitted with straps by somebody brave.'],
    ['Deep Quest gas bank', 'side', 'From a research submersible\'s emergency supply.'],
    ['Argonaut diving bell tank', 'big', 'From a diving bell that worked the North Sea for twenty years.'],
    ['Lake Zurich mixed-gas rig, 1962', 'rebreather', 'From the record dives of 1962, when a Swiss mathematician worked out how to breathe deeper.'],
    ['Salvage diver\'s bailout', 'steel', 'The bottle a hard-hat salvage diver carried in case the hose was cut.'],
    ['Polar survey cylinders', 'twin', 'Painted orange, to be found on the ice.'],
  ],
  bag: [
    ['Challenger specimen satchel', 'divided', 'Waxed canvas with brass rings, from the 1872 voyage that found four thousand new species.'],
    ['Galathea sample jar case', 'divided', 'A padded case of glass jars, from the trench expedition of 1951.'],
    ['Dana larva pouch', 'light', 'From the search for where eels are born. Light as a leaf.'],
    ['Pearl lugger\'s net bag', 'large', 'A deep string bag from the pearling grounds. It has held a fortune.'],
    ['Kalymnos sponge sack', 'large', 'A sponge diver\'s sack, older than the man who sold it.'],
    ['Siboga reef basket', 'divided', 'A woven basket with compartments, from the Dutch survey of 1899.'],
    ['Sealab collection bag', 'large', 'Navy issue, from the houses on the sea floor.'],
    ['Bathysphere sample box', 'divided', 'Steel, with a glass lid. It hung outside the bathysphere on the deepest dives.'],
    ['Albatross core pouch', 'light', 'Made to carry mud cores. Holds fish just as well.'],
    ['Valdivia specimen crate', 'large', 'From the 1898 deep-sea expedition. The label still says "do not open in daylight".'],
    ['Trieste tool roll', 'light', 'A canvas roll for the bathyscaphe\'s tools. It rolls up very small.'],
    ['Meteor survey haversack', 'large', 'From the German ship that sounded the Atlantic.'],
    ['Conshelf garden bag', 'divided', 'The aquanauts kept a garden at their undersea village. This is what they collected in.'],
    ['Hirondelle fishing creel', 'light', 'A wicker creel from a prince\'s research yacht.'],
    ['Vitiaz bottom pouch', 'large', 'From the ship that fished the deepest trench in the world.'],
  ],
  suit: [
    ['Bathysphere observer\'s woollens, 1934', 'dry', 'Thick wool, worn inside a cold steel ball half a mile down. Still smells of the sea.'],
    ['Standard diving dress', 'hard', 'Canvas, copper and brass: the old helmet suit, and every bit as heavy as it looks.'],
    ['Sealab heated suit', 'dry', 'Hot water was pumped through it from the habitat. It has a tap.'],
    ['Conshelf aquanaut suit', 'skin', 'Worn by people who lived under the sea for a month in 1963.'],
    ['Tektite habitat suit', 'wet', 'From the 1969 habitat. The first suit made for women aquanauts.'],
    ['Frogman\'s drysuit, 1944', 'dry', 'Rubberised cloth, from the night swimmers of the war.'],
    ['Clearance diver\'s suit', 'chain', 'Navy mine clearance: tough cloth and a mesh lining.'],
    ['Shark researcher\'s mesh', 'chain', 'Stainless mesh from the first people to study sharks up close. It has been bitten many times.'],
    ['Polar survey drysuit', 'dry', 'For diving under the ice. The seals are thicker than the seams.'],
    ['Trieste crew coveralls', 'rebreather', 'Worn inside the bathyscaphe for the deepest dive ever made.'],
    ['Pearl lugger\'s canvas suit', 'hard', 'A pearl diver\'s helmet suit, from the north of Australia.'],
    ['Kalymnos skafandro', 'hard', 'The heavy suit that the sponge divers of Kalymnos wore for a hundred years.'],
    ['Hydrolab saturation suit', 'rebreather', 'Made to be lived in for weeks.'],
    ['Deep Quest pilot\'s suit', 'dry', 'A submersible pilot\'s suit, from the days when they still swam out to check the hull.'],
    ['Galathea expedition wetsuit', 'wet', 'Worn on the round-the-world trench expedition of the fifties.'],
  ],
  slurp: [
    ['Siboga coral slurp', 'normal', 'A glass tube and a brass plunger, from the Dutch survey of 1899.'],
    ['Dana larva sipper', 'sipper', 'Made to catch eel larvae no longer than a fingernail.'],
    ['Conshelf collector', 'wide', 'The undersea village\'s own collecting gun.'],
    ['Sealab specimen pump', 'long', 'A hand pump that the aquanauts used on their gardens.'],
    ['Albatross pipette', 'sipper', 'A giant pipette, for the smallest things in the sea.'],
  ],
  tag: [
    ['Discovery whale mark gun', 'pole', 'The old whale-marking guns of the southern surveys, which fired a numbered dart.'],
    ['Satellite tag prototype, 1978', 'sat', 'One of the first tags that spoke to a satellite. It took two men to carry the receiver.'],
    ['Tuna tagging pole, 1952', 'pole', 'From the first tuna tagging cruises. The pole is bamboo.'],
    ['Navy acoustic tagger', 'gas', 'A tag that pings. The navy wanted to know where things went.'],
    ['Shark survey lance, 1960', 'gas', 'A gas-driven lance from the first shark surveys. It never jams.'],
  ],
  cam: [
    ['Bathysphere window camera, 1934', 'housed', 'Pressed to a quartz window half a mile down. The pictures were mostly black.'],
    ['Trieste porthole camera, 1960', 'lowlight', 'From the deepest dive ever made. It took one photograph of the bottom.'],
    ['Sealab strobe rig', 'housed', 'A camera and two flashes on long arms, from the habitat years.'],
    ['Galathea plate camera', 'macro', 'Glass plates and a brass shutter, for photographing jars of things from the trenches.'],
    ['Abyssal strobe camera, 1954', 'lowlight', 'One of the first cameras lowered into the deep on a cable. It found the bottom alive.'],
  ],
};

// ---------- chest-only Legendaries: eerie things from the deep ----------
// (2.8.0) Only a Legendary **net** has a legendary skill (legend), one each: the net is the heart of the kit.
// The other Legendaries are the strongest of their kind, roll one skill more than an Exotic, can reach
// level IV, and glow (Bioluminescence) like every Legendary.
export const LEGENDARIES = [
  // the six Legendary nets, one for each legendary skill
  { id: 'gulper', kind: 'net', arch: 'big', name: "Gulper's Throat", legend: 'magnetic', glow: '#7ae8ff',
    line: 'The stretched jaw-skin of a gulper eel, sewn onto a ring of its own bone. Fish swim toward it as if they had been asked.' },
  { id: 'choirveil', kind: 'net', arch: 'gentle', name: "The Drowned Choir's Veil", legend: 'kinship', glow: '#b8a0ff',
    line: 'A veil of siphonophore, still faintly alive. What it catches stops struggling, and stays calm in the bag for as long as he likes.' },
  { id: 'lanternmesh', kind: 'net', arch: 'sure', name: 'Lanternmesh', legend: 'eye', glow: '#f6e08a',
    line: 'Woven from the lure-threads of a hundred anglerfish. In the dark it shows him which fish are not like the others.' },
  { id: 'hagnet', kind: 'net', arch: 'reach', name: "The Hagfish's Knot", legend: 'secondwind', glow: '#d8c8a0',
    line: 'A long net of hagfish slime, dried hard on a whalebone pole. The slime remembers air, and once a dive it gives it back.' },
  { id: 'stillwater', kind: 'net', arch: 'quick', name: 'Stillwater Seine', legend: 'phantom', glow: '#7a9aff',
    line: 'Black mesh that drinks the light. Holding it, and holding still, he is simply not there.' },
  { id: 'oldnet', kind: 'net', arch: 'school', name: "The Old One's Tithe", legend: 'faithless', glow: '#ffcf7a',
    line: 'Left in the cave in the west wall, as if for someone. What hunts in the deep smells her on it, and keeps away.' },
  // the rest: the best of their kind, with no legendary skill
  { id: 'oarcrest', kind: 'fins', arch: 'long', name: 'Oarfish Crest', glow: '#ff7a6a',
    line: 'Fins cut from the red crest of an oarfish eleven metres long. They ripple, and push like nothing made by hand.' },
  { id: 'pinions', kind: 'fins', arch: 'jet', name: "Leviathan's Pinions", glow: '#8ad8c0',
    line: 'Flipper-bones of something that was never named, joined with silver wire. One kick, and he is gone.' },
  { id: 'glasswing', kind: 'fins', arch: 'free', name: 'Glasswing Fins', glow: '#a8f0ff',
    line: 'Clear as glass, cut from the fins of a deep squid. He can hardly see them on his own feet.' },
  { id: 'blacklung', kind: 'tank', arch: 'rebreather', name: 'The Black Lung', glow: '#6ad890',
    line: 'Not a tank. A swim bladder, grown to the size of a man\'s back, that breathes on its own and never makes a bubble.' },
  { id: 'whalefall', kind: 'tank', arch: 'twin', name: 'Whalefall Breath', glow: '#ffd48a',
    line: 'Air from the last breath of a whale that sank, held in two cylinders of its own bone. There is a great deal of it.' },
  { id: 'ventheart', kind: 'tank', arch: 'side', name: 'Vent Heart', glow: '#ff9a50',
    line: 'Warm to the touch, as if it came from a black smoker. The cold of the deep cannot get at him.' },
  { id: 'broodpouch', kind: 'bag', arch: 'divided', name: 'Brood Pouch', glow: '#ffb0d0',
    line: 'A pouch like a seahorse father\'s, the size of a sack. There is always room for one more.' },
  { id: 'stomach', kind: 'bag', arch: 'large', name: 'The Stomach', glow: '#e8a070',
    line: 'Better not to ask what it came out of. It holds more than it should.' },
  { id: 'eelpurse', kind: 'bag', arch: 'light', name: 'Eel-skin Purse', glow: '#9ae0a0',
    line: 'Supple, dark and very old. Full, it weighs nothing at all.' },
  { id: 'oldskin', kind: 'suit', arch: 'hard', name: 'Skin of the Old One', glow: '#ffcf7a',
    line: 'Shed in the cave in the west wall. The pressure of the deep slides off it like water.' },
  { id: 'abyssalhide', kind: 'suit', arch: 'rebreather', name: 'Abyssal Hide', glow: '#7a9aff',
    line: 'Black as the bottom of the trench, and soft as velvet. It breathes with him.' },
  { id: 'hagmantle', kind: 'suit', arch: 'skin', name: 'Hagfish Mantle', glow: '#d8c8a0',
    line: 'Slick, and it never quite dries. The water barely touches him.' },
  { id: 'lamprey', kind: 'slurp', arch: 'wide', name: 'The Sucking Mouth', glow: '#c0a0ff',
    line: 'A lamprey\'s mouth on a barrel of bone. It pulls hard, from far off.' },
  { id: 'narwhal', kind: 'tag', arch: 'sat', name: 'Narwhal Lance', glow: '#e8f4ff',
    line: 'A spiralled tusk with a tag set in its tip. It flies true, a long way.' },
  { id: 'barreleye', kind: 'cam', arch: 'lowlight', name: 'Barreleye Lens', glow: '#80ffb0',
    line: 'A lens like the barreleye\'s clear head, with its green eyes looking up through it. It sees in the dark.' },
  { id: 'flashlightfish', kind: 'cam', arch: 'housed', name: 'Flashlight Fish Strobe', glow: '#a0e0ff',
    line: 'Two living light-organs instead of strobes. Whatever it photographs never seems to mind.' },
];

// ---------- sets: any 3 pieces worn turn on the trait ----------
export const SETS = {
  harbour: { name: 'Harbour Patrol', rarity: 'rare', trait: 'Sprinting uses no more air than swimming.', archs: { suit: 'wet', fins: 'jet', tank: 'steel', bag: 'large', net: 'quick' },
    line: 'Harbour police diving gear, painted blue and white.' },
  kelp: { name: 'Kelp Runner', rarity: 'rare', trait: 'In kelp and seagrass, fish do not notice him at all.', archs: { suit: 'skin', fins: 'split', tank: 'al', bag: 'light', net: 'reach' },
    line: 'Mottled green and brown, made by divers who work the kelp forests.' },
  reef: { name: 'Reef Keeper', rarity: 'rare', trait: 'Animals he catches are never harmed.', archs: { suit: 'wet', fins: 'free', tank: 'steel', bag: 'divided', net: 'gentle' },
    line: 'Soft gear in coral colours, from a reef conservation team.' },
  night: { name: 'Night Shift', rarity: 'rare', trait: 'His lamp reaches half as far again.', archs: { suit: 'dry', fins: 'long', tank: 'big', bag: 'large', net: 'sure' },
    line: 'Black gear with reflective tape, made for diving after dark.' },
  bathysphere: { name: 'Bathysphere 1934', rarity: 'exotic', trait: 'Pressure starts to hurt him 400 m deeper.', archs: { suit: 'hard', fins: 'long', tank: 'twin', bag: 'divided', net: 'reach' },
    line: 'Gear from the year two men went half a mile down in a steel ball.' },
  challenger: { name: 'Challenger Expedition', rarity: 'exotic', trait: 'Animals from below 500 m sell for 40 % more.', archs: { suit: 'dry', fins: 'free', tank: 'big', bag: 'divided', net: 'big' },
    line: 'From the voyage of 1872 that found the deep alive.' },
  sealab: { name: 'Sealab Aquanaut', rarity: 'exotic', trait: 'His air lasts half as long again.', archs: { suit: 'rebreather', fins: 'split', tank: 'rebreather', bag: 'large', net: 'school' },
    line: 'From the navy houses on the sea floor, where people lived for weeks.' },
  trieste: { name: 'Trieste Descent', rarity: 'exotic', trait: 'The thing in the deep notices him half as fast.', archs: { suit: 'dry', fins: 'long', tank: 'side', bag: 'light', net: 'sure' },
    line: 'From the bathyscaphe that went to the deepest place in the sea.' },
};
export const SET_PIECE = { suit: 'suit', fins: 'fins', tank: 'cylinder', bag: 'catch bag', net: 'net' };

// ---------- the names for chest Commons, Uncommons and Rares ----------
export const MAKERS = ['Northwake', 'Kestrel', 'Harbourline', 'Seabright', 'Tidewater', 'Fathom & Sons', 'Coldwater', 'Saltmarsh', 'Breakwater', 'Lantern Bay', 'Greywhale', 'Skerry'];
export const MODELS = { common: ['Standard', 'Club', 'Basic', 'Trainer', 'Utility'], uncommon: ['Sport', 'Field', 'Reef', 'Coastal', 'Plus'], rare: ['Wayfarer', 'Sentinel', 'Corsair', 'Halyard', 'Mariner', 'Voyager', 'Bosun', 'Lodestar', 'Meridian', 'Sounding', 'Spindrift', 'Tern', 'Gannet', 'Petrel', 'Shearwater'] };
export const NOUN = {
  net: { everyday: 'hoop net', gentle: 'dip net', reach: 'pole net', quick: 'flick net', big: 'game net', school: 'seine', sure: 'collector\'s net' },
  fins: { rubber: 'rubber fins', split: 'split fins', long: 'blades', jet: 'jet fins', free: 'freediving fins' },
  tank: { al: 'cylinder', steel: 'steel cylinder', big: 'big cylinder', twin: 'twin set', side: 'sidemount pair', rebreather: 'rebreather' },
  bag: { mesh: 'pouch', large: 'catch bag', divided: 'specimen bag', light: 'light bag' },
  suit: { wet: 'wetsuit', skin: 'skin', dry: 'drysuit', chain: 'mesh suit', rebreather: 'rebreather suit', hard: 'hardsuit' },
  slurp: { normal: 'slurp gun', sipper: 'sipper', wide: 'wide-bore slurp gun', long: 'long slurp gun' },
  tag: { pole: 'pole tagger', gas: 'tag gun', sat: 'satellite tagger' },
  cam: { compact: 'compact', macro: 'macro camera', housed: 'housed camera', lowlight: 'low-light camera' },
};
export const ARCH_LINE = {
  net: { everyday: 'A good all-round net.', gentle: 'Soft mesh that leaves no marks.', reach: 'A long handle for fish that keep their distance.', quick: 'Short and light, quick to swing.', big: 'Big mesh for big fish.', school: 'Wide and shallow, for schools.', sure: 'A steady hoop that rarely misses.' },
  fins: { rubber: 'Plain, soft blades.', split: 'Split blades for easy cruising.', long: 'Long, stiff blades.', jet: 'Heavy, vented, made to sprint.', free: 'Very long, for a slow, patient kick.' },
  tank: { al: 'A small aluminium cylinder.', steel: 'A steel cylinder.', big: 'A big cylinder, heavy on the back.', twin: 'Two cylinders on a manifold.', side: 'Two slim tanks along his sides.', rebreather: 'Breathes his air twice, and makes no bubbles.' },
  bag: { mesh: 'A simple pouch.', large: 'A big bag with a spring mouth.', divided: 'A pocket for each animal.', light: 'Thin, light mesh that hardly drags.' },
  suit: { wet: 'Neoprene, the everyday suit.', skin: 'Thin and quick, hungry for breath.', dry: 'Sealed and warm.', chain: 'Steel mesh against bites.', rebreather: 'A closed-circuit suit: less air, no bubbles.', hard: 'A heavy suit that keeps the pressure off.' },
  slurp: { normal: 'A clear tube and a plunger.', sipper: 'For the smallest things.', wide: 'A fat barrel for bigger fish.', long: 'A long barrel that pulls from further off.' },
  tag: { pole: 'A dart on a pole.', gas: 'A gun that throws a dart a long way.', sat: 'Tags that report to a satellite.' },
  cam: { compact: 'A small camera with a flash.', macro: 'For close-ups of small things.', housed: 'A real camera in a housing.', lowlight: 'Sees in the dark with no flash.' },
};
// how many chest-only items of each rarity, per kind
export const CHEST_COUNTS = { main: { common: 5, uncommon: 5, rare: 15 }, side: { common: 2, uncommon: 2, rare: 5 } };

// ---------- how the special things look (2.8.1): in his hand, on him, and in their pictures ----------
// net: a net look for tools_draw's drawNet (base: the plain net it starts from; fx: its own details)
// fin: blade colours [root, tip, edge] and fx ('rays', 'bone', 'glass', 'vintage'); tank: fx ('lung', 'bone',
// 'vent', 'brass'); suit: a palette [suit, highlight, panel, seam, glove] and a glow for its seams
export const LOOKS = {
  gulper: { net: { base: 0, shape: 'jaw', len: 40, r: 10, bag: 22, step: 2, mesh: 'rgba(160,130,120,0.5)', tint: 'rgba(60,40,44,0.5)', hoop: '#d8ccb0', h: ['#e0d6bc', '#b8ac90', '#7a6e58'], grip: '#4a3e30' } },
  choirveil: { net: { base: 1, shape: 'bell', len: 34, r: 10, bag: 18, step: 1.4, mesh: 'rgba(210,200,230,0.45)', tint: 'rgba(170,160,200,0.15)', hoop: '#d8d0e8', h: ['#c8c0d8', '#8a82a0', '#4a4460'], grip: '#2a2638', lit: true } },
  lanternmesh: { net: { base: 0, shape: 'lure', len: 36, r: 9.5, bag: 18, step: 1.3, mesh: 'rgba(200,180,130,0.55)', tint: 'rgba(180,160,110,0.1)', hoop: '#7a6a4a', h: ['#5a4630', '#3a2c1e', '#1e160e'], grip: '#1a120a', lit: true } },
  hagnet: { net: { base: 2, shape: 'knot', len: 66, r: 10, bag: 20, step: 2.0, mesh: 'rgba(214,204,168,0.6)', tint: 'rgba(200,190,150,0.2)', hoop: '#d8ceb0', h: ['#e8e0c8', '#c0b494', '#8a8068'], grip: '#5a4e38', collar: null } },
  stillwater: { net: { base: 0, shape: 'seine', len: 30, r: 9, bag: 20, step: 1.6, mesh: 'rgba(78,84,96,0.9)', tint: 'rgba(20,22,30,0.4)', hoop: '#50545e', h: ['#5a5e68', '#383c44', '#1a1c22'], grip: '#0a0b0e' } },
  oldnet: { net: { base: 1, shape: 'fork', len: 42, r: 10, bag: 20, step: 2.6, mesh: 'rgba(130,110,80,0.85)', tint: 'rgba(90,75,50,0.15)', hoop: '#6a5a40', h: ['#8a7a5a', '#6a5a40', '#3e3424'], grip: '#2e2618' } },
  oarcrest: { fin: { c: ['#5a1812', '#a83a2a', 'rgba(210,120,100,0.75)'], fx: 'rays' } },
  pinions: { fin: { c: ['#2a3430', '#5a7068', 'rgba(200,214,208,0.85)'], fx: 'bone' } },
  glasswing: { fin: { c: ['rgba(190,215,225,0.4)', 'rgba(170,205,220,0.22)', 'rgba(215,235,240,0.8)'], fx: 'glass' } },
  blacklung: { tank: { fx: 'lung' } },
  whalefall: { tank: { fx: 'bone' } },
  ventheart: { tank: { fx: 'vent' } },
  oldskin: { suit: ['#3a2c14', '#7a6230', '#54421c', '#b89040', '#1e1608'] },
  abyssalhide: { suit: ['#07080e', '#1a1e2c', '#0e1018', '#3a4a6a', '#040408'] },
  hagmantle: { suit: ['#5a5446', '#9a907a', '#766c58', '#c8bc9c', '#2e2a22'] },
};
// every Exotic looks like old expedition gear: brass, hemp, varnished wood, worn rubber, canvas
export const EXOTIC_LOOK = {
  net: (base, shape) => ({ base, shape, mesh: 'rgba(170,145,105,0.85)', tint: 'rgba(150,125,85,0.12)', hoop: '#9a7a3a', h: ['#a88a60', '#7a5e3a', '#40301c'], grip: '#3a2a18' }),
  fin: { c: ['#16140f', '#2e2a20', 'rgba(110,96,70,0.7)'], fx: 'vintage' },
  tank: { fx: 'brass' },
  suit: { wet: ['#1c1a16', '#3e3a30', '#2c2820', '#b8913e', '#100e0a'], skin: ['#18222a', '#34485a', '#22303c', '#b8913e', '#0c1218'], dry: ['#2a2418', '#5a4c32', '#3e3424', '#c8a050', '#14100a'],
    chain: ['#2a2a26', '#6a6a5e', '#3e3e36', '#b8913e', '#141410'], rebreather: ['#1e2418', '#3e4a32', '#2a3222', '#c8a050', '#0e120a'], hard: ['#5a4a2a', '#a08a5a', '#7a6640', '#d8b060', '#2a2418'] },
};
