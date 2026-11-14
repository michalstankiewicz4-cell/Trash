# Zmiany

## 0.3.3 — 2026-11-14
- Punkt skupu v1.1.0: cennik z oponami (0,30 zł/kg).

## 0.3.2 — 2026-11-14
- Linia odlewnicza v1.1.0: drugi przenośnik z 10 mniejszymi formami na aluminium (podziałka 0,36 m), rozdzielacz na końcu rynny z dwiema dyszami i zasuwą, dźwignia na słupku.

## 0.3.1 — 2026-11-14
- Model: mała sztabka aluminiowa (v1.0.0) — 250×80/220×60×50 mm (~0,82 l ≈ 2,2 kg), z osobnych mniejszych form.
- Sztabka v1.0.1: generator kształtu z wymiarami jako parametrem (promień zaokrąglenia i skurcz zależne od wymiarów).

## 0.3.0 — 2026-11-14
- Gra: widok z oczu, wysypisko ogrodzone (nie da się wyjść), platforma z maszynami, punkt skupu przy bramie, pojazd z chwytakiem.
- Fizyka Rapier (WASM, stały krok 60 Hz): przedmioty z masą i hitboxami (opona = pierścień z płaskimi bokami), podnoszenie, rzut, popychanie.
- Stosy: 9 rodzajów po 20 sztuk i stos mieszany po 10 sztuk z każdego rodzaju (układane fizyką przy ładowaniu).
- Zgniatanie: opór w 3 osiach, utwardzanie, zgniatarka puszek (9 kN, wyrzut do kosza) i prasa 400 kN; cała puszka → zgnieciona.
- Piec na papier: spalanie gazet i kartonów z ogniem i dymem.
- Piec indukcyjny: topienie metalu (żarzenie na GPU), kąpiel ze składem, przechył, strumień ciekłego metalu rynną i dyszą do form, stygnięcie, sztabki (aluminium / stal / mieszanka).
- Punkt skupu: waga z wyświetlaczem, sprzedaż sztabek.
- Pojazd: jazda, obrót nadwozia, wysięgnik, ramię, chwytak z 4 szczękami chwytającymi fizycznie.
- Przełącznik hitboxów (H lub w menu).
- GPU: InstancedMesh na rodzaj, LOD, cząstki ognia i metalu na GPU.
- Linia odlewnicza v1.0.1: dysza spustowa na końcu rynny.

## 0.2.8 — 2026-11-14
- Model: przeładowarka z chwytakiem (v1.0.0) — podwozie z 4 kołami (opony przemysłowe 18-19.5 z generatora opon, felgi z nakrętkami), podpory, błotniki, wieniec obrotu, nadwozie z maską silnika, żaluzjami, przeciwwagą i wydechem, kabina z szybami na podwyższeniu, drabinka i poręcze, wysięgnik skrzynkowy z siłownikami, ramię, chwytak z rotatorem i 4 zakrzywionymi trójkątnymi szczękami z żebrami i siłownikami.

## 0.2.7 — 2026-11-14
- Model: punkt skupu (v1.0.0) — kontener biurowy z przetłoczeniami, okienko kasowe z ladą, drzwi, klimatyzator, tablica SKUP ZŁOMU, cennik, waga platformowa z wyświetlaczem.
- Ogrodzenie v1.0.1: tablica z UV na całą ścianę.

## 0.2.6 — 2026-11-14
- Model: ogrodzenie (v1.0.0) — plac 80×80 m, siatka plecionka 2,4 m (tekstura z kanałem alfa), słupki co 3,5 m, rura górna, 3 druty kolczaste na wysięgnikach, zamknięta brama dwuskrzydłowa z zamkiem i tablicą; zderzacze 4 m.

## 0.2.5 — 2026-11-14
- Model: linia odlewnicza (v1.0.0) — rynna spustowa z wyłożeniem ogniotrwałym, przenośnik 4,6 m z rolkami i napędem, 8 żeliwnych form z wnęką na sztabkę.
- Model: sztabka (v1.0.0) — ostrosłup ścięty 400×120/360×90×80 mm (~3,2 l) z zaokrąglonymi krawędziami i skurczem na górze; warianty aluminium, stal, mieszanka.

## 0.2.4 — 2026-11-14
- Model: piec indukcyjny z cewką (v1.0.0) — przechylny tygiel z wymurówką (~365 l), odsłonięta cewka miedziana 11 zwojów w klatce, wylew, czopy na stojakach z łożyskami, siłownik przechyłu, szafa zasilania z miernikami, szyny prądowe, węże chłodzenia, pulpit, podest ze schodami.

