import type { PromotionPieceType } from '../shared/chessRules';

export type AcademyCategory = 'Otvaranje' | 'Odbrana' | 'Strategija' | 'Poznata partija';

export interface AcademyStep {
  moveNumber: string;
  from: string;
  to: string;
  title: string;
  explanation: string;
  promotion?: PromotionPieceType;
}

export interface ChessAcademyLesson {
  id: string;
  category: AcademyCategory;
  name: string;
  badge: string;
  difficulty: 'Početnik' | 'Srednji' | 'Napredni';
  summary: string;
  initialFen?: string;
  steps: AcademyStep[];
}

export const ACADEMY_TUTORIAL_CATEGORIES: {
  id: AcademyCategory;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'Otvaranje',
    label: 'Otvaranja (10)',
    shortLabel: 'Otvaranja',
    description: 'Klasična i hipermoderna otvaranja za bele figure.'
  },
  {
    id: 'Odbrana',
    label: 'Odbrane (10)',
    shortLabel: 'Odbrane',
    description: 'Najpouzdaniji i najborbeniji odgovori za crne figure.'
  },
  {
    id: 'Strategija',
    label: 'Strategije (5)',
    shortLabel: 'Strategije',
    description: 'Ključni planovi središnjice i tehnika u završnicama.'
  },
  {
    id: 'Poznata partija',
    label: 'Poznate partije (5)',
    shortLabel: 'Partije',
    description: 'Besmrtne kombinacije i taktičke zamke iz istorije šaha.'
  }
];

