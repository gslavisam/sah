# Plan proširenja: Šahovska akademija

## 1. Svrha

Dodati Wizard Chess 3D-u strukturisan prostor za učenje koji početnicima i tinejdžerima nudi kratke, razumljive aktivnosti. Akademija treba da poveže vežbanje taktike, upoznavanje sa partijama i otvaranjima i kasniju analizu sopstvene igre, a da pritom ne naruši postojeću partiju, pravila, komentatore, scene ili mobilni interfejs.

## 2. Predloženi proizvodni smer

Akademija je skup povezanih načina učenja, a ne četiri nepovezana ekrana:

1. **Zagonetke** — glavni početni režim: igrač rešava kratke taktičke zadatke.
2. **Poznate partije** — interaktivno istraživanje ključnih trenutaka iz odabranih partija.
3. **Otvaranja** — učenje principa kroz male, igrive primere, ne memorisanje dugih varijanti.
4. **Strategija** — kratka lekcija praćena pozicijom u kojoj igrač primenjuje ideju.
5. **Analiza partije** — kasniji dodatak koji izdvaja nekoliko pouzdanih prilika za učenje.

Igrač može slobodno da bira aktivnost. Početna strana Akademije preporučuje sledeću kratku lekciju, ali preporuka ne zaključava sadržaj niti kažnjava greške.

### Odluke za prvu verziju plana

- Prvi isporučivi deo je **Zagonetke: mat u jednom potezu**.
- Validnost rešenja proverava šahovski engine, nikada Gemini.
- AI likovi služe kao vodiči za nagoveštaje i objašnjenja; oni nisu izvor pravila ni odgovora.
- Zagonetke imaju deterministički sadržaj i unapred definisane tačne linije; AI može da prilagodi formulaciju, ne i rešenje.
- Akademija radi bez Gemini API ključa, uz lokalno dostupne nagoveštaje i objašnjenja.
- Akademija je poseban režim. Ulazak u nju ne sme da izgubi aktivnu partiju; izlazak vraća igrača u prethodno stanje.
- Napredovanje i XP nagrađuju pokušaj i učenje, ne samo tačnost ili brzinu.

## 3. Veza sa postojećom arhitekturom

Trenutno je šahovsko stanje i većina pravila zatvorena unutar `initWizardChess()` u `src/wizardChessEngine.js`. React ekran i servisi su u `src/App.tsx` i `src/services/`, a korisnički interfejs je u `src/components/`.

Plan zato predviđa prvo usku granicu između režima Akademije i engine-a:

- React upravlja izborom Akademije, liste aktivnosti, zadatka, nagoveštaja i objašnjenja.
- Engine učitava poziciju, izvršava poteze kroz postojeća pravila i prijavljuje ishod poteza.
- Zadatak i tačne linije čuvaju se u tipiziranom lokalnom katalogu, odvojeno od UI-a i Gemini promptova.
- Postojeći meč se snima kao logičko stanje pre ulaska u Akademiju i vraća pri izlasku; 3D figura/mesh reference ne čuvaju se kao serijalizovani podaci.
- Ne dodavati novu šahovsku biblioteku niti menjati postojeće poteze dok se ne dokaže da trenutni engine nema potrebnu funkcionalnost. Ako se pojavi nedostatak u pravilima, prvo ga pokriti testom i rešiti kao ograničen zadatak.

Početna implementacija drži početni prikaz i prikaz zadatka u jednoj komponenti `src/components/Academy.tsx`. Ako Akademija poraste, predložena buduća podela odgovornosti je:

| Modul | Odgovornost |
| --- | --- |
| `src/components/Academy.tsx` | Trenutna početna strana Akademije i ekran zagonetke; može kasnije da se podeli na manje UI module. |
| `src/services/puzzleCatalog.ts` | Tipovi i kurirani katalog zagonetki, oznake i linije rešenja. |
| `src/services/academyProgression.ts` | Lokalni napredak po aktivnostima, odvojen od šahovskog stanja i bez dupliciranja XP logike. |
| `src/wizardChessEngine.js` | Učitavanje/izvoz logičke pozicije, legalni potezi i događaji ishoda za zadatak. |

Komponente i servisi se izdvajaju tek kada faza koja ih zahteva počne; nema potrebe unapred praviti prazne module.

## 4. Faze implementacije

## Trenutni status

