# Zasady pracy w Trash (Złomowisko)

- Odpowiadaj po polsku. UI gry po polsku.
- Nigdy nie dodawaj własnych pomysłów — tylko je proponuj; implementuj to, o co poproszono.
- Po każdym zadaniu: commit i push na `main`. Modele — po jednym, każdy osobnym commitem.

## Wersjonowanie (pilnować przy każdej zmianie)

- Wersja gry: `js/version.js` (`VERSION`, semver) + wpis w `CHANGELOG.md` (najnowszy na górze, data, co się zmieniło).
- Każdy model ma własną wersję w `info.version` w swoim pliku; zmiana modelu = podniesienie wersji modelu i gry.
- Wersja gry widoczna w grze (menu) i w podglądzie modeli.

## Układ kodu

- `index.html` — gra; `models.html` — podgląd modeli (lista z `js/models/registry.js`).
- `js/models/` — modele budowane kodem, bez DOM (działają w Node dla doktora): `items/` przedmioty, `machines/` maszyny,
  `vehicle/` pojazd, `world/` otoczenie; `geom.js` narzędzia geometrii, `materials.js` materiały jako dane.
- `js/render/` — renderowanie (tekstury proceduralne `textures.js`, otoczenie `env.js`, instancje GPU).
- `js/physics/` — fizyka (Rapier, `vendor/rapier/`), `shapes.js` — opis zderzacza → części wypukłe.
- `js/items/`, `js/machines/`, `js/player/`, `js/vehicle/`, `js/world/`, `js/ui/`, `js/core/` — logika gry.
- `vendor/` — Three.js r186 (jak GameLaboratory) i Rapier; nie edytować.
- `docs/` — dokumentacja (mapa: `docs/README.md`).
- Nazwy plików małymi literami, słowa myślnikiem.

## Modele

- Realistyczne, dużo szczegółów; wymiary i masy jak prawdziwe (podawać w `info`).
- Każdy model: `build(lod)` (0 — blisko, 1 — daleko) i `info` { id, name, version, mass, material, crush {x,y,z} kN, minScale, collider }.
- Zderzacz ogólny, ale w miarę dokładny (opona = pierścień z płaskimi bokami, bez bieżnika).
- Sprawdzać doktorem modeli z GameLaboratory: `node tools/doctor.mjs ../GameLaboratory` — bez błędów.
- Zrzuty do oceny: `python3 tools/shots.py <id>` (wyniki w `tools/out/`, nie w repo).
- Na GPU: każdy rodzaj przedmiotu rysowany jako InstancedMesh (szczegóły nie mnożą wywołań rysowania), LOD 1 daleko.
