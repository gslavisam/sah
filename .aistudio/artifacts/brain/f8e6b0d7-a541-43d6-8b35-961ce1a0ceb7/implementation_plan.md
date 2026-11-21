# Lokalni korisnički nalozi, bezbedna prijava i čuvanje napretka (bez Firebase-a)

Uvođenje sopstvenih korisničkih naloga (registracija i prijava korisničkim imenom/emailom i lozinkom) i režima gosta sa nadimkom koristeći lokalnu SQLite bazu i kriptografsku zaštitu na postojećem serveru — potpuno bez Firebase-a i eksternih cloud servisa.

---

## Pregled za korisnika i ključne odluke

> [!NOTE]
> Ova arhitektura **ne koristi Firebase** niti zahteva prihvatanje eksternih cloud uslova. Svi nalozi, lozinke, XP nivoi, napredak u Akademiji i istorija partija čuvaju se direktno na tvom serveru u ugrađenoj **SQLite** bazi podataka.
> *(Napomena: Ako nekada kasnije poželiš i dugme za Google prijavu bez Firebase-a, to se može dodati naknadno preko zasebnog OAuth koraka, dok ova verzija odmah pruža bezbedne lokalne naloge i igru kao gost.)*

- **Načini ulaska i prijave**:
  1. **Sopstveni nalog (Registracija i prijava)**: Korisnik sam pravi nalog (korisničko ime / email, lozinka i ime za prikaz na tabli).
  2. **Gost sa nadimkom**: Trenutna igra bez ikakve registracije, uz mogućnost promene nadimka za Online Duele i automatskog prebacivanja osvojenog XP-a i Akademije kada korisnik napravi nalog.
- **Bezbednost lokalne varijante**:
  - Lozinke se **nikada** ne čuvaju kao običan tekst — heširaju se pomoću `scrypt` algoritma sa nasumičnim kriptografskim *salt*-om za svakog korisnika i porede vremenski bezbedno (*timing-safe compare*).
  - Sesije koriste kriptografski nasumične tokene sa rokom trajanja u bazi, zaštitu od preteranog broja pogrešnih pokušaja (*rate limiting*) i validaciju svih ulaznih polja na serveru.
- **Podaci koji se trajno čuvaju (Opcija A)**: XP nivo, rang, niz uzastopnih uzimanja, rešene lekcije i zagonetke u Akademiji, skor (pobede/porazi/remiji) i istorija odigranih Online Duel i solo partija.
- **Pristup aplikaciji (Opcija A)**: Prijava je potpuno opciona — gosti imaju pun pristup svim režimima igre.

---

## 1. Pregled i osnovni koncept

- **Šta sistem radi**: Dodaje autentifikaciju i trajno čuvanje profila direktno unutar postojećeg Node.js servera i lokalne SQLite baze podataka. Kada igrač napravi nalog i prijavi se sa drugog pregledača ili nakon osvežavanja stranice, njegov XP, Akademija i istorija partija odmah se učitavaju sa servera.
- **Kome je namenjeno**: Igračima koji žele jednostavnu registraciju sopstvenog naloga bez oslanjanja na spoljne servise i bezbedno čuvanje svog napretka i rezultata u Online Duelima.
- **Glavna vrednost**: Potpuna kontrola nad podacima na sopstvenom serveru, nulta zavisnost od Firebase-a, kriptografska zaštita lozinki i prikaz stvarnih imena i statistike u Online Duelima.

---

## 2. Korisničko iskustvo i vizuelni dizajn

### Ključni korisnički tokovi

1. **Prvi ulazak (Gost po podrazumevanom izboru)**:
   - Aplikacija se otvara direktno na 3D tablu bez blokirajućih prozora.
   - U gornjem HUD-u (pored trake za XP nivo) nalazi se kompaktna **Profil / Prijava** pilula koja prikazuje nadimak gosta i dugme *Prijavi se*.
2. **Prozor za nalog i profil (*Account & Profile Modal*)**:
   - **Tab „Prijava / Napravi nalog”**:
     - Prekidač između **Prijavi se** i **Napravi nalog** (korisničko ime ili email, lozinka od najmanje 6 karaktera, potvrda lozinke i ime za prikaz).
     - Jasne poruke validacije na srpskom jeziku (npr. zauzeto korisničko ime, pogrešna lozinka, previše neuspelih pokušaja).
     - Sekcija **Gost** za brzu izmenu lokalnog nadimka bez registracije.
   - **Tab „Moj Profil i Istorija”**:
     - Prikaz korisničkog imena (sa opcijom promene imena za prikaz), trenutnog RPG ranga, ukupnog skora pobeda/poraza/remija i procenta završene Akademije.
     - **Istorija partija**: Lista poslednjih mečeva (protivnik, režim: Online Duel ili AI, boja figura, ishod, razlog završetka i datum).
     - Dugme *Odjavi se* koje poništava token sesije na serveru i vraća aplikaciju u režim gosta.
3. **Integracija u Online Duel režim**:
   - Pri kreiranju ili ulasku u Online Duel sobu, aplikacija prosleđuje ime igrača i rang u WebSocket sobu.
   - *OnlineMatchBar* iznad satova prikazuje prava imena oba igrača umesto generičkih oznaka.
   - Server automatski beleži rezultat Online Duel partija direktno na serveru za prijavljene učesnike (čak i u slučaju isteka vremena ili predaje), dok se završene solo partije protiv AI-ja takođe čuvaju na profilu igrača.

### Vizuelni identitet

