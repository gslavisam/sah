export type AcademyPiece = {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'w' | 'b';
  r: number;
  c: number;
  hasMoved?: boolean;
};

export type Puzzle = {
  id: string;
  title: string;
  instruction: string;
  pieces: AcademyPiece[];
  turn: 'w' | 'b';
  solution: { fromR: number; fromC: number; toR: number; toC: number };
  hints: [string, string, string];
  explanation: string;
};

const CORE_PUZZLES: Puzzle[] = [
  {
    id: 'back-rank-queen-mate',
    title: 'Bekstvo je zatvoreno',
    instruction: 'Beli igraju. Daj mat u jednom potezu.',
    turn: 'w',
    pieces: [
      { type: 'king', color: 'w', r: 1, c: 5 },
      { type: 'queen', color: 'w', r: 3, c: 6 },
      { type: 'king', color: 'b', r: 0, c: 7 },
      { type: 'pawn', color: 'b', r: 1, c: 7 }
    ],
    solution: { fromR: 3, fromC: 6, toR: 0, toC: 6 },
    hints: [
      'Crnom kralju su skoro sva polja za beg zatvorena. Potraži šah na g-liniji.',
      'Polje g8 je ključno: beli kralj ga štiti, pa crni kralj ne može tamo da uzme napadača.',
      'Pomeri damu sa g5 na g8. Crni kralj nema bezbedno polje za beg.'
    ],
    explanation:
      'Dama daje šah sa g8. Beli kralj štiti damu, a sopstveni pešak crnog zatvara h7. Kralj ne može da uzme damu niti da pobegne.'
  },
  {
    id: 'queen-captures-g7',
    title: 'Oslobođeno polje',
    instruction: 'Beli igraju. Daj mat u jednom potezu.',
    turn: 'w',
    pieces: [
      { type: 'king', color: 'w', r: 2, c: 5 },
      { type: 'queen', color: 'w', r: 2, c: 6 },
      { type: 'king', color: 'b', r: 0, c: 7 },
      { type: 'pawn', color: 'b', r: 1, c: 6 },
      { type: 'pawn', color: 'b', r: 1, c: 7 }
    ],
    solution: { fromR: 2, fromC: 6, toR: 1, toC: 6 },
    hints: [
      'Crni kralj je sputan sopstvenim pešacima. Pogledaj šta se dešava na g-liniji.',
      'Beli kralj štiti polje g7, pa dama može bezbedno da uzme pešaka tamo.',
      'Dama uzima pešaka na g7. To je šah, a kralj nema polje za beg.'
    ],
    explanation:
      'Dama uzima pešaka na g7 i daje šah kralju na h8. Beli kralj štiti damu, a pešaci crnog zatvaraju h7 i ne mogu da zaustave napad.'
  },
  {
    id: 'queen-b7-corner-mate',
    title: 'Kralj u ćošku',
    instruction: 'Beli igraju. Daj mat u jednom potezu.',
    turn: 'w',
    pieces: [
      { type: 'king', color: 'w', r: 2, c: 2 },
      { type: 'queen', color: 'w', r: 2, c: 1 },
      { type: 'king', color: 'b', r: 0, c: 0 }
    ],
    solution: { fromR: 2, fromC: 1, toR: 1, toC: 1 },
    hints: [
      'Crni kralj je u uglu table. Zatvori mu preostala polja izlaza.',
      'Dama može da napadne dijagonalno iz b7, a beli kralj je dovoljno blizu da je zaštiti.',
      'Pomeri damu sa b6 na b7. Kralj ne može da uzme zaštićenu damu niti da pobegne.'
    ],
    explanation:
      'Dama na b7 daje šah kralju na a8. Ona kontroliše polja a7 i b8, dok je beli kralj štiti na b7, pa je crni kralj matiran.'
  }
];

const squareName = (r: number, c: number) => `${'abcdefgh'[c]}${8 - r}`;

const edgeQueenMates: Puzzle[] = [
  ...[6, 5, 4, 2].map((r): Puzzle => ({
    id: `queen-file-g${8 - r}-mate`,
    title: `Zatvori izlaz · g${8 - r}`,
    instruction: 'Beli igraju. Daj mat u jednom potezu.',
    turn: 'w',
    pieces: [
      { type: 'king', color: 'w', r: 1, c: 5 },
      { type: 'queen', color: 'w', r, c: 6 },
      { type: 'king', color: 'b', r: 0, c: 7 },
      { type: 'pawn', color: 'b', r: 1, c: 7 }
    ],
    solution: { fromR: r, fromC: 6, toR: 0, toC: 6 },
    hints: [
      'Crni kralj je zatvoren u uglu. Traži mat duž g-linije.',
      'Beli kralj pomaže da se pokrije polje za beg; dama može da uđe na g-liniju.',
      `Pomeri damu sa ${squareName(r, 6)} na g8.`
    ],
    explanation: 'Dama daje šah na g8. Beli kralj je štiti, a crni pešak zatvara h7, pa kralj nema bezbedan izlaz.'
  })),
  ...[7, 6, 5, 4, 3].map((r): Puzzle => ({
    id: `queen-b-file-${8 - r}-mate`,
    title: `Mat u drugom uglu · b${8 - r}`,
    instruction: 'Beli igraju. Daj mat u jednom potezu.',
    turn: 'w',
    pieces: [
      { type: 'king', color: 'w', r: 2, c: 2 },
      { type: 'queen', color: 'w', r, c: 1 },
      { type: 'king', color: 'b', r: 0, c: 0 }
    ],
    solution: { fromR: r, fromC: 1, toR: 1, toC: 1 },
    hints: [
      'Crni kralj je u uglu. Zatvori mu polja a7 i b8.',
      'Dama može da da šah po dijagonali, a beli kralj štiti njeno ulazno polje.',
      `Pomeri damu sa ${squareName(r, 1)} na b7.`
    ],
    explanation: 'Dama na b7 daje šah i pokriva a7 i b8. Beli kralj je štiti, pa crni kralj ne može da je uzme.'
  }))
];

export const PUZZLES: Puzzle[] = [...CORE_PUZZLES, ...edgeQueenMates];
