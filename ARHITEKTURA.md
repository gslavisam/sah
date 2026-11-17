# Arhitektura projekta — Wizard Chess 3D

Ovaj dokument opisuje kako je projekat trenutno organizovan: gde se pokreće aplikacija, koji moduli imaju koje odgovornosti i kako podaci prolaze kroz interfejs, šahovski engine i servise. Opis prati postojeći kod; ne predstavlja predlog za buduću refaktorizaciju.

## 1. Pregled sistema

Wizard Chess 3D je klijentska web-aplikacija. React prikazuje HUD i povezuje UI sa servisima, dok `wizardChessEngine.js` upravlja Three.js scenom, figurama, potezima i lokalnim AI protivnikom. Dva dela komuniciraju preko DOM elemenata, događaja pregledača i `window.wizardChess` API-ja.

```text
index.html
  └── src/main.tsx
       ├── React StrictMode
       └── src/App.tsx
            ├── HUD i kontrolne komponente
            ├── geminiService ── Google Gemini (opciono) / lokalni fallback
            ├── progressionService ── localStorage
            ├── Academy ── puzzleCatalog
            ├── sceneThemes ── tipizirane postavke ambijenta
            ├── sceneEnvironments ── proceduralne 3D grupe ambijenta
            ├── voiceService ── lokalni MP3 audio
             └── soundService ── proceduralni Web Audio zvučni efekti (SFX)

src/App.tsx ── initWizardChess()
  └── src/wizardChessEngine.js
       ├── Three.js renderer, scena, kamera i kontrole
       ├── proceduralni ambijenti po izabranoj temi
       ├── lokalna šahovska pravila i stanje partije
       ├── heuristički AI protivnik
       ├── GLB modeli/animacije i proceduralni antički set
       ├── DOM HUD događaji i browser CustomEvent-i
       └── window.wizardChess programatski API

public/assets/
  ├── glb/                 kompresovani 3D GLB modeli
  └── audio/voices/        unapred generisani glasovni komentari
```

## 2. Ulazna tačka i inicijalizacija

1. [index.html](./index.html) definiše osnovnu HTML stranicu i mount element `#root`, a učitava `src/main.tsx`.
2. [src/main.tsx](./src/main.tsx) montira React aplikaciju u `#root` unutar `StrictMode` i uvozi globalne stilove iz `src/styles.css`.
3. [src/App.tsx](./src/App.tsx) prikazuje HUD, registruje `wizardchess:move` / `wizardchess:reset` slušaoce i jednom poziva `initWizardChess()`.
4. [src/wizardChessEngine.js](./src/wizardChessEngine.js) pravi WebGL renderer u `#canvas-container`, učitava GLB modele i zatim inicijalizuje tablu, render loop i početnu poziciju.

Engine očekuje da React prvo prikaže HUD elemente koje zatim pronalazi preko ID-jeva, kao što su `btn-reset`, `btn-ai-move` i `btn-cam-player`. Zbog te podele neki React elementi i Three.js logika dele DOM preko selektora i globalnog `window.wizardChess` objekta.

## 3. Mapa fajlova

### Aplikacija i prikaz

| Fajl | Odgovornost |
| --- | --- |
| [src/main.tsx](./src/main.tsx) | React ulazna tačka; kreira root i uvozi `src/styles.css`. |
| [src/App.tsx](./src/App.tsx) | Glavni React ekran, inicijalizacija engine-a, izbor/pamćenje seta figura i AI lika, događaji poteza/resetovanja, hint, undo, mobilni panel i kompozicija HUD-a. |
| [src/styles.css](./src/styles.css) | Stilovi aplikacije, HUD-a, AI panela, modala, mobilnog interfejsa i prikaza nad Three.js canvas-om. |
| [src/components/PersonaSelector.tsx](./src/components/PersonaSelector.tsx) | Prikazuje ličnosti iz `PERSONAS` i poziva `onSelectPersona(id)`. |
| [src/components/AIBubble.tsx](./src/components/AIBubble.tsx) | Prikazuje ime/ličnost, poruku, stanje učitavanja, glas, dugme za hint, Gemini podešavanje i minimizaciju panela. |
| [src/components/ApiKeyModal.tsx](./src/components/ApiKeyModal.tsx) | Unos, čuvanje i brisanje Gemini API ključa preko `geminiService`. |
| [src/components/PlayerLevelBar.tsx](./src/components/PlayerLevelBar.tsx) | Prikazuje nivo, titulu, XP napredak, niz uzastopnih uzimanja i poslednju XP nagradu. |
| [src/components/Academy.tsx](./src/components/Academy.tsx) | Prikazuje četiri oblasti, navigaciju kroz lekcije, pitanja sa odgovorima i povratnom informacijom, napredak i mat-zagonetke. |
| [src/components/Classic2DBoard.tsx](./src/components/Classic2DBoard.tsx) | Klasični 2D Staunton prikaz šahovske table sinhronizovan sa engine-om, sa trenutnim izvršavanjem poteza, okretanjem table i jasnim statusom šaha/mata/remija. |
| [src/components/Chess2DPiece.tsx](./src/components/Chess2DPiece.tsx) | Vektorski (SVG) prikaz šest šahovskih figura za 2D tablu i modal promocije pešaka. |

