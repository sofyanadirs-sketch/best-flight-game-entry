// Pesawat low-poly livery merah-putih, baling-baling berputar, miring saat belok.
import * as THREE from 'three';

export function buildPlane() {
  const group = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xd21f3c });
  const white = new THREE.MeshLambertMaterial({ color: 0xf8f8f8 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x223344 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd8ff });
  const yellow = new THREE.MeshLambertMaterial({ color: 0xffb700 });

  // Badan: silinder + hidung kerucut + ekor meruncing.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.75, 5.6, 12), red);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.4, 12), white);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.4;
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.8, 10), red);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = 3.6;
  group.add(tail);

  // Kokpit kaca.
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), glass);
  cockpit.scale.set(1, 0.75, 1.6);
  cockpit.position.set(0, 0.85, -1.1);
  group.add(cockpit);

  // Sayap utama putih ujung merah.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.22, 2.1), white);
  wing.position.set(0, -0.15, -0.4);
  group.add(wing);
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.26, 2.1), red);
    tip.position.set(s * 5.1, -0.15, -0.4);
    group.add(tip);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 2.12), yellow);
    stripe.position.set(s * 3.4, -0.15, -0.4);
    group.add(stripe);
  }

  // Sayap ekor + sirip tegak.
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 1.2), white);
  tailWing.position.set(0, 0.15, 3.9);
  group.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 1.5), red);
  fin.position.set(0, 1.0, 4.1);
  group.add(fin);

  // Baling-baling di hidung.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), yellow);
  hub.rotation.x = -Math.PI / 2;
  hub.position.z = -0.4;
  prop.add(hub);
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.12), dark);
    blade.rotation.z = a;
    prop.add(blade);
  }
  prop.position.z = -4.2;
  group.add(prop);

  // Lampu sayap (kiri merah, kanan hijau) — titik kecil bercahaya.
  const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  lampL.position.set(-5.6, -0.15, -0.4);
  group.add(lampL);
  const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
  lampR.position.set(5.6, -0.15, -0.4);
  group.add(lampR);

  return { group, prop };
}

export function updatePlane(plane, state, dt, t) {
  // state: { pos: Vector3, heading, pitch, bank, speed, boost }
  plane.group.position.copy(state.pos);
  plane.group.rotation.order = 'YXZ';
  plane.group.rotation.y = state.heading;
  plane.group.rotation.x = state.pitch;
  plane.group.rotation.z = state.bank;
  // Baling-baling makin cepat kalau gas besar; goyangan halus saat terbang.
  const spin = 18 + state.speed * 1.1 + (state.boost ? 14 : 0);
  plane.prop.rotation.z += spin * dt;
  plane.group.position.y += Math.sin(t * 2.2) * 0.02;
}
