# Gra — budowa i działanie

## Pliki
| Plik | Co robi |
|---|---|
| `js/main.js` | start: fizyka, renderer, świat, stosy (układanie przed startem), maszyny, gracz, pojazd; pętla ze stałym krokiem 1/60 s (`tick`) |
| `js/physics/world.js` | Rapier (WASM): świat, grupy kolizji, zderzacze statyczne z opisów modeli, ciała przedmiotów |
| `js/physics/shapes.js` | opis zderzacza przedmiotu → części wypukłe (pierścień, walec, naczynie, prostopadłościan) |
| `js/items/catalog.js`, `items.js` | rodzaje przedmiotów (metal, palność), tworzenie, usuwanie, zgniatanie (skala w 3 osiach, nowy zderzacz) |
| `js/render/instancing.js` | przedmioty na GPU: InstancedMesh na rodzaj × wariant × LOD × materiał; atrybut żarzenia `aHeat` |
| `js/render/renderer.js`, `env.js`, `textures.js`, `matkit.js`, `lava.js`, `liquid.js` | renderer, niebo, cienie za graczem, tekstury proceduralne, MatKit i lawa z GameLaboratory |
| `js/render/hitboxes.js` | podgląd hitboxów (H / menu) — linie zderzaczy z Rapier `debugRender` |
| `js/player/player.js` | gracz FPP: kontroler postaci Rapier, ręce (podnoszenie do 45 kg, rzut) |
| `js/machines/crusher.js` | zgniatarki: tłok kinematyczny, kolumny przekroju, zgniatanie najsłabszego przedmiotu, utwardzanie, zatrzymanie przy zbyt mocnym |
| `js/machines/furnace.js`, `fire.js` | piec na papier (spalanie tektury i gazet), ogień i dym jako cząstki GPU |
| `js/machines/induction.js` | piec indukcyjny: nagrzewanie i topienie metalu, kąpiel ze składem, przechył, wylew |
| `js/machines/metal-flow.js` | strumień ciekłego metalu (cząstki, rynna i dysza analitycznie, shader lawy) |
| `js/machines/casting.js` | formy na przenośniku: napełnianie, przesuw, stygnięcie, sztabka (wariant wg składu) |
| `js/machines/buyback.js` | punkt skupu: waga z wyświetlaczem, sprzedaż sztabek |
| `js/vehicle/truck.js` | przeładowarka: podwozie dynamiczne z kontrolerem pojazdu, ramię kinematyczne, chwytak i 4 szczęki dynamiczne na zawiasach z silnikami |
| `js/world/yard.js`, `stacks.js` | rozstawienie świata i stosy (9 × 20 szt. + mieszany 9 × 10 szt.) |

## Zasady fizyki
- Stały krok 60 Hz, 6 iteracji solvera, usypianie ciał. Małe przedmioty (< 0,5 kg) z CCD.
- Zgniatanie: siła tłoka (puszki 9 kN, prasa 400 kN) porównywana z oporem przedmiotu wzdłuż jego lokalnej osi najbliższej osi tłoka; opór rośnie przy zgniataniu (×4 przy granicy `minScale`). Cała puszka zgnieciona o połowę zamienia się w model puszki zgniecionej.
- Piec indukcyjny grzeje tylko metal (aluminium topi się w 660 °C, stal w 1450 °C); lekkie szybciej. Zgniecione przedmioty zajmują mniej miejsca, więc do tygla wchodzi ich więcej.
- Przechył: próg zależy od zapełnienia tygla; strumień metalu płynie rynną do dyszy nad formą. Pełna forma → przenośnik przesuwa formy, o ile następna jest pusta (metal w trakcie przesuwu spływa na przenośnik i przepada).
- Sztabka: ≥ 90% aluminium → aluminium, ≥ 90% stali → stal, inaczej mieszanka; masa = metal w formie.
- Rozdzielacz (dźwignia przy linii odlewniczej, E): duże formy (3,2 l) albo małe formy na aluminium (0,82 l, drugi przenośnik). Na czas przesuwu przenośnika pod aktywną dyszą metal czeka w dyszy.
- Skup: sztabki wg składu (6,20 / 1,10 / 0,90 zł/kg), opony całe lub zgniecione 0,30 zł/kg.
- Ugięcie wysięgnika: ładunek = przedmioty w zamkniętych szczękach, które nie leżą na niczym (promień w dół). Moment od ładunku × podatność (wysięgnik 2,6·10⁻⁷, ramię 3,5·10⁻⁷ rad/N·m) daje kąt ugięcia, do którego ramię dochodzi jak sprężyna z tłumieniem (1,6 Hz, ζ 0,12 — buja się przy podniesieniu i zrzucie); 1,5 t daje ok. 12 cm na końcu wysięgnika. Widoczne wygięcie w łuk (shader), ciała kinematyczne obracają się o kąt ugięcia. Ciężar chwytaka i ładunku działa na podwozie w punkcie zawieszenia — maszyna przechyla się.
- Kamery w pojeździe (C): kabina (szyby przezroczyste), za pojazdem, chwytak; mysz obraca kamerę zewnętrzną.

## Wydajność (GPU)
- Przedmioty: kilkadziesiąt wywołań rysowania niezależnie od liczby szczegółów (InstancedMesh), LOD 1 dalej niż 14 m.
- Cienie z jednego światła, mapa cieni przesuwana skokami za graczem; tekstury proceduralne generowane raz.
- Ogień, dym i ciekły metal — cząstki na GPU (punkty / instancje, ruch ognia liczony w shaderze).

## Testy bez okna
- `python3 tools/game-test.py '{"nazwa":[x,y,z,yaw,pitch]}'` — ładowanie, błędy strony, zrzuty z podanych miejsc.
- `python3 tools/game-mech.py` — scenariusz: zgniatarki, piec, odlew, skup, pojazd (w trybie `?test`; `__game.sim(s)` liczy fizykę bez rysowania).