- [x] Akademija ima četiri dostupne oblasti: zagonetke, poznate partije, otvaranja i strategiju.
- [x] Dostupno je 12 mat-u-jednom zagonetki i po 12 lekcija za svaku od preostale tri oblasti.
- [x] Akademija čuva logičko stanje i istoriju postojeće partije, zaustavlja AI dok je zadatak aktivan i vraća partiju pri izlasku.
- [x] Potezi zagonetke su odvojeni od XP i uobičajenih komentara AI-ja.
- [x] Zagonetke nude tri lokalna nagoveštaja, pokušaj ponovo, sledeći zadatak i povratak na listu bez napuštanja Akademije.
- [x] Kviz-lekcije prikazuju ispravnost, objašnjenje i sledeću lekciju; jedinstveno završen napredak se čuva lokalno.
- [ ] PGN reprodukcija poznatih partija, šahovske pozicije za otvaranja/strategiju i analiza sopstvenih partija ostaju unapređenja.

Browserom su provereni svi mat-potezi za 12 zagonetki, pogrešan i tačan odgovor u lekciji, beleženje napretka i navigacija. `npm test` i `npm run build` prolaze. `npm run lint` i dalje prijavljuje dve ranije greške koje nisu uvedene Akademijom: CSS side-effect import u `src/main.tsx` i `checkmark` pristup u `src/services/geminiService.ts`.

## Faza 0 — Zaključavanje obima i kriterijuma

**Cilj:** pre koda dogovoriti šta znači uspešna Akademija prve verzije.

- [x] Potvrditi ciljnu grupu: potpuni početnik i povremeni igrač.
- [x] Ograničiti prvu isporuku na ulaznu stranu Akademije i mat u jednom potezu.
- [x] Definisati ton objašnjenja: kratko, ohrabrujuće i bez kažnjavanja.
- [x] Definisati jezike prve verzije (srpski kao podrazumevani).
- [x] Odrediti da li Akademija ulazi u glavni HUD ili se otvara kao zaseban modal/pogled.
- [x] Dogovoriti minimalni broj zadataka za prvi prototip: jedan potpuno proveren zadatak; katalog se širi u narednim iteracijama.

**Kriterijum završetka:** potvrđen obim MVP-a, UX tok i minimalni kriterijumi sadržaja.

## Faza 1 — Provera pravila i ugovora engine-a

**Cilj:** osigurati da zadaci mogu koristiti postojeća pravila bez sporednih efekata po trenutnu partiju.

- [ ] Popisati postojeće mogućnosti za postavljanje pozicije, potez, legalne poteze, šah, mat, promociju i undo.
- [ ] Definisati serijalizabilan format za poziciju i istoriju poteza; za početak podržati samo ono što je potrebno za zadatke.
- [x] Dodati engine API za snimanje i vraćanje logičkog stanja partije i istorije poteza; za prvo izdanje nisu potrebni zasebni rokada/en-passant parametri u katalogu.
- [x] Dodati API za postavljanje početne pozicije zadatka i reset pokušaja.
- [x] Izolovati događaje zadatka od uobičajenog `wizardchess:move` napredovanja.
- [ ] Utvrditi da reset, promena scene, promena lika i izlazak iz Akademije ne ostavljaju zastarelo stanje zadatka.
- [ ] Dodati testove za učitavanje/izvoz pozicije, validan/nevalidan potez, undo i očuvanje postojeće aktivne partije.

**Kriterijum završetka:** testom dokazano da engine može da prikaže poziciju zadatka, proveri potez i bez gubitka vrati prethodnu partiju.

## Faza 2 — UX prototip Akademije

**Cilj:** napraviti jasan tok koji ne zahteva prethodno poznavanje šahovske notacije.

- [x] Dodati ulaz u Akademiju iz glavnog ekrana.
- [x] Prikazati četiri dostupne oblasti i šta igrač može da nauči u svakoj.
- [x] Omogućiti ulazak u listu aktivnosti i prikaz završenog napretka.
- [x] Prikazati dugme za povratak u aktivnu partiju.
- [x] Osigurati upotrebljiv prikaz na telefonu i navigaciju tastaturom; fokus trap ostaje deo daljeg a11y poliranja.
- [x] Proveriti uklapanje UI-ja; tokom zadatka se kontrolni HUD privremeno skriva kako bi tabla ostala dostupna.

**Kriterijum završetka:** korisnik može bez objašnjenja da uđe u Akademiju, razume prvu dostupnu aktivnost i vrati se u partiju.

