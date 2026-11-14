// Przeładowarka z chwytakiem — fizyka: podwozie to ciało dynamiczne (18 t) z kontrolerem pojazdu Rapier (4 koła na
// zawieszeniu, napęd, skręt przednich kół, hamulec). Nadwozie, wysięgnik i ramię są kinematyczne (hydraulika — sztywna)
// i liczone z położenia podwozia oraz kątów. Chwytak wisi swobodnie na przegubie kulowym pod końcem ramienia (ciało
// dynamiczne), a 4 szczęki są ciałami dynamicznymi na zawiasach z silnikami położenia — chwytają przedmioty siłą.
// Sterowanie w kabinie: W/S jazda, A/D skręt, ←/→ obrót nadwozia, ↑/↓ wysięgnik, R/F ramię, Spacja chwytak, E wyjście.
import * as THREE from '../../vendor/three/three.module.js';
import { R, G, groups } from '../physics/world.js';
import { LAYOUT } from '../models/vehicle/grapple-truck.js';

const ARM = groups(G.VEHICLE, G.ITEM | G.PLAYER | G.HELD);          // kinematyczne nadwozie i ramię: nie ruszają podwozia
const GRAB = groups(G.VEHICLE, G.ITEM | G.WORLD | G.PLAYER | G.HELD); // chwytak i szczęki

