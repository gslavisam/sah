export type AcademyAreaId = 'games' | 'openings' | 'strategy';

export type AcademyLesson = {
  id: string;
  title: string;
  subtitle: string;
  lesson: string;
  question: string;
  options: [string, string, string];
  answer: number;
  explanation: string;
  takeaway: string;
};

export const ACADEMY_AREAS: {
  id: AcademyAreaId | 'puzzles';
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    id: 'puzzles',
    icon: '✦',
    title: 'Zagonetke',
    description: 'Vežbaj taktiku kroz kratke izazove i otkrivaj ideje na tabli.'
  },
  {
    id: 'games',
    icon: '♜',
    title: 'Poznate partije',
    description: 'Upoznaj ključne ideje iz istorijskih partija i proveri šta si zapamtio.'
  },
  {
    id: 'openings',
    icon: '♞',
    title: 'Otvaranja',
    description: 'Nauči planove i principe umesto da pamtiš duge nizove poteza.'
  },
  {
    id: 'strategy',
    icon: '♝',
    title: 'Strategija',
    description: 'Vežbaj kako da poboljšaš figure, kralja i pešačku strukturu.'
  }
];

export const FAMOUS_GAME_LESSONS: AcademyLesson[] = [
  {
    id: 'morphy-opera',
    title: 'Opera partija',
    subtitle: 'Morphy protiv vojvode od Brunswicka i grofa Isouarda · 1858',
    lesson: 'Morphy je brzo razvio figure i otvorio linije dok su protivničke figure ostale na početnim poljima. Njegov napad je uspeo zato što je razvoj pretvoren u aktivnost pre nego što su branioci stigli da se organizuju.',
    question: 'Šta je omogućilo Morphyjevom napadu da postane opasan?',
    options: ['Brz razvoj i otvorene linije', 'Ponavljanje poteza dame', 'Rano pomeranje mnogo pešaka'],
    answer: 0,
    explanation: 'Razvijene figure mogu da učestvuju zajedno u napadu. Morphy je iskoristio vreme dok je protivnik kasnio sa razvojem.',
    takeaway: 'Razvij figure pre nego što kreneš u napad.'
  },
  {
    id: 'anderssen-immortal',
    title: 'Besmrtna partija',
    subtitle: 'Anderssen protiv Kieseritzkyja · London, 1851',
    lesson: 'Ova poznata napadačka partija pokazuje kako aktivne figure mogu biti vrednije od dodatnog materijala. Žrtve imaju smisla kada otvaraju linije, ubrzavaju razvoj ili stvaraju konkretne pretnje — ne samo zato što izgledaju hrabro.',
    question: 'Kada žrtva figure može biti opravdana?',
    options: ['Uvek kada napadaš', 'Kada dobijaš aktivnost ili konkretnu pretnju', 'Samo ako odmah vratiš istu figuru'],
    answer: 1,
    explanation: 'Žrtva se procenjuje po tome šta dobijaš zauzvrat: inicijativu, otvorene linije ili prisilnu taktičku dobit.',
    takeaway: 'Pre žrtve pronađi šta ćeš dobiti i šta protivnik može da odgovori.'
  },
  {
    id: 'anderssen-evergreen',
    title: 'Zimzelena partija',
    subtitle: 'Anderssen protiv Dufresnea · Berlin, 1852',
    lesson: 'Napad se gradio potez po potez: figure su dobijale aktivna polja, linije su se otvarale, a protivnički kralj je ostao pod pritiskom. Završna kombinacija je bila moguća zato što su figure sarađivale.',
    question: 'Šta najčešće priprema uspešnu kombinaciju?',
    options: ['Više figura koje ciljaju iste slabosti', 'Potezi samo jednom figurom', 'Izbegavanje razvoja topova'],
    answer: 0,
    explanation: 'Taktička završnica često je rezultat prethodne koordinacije: više figura napada, dok protivničke ne mogu zajedno da brane.',
    takeaway: 'Pre traženja kombinacije proveri da li ti figure sarađuju.'
  },
  {
    id: 'lasker-bauer',
    title: 'Napad na kralja',
    subtitle: 'Lasker protiv Bauera · Amsterdam, 1889',
    lesson: 'Partija je poznata po napadu koji je uklonio važne branioce oko kralja. Ideja „ukloni branioca“ znači da prvo razmeniš ili odvučeš figuru koja čuva ključno polje, pa tek onda nastaviš napad.',
    question: 'Zašto napadač uklanja branioca pre nego što nastavi?',
    options: ['Da bi oslobodio važno polje ili liniju', 'Da bi izbegao rokadu', 'Da bi zatvorio sve svoje figure'],
    answer: 0,
    explanation: 'Branilac može sprečavati mat ili čuvati ulazno polje. Njegovim uklanjanjem pretnje postaju stvarne.',
    takeaway: 'Pronađi figuru koja čuva metu — možda je ona prvi cilj.'
  },
  {
    id: 'rotlewi-rubinstein',
    title: 'Snaga koordinacije',
    subtitle: 'Rotlewi protiv Rubinsteina · Łódź, 1907',
    lesson: 'Rubinsteinova kombinacija se oslanja na saradnju više figura i napad na kraljevu poziciju. Važno je da posmatraš celu tablu: figura koja izgleda neaktivno može čuvati presudnu liniju ili biti deo taktičke ideje.',
    question: 'Kako pronaći kombinaciju kada više figura učestvuje?',
    options: ['Prati pretnje i odbrane svih važnih figura', 'Računaj samo potez svoje dame', 'Ignoriši protivničke odgovore'],
    answer: 0,
    explanation: 'Kombinacija je niz poteza sa ograničenim odgovorima. Svaki korak treba proveriti prema najboljim odbranama protivnika.',
    takeaway: 'Pre poteza pitaj se šta protivnik može da uzme ili napadne.'
  },
  {
    id: 'byrne-fischer',
    title: 'Partija veka',
    subtitle: 'Byrne protiv Fischera · Njujork, 1956',
    lesson: 'Fischerova partija se pamti po dugoročnom razumevanju aktivnosti i taktičkim prilikama. Materijal je važan, ali privremeno manje materijala može biti prihvatljivo ako figure dobiju snažne linije i kralj postane ranjiv.',
    question: 'Šta treba uporediti kada jedna strana ima manje materijala?',
    options: ['Aktivnost, bezbednost kralja i konkretne pretnje', 'Samo broj pešaka', 'Ko je ranije pomerio damu'],
    answer: 0,
    explanation: 'Materijal je samo jedan deo pozicije. Aktivne figure i nezaštićen kralj mogu stvoriti dovoljno protivigre.',
    takeaway: 'Proceni celu poziciju, ne samo broj figura.'
  },
  {
    id: 'fischer-spassky',
    title: 'Svetsko prvenstvo, 6. partija',
    subtitle: 'Fischer protiv Spasskyja · Reykjavik, 1972',
    lesson: 'Ova partija je često isticana zbog dubokog pozicionog plana i načina na koji se mala prednost pretvara u dugotrajan pritisak. Nije svaki dobar potez šah ili uzimanje — nekad je cilj poboljšati najlošiju figuru.',
    question: 'Koji je koristan plan kada nema neposredne taktike?',
    options: ['Poboljšati najlošiju figuru', 'Pomerati pešake nasumično', 'Ponoviti potez bez razloga'],
    answer: 0,
    explanation: 'Poboljšanje figure često pojačava kontrolu važnih polja i stvara nove mogućnosti bez žurbe.',
    takeaway: 'Ako nema taktike, pronađi figuru koja najmanje učestvuje.'
  },
  {
    id: 'tal-botvinnik',
    title: 'Kreativna protivigra',
    subtitle: 'Tal protiv Botvinnika · Moskva, 1960',
    lesson: 'Tal je bio poznat po komplikovanim napadima. Pouka za učenika nije da žrtvuje naslepo, već da razlikuje računljivu taktiku od praktičnog rizika: proveri šahove, uzimanja i pretnje obe strane.',
    question: 'Kako bezbednije proceniti komplikovanu poziciju?',
    options: ['Računati prisilne odgovore i proveriti kraljevu bezbednost', 'Pretpostaviti da je svaka žrtva dobitna', 'Prestati da računaš posle prvog šaha'],
    answer: 0,
    explanation: 'Prisilni potezi ograničavaju mogućnosti protivnika. Provera odgovora smanjuje rizik od previda.',
    takeaway: 'Računaj varijantu do mirne pozicije, ne samo do lepog poteza.'
  },
  {
    id: 'karpov-kasparov',
    title: 'Pritisak bez žurbe',
    subtitle: 'Karpov protiv Kasparova · Moskva, 1985',
    lesson: 'Dug meč za titulu pokazuje kako se inicijativa može održavati kroz niz korisnih poteza. Pritisak nastaje kada protivnik stalno mora da brani slabosti, dok tvoje figure dobijaju sve bolja polja.',
    question: 'Kako se održava pozicioni pritisak?',
    options: ['Stvaranjem novih pretnji uz poboljšanje figura', 'Forsiranjem napada bez podrške', 'Razmenom svih aktivnih figura automatski'],
    answer: 0,
    explanation: 'Pretnje i poboljšavanje položaja mogu se smenjivati. Protivnik mora da reaguje, a ti zadržavaš inicijativu.',
    takeaway: 'Ne forsiraj napad ako možeš prvo poboljšati figuru.'
  },
  {
    id: 'kasparov-topalov',
    title: 'Inicijativa i žrtva kvaliteta',
    subtitle: 'Kasparov protiv Topalova · Wijk aan Zee, 1999',
    lesson: 'Ova partija se pamti po dinamičnom napadu i žrtvi kvaliteta. Top je obično jači od lovca ili skakača, ali aktivne figure, otvoren kralj i tempo mogu privremeno nadoknaditi razliku.',
    question: 'Šta može da nadoknadi žrtvovani materijal?',
    options: ['Aktivnost, napad i prisilne pretnje', 'Samo nada da protivnik pogreši', 'Automatski sledeći potez pešakom'],
    answer: 0,
    explanation: 'Materijalna procena treba da se uporedi sa kraljevom bezbednošću, aktivnošću i konkretnim pretnjama.',
    takeaway: 'Pre žrtve proveri da li napad traje i posle najboljeg odgovora.'
  },
  {
    id: 'deep-blue-kasparov',
    title: 'Čovek protiv računara',
    subtitle: 'Deep Blue protiv Kasparova · 6. partija, 1997',
    lesson: 'Meč je postao važan trenutak u istoriji šaha i računarstva. Za šahistu je korisna pouka da potez treba procenjivati po poziciji i protivnikovim mogućnostima, a ne po tome ko ga je odigrao.',
    question: 'Kako proveriti da li je potez dobar?',
    options: ['Analizirati poziciju i moguće odgovore', 'Verovati potezu samo zato što ga je odigrao računar', 'Birati potez koji izgleda najbrže'],
    answer: 0,
    explanation: 'I ljudski i računarski potez treba razumeti kroz pretnje, odbrane i posledice na tabli.',
    takeaway: 'Razumi razlog poteza, ne samo njegovo ime.'
  },
  {
    id: 'carlsen-karjakin',
    title: 'Strpljenje u završnici',
    subtitle: 'Carlsen protiv Karjakina · Njujork, 2016',
    lesson: 'U završnici ima manje figura, pa kralj postaje aktivna figura. Preciznost i strpljenje su važni: napreduj sa kraljem, stvaraj slabosti i ne dozvoli protivniku nepotrebnu protivigru.',
    question: 'Koja figura često postaje aktivna u završnici?',
    options: ['Kralj', 'Kralj ostaje sakriven uvek', 'Dama koja je već razmenjena'],
    answer: 0,
    explanation: 'Kada nema mnogo figura koje mogu da napadnu kralja, on može da učestvuje u borbi za pešake i polja.',
    takeaway: 'U završnici aktiviraj kralja, ali prvo proveri taktičku bezbednost.'
  }
];

