// Podgląd modeli (models.html): lista z js/models/registry.js, widok z orbitą, LOD, siatka, zderzacz, dane przedmiotu.
import * as THREE from '../../vendor/three/three.module.js';
import { OrbitControls } from '../../vendor/three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from '../../vendor/three/addons/geometries/ConvexGeometry.js';
import { MODELS } from '../models/registry.js';
import { applyTextures, setAnisotropy } from '../render/textures.js';
import { createEnvironment } from '../render/env.js';
import { shapeParts } from '../physics/shapes.js';
import { VERSION } from '../version.js';

const $ = (id) => document.getElementById(id);
$('ver').textContent = 'v' + VERSION;
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
setAnisotropy(renderer.capabilities.getMaxAnisotropy());
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a2924');
scene.environment = createEnvironment(renderer);
scene.environmentIntensity = 0.8;
const sun = new THREE.DirectionalLight('#fff3e0', 2.6);
sun.position.set(3, 6, 2.5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
scene.add(sun, new THREE.HemisphereLight('#b8c6d8', '#4a3f33', 0.35));
const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: '#57524a', roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true;

let current = null, entry = null, mod = null, collGroup = null;
const holder = new THREE.Group(); scene.add(holder);

function frame(obj) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z);
  controls.target.copy(c);
  camera.position.copy(c).add(new THREE.Vector3(1.1, 0.75, 1.3).multiplyScalar(r * 1.25));
  camera.near = r / 200; camera.far = r * 60; camera.updateProjectionMatrix();
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, far: r * 20 + 10 }); sun.shadow.camera.updateProjectionMatrix();
  sun.position.copy(c).add(new THREE.Vector3(0.6, 1.2, 0.5).multiplyScalar(r * 3 + 2)); sun.target.position.copy(c); sun.target.updateMatrixWorld();
}

async function show(e) {
  entry = e;
  document.querySelectorAll('#items button').forEach((b) => b.classList.toggle('on', b.dataset.id === e.id));
  history.replaceState(null, '', '?model=' + e.id);
  mod = await e.load();
  const n = mod.info?.variants || 1, sel = $('variant');
  sel.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i}">wariant ${i + 1}</option>`).join('');
  sel.parentElement.style.display = n > 1 ? '' : 'none';
  rebuild(true);
}
function rebuild(reframe) {
  holder.clear();
  current = mod.build($('lod1').checked ? 1 : 0, +($('variant').value || 0));
  applyTextures();
  // przedmiot stoi na podłodze (dolna krawędź na y = 0)
  const b = new THREE.Box3().setFromObject(current);
  current.position.y -= b.min.y;
  holder.add(current);
  current.traverse((o) => { if (o.isMesh) o.material.wireframe = $('wire').checked; });
  collGroup = new THREE.Group();
  if (mod.info?.collider) {
    for (const p of shapeParts(mod.info.collider)) {
      let g;
      if (p.kind === 'box') g = new THREE.BoxGeometry(p.half[0] * 2, p.half[1] * 2, p.half[2] * 2).translate(...p.at);
      else { const pts = []; for (let i = 0; i < p.points.length; i += 3) pts.push(new THREE.Vector3(p.points[i], p.points[i + 1], p.points[i + 2])); g = new ConvexGeometry(pts); }
      collGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), new THREE.LineBasicMaterial({ color: '#4fe3c6' })));
    }
  }
  collGroup.visible = $('coll').checked;
  collGroup.position.copy(current.position);
  holder.add(collGroup);
  if (reframe) frame(current);
  info();
}
function info() {
  let tris = 0, parts = 0;
  current.traverse((o) => { if (o.isMesh) { parts++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  const i = mod.info || {}, size = new THREE.Box3().setFromObject(current).getSize(new THREE.Vector3());
  const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  $('info').innerHTML = `<h3>${i.name || entry.label}</h3><table>
    ${row('wersja modelu', i.version || '—')}
    ${row('wymiary', `${(size.x * 100).toFixed(1)} × ${(size.y * 100).toFixed(1)} × ${(size.z * 100).toFixed(1)} cm`)}
    ${i.mass != null ? row('masa', i.mass + ' kg') : ''}
    ${i.material ? row('materiał', i.material) : ''}
    ${i.crush ? row('opór zgniecenia X·Y·Z', `${i.crush.x} · ${i.crush.y} · ${i.crush.z} kN`) : ''}
    ${i.collider ? row('zderzacz', i.collider.type) : ''}
    ${row('części', parts)}${row('trójkąty', (tris | 0).toLocaleString('pl-PL'))}
  </table>`;
}

// lista
const groups = {};
MODELS.forEach((m) => (groups[m.group] ||= []).push(m));
for (const [g, list] of Object.entries(groups)) {
  const h = document.createElement('h2'); h.textContent = g; $('items').append(h);
  for (const m of list) {
    const b = document.createElement('button'); b.dataset.id = m.id; b.textContent = m.label;
    b.onclick = () => show(m); $('items').append(b);
  }
}
$('lod1').onchange = () => rebuild(false);
$('variant').onchange = () => rebuild(false);
$('wire').onchange = () => current.traverse((o) => { if (o.isMesh) o.material.wireframe = $('wire').checked; });
$('coll').onchange = () => { collGroup.visible = $('coll').checked; };

function resize() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const want = new URLSearchParams(location.search).get('model');
show(MODELS.find((m) => m.id === want) || MODELS[0]);
renderer.setAnimationLoop(() => {
  if ($('spin').checked) holder.rotation.y += 0.004;
  controls.update(); renderer.render(scene, camera);
});
// widok z kierunku (x, y, z) w odległości k × rozmiar modelu (narzędzie zrzutów: tools/shots.py)
function view(x, y, z, k = 1) {
  const box = new THREE.Box3().setFromObject(current), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length();
  controls.target.copy(c); camera.position.copy(c).add(new THREE.Vector3(x, y, z).normalize().multiplyScalar(r * k)); controls.update();
}
window.__models = { show: (id) => show(MODELS.find((m) => m.id === id)), camera, controls, holder, view, ready: () => !!current };