### Logika igre i servisi

| Fajl | Odgovornost |
| --- | --- |
| [src/wizardChessEngine.js](./src/wizardChessEngine.js) | Centralni Three.js i šahovski engine. Sadrži scenu, GLB i proceduralne figure, pravila, stanje partije, animacije, lokalni AI, kontrole kamere, HUD događaje i API za automatizaciju. |
| [src/services/geminiService.ts](./src/services/geminiService.ts) | Tipovi i definicije ličnosti; Gemini generisanje reakcija, reakcija na undo i hintova; lokalni fallback odgovori. |
| [src/services/sceneThemes.ts](./src/services/sceneThemes.ts) | Tipizirane postavke pozadine, magle, svetala i tona kamenih materijala za teme `mentor`, `roast` i `rival`. |
| [src/services/progressionService.ts](./src/services/progressionService.ts) | XP, nivoi, titule, nizovi i statistika igrača; čuvanje u `localStorage`; obaveštavanje React pretplatnika. |
| [src/services/voiceService.ts](./src/services/voiceService.ts) | Uključivanje/isključivanje govora, normalizacija teksta, povezivanje gotovih poruka sa MP3 fajlovima i puštanje zvuka. |
| [src/services/soundService.ts](./src/services/soundService.ts) | Proceduralni Web Audio zvučni efekti za pomeranje, uzimanje figura, šah, mat i undo. |
| [src/services/puzzleCatalog.ts](./src/services/puzzleCatalog.ts) | Tipizirani podaci 12 lokalnih mat-zagonetki: pozicija, provereni mat-potez, strana na potezu, tri nagoveštaja i objašnjenje. |
| [src/services/academyCatalog.ts](./src/services/academyCatalog.ts) | Kurirani edukativni kvizovi: 12 poznatih partija, 12 otvaranja i 12 strategijskih lekcija, svaka sa objašnjenjem odgovora. |
| [src/services/academyProgression.ts](./src/services/academyProgression.ts) | Čuva jedinstvene završene lekcije i zagonetke u `localStorage`; ponovljena aktivnost ne povećava progres. |

### Konfiguracija, testovi i sredstva

| Putanja | Odgovornost |
| --- | --- |
| [package.json](./package.json) | Zavisnosti i npm skripte za razvoj, build, type-check i testove. |
| [vite.config.ts](./vite.config.ts) | React Vite plugin, port 3000, alias `@` i prosleđivanje env vrednosti za Gemini. |
| [tsconfig.json](./tsconfig.json) | TypeScript podešavanja; uključuje `src` i `vite.config.ts`, dozvoljava JS i ne emituje fajlove. |
| [metadata.json](./metadata.json) | Metapodaci AI Studio appleta. |
| [test/applet.test.mjs](./test/applet.test.mjs) | Proverava HUD elemente, strukturu kataloga Akademije i validnost sedam kompresovanih GLB modela. |
| [public/assets/glb/](./public/assets/glb/) | Katedrala i beli modeli šest vrsta šahovskih figura, kao `.glb.gz.b64`. |
| [public/assets/audio/voices/](./public/assets/audio/voices/) | MP3 govorni komentari organizovani po ličnosti (`mentor`, `roast`, `rival`). |
| [scripts/generate_voices.py](./scripts/generate_voices.py) | Pomoćna skripta za generisanje unapred definisanih audio fraza preko `edge_tts`. |

## 4. React sloj i tok korisničkih događaja

`App` čuva React UI stanje:

- `selectedPersona` — izabrani AI lik (podrazumevano `mentor`).
- `aiMessage` i `isLoadingAI` — tekst u AI panelu i indikator generisanja.
- `isApiKeyModalOpen` — vidljivost API modalnog prozora.
- `mobileSheetOpen` — prikaz mobilnih kontrola.
- `academyVisible`, `academyView` i `academyPuzzleId` — prikaz Akademije i aktivnog zadatka.
- `academyFeedback`, `academyHintCount` i `academyError` — pokušaj, postupni nagoveštaji i greške učitavanja zagonetke.

