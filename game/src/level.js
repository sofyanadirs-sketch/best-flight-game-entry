// Level: 12 ring emas di jalur berliku + koin + balon udara + awan badai.
import * as THREE from 'three';

const RING_COUNT = 12;
const RING_RADIUS = 9;

export function generateLevel(rng) {
  const rings = [];
  const coins = [];
  const balloons = [];
  const storms = [];

  // Jalur ring: maju ke -Z dengan belokan sinus + naik-turun.
  let x = 0, y = 42, z = -40;
  let heading = 0;
  for (let i = 0; i < RING_COUNT; i++) {
    const segLen = rng.range(95, 130);
    heading += rng.range(-0.55, 0.55);
    heading = THREE.MathUtils.clamp(heading, -1.1, 1.1);
    x += Math.sin(heading) * segLen;
    z -= Math.cos(heading) * segLen;
    y = THREE.MathUtils.clamp(y + rng.range(-16, 16), 26, 92);
    const center = new THREE.Vector3(x, y, z);
    // Sumbu ring menghadap arah datang (dari ring sebelumnya).
    const prev = i === 0 ? new THREE.Vector3(0, 42, 0) : rings[i - 1].center;
    const axis = center.clone().sub(prev).normalize();
    rings.push({ center, axis, passed: false, missed: false, index: i });

    // 3 koin di sekitar jalur menuju ring ini.
    for (let k = 1; k <= 3; k++) {
      const f = k / 4;
      const cx = prev.x + (center.x - prev.x) * f + rng.range(-9, 9);
      const cy = prev.y + (center.y - prev.y) * f + rng.range(-6, 6);
      const cz = prev.z + (center.z - prev.z) * f + rng.range(-9, 9);
      coins.push({ pos: new THREE.Vector3(cx, cy, cz), taken: false });
    }
  }

  // Balon udara merah-putih, sengaja di dekat jalur (tapi tidak tepat di tengah ring).
  for (let i = 0; i < 8; i++) {
    const ring = rings[rng.int(0, RING_COUNT - 1)];
    const pos = ring.center.clone();
    pos.x += rng.range(-26, 26);
    pos.y += rng.range(-12, 14);
    pos.z += rng.range(-26, 26);
    pos.y = THREE.MathUtils.clamp(pos.y, 22, 100);
    balloons.push({ pos, phase: rng.range(0, Math.PI * 2), hit: false });
  }

  // Awan badai: gumpalan abu-abu, bikin lambat kalau ditembus.
  // Dijaga jaraknya dari semua ring (min 40 m) supaya tidak menutupi jalur/ring.
  for (let i = 0; i < 4; i++) {
    let pos;
    for (let attempt = 0; attempt < 24; attempt++) {
      const ring = rings[rng.int(1, RING_COUNT - 1)];
      pos = ring.center.clone();
      pos.x += rng.range(-55, 55);
      pos.z += rng.range(-55, 35);
      pos.y = THREE.MathUtils.clamp(pos.y + rng.range(-6, 10), 26, 95);
      const clear = rings.every((r) => r.center.distanceTo(pos) >= 40);
      if (clear) break;
    }
    storms.push({ pos, radius: rng.range(13, 16) });
  }

  return { rings, coins, balloons, storms, ringRadius: RING_RADIUS };
}

