# Wizard Chess 3D

Šahovska web aplikacija za jednog ili dva igrača sa 3D i 2D prikazom table, ugrađenim **Stockfish 19 Lite WASM** endžinom, **Šahovskom akademijom** (3D tutorijali i zagonetke), integracijama sa **Lichess** i **Chess.com**, online duelima u realnom vremenu i AI komentatorima na srpskom jeziku.

## Mogućnosti

- **Dva 3D ambijenta + klasična 2D tabla:**
  - **Sunčani Park (Zen režim)** — proceduralni popločani trg na otvorenom sa kamenom tablom visokog kontrasta, bez 3D protivnika i bez glasovnih komentara (čista 3D igra i tekstualni saveti).
  - **Gotička katedrala (Duel režim)** — detaljan 3D hram sa tri tematska okruženja i hologramskim protivnicima koji prate dešavanja na tabli.
  - **Klasična 2D Staunton tabla** (`⬚ 2D`, prečica `2`) — trenutni odziv poteza, okretanje table, prikaz šaha/mata/remija i sinhronizacija sa 3D scenom.
- **Sedam setova figura:** podrazumevani dvobojni klasični Staunton GLB (`klasicni` — *Klasični*), čarobnjački GLB (`wizard`), proceduralni antički (`ancient`), „Zmajevi“ (`dragon`), proceduralni „Srednji vek“ (`medieval`) i lenjo učitani dvobojni GLB setovi `vitez` i `srpski` (izbor se čuva u pregledaču).
- **Stockfish 19 Lite WASM analiza, saveti i Vođeni režim:**
  - **Evaluaciona traka (`EvalBar`)** uživo u 3D HUD-u i 2D tabli, uz detekciju grešaka i blundera.
  - **Pet nivoa težine AI protivnika** (*Početnik*, *Rekreativac*, *Srednji*, *Napredni*, *Majstor*) od ~600 do ~2180 Elo, sa Stockfish `MultiPV` kalibracijom za niže nivoe, `UCI_LimitStrength` za više nivoe i lokalnim JS minimax fallback-om.
  - **Ručni savet (`💡 Savet`)** i **Vođeni režim (`🧭 Vođeni`)**: kada je **Vođeni režim** uključen, preporuka najboljeg poteza (tirkizno polazno i zlatno ciljno polje + objašnjenje) automatski se prikazuje na svaki tvoj potez bez potrebe da stalno klikćeš „Savet“.
- **Režim Analize (`🔬 Analiza`) — slobodna tabla, Editor table i slika u FEN:**
  - Omogućava ručno odigravanje poteza za **obe strane** (bez automatskog odgovora AI-ja, sa brzim uzimanjem bez duel-animacija i vraćanjem po 1 potez), idealno za praćenje partije uživo ili na drugoj platformi.
  - **Editor table (`✎ Uredi tablu`)**: ručno postavljanje, premeštanje i brisanje figura na 2D tabli sa izborom ko je na potezu, rokadama i validacijom uživo — po primeni automatski predlaže najbolji sledeći potez.
  - Izbor praćene strane (*Beli*, *Crni* ili *Oba*), promena ko je na potezu, unos/kopiranje **FEN** pozicije i **prepoznavanje slike table (`📷 Slika pozicije` ili `Ctrl+V`)** pomoću multimodalnog Gemini servisa (`/api/gemini/board-from-image`).
  - Potezi u Režimu Analize ne dodeljuju XP niti ulaze u istoriju mečeva.
- **Tri AI komentatora na srpskom jeziku:** Alistair (*Mudri Arhimag*), Grix (*Goblin Roastmaster*) i Valerius (*Gordi Vitez*), sa unapred generisanim MP3 glasovnim replikama, proceduralnim Web Audio zvučnim efektima i opcionim Google Gemini serverskim posrednikom.
- **Šahovska akademija, Taktička arena i 3D Tutorijal:**
  - **⚡ Taktička arena (3D i 2D):** višepotezne taktičke kombinacije (*Mat u 1*, *Mat u 2*, *Mat u 3*, *Viljuška*, *Vezivanje*, *Ražanj*, *Otkriveni napad*, *Žrtva i odvlačenje*) sa automatskim odgovorom protivnika na tabli, adaptivnim **Taktičkim Elo** rejtingom (`📈 Elo trening`), **Survival** režimom sa 3 života (`🔥 Survival`), filtriranjem **po temi** (`🎯 Po temi`) i **Lichess dnevnim izazovom** (`📅 Dnevni izazov`, uz lokalni fallback kada je mreža nedostupna). Uključuje trenutni preklopnik `⬚ 2D` / `🏰 3D` (prečica `2`) dok je panel Arene otvoren.
  - **Klasične zagonetke i kvizovi:** 12 mat-u-jednom zagonetki sa tri postepena nagoveštaja i 36 lekcija raspoređenih u oblasti *Poznate partije*, *Otvaranja* i *Strategija*.
  - **3D Tutorijal (30 kuriranih lekcija):** animirano izvođenje poteza korak po korak u kategorijama *Otvaranja*, *Odbrana* i *Poznate partije*, sa opcijom **„⚔ Igraj odavde“** za nastavak partije protiv AI-ja iz bilo kog trenutka lekcije.
