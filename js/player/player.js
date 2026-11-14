// Gracz z widokiem z oczu: kapsuła (Rapier KinematicCharacterController — schody, zbocza, popychanie lekkich
// przedmiotów), chodzenie WASD, bieg Shift, skok Spacja. Ręce: LPM — podnieś / odłóż (przedmiot trzymany na sprężynie
// przed kamerą, do 45 kg), PPM — rzuć, kółko — odległość trzymania.
import * as THREE from '../../vendor/three/three.module.js';
import { R, G, groups } from '../physics/world.js';

const EYE = 0.72, SPEED = 4.2, RUN = 7.0, JUMP = 4.6, MAX_LIFT = 45, REACH = 3.2;

export class Player {
  constructor(ph, items, camera, pos) {
    this.ph = ph; this.items = items; this.camera = camera;
    this.body = ph.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(...pos));
    this.collider = ph.world.createCollider(R.ColliderDesc.capsule(0.6, 0.3).setCollisionGroups(groups(G.PLAYER, G.WORLD | G.ITEM | G.VEHICLE)), this.body);
    this.cc = ph.world.createCharacterController(0.02);
    this.cc.setApplyImpulsesToDynamicBodies(true); this.cc.setCharacterMass(80);
    this.cc.enableAutostep(0.35, 0.15, false); this.cc.enableSnapToGround(0.3); this.cc.setMaxSlopeClimbAngle(50 * Math.PI / 180);
    this.yaw = 0; this.pitch = -0.05; this.vy = 0; this.held = null; this.holdDist = 1.6; this.message = ''; this.msgT = 0;
    this.active = true; this.v3 = new THREE.Vector3();
  }
  look(input, sens = 0.0022) {
    this.yaw -= input.mx * sens; this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - input.my * sens));
  }
  say(t) { this.message = t; this.msgT = 2.5; }
  eye() { const t = this.body.translation(); return new THREE.Vector3(t.x, t.y + EYE, t.z); }
  dir() { return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')); }

  step(input, dt) {
    if (!this.active) return;
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new THREE.Vector3(-f.z, 0, f.x);
    const m = new THREE.Vector3();
    if (input.key('KeyW')) m.add(f); if (input.key('KeyS')) m.sub(f); if (input.key('KeyD')) m.add(r); if (input.key('KeyA')) m.sub(r);
    if (m.lengthSq()) m.normalize().multiplyScalar(input.key('ShiftLeft') ? RUN : SPEED);
    const grounded = this.cc.computedGrounded();
    if (grounded && this.vy < 0) this.vy = -0.5;
    if (grounded && input.pressed('Space')) this.vy = JUMP;
    this.vy -= 9.81 * dt;
    const held = this.held ? this.held.body : null;
    this.cc.computeColliderMovement(this.collider, { x: m.x * dt, y: this.vy * dt, z: m.z * dt }, R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, (c) => !held || c.parent() !== held);
    const mv = this.cc.computedMovement(), t = this.body.translation();
    if (mv.y > this.vy * dt + 1e-4 && this.vy > 0) this.vy = 0;   // sufit
    this.body.setNextKinematicTranslation({ x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z });
    if (t.y < -5) this.body.setNextKinematicTranslation({ x: 0, y: 2, z: 30 });   // bezpiecznik: spadł pod świat
    this.hands(input, dt);
  }

  /** Promień z oczu: pierwszy trafiony przedmiot (do REACH m). */
  aim(maxDist = REACH) {
    const o = this.eye(), d = this.dir();
    const hit = this.ph.world.castRay(new R.Ray(o, d), maxDist, true, undefined, groups(G.PLAYER, G.ITEM | G.WORLD | G.VEHICLE), undefined, this.body);
    if (!hit) return null;
    return { item: this.items.fromCollider(hit.collider), dist: hit.timeOfImpact ?? hit.toi, collider: hit.collider };
  }

  grab(it) {
    if (it.mass > MAX_LIFT) { this.say(`Za ciężkie (${it.mass.toFixed(0)} kg) — użyj pojazdu z chwytakiem`); return; }
    this.held = it; it.held = true;
    it.body.setGravityScale(0, true); it.body.setAngularDamping(4); it.body.setLinearDamping(2);
    for (let i = 0; i < it.body.numColliders(); i++) it.body.collider(i).setCollisionGroups(groups(G.HELD, G.WORLD | G.ITEM | G.VEHICLE));
  }
  drop(throwIt = false) {
    const it = this.held; if (!it) return;
    this.held = null; it.held = false;
    if (!it.removed) {
      it.body.setGravityScale(1, true); it.body.setAngularDamping(0.15); it.body.setLinearDamping(0.05);
      for (let i = 0; i < it.body.numColliders(); i++) it.body.collider(i).setCollisionGroups(groups(G.ITEM, G.WORLD | G.ITEM | G.PLAYER | G.VEHICLE | G.HELD));
      if (throwIt) { const v = this.dir().multiplyScalar(Math.min(9, 60 / Math.max(it.mass, 1) + 3)); it.body.setLinvel(v, true); }
    }
  }
  hands(input, dt) {
    if (this.held && this.held.removed) this.held = null;
    if (input.wheel) this.holdDist = Math.max(1.0, Math.min(2.6, this.holdDist - input.wheel * 0.15));
    if (input.click[0]) {
      if (this.held) this.drop(false);
      else { const a = this.aim(); if (a && a.item) this.grab(a.item); }
    }
    if (input.click[2] && this.held) this.drop(true);
    const it = this.held;
    if (!it) return;
    // sprężyna do punktu przed oczami; trzymany przedmiot nie obraca się sam
    const target = this.eye().add(this.dir().multiplyScalar(this.holdDist + this.items.halfExtents(it).reduce((a, b) => Math.max(a, b), 0) * 0.6));
    const p = it.body.translation(), d = this.v3.set(target.x - p.x, target.y - p.y, target.z - p.z);
    if (d.length() > 2.5) { this.drop(false); return; }
    const k = Math.min(1, 25 / Math.max(it.mass, 1)) * 14;
    const v = d.multiplyScalar(k); if (v.length() > 12) v.setLength(12);
    it.body.setLinvel(v, true);
    const w = it.body.angvel(); it.body.setAngvel({ x: w.x * 0.85, y: w.y * 0.85, z: w.z * 0.85 }, true);
  }
  updateCamera() {
    const e = this.eye(); this.camera.position.copy(e);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
