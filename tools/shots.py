"""Zrzuty modeli z podglądu (models.html) bez okna: Playwright + SwiftShader.
  python3 tools/shots.py tire-car [inny-model …]      → tools/out/<model>-<widok>.png
Widoki: z ukosa, z boku, z bliska; strona nie może logować błędów."""
import os, sys, time, subprocess
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'out'); os.makedirs(OUT, exist_ok=True)
PORT = 8791
VIEWS = {'ukos': (1.1, 0.75, 1.3, 1.3), 'bok': (0.0, 0.15, 1.0, 1.2), 'blisko': (0.55, 0.5, 0.7, 0.6), 'gora': (0.05, 1.0, 0.25, 1.3)}
def main():
    ids = [a for a in sys.argv[1:] if not a.startswith('-')]
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); errs = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            pg = b.new_page(viewport={'width': 1200, 'height': 800})
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            for mid in ids:
                pg.goto(f'http://localhost:{PORT}/models.html?model={mid}')
                pg.wait_for_function('window.__models && window.__models.ready()', timeout=60000); time.sleep(3)
                pg.evaluate("document.getElementById('spin').checked=false")
                for name, (x, y, z, k) in VIEWS.items():
                    pg.evaluate(f"()=>{{window.__models.holder.rotation.y=0; window.__models.view({x},{y},{z},{k})}}")
                    time.sleep(1.2)
                    pg.screenshot(path=os.path.join(OUT, f'{mid}-{name}.png'), timeout=180000)
            b.close()
    finally: srv.kill()
    if errs: print('BŁĘDY STRONY:\n  ' + '\n  '.join(errs[:20])); sys.exit(1)
    print('zrzuty w', OUT)
if __name__ == '__main__': main()