## Faza 3 — Katalog i pravila kvaliteta zagonetki

**Cilj:** uspostaviti pouzdan izvor zadataka pre dodavanja velikog broja nivoa.

- [x] Definisati tip `Puzzle` sa stabilnim ID-em, pozicijom, stranom na potezu, eksplicitnim rešenjem, nagoveštajima i objašnjenjem.
- [ ] Podržati više prihvatljivih rešenja kada pozicija ima više jednako ispravnih poteza.
- [ ] Svaki zadatak označiti temom, na primer mat u 1, viljuška, vezivanje ili otkriveni napad.
- [x] Proveriti pozicije i mat-linije kroz postojeći engine; svih 12 rešenja uspešno provereno u browseru.
- [x] Dodati strukturne testove za broj/ID sadržaja, pozicije i eksplicitna rešenja; detaljna pravila i cilj proverava engine.
- [x] Ručno proveriti nagoveštaje i objašnjenja na ekranu; ne prikazivati samo koordinatnu notaciju kao odgovor.
- [ ] Dodati raznovrsnije taktičke motive; trenutni paket je vežba matova u jednom potezu, ne svih tema iz šireg kurikuluma.
- [ ] Beležiti izvor i licencu za svaki uvezeni zadatak. Ne kopirati komercijalnu bazu ili sadržaj bez dozvole.

**Kriterijum završetka:** katalog sadrži proverene zadatke i validator ih sve prihvata; namerno neispravan primer pada sa razumljivom porukom.

## Faza 4 — MVP: zagonetke „Mat u jednom“

**Cilj:** isporučiti kompletnu, kratku vežbu od pozicije do učenja.

- [x] Učitati definisanu poziciju u postojeću 3D tablu bez primene početne postavke partije.
- [x] Prikazati cilj jasnim tekstom („Beli matiraju u jednom potezu“) i naznačiti boju na potezu.
- [x] Pri legalnom pokušaju proveriti engine-om da li je postignut mat; ne zaključivati ishod samo iz poređenja notacije poteza.
- [x] Na tačnom potezu prikazati uspeh i kratko objašnjenje motiva; koristi se postojeća animacija poteza, bez dodatne specijalne animacije zagonetke.
- [x] Na legalnom, ali pogrešnom potezu dati nenametljiv odgovor i omogućiti pokušaj ponovo.
- [ ] Na nelegalnom potezu ne menjati tablu; prikazati kratko objašnjenje ili razlog koji engine već može pouzdano da utvrdi.
- [x] Dodati „Nagoveštaj“ u 2–3 koraka: tema/šta tražiti → deo table ili ideja → konkretan smer.
- [x] Pružiti unapred napisane lokalne nagoveštaje i objašnjenja; MVP ih koristi bez Gemini-ja.
- [x] Dodati sledeći zadatak, ponavljanje i povratak na listu; mat-potez svih 12 zagonetki proveriti kroz engine u browseru.
- [x] Čuvati lokalni napredak jednom po zadatku; ponavljanje ne dodeljuje ponovljivu XP nagradu.
- [x] Obezbediti da izlazak i povratak ne izgube stanje aktivne partije.

**Kriterijum završetka:** igrač može rešiti, pogrešiti, dobiti nagoveštaj, razumeti rešenje, preći na sledeći zadatak i vratiti se u prethodnu partiju.

## Faza 5 — Testiranje i prvo puštanje

**Cilj:** zaštititi postojeću igru i dokazati da Akademija radi pouzdano.

- [x] Testirati mat-rešenja za svih 12 zagonetki i pogrešan/tačan odgovor u mikro-lekciji.
- [ ] Testirati zagonetku sa više prihvatljivih rešenja i nelegalni potez kroz korisnički prikaz.
- [ ] Testirati povratak iz Akademije posle običnog poteza, uzimanja figure i aktivnog AI poteza.
- [ ] Testirati desktop, mobilni prikaz, dodir, resize prozora i sve relevantne uglove kamere.
- [ ] Proveriti da Gemini nije dostupan i da su hintovi i objašnjenja i dalje upotrebljivi.
- [ ] Pokrenuti `npm test`, `npm run lint` i `npm run build`; rešavati greške izazvane izmenama, a postojeće nepovezane probleme beležiti odvojeno.
- [ ] Ažurirati `README.md` tek kada je funkcionalnost zaista dostupna.

