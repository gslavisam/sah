# Plan implementacije: tri scene za Wizard Chess 3D

## Cilj

Povezati tri postojeća AI lika sa tri prepoznatljive 3D scene, tako da promena lika promeni i ambijent partije. Rešenje treba da bude privlačno tinejdžerima i pristupačno početnicima, bez ugrožavanja čitljivosti table, pravila šaha, performansi ili rada na mobilnim uređajima.

## Polazne pretpostavke i odluke

- Izbor lika automatski bira njegovu scenu: `mentor` → Akademija, `roast` → Goblinska radionica, `rival` → Dvorana dvoboja.
- Jedna partija i sva njena stanja ostaju sačuvani pri promeni lika ili scene. Promena scene ne pokreće novu partiju.
- Ličnost i komentari ostaju nezavisni od renderovanja scene; Gemini nije zadužen za izbor poteza.
- Prva verzija nema poseban birač scene. Scene prate izabranog lika, što ih čini lakim za otkrivanje.
- Ne preuzimamo niti pravimo finalne spoljne modele pre nego što se potvrde vizuelni pravci i licenca. Prvo proveravamo sistem tema i prototip.
- Postojeća katedrala ostaje početna i rezervna scena ako nova scena ne može da se učita.

## Postojeće stanje

- [x] Pregledan je postojeći Three.js engine i potvrđeno je da se katedrala učitava iz `public/assets/glb/option8_cathedral.glb.gz.b64`.
- [x] Pregledan je izbor ličnosti: `mentor`, `roast` i `rival` već postoje u React interfejsu.
- [x] Potvrđeno je da se 3D engine inicijalizuje iz `src/App.tsx`, dok se model scene i osvetljenje obrađuju u `src/wizardChessEngine.js`.
- [x] Potvrđeno je da projekat već ima komande za build, TypeScript proveru i testove.

## Faza 1 — Definisanje vizuelnih pravaca

**Cilj:** tri različite, originalne scene sa jasnim vizuelnim identitetom i čitljivom šahovskom tablom.

- [x] Definisati paletu boja, osvetljenje i atmosferu svake scene:
  - [x] **Akademija (Alistair):** ponoćno-plava i topla pergamentno-zlatna (`#10182B`, `#D8B978`); mirna, prijateljska učionica za učenje.
  - [x] **Radionica (Grix):** čađavo-zelena i žarno-narandžasta (`#17231D`, `#E8863A`); razigran, haotičan, ali ne previše taman ambijent.
  - [x] **Dvorana dvoboja (Valerius):** hladna škriljasto-plava i kraljevsko-ljubičasta (`#18202D`, `#7455A6`); monumentalna i dramatična, sa jasnim fokusom na tablu.
- [x] Za svaku scenu zapisati glavne siluete, pozadinske elemente, svetlosne izvore i efekte.
- [x] Odrediti šta ostaje isto u svim scenama: pozicija i izgled table, figure, oznake poteza i osnovne kontrole kamere.
- [x] Definisati pravila čitljivosti: efekti ostaju iza table ili uz obod, ne prekrivaju polja ni figure; osvetljenje scene ne sme da ispere kontrast table.

### Vizuelni brief za prototip

| Lik / tema | Silueta i dekoracija | Svetlo i atmosfera | Diskretni ambijentalni efekat |
| --- | --- | --- | --- |
| **Alistair — Akademija zvezdanih mapa** | Visoki šiljati prozori sa zvezdanim motivom, police i nekoliko lebdećih knjiga uz zidove. Ostaviti prostor oko table otvoren. | Hladno plavo svetlo sa prozora i meko zlatno svetlo uz sto; najmirnija i najsvetlija tema. | Nekoliko sporih, sitnih svetlećih tačaka visoko u pozadini. |
| **Grix — Goblinska radionica** | Krupne cevi, nejednaki metalni nosači, alat i pećni lukovi iza table; razigrane, blago asimetrične siluete. | Topao žar iz niskih izvora, uz prigušeno zeleno popunjavajuće svetlo; tabla ostaje neutralna. | Retke varnice koje se podižu uz zidove, ne preko table. |
| **Valerius — Dvorana izazova** | Simetrični kameni lukovi, zastave i udaljeni viteški grbovi; čist, monumentalni prostor sa jasnom centralnom osom. | Hladno bočno svetlo i diskretni ljubičasti akcenti; izraženiji obod svetla oko arene, bez zatamnjenja polja. | Blagi svetlosni odsjaj na udaljenim grbovima ili stubovima. |

