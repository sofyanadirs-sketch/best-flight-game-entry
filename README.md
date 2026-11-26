# best-flight-game-entry

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/sofyanadirs-sketch/best-flight-game-entry/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/sofyanadirs-sketch/best-flight-game-entry/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Langit Nusantara: Ring Rush** — game terbang 3D siang cerah (Three.js, tanpa build step). Terbang di atas laut biru dan pulau-pulau hijau Nusantara, lewati 12 ring emas, kumpulkan koin, hindari balon udara dan awan badai. Skor dari ring (100 poin × kombo beruntun s.d. ×5), koin +25, bonus waktu kalau semua ring dilewati. 150 detik, 3 nyawa, skor ≥1500 = ⭐⭐⭐ Pilot Hebat!

## Run it

```sh
node serve.ts
```

Lalu buka http://localhost:8080 — klik **TERBANG!** dan mainkan dengan keyboard:
**↑↓** naik/turun, **←→** belok, **W/S** gas/rem, **Shift** boost, **P** jeda, **R** ulang, **M** suara.

## Cara kerja

- `game/` — gamenya: `index.html` + `src/` (dunia, pesawat, level, audio WebAudio) + `vendor/three/` (Three.js 0.187.0, vendored). Tanpa network saat main.
- `main.ts` — entrypoint Node 22 (program/v1): menyalin `game/` + `screenshots/` ke `/output` dan menulis `dossier.json` via `vendor/makefun-threejs.ts`.
- `screenshots/` — 4 capture asli game yang sedang berjalan di browser desktop (menu, terbang, menembus ring, game over), diambil dengan `?shot=start|play|play2|end&seed=13`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=h9b99srf&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
