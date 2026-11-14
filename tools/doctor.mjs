// Doktor modeli z GameLaboratory (tools/doctor/modeldoctor.js) uruchomiony w Node na modelach gry.
// Użycie: node tools/doctor.mjs [ścieżka do GameLaboratory] [id modelu…]
//   ścieżka domyślnie: zmienna GAMELAB albo ../GameLaboratory obok repo.
// Modele budowane bez scalania części (każda część ma nazwę), LOD 0 i LOD 1.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
let lab = process.env.GAMELAB || path.resolve(here, '../../GameLaboratory');
if (args[0] && fs.existsSync(args[0])) lab = path.resolve(args.shift());
const docPath = path.join(lab, 'tools/doctor/modeldoctor.js');
if (!fs.existsSync(docPath)) { console.error('Nie ma doktora modeli w', docPath, '— podaj ścieżkę do GameLaboratory.'); process.exit(2); }
const { examine } = await import(pathToFileURL(docPath).href);
const { MODELS } = await import(pathToFileURL(path.join(here, '../js/models/registry.js')).href);

let bad = 0;
for (const m of MODELS) {
  if (args.length && !args.includes(m.id)) continue;
  const mod = await m.load();
  for (const lod of [0, 1]) {
    const root = mod.build(lod);
    root.updateMatrixWorld(true);
    let tris = 0, meshes = 0;
    root.traverse((o) => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    const r = examine(root, mod.info?.doctor || {});
    const errs = r.findings.filter((f) => f.severity === 'error').length;
    bad += errs;
    console.log(`\n${m.id} LOD${lod}  ${meshes} części, ${tris | 0} trójkątów, ${r.stats.ms} ms`);
    if (!r.findings.length) console.log('  czysto');
    for (const f of r.findings) console.log(`  ${f.severity[0].toUpperCase()} ${f.check.padEnd(10)} ${f.detail.slice(0, 140)}\n      ${f.parts.join(' ; ').slice(0, 140)}`);
  }
}
console.log(bad ? `\nBŁĘDY: ${bad}` : '\ndoktor OK');
process.exit(bad ? 1 : 0);
