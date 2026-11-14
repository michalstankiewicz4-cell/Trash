// Wysypisko: grunt, ogrodzenie, platforma z maszynami, linia odlewnicza, punkt skupu, pojazd. Rozstawienie w świecie
// (metry, środek placu w (0,0,0), brama od strony +z) i zderzacze statyczne wszystkich modeli.
import * as THREE from '../../vendor/three/three.module.js';
import { uvMeters } from '../models/geom.js';
import { mat } from '../models/materials.js';
import * as platform from '../models/world/platform.js';
import * as fence from '../models/world/fence.js';
import * as buyback from '../models/world/buyback.js';
import * as furnaceM from '../models/machines/furnace-paper.js';
import * as canC from '../models/machines/can-crusher.js';
import * as metalC from '../models/machines/metal-crusher.js';
import * as induction from '../models/machines/induction-furnace.js';
import * as casting from '../models/machines/casting-line.js';

const T = platform.TOP;
export const PLACES = {
  furnace: { pos: [-9.6, T, -5.6], rotY: 0 },
  canCrusher: { pos: [-2.6, T, -6.4], rotY: 0 },
  metalCrusher: { pos: [6.4, T, -4.6], rotY: 0 },
  induction: { pos: [-7.5, T, 2.4], rotY: 0 },
  buyback: { pos: [-12, 0, 33], rotY: 0 },
  truck: { pos: [11, 0.05, 19], rotY: 0 },   // przodem do wolnego placu przy bramie (rampa na platformę: x = 0)
  player: [2, 1.2, 31],
};
PLACES.casting = { pos: [PLACES.induction.pos[0], T, PLACES.induction.pos[2] + 0.62], rotY: 0 };

export function buildYard(scene, ph) {
  const out = {};
  // grunt: ubita ziemia (MatKit), 260 × 260 m
  const g = new THREE.PlaneGeometry(260, 260, 1, 1); g.rotateX(-Math.PI / 2); uvMeters(g, 1);
  const ground = new THREE.Mesh(g, mat('dirt')); ground.receiveShadow = true; scene.add(ground);
  ph.addStatic([{ kind: 'box', half: [130, 0.5, 130], at: [0, -0.5, 0] }]);
  const add = (mod, place, key) => {
    const m = mod.build(0); m.position.set(...place.pos); m.rotation.y = place.rotY || 0; scene.add(m);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (mod.colliders) ph.addStatic(mod.colliders(), place.pos, place.rotY || 0);
    out[key] = m; return m;
  };
  add(platform, { pos: [0, 0, 0] }, 'platform');
  add(fence, { pos: [0, 0, 0] }, 'fence');
  add(buyback, PLACES.buyback, 'buyback');
  add(furnaceM, PLACES.furnace, 'furnace');
  add(canC, PLACES.canCrusher, 'canCrusher');
  add(metalC, PLACES.metalCrusher, 'metalCrusher');
  add(induction, PLACES.induction, 'induction');
  add(casting, PLACES.casting, 'casting');
  scene.updateMatrixWorld(true);
  out.layouts = { furnace: furnaceM.LAYOUT, canCrusher: canC.LAYOUT, metalCrusher: metalC.LAYOUT, induction: induction.LAYOUT, casting: casting.LAYOUT, buyback: buyback.LAYOUT };
  out.crucibleColliders = induction.crucibleColliders();
  return out;
}

/** Punkt modelu w świecie (np. przycisk z LAYOUT). */
export function worldPoint(root, p) { root.updateMatrixWorld(true); return new THREE.Vector3(...p).applyMatrix4(root.matrixWorld); }
