import { PUZZLES, type Puzzle } from '../services/puzzleCatalog.ts';
import { boardToFen, coordsToSquare, type BoardPiece } from '../shared/chessRules.ts';

export type TacticThemeId =
  | 'mate1'
  | 'mate2'
  | 'mate3'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered'
  | 'sacrifice'
  | 'daily';

export type TacticThemeFilter = TacticThemeId | 'all';

export interface TacticThemeMeta {
  id: TacticThemeFilter;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export interface TacticPuzzle {
  id: string;
  title: string;
  fen: string;
  turn: 'w' | 'b';
  rating: number;
  themes: TacticThemeId[];
  solutionUci: string[];
  hints: [string, string, string];
  explanation: string;
  source: 'curated' | 'classic-academy' | 'lichess-daily';
  triggerMoveUci?: string;
}

export const TACTIC_THEMES: TacticThemeMeta[] = [
  {
    id: 'all',
    label: 'Sve teme',
    shortLabel: 'Sve',
    icon: '⚡',
    description: 'Kombinovane taktičke pozicije iz svih motiva i nivoa težine.',
  },
  {
    id: 'mate1',
    label: 'Mat u 1 potezu',
    shortLabel: 'Mat u 1',
    icon: '♔',
    description: 'Brzi završni udarci u jednom potezu.',
  },
  {
    id: 'mate2',
    label: 'Mat u 2 poteza',
    shortLabel: 'Mat u 2',
    icon: '⚔',
    description: 'Forsirane dvopotezne kombinacije i matne slike.',
  },
  {
    id: 'mate3',
    label: 'Mat u 3 poteza',
    shortLabel: 'Mat u 3',
    icon: '👑',
    description: 'Dublje kombinacije sa žrtvama i forsiranim matom u tri poteza.',
  },
  {
    id: 'fork',
    label: 'Viljuška (Dvostruki napad)',
    shortLabel: 'Viljuška',
    icon: '🔱',
    description: 'Jedna figura napada dve protivničke mete istovremeno.',
  },
  {
    id: 'pin',
    label: 'Vezivanje',
    shortLabel: 'Vezivanje',
    icon: '📌',
    description: 'Iskoristi vezanu figuru koja ne može da se pomeri ili brani.',
  },
  {
    id: 'skewer',
    label: 'Ražanj',
    shortLabel: 'Ražanj',
    icon: '🗡',
    description: 'Nateraj kralja ili jaču figuru da se skloni i osvoji figuru iza nje.',
  },
  {
    id: 'discovered',
    label: 'Otkriveni napad',
    shortLabel: 'Otkriveni',
    icon: '✨',
    description: 'Pomeri figuru koja otvara liniju napada ili šaha za topa, lovca ili damu.',
  },
  {
    id: 'sacrifice',
    label: 'Žrtva i odvlačenje',
    shortLabel: 'Žrtva',
    icon: '🔥',
    description: 'Žrtvuj materijal ili odvuci ključnog branioca da srušiš odbranu.',
  },
];

export const CURATED_MULTI_MOVE_PUZZLES: TacticPuzzle[] = [
  // ================= MAT U 2 =================
  {
    id: 'arena-m2-backrank',
    title: 'Odvlačenje sa poslednjeg reda',
    fen: '5r1k/6pp/4Q3/8/8/8/6PP/4R1K1 w - - 0 1',
    turn: 'w',
    rating: 820,
    themes: ['mate2', 'sacrifice'],
    solutionUci: ['e6e8', 'f8e8', 'e1e8'],
    hints: [
      'Crni kralj je zarobljen iza sopstvenih pešaka — poslednji red je slab.',
      'Samo top na f8 brani polje e8. Možeš li da ga odvučeš žrtvom?',
      'Odigraj 1. Qe8! Posle 1... Rxe8 sledi 2. Rxe8#.',
    ],
    explanation:
      'Žrtva dame na e8 odvlači jedinog branioca poslednjeg reda (topa sa f8), pa beli top sa e1 matira na e8.',
    source: 'curated',
  },
  {
    id: 'arena-m2-black-f2',
    title: 'Baterija na drugom redu',
    fen: '6k1/6pp/8/8/8/8/2r1qPPP/R5K1 b - - 0 1',
    turn: 'b',
    rating: 900,
    themes: ['mate2'],
    solutionUci: ['e2f2', 'g1h1', 'f2g2'],
    hints: [
      'Crni top na c2 i dama na e2 ciljaju drugi red belog kralja.',
      'Polje f2 je samo jednom branjeno kraljem — napadni direktno šahom.',
      'Odigraj 1... Qxf2+! Posle 2. Kh1 sledi 2... Qxg2#.',
    ],
    explanation:
      'Top sa c2 pokriva ceo drugi red i štiti damu kada ona prvo uzme na f2 sa šahom, a zatim matira na g2.',
    source: 'curated',
  },
  {
    id: 'arena-m2-smothered',
    title: 'Gušeni mat u dva poteza',
    fen: '5r1k/6pp/7N/8/8/1Q6/6PP/6K1 w - - 0 1',
    turn: 'w',
    rating: 1050,
    themes: ['mate2', 'sacrifice'],
    solutionUci: ['b3g8', 'f8g8', 'h6f7'],
    hints: [
      'Skakač na h6 već kontroliše polje g8 i sprečava crnog kralja da izađe.',
      'Ako nateraš crnog topa da blokira sopstvenog kralja na g8, skakač zadaje mat.',
      'Žrtvuj damu: 1. Qg8+ Rxg8 2. Nf7#.',
    ],
    explanation:
      'Kralj ne može da uzme damu na g8 jer je skakač štiti, pa top mora na g8 i zatvara poslednji izlaz kralju za gušeni mat skakačem na f7.',
    source: 'curated',
  },
  {
    id: 'arena-m2-black-ng4',
    title: 'Skakač čuva matno polje',
    fen: '6k1/6pp/8/8/6n1/6Pq/5P1P/R5K1 b - - 0 1',
    turn: 'b',
    rating: 1100,
    themes: ['mate2'],
    solutionUci: ['h3h2', 'g1f1', 'h2f2'],
    hints: [
      'Crni skakač na g4 kontroliše važna polja oko belog kralja.',
      'Daj šah damom na h2 i potisni belog kralja ka f1.',
      'Odigraj 1... Qxh2+ 2. Kf1 Qxf2#.',
    ],
    explanation:
      'Posle 1... Qxh2+, beli kralj mora na f1 gde ga čeka dama na f2 zaštićena skakačem sa g4.',
    source: 'curated',
  },
  {
    id: 'arena-m2-anastasia',
    title: 'Anastazijin mat',
    fen: '7k/4N1pp/8/7Q/4R3/8/6PP/6K1 w - - 0 1',
    turn: 'w',
    rating: 1160,
    themes: ['mate2', 'sacrifice'],
    solutionUci: ['h5h7', 'h8h7', 'e4h4'],
    hints: [
      'Skakač na e7 drži polja g8 i g6 pod kontrolom, a h-linija je ključ.',
      'Žrtvom na h7 možeš da izvučeš kralja na rub table.',
      'Odigraj 1. Qxh7+ Kxh7 2. Rh4#.',
    ],
    explanation:
      'Klasičan Anastazijin mat: žrtva dame na h7 otvara h-liniju, a top sa h4 matira jer skakač blokira oba polja za beg na g-liniji.',
    source: 'curated',
  },
  {
    id: 'arena-m2-opera',
    title: 'Morfijev operski mat',
    fen: '4kb1r/p2n1ppp/2p1q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 1',
    turn: 'w',
    rating: 1260,
    themes: ['mate2', 'sacrifice'],
    solutionUci: ['b3b8', 'd7b8', 'd1d8'],
    hints: [
      'Crni kralj je još u centru na e8, a lovac na g5 zatvara polja d8 i f6.',
      'Skakač na d7 brani polje d8 — skreni ga žrtvom dame na b8.',
      'Odigraj 1. Qb8+ Nxb8 2. Rd8#.',
    ],
    explanation:
      'Čuvena završnica Pola Morfija iz Operske partije: žrtva dame na b8 odvlači skakača sa d7 i oslobađa d-liniju za mat topom na d8.',
    source: 'curated',
  },

  // ================= MAT U 3 =================
  {
    id: 'arena-m3-damiano',
    title: 'Damijanov mat u tri poteza',
    fen: '5rk1/4pp2/6P1/7R/8/3Q4/6PP/6K1 w - - 0 1',
    turn: 'w',
    rating: 1350,
    themes: ['mate3', 'sacrifice'],
    solutionUci: ['h5h8', 'g8h8', 'd3h3', 'h8g8', 'h3h7'],
    hints: [
      'Pešak na g6 već štiti polje h7 — fali samo teška figura na h-liniji.',
      'Žrtvuj topa na h8 da otvoriš put za damu ka h3 i h7.',
      '1. Rh8+ Kxh8 2. Qh3+ Kg8 3. Qh7#.',
    ],
    explanation:
      'Žrtva topa na h8 čisti h-liniju za damu koja kroz h3 dolazi na h7, gde je zaštićena pešakom na g6.',
    source: 'curated',
  },
  {
    id: 'arena-m3-g7-clearance',
    title: 'Otvaranje osmog reda',
    fen: '6rk/2pp2pp/7P/3B4/8/6Q1/6PP/4R1K1 w - - 0 1',
    turn: 'w',
    rating: 1450,
    themes: ['mate3', 'sacrifice'],
    solutionUci: ['g3g7', 'g8g7', 'e1e8', 'g7g8', 'e8g8'],
    hints: [
      'Lovac na d5 cilja g8, a pešak na h6 brani g7 — posmatraj oba pravca.',
      'Žrtva dame na g7 prisiljava topa da napusti osmi red.',
      '1. Qxg7+ Rxg7 2. Re8+ Rg8 3. Rxg8#.',
    ],
    explanation:
      'Dama se žrtvuje na g7 i odvlači topa sa g8. Nakon 2. Re8+, top mora da se vrati na g8 gde pada pod zaštitom lovca sa d5.',
    source: 'curated',
  },
  {
    id: 'arena-m3-greco-qa6',
    title: 'Udar po belim poljima (a6)',
    fen: '2kr4/ppp5/8/1B6/Q7/8/6PP/3R2K1 w - - 0 1',
    turn: 'w',
    rating: 1550,
    themes: ['mate3', 'sacrifice'],
    solutionUci: ['a4a6', 'b7a6', 'b5a6', 'c8b8', 'd1d8'],
    hints: [
      'Beli lovac na b5 i top na d1 spremni su da zatvore crnog kralja.',
      'Prvi potez nije šah, ali stvara nebranjenu pretnju mata na a7 i a8.',
      'Odigraj 1. Qa6! bxa6 2. Bxa6+ Kb8 3. Rxd8#.',
    ],
    explanation:
      'Žrtva dame na a6 otvara dijagonalu lovcu koji zadaje šah sa a6 i tera kralja na b8, posle čega top uzima na d8 sa matom.',
    source: 'curated',
  },
  {
    id: 'arena-m3-black-sac',
    title: 'Proboj na kraljevom krilu',
    fen: '5rk1/6pp/8/8/6n1/7q/5PPP/R5K1 b - - 0 1',
    turn: 'b',
    rating: 1600,
    themes: ['mate3', 'sacrifice'],
    solutionUci: ['h3h2', 'g1f1', 'f8f2', 'f1e1', 'h2g1'],
    hints: [
      'Crna dama, top na f8 i skakač na g4 prave snažan matni pritisak.',
      'Počni šahom damom na h2, pa uključi topa uz šah na f2.',
      '1... Qxh2+ 2. Kf1 Rxf2+ 3. Ke1 Qg1#.',
    ],
    explanation:
      'Posle 1... Qxh2+ kralj beži ka centru, ali top uzima na f2 uz šah i dama završava mat na g1.',
    source: 'curated',
  },

  // ================= VILJUŠKA / FORK =================
  {
    id: 'arena-fork-pawn-bf6',
    title: 'Pripremljena pešačka viljuška',
    fen: '6k1/4qp1p/3b1np1/6B1/3PP3/8/6PP/6K1 w - - 0 1',
    turn: 'w',
    rating: 940,
    themes: ['fork'],
    solutionUci: ['g5f6', 'e7f6', 'e4e5'],
    hints: [
      'Skakač na f6 trenutno kontroliše polje e4-e5.',
      'Ukloni skakača lovcem — kada crna dama uzme nazad, ući će u zamku.',
      '1. Bxf6 Qxf6 2. e5! (viljuška dami i lovcu).',
    ],
    explanation:
      'Razmena lovca za skakača na f6 mami damu na f6, nakon čega guranje pešaka e4-e5 istovremeno napada i damu i lovca na d6.',
    source: 'curated',
  },
  {
    id: 'arena-fork-queen-double',
    title: 'Dvostruki napad damom na e4',
    fen: 'r6k/5ppp/4b3/8/2B5/3Q4/6PP/6K1 w - - 0 1',
    turn: 'w',
    rating: 1040,
    themes: ['fork', 'sacrifice'],
    solutionUci: ['c4e6', 'f7e6', 'd3e4'],
    hints: [
      'Crni top na a8 je nebranjen, a lovac na e6 drži tu dijagonalu.',
      'Razmeni lovce na e6 kako bi oslabio polje e6 i stvorio dve mete.',
      '1. Bxe6 fxe6 2. Qe4! (napada i nebranjenog topa a8 i pešaka e6).',
    ],
    explanation:
      'Uzimanjem na e6 razdvajaju se crni pešaci i ostaje nebranjena slaba tačka na e6 uz nebranjenog topa na a8 — dama sa e4 napada obe mete.',
    source: 'curated',
  },
  {
    id: 'arena-fork-knight-rook',
    title: 'Kraljevska viljuška na e7',
    fen: '2r3k1/3R2pp/1q6/5N2/8/8/6PP/7K w - - 0 1',
    turn: 'w',
    rating: 1140,
    themes: ['fork'],
    solutionUci: ['f5e7', 'g8f8', 'e7c8'],
    hints: [
      'Top na d7 pritišće sedmi red, a skakač može da skoči sa šahom.',
      'Polje e7 daje šah kralju i istovremeno napada topa na c8.',
      '1. Ne7+ Kf8 2. Nxc8.',
    ],
    explanation:
      'Skakač sa e7 daje šah kralju i napada topa na c8, pa nakon povlačenja kralja beli uzima čistog topa.',
    source: 'curated',
  },
  {
    id: 'arena-fork-knight-qa7',
    title: 'Dvostruki skok na damu i topa',
    fen: '3r2k1/q5pp/8/3N4/8/8/6PP/7K w - - 0 1',
    turn: 'w',
    rating: 1240,
    themes: ['fork'],
    solutionUci: ['d5e7', 'g8h8', 'e7c6'],
    hints: [
      'Potraži šah skakačem koji ga prebacuje ka daminom krilu.',
      'Posle 1. Ne7+ crni kralj mora da se skloni, a onda c6 pogađa dve teške figure.',
      '1. Ne7+ Kh8 2. Nc6! (napada damu a7 i topa d8).',
    ],
    explanation:
      'Prvi skok na e7 dolazi uz šah kako bi skakač dobio tempo i potom sa c6 uhvatio u viljušku i damu na a7 i topa na d8.',
    source: 'curated',
  },

  // ================= VEZIVANJE / PIN =================
  {
    id: 'arena-pin-c4-d5',
    title: 'Napad na vezanu figuru',
    fen: '3q2k1/5ppp/4b3/3n4/2B5/5Q2/2P3PP/3R2K1 w - - 0 1',
    turn: 'w',
    rating: 980,
    themes: ['pin'],
    solutionUci: ['c4d5', 'e6d5', 'c2c4'],
    hints: [
      'Top na d1 i dama na f3 stvaraju pritisak duž d-linije prema crnoj dami na d8.',
      'Pojedi skakača na d5 lovcem, pa napadni vezanu figuru pešakom.',
      '1. Bxd5 Bxd5 2. c4! (vezani lovac na d5 ne može da pobegne zbog dame d8).',
    ],
    explanation:
      'Nakon razmene na d5, crni lovac je apsolutno vezan za svoju damu na d8 po d-liniji, pa potez 2. c4 dobija figuru.',
    source: 'curated',
  },
  {
    id: 'arena-pin-bb5-qd7',
    title: 'Apsolutno vezivanje na dijagonali',
    fen: '4k2r/p1pq1ppp/8/8/P7/3B4/6PP/3R2K1 w k - 0 1',
    turn: 'w',
    rating: 1090,
    themes: ['pin'],
    solutionUci: ['d3b5', 'c7c6', 'd1d7'],
    hints: [
      'Crni kralj je na e8, a dama stoji tačno ispred njega na d7.',
      'Postavi lovca na b5 (zaštićenog pešakom a4) da vežeš damu za kralja.',
      '1. Bb5! c6 2. Rxd7.',
    ],
    explanation:
      'Lovac na b5 apsolutno vezuje crnu damu za kralja na e8. Čak i kada crni pokuša c6, beli top bezbedno uzima damu na d7.',
    source: 'curated',
  },
  {
    id: 'arena-pin-rxc6',
    title: 'Razaranje zaštite uz vezivanje',
    fen: 'r3k2r/ppq2ppp/2n5/1B6/Q7/8/6PP/2R3K1 w kq - 0 1',
    turn: 'w',
    rating: 1210,
    themes: ['pin', 'sacrifice'],
    solutionUci: ['c1c6', 'b7c6', 'b5c6'],
    hints: [
      'Skakač na c6 je vezan za kralja na e8 od strane lovca na b5.',
      'Žrtvuj kvalitet na c6 da ukloniš branioca i produžiš vezivanje sa šahom.',
      '1. Rxc6 bxc6 2. Bxc6+.',
    ],
    explanation:
      'Žrtvom topa za skakača na c6 beli otvara šah lovcem na c6, hvatajući i kralja i topa na a8 (ili damu ako pokuša odbranu).',
    source: 'curated',
  },
  {
    id: 'arena-pin-absolute-rd1',
    title: 'Zarobljena dama ispred kralja',
    fen: '3r4/6pk/7p/2b5/8/4Q3/6PP/4R1K1 b - - 0 1',
    turn: 'b',
    rating: 1360,
    themes: ['pin', 'sacrifice'],
    solutionUci: ['d8d1', 'e1d1', 'c5e3'],
    hints: [
      'Bela dama na e3 već je vezana za kralja na g1 od strane lovca sa c5.',
      'Pre nego što uzmeš damu, odvuci jedinog branioca polja d1 i napadni prvi red.',
      '1... Rd1+! (ili Rd1) 2. Rxd1 Bxe3+.',
    ],
    explanation:
      'Zbog vezivanja po dijagonali c5-g1, bela dama ne može da uzme topa na d1. Top na d1 vezuje i napada prvog branioca, pa lovac osvaja damu uz šah.',
    source: 'curated',
  },

  // ================= RAŽANJ / SKEWER =================
  {
    id: 'arena-skewer-ra7',
    title: 'Ražanj po sedmom redu',
    fen: '8/5k1q/5pp1/2B5/8/8/6PP/R5K1 w - - 0 1',
    turn: 'w',
    rating: 1040,
    themes: ['skewer'],
    solutionUci: ['a1a7', 'f7g8', 'a7h7'],
    hints: [
      'Crni kralj na f7 i dama na h7 stoje u istoj liniji na sedmom redu.',
      'Lovac na c5 štiti polje a7 — daj šah topom po sedmom redu!',
      '1. Ra7+ Kg8 2. Rxh7.',
    ],
    explanation:
      'Top dolazi na a7 uz zaštitu lovca sa c5 i napada kralja na f7; kralj zaklanja sopstvenu damu i mora da se pomeri, čime gubi damu.',
    source: 'curated',
  },
  {
    id: 'arena-skewer-bishop-rf6',
    title: 'Odvlačenje kralja na dijagonalni ražanj',
    fen: '8/3pp2p/4k1p1/3p4/8/2r1BR2/6PP/6K1 w - - 0 1',
    turn: 'w',
    rating: 1410,
    themes: ['skewer', 'sacrifice'],
    solutionUci: ['f3f6', 'e6f6', 'e3d4', 'f6g5', 'd4c3'],
    hints: [
      'Ako crni kralj stane na f6, naći će se na istoj dijagonali kao i crni top na c3.',
      'Prisilno ga namami na f6 žrtvom topa, pa napadni lovcem sa d4.',
      '1. Rf6+ Kxf6 2. Bd4+ Kg5 3. Bxc3.',
    ],
    explanation:
      'Žrtva topa na f6 jedini je način da crni ostane u igri — ali potez 1... Kxf6 stavlja kralja direktno u lovčev ražanj na d4, pa beli osvaja topa na c3.',
    source: 'curated',
  },
  {
    id: 'arena-skewer-8th-rank',
    title: 'Ražanj na osmom redu',
    fen: '3r3q/1p2kpp1/8/8/8/8/R5PP/3R2K1 w - - 0 1',
    turn: 'w',
    rating: 1510,
    themes: ['skewer', 'sacrifice'],
    solutionUci: ['d1d8', 'e7d8', 'a2a8', 'd8e7', 'a8h8'],
    hints: [
      'Posle razmene topova na d8, crni kralj mora da se nađe na osmom redu zajedno sa damom na h8.',
      'Najpre uzmi topa na d8, pa spusti drugog topa na a8 uz šah.',
      '1. Rxd8 Kxd8 2. Ra8+ Ke7 3. Rxh8.',
    ],
    explanation:
      'Razmenom na d8 beli navlači crnog kralja na osmi red, gde ga 2. Ra8+ probija u ražanj i osvaja damu sa h8.',
    source: 'curated',
  },

  // ================= OTKRIVENI NAPAD / DISCOVERED =================
  {
    id: 'arena-disc-nc6-qb8',
    title: 'Otkriveni šah skakačem',
    fen: '1q2k3/2p2ppp/8/4N3/8/8/6PP/4R1K1 w - - 0 1',
    turn: 'w',
    rating: 960,
    themes: ['discovered', 'fork'],
    solutionUci: ['e5c6', 'e8f8', 'c6b8'],
    hints: [
      'Top na e1 gleda pravo ka crnom kralju na e8 — samo skakač na e5 stoji između njih.',
      'Skloni skakača na polje odakle istovremeno napada crnu damu na b8.',
      '1. Nc6+ Kf8 2. Nxb8.',
    ],
    explanation:
      'Skok skakača na c6 otkriva šah topom sa e1 i istovremeno napada damu na b8; dok kralj rešava šah, skakač uzima damu.',
    source: 'curated',
  },
  {
    id: 'arena-disc-bc6-qa4',
    title: 'Otkriveni udarac lovca po dijagonali',
    fen: '4k3/5ppp/8/8/q3B3/8/6PP/4R1K1 w - - 0 1',
    turn: 'w',
    rating: 1120,
    themes: ['discovered'],
    solutionUci: ['e4c6', 'e8f8', 'c6a4'],
    hints: [
      'Top na e1 i crni kralj na e8 su na istoj liniji.',
      'Pomeri lovca sa e4 uz napad na crnu damu na a4.',
      '1. Bc6+ Kf8 2. Bxa4.',
    ],
    explanation:
      'Otkriveni šah lovcem na c6 sprečava crnu damu da pobegne jer kralj mora da se skloni sa e-linije, posle čega lovac uzima na a4.',
    source: 'curated',
  },
  {
    id: 'arena-disc-black-nf4',
    title: 'Crni otkriva e-liniju',
    fen: '4r1k1/5ppp/4n3/7Q/8/8/5PPP/4K3 b - - 0 1',
    turn: 'b',
    rating: 1290,
    themes: ['discovered'],
    solutionUci: ['e6f4', 'e1f1', 'f4h5'],
    hints: [
      'Beli kralj na e1 stoji direktno naspram tvog topa na e8.',
      'Skoči skakačem sa e6 na polje sa kog napadaš belu damu na h5.',
      '1... Nf4+ 2. Kf1 Nxh5.',
    ],
    explanation:
      'Skok skakača na f4 otkriva šah topom sa e8 i napada belu damu na h5, koju skakač uzima u sledećem potezu.',
    source: 'curated',
  },

  // ================= ŽRTVA I ODVLAČENJE / SACRIFICE =================
  {
    id: 'arena-sac-bxf7',
    title: 'Žrtva na f7 za otvaranje e-linije',
    fen: '4r1k1/3q1ppp/8/8/Q1B5/8/6PP/4R1K1 w - - 0 1',
    turn: 'w',
    rating: 1170,
    themes: ['sacrifice', 'pin'],
    solutionUci: ['c4f7', 'd7f7', 'e1e8'],
    hints: [
      'Crna dama na d7 i top na e8 drže ravnotežu na e-liniji.',
      'Lovac može da uzme na f7 uz šah — ako dama vrati na f7, gubi odbranu topa na e8.',
      '1. Bxf7+ Qxf7 2. Rxe8+.',
    ],
    explanation:
      'Žrtva lovca na f7 odvlači damu (ili kralja, kada pada dama na d7), pa beli osvaja topa na e8 uz odlučujući šah.',
    source: 'curated',
  },
  {
    id: 'arena-sac-black-anastasia',
    title: 'Crni žrtvuje damu za Anastazijin mat',
    fen: '6k1/6pp/8/4r3/7q/8/P3nPPP/R6K b - - 0 1',
    turn: 'b',
    rating: 1460,
    themes: ['sacrifice', 'mate2'],
    solutionUci: ['h4h2', 'h1h2', 'e5h5'],
    hints: [
      'Skakač na e2 već oduzima belom kralju polje g1.',
      'Žrtvuj damu na h2 da izvučeš belog kralja na otvorenu h-liniju.',
      '1... Qxh2+ 2. Kxh2 Rh5#.',
    ],
    explanation:
      'Nakon 1... Qxh2+ beli kralj mora da uzme damu na h2 jer skakač čuva g1, a crni top zadaje Anastazijin mat sa h5.',
    source: 'curated',
  },
  {
    id: 'arena-sac-overload-e5',
    title: 'Preopterećena crna dama',
    fen: '4q1k1/5ppp/8/4r3/8/8/1Q4PP/3R2K1 w - - 0 1',
    turn: 'w',
    rating: 1640,
    themes: ['sacrifice', 'mate3'],
    solutionUci: ['b2e5', 'e8e5', 'd1d8', 'e5e8', 'd8e8'],
    hints: [
      'Crna dama na e8 jedina čuva i topa na e5 i mat na polju d8.',
      'Uzmi topa na e5 damom! Ako crna dama prihvati žrtvu, ostavlja d8 bez odbrane.',
      '1. Qxe5! Qxe5 2. Rd8+ Qe8 3. Rxe8#.',
    ],
    explanation:
      'Crna dama je preopterećena odbranom topa na e5 i poslednjeg reda: nakon 1. Qxe5 Qxe5 beli top ulazi na d8 i matira na e8.',
    source: 'curated',
  },
];

function academyPuzzleToFen(puzzle: Puzzle): string {
  const board: (BoardPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const piece of puzzle.pieces) {
    board[piece.r][piece.c] = {
      type: piece.type,
      color: piece.color,
      hasMoved: Boolean(piece.hasMoved),
    };
  }
  return boardToFen(board, { currentTurn: puzzle.turn });
}

export function getClassicAcademyArenaPuzzles(): TacticPuzzle[] {
  return PUZZLES.map((item, idx) => {
    const fromSq = coordsToSquare(item.solution.fromR, item.solution.fromC);
    const toSq = coordsToSquare(item.solution.toR, item.solution.toC);
    return {
      id: `classic-${item.id}`,
      title: item.title,
      fen: academyPuzzleToFen(item),
      turn: item.turn,
      rating: 680 + idx * 18,
      themes: ['mate1'],
      solutionUci: [`${fromSq}${toSq}`],
      hints: item.hints,
      explanation: item.explanation,
      source: 'classic-academy',
    };
  });
}

let cachedAllArenaPuzzles: TacticPuzzle[] | null = null;

export function getAllArenaPuzzles(): TacticPuzzle[] {
  if (!cachedAllArenaPuzzles) {
    cachedAllArenaPuzzles = [...getClassicAcademyArenaPuzzles(), ...CURATED_MULTI_MOVE_PUZZLES];
  }
  return cachedAllArenaPuzzles;
}

export function getTacticThemeLabel(theme: TacticThemeFilter): string {
  return TACTIC_THEMES.find((item) => item.id === theme)?.label || 'Taktika';
}