export class Truck {
  constructor(ph, scene, model, pos, rotY = 0) {
    this.ph = ph; this.model = model; scene.add(model);
    model.position.set(...pos); model.rotation.y = rotY; model.updateMatrixWorld(true);
    const W = ph.world, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0));
    this.chassisG = model.getObjectByName('podwozie'); this.upperG = model.getObjectByName('nadwozie');
    this.boomG = model.getObjectByName('wysięgnik'); this.stickG = model.getObjectByName('ramię');
    this.grabG = model.getObjectByName('chwytak'); this.wheelsG = [0, 1, 2, 3].map((i) => model.getObjectByName('koło ' + i));
    this.slew = 0; this.boom = 0.55; this.stick = 1.35; this.closed = false; this.steer = 0;
    // ugięcie pod ciężarem: kąty ugięcia wysięgnika i ramienia (rad) z prędkościami (układ sprężysty z tłumieniem)
    this.sagB = 0; this.vB = 0; this.sagS = 0; this.vS = 0; this.payload = 0; this.items = null; this.loadT = 0; this.heldItems = [];
    // podwozie
    this.body = W.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...pos).setRotation(q).setLinearDamping(0.1).setAngularDamping(0.6).setCanSleep(false));
    const c = LAYOUT.chassis;
    W.createCollider(R.ColliderDesc.cuboid(...c.half).setTranslation(...c.at).setMass(12000).setFriction(0.5).setCollisionGroups(groups(G.VEHICLE, G.WORLD | G.ITEM | G.PLAYER | G.HELD)), this.body);
    W.createCollider(R.ColliderDesc.cuboid(1.2, 0.5, 1.6).setTranslation(0, 2.1, -0.8).setMass(6000).setCollisionGroups(groups(G.VEHICLE, G.WORLD | G.ITEM | G.PLAYER)), this.body);
    this.vc = W.createVehicleController(this.body);
    this.vc.indexUpAxis = 1; this.vc.setIndexForwardAxis = 2;
    const rest = 0.32;
    LAYOUT.wheels.forEach(([x, y, z], i) => {
      this.vc.addWheel({ x, y: y + rest, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, rest, LAYOUT.wheelRadius);
      this.vc.setWheelSuspensionStiffness(i, 60); this.vc.setWheelMaxSuspensionForce(i, 200000); this.vc.setWheelFrictionSlip(i, 2.2);
      this.vc.setWheelSuspensionCompression(i, 4.4); this.vc.setWheelSuspensionRelaxation(i, 2.3); this.vc.setWheelSideFrictionStiffness(i, 1.2);
    });
    this.rest = rest;
    // nadwozie, wysięgnik, ramię — kinematyczne
    const kin = () => W.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    this.upperB = kin(); W.createCollider(R.ColliderDesc.cuboid(1.2, 0.6, 1.9).setTranslation(0, 0.65, -0.6).setCollisionGroups(ARM), this.upperB);
    this.boomB = kin(); W.createCollider(R.ColliderDesc.cuboid(0.26, 0.3, LAYOUT.boomLen / 2 + 0.2).setTranslation(0, 0.15, LAYOUT.boomLen / 2).setCollisionGroups(ARM), this.boomB);
    this.stickB = kin(); W.createCollider(R.ColliderDesc.cuboid(0.19, 0.22, LAYOUT.stickLen / 2 + 0.2).setTranslation(0, 0.02, LAYOUT.stickLen / 2 - 0.1).setCollisionGroups(ARM), this.stickB);
    this.poseArm(true);
    // chwytak: odczep od ramienia do sceny, ciało dynamiczne zawieszone przegubem kulowym
    this.grabG.updateMatrixWorld(true);
    const gw = new THREE.Vector3(), gq = new THREE.Quaternion(); this.grabG.matrixWorld.decompose(gw, gq, new THREE.Vector3());
    const jawWorld = [0, 1, 2, 3].map((k) => { const j = this.grabG.getObjectByName('szczęka ' + k); j.rotation.x = 0; j.updateMatrixWorld(true); const p = new THREE.Vector3(), r = new THREE.Quaternion(); j.matrixWorld.decompose(p, r, new THREE.Vector3()); return { j, p, r }; });
    scene.attach(this.grabG);
    this.grabB = W.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(gw.x, gw.y, gw.z).setRotation(gq).setAngularDamping(3).setLinearDamping(0.4));
    W.createCollider(R.ColliderDesc.cylinder(0.2, 0.32).setTranslation(0, -LAYOUT.grappleHang + 0.05, 0).setMass(450).setCollisionGroups(GRAB), this.grabB);
    W.createCollider(R.ColliderDesc.cylinder(0.25, 0.2).setTranslation(0, -0.3, 0).setMass(150).setCollisionGroups(GRAB), this.grabB);
    W.createImpulseJoint(R.JointData.spherical({ x: 0, y: 0, z: LAYOUT.stickLen }, { x: 0, y: 0, z: 0 }), this.stickB, this.grabB, true);
    // szczęki: zawiasy z silnikami położenia
    this.jaws = jawWorld.map(({ j, p, r }, k) => {
      scene.attach(j);
      const b = W.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation(r).setAngularDamping(1).setCcdEnabled(true));
      for (const pts of jawHulls()) W.createCollider(R.ColliderDesc.convexHull(pts).setMass(25).setFriction(1.0).setCollisionGroups(GRAB), b);
      const a = k * Math.PI / 2, hinge = { x: Math.sin(a) * LAYOUT.jawHinge, y: -LAYOUT.grappleHang, z: Math.cos(a) * LAYOUT.jawHinge };
      const axis = { x: Math.cos(a), y: 0, z: -Math.sin(a) };
      const jd = R.JointData.revoluteWithAxes(hinge, { x: 0, y: 0, z: 0 }, axis, { x: 1, y: 0, z: 0 });   // kąt 0 = szczęka jak w modelu z rotation.x = 0
      const joint = W.createImpulseJoint(jd, this.grabB, b, true);
      joint.setLimits(LAYOUT.jawOpen - 0.1, LAYOUT.jawClosed + 0.12);
      joint.configureMotorModel(R.MotorModel.ForceBased);
      joint.configureMotorPosition(LAYOUT.jawOpen, 9000, 900);
      joint.setContactsEnabled(false);
      return { g: j, b, joint, sign: 1 };
    });
    this.eyeLocal = new THREE.Vector3(...LAYOUT.eye).sub(new THREE.Vector3(...LAYOUT.slew));
    // widoczne ugięcie: wysięgnik i ramię wyginają się w łuk (shader, końce na swoim miejscu)
    const meshOf = (g, n) => g.children.find((c) => c.isMesh && c.name === n);   // część o tej samej nazwie co grupa
    this.bowB = bowMaterial(meshOf(this.boomG, 'wysięgnik'), LAYOUT.boomLen);
    this.bowS = bowMaterial(meshOf(this.stickG, 'ramię'), LAYOUT.stickLen);
    this.setJaws(false);
  }
  setJaws(closed) {
    this.closed = closed;
    // dodatni kąt zamyka szczękę (końcówka idzie do środka chwytaka)
    for (const j of this.jaws) j.joint.configureMotorPosition(closed ? LAYOUT.jawClosed : LAYOUT.jawOpen, closed ? 60000 : 12000, closed ? 3000 : 1200);
  }
  poseArm(now = false) {
    // grupy modelu (dzieci podwozia — wizualnie) i ciała kinematyczne (świat); ugięcie obniża wysięgnik i ramię
    this.upperG.rotation.y = this.slew; this.boomG.rotation.x = -(this.boom - this.sagB); this.stickG.rotation.x = this.stick + this.sagS;
    if (this.bowB) { this.bowB.value = this.sagB * LAYOUT.boomLen * 0.35; this.bowS.value = this.sagS * LAYOUT.stickLen * 0.35; }
    this.model.updateMatrixWorld(true);
    for (const [g, b] of [[this.upperG, this.upperB], [this.boomG, this.boomB], [this.stickG, this.stickB]]) {
      const p = new THREE.Vector3(), q = new THREE.Quaternion(); g.matrixWorld.decompose(p, q, new THREE.Vector3());
      if (now) { b.setTranslation(p, true); b.setRotation(q, true); }
      b.setNextKinematicTranslation(p); b.setNextKinematicRotation(q);
    }
  }
  step(dt, input, driving) {
    let eng = 0, brake = 0;
    if (driving) {
      const v = this.vc.currentVehicleSpeed();
      if (input.key('KeyW')) eng = v < -0.3 ? 0 : 26000; if (input.key('KeyS')) eng = v > 0.3 ? 0 : -18000;
      if ((input.key('KeyW') && v < -0.3) || (input.key('KeyS') && v > 0.3)) brake = 400;
      const st = (input.key('KeyA') ? 1 : 0) - (input.key('KeyD') ? 1 : 0);
      this.steer += (st * 0.55 - this.steer) * Math.min(1, dt * 3);
      if (input.key('ArrowLeft')) this.slew += 0.5 * dt; if (input.key('ArrowRight')) this.slew -= 0.5 * dt;
      if (input.key('ArrowUp')) this.boom = Math.min(1.25, this.boom + 0.35 * dt); if (input.key('ArrowDown')) this.boom = Math.max(-0.25, this.boom - 0.35 * dt);
      if (input.key('KeyR')) this.stick = Math.max(0.6, this.stick - 0.45 * dt); if (input.key('KeyF')) this.stick = Math.min(2.6, this.stick + 0.45 * dt);
      if (input.pressed('Space') || input.click[0]) this.setJaws(!this.closed);
    } else brake = 300;
    if (!eng && !brake) brake = 40;
    for (let i = 0; i < 4; i++) { this.vc.setWheelEngineForce(i, eng / 4); this.vc.setWheelBrake(i, brake); this.vc.setWheelSteering(i, i < 2 ? this.steer : 0); }
    this.vc.updateVehicle(dt);
    this.deflect(dt);
    this.poseArm();
  }
  /**
   * Ugięcie wysięgnika i ramienia pod ciężarem: ładunek = przedmioty trzymane w szczękach (dotykają szczęki i wiszą
   * w powietrzu). Moment od ładunku (ramię siły = odległość w poziomie od sworznia) × podatność daje kąt ugięcia;
   * kąt dochodzi do niego jak sprężyna z tłumieniem (ramię lekko się buja przy podniesieniu i upuszczeniu).
   * Ciężar chwytaka i ładunku działa też na podwozie (siła w końcu ramienia) — maszyna przechyla się z ciężarem.
   */
  deflect(dt) {
    if (this.items && (this.loadT -= dt) <= 0) { this.loadT = 0.1; this.measure(); }
    const g = 9.81, F = this.payload * g;
    this.boomG.updateMatrixWorld(true); this.stickG.updateMatrixWorld(true);
    const pb = new THREE.Vector3().setFromMatrixPosition(this.boomG.matrixWorld), ps = new THREE.Vector3().setFromMatrixPosition(this.stickG.matrixWorld);
    const tip = new THREE.Vector3(0, 0, LAYOUT.stickLen).applyMatrix4(this.stickG.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.upperQuat()); fwd.y = 0; fwd.normalize();
    const rb = tip.clone().sub(pb).dot(fwd), rs = tip.clone().sub(ps).dot(fwd);   // ramiona siły (w poziomie, do przodu +)
    const CB = 2.6e-7, CS = 3.5e-7;                                                // podatność [rad / (N·m)]
    const tb = F * rb * CB, ts = F * rs * CS, w = 2 * Math.PI * 1.6, z = 0.12;
    this.vB += (w * w * (tb - this.sagB) - 2 * z * w * this.vB) * dt; this.sagB += this.vB * dt;
    this.vS += (w * w * (ts - this.sagS) - 2 * z * w * this.vS) * dt; this.sagS += this.vS * dt;
    // ciężar chwytaka (~700 kg) i ładunku na podwoziu — w punkcie zawieszenia chwytaka
    this.body.resetForces(true);
    this.body.addForceAtPoint({ x: 0, y: -(700 + this.payload) * g, z: 0 }, tip, true);
  }
  /** Przedmioty w szczękach: dotykają szczęki lub głowicy i nie leżą na niczym poniżej (promień w dół). */
  measure() {
    const W = this.ph.world, mine = new Set([this.grabB.handle, ...this.jaws.map((j) => j.b.handle)]), found = new Set();
    const cols = [];
    for (const b of [this.grabB, ...this.jaws.map((j) => j.b)]) for (let i = 0; i < b.numColliders(); i++) cols.push(b.collider(i));
    for (const c of cols) W.contactPairsWith(c, (o) => { const it = this.items.fromCollider(o); if (it) found.add(it); });
    let m = 0; this.heldItems = [];
    for (const it of found) {
      const t = it.body.translation(), h = this.items.halfExtents(it), down = Math.max(...h) + 0.12;
      const hit = W.castRay(new R.Ray(t, { x: 0, y: -1, z: 0 }), down, true, undefined, undefined, undefined, it.body, (c) => !mine.has(c.parent()?.handle) && !found.has(this.items.fromCollider(c)));
      if (!hit && this.closed) { m += it.mass; this.heldItems.push(it); }
    }
    this.payload = m;
  }
  /** Po kroku fizyki: grupy modelu z ciał (podwozie, koła, chwytak, szczęki). */
  sync() {
    const t = this.body.translation(), r = this.body.rotation();
    this.model.position.set(t.x, t.y, t.z); this.model.quaternion.set(r.x, r.y, r.z, r.w);
    LAYOUT.wheels.forEach(([x, y, z], i) => {
      const w = this.wheelsG[i], s = this.vc.wheelSuspensionLength(i) ?? this.rest;
      w.position.set(x, y + this.rest - s, z);
      w.rotation.set(this.vc.wheelRotation(i) || 0, i < 2 ? this.steer : 0, 0, 'YXZ');
    });
    const set = (g, b) => { const p = b.translation(), q = b.rotation(); g.position.set(p.x, p.y, p.z); g.quaternion.set(q.x, q.y, q.z, q.w); };
    set(this.grabG, this.grabB); this.jaws.forEach((j) => set(j.g, j.b));
    this.poseArm();
  }
  eyeWorld() { this.upperG.updateMatrixWorld(true); return this.eyeLocal.clone().applyMatrix4(this.upperG.matrixWorld); }
  upperCenter() { this.upperG.updateMatrixWorld(true); return new THREE.Vector3(0, 1.2, 1.5).applyMatrix4(this.upperG.matrixWorld); }
  grabCenter() { const p = this.grabB.translation(); return new THREE.Vector3(p.x, p.y - LAYOUT.grappleHang - 0.4, p.z); }
  cabWorld() { return this.eyeWorld().add(new THREE.Vector3(0, -2.2, 0)); }
  upperQuat() { return new THREE.Quaternion().setFromRotationMatrix(this.upperG.matrixWorld); }
}

