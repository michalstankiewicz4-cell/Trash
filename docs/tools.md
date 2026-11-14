# Narzędzia

## Doktor modeli (`tools/doctor.mjs`)
Doktor z GameLaboratory (`tools/doctor/modeldoctor.js`) uruchomiony w Node na modelach gry, LOD 0 i LOD 1.
```
node tools/doctor.mjs ../GameLaboratory          # wszystkie modele
node tools/doctor.mjs ../GameLaboratory tire-car # jeden
```
Błędy (`error`) muszą być zerowe. Ścieżkę do GameLaboratory można podać zmienną `GAMELAB`.

## Zrzuty (`tools/shots.py`)
Playwright + SwiftShader otwiera `models.html` i robi zrzuty z 4 stron do `tools/out/` (poza repo).
```
python3 tools/shots.py tire-car
```
