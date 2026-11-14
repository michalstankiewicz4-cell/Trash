// Złomowisko — start gry: fizyka, renderer, świat, stosy, maszyny, gracz, pojazd, pętla (stały krok fizyki 60 Hz).
import * as THREE from '../vendor/three/three.module.js';
import { VERSION } from './version.js';
import { Physics, STEP } from './physics/world.js';
import { createRenderer } from './render/renderer.js';
import { applyTextures } from './render/textures.js';
import { ItemRenderer } from './render/instancing.js';
import { LIQUID_TIME } from './render/lava.js';
import { Items } from './items/items.js';
import { buildYard, worldPoint, PLACES } from './world/yard.js';
import { spawnStacks } from './world/stacks.js';
import { Input } from './core/input.js';
import { Player } from './player/player.js';
import { Crusher } from './machines/crusher.js';
import { PaperFurnace } from './machines/furnace.js';
import { InductionFurnace } from './machines/induction.js';
import { MetalFlow } from './machines/metal-flow.js';
import { Casting } from './machines/casting.js';
import { Buyback } from './machines/buyback.js';
import { Truck } from './vehicle/truck.js';
import { build as buildTruck } from './models/vehicle/grapple-truck.js';
import { HitboxView } from './render/hitboxes.js';

const $ = (id) => document.getElementById(id);
const fmtZl = (v) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
$('ver').textContent = $('menuVer').textContent = 'v' + VERSION;
const progress = (f, t) => { $('loadBar').firstElementChild.style.width = (f * 100).toFixed(0) + '%'; $('loadTxt').textContent = t; return new Promise((r) => setTimeout(r, 0)); };

