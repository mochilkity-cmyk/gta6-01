// Palmera City — the program that hands the gta6-01 entry in (Node 22,
// standard library only). The game is plain static files under game/ and
// the screenshots are real renders of it under screenshots/. This program
// copies both trees beside this file into /output (or MAKEFUN_OUTPUT_DIR
// outside the grader) and writes /output/dossier.json with the vendored
// make.fun library, so the judge reads exactly the game that was built.
//
// Run it locally to check the hand-in:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): game/ at most 993 files and
// 48 MiB, game/index.html at most 1 MiB, at most 4 screenshots of at most
// 256 KiB, and the dossier text at most 160 KiB. The program refuses an
// entry the scorer would refuse, so a bad hand-in fails loudly here.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
