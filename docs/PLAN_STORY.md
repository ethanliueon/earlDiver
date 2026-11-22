# The story and the regions: a plan for its own planning round

Status: a first draft for the owner to shape. Nothing here is built. It needs its own planning round (characters,
steps, rewards, the chart, saves) before any code. Written at 6.4.0.

## Why
The sea is wide, and sailing ten minutes west is dead time. A story that opens the sea in steps gives the game a
spine beyond money and depth: people who want things, places you have not been, and a reason the deep is the way it is.
The world layout barely changes. What changes is what is open, and how you get there.

## How it works
- **Regions.** The sea is cut into regions, each closed at first: drawn on the chart as unknown water, the sea at its
  edge too rough (surface) or too dark (deep) to pass, a line on the chart where the Margaret's captain will not go.
- **Opening a region** takes a step of the main quest: a person asks for something (a catch, a photograph, a depth, a
  thing brought up), and doing it opens the next water.
- **Travel by the chart.** Once a region is open, the Margaret's chart offers *Set a course*: a few seconds of the
  Margaret under way at sea (no loading screen; the sky turning), and she and the sub are there. Sailing or driving
  there by hand still works.
- **Rewards** are the game's own: cash, chests, gear, and now and then a page of the story.

## The regions (on the map as it is)
1. **The Harbour shallows**: the reef and kelp by the Margaret's mooring. Open from the start.
2. **The Wreck shelf**: the shelf edge and the two wrecks. A diver's first real depth.
3. **The Station**: the research station's tower and its canyon. Scientists, cameras, the first deep gear.
4. **Dave's trench**: Dave's Haul at 1,200 m, the brine lake and the vents.
5. **The abyssal plain**: the whale fall, the long dark, the trench's lip.
6. **The Old One's water**: the cave at the far west, and below it the deepest water in the game.

## The people
- **Marta Quill, the Margaret's captain.** Owns the boat, rents Earl a bunk, sixty, smokes on the stern, has lost two
  divers in thirty years and will not say how. She is the voice of the first steps and of caution: she draws the
  chart's lines. Speaks plainly, short sentences. (Not "she" in the UI: "Marta" or "the captain".)
- **Dr. Ines Halloran, the station's lead biologist.** Wants specimens and photographs for a survey nobody funds any
  more. Gives the photo work a reason. Precise, kind, a little desperate; the station's money is running out.
- **Dave.** Already in the game: lives at 1,200 m in a salvaged habitat, sells second-hand deep gear, says less than he
  knows. He knew the divers Marta lost.
  **Decided (owner, 6.4.1): Dave will become an actual diver in the world**, a figure Earl swims up to at the habitat.
  Earl and Dave have a short exchange in the scene (Dave's words beside him; Earl still never speaks), and that
  exchange leads into the shop. Then the shop page loses its first line (`Dave: "Well, would you look at that…"`),
  because the greeting has already happened in the world. Build it with the story round, not before.
- **The Old One.** Already in the game: a vast thing in the cave that trades for old coins. Never speaks in words; its
  wants come as objects laid out, as now. The story never explains it fully.
- **The thing in the deep.** Never a character with lines. The story is partly about it: what it is, why it marks
  divers, and why the old coins come from the drowned.

## The main quest line (a draft)
**Act 1: The shallows (the tutorial's handoff).**
1. Marta: catch and sell your first fish (as now). *Opens nothing; teaches selling.*
2. Marta: bring up a live animal in good condition. *Teaches the tank.*
3. Marta: dive to 40 m and come back with air to spare. *Opens the Wreck shelf.*

**Act 2: The wrecks and the station.**
4. Marta: photograph the name on the bow of the near wreck (a new photographable thing). The ship was the *Albatross*,
   lost with its crew forty years ago. *Opens the Station's water.*
5. Dr. Halloran: photograph five species of the twilight zone for the survey. *A camera reward.*
6. Dr. Halloran: bring up a live animal from below 300 m in a pressure chamber. *Gives the sub its first refit.*
7. Dr. Halloran: the station's own drop camera failed at 1,100 m; recover its film (a pickup at the canyon floor).
   On the film: a light that is not a fish. *Opens Dave's trench.*

**Act 3: The deep.**
8. Dave: he wants a particular catch (a giant isopod) before he will talk. *A Dave crate as reward.*
9. Dave: the *Albatross*'s divers. He was one of them. He came back; two did not. He sends you to the whale fall for
   a diver's tag. *Opens the abyssal plain.*
10. At the whale fall: the tag, and the first old coin in the story. The thing marks you here for the first time,
    scripted, whatever your depth.
11. Marta, told the truth: she charts the way west. *Opens the Old One's water.*

**Act 4: The Old One.**
12. The Old One lays out three things it wants: a photograph, a living animal, an old coin. Giving all three opens
    its trade fully.
13. The ending is left open for a later round: what the Old One is to the thing, what the coins are, whether Earl can
    make the thing let go of a diver.

## Side quests (people and places)
- Each region has two or three standing side quests from its people (Marta, Halloran, Dave), refreshed as now, but
  written in their voices and tied to their places ("Halloran wants the anglerfish photographed at its depth").
- Quests may give chests as rewards (now that chests are standard tiers).

## What it touches (for the planning round)
- The chart (open and closed water, Set a course), the quest board (people and acts), the tutorial's last step,
  saves (which regions are open), the Margaret's travel, and where the thing in the deep may roam (it should still be
  able to be anywhere deep).
- New pickups: the wreck's name, the drop camera's film, the diver's tag.
- No new art for people beyond small portraits for the quest cards (painted, matte, in the game's palette), or none at
  all: a name and a line may be enough.

## Questions for the owner
1. Should closed regions be truly closed (you cannot sail there), or open but unmarked and dangerous (rough water,
   no chart)? I lean to rough water you can force at a cost, so nothing is a wall.
2. The people: portraits, or names and words only?
3. How much story? A light thread through quests (my lean), or longer scenes?
4. Does the Albatross story fit what you imagine for the thing and the Old One?
