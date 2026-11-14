// Wejście: klawisze (stan i wciśnięcia w tej klatce), mysz (ruch w trybie pointer lock, przyciski, kółko).
export class Input {
  constructor(el) {
    this.el = el; this.down = new Set(); this.hit = new Set(); this.mx = 0; this.my = 0; this.wheel = 0;
    this.mouse = [false, false, false]; this.click = [false, false, false]; this.locked = false;
    addEventListener('keydown', (e) => { if (e.repeat) return; this.down.add(e.code); this.hit.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    el.addEventListener('mousedown', (e) => { if (!this.locked) return; this.mouse[e.button] = true; this.click[e.button] = true; });
    addEventListener('mouseup', (e) => { this.mouse[e.button] = false; });
    // Chrome (Windows) przy blokadzie kursora potrafi wysłać pojedyncze zdarzenie z fałszywym skokiem o setki pikseli:
    // surowy ruch myszy (unadjustedMovement) i odrzucanie zdarzeń dużo większych niż ostatnie ruchy
    this.recent = 0;
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const dx = e.movementX, dy = e.movementY, m = Math.hypot(dx, dy);
      if (m > 120 && m > this.recent * 6 + 40) return;   // skok — nie od ręki
      this.recent = this.recent * 0.7 + m * 0.3;
      this.mx += dx; this.my += dy;
    });
    addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; });
  }
  lock() {
    // surowy ruch (bez przyspieszenia systemu) — usuwa skoki kursora; gdy przeglądarka nie obsługuje, zwykła blokada
    const p = this.el.requestPointerLock?.({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => this.el.requestPointerLock());
  }
  key(c) { return this.down.has(c); }
  pressed(c) { return this.hit.has(c); }
  endFrame() { this.hit.clear(); this.mx = this.my = 0; this.wheel = 0; this.click = [false, false, false]; }
}
