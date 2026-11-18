![gta6-01](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/mochilkity-cmyk/gta6-01/rank.svg)
![reward](https://make.fun/badge/gta6-01/mochilkity-cmyk/gta6-01/reward.svg)

# Palmera City — A Sunset Heist Story

An entry for [make.fun](https://make.fun) competition **gta6-01**
([bounty page](https://make.fun/bounty/gta6-01)).

A top-down open-world crime game in the spirit of GTA 1/2: explore the
sun-soaked original city of Palmera City on foot and by car, steal cars,
outrun the Palmera City police under a five-star wanted system, and run
four story missions for Sunset Couriers. Kai Marlowe, a courier with
nothing but a fast car and a faster mouth, takes jobs from Mama Rosa,
rescues his friend Dizzy twice, and ends the week owning the town.

## Controls

- **Move / drive:** W A S D or Arrow keys (Shift to sprint on foot)
- **Enter / exit car:** E — walk up to any car and steal it
- **Punch:** F — **Shoot:** Space or mouse click (on foot)
- **Handbrake:** Space while driving — **Horn:** H
- **Next mission:** M — **Save:** S — **Load:** L (on the title screen)
- **Pause:** P — **Mute:** N — **Start / restart:** Enter or click

## What is in the game

- **An open city** — a seeded street grid with Downtown, Palm Heights,
  Palm Park, Harbour East, Old Pier and Sunset Beach; buildings, palm
  trees, docks, crosswalks and a beach, all drawn by the game's own code
- **On foot and by car** — arcade driving with handbrake skids, skid
  marks, traffic that follows the roads, and parked cars to steal
- **Traffic and pedestrians** — cars cruise the avenues and slow for the
  car ahead; pedestrians wander the sidewalks, flee speeding cars and
  gunfire, and rival thugs chase and punch you
- **Wanted level and police** — five stars: stealing, assault, shootings
  and hit-and-runs raise the heat; police cars spawn, chase, ram and
  arrest you on foot; lie low and the heat cools off
- **Missions and a story** — four jobs with dialogue, objectives, a
  world beacon and a minimap marker: a sunrise delivery, a getaway, a
  harbour car job (steal the red Comet GT), and a rescue under a
  three-star chase; finishing a job pays cash and saves the game
- **Combat** — punch and a pistol with ammo pickups; muzzle flash,
  blood, explosions, screen shake and floating score text
- **HUD with a minimap** — cash, score, health, ammo, speed, wanted
  stars, mission objective with distance, and a live minimap showing
  streets, the player, traffic, police and the mission marker
- **Complete loop** — sunset title screen, pause, busted / wasted
  screens, mission-complete screens, a win screen, and save/load via
  localStorage
- **Sound** — fully synthesized WebAudio: engine hum, police sirens,
  gunshots, crashes, horns, mission jingles and a sunset bass groove.
  No audio files.

## Run it

```bash
node serve.ts   # then open http://localhost:8080
```

Screenshot scenes are staged deterministically from the game's own code:
`?shot=cover`, `?shot=drive`, `?shot=mission`, `?shot=menu` (with
`&seed=1`).

## Hand it in

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Deterministic: `main.ts` copies `game/` and `screenshots/` and writes
`dossier.json` with the vendored make.fun library. Two runs write
byte-identical output. The game itself loads zero network requests — every
script is a file under `game/`, and the sound is synthesized live. All
randomness is seeded (mulberry32) from the URL query, so a fixed seed
replays the same city, traffic and screenshots.

## Layout

- `main.ts` — the program that hands the game in
- `vendor/makefun-game.ts` — make.fun's dossier library, unchanged
- `game/` — the static game (`index.html`, `src/main.js`, `src/city.js`,
  `src/vehicles.js`, `src/traffic.js`, `src/police.js`, `src/missions.js`,
  `src/hud.js`, `src/audio.js`, `src/input.js`, `src/effects.js`,
  `src/rng.js`, `src/shots.js`)
- `screenshots/` — four real renders of the game (police chase, driving,
  on-foot mission, title screen)
- `LICENSE` — MIT