## 0.2.3 — 2026-11-14
- Model: zgniatarka do metalu — prasa pionowa 400 kN (v1.0.0): komora 3×1,4×2 m z żebrami i podnoszoną bramą, 4 kolumny, poprzecznica, 2 siłowniki Ø300 na poprzecznicy (skok 3,5 m), płyta dociskowa z żebrami i pasami, agregat z chłodnicą, przewody, pulpit, podest ze schodami.

## 0.2.2 — 2026-11-14
- Model: zgniatarka do puszek (v1.0.0) — lej zasypowy, komora 1,6×1×1 m, poziomy tłok z siłownikiem Ø125, zasuwa wylotowa, zsyp do kosza z siatki, agregat hydrauliczny z przewodami, szafka z przyciskami START/STOP i grzybkiem, podest ze schodkami.

## 0.2.1 — 2026-11-14
- Model: piec na papier i drewno (v1.0.0) — skrzynia stalowa z wykładziną szamotową, otwór wsadowy z otwartymi drzwiami i pochyłą tacą, ruszt z żarem, popielnik, komin 6 m z daszkiem, żaluzje, termometr, nity; strefa spalania i zderzacze.

## 0.2.0 — 2026-11-14
- Model: platforma (v1.0.0) — podest 26×18 m z płytami 2×2 m (każda osiadła inaczej), krawężnik i pas w pasy ostrzegawcze, rampa z blachy ryflowanej, 4 maszty kratowe 9 m z naświetlaczami; zderzacze statyczne.
- Materiały PBR z MatKit (GameLaboratory, kopia w js/render/matkit.js): beton, blachy, farby, grunt; UV w metrach (uvMeters).

## 0.1.8 — 2026-11-14
- Model: beczka stalowa 200 l (v1.0.0) — 2 obręcze toczne, zwijane rąbki, wpuszczone wieko i dno z pierścieniami, korki 2" i 3/4" z żeberkami, 2 wgniecenia, zużyta farba z rdzą na rąbkach i obręczach, oznakowanie UN; 3 warianty farby.

## 0.1.7 — 2026-11-14
- Model: karton zamknięty 40×30×30 (v1.0.0) — wybrzuszone ścianki, wgnieciony róg, klapy ze szczeliną, taśma przez szczelinę na boki, zakładka klejona, nadruki (strzałki, szkło, recykling, pieczątka).
- roundedBox: osobne wierzchołki ścian (UV czytelne z zewnątrz), normalne z zaokrąglenia — gazety v1.0.1, garnek v1.0.1.

## 0.1.6 — 2026-11-14
- Model: gazety związane sznurkiem (v1.0.0) — 30 warstw przesuniętych i skręconych, krawędzie kartek z wkładkami, pierwsza strona na wierzchu, sznurek jutowy na krzyż z supłem i końcami.

## 0.1.5 — 2026-11-14
- Model: garnek nierdzewny 6 l (v1.0.0) — ścianka 1,1 mm z zawiniętym brzegiem, dno kapsułowe, 2 uchwyty pałąkowe na płytkach z nitami (łby też w środku); zderzacz naczynia z uchwytami.
- Tekstura metalu szczotkowanego; jaśniejszy grunt w odbiciach.

## 0.1.4 — 2026-11-14
- Model: puszka zgnieciona (v1.0.0) — puszka 0,33 l sprasowana do ~41 mm: fałdy w romby (4 płaty, przesunięte co fałdę), przekrzywione wieczko, zachowany nadruk; 3 warianty.

## 0.1.3 — 2026-11-14
- Model: puszka aluminiowa 0,33 l (v1.0.0) — dno z kopułą, szyjka, zawijany szew, wieczko z nitem, języczkiem i otworem; 3 warianty nadruku (piwo, cola, woda).
- Podgląd modeli: wybór wariantu.
- Bryła obrotowa: poprawka kierunku ścian dla profili przechodzących przez oś.

## 0.1.2 — 2026-11-14
- Model: opona traktorowa 18.4-38 (v1.0.0) — 2×23 łapy R-1 w jodełkę, zachodzące na środek i zawinięte na bark, gruba korona, napisy.

## 0.1.1 — 2026-11-14
- Model: opona rowerowa 700×35C (v1.0.0) — okrągły przekrój, beżowe boki i czarny pas bieżnika (mapa barwy), drobne klocki i kostki barkowe, napisy.

## 0.1.0 — 2026-11-14
- Szkielet projektu: foldery, Three.js r186, Rapier 0.21 (fizyka), wersjonowanie, dokumentacja.
- Podgląd modeli (`models.html`): lista, LOD, siatka, podgląd zderzacza, dane przedmiotu.
- Doktor modeli z GameLaboratory uruchamiany w Node (`tools/doctor.mjs`), zrzuty modeli (`tools/shots.py`).
- Model: opona samochodowa 205/55 R16 (v1.0.0) — korpus z grubością, bieżnik kierunkowy z klocków, napisy na boku.