`handleSelectPersona` menja lik, početnu poruku i temu scene preko `window.wizardChess.setSceneTheme(id)`. `PersonaSelector` koristi se i u desktop i u mobilnom HUD-u. Na početku partije engine primenjuje trenutno izabranu temu nakon inicijalizacije.

Kada engine završi potez, emituje `wizardchess:move` sa bojom i vrstom figure, početnim i ciljnim poljem, informacijom o uzimanju, šahu, kraju partije i brojem poteza. `App` zatim:

1. dodeljuje XP preko `progressionService.awardMove(...)`;
2. traži komentar od `geminiService.getReaction(...)`;
3. ažurira poruku i stanje učitavanja AI panela.

Potezi u Akademiji emituju odvojeni `wizardchess:academy-move` događaj. `App` koristi proveru matiranja iz engine-a za povratnu informaciju zadatka; ti potezi ne dodeljuju XP niti pokreću običan AI komentar. `enterAcademy(...)` sačuva serijalizovano stanje table, istoriju poteza, režim i stranu igrača; `exitAcademy()` vrati ih i ponovo zakaže AI potez kada je potrebno. Katalog trenutno sadrži 12 proverljivih mat-zagonetki.

`wizardchess:reset` osvežava poruku komentatora za novu partiju. Hint iz `AIBubble` poziva `handleRequestHint`, koji uzima trenutni kontekst engine-a preko `window.wizardChess.getGameContext()` i poziva Gemini servis. Undo poziva `window.wizardChess.undoPlayerMove()` pa traži reakciju lika. Akademija nudi 12 proverljivih mat-zagonetki i po 12 samostalnih kviz-lekcija o poznatim partijama, otvaranjima i strategiji. Lekcije koriste lokalno zapisane odgovore i objašnjenja; uspešan odgovor ili mat evidentira se jednom u `academyProgression`. Nakon uspeha zagonetke `setAcademyPosition(...)` učitava sledeću poziciju bez ponovnog snimanja ili menjanja sačuvane partije. Povratak iz zagonetke vrati originalnu partiju, dok pregled kviz-lekcija ne menja stanje table.

## 5. Three.js i šahovski engine

### Scena i sredstva

`initWizardChess()` u [src/wizardChessEngine.js](./src/wizardChessEngine.js) pravi `WebGLRenderer`, `Scene`, kameru i `OrbitControls`, dodaje svetla i postavlja PMREM okruženje. `setSceneTheme(themeId)` podešava boju pozadine i magle, glavna svetla, svetla mangala i blagi tint registrovanih kamenih materijala; prikazuje dekorativnu grupu izabrane teme i ostavlja katedralni model vidljivim. Pri nepoznatom ključu beleži upozorenje i vraća izgled na podrazumevanu Alistair temu. Promena scene ne poziva reset partije. `loadAllAssets()` učitava:

- `option8_cathedral` kao detaljnu osnovu svih scena;
- modele `pawn`, `rook`, `knight`, `bishop`, `queen` i `king`;
- teksture, materijale i animacije koje dolaze uz te modele.

Modele engine traži prvo kao gzip-kompresovani Base64 GLB iz `./assets/glb/`, pa pokušava običan `.glb` fajl kao rezervu. Pri početnom učitavanju dekompresuju se samo katedrala i podrazumevani `wizard` set (plus eventualno zapamćeni detaljni GLB set iz `localStorage`), dok se ostali detaljni GLB setovi (`vitez`, `srpski`, `srpski-kraljevski`) učitavaju lenjo (*lazy-load*) tek kada ih igrač prvi put izabere.

`setPieceSet('wizard' | 'ancient' | 'dragon' | 'medieval' | 'vitez' | 'srpski' | 'srpski-kraljevski')` menja prikaz svih figura uživo bez menjanja polja, poteza ili istorije partije. Podržano je sedam setova: rigovani `wizard` GLB set, tri proceduralna seta (`ancient`, `dragon`, `medieval`) čija se geometrija oslobađa pri promeni seta, i tri detaljna dvobojna GLB seta (`vitez`, `srpski`, `srpski-kraljevski`). React čuva korisnikov izbor u `localStorage`.

Dok je otvoren 2D modal (`set2DModeActive(true)`), potezi igrača i AI-ja izvršavaju se trenutno bez čekanja 3D animacije, a 3D render petlja miruje dok se korisnik ne vrati u 3D katedralu.