export const OPENING_LESSONS: AcademyLesson[] = [
  {
    id: 'opening-principles',
    title: 'Osnovna načela',
    subtitle: 'Centar · razvoj · bezbednost kralja',
    lesson: 'Na početku partije pokušaj da kontrolišeš centar, razviješ lake figure i skloniš kralja na sigurno. Ne moraš da pamtiš otvaranje da bi odigrao koristan potez.',
    question: 'Koji je dobar cilj u prvih nekoliko poteza?',
    options: ['Razviti figure i boriti se za centar', 'Izvesti damu u napad sama', 'Pomerati isti pešak mnogo puta'],
    answer: 0,
    explanation: 'Centar daje figurama prostor, a razvoj omogućava da više figura učestvuje u partiji.',
    takeaway: 'Razvij figure, kontroliši centar i razmišljaj o rokadi.'
  },
  {
    id: 'opening-italian',
    title: 'Italijanska partija',
    subtitle: 'Aktivan lovac i pritisak na centar',
    lesson: 'U Italijanskoj partiji beli razvija lovca ka c4, gde gleda prema slabom polju f7. Ideja je prirodan razvoj uz pritisak; ne znači da treba odmah žrtvovati figuru na f7.',
    question: 'Zašto je lovac na c4 aktivan?',
    options: ['Usmerava pritisak ka centru i f7', 'Brani samo ugao table', 'Sprečava belog kralja da rokira'],
    answer: 0,
    explanation: 'Polje c4 daje lovcu dijagonalu prema centru i kraljevom krilu crnog.',
    takeaway: 'Aktivno polje razvija figuru i stvara korisnu metu.'
  },
  {
    id: 'opening-spanish',
    title: 'Španska partija',
    subtitle: 'Pritisak na branioca centra',
    lesson: 'Španska partija obično nastaje kada beli lovac izađe na b5 i pritisne skakača koji pomaže crnom da drži centar. Planovi su važniji od pokušaja da se odmah osvoji pešak.',
    question: 'Šta je dugoročna ideja lovca na b5?',
    options: ['Povećati pritisak na branioca centra', 'Odmah uzeti kralja', 'Zatvoriti sopstvenu dijagonalu'],
    answer: 0,
    explanation: 'Napad na branioca može posredno oslabiti kontrolu centra, čak i ako se figura ne uzme odmah.',
    takeaway: 'Napad na branioca centra može biti važniji od napada na pešaka.'
  },
  {
    id: 'opening-scotch',
    title: 'Škotska partija',
    subtitle: 'Rano otvaranje centra',
    lesson: 'Škotska partija otvara centralne linije rano. To daje prostor i razvoj, ali obe strane moraju pažljivo da računaju jer se figure brzo sukobljavaju.',
    question: 'Šta se menja kada se centar rano otvori?',
    options: ['Linije za figure postaju otvorenije', 'Rokada više nije moguća', 'Potezi prestaju da budu legalni'],
    answer: 0,
    explanation: 'Otvorene linije pomažu topovima i lovcima, ali mogu učiniti kralja ranjivijim.',
    takeaway: 'Kada otvoriš centar, proveri bezbednost oba kralja.'
  },
  {
    id: 'opening-four-knights',
    title: 'Otvaranje četiri skakača',
    subtitle: 'Prirodan razvoj i kontrola centra',
    lesson: 'Obe strane razvijaju skakače ka centralnim poljima. To je dobar primer da razvoj figura može biti prirodan i uravnotežen, bez ranog lova na pešake.',
    question: 'Zašto su skakači često razvijeni ka centru?',
    options: ['Tamo kontrolišu više korisnih polja', 'Tamo ne mogu biti napadnuti', 'Zato što pešaci ne mogu da se pomere'],
    answer: 0,
    explanation: 'Centralni skakač obično utiče na više polja i može se brzo prebaciti na krilo.',
    takeaway: 'Razvijaj figure na polja sa uticajem, ne samo na prazna polja.'
  },
  {
    id: 'opening-queens-gambit',
    title: 'Kraljičin gambit',
    subtitle: 'Borba za centar',
    lesson: 'Beli nudi pešaka sa c4 da bi osporio crnom centar. „Gambit“ ne znači da beli mora trajno da izgubi pešaka — često se pešak može vratiti, a cilj je aktivnija pozicija.',
    question: 'Šta je glavna ideja Kraljičinog gambita?',
    options: ['Osporiti kontrolu centra', 'Napasti kralja odmah damom', 'Izbeći razvoj lovca'],
    answer: 0,
    explanation: 'Pešak c4 utiče na d5 i otvara borbu za centralna polja.',
    takeaway: 'Gambit je ponuda sa planom, ne poklon bez razloga.'
  },
  {
    id: 'opening-slav',
    title: 'Slovenska odbrana',
    subtitle: 'Čvrst centar i slobodan lovac',
    lesson: 'Crni podržava pešaka na d5 sa c6. Za razliku od nekih sličnih postavki, crni može da razvije lovca sa c8 pre nego što zatvori njegovu dijagonalu.',
    question: 'Koju praktičnu prednost daje potez c6?',
    options: ['Podržava d5 i čuva stabilan centar', 'Odmah otvara put kralju do centra', 'Uklanja sve crne pešake'],
    answer: 0,
    explanation: 'Podržan centar je teže napasti, a crni zadržava više razvojnih opcija.',
    takeaway: 'Pre nego što zatvoriš lovca, proveri da li možeš da ga razviješ.'
  },
  {
    id: 'opening-french',
    title: 'Francuska odbrana',
    subtitle: 'Pešački lanac i planovi za oba krila',
    lesson: 'Crni gradi pešački lanac i osporava beli centar. Često se javlja pitanje kako da se napadne baza lanca i koja strana table nudi više prostora.',
    question: 'Kako se obično napada protivnički pešački lanac?',
    options: ['Pritiskom na njegovu bazu', 'Pomeranjem kralja napred', 'Ignorisanjem centra'],
    answer: 0,
    explanation: 'Baza lanca je pešak koji podržava ostale. Ako oslabi, ceo lanac može postati ranjiv.',
    takeaway: 'Kod pešačkog lanca pronađi bazu i planiraj pritisak na nju.'
  },
  {
    id: 'opening-caro-kann',
    title: 'Caro-Kann odbrana',
    subtitle: 'Čvrst centar i zdrav razvoj',
    lesson: 'Crni podržava borbu za centar pešakom c6. Otvaranje je poznato po pouzdanoj strukturi, ali čvrstost ne treba da znači pasivnost — figure i dalje moraju da izađu.',
    question: 'Šta crni želi da dobije potezom c6?',
    options: ['Podršku centru uz čvrstu pešačku strukturu', 'Brz mat bez razvoja', 'Slabost sopstvenog centra'],
    answer: 0,
    explanation: 'Pešak c6 pomaže crnom da se suprotstavi centru, nakon čega treba razviti figure.',
    takeaway: 'Čvrsta struktura je korisna kada je prati aktivan razvoj.'
  },
  {
    id: 'opening-sicilian',
    title: 'Sicilijanska odbrana',
    subtitle: 'Asimetrična borba za centar',
    lesson: 'Crni odgovara potezom c5 i stvara nesimetričnu poziciju. Planovi često idu na različita krila; početniku je važnije da razume prostor i razvoj nego da uči duge teorijske varijante.',
    question: 'Šta znači da je pozicija asimetrična?',
    options: ['Obe strane imaju različite pešačke strukture i planove', 'Svi pešaci su na istim poljima', 'Partija je već završena'],
    answer: 0,
    explanation: 'Različite strukture daju stranama različite ciljeve i često vode do igre na suprotnim krilima.',
    takeaway: 'Prepoznaj plan svoje strane i protivničku protivigru.'
  },
  {
    id: 'opening-kings-indian',
    title: 'Kraljevoindijska odbrana',
    subtitle: 'Prepusti prostor, pa traži protivigru',
    lesson: 'Crni često dopušta belom da izgradi centar, a zatim pokušava da ga napadne. Ova strategija traži pravovremenu protivigru; pasivno čekanje može ostaviti crnog bez prostora.',
    question: 'Šta crni mora da uradi nakon što beli zauzme centar?',
    options: ['Pripremi aktivan napad na centar', 'Razmeni sve pešake odmah', 'Prestane da razvija figure'],
    answer: 0,
    explanation: 'Prostor koji je prepusten mora se osporiti planom i aktivnim potezima.',
    takeaway: 'Ako prepustiš prostor, pripremi jasan način da ga napadneš.'
  },
  {
    id: 'opening-london',
    title: 'Londonski sistem',
    subtitle: 'Prepoznatljiva postavka uz razumevanje plana',
    lesson: 'Beli često razvija lovca na f4 i gradi čvrstu postavku. Ponavljanje poznate šeme olakšava početak, ali potezi i dalje moraju odgovarati onome što protivnik radi.',
    question: 'Zašto nije dovoljno igrati istu šemu bez gledanja protivnika?',
    options: ['Protivnik može stvoriti konkretnu pretnju koju treba rešiti', 'Šahovska pravila se menjaju', 'Razvoj figura nije dozvoljen'],
    answer: 0,
    explanation: 'Šablon pomaže, ali svaki potez treba proveriti prema trenutnoj poziciji i pretnjama.',
    takeaway: 'Koristi plan kao vodič, ne kao autopilot.'
  }
];

