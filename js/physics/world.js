// Świat fizyki (Rapier, WASM): stały krok 1/60 s, grawitacja, zderzacze statyczne z opisów modeli, ciała przedmiotów.
// Wszystko na CPU w WASM (szybkie), ciała śpią, gdy się nie ruszają — 300+ przedmiotów bez obciążenia.
import RAPIER from '../../vendor/rapier/rapier.mjs';
import * as THREE from '../../vendor/three/three.module.js';
import { shapeParts } from './shapes.js';

export const STEP = 1 / 60;
export let R = null;           // moduł Rapier po init

// grupy kolizji (16 bitów przynależność | 16 bitów z kim): świat, przedmioty, gracz, pojazd
export const G = { WORLD: 0x0001, ITEM: 0x0002, PLAYER: 0x0004, VEHICLE: 0x0008, HELD: 0x0010 };
export const groups = (member, filter) => (member << 16) | filter;

export class Physics {
  static async create() {
    await RAPIER.init();
    R = RAPIER;
    return new Physics();
  }
  constructor() {
    this.world = new R.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP;
    this.world.integrationParameters.numSolverIterations = 6;
    this.events = new R.EventQueue(true);
    this.q = new THREE.Quaternion(); this.e = new THREE.Euler();
  }
  step() { this.world.step(this.events); }

  /**
   * Zderzacze statyczne z opisu modelu: [{ kind: 'box', half, at, rot? } | { kind: 'hull', points } | { kind: 'cyl', r, h, at }]
   * w układzie modelu, ustawionego w świecie w (pos, rotY). Zwraca ciało.
   */
  addStatic(list, pos = [0, 0, 0], rotY = 0, body = null) {
    const b = body || this.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(...pos).setRotation(this.quatY(rotY)));
    for (const c of list) this.world.createCollider(this.colliderDesc(c).setCollisionGroups(groups(G.WORLD, 0xffff)).setFriction(0.8), b);
    return b;
  }
  colliderDesc(c) {
    let d;
    if (c.kind === 'box') d = R.ColliderDesc.cuboid(...c.half);
    else if (c.kind === 'cyl') d = R.ColliderDesc.cylinder(c.h / 2, c.r);
    else d = R.ColliderDesc.convexHull(c.points instanceof Float32Array ? c.points : new Float32Array(c.points));
    if (c.at) d.setTranslation(...c.at);
    if (c.rot) { this.e.set(...c.rot); this.q.setFromEuler(this.e); d.setRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w }); }
    return d;
  }
  quatY(a) { return { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }; }

  /** Ciało przedmiotu z opisu zderzacza i skali (zgniecenie). Masa rozdzielona na części. */
  itemBody(info, pos, quat, scale = [1, 1, 1], extra = {}) {
    const bd = R.RigidBodyDesc.dynamic().setTranslation(...pos).setRotation(quat).setLinearDamping(0.05).setAngularDamping(0.15)
      .setCcdEnabled(info.mass < 0.5);
    const body = this.world.createRigidBody(bd);
    this.itemColliders(body, info, scale, extra);
    return body;
  }
  itemColliders(body, info, scale, extra = {}) {
    const parts = shapeParts(info.collider, scale);
    const mass = (extra.mass ?? info.mass) / parts.length;
    const rubber = info.material === 'guma';
    const out = [];
    for (const p of parts) {
      let d = p.kind === 'box' ? R.ColliderDesc.cuboid(...p.half).setTranslation(...p.at) : R.ColliderDesc.convexHull(p.points);
      if (!d) continue;
      d.setMass(mass).setFriction(rubber ? 0.9 : 0.55).setRestitution(rubber ? 0.25 : 0.05)
        .setCollisionGroups(groups(G.ITEM, G.WORLD | G.ITEM | G.PLAYER | G.VEHICLE | G.HELD));
      out.push(this.world.createCollider(d, body));
    }
    return out;
  }
  removeColliders(body) { for (let i = body.numColliders() - 1; i >= 0; i--) this.world.removeCollider(body.collider(i), false); }
}
