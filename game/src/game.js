// Inti game: status, fisika terbang, tabrakan, skor, HUD, kamera, mode ?shot=.
import * as THREE from 'three';
import { generateLevel, buildLevelMeshes, updateLevelVisuals } from './level.js';
import { buildPlane, updatePlane } from './plane.js';
import { buildWorld } from './world.js';
import { SoundFX } from './audio.js';
import { makeRng } from './rng.js';

export const GAME_TIME = 150;
export const RING_POINTS = 100;
export const COIN_POINTS = 25;
export const MAX_LIVES = 3;
export const BEST_KEY = 'langit-nusantara-best';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor(scene, camera, seed) {
    this.scene = scene;
    this.camera = camera;
    this.rng = makeRng(seed);
    this.sfx = new SoundFX();
    this.world = buildWorld(scene, this.rng);
    this.plane = buildPlane();
    scene.add(this.plane.group);
    this.level = generateLevel(this.rng);
    this.meshes = buildLevelMeshes(scene, this.level);
    this.reset();
    this.camPos = new THREE.Vector3(0, 48, 26);
    this.shake = 0;
    this.toastTimer = null;
    this.lastStormWarn = 0;
  }

  reset() {
    this.state = 'menu';
    this.pos = new THREE.Vector3(0, 42, 0);
    this.heading = 0; // menghadap -Z
    this.pitch = 0;
    this.bank = 0;
    this.speed = 0;
    this.throttle = 0.55;
    this.boost = false;
    this.score = 0;
    this.coins = 0;
    this.combo = 1;
    this.bestCombo = 1;
    this.ringsPassed = 0;
    this.nextRing = 0;
    this.lives = MAX_LIVES;
    this.timeLeft = GAME_TIME;
    this.invuln = 0;
    this.inStorm = false;
    this.timeBonus = 0;
    this.finished = false;
    this.elapsed = 0;
    for (const r of this.level.rings) { r.passed = false; r.missed = false; }
    for (const c of this.level.coins) c.taken = false;
    for (const b of this.level.balloons) b.hit = false;
    this.plane.group.visible = true;
    this.updateHud();
    this.showScreen('menu');
  }

  start() {
    this.sfx.resume();
    this.sfx.click();
    this.state = 'playing';
    this.showScreen(null);
    this.toast('TERBANG! ✈️');
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.toast('JEDA ⏸ — tekan P untuk lanjut');
      this.sfx.setEngine(false, 0);
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.toast('');
    }
  }

  gameOver(title) {
    this.state = 'over';
    this.finished = true;
    this.sfx.setEngine(false, 0);
    const stars = this.score >= 1500 ? 3 : this.score >= 900 ? 2 : this.score >= 400 ? 1 : 0;
    let best = 0;
    try {
      best = Number(localStorage.getItem(BEST_KEY) || 0);
      if (this.score > best) {
        best = this.score;
        localStorage.setItem(BEST_KEY, String(best));
      }
    } catch { best = Math.max(this.score, 0); }
    $('over-title').textContent = title;
    $('over-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('over-score').textContent = this.score.toLocaleString('id-ID');
    $('over-rings').textContent = `${this.ringsPassed} / ${this.level.rings.length}`;
    $('over-coins').textContent = String(this.coins);
    $('over-combo').textContent = `×${this.bestCombo}`;
    $('over-bonus').textContent = `+${this.timeBonus}`;
    $('over-best').textContent = best.toLocaleString('id-ID');
    this.showScreen('over');
    if (stars >= 2) this.sfx.win(); else this.sfx.lose();
  }

  showScreen(which) {
    $('menu-screen').classList.toggle('hidden', which !== 'menu');
    $('over-screen').classList.toggle('hidden', which !== 'over');
    $('hud').style.display = which === 'menu' ? 'none' : '';
  }

  toast(text, ms = 1400) {
    const el = $('toast');
    el.textContent = text;
    el.style.opacity = text ? '1' : '0';
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (text) this.toastTimer = setTimeout(() => { el.style.opacity = '0'; }, ms);
  }

  warn(text) {
    const el = $('warn');
    el.textContent = text;
    el.style.display = text ? '' : 'none';
  }

  updateHud() {
    $('score').textContent = this.score.toLocaleString('id-ID');
    $('combo').textContent = this.combo > 1 ? `KOMBO ×${this.combo}` : '';
    const t = Math.max(0, Math.ceil(this.timeLeft));
    $('timer').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    $('timer').classList.toggle('low', t <= 20 && this.state === 'playing');
    $('rings').textContent = `${this.ringsPassed} / ${this.level.rings.length}`;
    $('lives').textContent = '♥'.repeat(this.lives) + '♡'.repeat(MAX_LIVES - this.lives);
    $('speed-val').textContent = String(Math.round(this.speed * 3.6));
    $('alt-val').textContent = String(Math.round(Math.max(0, this.pos.y)));
    $('coins-val').textContent = String(this.coins);
  }

  // ---- fisika & aturan main ----
  update(dt, input, t) {
    this.elapsed += dt;
    this.world.update(dt, t);
    updateLevelVisuals(this.meshes, this.level, this.nextRing, t, dt);

    if (this.state === 'menu') {
      // Pesawat melayang di tempat + kamera mengorbit pelan di menu.
      // Mode screenshot bisa membekukan adegan (menuFrozen + menuAngle).
      if (this.menuFrozen) {
        this.pos.set(-17, 45, -6);
        this.heading = 0.35;
        this.pitch = 0; this.bank = 0.12;
      } else {
        this.pos.set(Math.sin(t * 0.1) * 6, 42 + Math.sin(t * 0.5) * 1.5, 0);
        this.heading = Math.sin(t * 0.1) * 0.3;
        this.pitch = 0; this.bank = Math.sin(t * 0.4) * 0.1;
      }
      this.speed = 22;
      updatePlane(this.plane, this, dt, t);
      if (this.menuFrozen) {
        // Adegan screenshot: pesawat di sepertiga kiri, kartu menu di tengah.
        this.camera.position.set(20, 49, 20);
        this.camera.lookAt(-10, 46, -43);
      } else {
        const a = t * 0.08;
        this.camera.position.set(Math.sin(a) * 26, 48 + Math.sin(t * 0.3) * 2, 26 + Math.cos(a) * 6);
        this.camera.lookAt(this.pos.x + 4, this.pos.y + 2, this.pos.z - 30);
      }
      this.sfx.setEngine(false, 0);
      return;
    }
    if (this.state !== 'playing') {
      this.sfx.setEngine(false, 0);
      return;
    }

    // Input: belok, naik/turun, gas.
    const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const climb = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    if (input.faster) this.throttle = Math.min(1, this.throttle + dt * 0.5);
    if (input.slower) this.throttle = Math.max(0.25, this.throttle - dt * 0.5);
    this.boost = !!input.boost;

    const turnRate = 1.15;
    this.heading += turn * turnRate * dt * (0.6 + this.speed / 45);
    this.bank = THREE.MathUtils.lerp(this.bank, -turn * 0.55, 1 - Math.exp(-8 * dt));
    this.pitch = THREE.MathUtils.lerp(this.pitch, climb * 0.32, 1 - Math.exp(-6 * dt));

    // Kecepatan: gas + boost, badai memperlambat.
    const targetSpeed = (16 + this.throttle * 26) * (this.boost ? 1.45 : 1) * (this.inStorm ? 0.55 : 1);
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, 1 - Math.exp(-1.6 * dt));

    // Maju searah heading + pitch; gravitasi ringan kalau gas kecil.
    const dir = new THREE.Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading));
    const vy = Math.sin(this.pitch) * this.speed + (this.throttle < 0.35 ? -3 : 0);
    this.pos.addScaledVector(dir, this.speed * Math.cos(this.pitch) * dt);
    this.pos.y += vy * dt;

    // Batas arena & ketinggian.
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > 560) {
      this.warn('⚠️ KEMBALI KE AREA PULAU!');
      const back = Math.atan2(-this.pos.x, -this.pos.z);
      let diff = back - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += THREE.MathUtils.clamp(diff, -1, 1) * dt * 1.2;
    } else if (this.pos.y < 12) {
      this.pos.y = 12; this.pitch = Math.max(this.pitch, 0.05);
      this.warn('⚠️ TERLALU RENDAH — NAIK!');
    } else if (this.pos.y > 110) {
      this.pos.y = 110; this.pitch = Math.min(this.pitch, -0.05);
      this.warn('⚠️ TERLALU TINGGI — TURUN!');
    } else {
      this.warn('');
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.plane.group.visible = this.invuln <= 0 || Math.floor(t * 10) % 2 === 0;
    this.timeLeft -= dt;
    this.checkRings();
    this.checkCoins();
    this.checkBalloons();
    this.checkStorms(t);
    this.updateHud();
    this.updateCamera(dt);

    this.sfx.setEngine(true, this.speed / 55);
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.updateHud();
      this.gameOver('WAKTU HABIS! ⏱️');
    } else if (this.lives <= 0) {
      this.gameOver('PESAWAT JATUH! 💥');
    } else if (this.nextRing >= this.level.rings.length) {
      this.timeBonus = Math.round(this.timeLeft) * 2;
      this.score += this.timeBonus;
      this.updateHud();
      this.gameOver('SEMUA RING DILEWATI! 🏆');
    }
  }

  checkRings() {
    if (this.nextRing >= this.level.rings.length) return;
    const ring = this.level.rings[this.nextRing];
    const d = this.pos.clone().sub(ring.center);
    const along = d.dot(ring.axis);
    const radial = d.clone().addScaledVector(ring.axis, -along).length();
    if (Math.abs(along) < 4.5 && radial < this.level.ringRadius) {
      ring.passed = true;
      this.ringsPassed++;
      const pts = RING_POINTS * this.combo;
      this.score += pts;
      this.toast(`RING! +${pts} 🎯`, 1200);
      this.sfx.ring();
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.combo = Math.min(5, this.combo + 1);
      this.nextRing++;
    } else if (along > 18) {
      ring.missed = true;
      if (this.combo > 1) this.toast('RING TERLEWAT — kombo putus 😢', 1200);
      this.combo = 1;
      this.nextRing++;
      this.sfx.warn();
    }
  }

  checkCoins() {
    for (const coin of this.level.coins) {
      if (coin.taken) continue;
      if (this.pos.distanceTo(coin.pos) < 4) {
        coin.taken = true;
        this.coins++;
        this.score += COIN_POINTS;
        this.toast(`+${COIN_POINTS} 🪙`, 700);
        this.sfx.coin();
      }
    }
  }

  checkBalloons() {
    if (this.invuln > 0) return;
    for (const b of this.level.balloons) {
      if (b.hit) continue;
      if (this.pos.distanceTo(b.pos) < 7.5) {
        b.hit = true;
        this.lives--;
        this.speed *= 0.45;
        this.invuln = 2.5;
        this.shake = 0.9;
        this.combo = 1;
        this.toast('DUAR! Kena balon! 🎈💥', 1400);
        this.sfx.crash();
        // Mentalkan pesawat menjauh dari balon.
        const away = this.pos.clone().sub(b.pos).normalize();
        this.pos.addScaledVector(away, 6);
        break;
      }
    }
  }

  checkStorms(t) {
    let inside = false;
    for (const s of this.level.storms) {
      if (this.pos.distanceTo(s.pos) < s.radius) { inside = true; break; }
    }
    if (inside && !this.inStorm) {
      this.warn('⛈️ AWAN BADAI — LAMBAT!');
      if (t - this.lastStormWarn > 3) { this.sfx.warn(); this.lastStormWarn = t; }
    } else if (!inside && this.inStorm) {
      this.warn('');
    }
    this.inStorm = inside;
  }

  updateCamera(dt) {
    const back = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const desired = this.pos.clone()
      .addScaledVector(back, 15)
      .add(new THREE.Vector3(0, 5.2, 0));
    this.camPos.lerp(desired, 1 - Math.exp(-5 * dt));
    const shakeAmp = this.shake > 0 ? this.shake * 0.7 : 0;
    this.shake = Math.max(0, this.shake - dt * 1.4);
    const sx = (Math.random() - 0.5) * shakeAmp;
    const sy = (Math.random() - 0.5) * shakeAmp;
    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    const look = this.pos.clone()
      .addScaledVector(new THREE.Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading)), 26);
    look.y += this.pos.y * 0.02 + Math.sin(this.pitch) * 8;
    this.camera.lookAt(look);
    updatePlane(this.plane, this, dt, this.elapsed);
  }

  // Pasang kamera ke posisi kejar persis (tanpa lerp) — penting di headless
  // yang frame ratenya rendah: kalau tidak, screenshot menangkap kamera
  // yang masih dalam perjalanan dan pesawat tampak kecil/jauh.
  snapChaseCamera() {
    const back = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.camPos.copy(this.pos).addScaledVector(back, 15).add(new THREE.Vector3(0, 5.2, 0));
  }

  // ---- mode screenshot deterministik (?shot=start|play|play2|end) ----
  applyShot(name) {
    const ring2 = this.level.rings[1];
    const ring3 = this.level.rings[2];
    if (name === 'start') {
      this.state = 'menu';
      this.menuFrozen = true;
      this.showScreen('menu');
      return;
    }
    if (name === 'play') {
      this.state = 'playing';
      this.showScreen(null);
      // Tepat sebelum ring ke-2, HUD ramai: skor 350, kombo x3, 3 ring sudah lewat.
      this.pos.copy(ring2.center).addScaledVector(ring2.axis, -38);
      this.pos.y = ring2.center.y + 3;
      this.heading = Math.atan2(-ring2.axis.x, -ring2.axis.z);
      this.pitch = 0.08; this.bank = -0.15;
      this.speed = 30; this.throttle = 0.7;
      this.score = 350; this.ringsPassed = 3; this.nextRing = 2;
      this.level.rings[0].passed = true; this.level.rings[1].passed = true;
      this.combo = 3; this.bestCombo = 3; this.coins = 6; this.timeLeft = 112;
      this.snapChaseCamera();
      this.updateHud();
      return;
    }
    if (name === 'play2') {
      this.state = 'playing';
      this.showScreen(null);
      // Baru saja menembus ring ke-3: pesawat di tengah ring, toast +300 tampil.
      this.pos.copy(ring3.center);
      this.heading = Math.atan2(-ring3.axis.x, -ring3.axis.z);
      this.pitch = -0.05; this.bank = 0.2;
      this.speed = 38; this.throttle = 0.85; this.boost = true;
      this.score = 650; this.ringsPassed = 3; this.nextRing = 3;
      this.level.rings[0].passed = true; this.level.rings[1].passed = true;
      this.level.rings[2].passed = true;
      this.combo = 4; this.bestCombo = 4; this.coins = 9; this.timeLeft = 96;
      this.snapChaseCamera();
      this.updateHud();
      this.toast('RING! +300 🎯', 60000);
      return;
    }
    if (name === 'end') {
      this.state = 'over';
      this.score = 1840; this.ringsPassed = 12; this.nextRing = 12;
      this.coins = 18; this.combo = 5; this.bestCombo = 5; this.timeLeft = 48;
      this.timeBonus = 96;
      this.updateHud();
      this.showScreen('over');
      $('over-title').textContent = 'SEMUA RING DILEWATI! 🏆';
      $('over-stars').textContent = '⭐⭐⭐';
      $('over-score').textContent = (1840).toLocaleString('id-ID');
      $('over-rings').textContent = '12 / 12';
      $('over-coins').textContent = '18';
      $('over-combo').textContent = '×5';
      $('over-bonus').textContent = '+96';
      $('over-best').textContent = (1840).toLocaleString('id-ID');
      // Latar: pesawat + dunia terlihat di balik kartu (kamera diam di posisi cantik).
      this.pos.set(0, 46, -60);
      this.heading = 0.2; this.speed = 26;
      updatePlane(this.plane, this, 0.016, 1.2);
      this.camera.position.set(14, 52, -30);
      this.camera.lookAt(0, 44, -90);
      return;
    }
  }
}
