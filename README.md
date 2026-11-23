# Wizard Chess 3D

Šahovska web aplikacija za jednog ili dva igrača sa 3D i 2D prikazom table, ugrađenim **Stockfish 19 Lite WASM** endžinom, **Šahovskom akademijom** (3D tutorijali i zagonetke), integracijama sa **Lichess** i **Chess.com**, online duelima u realnom vremenu i AI komentatorima na srpskom jeziku.

## Mogućnosti

- **Dva 3D ambijenta + klasična 2D tabla:**
  - **Sunčani Park (Zen režim)** — proceduralni popločani trg na otvorenom sa kamenom tablom visokog kontrasta, bez 3D protivnika i bez glasovnih komentara (čista 3D igra i tekstualni saveti).
  - **Gotička katedrala (Duel režim)** — detaljan 3D hram sa tri tematska okruženja i hologramskim protivnicima koji prate dešavanja na tabli.
  - **Klasična 2D Staunton tabla** (`⬚ 2D`, prečica `2`) — trenutni odziv poteza, okretanje table, prikaz šaha/mata/remija i sinhronizacija sa 3D scenom.
- **Sedam setova figura:** podrazumevani dvobojni klasični Staunton GLB (`klasicni` — *Klasični*), čarobnjački GLB (`wizard`), proceduralni antički (`ancient`), „Zmajevi i vitezovi“ (`dragon`), proceduralni „Srednji vek“ (`medieval`) i lenjo učitani dvobojni GLB setovi `vitez` i `srpski` (izbor se čuva u pregledaču).
- **Stockfish 19 Lite WASM analiza, saveti i Vođeni režim:**
  - **Evaluaciona traka (`EvalBar`)** uživo u 3D HUD-u i 2D tabli, uz detekciju grešaka i blundera.
  - **Tri nivoa AI protivnika** (*Lako*, *Srednje*, *Teško*) profilisana po ELO jačini u zavisnosti od izabranog AI lika, sa lokalnim JS minimax fallback-om.
  - **Ručni savet (`💡 Savet`)** i **Vođeni režim (`🧭 Vođeni`)**: kada je **Vođeni režim** uključen, preporuka najboljeg poteza (tirkizno polazno i zlatno ciljno polje + objašnjenje) automatski se prikazuje na svaki tvoj potez bez potrebe da stalno klikćeš „Savet“.
- **Tri AI komentatora na srpskom jeziku:** Alistair (*Mudri Arhimag*), Grix (*Goblin Roastmaster*) i Valerius (*Gordi Vitez*), sa unapred generisanim MP3 glasovnim replikama, proceduralnim Web Audio zvučnim efektima i opcionim Google Gemini serverskim posrednikom.
- **Šahovska akademija i 3D Tutorijal:**
  - **Taktičke vežbe i kvizovi:** 12 mat-u-jednom zagonetki sa tri postepena nagoveštaja i 36 lekcija raspoređenih u oblasti *Poznate partije*, *Otvaranja* i *Strategija*.
  - **3D Tutorijal (30 kuriranih lekcija):** animirano izvođenje poteza korak po korak u kategorijama *Otvaranja*, *Odbrana* i *Poznate partije*, sa opcijom **„⚔ Igraj odavde“** za nastavak partije protiv AI-ja iz bilo kog trenutka lekcije.
- **Eksterne šahovske integracije i PGN uvoz/izvoz:**
  - **Lichess Masters API (uživo):** statistika najčešćih velemajstorskih poteza (W/D/L traka) za trenutnu poziciju i pregled *Master partija* u 3D Tutorijalu jednim klikom.
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

Aplikacija radi potpuno samostalno koristeći Stockfish WASM i ugrađene lokalne odgovore komentatora. Za dinamičke Gemini komentare i objašnjenja saveta:

1. Nabavi Gemini API ključ preko [Google AI Studio](https://aistudio.google.com/apikey).
2. Postavi promenljivu okruženja na serveru (npr. u `.env.local` za lokalni razvoj):

```dotenv
GEMINI_API_KEY=unesi_svoj_kljuc
```

Ključ ostaje isključivo na serverskoj strani (`server.ts` posreduje kroz `/api/gemini/status` i `/api/gemini/generate`) i nikada se ne šalje u klijentski JavaScript bundle.

## Kontrole i donji meni (3 kapsule)

- Klikni ili dodirni figuru, pa polje na koje želiš da je pomeriš (pri ulasku pešaka u poslednji red biraš promociju: kraljica, top, lovac ili skakač).
- **Kapsula „Režimi“:**
  - **✦ Akademija** — zagonetke, kviz lekcije, 3D Tutorijal i uvoz PGN/Lichess/Chess.com partija.
  - **⚔ Online** — kreiranje ili ulazak u online duel sobu.
  - **⬚ 2D / 🏰 3D** (prečica `2`) — prebacivanje između 3D scene i klasične 2D table.
  - **🌳 Park / 🏛️ Katedrala** — prebacivanje između Sunčanog Parka (Zen režim) i Gotičke katedrale.
  - **🧭 Vođeni** — uključuje/isključuje automatsku preporuku za svaki tvoj potez (dostupno i u 2D tabli).
- **Kapsula „Partija“:** **⏳ Vrati** (`U` ili `Ctrl+Z`), **⚡ AI** (odmah pokreće AI potez), **🔄 Nova** (nova partija), **⬇ PGN** (preuzimanje PGN zapisa odigrane partije).
- **Kapsula „Podešavanja“:** **♟ Set figura** (7 setova), **⚔ Lako / Srednje / Teško**, **⮂ Igraj crnim / belim**, **🎥 Igrač / Odozgo**, **👁 Sakrij [H]**.
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
