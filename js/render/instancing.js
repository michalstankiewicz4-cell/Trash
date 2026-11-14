// Rysowanie przedmiotów na GPU: każdy rodzaj × wariant × LOD × materiał to jedno InstancedMesh — setki przedmiotów
// w kilkudziesięciu wywołaniach rysowania niezależnie od liczby szczegółów modelu. LOD 1 dalej niż LOD_DIST.
// Atrybut instancji aHeat (0…1) — żarzenie metalu w piecu (emisja barwy ciała doskonale czarnego).
import * as THREE from '../../vendor/three/three.module.js';
import { KINDS, variantsOf } from '../items/catalog.js';
import { applyTextures } from './textures.js';

const LOD_DIST = 14;
const matCache = new Map();

/** Kopia materiału z żarzeniem z atrybutu instancji (tekstury wspólne z oryginałem). */
function heatMaterial(m) {
  let c = matCache.get(m);
  if (c) return c;
  c = m.clone();
  c.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aHeat;\nvarying float vHeat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = aHeat;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHeat;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vHeat > 0.001) {
          vec3 hot = mix(vec3(0.6, 0.02, 0.0), vec3(1.0, 0.35, 0.05), smoothstep(0.0, 0.5, vHeat));
          hot = mix(hot, vec3(1.0, 0.85, 0.55), smoothstep(0.5, 1.0, vHeat));
          totalEmissiveRadiance += hot * vHeat * 4.0;
          diffuseColor.rgb *= 1.0 - vHeat * 0.6;
        }`);
  };
  c.customProgramCacheKey = () => 'heat-' + m.uuid;
  matCache.set(m, c);
  return c;
}

/** Spłaszcza model do listy { geometry, material } w układzie modelu (scalone wg materiału). */
function flatten(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.visible === false) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    (byMat.get(o.material) || byMat.set(o.material, []).get(o.material)).push(g);
  });
  const out = [];
  for (const [m, list] of byMat) out.push({ material: m, geometry: mergeSimple(list) });
  return out;
}
function mergeSimple(list) {
  const attrs = ['position', 'normal', 'uv'], data = { position: [], normal: [], uv: [] }, idx = [];
  let off = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    for (const a of attrs) { const src = g.attributes[a]; const sz = a === 'uv' ? 2 : 3; for (let i = 0; i < n; i++) for (let k = 0; k < sz; k++) data[a].push(src ? src.array[i * src.itemSize + k] : 0); }
    for (const v of g.index.array) idx.push(v + off);
    off += n;
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
  o.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
  o.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
  o.setIndex(off > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  o.computeBoundingSphere();
  return o;
}

export class ItemRenderer {
  constructor(scene, capacity) {
    this.scene = scene; this.buckets = new Map();   // klucz "kind|variant" → [lod0 meshes[], lod1 meshes[]]
    this.m = new THREE.Matrix4(); this.p = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3();
    for (const kind of Object.keys(KINDS)) for (let v = 0; v < variantsOf(kind); v++) {
      const cap = capacity(kind);
      const lods = [0, 1].map((lod) => flatten(KINDS[kind].mod.build(lod, v)).map(({ material, geometry }) => {
        geometry.setAttribute('aHeat', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
        const im = new THREE.InstancedMesh(geometry, heatMaterial(material), cap);
        im.count = 0; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(im); return im;
      }));
      this.buckets.set(kind + '|' + v, lods);
    }
    applyTextures();
    // tekstury doczepione do oryginałów — kopie materiałów biorą je przez ponowne sklonowanie map
    for (const [orig, copy] of matCache) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap', 'alphaMap']) { copy[k] = orig[k]; copy.needsUpdate = true; }
    for (const [orig, copy] of matCache) { copy.metalness = orig.metalness; copy.roughness = orig.roughness; copy.bumpScale = orig.bumpScale; }
  }
  /** Ustawia macierze instancji ze stanu przedmiotów (raz na klatkę). */
  update(items, camPos) {
    for (const lods of this.buckets.values()) for (const l of lods) for (const im of l) im.count = 0;
    for (const it of items) {
      if (it.hidden) continue;
      const lods = this.buckets.get(it.kind + '|' + it.variant);
      const t = it.body.translation(), r = it.body.rotation();
      this.p.set(t.x, t.y, t.z); this.q.set(r.x, r.y, r.z, r.w);
      const d2 = this.p.distanceToSquared(camPos), lod = d2 > LOD_DIST * LOD_DIST ? 1 : 0;
      this.s.set(...it.scale);
      this.m.compose(this.p, this.q, this.s);
      if (it.visualRot) this.m.multiply(it.visualRot);
      for (const im of lods[lod]) {
        const k = im.count++;
        im.setMatrixAt(k, this.m);
        im.geometry.attributes.aHeat.array[k] = it.heat || 0;
      }
    }
    for (const lods of this.buckets.values()) for (const l of lods) for (const im of l) {
      if (!im.count) continue;
      im.instanceMatrix.needsUpdate = true; im.geometry.attributes.aHeat.needsUpdate = true;
      im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, im.count * 16);
    }
  }
}