**Kriterijum završetka:** testovi prolaze, MVP je upotrebljiv bez API ključa i ne kvari običnu partiju.

## Faza 6 — Poznate partije: poučne mikro-lekcije

**Cilj:** pretvoriti istoriju šaha u kratko aktivno učenje kroz kontekst i kviz.

- [x] Za svih 12 partija prikazati igrače, godinu, kratak kontekst i pouku.
- [x] Dodati proveru razumevanja, povratnu informaciju i objašnjenje bez Gemini-ja.
- [ ] Prikaz stvarnih ključnih pozicija, poteza i navigacija PGN-om unapred/nazad ostaju buduće unapređenje.
- [ ] Koristiti ručno uređene PGN/poteze iz jasno navedenih izvora; proveriti licencu same baze, a ne pretpostaviti da je svaki PGN slobodan zato što su šahovski potezi činjenice.
- [ ] Ako se koristi Gemini, proslediti mu samo proverene činjenice i tražiti objašnjenje; sadržaj prikazan kao istorijska činjenica mora biti u katalogu i proveren.

**Kriterijum prve isporuke:** korisnik može da nauči pouku iz partije i proveri razumevanje bez neproverene AI tvrdnje.

## Faza 7 — Otvaranja kroz principe

**Cilj:** učiti razmišljanje na početku partije, bez preopterećenja memorisanjem.

- [x] Početi sa osnovnim načelima, razvojem figura i sigurnošću kralja.
- [x] Povezati 12 principa/otvaranja sa idejom, planom i pitanjem za proveru razumevanja.
- [ ] Koristiti determinističke linije i engine za proveru legalnosti; ne pretvarati svaku poziciju u jedini „tačan“ potez ako postoji više razumnih nastavaka.
- [ ] Tabla sa početnom pozicijom i proverom legalnih poteza ostaje buduće unapređenje.

**Kriterijum prve isporuke:** svaka lekcija povezuje princip, plan i posledicu kroz kratko objašnjenje i kviz.

## Faza 8 — Strategija i analiza sopstvenih partija

**Cilj:** proširiti učenje na pozicione ideje i lični napredak.

- [x] Dodati 12 lekcija o centru, figurama, bezbednosti kralja, linijama, poljima, pešacima, razmenama i završnicama.
- [x] Dodati proveru razumevanja sa objašnjenjem odgovora u svakoj lekciji.
- [ ] Pozicija na tabli za samostalnu primenu ostaje buduće unapređenje.
- [ ] Za analizu sopstvene partije sačuvati poteze i potrebne metapodatke lokalno, uz jasan izbor korisnika.
- [ ] Početi sa jednostavnim, proverljivim signalima (npr. figura ostavljena pod udarom ili propušten mat) pre složenih ocena pozicije.
- [ ] Prikazati ograničen broj poučnih trenutaka: dobar potez, previd i preporučena tema za vežbu.
- [ ] Jasno razlikovati činjenice koje engine može potvrditi od pedagoškog komentara AI-ja.
- [ ] Ne nuditi prividno preciznu „najbolju“ analizu ako trenutni lokalni engine nema odgovarajuću pretragu i evaluaciju.

**Kriterijum prve isporuke:** igrač dobija proverljivu, unapred napisanu pouku; analiza sopstvenih partija ostaje poseban budući modul.

## 5. Predloženi nastavni katalog

Ovo je početni kurikulum, ne obaveza da se svih 48 jedinica isporuči odjednom. Predlog je 12 jedinica u svakoj oblasti: dovoljno da igrač vidi raznovrsnost i napreduje, a i dalje dovoljno malo da možemo ručno proveriti kvalitet. Sadržaj se otključava po etapama, ali igrač može slobodno da ponavlja i bira oblasti.

Prvo izdanje Akademije sadrži 12 zagonetki i po 12 lekcija u ostalim oblastima. Poznate partije su predstavljene originalno napisanim sažecima i poukama, bez uvezenih PGN zapisa; za buduću reprodukciju partija treba dodati provereni izvor i licencu zapisa poteza.

### 5.1 Zagonetke — 12 zadataka/tema

Zagonetke treba da budu kratke i proverljive kroz engine. Početne stavke uglavnom traže jedan potez; složenije se uvode tek kada igrač upozna osnovne motive.