export const STRATEGY_LESSONS: AcademyLesson[] = [
  {
    id: 'strategy-center',
    title: 'Centar i prostor',
    subtitle: 'Polja koja daju figurama slobodu',
    lesson: 'Centralna polja e4, d4, e5 i d5 utiču na mnogo linija kretanja. Kontrola centra pomaže figurama da stignu i do kraljevskog i do damskog krila.',
    question: 'Zašto je centar koristan?',
    options: ['Figure iz centra obično imaju veći uticaj', 'Kraljevi ne mogu da uđu u centar', 'Centar štiti sve figure automatski'],
    answer: 0,
    explanation: 'Figura koja kontroliše centar često ima više mogućih pravaca i može brzo promeniti stranu napada.',
    takeaway: 'Kontroliši centar pešacima i razvijenim figurama.'
  },
  {
    id: 'strategy-worst-piece',
    title: 'Najlošija figura',
    subtitle: 'Pronađi figuru koja najmanje učestvuje',
    lesson: 'Kada nema neposredne taktike, uporedi svoje figure. Koja ima najmanje polja, blokirana je pešacima ili nema metu? Poboljšaj je potezom koji ne stvara novu slabost.',
    question: 'Šta je koristan plan u mirnoj poziciji?',
    options: ['Poboljšati najmanje aktivnu figuru', 'Napasti bez podrške', 'Pomeriti aktivnu figuru nazad bez razloga'],
    answer: 0,
    explanation: 'Poboljšanje najlošije figure jača ceo tim i često priprema sledeći plan.',
    takeaway: 'Pre poteza pronađi figuru koja najmanje doprinosi.'
  },
  {
    id: 'strategy-king-safety',
    title: 'Bezbednost kralja',
    subtitle: 'Rokada i pešaci ispred kralja',
    lesson: 'Rokada obično skloni kralja od centra i poveže topove. Pešaci ispred kralja su štit, pa njihovo pomeranje otvara polja koja protivnik može da napadne.',
    question: 'Šta treba proveriti pre nego što pomeriš pešake ispred kralja?',
    options: ['Koje linije i polja time otvaraš', 'Da li možeš odmah da uzmeš damu', 'Boju polja na tabli'],
    answer: 0,
    explanation: 'Pešaci se ne mogu vratiti. Svaki njihov pomak može ostaviti trajne rupe oko kralja.',
    takeaway: 'Sačuvaj kraljevo sklonište i rokiraj kada je bezbedno.'
  },
  {
    id: 'strategy-open-files',
    title: 'Otvorene linije',
    subtitle: 'Topovi vole slobodne kolone',
    lesson: 'Otvorena linija nema pešake, a poluotvorena nema tvoje pešake. Topovi mogu da koriste takve linije za ulazak u protivnički položaj ili pritisak na slabost.',
    question: 'Gde je često korisno postaviti top?',
    options: ['Na otvorenu ili poluotvorenu liniju', 'Iza sopstvenog pešaka na zatvorenoj liniji', 'U ugao bez puta napred'],
    answer: 0,
    explanation: 'Top dobija domet kada mu pešaci ne blokiraju kolonu.',
    takeaway: 'Preusmeri topove ka linijama koje mogu da se otvore.'
  },
  {
    id: 'strategy-outpost',
    title: 'Slabo polje i predstraža',
    subtitle: 'Stabilno polje za skakača',
    lesson: 'Slabo polje ne može lako da bude napadnuto pešakom. Ako ga tvoja figura zauzme i može biti podržana, postaje predstraža i može ograničiti protivničke figure.',
    question: 'Kada je polje dobra predstraža za skakača?',
    options: ['Kada je zaštićeno i teško ga je oterati pešakom', 'Kada ga napadaju tri protivničke figure', 'Kada je daleko od svih važnih polja'],
    answer: 0,
    explanation: 'Stabilna figura napred može da kontroliše polja, napada slabosti i suzi protivnikove mogućnosti.',
    takeaway: 'Traži polja koja protivnički pešaci ne mogu da napadnu.'
  },
  {
    id: 'strategy-bishops',
    title: 'Dobar i loš lovac',
    subtitle: 'Pešačka struktura određuje dijagonale',
    lesson: 'Lovac može biti sputan sopstvenim pešacima na istoj boji polja. „Loš“ lovac nije zauvek beskoristan — može braniti slabosti ili se aktivirati ako se struktura promeni.',
    question: 'Šta često sputava lovca?',
    options: ['Sopstveni pešaci na njegovoj boji polja', 'Protivnički kralj na tabli', 'To što je lovac razvijen'],
    answer: 0,
    explanation: 'Pešaci mogu zatvoriti dijagonale lovca. Zato je važno unapred razmišljati o njihovom rasporedu.',
    takeaway: 'Proveri da li tvoji pešaci blokiraju lovčevu dijagonalu.'
  },
  {
    id: 'strategy-weak-pawns',
    title: 'Slabi pešaci',
    subtitle: 'Izolovan pešak nema pešačku podršku',
    lesson: 'Pešak je izolovan kada na susednim kolonama nema sopstvenih pešaka koji bi ga podržali. Može biti meta, ali otvorene linije i aktivne figure ponekad daju kompenzaciju.',
    question: 'Šta je slabost izolovanog pešaka?',
    options: ['Teže ga je braniti drugim pešakom', 'Ne može nikad da se pomeri', 'On automatski daje mat'],
    answer: 0,
    explanation: 'Pešak može zahtevati podršku figurom, što protivniku daje dugoročnu metu.',
    takeaway: 'Napadaj slabost kada je možeš bezbedno pritisnuti.'
  },
  {
    id: 'strategy-passed-pawn',
    title: 'Prošli pešak',
    subtitle: 'Slobodna staza ka promociji',
    lesson: 'Prošli pešak nema protivničkog pešaka ispred sebe niti na susednim kolonama koji može da ga zaustavi. Ipak, pre napredovanja proveri da li ga figure mogu uhvatiti ili blokirati.',
    question: 'Šta treba proveriti pre nego što gurneš prošlog pešaka?',
    options: ['Može li biti zaustavljen ili uzet', 'Da li protivnička dama postoji', 'Da li je pešak na početnom redu'],
    answer: 0,
    explanation: 'Napredovanje bez podrške može izgubiti pešaka; pratnja kralja ili figura često je važna.',
    takeaway: 'Prati prošlog pešaka i izračunaj ko stiže prvi.'
  },
  {
    id: 'strategy-exchanges',
    title: 'Korisne razmene',
    subtitle: 'Razmeni sa razlogom',
    lesson: 'Razmena nije automatski dobra samo zato što možeš da uzmeš. Proceni da li uklanjaš važnog branioca, menjaš aktivnu figuru za pasivnu ili olakšavaš protivniku poziciju.',
    question: 'Šta je najbolje pitati pre razmene?',
    options: ['Kome će preostala pozicija više odgovarati', 'Da li se potez može izgovoriti brzo', 'Koja figura je skuplja samo po izgledu'],
    answer: 0,
    explanation: 'Razmena menja ravnotežu figura i slabosti. Njena vrednost zavisi od pozicije koja ostaje.',
    takeaway: 'Razmenjuj kada dobijaš konkretno poboljšanje.'
  },
  {
    id: 'strategy-majority',
    title: 'Pešačka većina',
    subtitle: 'Stvaranje drugog slabog cilja',
    lesson: 'Veći broj pešaka na jednom krilu može vremenom stvoriti prošlog pešaka. Napredovanje treba podržati i paziti da se ne ostavi drugi deo table nezaštićen.',
    question: 'Šta pešačka većina može da stvori?',
    options: ['Prošlog pešaka', 'Dodatnog kralja', 'Automatsku rokadu'],
    answer: 0,
    explanation: 'Pešaci mogu napredovati tako da razmene protivničke pešake i ostave jednog slobodnog za promociju.',
    takeaway: 'Koristi pešačku većinu da stvoriš metu koju protivnik mora da zaustavi.'
  },
  {
    id: 'strategy-king-endgame',
    title: 'Kralj u završnici',
    subtitle: 'Od skloništa do aktivne figure',
    lesson: 'Kada su dame i mnoge napadačke figure razmenjene, kralj često može da priđe centru i pomogne pešacima. I dalje proveravaj protivničke taktičke pretnje.',
    question: 'Kada kralj može postati aktivna figura?',
    options: ['U završnici, kada je rizik od mata manji', 'Nikada tokom partije', 'Samo dok je u šahu'],
    answer: 0,
    explanation: 'Kralj je snažna figura u završnici, ali mora da izbegne preostale pretnje i pešačke trke.',
    takeaway: 'U završnici dovedi kralja bliže važnim pešacima.'
  },
  {
    id: 'strategy-rook-endgame',
    title: 'Topovska završnica',
    subtitle: 'Aktivan top i podrška prolaznom pešaku',
    lesson: 'U topovskim završnicama aktivnost topa često je važnija od pasivnog čuvanja pešaka. Top može davati korisne šahove, napadati pešake sa strane i podržati svog prolaznog pešaka.',
    question: 'Koji top je obično korisniji?',
    options: ['Aktivan top koji stvara pretnje', 'Top koji samo stoji iza svog kralja', 'Top koji je zatvoren iza pešaka bez plana'],
    answer: 0,
    explanation: 'Aktivnost primorava protivnika da odgovara i može stvoriti vreme za napredovanje pešaka.',
    takeaway: 'Daj šah sa svrhom i aktiviraj top pre nego što braniš sve pasivno.'
  }
];

export const LESSONS_BY_AREA: Record<AcademyAreaId, AcademyLesson[]> = {
  games: FAMOUS_GAME_LESSONS,
  openings: OPENING_LESSONS,
  strategy: STRATEGY_LESSONS
};