async function main() {
  await progress(0.05, 'Fizyka…');
  const ph = await Physics.create();
  const { renderer, scene, camera, followShadow } = createRenderer($('c'));
  await progress(0.15, 'Wysypisko…');
  const yard = buildYard(scene, ph);
  await progress(0.3, 'Tekstury…');
  applyTextures();
  const items = new Items(ph);
  await progress(0.4, 'Przedmioty…');
  const view = new ItemRenderer(scene, (kind) => (kind === 'ingot' ? 64 : kind.startsWith('can') ? 160 : 60));
  const mixed = spawnStacks(items);
  await progress(0.5, 'Maszyny…');
  const L = yard.layouts;
  const canCrusher = new Crusher({ name: 'Zgniatarka do puszek', ph, items, root: yard.canCrusher, layout: L.canCrusher, axis: 'x', ramGroup: yard.canCrusher.getObjectByName('tłok'), doorGroup: yard.canCrusher.getObjectByName('zasuwa'), eject: true, wall: L.canCrusher.door.x - L.canCrusher.door.size[0] / 2 });
  const metalCrusher = new Crusher({ name: 'Zgniatarka do metalu', ph, items, root: yard.metalCrusher, layout: L.metalCrusher, axis: '-y', ramGroup: yard.metalCrusher.getObjectByName('płyta dociskowa'), doorGroup: yard.metalCrusher.getObjectByName('brama'), eject: false, wall: -(L.metalCrusher.chamber.center[1] - L.metalCrusher.chamber.half[1] + 0.06) });
  const furnace = new PaperFurnace(scene, items, yard.furnace, L.furnace);
  const flow = new MetalFlow(scene, yard.casting, L.casting);
  const induction = new InductionFurnace(ph, items, yard.induction, L.induction, yard.crucibleColliders);
  const casting = new Casting(scene, items, yard.casting, L.casting, flow);
  const shop = new Buyback(items, yard.buyback, L.buyback);
  const truck = new Truck(ph, scene, buildTruck(0), PLACES.truck.pos, PLACES.truck.rotY);
  applyTextures();
  // stosy układają się: zrzucanie stosu mieszanego po jednym i kilka sekund symulacji przed startem
  for (let i = 0; i < mixed.length; i++) {
    const m = mixed[i]; items.spawn(m.kind, m.variant, m.pos, m.q);
    for (let k = 0; k < 7; k++) ph.step();
    if (i % 10 === 0) await progress(0.55 + 0.4 * i / mixed.length, `Układanie stosów… ${i}/${mixed.length}`);
  }
  for (let k = 0; k < 180; k++) ph.step();
  await progress(1, 'Gotowe');

  const input = new Input($('c'));
  const player = new Player(ph, items, camera, PLACES.player);
  const hit = new HitboxView(scene, ph);
  const TEST = new URLSearchParams(location.search).has('test');   // tryb testu (tools/game-test.py): bez menu i blokady myszy
  let driving = false, menuOpen = !TEST;
  if (TEST) $('menu').classList.add('off');
  $('play').disabled = false;
  $('play').onclick = () => { input.lock(); };
  $('hitbox').onchange = () => { hit.enabled = $('hitbox').checked; };
  document.addEventListener('pointerlockchange', () => { if (TEST) return; menuOpen = document.pointerLockElement !== $('c'); $('menu').classList.toggle('off', !menuOpen); });
  $('c').addEventListener('click', () => { if (menuOpen) input.lock(); });

  // miejsca do użycia klawiszem E
  const W = (root, p) => worldPoint(root, p);
  const uses = [
    { at: W(yard.canCrusher, L.canCrusher.button), label: () => `E — zgniatarka do puszek: ${canCrusher.busy ? 'stop' : 'start'} (${canCrusher.status()})`, act: () => (canCrusher.busy ? canCrusher.stop() : canCrusher.start()) },
    { at: W(yard.metalCrusher, L.metalCrusher.button), label: () => `E — prasa 400 kN: ${metalCrusher.busy ? 'stop' : 'start'} (${metalCrusher.status()})`, act: () => (metalCrusher.busy ? metalCrusher.stop() : metalCrusher.start()) },
    { at: W(yard.induction, L.induction.panel), label: () => `E — piec indukcyjny: ${induction.power ? 'wyłącz' : 'włącz'} · R/F przechył`, act: () => { induction.power = !induction.power; }, induction: true },
    { at: W(yard.buyback, L.buyback.window), label: () => `E — sprzedaj sztabki z wagi (${fmtZl(shop.value(shop.onScale))})`, act: () => player.say(shop.sell()) },
    { at: null, label: () => 'E — wsiądź do pojazdu', act: () => { driving = true; player.drop(); player.active = false; }, truck: true },
  ];
  const near = () => {
    if (driving) return null;
    const e = player.eye(); let best = null, bd = 2.2;
    for (const u of uses) {
      const at = u.truck ? truck.cabWorld() : u.at, d = at.distanceTo(e);
      if (d < (u.truck ? 3.2 : bd) && (!best || d < best.d)) best = { u, d };
    }
    return best && best.u;
  };

  /** Jeden krok fizyki gry (1/60 s): gracz, pojazd, maszyny, świat, ciecz, formy, piec. */
  function tick(n) {
    player.step(input, STEP);
    truck.step(STEP, input, driving);
    canCrusher.step(STEP); metalCrusher.step(STEP);
    induction.step(STEP, input, !!(n && n.induction), flow);
    ph.step();
    flow.step(STEP); casting.step(STEP); furnace.step(STEP);
    input.hit.delete('Space'); input.click = [false, false, false];
  }
  let acc = 0, last = performance.now(), fpsT = 0, frames = 0;
  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    frames++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = (frames / fpsT).toFixed(0); frames = 0; fpsT = 0; }
    if (!menuOpen) {
      if (input.pressed('KeyH')) { hit.enabled = !hit.enabled; $('hitbox').checked = hit.enabled; }
      player.look(input);
      const n = near();
      if (input.pressed('KeyE')) {
        if (driving) { driving = false; player.active = true; const c = truck.cabWorld(); player.body.setTranslation({ x: c.x - 1.6, y: 1.2, z: c.z }, true); }
        else if (n) n.act();
      }
      acc += dt;
      while (acc >= STEP) { acc -= STEP; tick(n); }
      truck.sync();
      shop.step();
      $('prompt').textContent = n ? n.label() : driving ? 'W/S jazda · A/D skręt · ←/→ obrót · ↑/↓ wysięgnik · R/F ramię · Spacja chwytak · E wyjście' : '';
    }
    if (driving) {
      camera.position.copy(truck.eyeWorld());
      const q = truck.upperQuat(); const e = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
      camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(e));
    } else player.updateCamera();
    followShadow(camera.position);
    LIQUID_TIME.value += dt;
    // HUD
    if (player.msgT > 0) { player.msgT -= dt; $('msg').textContent = player.message; } else $('msg').textContent = '';
    $('money').textContent = fmtZl(shop.money);
    $('held').textContent = player.held ? `${items.info(player.held.kind).name} · ${player.held.mass.toFixed(player.held.mass < 1 ? 3 : 1)} kg — LPM odłóż, PPM rzuć` : '';
    const m = induction.melt;
    $('status').textContent = `Piec indukcyjny: ${induction.power ? 'ZAŁ' : 'wył'} · kąpiel ${(m.volume * 1000).toFixed(1)} l (Al ${m.mass.aluminium.toFixed(1)} kg, stal ${m.mass.steel.toFixed(1)} kg) · przechył ${(induction.tilt * 57.3).toFixed(0)}°\n`
      + `Zgniatarka puszek: ${canCrusher.status()} · Prasa: ${metalCrusher.status()} · Piec na papier: ${furnace.burning ? 'pali ' + furnace.burning : 'żar'}\n`
      + `Sztabki odlane: ${casting.made} · przedmiotów: ${items.list.length}`;
    view.update(items.list, camera.position);
    hit.update();
    renderer.render(scene, camera);
    input.endFrame();
  });
  window.__game = { ready: true, sim: (sec) => { for (let i = 0; i < sec / STEP; i++) tick(null); truck.sync(); }, setDriving: (v) => { driving = v; player.active = !v; }, ph, items, player, truck, canCrusher, metalCrusher, induction, casting, flow, shop, camera, input, scene, renderer, hit };
}
main().catch((e) => { console.error(e); $('loadTxt').textContent = 'Błąd: ' + e.message; });