| # | Tema zadatka | Šta igrač vežba |
| --- | --- | --- |
| 1 | Mat u jednom potezu: mat linijom ili damom | Prepoznati direktnu pretnju kralju i proveriti sva polja za beg. |
| 2 | Mat u jednom: mat topom na poslednjem redu | Uočiti da pešaci mogu kralju zatvoriti izlaz. |
| 3 | Mat u jednom: mat skakačem | Uočiti šah koji ne može da se blokira i polja koja kralj ne može zauzeti. |
| 4 | Mat u jednom: otkriveni šah | Pomeriti jednu figuru da druga otvori liniju napada. |
| 5 | Osvoj figuru viljuškom | Napasti istovremeno dve vredne mete, često kralja i damu. |
| 6 | Veži figuru za kralja ili damu | Uočiti figuru koja ne može bezbedno da se pomeri. |
| 7 | Osvoji figuru skewerom (osovinski napad) | Naterati vredniju figuru da se pomeri i napasti figuru iza nje. |
| 8 | Ukloni čuvara | Razmenom ili žrtvom ukloniti figuru koja brani važno polje ili metu. |
| 9 | Odvuci figuru sa odbrane | Namamiti branioca sa ključnog polja ili linije. |
| 10 | Otkriveni napad na damu ili topa | Pomeriti napadajuću figuru uz otkrivanje druge pretnje. |
| 11 | Mat u dva: prvi potez stvara neodbranjivu pretnju | Planirati protivnikov najbolji odgovor, ne samo prvi šah. |
| 12 | Završni zadatak sa više rešenja | Uporediti matne poteze i prihvatiti sve poteze koji zaista rešavaju poziciju. |

Prve četiri stavke čine uvodni paket; zadaci 5–10 grade osnovne taktičke motive; mat u dva i zadatak sa više rešenja su naredni nivo. Motive poput „Anastasijinog mata“ ili „ugušenog mata“ dodati kao tematske varijante tek kada se lako objasne bez oslanjanja na memorisanje naziva.

### 5.2 Poznate partije — 12 interaktivnih priča

Svaka partija treba da bude kratka interaktivna priča sa 2–3 zaustavljanja: „šta biste igrali?“, stvarni potez, posledica i jedna pouka. Partija ne mora da se reprodukuje od početka do kraja.

| # | Partija | Predložena pouka |
| --- | --- | --- |
| 1 | Morphy — vojvoda od Brunswicka i grof Isouard, Pariz 1858 („Opera Game“) | Razvoj figura i napad dok je protivnikova kraljevska strana u centru. |
| 2 | Anderssen — Kieseritzky, London 1851 („Immortal Game“) | Aktivnost figura i koordinacija u napadu; razgovor o tome šta žrtva dobija. |
| 3 | Anderssen — Dufresne, Berlin 1852 („Evergreen Game“) | Razvoj napada kroz otvorene linije i završna kombinacija. |
| 4 | Lasker — Bauer, Amsterdam 1889 | Uklanjanje branilaca i dvostruka žrtva lovaca kao istorijski primer napada na kralja. |
| 5 | Rotlewi — Rubinstein, Łódź 1907 | Koordinacija topova, lovca i dame u završnoj kombinaciji. |
| 6 | Byrne — Fischer, Njujork 1956 („Game of the Century“) | Razvoj, aktivnost figura i procena dugoročne kompenzacije za materijal. |
| 7 | Fischer — Spassky, Svetsko prvenstvo, Reykjavik 1972, 6. partija | Planiranje, aktivnost figura i pretvaranje prednosti u napad. |
| 8 | Tal — Botvinnik, meč za Svetsko prvenstvo, Moskva 1960, 6. partija | Kandidatski potezi i praktična procena komplikacija; razdvojiti rizik od sigurnog taktičkog dokaza. |
| 9 | Karpov — Kasparov, meč za Svetsko prvenstvo, Moskva 1985, 16. partija | Pritisak, inicijativa i pretvaranje aktivne pozicije u napad. |
| 10 | Kasparov — Topalov, Wijk aan Zee 1999 | Inicijativa, aktivne figure i žrtva kvaliteta; zaustavljati se pre ključnih odluka. |
| 11 | Deep Blue — Kasparov, meč 1997, 6. partija | Razgovor o računanju varijanti i odluci čoveka protiv računara, bez predstavljanja partije kao šahovskog otvaranja. |
| 12 | Carlsen — Karjakin, Svetsko prvenstvo, Njujork 2016, 10. partija | Tehnička realizacija prednosti i strpljenje u završnici. |