export const CHESS_ACADEMY_LESSONS: ChessAcademyLesson[] = [
  // ===========================================================================
  // I. 10 POZNATIH OTVARANJA (BELI)
  // ===========================================================================
  {
    id: 'italian-game',
    category: 'Otvaranje',
    name: 'Italijanska partija',
    badge: 'C50',
    difficulty: 'Početnik',
    summary: 'Najčistije klasično otvaranje. Beli brzo razvija lake figure i direktno cilja najslabiju tačku crnog — polje f7.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Zauzimanje centra', explanation: 'Beli zauzima centar i otvara dijagonale za kraljicu i belopoljnog lovca.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Simetričan odgovor', explanation: 'Crni sprečava belog da bez borbe zagospodari sredinom table.' },
      { moveNumber: '2. Nf3', from: 'g1', to: 'f3', title: 'Razvoj skakača uz napad', explanation: 'Skakač izlazi na prirodno polje i odmah napada nebranjenog pešaka na e5.' },
      { moveNumber: '2... Nc6', from: 'b8', to: 'c6', title: 'Odbrana centra', explanation: 'Crni razvija svog skakača i štiti pešaka na e5.' },
      { moveNumber: '3. Bc4', from: 'f1', to: 'c4', title: 'Italijanski lovac', explanation: 'Lovac izlazi na aktivnu dijagonalu i nišani polje f7 koje brani samo crni kralj.' }
    ]
  },
  {
    id: 'ruy-lopez',
    category: 'Otvaranje',
    name: 'Španska partija (Ruy Lopez)',
    badge: 'C60',
    difficulty: 'Srednji',
    summary: 'Kraljica svih otvaranja na najvišem nivou. Beli vrši dugoročan pritisak na odbranu crnog centra.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje kraljevim pešakom', explanation: 'Beli otvara igru i zauzima centralni prostor.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Odgovor u centru', explanation: 'Crni uspostavlja ravnotežu na centralnim poljima.' },
      { moveNumber: '2. Nf3', from: 'g1', to: 'f3', title: 'Napad na e5', explanation: 'Skakač napada pešaka i priprema malu rokadu.' },
      { moveNumber: '2... Nc6', from: 'b8', to: 'c6', title: 'Zaštita pešaka', explanation: 'Skakač staje u odbranu polja e5.' },
      { moveNumber: '3. Bb5', from: 'f1', to: 'b5', title: 'Španski lovac', explanation: 'Lovac preti da ukloni skakača koji čuva pešaka na e5 i priprema brzu rokadu.' }
    ]
  },
  {
    id: 'queens-gambit',
    category: 'Otvaranje',
    name: 'Damin gambit',
    badge: 'D06',
    difficulty: 'Početnik',
    summary: 'Strateško otvaranje kojim beli nudi krilnog pešaka kako bi preuzeo potpunu kontrolu nad centrom.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Čvrst centralni oslonac', explanation: 'Pešak na d4 je od samog početka zaštićen kraljicom.' },
      { moveNumber: '1... d5', from: 'd7', to: 'd5', title: 'Blokada centra', explanation: 'Crni zaustavlja napredovanje belog pešaka.' },
      { moveNumber: '2. c4', from: 'c2', to: 'c4', title: 'Ponuda gambita', explanation: 'Beli napada crni centar sa boka. Ako crni uzme pešaka, beli lako vraća materijal uz jači centar.' },
      { moveNumber: '2... e6', from: 'e7', to: 'e6', title: 'Odbijeni damin gambit', explanation: 'Crni čvrsto brani tačku d5 i otvara put svom tamnopoljnom lovcu.' },
      { moveNumber: '3. Nc3', from: 'b1', to: 'c3', title: 'Pritisak na d5', explanation: 'Skakač pojačava pritisak na centar i uvodi nove snage u igru.' }
    ]
  },
  {
    id: 'london-system',
    category: 'Otvaranje',
    name: 'Londonski sistem',
    badge: 'D02',
    difficulty: 'Početnik',
    summary: 'Izuzetno čvrsta i pouzdana šema za belog koja stvara neprobojnu piramidu pešaka bez obzira na poteze crnog.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Zauzimanje d4', explanation: 'Beli postavlja temelj za zatvorenu pozicionu igru.' },
      { moveNumber: '1... d5', from: 'd7', to: 'd5', title: 'Odgovor crnog', explanation: 'Crni parira u centru.' },
      { moveNumber: '2. Nf3', from: 'g1', to: 'f3', title: 'Kontrola polja e5', explanation: 'Skakač sprečava crnog da lako odigra e5.' },
      { moveNumber: '2... Nf6', from: 'g8', to: 'f6', title: 'Razvoj skakača', explanation: 'Crni takođe kontroliše centralna polja.' },
      { moveNumber: '3. Bf4', from: 'c1', to: 'f4', title: 'Londonski lovac', explanation: 'Ključni potez sistema — lovac izlazi van lanca pešaka pre nego što beli odigra e3.' }
    ]
  },
  {
    id: 'scotch-game',
    category: 'Otvaranje',
    name: 'Škotska partija',
    badge: 'C45',
    difficulty: 'Početnik',
    summary: 'Direktno i otvoreno otvaranje u kojem beli odmah razbija centar i otvara linije za napad.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Centralni pešak', explanation: 'Otvaranje prostora za figure.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Simetrija', explanation: 'Crni zauzima svoj deo centra.' },
      { moveNumber: '2. Nf3', from: 'g1', to: 'f3', title: 'Napad na e5', explanation: 'Standardni razvoj kraljevog skakača.' },
      { moveNumber: '2... Nc6', from: 'b8', to: 'c6', title: 'Odbrana', explanation: 'Crni brani pešaka.' },
      { moveNumber: '3. d4', from: 'd2', to: 'd4', title: 'Škotski udar u centru', explanation: 'Beli odmah otvara centar umesto da razvija lovca.' },
      { moveNumber: '3... exd4', from: 'e5', to: 'd4', title: 'Razmena u centru', explanation: 'Crni je praktično prinuđen da uzme pešaka.' },
      { moveNumber: '4. Nxd4', from: 'f3', to: 'd4', title: 'Dominacija skakača', explanation: 'Beli skakač zauzima moćnu centralnu poziciju sa koje kontroliše celu tablu.' }
    ]
  },
  {
    id: 'kings-gambit',
    category: 'Otvaranje',
    name: 'Kraljev gambit',
    badge: 'C30',
    difficulty: 'Napredni',
    summary: 'Romantično i agresivno otvaranje! Beli žrtvuje pešaka već u drugom potezu radi munjevitog napada po f-liniji.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Početak napada', explanation: 'Beli otvara igru.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Odgovor crnog', explanation: 'Crni drži centar.' },
      { moveNumber: '2. f4', from: 'f2', to: 'f4', title: 'Žrtva f-pešaka', explanation: 'Beli nudi pešaka kako bi skrenuo crnog e-pešaka iz centra i otvorio f-liniju za svog topa.' },
      { moveNumber: '2... exf4', from: 'e5', to: 'f4', title: 'Prihvaćeni gambit', explanation: 'Crni uzima ponuđenog pešaka, ali gubi kontrolu nad poljem d4.' },
      { moveNumber: '3. Nf3', from: 'g1', to: 'f3', title: 'Sprečavanje šaha', explanation: 'Skakač sprečava neugodan šah crne kraljice sa h4 i priprema osvajanje centra potezom d4.' }
    ]
  },
  {
    id: 'vienna-game',
    category: 'Otvaranje',
    name: 'Bečka partija',
    badge: 'C25',
    difficulty: 'Srednji',
    summary: 'Fleksibilno otvaranje u kojem beli prvo štiti svog e4 pešaka pre nego što krene u oštar napad na kraljevom krilu.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Zauzimanje centra', explanation: 'Klasičan prvi potez.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Odgovor crnog', explanation: 'Crni parira u sredini.' },
      { moveNumber: '2. Nc3', from: 'b1', to: 'c3', title: 'Bečki skakač', explanation: 'Beli brani pešaka na e4, kontroliše d5 i čuva opciju za kasniji prodor f4.' },
      { moveNumber: '2... Nf6', from: 'g8', to: 'f6', title: 'Kontranapad na e4', explanation: 'Crni razvija skakača i napada belog centralnog pešaka.' },
      { moveNumber: '3. f4', from: 'f2', to: 'f4', title: 'Bečki gambit', explanation: 'Beli pokreće oštar napad na centar i kraljevo krilo uz podršku skakača sa c3.' }
    ]
  },
  {
    id: 'english-opening',
    category: 'Otvaranje',
    name: 'Englesko otvaranje',
    badge: 'A10',
    difficulty: 'Srednji',
    summary: 'Krilno otvaranje kojim beli kontroliše centar sa distance i često vodi u bogate pozicione bitke.',
    steps: [
      { moveNumber: '1. c4', from: 'c2', to: 'c4', title: 'Kontrola polja d5', explanation: 'Beli sa boka kontroliše važno centralno polje d5 i sprečava crnog da lako izgradi centar.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Obrnuta Sicilijanka', explanation: 'Crni zauzima prostor u centru, pa beli sada igra Sicilijansku odbranu sa potezom više.' },
      { moveNumber: '2. Nc3', from: 'b1', to: 'c3', title: 'Pojačanje pritiska na d5', explanation: 'Skakač i c-pešak zajedno drže polje d5 pod potpunom kontrolom.' },
      { moveNumber: '2... Nf6', from: 'g8', to: 'f6', title: 'Razvoj skakača', explanation: 'Crni razvija figuru i priprema d5.' },
      { moveNumber: '3. g3', from: 'g2', to: 'g3', title: 'Priprema fijanketa', explanation: 'Beli otvara put lovcu na g2 odakle će vladati celom velikom dijagonalom.' }
    ]
  },
  {
    id: 'reti-opening',
    category: 'Otvaranje',
    name: 'Retijevo otvaranje',
    badge: 'A04',
    difficulty: 'Napredni',
    summary: 'Hipermoderno otvaranje: beli namerno pušta crnog da zauzme centar pešacima, a zatim ga ruši sa bokova.',
    steps: [
      { moveNumber: '1. Nf3', from: 'g1', to: 'f3', title: 'Fleksibilan start', explanation: 'Skakač kontroliše e5 i d4, ne otkrivajući još uvek pešačku strukturu belog.' },
      { moveNumber: '1... d5', from: 'd7', to: 'd5', title: 'Crni zauzima centar', explanation: 'Crni koristi priliku da postavi pešaka u sredinu.' },
      { moveNumber: '2. c4', from: 'c2', to: 'c4', title: 'Bočni udar na centar', explanation: 'Beli odmah potkopava crnog centralnog pešaka na d5.' },
      { moveNumber: '2... dxc4', from: 'd5', to: 'c4', title: 'Prihvatanje pešaka', explanation: 'Crni napušta centar uzimanjem na c4.' },
      { moveNumber: '3. e3', from: 'e2', to: 'e3', title: 'Povratak materijala', explanation: 'Beli mirno otvara lovca da povrati pešaka na c4 uz potpunu dominaciju u centru.' }
    ]
  },
  {
    id: 'catalan-opening',
    category: 'Otvaranje',
    name: 'Katalonsko otvaranje',
    badge: 'E00',
    difficulty: 'Napredni',
    summary: 'Spoj Daminog gambita i kraljevog fijanketa. Beli stvara dugotrajan pritisak duž velike dijagonale h1–a8.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Centralni temelj', explanation: 'Početak zatvorene pozicione igre.' },
      { moveNumber: '1... Nf6', from: 'g8', to: 'f6', title: 'Indijski razvoj', explanation: 'Crni sprečava 2. e4.' },
      { moveNumber: '2. c4', from: 'c2', to: 'c4', title: 'Širenje prostora', explanation: 'Beli osvaja prostor na daminom krilu.' },
      { moveNumber: '2... e6', from: 'e7', to: 'e6', title: 'Otvaranje lovca', explanation: 'Crni priprema d5 ili Bb4.' },
      { moveNumber: '3. g3', from: 'g2', to: 'g3', title: 'Katalonska ideja', explanation: 'Beli sprema lovca na g2 koji će vršiti ogroman pritisak na damino krilo crnog.' },
      { moveNumber: '3... d5', from: 'd7', to: 'd5', title: 'Učvršćivanje centra', explanation: 'Crni postavlja čvrst centar.' },
      { moveNumber: '4. Bg2', from: 'f1', to: 'g2', title: 'Gospodar dijagonale', explanation: 'Katalonski lovac stupa na scenu i kontroliše ključne tačke na tabli.' }
    ]
  },

  // ===========================================================================
  // II. 10 POZNATIH ODBRANA (CRNI)
  // ===========================================================================
  {
    id: 'sicilian-defense',
    category: 'Odbrana',
    name: 'Sicilijanska odbrana',
    badge: 'B20',
    difficulty: 'Srednji',
    summary: 'Najborbeniji i najpopularniji odgovor crnog na 1. e4. Stvara oštru asimetričnu igru za pobedu.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje belog', explanation: 'Beli zauzima centar.' },
      { moveNumber: '1... c5', from: 'c7', to: 'c5', title: 'Asimetrični udar', explanation: 'Crni krilnim pešakom kontroliše centralno polje d4 i izbegava simetriju.' },
      { moveNumber: '2. Nf3', from: 'g1', to: 'f3', title: 'Priprema prodora', explanation: 'Beli razvija skakača i sprema d4.' },
      { moveNumber: '2... d6', from: 'd7', to: 'd6', title: 'Kontrola polja e5', explanation: 'Crni sprečava belog da gurne e5 i otvara put svom belopoljnom lovcu.' },
      { moveNumber: '3. d4', from: 'd2', to: 'd4', title: 'Otvaranje centra', explanation: 'Beli započinje razmenu u centru.' },
      { moveNumber: '3... cxd4', from: 'c5', to: 'd4', title: 'Strateška razmena', explanation: 'Crni menja bočnog c-pešaka za centralnog d-pešaka belog.' },
      { moveNumber: '4. Nxd4', from: 'f3', to: 'd4', title: 'Otvorena Sicilijanka', explanation: 'Crni sada ima poluotvorenu c-liniju za svoje topove i većinu pešaka u centru.' }
    ]
  },
  {
    id: 'french-defense',
    category: 'Odbrana',
    name: 'Francuska odbrana',
    badge: 'C00',
    difficulty: 'Početnik',
    summary: 'Čvrsta odbrana u kojoj crni gradi jak pešački lanac i priprema kontranapad na centar belog.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje belog', explanation: 'Beli zauzima e4.' },
      { moveNumber: '1... e6', from: 'e7', to: 'e6', title: 'Priprema za d5', explanation: 'Crni priprema napredovanje d-pešaka uz punu podršku.' },
      { moveNumber: '2. d4', from: 'd2', to: 'd4', title: 'Pun centar belog', explanation: 'Beli zauzima oba centralna polja.' },
      { moveNumber: '2... d5', from: 'd7', to: 'd5', title: 'Direktan izazov', explanation: 'Crni odmah napada pešaka na e4 i stvara čvrst oslonac u sredini table.' },
      { moveNumber: '3. Nc3', from: 'b1', to: 'c3', title: 'Odbrana e4', explanation: 'Beli štiti napadnutog pešaka i nastavlja razvoj.' }
    ]
  },
  {
    id: 'caro-kann-defense',
    category: 'Odbrana',
    name: 'Karo-Kan odbrana',
    badge: 'B10',
    difficulty: 'Početnik',
    summary: 'Poznata kao najčvršća odbrana u šahu. Slična Francuskoj, ali belopoljni lovac crnog ostaje slobodan.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje belog', explanation: 'Standardni početak belog.' },
      { moveNumber: '1... c6', from: 'c7', to: 'c6', title: 'Podrška za d5', explanation: 'Crni priprema 2... d5 bez zatvaranja dijagonale svom belopoljnom lovcu.' },
      { moveNumber: '2. d4', from: 'd2', to: 'd4', title: 'Zauzimanje prostora', explanation: 'Beli postavlja dva pešaka u centar.' },
      { moveNumber: '2... d5', from: 'd7', to: 'd5', title: 'Udar u centru', explanation: 'Crni izaziva belog na e4 uz stabilnu pešačku strukturu bez slabosti.' },
      { moveNumber: '3. Nc3', from: 'b1', to: 'c3', title: 'Razvoj i odbrana', explanation: 'Beli čuva e4 i priprema dalji razvoj figura.' }
    ]
  },
  {
    id: 'kings-indian-defense',
    category: 'Odbrana',
    name: 'Kraljeva indijska odbrana',
    badge: 'E60',
    difficulty: 'Srednji',
    summary: 'Dinamična odbrana protiv 1. d4. Crni pušta belog da zauzme centar, a zatim pokreće silovit napad na kralja.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Otvaranje daminim pešakom', explanation: 'Beli zauzima d4.' },
      { moveNumber: '1... Nf6', from: 'g8', to: 'f6', title: 'Kontrola centra skakačem', explanation: 'Crni sprečava 2. e4.' },
      { moveNumber: '2. c4', from: 'c2', to: 'c4', title: 'Prostor na daminom krilu', explanation: 'Beli širi svoj uticaj.' },
      { moveNumber: '2... g6', from: 'g7', to: 'g6', title: 'Priprema fijanketa', explanation: 'Crni otvara put svom tamnopoljnom lovcu.' },
      { moveNumber: '3. Nc3', from: 'b1', to: 'c3', title: 'Razvoj skakača', explanation: 'Beli priprema e4.' },
      { moveNumber: '3... Bg7', from: 'f8', to: 'g7', title: 'Zmaj na dijagonali', explanation: 'Lovac sa g7 deluje kroz ceo centar i priprema brzu rokadu i kontranapad sa e5 ili c5.' }
    ]
  },
  {
    id: 'nimzo-indian-defense',
    category: 'Odbrana',
    name: 'Nimco-indijska odbrana',
    badge: 'E20',
    difficulty: 'Srednji',
    summary: 'Jedna od najcenjenijih odbrana svih vremena. Crni vezuje belog skakača i sprečava izgradnju centra.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Početak belog', explanation: 'Zauzimanje d4.' },
      { moveNumber: '1... Nf6', from: 'g8', to: 'f6', title: 'Razvoj skakača', explanation: 'Kontrola centralnih polja.' },
      { moveNumber: '2. c4', from: 'c2', to: 'c4', title: 'Pritisak na d5', explanation: 'Standardni nastavak belog.' },
      { moveNumber: '2... e6', from: 'e7', to: 'e6', title: 'Otvaranje lovca', explanation: 'Crni oslobađa svog tamnopoljnog lovca.' },
      { moveNumber: '3. Nc3', from: 'b1', to: 'c3', title: 'Pretnja e4', explanation: 'Beli sprema da zauzme ceo centar potezom e4.' },
      { moveNumber: '3... Bb4', from: 'f8', to: 'b4', title: 'Nimcovičevo vezivanje', explanation: 'Lovac vezuje skakača na c3, oduzima mu kontrolu nad poljem e4 i preti da udvoji bele pešake.' }
    ]
  },
  {
    id: 'slav-defense',
    category: 'Odbrana',
    name: 'Slovenska odbrana',
    badge: 'D10',
    difficulty: 'Početnik',
    summary: 'Izuzetno stabilan odgovor na Damin gambit. Crni brani d5 pešakom sa c6 i čuva slobodu svom lovcu sa c8.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Otvaranje belog', explanation: 'Zauzimanje centra.' },
      { moveNumber: '1... d5', from: 'd7', to: 'd5', title: 'Blokada', explanation: 'Crni drži polje d5.' },
      { moveNumber: '2. c4', from: 'c2', to: 'c4', title: 'Damin gambit', explanation: 'Beli napada centar.' },
      { moveNumber: '2... c6', from: 'c7', to: 'c6', title: 'Slovenski bedem', explanation: 'Crni brani pešaka na d5 i ostavlja otvorenu dijagonalu za svog belopoljnog lovca.' },
      { moveNumber: '3. Nf3', from: 'g1', to: 'f3', title: 'Razvoj skakača', explanation: 'Beli mirno razvija figure i sprema e3.' }
    ]
  },
  {
    id: 'scandinavian-defense',
    category: 'Odbrana',
    name: 'Skandinavska odbrana',
    badge: 'B01',
    difficulty: 'Početnik',
    summary: 'Direktan izazov već u prvom potezu! Crni odmah razbija centar belog i otvara linije za svoje figure.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje belog', explanation: 'Beli zauzima e4.' },
      { moveNumber: '1... d5', from: 'd7', to: 'd5', title: 'Skandinavski protivudar', explanation: 'Crni odmah napada belog pešaka i ne dozvoljava mu miran razvoj.' },
      { moveNumber: '2. exd5', from: 'e4', to: 'd5', title: 'Razmena u centru', explanation: 'Beli prihvata izazov.' },
      { moveNumber: '2... Qxd5', from: 'd8', to: 'd5', title: 'Kraljica u centru', explanation: 'Crni odmah vraća pešaka kraljicom.' },
      { moveNumber: '3. Nc3', from: 'b1', to: 'c3', title: 'Napad uz razvoj', explanation: 'Beli dobija tempo napadom na kraljicu, koja se obično povlači na sigurno polje a5.' }
    ]
  },
  {
    id: 'alekhines-defense',
    category: 'Odbrana',
    name: 'Aljehinova odbrana',
    badge: 'B02',
    difficulty: 'Napredni',
    summary: 'Provokativna odbrana svetskog prvaka Aljehina: crni mami bele pešake napred da bi ih kasnije opkolio i srušio.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje belog', explanation: 'Beli zauzima e4.' },
      { moveNumber: '1... Nf6', from: 'g8', to: 'f6', title: 'Provokacija skakačem', explanation: 'Crni napada e4 i izaziva belog pešaka da krene napred.' },
      { moveNumber: '2. e5', from: 'e4', to: 'e5', title: 'Napredovanje u centru', explanation: 'Beli tera skakača i osvaja prostor.' },
      { moveNumber: '2... Nd5', from: 'f6', to: 'd5', title: 'Skakač u sredini', explanation: 'Skakač staje na centralno polje odakle posmatra previše isturene bele pešake.' },
      { moveNumber: '3. d4', from: 'd2', to: 'd4', title: 'Široki centar belog', explanation: 'Beli gradi moćan centar koji će crni sada napadati potezom d6.' }
    ]
  },
  {
    id: 'pirc-defense',
    category: 'Odbrana',
    name: 'Pircova odbrana',
    badge: 'B07',
    difficulty: 'Srednji',
    summary: 'Univerzalni sistem nazvan po slovenačkom velemajstoru Vasji Pircu. Crni gradi elastičnu odbranu sa fijanketom.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje belog', explanation: 'Beli zauzima e4.' },
      { moveNumber: '1... d6', from: 'd7', to: 'd6', title: 'Kontrola polja e5', explanation: 'Crni priprema razvoj skakača na f6 bez straha od 2. e5.' },
      { moveNumber: '2. d4', from: 'd2', to: 'd4', title: 'Pun centar', explanation: 'Beli zauzima oba centralna polja.' },
      { moveNumber: '2... Nf6', from: 'g8', to: 'f6', title: 'Pritisak na e4', explanation: 'Skakač izlazi i odmah napada e4 pešaka.' },
      { moveNumber: '3. Nc3', from: 'b1', to: 'c3', title: 'Zaštita centra', explanation: 'Beli brani pešaka.' },
      { moveNumber: '3... g6', from: 'g7', to: 'g6', title: 'Pircov fijanketo', explanation: 'Crni priprema lovca na g7 i malu rokadu pre nego što udari na beli centar.' }
    ]
  },
  {
    id: 'dutch-defense',
    category: 'Odbrana',
    name: 'Holandska odbrana',
    badge: 'A80',
    difficulty: 'Napredni',
    summary: 'Borbeni odgovor na 1. d4 kojim crni odmah preuzima kontrolu nad poljem e4 i priprema napad na kraljevo krilo.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Otvaranje belog', explanation: 'Zauzimanje d4.' },
      { moveNumber: '1... f5', from: 'f7', to: 'f5', title: 'Kontrola polja e4', explanation: 'Crni bočnim pešakom sprečava belog da lako odigra e4 i najavljuje napad na kraljevom krilu.' },
      { moveNumber: '2. c4', from: 'c2', to: 'c4', title: 'Širenje na daminom krilu', explanation: 'Beli osvaja prostor na suprotnoj strani table.' },
      { moveNumber: '2... Nf6', from: 'g8', to: 'f6', title: 'Pojačanje kontrole na e4', explanation: 'Skakač zajedno sa f-pešakom drži polje e4 pod ključem.' },
      { moveNumber: '3. g3', from: 'g2', to: 'g3', title: 'Fijanketo belog', explanation: 'Beli priprema lovca na g2 kako bi se suprotstavio pritisku crnog.' }
    ]
  },

  // ===========================================================================
  // III. 5 KLJUČNIH ŠAHOVSKIH STRATEGIJA
  // ===========================================================================
  {
    id: 'strategy-seventh-rank-rooks',
    category: 'Strategija',
    name: 'Dupliranje topova na sedmom redu',
    badge: 'Završnica',
    difficulty: 'Početnik',
    summary: 'Jedno od najjačih pravila u šahu: dva udvojena topa na sedmom redu potpuno parališu protivničkog kralja i kupe pešake.',
    initialFen: '2r3k1/pp3ppp/2p5/8/8/2P2P2/PP4PP/2R1R1K1 w - - 0 1',
    steps: [
      { moveNumber: '1. Re7', from: 'e1', to: 'e7', title: 'Prodor na sedmi red', explanation: 'Beli top koristi otvorenu e-liniju da upadne na sedmi red i odmah napadne crne pešake na b7 i f7.' },
      { moveNumber: '1... Rb8', from: 'c8', to: 'b8', title: 'Pasivna odbrana', explanation: 'Crni top je primoran da napusti aktivnu c-liniju kako bi sačuvao pešaka na b7.' },
      { moveNumber: '2. Rd1', from: 'c1', to: 'd1', title: 'Uvođenje drugog topa', explanation: 'Beli zauzima jedinu preostalu otvorenu liniju i priprema udvajanje topova.' },
      { moveNumber: '2... Kf8', from: 'g8', to: 'f8', title: 'Pokušaj proterivanja', explanation: 'Crni kralj prilazi da otera uljeza sa sedmog reda, ali je prekasno.' },
      { moveNumber: '3. Rdd7', from: 'd1', to: 'd7', title: 'Potpuna dominacija', explanation: 'Oba bela topa su na sedmom redu! Crni kralj je odsečen na poslednjoj liniji i padaju mu pešaci jedan za drugim.' }
    ]
  },
  {
    id: 'strategy-isolated-queen-pawn',
    category: 'Strategija',
    name: 'Izolovani damin pešak (IQP)',
    badge: 'Središnjica',
    difficulty: 'Srednji',
    summary: 'Pešak na d4 nema komšije na c i e liniji. U završnici je slabost, ali u središnjici daje ogromnu aktivnost figurama i prostor za napad na kralja.',
    initialFen: 'r2q1rk1/pp2bppp/2n1pn2/8/3P4/3B1N2/PP3PPP/R1BQ1RK1 w - - 0 1',
    steps: [
      { moveNumber: '1. Bg5', from: 'c1', to: 'g5', title: 'Aktivnost lakih figura', explanation: 'Izolovani pešak na d4 otvara linije — beli lovac odmah izlazi na aktivno polje i vezuje crnog skakača.' },
      { moveNumber: '1... Nb4', from: 'c6', to: 'b4', title: 'Strategija crnog: blokada', explanation: 'Crni igra po knjizi: juri belopoljnog lovca i planira da blokira pešaka na polju d5.' },
      { moveNumber: '2. Bb1', from: 'd3', to: 'b1', title: 'Čuvanje napadačkog lovca', explanation: 'Beli povlači lovca na b1 kako bi zadržao nišan na crnog kralja (dijagonala b1–h7).' },
      { moveNumber: '2... Nbd5', from: 'b4', to: 'd5', title: 'Večni bloker na d5', explanation: 'Crni skakač staje tačno ispred izolovanog pešaka — na polju d5 niko ne može da ga napadne pešakom.' },
      { moveNumber: '3. Qd3', from: 'd1', to: 'd3', title: 'Baterija dame i lovca', explanation: 'Beli stvara smrtonosnu bateriju po dijagonali i preti da ukloni skakača sa f6 uz mat na h7.' }
    ]
  },
  {
    id: 'strategy-yugoslav-attack',
    category: 'Strategija',
    name: 'Juriš pešaka na fijanketo rokadu',
    badge: 'Napad',
    difficulty: 'Srednji',
    summary: 'Kada su kraljevi rokirani na suprotnim stranama table, partija postaje trka: ko će prvi pešacima razbiti protivnički zaklon.',
    initialFen: 'r2q1rk1/pp1nppbp/2p3p1/8/3PP3/2N1BP2/PP1Q2PP/2KR1B1R w - - 0 1',
    steps: [
      { moveNumber: '1. Bh6', from: 'e3', to: 'h6', title: 'Uklanjanje glavnog branioca', explanation: 'Lovac na g7 čuva crnog kralja. Beli nudi razmenu kako bi oslabio crna polja oko kralja.' },
      { moveNumber: '1... Bxh6', from: 'g7', to: 'h6', title: 'Razmena lovaca', explanation: 'Crni je prinuđen da prihvati razmenu.' },
      { moveNumber: '2. Qxh6', from: 'd2', to: 'h6', title: 'Kraljica u taboru crnog', explanation: 'Bela kraljica ulazi na h6 i stvara direktnu pretnju prodora.' },
      { moveNumber: '2... Qa5', from: 'd8', to: 'a5', title: 'Kontranapad na drugom krilu', explanation: 'Crni pokreće svoju kontraofanzivu na daminom krilu gde stoji beli kralj.' },
      { moveNumber: '3. h4', from: 'h2', to: 'h4', title: 'Otvaranje h-linije', explanation: 'Klasičan pešački juriš! Beli gura h4–h5 da otvori liniju svom topu sa h1 za matni napad.' }
    ]
  },
  {
    id: 'strategy-king-opposition',
    category: 'Strategija',
    name: 'Opozicija kraljeva u završnici',
    badge: 'Završnica',
    difficulty: 'Početnik',
    summary: 'U pešačkim završnicama kralj postaje najjača napadačka figura. Ko zauzme „opoziciju“ (stane naspram protivničkog kralja), prisiljava ga da se skloni u stranu.',
    initialFen: '8/8/4k3/8/4P3/4K3/8/8 w - - 0 1',
    steps: [
      { moveNumber: '1. Kf4', from: 'e3', to: 'f4', title: 'Kralj ispred pešaka', explanation: 'Greška početnika je odmah gurati pešaka. Kralj mora prvi da krči put!' },
      { moveNumber: '1... Kf6', from: 'e6', to: 'f6', title: 'Crni drži opoziciju', explanation: 'Crni kralj staje tačno naspram belog (jedno polje razmaka) i ne da mu napred.' },
      { moveNumber: '2. e5+', from: 'e4', to: 'e5', title: 'Tempirani šah pešakom', explanation: 'Sada pešak daje šah i tera crnog kralja da napusti odbrambenu liniju.' },
      { moveNumber: '2... Ke6', from: 'f6', to: 'e6', title: 'Blokada ispred pešaka', explanation: 'Crni staje ispred pešaka nadajući se remiju.' },
      { moveNumber: '3. Ke4', from: 'f4', to: 'e4', title: 'Osvajanje opozicije', explanation: 'Beli kralj sada uzima opoziciju! Crni mora da se pomeri levo ili desno, čime pušta belog kralja na d5 ili f5 i pešak prolazi do kraljice.' }
    ]
  },
  {
    id: 'strategy-knight-outpost',
    category: 'Strategija',
    name: 'Večiti skakač (Outpost) u centru',
    badge: 'Poziciona igra',
    difficulty: 'Srednji',
    summary: 'Skakač na centralnom polju koje protivnik ne može da napadne svojim pešacima vredi gotovo koliko i top.',
    initialFen: 'r2q1rk1/pp2bppp/2p1pn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 1',
    steps: [
      { moveNumber: '1. Ne5', from: 'f3', to: 'e5', title: 'Zauzimanje uporišta', explanation: 'Crni je svoje pešake postavio na c6, d5 i e6 — nijedan od njih više nikada ne može da napadne polje e5!' },
      { moveNumber: '1... Nd7', from: 'f6', to: 'd7', title: 'Pokušaj razmene', explanation: 'Crni shvata koliko je skakač na e5 opasan i odmah pokušava da ga zameni.' },
      { moveNumber: '2. f4', from: 'f2', to: 'f4', title: 'Betoniranje centra', explanation: 'Beli podupire skakača pešakom. Ako crni uzme na e5, beli dobija otvorenu f-liniju za topa.' },
      { moveNumber: '2... Nxe5', from: 'd7', to: 'e5', title: 'Prinudna razmena', explanation: 'Crni ipak menja snažnog skakača.' },
      { moveNumber: '3. fxe5', from: 'f4', to: 'e5', title: 'Otvaranje f-linije', explanation: 'Beli pešak tera crnog skakača/lovca, osvaja prostor i otvara put svom topu sa f1 pravo ka crnom kralju.' }
    ]
  },

  // ===========================================================================
  // IV. 5 NAJPOZNATIJIH PARTIJA I KOMBINACIJA U ISTORIJI ŠAHA
  // ===========================================================================
  {
    id: 'game-opera-morphy',
    category: 'Poznata partija',
    name: 'Operna partija (Paul Morphy)',
    badge: 'Pariz 1858.',
    difficulty: 'Srednji',
    summary: 'Najčuvenija edukativna partija svih vremena, odigrana u loži Pariske opere. Pokazuje šta se dešava kada jedan igrač razvije sve figure, a drugi zaostane u razvoju.',
    initialFen: 'rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq - 0 10',
    steps: [
      { moveNumber: '10. Nxb5', from: 'c3', to: 'b5', title: 'Žrtva skakača', explanation: 'Morfi žrtvuje skakača za dva pešaka kako bi otvorio sve linije prema nezaštićenom crnom kralju u centru.' },
      { moveNumber: '10... cxb5', from: 'c6', to: 'b5', title: 'Prihvatanje žrtve', explanation: 'Crni uzima skakača, ali otvara dijagonalu belom lovcu.' },
      { moveNumber: '11. Bxb5+', from: 'c4', to: 'b5', title: 'Šah i vezivanje', explanation: 'Lovac daje šah i vezuje budućeg branioca.' },
      { moveNumber: '11... Nbd7', from: 'b8', to: 'd7', title: 'Blokada šaha', explanation: 'Crni skakač staje ispred kralja i ostaje vezan.' },
      { moveNumber: '12. O-O-O', from: 'e1', to: 'c1', title: 'Velika rokada sa napadom', explanation: 'Savršen potez: kralj ide na sigurno, a top odmah dolazi na d-liniju i pojačava pritisak na vezanog skakača.' },
      { moveNumber: '12... Rd8', from: 'a8', to: 'd8', title: 'Odbrana skakača', explanation: 'Crni top staje u odbranu.' },
      { moveNumber: '13. Rxd7', from: 'd1', to: 'd7', title: 'Žrtva topa!', explanation: 'Morfi žrtvuje celog topa da bi uklonio branioca i uvukao drugog crnog topa u vezivanje.' },
      { moveNumber: '13... Rxd7', from: 'd8', to: 'd7', title: 'Prinudno uzimanje', explanation: 'Crni mora da uzme topa.' },
      { moveNumber: '14. Rd1', from: 'h1', to: 'd1', title: 'Poslednja rezerva ulazi u boj', explanation: 'I poslednji beli top stupa na otvorenu liniju. Svaka bela figura učestvuje u napadu!' },
      { moveNumber: '14... Qe6', from: 'e7', to: 'e6', title: 'Pokušaj odvezivanja', explanation: 'Crna kraljica pokušava da razmeni kraljice i spase kralja.' },
      { moveNumber: '15. Bxd7+', from: 'b5', to: 'd7', title: 'Razaranje odbrane', explanation: 'Lovac uzima topa uz šah.' },
      { moveNumber: '15... Nxd7', from: 'f6', to: 'd7', title: 'Skakač preuzima', explanation: 'Jedini preostali branilac crnog kralja.' },
      { moveNumber: '16. Qb8+!!', from: 'b3', to: 'b8', title: 'Besmrtna žrtva kraljice!', explanation: 'Remek-delo! Morfi žrtvuje kraljicu na polju b8 da bi odvukao skakača sa odbrane polja d8.' },
      { moveNumber: '16... Nxb8', from: 'd7', to: 'b8', title: 'Prinudno uzimanje', explanation: 'Skakač mora da uzme kraljicu.' },
      { moveNumber: '17. Rd8#', from: 'd1', to: 'd8', title: 'Šah-mat!', explanation: 'Top i lovac zadaju mat kralju dok njegove sopstvene figure sa f8 i h8 nemoćno posmatraju.' }
    ]
  },
  {
    id: 'game-legals-mate',
    category: 'Poznata partija',
    name: 'Legalov mat (Žrtva kraljice)',
    badge: 'Pariz 1750.',
    difficulty: 'Početnik',
    summary: 'Jedna od najpoznatijih kombinacija u istoriji: beli namerno ostavlja kraljicu nebranjenu jer je izračunao mat u dva poteza lakim figurama.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Zauzimanje centra', explanation: 'Klasičan početak otvorene partije.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Odgovor crnog', explanation: 'Simetrija u centru.' },
      { moveNumber: '2. Nf3', from: 'g1', to: 'f3', title: 'Razvoj skakača', explanation: 'Napad na e5.' },
      { moveNumber: '2... d6', from: 'd7', to: 'd6', title: 'Filidorova odbrana', explanation: 'Crni čvrsto brani pešaka.' },
      { moveNumber: '3. Bc4', from: 'f1', to: 'c4', title: 'Italijanski lovac', explanation: 'Lovac nišani najslabije polje crnog — f7.' },
      { moveNumber: '3... Bg4', from: 'c8', to: 'g4', title: 'Vezivanje skakača', explanation: 'Crni lovac vezuje skakača za belu kraljicu.' },
      { moveNumber: '4. Nc3', from: 'b1', to: 'c3', title: 'Drugi skakač u igri', explanation: 'Beli mirno razvija sve lake figure.' },
      { moveNumber: '4... g6', from: 'g7', to: 'g6', title: 'Neoprezan potez crnog', explanation: 'Crni želi da razvije lovca na g7, ne primećujući taktiku koja sledi.' },
      { moveNumber: '5. Nxe5!', from: 'f3', to: 'e5', title: 'Lažno vezivanje — žrtva dame!', explanation: 'Beli skakač ignoriše vezivanje i uzima pešaka, ostavljajući kraljicu na d1!' },
      { moveNumber: '5... Bxd1', from: 'g4', to: 'd1', title: 'Crni uzima kraljicu', explanation: 'Crni upada u zamku i uzima kraljicu.' },
      { moveNumber: '6. Bxf7+', from: 'c4', to: 'f7', title: 'Udar na f7!', explanation: 'Lovac uzima na f7 uz šah. Crni kralj ima samo jedno polje.' },
      { moveNumber: '6... Ke7', from: 'e8', to: 'e7', title: 'Jedini potez', explanation: 'Kralj mora na e7.' },
      { moveNumber: '7. Nd5#', from: 'c3', to: 'd5', title: 'Legalov mat!', explanation: 'Tri lake figure (dva skakača i lovac) pletu savršenu matnu mrežu oko kralja u centru!' }
    ]
  },
  {
    id: 'game-greek-gift',
    category: 'Poznata partija',
    name: 'Grčki poklon (Žrtva lovca na h7)',
    badge: 'Klasična kombinacija',
    difficulty: 'Srednji',
    summary: 'Najpoznatiji taktički motiv protiv male rokade: lovac se žrtvuje na h7 kako bi izvukao kralja na čistinu gde ga dočekuju skakač i kraljica.',
    initialFen: 'r1bq1rk1/pppn1ppp/4pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 8',
    steps: [
      { moveNumber: '8. Bxh7+!', from: 'd3', to: 'h7', title: 'Trojanski konj na h7', explanation: 'Beli žrtvuje lovca! Razara pešački štit ispred crnog kralja.' },
      { moveNumber: '8... Kxh7', from: 'g8', to: 'h7', title: 'Prihvatanje poklona', explanation: 'Crni kralj uzima lovca i izlazi na otvoreno polje h7.' },
      { moveNumber: '9. Ng5+', from: 'f3', to: 'g5', title: 'Skakač ulazi uz šah', explanation: 'Skakač skače na g5 sa šahom i otvara put beloj kraljici.' },
      { moveNumber: '9... Kg8', from: 'h7', to: 'g8', title: 'Povlačenje u ugao', explanation: 'Ako kralj krene napred na g6, pada pod još brži udar pešaka i dame.' },
      { moveNumber: '10. Qh5', from: 'd1', to: 'h5', title: 'Neodbranjiva pretnja mata', explanation: 'Kraljica dolazi na h5 i preti neodbranjivim matom na h7 (Qh7#).' }
    ]
  },
  {
    id: 'game-englund-trap',
    category: 'Poznata partija',
    name: 'Zamka Englundovog gambita',
    badge: 'Munjeviti mat',
    difficulty: 'Početnik',
    summary: 'Efektna zamka za crne figure protiv 1. d4: crni mami belog lovca da pokrije dijagonalu, a zatim kraljicom upada u poslednji red.',
    steps: [
      { moveNumber: '1. d4', from: 'd2', to: 'd4', title: 'Otvaranje daminim pešakom', explanation: 'Beli otvara igru na d4.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Englundov gambit', explanation: 'Crni odmah nudi e-pešaka kako bi stvorio oštru taktičku borbu.' },
      { moveNumber: '2. dxe5', from: 'd4', to: 'e5', title: 'Beli uzima pešaka', explanation: 'Prihvatanje gambita.' },
      { moveNumber: '2... Nc6', from: 'b8', to: 'c6', title: 'Napad na e5', explanation: 'Crni razvija skakača.' },
      { moveNumber: '3. Nf3', from: 'g1', to: 'f3', title: 'Odbrana pešaka', explanation: 'Beli čuva osvojeni materijal.' },
      { moveNumber: '3... Qe7', from: 'd8', to: 'e7', title: 'Dvostruki pritisak', explanation: 'Kraljica se pridružuje napadu na e5.' },
      { moveNumber: '4. Bf4', from: 'c1', to: 'f4', title: 'Greška u razvoju', explanation: 'Beli brani pešaka lovcem i ostavlja polje b2 nebranjeno.' },
      { moveNumber: '4... Qb4+', from: 'e7', to: 'b4', title: 'Dvostruki udar (šah!)', explanation: 'Kraljica daje šah i istovremeno napada lovca na f4 i pešaka na b2.' },
      { moveNumber: '5. Bd2', from: 'f4', to: 'd2', title: 'Povlačenje lovca', explanation: 'Beli spasava lovca, misleći da je najgore prošlo.' },
      { moveNumber: '5... Qxb2', from: 'b4', to: 'b2', title: 'Kraljica uzima na b2', explanation: 'Crni uzima pešaka i napada topa na a1.' },
      { moveNumber: '6. Bc3', from: 'd2', to: 'c3', title: 'Prividna odbrana topa', explanation: 'Beli misli da je oterao kraljicu i spasio topa, ali upada u klopku!' },
      { moveNumber: '6... Bb4', from: 'f8', to: 'b4', title: 'Vezivanje lovca!', explanation: 'Lovac vezuje jedinog branioca polja c1.' },
      { moveNumber: '7. Qd2', from: 'd1', to: 'd2', title: 'Poslednji pokušaj odbrane', explanation: 'Beli brani lovca kraljicom.' },
      { moveNumber: '7... Bxc3', from: 'b4', to: 'c3', title: 'Uklanjanje zaštitnika', explanation: 'Crni menja lovce.' },
      { moveNumber: '8. Qxc3', from: 'd2', to: 'c3', title: 'Kraljica napušta prvi red', explanation: 'Bela kraljica mora da uzme nazad i time ostavlja polje c1 prazno.' },
      { moveNumber: '8... Qc1#', from: 'b2', to: 'c1', title: 'Šah-mat u 8 poteza!', explanation: 'Crna kraljica zadaje mat na c1 jer je beli kralj potpuno zatvoren sopstvenim figurama.' }
    ]
  },
  {
    id: 'game-scholars-mate',
    category: 'Poznata partija',
    name: 'Čobanski mat (Scholar’s Mate)',
    badge: 'Klasična zamka',
    difficulty: 'Početnik',
    summary: 'Najpoznatiji brzi mat u šahu. Svaki početnik mora da ga zna — kako da ga izvede, ali još važnije, kako da ga lako odbrani potezom 3... g6 ili 3... Qe7.',
    steps: [
      { moveNumber: '1. e4', from: 'e2', to: 'e4', title: 'Otvaranje dijagonala', explanation: 'Beli otvara put i lovcu i kraljici.' },
      { moveNumber: '1... e5', from: 'e7', to: 'e5', title: 'Odgovor crnog', explanation: 'Standardni potez.' },
      { moveNumber: '2. Qh5', from: 'd1', to: 'h5', title: 'Rani izlazak kraljice', explanation: 'Kraljica napada pešaka na e5 i gleda ka slabom polju f7.' },
      { moveNumber: '2... Nc6', from: 'b8', to: 'c6', title: 'Odbrana e5', explanation: 'Crni pravilno brani pešaka na e5.' },
      { moveNumber: '3. Bc4', from: 'f1', to: 'c4', title: 'Pretnja mata u jednom potezu', explanation: 'Sada i kraljica i lovac napadaju polje f7!' },
      { moveNumber: '3... Nf6??', from: 'g8', to: 'f6', title: 'Kobna greška!', explanation: 'Crni napada kraljicu, ali zaboravlja da odbrani polje f7 (trebalo je odigrati 3... g6!).' },
      { moveNumber: '4. Qxf7#', from: 'h5', to: 'f7', title: 'Šah-mat!', explanation: 'Kraljica uzima na f7 zaštićena lovcem sa c4 — kralj nema gde da pobegne.' }
    ]
  }
];