`src/services/sceneThemes.ts` definiše identifikatore i palete, a `src/services/sceneEnvironments.ts` gradi tri grupe dekorativne geometrije: Alistairove armilarne sfere koje se polako okreću, Grixove zupčanike i nisko lebdeće varnice, odnosno Valeriusove heraldske zastave koje se blago njišu. `stepScene()` u `src/wizardChessEngine.js` ažurira samo trenutno vidljivu grupu; izbor teme ne dodaje nove objekte pri svakom izboru. Dekoracije ostaju van table i dopunjuju postojeću katedralu — nisu zamena za tri kompletna, zasebna okruženja.

### Stanje i pravila šaha

Stanje partije čuvaju promenljive unutar `initWizardChess()` — uključujući `boardState`, `currentTurn`, `playerColor`, `gameOver`, `moveHistory`, selekciju figure, validne poteze i stanje animacije. Zbog toga je trenutna arhitektura zatvorena u jednoj funkciji i nije izdvojena u poseban chess-model modul.

Glavne funkcije pravila i poteza:

- `getPseudoMovesForPiece(...)` — računa geometrijski moguće poteze figure, uključujući *en passant*.
- `isKingInCheck(...)` — proverava da li je kralj napadnut.
- `getLegalMovesForPiece(...)` i `getAllLegalMoves(...)` — filtriraju poteze zbog šaha i dodaju malu i veliku rokadu (`O-O`, `O-O-O`).
- `executeChessMove(...)` — ažurira stanje table (uključujući promociju u kraljicu/topa/lovca/skakača, *en passant*, pravilo 50 poteza i trostruko ponavljanje pozicije), animira potez u 3D ili ga izvršava trenutno u 2D režimu, proverava završetak i emituje događaj poteza.
- `resetChessBoard(...)`, `captureBoardSnapshot()` i `restoreBoardSnapshot(...)` — početak partije i čuvanje/obnavljanje kompletnog stanja.
- `undoPlayerMove()` — vraća poslednji potez, odnosno poteze igrača i AI-ja u single-player režimu.

Pravila šaha su implementirana u projektu; `package.json` ne sadrži `chess.js` zavisnost.

### AI protivnik

`chooseSmartAIMove(color)` podržava tri nivoa težine (`easy`, `medium`, `hard`): heuristički izbor poteza na lakom nivou, proveru protivničkih odgovora na srednjem nivou i 3-ply pretragu sa *alpha-beta* odsecanjem na teškom nivou. `maybeScheduleAIMove()` zakazuje odgovor protivnika, a `triggerAIMoveNow()` pokreće potez odmah.

**Važna razlika:** ovaj engine bira poteze za protivnika. Gemini servis generiše tekstualne komentare i savete; ne bira poteze i nije izvor pravila šaha.

### Animacije i kontrole

Engine sadrži i logiku za:

- animirano pomeranje figura i sekvence uzimanja;
- pulsirajuću zlatnu runu ispod izabrane figure, sinhronizovanu sa oznakama legalnih poteza i ažuriranu u `stepScene(...)`;
- kamere `player`, `top`, `side` i `wide`, kao i glatke prelaze;
- kontrole mišem/dodirom i kretanje kamere tastaturom;
- završni prikaz šah-mata i efekte razbijanja kamene figure;
- režim Akademije koji postavlja zagonetku bez slanja poteza u običan XP/AI komentar tok i vraća sačuvano logičko stanje partije pri izlasku;
- render loop kroz `animate()` i `stepScene(...)`.

## 6. Granica između React-a i engine-a

Trenutno postoje tri mehanizma komunikacije:

1. **DOM i ID-jevi:** engine pronalazi React-om prikazane kontrole (`btn-reset`, `btn-ai-move`, `btn-cam-*` itd.) i direktno im dodaje click handlere. React dugmad mogu imati sopstvene handlere, na primer za zatvaranje mobilnog menija.
2. **CustomEvent:** engine šalje `wizardchess:move` i `wizardchess:reset`; `App` ih sluša i poziva servise.
3. **`window.wizardChess`:** engine izlaže funkcije kao `undoPlayerMove`, `triggerAIMoveNow`, `resetChessBoard`, `setCameraPreset` i `getGameContext`. React ga koristi za undo, hint i vraćanje UI-ja; testovi i automatizacija koriste širi API.

Ova integracija trenutno radi, ali oslanja se na dogovorene DOM ID-jeve i globalni objekat, a ne na tipizovan React context ili zaseban engine adapter.

## 7. AI, glas i napredovanje

### Gemini i offline odgovori