**Zajednička osnova:** tabla, figure, njihova početna pozicija, označavanje legalnih poteza, HUD, kamere i pravila igre ostaju isti. Menja se samo ambijent oko table. Efekti su dekorativni i ograničeni; nema stalnih čestica preko polja, bljeskova koji skrivaju poteze ni tematskih promena materijala figura u prvoj verziji.

**Ograničenje prototipa:** ovo je vizuelni pravac, ne potvrda da su kontrast i performanse već izmereni. To se proverava na stvarnom prototipu u fazama 2 i 5. Prednost dati proceduralnoj geometriji i postojećim sredstvima; spoljne modele razmatrati tek ako prototip ne ostvari prepoznatljive siluete.

**Kriterijum za završetak:** definisana su tri različita vizuelna pravca, zajednička osnova i pravila čitljivosti. **Faza 1 je završena.**

## Faza 2 — Provera scene i tehnički prototip

**Cilj:** dokazati da teme mogu da se menjaju bez menjanja šahovske partije.

- [x] Utvrditi koje delove postojeće scene možemo bezbedno ponovo koristiti, a koje su specifične za katedralni GLB.
- [x] Izraditi prototip tema na postojećoj sceni kroz podešavanja osvetljenja, pozadine, magle i materijala.
- [x] Povezati izbor sva tri lika sa odgovarajućim ključem teme.
- [x] Pokrenuti promenu teme pri početnom učitavanju i pri promeni lika tokom aktivne partije.
- [x] Obezbediti da promena teme ne resetuje tablu, poteze, uhvaćene figure, boju igrača ni stanje partije.
- [x] Obezbediti podrazumevani izgled Akademije kao rezervu za nepoznat ključ teme; isti model katedrale ostaje učitan za sve teme.

**Nalaz o ponovnoj upotrebi:** šahovska tabla, figure, oznake poteza, renderer, kamera i kontrole ostaju zajednički. Model `option8_cathedral` i njegove peći, kameni materijali, osvetljenje i granice kamere/kolizije specifični su za postojeću katedralu. Prototip zato menja ambijent tekuće scene, a ne pokušava da zameni GLB model.

**Provera prototipa:** u browseru su redom primenjene sve tri teme. Snimci canvasa imali su različite hash vrednosti. Posle odigranih poteza, promena teme i ponovna primena teme nisu promenile boju igrača, stranu na potezu, broj poteza, završno stanje ni listu legalnih poteza.

**Kriterijum za završetak:** sve tri teme mogu da se izaberu, a stanje partije ostaje nepromenjeno. **Faza 2 je završena prototipom; puna zamena ambijenta pripada fazi 4.**

## Faza 3 — Sistem tema i povezivanje sa interfejsom

**Cilj:** napraviti jasno mesto za konfiguraciju tema i pouzdanu vezu između React-a i Three.js-a.

- [x] Definisati tipiziranu konfiguraciju tema, indeksiranu postojećim `PersonaId` vrednostima.
- [x] Izložiti iz engine-a usku funkciju za promenu teme, umesto da React direktno menja objekte Three.js scene.
- [x] U `App.tsx` pozvati promenu teme na istom mestu na kom se ažurira izabrana ličnost.
- [x] Primena iste teme više puta treba da bude bezbedna i da ne pravi duplirane objekte ili svetla.
- [x] Organizovati privremene efekte i dodatne objekte tako da mogu da se uklone ili ponovo upotrebe pri promeni teme; prototip ne pravi dodatne scene ni privremene objekte, a tint materijala se svaki put računa iz sačuvane osnovne boje.
- [x] Očuvati postojeće API-je engine-a i ponašanje početne scene.

**Kriterijum za završetak:** tema se menja sinhronizovano sa likom, bez curenja resursa i bez promena pravila ili HUD-a. **Faza 3 je završena za prototip. Sledeće je faza 4 — izrada vizuelno zasebnih ambijenata.**

## Faza 4 — Izrada tri prepoznatljiva ambijenta

**Cilj:** unaprediti prototip u scene koje se jasno razlikuju i odgovaraju likovima.

