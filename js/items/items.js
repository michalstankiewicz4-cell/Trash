// Przedmioty w grze: ciało fizyczne + rodzaj, wariant, skala (zgniecenie w 3 osiach), temperatura.
// Zgniecenie zmienia skalę wzdłuż lokalnej osi i przebudowuje zderzacz (masa bez zmian).
import * as THREE from '../../vendor/three/three.module.js';
import { KINDS, METALS } from './catalog.js';

let nextId = 1;
export class Items {
  constructor(physics) {
    this.ph = physics; this.list = []; this.byCollider = new Map();
  }
  info(kind) { return KINDS[kind].mod.info; }
  spawn(kind, variant, pos, quat = { x: 0, y: 0, z: 0, w: 1 }, scale = [1, 1, 1], extra = {}) {
    const info = this.info(kind);
    const body = this.ph.itemBody(info, pos, quat, scale, extra);
    const it = { id: nextId++, kind, variant, body, scale: scale.slice(), heat: 0, temp: 20, mass: extra.mass ?? info.mass, metalMix: extra.metalMix || null };
    this.list.push(it); this.index(it);
    return it;
  }
  index(it) { for (let i = 0; i < it.body.numColliders(); i++) this.byCollider.set(it.body.collider(i).handle, it); }
  unindex(it) { for (let i = 0; i < it.body.numColliders(); i++) this.byCollider.delete(it.body.collider(i).handle); }
  fromCollider(c) { return c ? this.byCollider.get(c.handle) : null; }
  remove(it) {
    this.unindex(it);
    this.ph.world.removeRigidBody(it.body);
    const i = this.list.indexOf(it); if (i >= 0) this.list.splice(i, 1);
    it.removed = true;
  }
  setScale(it, scale) {
    this.unindex(it);
    this.ph.removeColliders(it.body);
    it.scale = scale.slice();
    this.ph.itemColliders(it.body, this.info(it.kind), it.scale, { mass: it.mass });
    this.index(it);
    it.body.wakeUp();
  }
  /** Zamiana rodzaju (np. cała puszka → zgnieciona) w tym samym miejscu; oś Y nowego modelu wzdłuż `axisUp` (świat). */
  replace(it, kind, axisUp = null) {
    const t = it.body.translation(), v = it.variant % (this.info(kind).variants || 1);
    let q = it.body.rotation();
    if (axisUp) { const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axisUp); q = { x: qq.x, y: qq.y, z: qq.z, w: qq.w }; }
    this.remove(it);
    return this.spawn(kind, v, [t.x, t.y, t.z], q, [1, 1, 1], { mass: it.mass });
  }
  /** Metal przedmiotu (do pieca indukcyjnego) i jego temperatura topnienia. */
  metal(it) { const m = KINDS[it.kind].metal; return m ? { id: m, ...METALS[m] } : null; }
  /** Półwymiary przedmiotu w jego układzie (ze zderzacza i skali) — do zgniatarek. */
  halfExtents(it) {
    const c = this.info(it.kind).collider, s = it.scale;
    let h;
    if (c.type === 'ring') h = [c.rOut, c.h / 2, c.rOut];
    else if (c.type === 'cyl' || c.type === 'cup') h = [c.r, c.h / 2, c.r];
    else if (c.type === 'box') h = c.size.map((x) => x / 2);
    else { const p = c.hulls[0]; h = [0, 0, 0]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) h[k] = Math.max(h[k], Math.abs(p[i + k])); }
    return [h[0] * s[0], h[1] * s[1], h[2] * s[2]];
  }
}