U [src/services/geminiService.ts](./src/services/geminiService.ts):

- `PersonaId`, `Persona` i `PERSONAS` definišu tri lika i njihove promptove.
- `MoveEventDetail` je oblik događaja koji opisuje potez.
- `getReaction(...)` komentariše potez, `getUndoReaction(...)` reaguje na vraćanje poteza, a `getHint(...)` daje savet.
- Ako Gemini nije konfigurisan ili poziv ne uspe, servis bira lokalni odgovor iz `FALLBACK_REACTIONS` ili koristi offline hint.
- API ključ se može podesiti preko `getApiKey()` / `setApiKey()`.

`vite.config.ts` učitava `GEMINI_API_KEY` ili `VITE_GEMINI_API_KEY` i ugrađuje vrednost u klijentski bundle. Ključ koji se unosi kroz modal čuva se u `localStorage` pregledača. Ni jedan od ova dva pristupa ne skriva ključ od korisnika aplikacije; za produkcijski tajni ključ potreban je serverski posrednik.

### Glas

`AIBubble` prosleđuje tekst i ličnost servisu `voiceService`. Servis prvo traži odgovarajući unapred generisani MP3 u `public/assets/audio/voices/`, a za neprepoznat tekst bira frazu prema ključnim rečima. Uključenost glasa pamti se u `localStorage`.

### XP i nivoi

`progressionService` pamti XP, nivo, titulu, niz uzastopnih uzimanja i statistiku poteza u `localStorage`. `awardMove(...)` dodeljuje XP isključivo za poteze igrača (potez, uzimanje, šah, pobedu matom ili remi), dok `recordOpponentMove(...)` resetuje niz uzimanja kada AI uzme figuru ili matira igrača. `awardHint()` dodeljuje XP za savet. `PlayerLevelBar` prati servis preko `subscribe(...)`.

## 8. Konfiguracija, pokretanje i provere

Naredbe definisane u [package.json](./package.json):

| Naredba | Svrha |
| --- | --- |
| `npm run dev` | Vite razvojni server, port 3000. |
| `npm run build` | Produkcijski build u `dist/`. |
| `npm run preview` | Lokalni pregled produkcijskog build-a. |
| `npm run lint` | `tsc --noEmit` provera tipova. |
| `npm test` | Node testovi iz `test/applet.test.mjs`. |

TypeScript konfiguracija uključuje i JavaScript fajlove, ali trenutno ne uključuje proveru tipova za JS (`checkJs` nije uključen). Zato su React i servisi uglavnom TypeScript, dok je centralni engine JavaScript.

## 9. Trenutna arhitektonska ograničenja

- `src/wizardChessEngine.js` je najveći centralni modul i sadrži više odgovornosti: prikaz, modelovanje scene, pravila, AI, animacije i kontrolere.
- Šahovsko stanje ostaje privatno unutar `initWizardChess()`; druge celine pristupaju ograničenim funkcijama iz `window.wizardChess`.
- React i engine dele DOM ID-jeve, pa promena markup-a može uticati na engine handlere.
- Tematske dekoracije su proceduralni prototipi preko zajedničke katedrale; ne predstavljaju tri kompletna, zasebna okruženja.
- Gemini pozivi idu iz klijentske aplikacije; ključ ugrađen preko env promenljive nije tajna.
- Automatski testovi proveravaju HUD ugovor, pravila integracije, katalog Akademije i integritet 3D modela; vizuelno WebGL iscrtavanje proverava se u pregledaču.

## 10. Funkcije relevantne za planiranje scena

Za povezivanje scena sa ličnostima najvažnije tačke su:

- `App.handleSelectPersona(id)` — menja React stanje, uvodnu poruku lika i temu scene.
- `PersonaSelector` — poziva `onSelectPersona` za izabranog lika.
- `initWizardChess()` — inicijalizuje scenu i čuva Three.js objekte unutar closure-a.
- `loadAllAssets()` — učitava katedralu i figure na početku.
- `setSceneTheme(themeId)` — primenjuje temu bez resetovanja partije.
- `SCENE_THEMES` — tipizirana konfiguracija tema u `src/services/sceneThemes.ts`.
- `createSceneEnvironments()` — izgradi dekorativne grupe tema u `src/services/sceneEnvironments.ts`.
- `window.wizardChess` — postojeća granica za izlaganje engine funkcija van closure-a.

Dalji razvoj zasebnih ambijenata treba da proširi kontrolisanu engine funkciju; React ne treba direktno da menja Three.js objekte. Pri promeni scene mora se sačuvati `boardState` i ostalo stanje partije.