- [x] Dodati početne proceduralne dekorativne grupe za sva tri lika, uz očuvanje postojećeg detaljnog modela katedrale.
- [x] Zameniti krupne generičke oblike manjim tematskim siluetama koje se vide u širokom pogledu i ne prekrivaju tablu.
- [x] Dati prednost proceduralnoj Three.js dekoraciji; u ovoj iteraciji nema novih spoljnih resursa.
- [x] Proveriti format, veličinu, licencu i atribuciju spoljnih resursa — nije primenljivo jer nisu dodati.
- [x] Prilagoditi palete svetla i materijala svakoj temi.
- [x] Dodati diskretne ambijentalne animacije uz ivice: rotaciju armilarnih sfera, lebdeće varnice i blago njihanje zastava.
- [x] Rezervna scena za spoljne resurse nije potrebna jer teme ne zavise od novih spoljnih fajlova.

**Kriterijum za završetak:** bez gledanja u izbor lika može se prepoznati koja je scena aktivna; tabla ostaje čitljiva u svim pogledima. Trenutna verzija čuva katedralu, menja atmosferu i dodaje armilarne sfere, mehaničke zupčanike ili heraldičke zastave. To su tematski prototipi, ne tri kompletna zasebna okruženja. Faza ostaje otvorena dok se ne potvrde sva četiri pogleda i mobilni prikaz, a zasebne prostorije ne izrade ili se vizuelni pravac ne potvrdi ovim prototipom.

## Faza 5 — UX i performanse

**Cilj:** promene scene deluju namerno, brzo i stabilno na desktopu i telefonu.

- [ ] Proveriti da promena lika ne izaziva prekid upravljanja tablom ili nepoželjan skok kamere.
- [ ] Dodati kratku i nenametljivu tranziciju ako je potrebna; ne blokirati unos poteza duže nego što je neophodno.
- [ ] Proveriti scene u igračkom, gornjem, bočnom i širokom pogledu kamere.
- [ ] Proveriti dodirne kontrole, HUD i čitljivost na uskom ekranu.
- [ ] Proveriti da se svetla, geometrija, teksture i animacije ne dupliraju nakon ponovljenog menjanja likova.
- [ ] Smanjiti ili izostaviti dekorativne efekte na slabijim uređajima ako merenje pokaže pad performansi.

**Kriterijum za završetak:** nema blokirajućih grešaka, scena se menjaju bez gubitka partije, a osnovna igra ostaje upotrebljiva na mobilnom uređaju.

## Faza 6 — Testiranje i prihvatanje

**Cilj:** proveriti funkcionalnost i zaštititi postojeće mogućnosti igre.

- [ ] Dodati ciljane provere za mapiranje lika na temu i ponovnu primenu teme.
- [ ] Dodati ili sprovesti proveru da promena teme ne resetuje aktivnu partiju.
- [ ] Pokrenuti `npm run lint`.
- [ ] Pokrenuti `npm test`.
- [ ] Pokrenuti `npm run build`.
- [ ] Ručno proveriti sva tri lika, sve četiri kamere, početnu scenu, promenu teme usred partije i prikaz na telefonu.
- [ ] Proveriti konzolu pregledača zbog grešaka u učitavanju resursa i WebGL-a.
- [ ] Ažurirati `README.md` opisom tema i načina izbora scena.

**Kriterijum za završetak:** ciljane provere, postojeći testovi, build i ručna provera prolaze; README odgovara implementaciji.

## Redosled i granice

Faze 1–3 su prva isporučiva celina: potvrđuju vizuelni smer i bezbedan sistem za izbor tema. Faza 4 donosi stvarne vizuelno različite ambijente, a faze 5–6 ih pripremaju za pouzdano korišćenje.

Ne menjamo šahovski engine, snagu protivnika, Gemini promptove, XP sistem niti glasovne komentare u okviru ovog plana. Ako test prototipa pokaže da su tri kompletna zasebna GLB modela preskupa ili prespora, zadržavamo proceduralne scene i postojeći model kao polaznu osnovu umesto da ugrozimo odziv igre.

## Konačni kriterijumi uspeha

- [ ] Svaki postojeći lik ima svoju prepoznatljivu scenu.
- [ ] Promena lika menja scenu i ne započinje novu partiju.
- [ ] Pravila šaha, potezi, figure i komentari nastavljaju da rade kao ranije.
- [ ] Tabla i figure ostaju jasno vidljive u svim scenama i pogledima.
- [ ] Aplikacija se uspešno build-uje i ne uvodi regresije u postojeće testove.
- [ ] README opisuje ponašanje koje je zaista implementirano.
