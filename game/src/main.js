// Bootstrap: renderer, kamera, input keyboard, loop, mode ?shot= / ?seed=.
import * as THREE from 'three';
import { Game } from './game.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 13) >>> 0;
const shot = params.get('shot') || null;

// Tangkap error JS ke window agar bisa dicek headless.
window.__errors = [];
window.addEventListener('error', (e) => {
  window.__errors.push(String(e.message || e.error));
});
window.addEventListener('unhandledrejection', (e) => {
  window.__errors.push('rejection: ' + String(e.reason));
});

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 4000);
camera.position.set(0, 48, 26);

const game = new Game(scene, camera, seed);
window.__game = game;
window.__THREE = THREE;
window.__camera = camera;

const input = {
  up: false, down: false, left: false, right: false,
  faster: false, slower: false, boost: false,
};

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'faster', ArrowDown: 'down', KeyS: 'slower',
  ArrowLeft: 'left', ArrowRight: 'right', ShiftLeft: 'boost', ShiftRight: 'boost',
};

window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.key] || KEYMAP[e.code]) {
    input[KEYMAP[e.key] || KEYMAP[e.code]] = true;
    e.preventDefault();
  }
  if (e.code === 'KeyP' && (game.state === 'playing' || game.state === 'paused')) {
    game.togglePause();
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR' && game.state !== 'menu') {
    game.reset();
    game.start();
  }
  if (e.code === 'Enter') {
    if (game.state === 'menu') game.start();
    else if (game.state === 'over') { game.reset(); game.start(); }
  }
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.key] || KEYMAP[e.code]) {
    input[KEYMAP[e.key] || KEYMAP[e.code]] = false;
    e.preventDefault();
  }
});

function toggleMute() {
  game.sfx.setMuted(!game.sfx.muted);
  document.getElementById('mute-btn').textContent =
    game.sfx.muted ? '🔇 Suara: OFF' : '🔊 Suara: ON';
}
document.getElementById('mute-btn').addEventListener('click', toggleMute);
document.getElementById('start-btn').addEventListener('click', () => game.start());
document.getElementById('again-btn').addEventListener('click', () => { game.reset(); game.start(); });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mode screenshot: bekukan adegan deterministik setelah frame pertama.
import { updateLevelVisuals } from './level.js';
import { updatePlane } from './plane.js';

let shotApplied = false;
if (shot) {
  const apply = () => {
    if (shotApplied) return;
    shotApplied = true;
    game.applyShot(shot);
    game.updateHud();
  };
  // Terapkan setelah 300ms agar dunia sempat dibangun & satu frame ter-render.
  setTimeout(apply, 300);
}

let lastNow = performance.now();
let elapsed = 0;
let frames = 0;
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;
  elapsed += dt;
  const t = elapsed;
  if (shot === 'play' || shot === 'play2') {
    // Adegan beku: visual hidup (awan, ring berdenyut, baling-baling),
    // tapi pesawat TIDAK maju — screenshot stabil, HUD tetap seperti adegan.
    game.world.update(dt, t);
    updateLevelVisuals(game.meshes, game.level, game.nextRing, t, dt);
    game.updateCamera(dt);
    updatePlane(game.plane, game, dt, t);
    game.sfx.setEngine(false, 0);
  } else if (shot === 'end') {
    game.world.update(dt, t);
    updateLevelVisuals(game.meshes, game.level, game.nextRing, t, dt);
    updatePlane(game.plane, game, dt, t);
  } else {
    game.update(dt, input, t);
  }
  renderer.render(scene, camera);
  frames++;
  if (frames === 5) window.__ready = true;
}
animate();
window.__ready = false;