Katalog mora navesti izvor za zapis poteza i, gde je poznato, rezultat. Pre objave urednik proverava da li je izabrani ključni trenutak zaista ilustrovan partijom; objašnjenje ne sme da tvrdi da je potez jedini dobar ako analiza dopušta alternative. U prvom izdanju dovoljne su partije 1–6, po dve poučne pozicije iz svake.

### 5.3 Otvaranja — 12 uvodnih lekcija

Učenje počinje od ideje i tipičnog razvoja, a ne od dugog niza poteza. Svaka lekcija treba da objasni cilj, uobičajenu grešku i jednu kratku poziciju za izbor poteza.

| # | Otvaranje / ideja | Šta igrač uči |
| --- | --- | --- |
| 1 | Osnovna načela otvaranja | Kontrola centra, razvoj figura i sigurnost kralja. |
| 2 | Italijanska partija | Razvoj lovca na aktivno polje i napad na centar. |
| 3 | Španska partija (Ruy Lopez) | Pritisak na branioca centra i postepena priprema razvoja. |
| 4 | Škotska partija | Otvaranje centra rano i razvoj uz konkretne taktičke posledice. |
| 5 | Četiri skakača | Prirodan razvoj i kontrola centralnih polja. |
| 6 | Kraljičin gambit | Borba za centar; objasniti da je „gambit“ ponuđeni pešak, ne obavezno trajna žrtva. |
| 7 | Slovenska odbrana | Čvrsta odbrana centra i razvoj lovca pre zatvaranja dijagonale. |
| 8 | Francuska odbrana | Pešački lanac, suprotstavljeni planovi i značaj polja d4/e5. |
| 9 | Caro-Kann odbrana | Čvrst centar i razvoj figura uz strukturu pešaka. |
| 10 | Sicilijanska odbrana | Asimetrična borba za centar i različiti planovi na krilima; samo uvodna ideja, ne teorijske varijante. |
| 11 | Kraljevoindijska odbrana | Dopuštanje centra uz plan za kasniji pritisak i kontraigru. |
| 12 | Londonski sistem | Ponavljajuća razvojna postavka, uz razumevanje plana umesto slepog igranja istih poteza. |

Za prvi paket preporuka je osnovni princip (1), Italijanska partija (2), Kraljičin gambit (6), Francuska (8), Caro-Kann (9) i Sicilijanska odbrana (10), kako bi igrač dobio primere i za belog i za crnog. Zatim dodati Špansku (3), Škotsku (4), Četiri skakača (5), Slovensku (7), Kraljevoindijsku (11) i Londonski sistem (12). Prikazivati više legalnih i razumnih nastavaka kada pozicija to dopušta; ne ocenjivati prirodan potez kao grešku samo zato što nije glavni teorijski izbor.

### 5.4 Strategija — 12 praktičnih lekcija

Strategija se uči kroz pitanje „šta želimo da poboljšamo i zašto?“ uz poređenje pozicije pre i posle poteza. Svaku temu prati jedna mala vežba na tabli.

| # | Tema | Vežba / ishod učenja |
| --- | --- | --- |
| 1 | Centar i prostor | Uporediti poteze koji osvajaju ili kontrolišu centralna polja. |
| 2 | Razvoj i najlošija figura | Pronaći figuru koja najmanje učestvuje i poboljšati joj položaj. |
| 3 | Bezbednost kralja | Prepoznati kada treba rokada i koje slabosti nastaju pomeranjem pešaka ispred kralja. |
| 4 | Otvorene i poluotvorene linije | Postaviti top na liniju na kojoj može da vrši pritisak. |
| 5 | Slabe polja i predstraža | Obezbediti skakaču stabilno polje koje protivnički pešaci teško mogu da oteraju. |
| 6 | Dobar i loš lovac | Porediti aktivnost lovca sa sopstvenom pešačkom strukturom. |
| 7 | Slabi i izolovani pešaci | Napasti pešaka koji ne može lako da bude podržan drugim pešakom. |
| 8 | Prošli pešak i stvaranje prolaznog pešaka | Proceniti da li pešak može bezbedno da napreduje ka promociji. |
| 9 | Razmena figura | Odabrati razmenu koja olakšava položaj ili čuva korisnu figuru; ne razmenjivati „po navici“. |
| 10 | Pešačka većina i stvaranje drugog slabog cilja | Razumeti kako pešaci mogu stvoriti prolaznog pešaka ili vezati protivničke figure. |
| 11 | Aktivnost kralja u završnici | Uvesti kralja u igru kada dame i veći deo figura više ne ugrožavaju mat. |
| 12 | Topovske završnice i aktivni top | Aktivirati top iza prolaznog pešaka i davati šahove sa svrhom. |