- **Estetski pravac**: Tamni gotski sanctum usklađen sa postojećim interfejsom — duboke tamne pozadine (`rgba(12, 15, 22, 0.94)`), zlatni akcenti (`#d4af37`, `#f5d76e`) i `tabular-nums` za sve brojeve u statistici i istoriji mečeva.
- **Responzivnost**: Profilna pilula i modal prilagođeni su i desktopu i mobilnim ekranima bez preklapanja sa satovima ili AI mehurićem.

---

## 3. Ključne odluke i kompromisi

- **Ugrađeni SQLite na Node 22 serveru umesto eksternog Firebase-a**:
  - *Izabrani pristup*: Korišćenje nativnog Node.js SQLite modula za lokalno trajno skladištenje korisnika, sesija, napretka i mečeva.
  - *Zašto*: Ne traži eksterni cloud nalog, nema dodatnih build alata, transakcijski je siguran i dostupan istovremeno i REST API-ju i WebSocket serveru za Online Duele.
  - *Razmatrane alternative*: Čuvanje samo u `localStorage` pregledača nije bezbedno za lozinke i ne radi između uređaja; spoljni SQL serveri bi zahtevali poseban hosting.
- **Kriptografsko heširanje lozinki (`scrypt` + *salt*) i nasumični tokeni sesije**:
  - *Izabrani pristup*: Svaki korisnik dobija nasumični 16-bajtni *salt* i `scrypt` heš; prijava vraća 32-bajtni nasumični token sesije koji se čuva u bazi (sa rokom od 30 dana i mogućnošću odjave).
  - *Zašto*: Pruža industrijski standard zaštite lozinki čak i na lokalnom serveru i radi pouzdano i unutar *iframe* okruženja bez problema sa blokiranim kolačićima.
- **Automatsko spajanje napretka gosta (Guest-to-Account Merge)**:
  - *Izabrani pristup*: Prilikom registracije ili prve prijave, ako korisnik već ima osvojen XP ili rešene zadatke Akademije kao gost, server spaja veći XP i uniju rešenih zadataka.
  - *Zašto*: Korisnik ne gubi trud uložen pre otvaranja naloga.

---

## 4. Tehnička arhitektura i strategija podataka

### Dijagram sistema i toka podataka

```
┌────────────────────────────────────────────────────────────────────┐
│                       Klijentski interfejs                         │
│  ┌──────────────┐   ┌───────────────────────┐   ┌──────────────┐   │
│  │ Profil/Prijava│   │  Account & Profile    │   │ Online Duel  │   │
│  │  HUD Pilula  ├──►│  Modal (Registracija, ├──►│  Match Bar   │   │
│  └──────────────┘   │  Prijava, Istorija)   │   │ (Imena, Sat) │   │
└─────────┬───────────┴───────────┬───────────┴───┴──────┬───────┘───┘
          │                       │ Bearer Token         │ WebSocket
          ▼                       ▼                      ▼
┌─────────────────────┐  ┌────────────────────┐  ┌───────────────────┐
│  Lokalni servisi    │  │ Auth & Profile     │  │ WebSocket Duel    │
│ (XP, Akademija,     │◄─┤ API Rute (/api/auth│  │     Server        │
│  Nadimak gosta)     │  │  & /api/profile)   │  │ (Autoritativan    │
└─────────────────────┘  └─────────┬──────────┘  │  ishod & imena)   │
                                   │             └─────────┬─────────┘
                                   ▼                       ▼
                     ┌───────────────────────────────────────────────┐
                     │           Lokalna SQLite Baza                 │
                     │ • users (id, username, pass_hash, salt, name) │
                     │ • sessions (token_hash, user_id, expires_at)  │
                     │ • progress (user_id, stats_json, academy_json)│
                     │ • matches (id, user_id, mode, opponent, ...)  │
                     └───────────────────────────────────────────────┘
```

### Model podataka (SQLite tabele)

- **Korisnici (`users`)**: `id`, `username` (jedinstveno, mala slova), `display_name`, `password_salt`, `password_hash`, `created_at`.
- **Sesije (`sessions`)**: `token_hash` (SHA-256 heš tokena — ni sami tokeni sesije se ne čuvaju u bazi sirovi), `user_id`, `expires_at`, `created_at`.
- **Napredak (`user_progress`)**: `user_id`, `xp`, `level`, `title`, `streak`, `total_captures`, `total_moves`, `wins`, `losses`, `draws`, `academy_json` (`games`, `openings`, `strategy`, `puzzles`), `updated_at`.
- **Istorija partija (`match_history`)**: `id`, `user_id`, `mode` (`online` | `single`), `player_color` (`w` | `b`), `opponent_name`, `result` (`win` | `loss` | `draw`), `reason`, `move_count`, `created_at`.

### Zaštita i mapiranje tokova

1. **Registracija i prijava**: Server proverava dužinu i format korisničkog imena i lozinke, ograničava učestale neuspele pokušaje prijave po IP adresi, generiše `scrypt` heš i vraća bezbedni token sesije (čiji se samo SHA-256 heš pamti u bazi).
2. **Sinhronizacija napretka**: Pri svakoj prijavi i nakon završetka poteza/lekcije ili partije, prijavljeni klijent sinhronizuje napredak sa serverom preko autorizovanog zahteva (`Authorization: Bearer ...`).
3. **Snimanje Online Duel partija na serveru**: WebSocket server povezuje igrača sa njegovim verifikovanim nalogom ako prosledi validan token pri ulasku u sobu, prikazuje njegovo ime protivniku i po završetku meča direktno upisuje rezultat u `match_history` i ažurira skor pobeda/poraza/remija.