- **Eksterne šahovske integracije i PGN uvoz/izvoz:**
  - **Lichess Masters API & Daily Puzzle (uživo):** statistika najčešćih velemajstorskih poteza (W/D/L traka), pregled *Master partija* u 3D Tutorijalu jednim klikom i dnevna taktička zagonetka u *Taktičkoj areni*.
  - **Uvoz sa Lichess-a i Chess.com-a:** unos direktnog linka ka Lichess partiji ili studiji/poglavlju, kao i pretraga poslednjih partija po korisničkom imenu na Lichess-u i Chess.com-u.
  - **Lokalni PGN uvoz i izvoz:** učitavanje `.pgn` fajla sa diska ili lepljenje teksta (sačuvano u `localStorage` pod *Uvezene*), kao i preuzimanje sopstvenih partija u `.pgn` formatu (`⬇ PGN` u HUD-u i `Preuzmi PGN` po završetku partije).
- **Online 2-igrača duel i korisnički nalozi:**
  - Real-time partije preko WebSocket soba (`3+2`, `5+0`, `10+0`, `15+10`) sa pozivnim kodom/linkom, autoritativnim satovima, ponudom remija, predajom i revanšom (EvalBar, saveti i Vođeni režim su automatski zaključani tokom online meča).
  - Korisnički profili sa prijavom/registracijom u lokalnoj SQLite bazi, spajanjem gostujućeg XP napretka, istorijom partija i RPG nivoima.

## Pokretanje

**Potrebno:** Node.js 22+ (zbog ugrađenog `node:sqlite` modula i native TypeScript podrške u testovima) i npm.

```bash
npm install
npm run dev
```

Aplikacija se pokreće kao full-stack Express + Vite server na portu `3000` (`http://localhost:3000`).

## Gemini AI (opciono)

Aplikacija radi potpuno samostalno koristeći Stockfish WASM i ugrađene lokalne odgovore komentatora. Za dinamičke Gemini komentare, obrazovne preglede partija i prepoznavanje pozicije sa slike table (`📷 Slika pozicije`):

1. Nabavi Gemini API ključ preko [Google AI Studio](https://aistudio.google.com/apikey).
2. Postavi promenljivu okruženja na serveru (npr. u `.env.local` za lokalni razvoj):

```dotenv
GEMINI_API_KEY=unesi_svoj_kljuc
```

Ključ ostaje isključivo na serverskoj strani (`server.ts` posreduje kroz `/api/gemini/status`, `/api/gemini/generate` i `/api/gemini/board-from-image`) i nikada se ne šalje u klijentski JavaScript bundle.

## Kontrole, gornji HUD i donji meni (3 kapsule)

- Klikni ili dodirni figuru, pa polje na koje želiš da je pomeriš (pri ulasku pešaka u poslednji red biraš promociju: kraljica, top, lovac ili skakač).
- **Gornja traka (`#hud-top`):**
  - **Levo:** **Wizard Chess 3D `[⬚ 2D]`** (prečica `2` — brzi prelazak na klasičnu 2D tablu, a u 2D prikazu dugme **🏰 3D** vraća nazad) + indikator poteza.
  - **Desno:** **XP nivo**, **👤 Prijava / Gost** + **⚔ Online** (kreiranje ili ulazak u online duel sobu) i izbor **AI mentora**.
- **Kapsula „Režimi“:**
  - **✦ Akademija** — zagonetke, kviz lekcije, 3D Tutorijal i uvoz PGN/Lichess/Chess.com partija.
  - **🔬 Analiza** — slobodna tabla za obe strane, Editor table (`✎ Uredi tablu`), učitavanje FEN-a i skeniranje slike pozicije (dostupno i u 2D tabli).
  - **🧭 Vođeni** — uključuje/isključuje automatsku preporuku za svaki tvoj potez (dostupno i u 2D tabli).
- **Kapsula „Partija“:** **⏳ Vrati** (`U` ili `Ctrl+Z`), **⚡ AI** (odmah pokreće AI potez), **🔄 Nova** (nova partija), **⬇ PGN** (preuzimanje PGN zapisa odigrane partije).
- **Kapsula „Podešavanja“:** **♟ Set figura ▾** (padajući meni sa 7 setova), **⚔ Težina AI ▾** (padajući meni sa 5 nivoa: *Početnik*, *Rekreativac*, *Srednji*, *Napredni*, *Majstor*), **🌳 Park / 🏛️ Katedrala** (ambijent scene), **⮂ Igraj crnim / belim**, **🎥 Igrač / Odozgo**, **👁 Sakrij [H]**.
- Na dodirnom ekranu: prevlačenje jednim prstom rotira kameru, prevlačenje sa dva prsta pomera pogled, a štipanje zumira.

## Komande

| Komanda | Opis |
| --- | --- |
| `npm run dev` | Pokreće Express + Vite razvojni server (`tsx server.ts`) na portu 3000. |
| `npm run build` | Gradi klijentsku produkcijsku verziju u `dist/`. |
| `npm start` | Pokreće produkcijski Node server (`node server.ts`). |
| `npm run preview` | Lokalno prikazuje Vite produkcijski build. |
| `npm run lint` | Proverava TypeScript tipove (`tsc --noEmit`). |
| `npm test` | Pokreće unit i integracione testove iz `test/applet.test.mjs`. |

## Tehnologije

- **Frontend:** React 19, TypeScript, Three.js, Vite
- **Šahovski endžini:** Stockfish 19 Lite (WASM Web Worker), `chess.js`, deljena pravila (`src/shared/chessRules.ts`)
- **Backend i baza:** Express 5, WebSocket (`ws`), `node:sqlite`
- **AI integracije:** `@google/genai` (serverski proxy), Lichess Masters / Public API, Chess.com Public API
