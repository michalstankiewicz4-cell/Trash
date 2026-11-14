"""Test mechaniki gry (Playwright): zgniatarki, piec indukcyjny + odlew, skup, pojazd. Wypisuje wyniki i zrzuty."""
import os, sys, time, subprocess, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'out'); os.makedirs(OUT, exist_ok=True)
PORT = 8793
JS_SETUP = r"""
(() => { const g = window.__game, I = g.items, T = (it, x, y, z) => { it.body.setTranslation({x, y, z}, true); it.body.setLinvel({x:0,y:0,z:0}, true); };
  const W = (root, p) => { root.updateMatrixWorld(true); return new root.position.constructor(...p).applyMatrix4(root.matrixWorld); };
  const cans = I.list.filter(i => i.kind === 'can').slice(0, 12);
  const cc = g.canCrusher.root, c = W(cc, [0, 1.6, 0]);
  cans.forEach((it, k) => T(it, c.x - 0.5 + (k % 4) * 0.3, c.y + Math.floor(k / 4) * 0.12, c.z - 0.2 + (k % 3) * 0.2));
  const bar = I.list.find(i => i.kind === 'barrel'), mc = g.metalCrusher.root, m = W(mc, [0, 1.2, 0]); T(bar, m.x, m.y, m.z);
  const tire = I.list.find(i => i.kind === 'tire-car'); T(tire, m.x + 0.9, m.y + 0.2, m.z);
  // do tygla: 15 puszek zgniecionych + garnek
  const ind = g.induction.group; ind.updateMatrixWorld(true);
  const L = g.induction.L.inner, top = new ind.position.constructor(L.cx, L.top + 0.3, L.cz).applyMatrix4(ind.matrixWorld);
  I.list.filter(i => i.kind === 'can-crushed').slice(0, 30).forEach((it, k) => T(it, top.x + ((k % 5) - 2) * 0.08, top.y + Math.floor(k / 5) * 0.08, top.z + ((k % 3) - 1) * 0.08));
  return { bar: bar.id, tire: tire.id };
})()
"""
def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); errs = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            pg = b.new_page(viewport={'width': 960, 'height': 540})
            pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
            pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type == 'error' else None)
            pg.goto(f'http://localhost:{PORT}/index.html?test')
            for _ in range(900):
                if pg.evaluate('!!(window.__game && window.__game.ready)'): break
                if errs: print('BŁĄD:', errs); b.close(); return
                time.sleep(1)
            ids = pg.evaluate(JS_SETUP); time.sleep(4)
            pg.evaluate("(()=>{const g=window.__game; g.canCrusher.start(); g.metalCrusher.start(); g.induction.power=true; g.player.body.setTranslation({x:-3,y:1.6,z:-1.5},true); g.player.yaw=0; g.player.pitch=-0.2;})()")
            for t in range(8):
                time.sleep(5)
                print(pg.evaluate("""(()=>{const g=window.__game, I=g.items; const k={}; I.list.forEach(i=>k[i.kind]=(k[i.kind]||0)+1);
                  const bar=I.list.find(i=>i.id==%d), tire=I.list.find(i=>i.id==%d);
                  return JSON.stringify({cc:g.canCrusher.state, ccu:g.canCrusher.u.toFixed(2), crushed:g.canCrusher.crushed, mc:g.metalCrusher.state, mcu:g.metalCrusher.u.toFixed(2), mcr:g.metalCrusher.crushed, bar: bar&&bar.scale.map(v=>v.toFixed(2)), tire: tire&&tire.scale.map(v=>v.toFixed(2)), cans:k.can, crushedCans:k['can-crushed'], melt:(g.induction.melt.volume*1000).toFixed(2)})})()""" % (ids['bar'], ids['tire'])))
                if t == 2: pg.screenshot(path=os.path.join(OUT, 'mech-crusher.png'))
            # odlew: przechył do końca
            pg.evaluate("(()=>{const g=window.__game; g.induction.tilt=1.5; g.player.body.setTranslation({x:-5,y:1.6,z:7.5},true); g.player.yaw=1.2; g.player.pitch=-0.35;})()")
            for t in range(6):
                time.sleep(4)
                print(pg.evaluate("JSON.stringify({melt:(window.__game.induction.melt.volume*1000).toFixed(2), particles:window.__game.flow.n, wasted:(window.__game.flow.wasted*1000).toFixed(2), molds:window.__game.casting.molds.map(m=>(m.vol*1000).toFixed(1)+'/'+m.temp.toFixed(0)).join(' '), made:window.__game.casting.made})"))
                if t == 1: pg.screenshot(path=os.path.join(OUT, 'mech-pour.png'))
            pg.evaluate("(()=>{const g=window.__game; g.induction.tilt=0;})()")
            time.sleep(30)
            print(pg.evaluate("JSON.stringify({molds:window.__game.casting.molds.map(m=>(m.vol*1000).toFixed(1)+'/'+m.temp.toFixed(0)).join(' '), made:window.__game.casting.made, ingots:window.__game.items.list.filter(i=>i.kind==='ingot').map(i=>i.variant+':'+i.mass.toFixed(2))})"))
            pg.screenshot(path=os.path.join(OUT, 'mech-ingots.png'))
            # skup: sztabki na wagę i sprzedaż
            print(pg.evaluate("""(()=>{const g=window.__game, s=g.shop; s.root.updateMatrixWorld(true); const c=s.L.scale.center; const p=new s.root.position.constructor(c[0], 0.4, c[2]).applyMatrix4(s.root.matrixWorld);
               g.items.list.filter(i=>i.kind==='ingot').forEach((it,k)=>{it.body.setTranslation({x:p.x+(k%3)*0.15-0.15,y:p.y+k*0.1,z:p.z},true)}); return 'ok'})()"""))
            time.sleep(3)
            print(pg.evaluate("(()=>{const g=window.__game; g.shop.step(); const m=g.shop.sell(); return m+' | pieniądze: '+g.shop.money.toFixed(2)})()"))
            # pojazd: jazda do przodu
            pg.evaluate("(()=>{const g=window.__game; g.setDriving(true); g.input.down.add('KeyW');})()")
            time.sleep(6)
            print(pg.evaluate("(()=>{const g=window.__game, t=g.truck.body.translation(); g.input.down.delete('KeyW'); return JSON.stringify({x:t.x.toFixed(2),y:t.y.toFixed(2),z:t.z.toFixed(2), v:g.truck.vc.currentVehicleSpeed().toFixed(2)})})()"))
            pg.screenshot(path=os.path.join(OUT, 'mech-truck.png'))
            b.close()
    finally: srv.kill()
    if errs: print('BŁĘDY:\n  ' + '\n  '.join(errs[:30]))
if __name__ == '__main__': main()
