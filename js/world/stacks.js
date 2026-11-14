// Stosy na wysypisku: po 20 sztuk każdego rodzaju (ułożone jak na składowisku) i jeden, największy stos mieszany —
// po 20 sztuk z każdego rodzaju w losowej kolejności. Przed startem fizyka układa stosy (kilka sekund symulacji przy ładowaniu).
import * as THREE from '../../vendor/three/three.module.js';
import { STACK_KINDS, variantsOf } from '../items/catalog.js';

const qFlat = { x: 0, y: 0, z: 0, w: 1 };
const qSide = (yaw = 0) => { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, yaw, 0)); return { x: q.x, y: q.y, z: q.z, w: q.w }; };
const qRand = (r) => { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28)); return { x: q.x, y: q.y, z: q.z, w: q.w }; };
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// miejsca stosów (wokół platformy, na gruncie)
export const STACK_SPOTS = {
  'tire-car': [-20, -14], 'tire-bike': [-21, 0], 'tire-tractor': [-22, 14], can: [20, -14], 'can-crushed': [21, 0],
  pot: [20, 13], newspapers: [-6, -18], box: [6, -18], barrel: [18, 25], mixed: [-3, 24],
};

/** Pozycje 20 sztuk danego rodzaju (stos uporządkowany wg kształtu). */
function layout(kind, r) {
  const out = [];
  const grid = (nx, nz, ny, dx, dz, dy, y0, q = () => qFlat, jit = 0.02) => {
    for (let y = 0; y < ny; y++) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (out.length < 20)
      out.push([(i - (nx - 1) / 2) * dx + (r() - 0.5) * jit, y0 + y * dy, (j - (nz - 1) / 2) * dz + (r() - 0.5) * jit, q()]);
  };
  switch (kind) {
    case 'tire-car': grid(2, 2, 5, 0.7, 0.7, 0.215, 0.11); break;                 // kolumny po 5, leżące
    case 'tire-bike': grid(2, 1, 10, 0.75, 0.75, 0.04, 0.02); break;
    case 'tire-tractor': grid(2, 2, 5, 1.85, 1.85, 0.48, 0.24); break;
    case 'can': case 'can-crushed': for (let k = 0; k < 20; k++) out.push([(r() - 0.5) * 0.5, 0.06 + k * 0.05, (r() - 0.5) * 0.5, qRand(r)]); break;   // kupka
    case 'pot': grid(3, 3, 3, 0.36, 0.36, 0.16, 0.08); break;
    case 'newspapers': grid(2, 2, 5, 0.45, 0.33, 0.228, 0.115, () => qFlat, 0.03); break;
    case 'box': grid(2, 2, 5, 0.42, 0.32, 0.305, 0.155, () => qFlat, 0.02); break;
    case 'barrel': grid(4, 5, 1, 0.62, 0.62, 0.9, 0.45); break;
  }
  return out;
}

export function spawnStacks(items) {
  const r = rng(12345);
  for (const kind of STACK_KINDS) {
    const [cx, cz] = STACK_SPOTS[kind];
    for (const [x, y, z, q] of layout(kind, r)) items.spawn(kind, (r() * variantsOf(kind)) | 0, [cx + x, y, cz + z], q);
  }
  // stos mieszany: po 20 z każdego rodzaju w losowej kolejności — zwracany jako kolejka do zrzucania po jednym
  // (main.js zrzuca je z wysokości przy ładowaniu, więc tworzą naturalną kupę zamiast wybuchać przy nakładaniu)
  const list = [];
  for (const kind of STACK_KINDS) for (let i = 0; i < 20; i++) list.push(kind);
  for (let i = list.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; }
  const [mx, mz] = STACK_SPOTS.mixed;
  return list.map((kind) => {
    const a = r() * 6.283, d = Math.sqrt(r()) * 2.4;
    return { kind, variant: (r() * variantsOf(kind)) | 0, pos: [mx + Math.cos(a) * d, 5.5, mz + Math.sin(a) * d], q: qRand(r) };
  });
}
