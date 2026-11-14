"""Test gry bez okna (Playwright + SwiftShader): ładuje index.html?test, czeka na start, robi zrzuty i scenariusze.
  python3 tools/game-test.py            → tools/out/game-*.png, błędy strony na wyjściu"""
import os, sys, time, subprocess, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'out'); os.makedirs(OUT, exist_ok=True)
PORT = 8792
def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); errs = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            pg = b.new_page(viewport={'width': 1280, 'height': 720})
            pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)))
            pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
            pg.goto(f'http://localhost:{PORT}/index.html?test')
            pg.wait_for_function('window.__game && window.__game.ready', timeout=600000)
            print('załadowano'); time.sleep(3)
            def shot(name, js=None, wait=1.5):
                if js: pg.evaluate(js)
                time.sleep(wait); pg.screenshot(path=os.path.join(OUT, f'game-{name}.png'), timeout=300000)
            shot('start')
            for name, (x, y, z, yaw, pitch) in json.loads(sys.argv[1] if len(sys.argv) > 1 else '{}').items():
                shot(name, f"(()=>{{const g=window.__game; g.player.body.setTranslation({{x:{x},y:{y},z:{z}}},true); g.player.yaw={yaw}; g.player.pitch={pitch};}})()", 2.5)
            print(pg.evaluate("JSON.stringify({items: window.__game.items.list.length, fps: document.getElementById('fps').textContent, status: document.getElementById('status').textContent})"))
            b.close()
    finally: srv.kill()
    if errs: print('KOMUNIKATY STRONY:\n  ' + '\n  '.join(errs[:30]))
if __name__ == '__main__': main()