Kasnije se mogu dodati profilaksa, inicijativa, žrtvovanje za dugoročnu kompenzaciju i zugcwang, ali tek pošto osnovne teme budu razumljive i potkrepljene kvalitetnim pozicijama.

## 6. Kriterijumi pristupačnosti i kvaliteta sadržaja

- Jedna aktivnost treba da traje nekoliko minuta i da ima jasan cilj.
- Koristiti jednostavan jezik; svaki stručni pojam kratko objasniti prvi put.
- Notaciju poteza prikazati kao dodatak tekstu, ne kao jedino uputstvo.
- Dati korisniku dozvolu da pogreši, proba ponovo ili zatraži pomoć.
- Ne koristiti kaznene tajmere u početničkim aktivnostima.
- Ne oslanjati se isključivo na boju za označavanje poteza; koristiti i oblik, tekst ili ikonu.
- Učitavanje, prazna stanja i greške moraju imati razumljiv prikaz.
- Progres čuvati lokalno i tolerisati nedostupan `localStorage` kroz postojeće obrasce projekta; ne čuvati tajne ili nepotrebne lične podatke.

## 7. Rizici i mere

| Rizik | Mera |
| --- | --- |
| Engine nema izolovano postavljanje pozicije ili očuvanje meča | Prvo izgraditi i testirati uski API stanja; ne počinjati veliki katalog pre toga. |
| Zadatak pogrešno označi legalan potez kao netačan | Čuvati sve prihvatljive linije i proveravati cilj kroz engine, ne samo poklapanje koordinata. |
| Gemini da netačan potez ili istorijski podatak | Engine/katalog su izvor istine; AI samo formuliše provereno objašnjenje. |
| Sadržaj baze nema jasnu licencu | Koristiti sopstveno kuriranje ili dozvoljene izvore; čuvati atribuciju i licencu u metapodacima. |
| Akademija naruši aktivnu partiju ili UI | Eksplicitno sačuvati logičko stanje i testirati ulazak/izlazak, HUD i mobilni prikaz. |
| Prevelik obim odjednom | Isporuke su fazne; svaka faza ima merljiv kriterijum završetka. |
| Nagrade podstiču ponavljanje bez učenja | Ograničiti nagradu po pokušaju/zadatku i nagrađivati napredak, ne samo broj klikova. |

## 8. Redosled isporuke i definicija MVP-a

Preporučeni sled:

**Faza 0 → Faza 1 → Faza 2 → Faza 3 → Faza 4 → Faza 5 → Faza 6 → Faza 7 → Faza 8**

Prvi MVP se završava nakon Faze 5. Sadrži ulaznu stranu Akademije, proverene zadatke mata u jednom potezu, korak-po-korak nagoveštaje, objašnjenje rešenja, osnovni lokalni napredak i bezbedan povratak u aktivnu partiju. Poznate partije i otvaranja ne blokiraju prvo izdanje; dodaju se tek pošto MVP zagonetki bude stabilan.

## 9. Ukupni kriterijumi uspeha

- [ ] Akademija je dostupna iz glavnog ekrana i može da se napusti bez gubitka partije.
- [ ] Svi objavljeni zadaci prolaze automatsku proveru pozicije, legalnih poteza i ishoda.
- [ ] Igrač može da dobije postepenu pomoć, pokuša ponovo i razume rešenje.
- [ ] Osnovne aktivnosti rade bez Gemini API ključa.
- [ ] Likovi su vodiči, ali nijedan AI odgovor ne može da promeni validnost poteza ili rešenja.
- [ ] Prikaz i tok rada su upotrebljivi na desktopu i mobilnom uređaju.
- [ ] Postojeći režim partije, napredovanje, teme i kontrola figura rade kao ranije.
- [ ] Poznate partije i svaki spoljni skup podataka imaju proveren izvor i licencu.
- [ ] Dokumentacija odgovara stvarno isporučenim mogućnostima.