export function buildLevelMeshes(scene, level) {
  const ringMat = new THREE.MeshLambertMaterial({ color: 0xffb700, emissive: 0x8a5c00 });
  const ringMatNext = new THREE.MeshLambertMaterial({
    color: 0xffd23e, emissive: 0xa67c00, transparent: true, opacity: 0.95,
  });
  const ringGeo = new THREE.TorusGeometry(RING_RADIUS, 0.85, 12, 40);
  const ringMeshes = level.rings.map((ring) => {
    const m = new THREE.Mesh(ringGeo, ringMat);
    m.position.copy(ring.center);
    // Torus menghadap sumbu jalur: default torus di bidang XY (sumbu Z) -> putar ke axis.
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring.axis);
    scene.add(m);
    // Cincin dalam tipis biar target terlihat jelas.
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS * 0.55, 0.22, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.55 }),
    );
    inner.position.copy(ring.center);
    inner.quaternion.copy(m.quaternion);
    scene.add(inner);
    return { outer: m, inner };
  });

  const coinGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.35, 18);
  const coinMat = new THREE.MeshLambertMaterial({ color: 0xffc93c, emissive: 0x7a5200 });
  const coinMeshes = level.coins.map((coin) => {
    const m = new THREE.Mesh(coinGeo, coinMat);
    m.position.copy(coin.pos);
    m.rotation.x = Math.PI / 2;
    scene.add(m);
    // Simbol "Rp" kecil di tengah koin? Pakai cincin putih tipis sebagai aksen.
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff6c9 }));
    dot.position.copy(coin.pos);
    scene.add(dot);
    return { mesh: m, dot };
  });

  const balloonMeshes = level.balloons.map((b) => {
    const grp = new THREE.Group();
    const envelope = new THREE.Mesh(new THREE.SphereGeometry(4.2, 14, 12),
      new THREE.MeshLambertMaterial({ color: 0xe23b3b }));
    envelope.scale.y = 1.15;
    grp.add(envelope);
    const band = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.5, 8, 20),
      new THREE.MeshLambertMaterial({ color: 0xffffff }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.6;
    grp.add(band);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8),
      new THREE.MeshLambertMaterial({ color: 0x8a5a2b }));
    basket.position.y = -6.4;
    grp.add(basket);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 4),
        new THREE.MeshBasicMaterial({ color: 0x333333 }));
      rope.position.set(sx * 0.8, -5.2, sz * 0.8);
      grp.add(rope);
    }
    grp.position.copy(b.pos);
    scene.add(grp);
    return grp;
  });

  const stormMat = new THREE.MeshLambertMaterial({ color: 0x7d8ea3, transparent: true, opacity: 0.85 });
  const stormMeshes = level.storms.map((s) => {
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s.radius * 0.38, 10, 8), stormMat);
      puff.position.set((k - 2) * s.radius * 0.5, (k % 2) * 2 - 1, ((k * 7) % 3 - 1) * s.radius * 0.4);
      puff.scale.y = 0.6;
      grp.add(puff);
    }
    // Kilat kecil sesekali: bola kuning di tengah gumpalan.
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe95e }));
    bolt.position.y = -s.radius * 0.4;
    grp.add(bolt);
    grp.position.copy(s.pos);
    scene.add(grp);
    return { grp, bolt };
  });

  // Panah penunjuk ring berikutnya (kerucut emas melayang di atas ring aktif).
  const marker = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 4),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  marker.rotation.x = Math.PI;
  scene.add(marker);

  return { ringMeshes, coinMeshes, balloonMeshes, stormMeshes, marker, ringMat, ringMatNext };
}

export function updateLevelVisuals(meshes, level, nextRingIndex, t, dt) {
  const pulse = 1 + Math.sin(t * 4) * 0.12;
  level.rings.forEach((ring, i) => {
    const m = meshes.ringMeshes[i];
    const isNext = i === nextRingIndex;
    m.outer.material = isNext ? meshes.ringMatNext : meshes.ringMat;
    m.outer.scale.setScalar(isNext ? pulse : 1);
    m.inner.rotation.z += dt * (isNext ? 1.2 : 0.3);
    if (ring.passed) {
      m.outer.material = meshes.ringMat;
      m.outer.scale.setScalar(0.9);
      m.inner.visible = false;
    }
  });
  level.coins.forEach((coin, i) => {
    if (coin.taken) return;
    const cm = meshes.coinMeshes[i];
    cm.mesh.rotation.y += dt * 2.4;
    cm.mesh.position.y = coin.pos.y + Math.sin(t * 2 + i) * 0.8;
    cm.dot.position.y = cm.mesh.position.y;
    cm.dot.visible = true;
  });
  level.balloons.forEach((b, i) => {
    const grp = meshes.balloonMeshes[i];
    grp.position.y = b.pos.y + Math.sin(t * 0.7 + b.phase) * 2.2;
    grp.rotation.y += dt * 0.15;
  });
  level.storms.forEach((s, i) => {
    const sm = meshes.stormMeshes[i];
    sm.bolt.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.9 + i * 2.1));
    sm.bolt.visible = Math.sin(t * 0.9 + i * 2.1) > -0.2;
    sm.grp.rotation.y += dt * 0.05;
  });
  // Penanda melayang di atas ring berikutnya.
  if (nextRingIndex < level.rings.length) {
    const ring = level.rings[nextRingIndex];
    meshes.marker.visible = true;
    meshes.marker.position.set(ring.center.x, ring.center.y + RING_RADIUS + 7 + Math.sin(t * 3) * 1.2, ring.center.z);
    meshes.marker.rotation.y = t;
  } else {
    meshes.marker.visible = false;
  }
}
