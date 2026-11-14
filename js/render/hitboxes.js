// Podgląd hitboxów (przełącznik H / w menu): linie wszystkich zderzaczy z silnika fizyki (Rapier debugRender) —
// przedmioty, maszyny, platforma, pojazd. Aktualizowane co klatkę tylko, gdy włączone.
import * as THREE from '../../vendor/three/three.module.js';

export class HitboxView {
  constructor(scene, ph) {
    this.ph = ph; this.enabled = false;
    this.geo = new THREE.BufferGeometry();
    this.lines = new THREE.LineSegments(this.geo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: true, transparent: true, opacity: 0.9 }));
    this.lines.frustumCulled = false; this.lines.visible = false; scene.add(this.lines);
  }
  update() {
    this.lines.visible = this.enabled;
    if (!this.enabled) return;
    const { vertices, colors } = this.ph.world.debugRender();
    this.geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  }
}
