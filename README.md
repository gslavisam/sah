# Wizard Chess 3D

Šahovska igra za jednog igrača smeštena u 3D gotičku katedralu. Igra kombinuje interaktivnu šahovsku tablu, modelovane kamene figure i komentare AI likova na srpskom jeziku.

## Mogućnosti

- 3D šahovska tabla, modelovane figure i animacije poteza i uzimanja figura.
- Sedam stilova figura: čarobnjački GLB, proceduralni antički, „Zmajevi i vitezovi“, proceduralni „Srednji vek“ i zasebni GLB setovi „Vitez“, „Srpski“ i „Klasični“, svaki sa belim i crnim modelima; izbor se čuva u pregledaču.
- Igra protiv lokalnog šahovskog protivnika; izbor igranja belim ili crnim figurama.
- Četiri pogleda kamere: igrački, odozgo, bočni i široki pogled na katedralu.
- Tri AI komentatora: Alistair (mentor), Grix (goblin) i Valerius (rival).
- Šahovska akademija sa četiri dostupne oblasti: 12 zagonetki mat-u-jednom, 12 lekcija o poznatim partijama, 12 lekcija o otvaranjima i 12 lekcija o strategiji.
- Zagonetke proveravaju mat kroz postojeća šahovska pravila, nude tri postepena nagoveštaja i omogućavaju ponovni pokušaj i prelazak na sledeći zadatak.
- Lekcije objašnjavaju jednu ideju i završavaju se pitanjem sa povratnom informacijom i objašnjenjem odgovora; poznate partije su kratki sažeci, bez reprodukcije cele PGN partije.
- Akademija čuva završene aktivnosti lokalno i ne dodeljuje ponovljive XP nagrade za odgovaranje.
- Ulazak u zagonetku čuva aktivnu partiju, a izlazak je vraća.
- Izbor komentatora menja osvetljenje i tematsku dekoraciju: Akademiju zvezdanih mapa, Goblinsku radionicu ili Dvoranu izazova.
- Postojeći detaljni 3D model katedrale ostaje osnova svih tema; proceduralni elementi ga dopunjuju, ne zamenjuju.
- Diskretni ambijentalni pokreti po temi: rotirajući astronomski instrumenti, lebdeće varnice i zastave koje se njišu.
- Saveti za potez, komentari na poteze i opcioni dinamički odgovori preko Google Gemini-ja.
- Offline komentari i saveti rade i bez Gemini API ključa.
- Glasovni komentari na srpskom, sistem iskustva (XP) i napredovanje kroz nivoe.
- Prilagođen interfejs za mobilne uređaje, miš i dodir.

## Pokretanje

**Potrebno:** Node.js 20.19+ ili 22.12+ i npm.

```bash
npm install
npm run dev
```

Otvori adresu koju Vite prikaže u terminalu (podrazumevano `http://localhost:3000`).

## Gemini AI (opciono)

Igra radi i bez API ključa, koristeći ugrađene lokalne odgovore. Za dinamičke komentare i savete:

1. Nabavi Gemini API ključ preko [Google AI Studio](https://aistudio.google.com/apikey).
2. U igri izaberi dugme **Ključ** u AI panelu i unesi ključ.

Ključ unet u panel čuva se u `localStorage` pregledača. Za lokalni razvoj možeš umesto toga napraviti `.env.local` u korenu projekta:

```dotenv
GEMINI_API_KEY=unesi_svoj_kljuc
```

Vite ugrađuje ovu vrednost u JavaScript aplikacije u pregledaču. Zato nemoj koristiti niti objavljivati ključ koji mora ostati tajan; za javno postavljanje aplikacije koristi serverski posrednički servis.

## Kontrole

- Klikni ili dodirni figuru, pa polje na koje želiš da je pomeriš (pri ulasku pešaka u poslednji red biraš figuru za promociju: kraljica, top, lovac ili skakač).
- **⮂ Igraj crnim / Igraj belim** menja boju figura kojom igraš.
- **⚡ AI** odmah pokreće potez protivnika.
- **🔄 Nova** započinje novu partiju.
- **♟ Set figura** ciklično menja izgled figura bez resetovanja partije (dodatni GLB setovi učitavaju se po potrebi).
- **⚔ Lako / Srednje / Teško** menja težinu lokalnog AI protivnika.
- **⬚ 2D / 🏰 3D** (ili prečica **2**) prebacuje prikaz između pune 3D katedrale i klasične 2D Staunton šahovske table sa trenutnim odzivom poteza.
- **✦ Akademija** otvara četiri oblasti i 48 kratkih aktivnosti; kviz lekcije nude sledeću lekciju, a zagonetke koriste tablu i vraćaju prethodnu partiju pri izlasku.
- **⏳ Vrati** (`U` ili `Ctrl+Z`) vraća prethodni potez.
- **🎥 Igrač / Odozgo** menja ugao kamere u 3D prikazu.
- **👁 Sakrij [H]** (prečica **H**) sakriva ili vraća interfejs.
- Na dodirnom ekranu: prevlačenje jednim prstom rotira kameru, prevlačenje sa dva prsta pomera pogled, a štipanje zumira.

## Komande

| Komanda | Opis |
| --- | --- |
| `npm run dev` | Pokreće razvojni server na portu 3000. |
| `npm run build` | Pravi produkcijsku verziju u direktorijumu `dist/`. |
| `npm run preview` | Lokalno prikazuje produkcijsku verziju. |
| `npm run lint` | Proverava TypeScript tipove (`tsc --noEmit`). |
| `npm test` | Pokreće testove interfejsa, kataloga Akademije i 3D modela. |

## Tehnologije

- React 19 i TypeScript
- Three.js za 3D scenu i animacije
- Vite za razvoj i produkcijsku izgradnju
- Google Gemini API, opciono, za komentare i savete

## Struktura projekta

- `src/App.tsx` — React interfejs i povezivanje komponenti igre.
- `src/wizardChessEngine.js` — šahovska logika, 3D scena, kontrole i animacije.
- `src/components/` — AI panel, izbor ličnosti, API ključa i prikaz napredovanja.
- `src/components/Academy.tsx` — navigacija Akademije, kvizovi, napredak i interfejs zagonetke.
- `src/services/` — Gemini integracija, glasovni komentari i napredovanje igrača.
- `src/services/academyCatalog.ts` — po 12 lekcija za poznate partije, otvaranja i strategiju.
- `src/services/academyProgression.ts` — lokalno čuvanje završenih aktivnosti bez ponovljivih nagrada.
- `src/services/puzzleCatalog.ts` — tipovi, pozicije i mat-rešenja 12 zagonetki.
- `src/services/sceneThemes.ts` — tipizirane postavke ambijenta za tri ličnosti.
- `src/services/sceneEnvironments.ts` — proceduralni dekorativni elementi za tri teme.
- `public/assets/` — 3D modeli i unapred generisani audio komentari.
- `test/` — testovi interfejsa i provera 3D modela.
