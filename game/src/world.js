// Dunia siang cerah: langit biru, matahari, awan putih, laut biru, pulau hijau.
import * as THREE from 'three';

export function buildWorld(scene, rng) {
  // Langit: kubah gradien biru muda -> biru cerah (canvas texture vertikal).
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2f7fe0');
  grad.addColorStop(0.45, '#6db9f2');
  grad.addColorStop(0.75, '#a8dcf7');
  grad.addColorStop(1, '#dff3ff');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(c);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(0xbfe3f7, 220, 1100);

  // Matahari: cakram kuning hangat + cahaya directional.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(55, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3a0, fog: false }),
  );
  sun.position.set(-420, 330, -900);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(85, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff9c9, transparent: true, opacity: 0.35, fog: false }),
  );
  sunGlow.position.copy(sun.position).multiplyScalar(1.001);
  sunGlow.lookAt(0, 0, 0);
  scene.add(sunGlow);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3f8f5f, 1.15);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xfff2cc, 2.0);
  dir.position.set(-300, 400, -200);
  scene.add(dir);

  // Laut: bidang biru besar di bawah (y = 0).
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(3000, 3000, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0x1e90d6 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  scene.add(sea);
  // Kilau laut: beberapa bidang putih transparan (ombak) yang bergerak pelan.
  const glints = [];
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
  for (let i = 0; i < 26; i++) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(rng.range(18, 60), rng.range(3, 6)), glintMat);
    gl.rotation.x = -Math.PI / 2;
    gl.position.set(rng.range(-600, 600), 0.4, rng.range(-600, 600));
    gl.rotation.z = rng.range(0, Math.PI);
    scene.add(gl);
    glints.push(gl);
  }

  // Pulau-pulau hijau dengan pantai pasir + palem.
  const islands = [];
  const sandMat = new THREE.MeshLambertMaterial({ color: 0xf2e3b3 });
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x37a34a });
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x2c8a3e });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x1f9d4d });
  const spots = [
    [-260, -320, 95], [240, -420, 120], [-420, 120, 80], [330, 180, 105],
    [-120, 420, 90], [420, -80, 70], [-40, -560, 130], [180, 520, 85],
  ];
  for (const [x, z, r] of spots) {
    const grp = new THREE.Group();
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 4, 20), sandMat);
    sand.position.y = 1;
    grp.add(sand);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r * 0.62, r * 0.55, 14), hillMat);
    hill.position.y = 4 + r * 0.24;
    grp.add(hill);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(r * 0.3, 10, 8), grassMat);
    bush.position.set(r * 0.3, 5, r * 0.2);
    bush.scale.y = 0.6;
    grp.add(bush);
    // 2-3 palem.
    const palms = rng.int(2, 3);
    for (let i = 0; i < palms; i++) {
      const px = rng.range(-r * 0.5, r * 0.5);
      const pz = rng.range(-r * 0.5, r * 0.5);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 11, 6), trunkMat);
      trunk.position.set(px, 8, pz);
      trunk.rotation.z = rng.range(-0.12, 0.12);
      grp.add(trunk);
      for (let k = 0; k < 5; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 4), leafMat);
        const a = (k / 5) * Math.PI * 2;
        leaf.position.set(px + Math.cos(a) * 2.6, 14.2, pz + Math.sin(a) * 2.6);
        leaf.rotation.z = Math.cos(a) * 1.15;
        leaf.rotation.x = -Math.sin(a) * 1.15;
        grp.add(leaf);
      }
    }
    grp.position.set(x, 0, z);
    scene.add(grp);
    islands.push(grp);
  }

  // Awan putih: gumpalan 3-5 bola, melayang pelan. Basic (tanpa bayangan)
  // supaya selalu putih cerah dari arah mana pun.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf6fbff, transparent: true, opacity: 0.92 });
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    const grp = new THREE.Group();
    const n = rng.int(3, 5);
    for (let k = 0; k < n; k++) {
      const s = rng.range(5, 11);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), cloudMat);
      puff.position.set(k * rng.range(5, 8) - n * 3, rng.range(-1.5, 1.5), rng.range(-3, 3));
      puff.scale.y = 0.55;
      grp.add(puff);
    }
    grp.position.set(rng.range(-650, 650), rng.range(70, 150), rng.range(-650, 650));
    scene.add(grp);
    clouds.push({ grp, speed: rng.range(0.6, 1.8), phase: rng.range(0, Math.PI * 2) });
  }

  // Burung camar: garis "V" gelap yang terbang melintasi langit.
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
  const birds = [];
  for (let i = 0; i < 7; i++) {
    const grp = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.5), birdMat);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.5), birdMat);
    w1.position.x = -1.2; w1.rotation.z = 0.5;
    w2.position.x = 1.2; w2.rotation.z = -0.5;
    grp.add(w1, w2);
    grp.position.set(rng.range(-400, 400), rng.range(55, 110), rng.range(-400, 400));
    scene.add(grp);
    birds.push({ grp, speed: rng.range(6, 11), dir: rng.range(0, Math.PI * 2), flap: rng.range(0, 6) });
  }

  return {
    update(dt, t) {
      for (const cl of clouds) {
        cl.grp.position.x += cl.speed * dt;
        cl.grp.position.y += Math.sin(t * 0.3 + cl.phase) * dt * 0.4;
        if (cl.grp.position.x > 700) cl.grp.position.x = -700;
      }
      for (const gl of glints) {
        gl.material.opacity = 0.18 + 0.12 * Math.sin(t * 0.8 + gl.position.x);
      }
      for (const b of birds) {
        b.grp.position.x += Math.cos(b.dir) * b.speed * dt;
        b.grp.position.z += Math.sin(b.dir) * b.speed * dt;
        if (Math.abs(b.grp.position.x) > 650 || Math.abs(b.grp.position.z) > 650) {
          b.dir += Math.PI * (0.7 + rng.next() * 0.6);
          b.grp.position.x = THREE.MathUtils.clamp(b.grp.position.x, -600, 600);
          b.grp.position.z = THREE.MathUtils.clamp(b.grp.position.z, -600, 600);
        }
        b.grp.rotation.y = -b.dir;
        b.flap += dt * 6;
        b.grp.children[0].rotation.z = 0.5 + Math.sin(b.flap) * 0.35;
        b.grp.children[1].rotation.z = -0.5 - Math.sin(b.flap) * 0.35;
      }
    },
  };
}
