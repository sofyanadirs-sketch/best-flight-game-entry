// Langit Nusantara: Ring Rush — entry program/v1 (Node 22, standard library only).
// Game-nya adalah folder game/ di samping file ini: file statis yang dimuat browser
// sebagai ES module dengan three.js dari import map. Program ini menyerahkan game:
// menyalin game/ dan screenshots/ ke /output lalu menulis /output/dossier.json
// dengan library make.fun yang di-vendor. Jalankan lokal:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Mainkan lokal: node serve.ts lalu buka http://localhost:8080.

import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Batas scorer (lihat vendor/makefun-threejs.ts): teks maks 160 KiB,
// maks 4 screenshot @ 256 KiB, game/ maks 993 file / 48 MiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  }),
);

// Semua output harus bisa dibaca user lain (grader mengumpulkannya sebagai user lain):
// file 0644, folder 0755.
function chmodTree(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { chmodSync(p, 0o755); chmodTree(p); }
    else chmodSync(p, 0o644);
  }
}
chmodTree(out);
chmodSync(out, 0o755);