/** Kopia materiału części z wygięciem w łuk wzdłuż osi z (0…L): przesunięcie w dół 4·u·(1−u)·uBow. */
function bowMaterial(mesh, L) {
  const u = { value: 0 }, m = mesh.material.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBow = u; sh.uniforms.uLen = { value: L };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uBow; uniform float uLen;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat bu = clamp(transformed.z / uLen, 0.0, 1.0); transformed.y -= 4.0 * bu * (1.0 - bu) * uBow;');
  };
  m.customProgramCacheKey = () => 'bow-' + L;
  mesh.material = m;
  return u;
}

/** Zderzacze szczęki: 3 bryły wypukłe wzdłuż łuku (jak w modelu: jawGeometry). */
function jawHulls() {
  const R0 = 0.95, out = [], seg = [[0, 0.4], [0.35, 0.72], [0.68, 1]];
  for (const [a, b] of seg) {
    const pts = [];
    for (const t of [a, (a + b) / 2, b]) {
      const ph = 0.05 + t * 1.45, y = -R0 * Math.sin(ph), z = R0 * (Math.cos(ph) - 1) * 0.55, w = 0.5 * (1 - t) + 0.035;
      for (const sx of [-1, 1]) for (const dz of [-0.03, 0.03]) pts.push(sx * w / 2, y, z + dz);
    }
    out.push(new Float32Array(pts));
  }
  return out;
}
