# 🚀 2025 Hack-Code – CodeQuartet

![Phaser](https://img.shields.io/badge/engine-Phaser3-4cc3ff) ![Status](https://img.shields.io/badge/state-Prototype-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## 🧭 Tartalomjegyzék
- [Áttekintés](#-áttekintés)
- [Linkek](#-linkek)
- [Sztori](#-sztori)
- [Menürendszer](#-menürendszer)
- [Játékmenet és irányítás](#-játékmenet-és-irányítás)
- [Fegyverek és pickupok](#-fegyverek-és-pickupok)
- [Képernyőképek / videók](#-képernyőképek--videók)
- [Helyi futtatás](#-helyi-futtatás)
- [Build & deploy](#-build--deploy)
- [Fejlesztők](#-fejlesztők)
- [Eszközök (AI és nem AI)](#-eszközök-ai-és-nem-ai)
- [Beadás (tömörítés / megosztás)](#-beadás-tömörítés--megosztás)
- [Licenc](#-licenc)

## 🎮 Áttekintés
Egy gyors tempójú űrshooter, ahol hullámokban érkező ellenségeket kell túlélni, váltogatható fegyverekkel és körkörös pajzzsal. A cél: minél tovább életben maradni és minél több hajót megsemmisíteni.

## 🔗 Linkek
- Repo: https://github.com/Mathias-Rex/2025-Hack-Code_CodeQuartet  
- Élő verzió (GitHub Pages): https://mathias-rex.github.io/2025-Hack-Code_CodeQuartet/

## 📜 Sztori
A kolónia utolsó vadászpilótájaként feladatod áttörni az ellenség blokádján. A pajzsok és a fegyverek közti okos váltás a kulcs a túléléshez.

## 🧭 Menürendszer
- **Főmenü:** Játék indítása, beállítások, kilépés.
- **Pause menü:** Folytatás, Settings (zene/sfx hangerő), vissza a főmenübe.
- **Game Over overlay:** Újraindítás vagy visszatérés a hangárba.

## 🕹️ Játékmenet és irányítás
- Mozgás: `W`/`A`/`S`/`D` **vagy** `↑`/`←`/`↓`/`→`
- Lövés: `SPACE`
- Fegyverváltás: `Q` (kék) / `E` (piros)
- Töltés: `R`
- Pause: `ESC`
- A játék 25 kill vagy 5 perc túlélés után győzelemre fut ki; 0 HP esetén vereség.

## 💥 Fegyverek és pickupok
- **Kék lövedék:** Gyors, ammo alapértelmezett.
- **Piros sugár:** Folyamatos sebzés, külön töltésidővel.
- **Pajzs pickup (enemyShip2 dobhatja):** Íves pajzs, amely lövedékeket felfog, élettartammal.
- **Gear pickup (enemyShip3 dobhatja):** Gyógyítás (+1 HP).
- Ellenségek hullámokban érkeznek, eltérő HP-val és mozgással (beleértve a hullámzó útvonalat).

## 🖼️ Képernyőképek / videók
- Helyezd ide a képeket: `assets/docs/screenshots/`  
- Javasolt GIF / rövid klip: `assets/docs/videos/`  
_(Illusztráció: ![Gameplay](assets/docs/screenshots/gameplay1.png))_

## 🧑‍💻 Helyi futtatás
1) Követelmény: modern böngésző (helyi file:// betöltést támogassa).
2) Klónozd a repót.
3) Nyisd meg az `index.html`-t a böngészőben (duplakatt vagy `file:///.../index.html`).
   - Ha szeretnéd kiszolgálni, futtathatsz egyszerű statikus szervert is: pl. `python -m http.server 3000`.

## 🚚 Deploy
- Nincs külön build; a forrás közvetlenül fut.
- GitHub Actions deployol közvetlenül a `main` branchről GitHub Pages-re (élő link: lásd fent).

## 👥 Fejlesztők
- Írd ide a csapattagok neveit és szerepeit (pl. design, kód, audio).

## 🛠️ Eszközök (AI és nem AI)
- **AI:**: 
    - ChatGPT Codex (tervezés/kód review), WindSurf és Copilot (kód egészítés IDE-ban).
    - Suno: zene generálás
    - Lenoardo: game assetek
    - Nemtommi: Narráció

- **Nem AI:**
  - Phaser 3, JavaScript/Node, (build tool itt), hang/sprite szerkesztők (pl. Aseprite, Figma) — egészítsd ki a valós listával.
  - Photopea: game assetek javítása, áttlátszó háttér

## 📄 Licenc
- MIT (lásd `LICENSE`).