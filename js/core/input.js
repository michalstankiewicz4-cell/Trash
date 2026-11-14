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
    addEventListener('mousemove', (e) => { if (this.locked) { this.mx += e.movementX; this.my += e.movementY; } });
    addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; });
  }
  lock() { this.el.requestPointerLock?.(); }
  key(c) { return this.down.has(c); }
  pressed(c) { return this.hit.has(c); }
  endFrame() { this.hit.clear(); this.mx = this.my = 0; this.wheel = 0; this.click = [false, false, false]; }
}
