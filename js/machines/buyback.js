// Punkt skupu: przedmioty na wadze są ważone (wyświetlacz pokazuje masę i wartość sztabek), przy okienku E — sprzedaż
// sztabek z wagi. Cennik (zł/kg) jak na tablicy w modelu.
import * as THREE from '../../vendor/three/three.module.js';
import { KINDS } from '../items/catalog.js';

export const PRICES = [6.2, 1.1, 0.9];      // aluminium, stal, mieszanka
export class Buyback {
  constructor(items, root, layout) {
    this.items = items; this.root = root; root.updateMatrixWorld(true);
    this.Mi = root.matrixWorld.clone().invert(); this.L = layout; this.money = 0;
    this.canvas = document.createElement('canvas'); this.canvas.width = 256; this.canvas.height = 96;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    const scr = root.getObjectByName('wyświetlacz wagi');
    scr.material = new THREE.MeshBasicMaterial({ map: this.tex });
    // tekstura na ścianie skierowanej na +x (w stronę wagi)
    const uv = scr.geometry.attributes.uv; scr.geometry = scr.geometry.clone();
    this.last = ''; this.onScale = [];
  }
  scan() {
    const { center: [cx, cy, cz], half: [hx, , hz] } = this.L.scale, out = [];
    for (const it of this.items.list) {
      if (it.held) continue;
      const t = it.body.translation(), p = new THREE.Vector3(t.x, t.y, t.z).applyMatrix4(this.Mi);
      if (Math.abs(p.x - cx) < hx + 0.05 && Math.abs(p.z - cz) < hz + 0.05 && p.y > cy && p.y < cy + 1.5) out.push(it);
    }
    return out;
  }
  price(it) { const k = KINDS[it.kind]; return k.ingot ? PRICES[it.variant] : k.sell || 0; }
  value(list) { return list.reduce((s, it) => s + it.mass * this.price(it), 0); }
  step() {
    this.onScale = this.scan();
    const kg = this.onScale.reduce((s, it) => s + it.mass, 0), zl = this.value(this.onScale);
    const txt = kg.toFixed(1) + '|' + zl.toFixed(2);
    if (txt === this.last) return;
    this.last = txt;
    const x = this.canvas.getContext('2d');
    x.fillStyle = '#0b1a0e'; x.fillRect(0, 0, 256, 96);
    x.fillStyle = '#6dff8a'; x.font = '700 40px monospace'; x.textAlign = 'right';
    x.fillText(kg.toFixed(1) + ' kg', 246, 44); x.font = '600 26px monospace'; x.fillText(zl.toFixed(2) + ' zł', 246, 82);
    this.tex.needsUpdate = true;
  }
  sell() {
    const list = this.onScale.filter((it) => this.price(it) > 0);
    if (!list.length) return this.onScale.length ? 'Skup przyjmuje sztabki z przetopu i opony' : 'Połóż sztabki lub opony na wadze';
    const zl = this.value(list); list.forEach((it) => this.items.remove(it)); this.money += zl;
    return `Sprzedano ${list.length} szt. za ${zl.toFixed(2)} zł`;
  }
}
