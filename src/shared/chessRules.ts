export type PieceColor = 'w' | 'b';
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PromotionPieceType = 'queen' | 'rook' | 'bishop' | 'knight';
export type DrawReason = 'stalemate' | 'fifty-move' | 'repetition' | null;

export interface BoardPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
}

export interface EnPassantTarget {
  r: number;
  c: number;
  pawnR: number;
  pawnC: number;
  color: PieceColor;
}

export interface LegalMove {
  r: number;
  c: number;
  capture?: boolean;
  enPassant?: boolean;
  capturedR?: number;
  capturedC?: number;
  castle?: 'k' | 'q';
  rookFromC?: number;
  rookToC?: number;
}

export interface AppliedMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  color: PieceColor;
  pieceType: PieceType;
  fromSquare: string;
  toSquare: string;
  capture: boolean;
  enPassant: boolean;
  castle?: 'k' | 'q';
  promotion?: PromotionPieceType;
}

export interface ChessRulesState {
  board: (BoardPiece | null)[][];
  currentTurn: PieceColor;
  enPassantTarget: EnPassantTarget | null;
  halfMoveClock: number;
  positionHistory: string[];
  moveCount: number;
  inCheck: boolean;
  isCheckmate: boolean;
  drawReason: DrawReason;
  gameOver: boolean;
  lastMove: AppliedMove | null;
}

export const PROMOTION_TYPES: PromotionPieceType[] = ['queen', 'rook', 'bishop', 'knight'];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: (BoardPiece | null)[][]): (BoardPiece | null)[][] {
  return board.map((row) =>
    row.map((cell) => (cell ? { type: cell.type, color: cell.color, hasMoved: cell.hasMoved } : null))
  );
}

export function serializeBoard(board: (BoardPiece | null)[][]): (BoardPiece | null)[][] {
  return cloneBoard(board);
}

function isSquareAttacked(
  r: number,
  c: number,
  attackerColor: PieceColor,
  board: (BoardPiece | null)[][]
): boolean {
  const pawnDir = attackerColor === 'w' ? -1 : 1;
  const pawnRow = r - pawnDir;
  if (inBounds(pawnRow, c - 1)) {
    const p = board[pawnRow][c - 1];
    if (p && p.color === attackerColor && p.type === 'pawn') return true;
  }
  if (inBounds(pawnRow, c + 1)) {
    const p = board[pawnRow][c + 1];
    if (p && p.color === attackerColor && p.type === 'pawn') return true;
  }

  const knightOffsets: [number, number][] = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === attackerColor && p.type === 'knight') return true;
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === attackerColor && p.type === 'king') return true;
      }
    }
  }

  const straightDirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of straightDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'rook' || p.type === 'queen')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  const diagDirs: [number, number][] = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diagDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'bishop' || p.type === 'queen')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

export function isKingInCheck(color: PieceColor, board: (BoardPiece | null)[][]): boolean {
  let kr = -1;
  let kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'king') {
        kr = r;
        kc = c;
        break;
      }
    }
    if (kr !== -1) break;
  }
  if (kr === -1) return false;
  return isSquareAttacked(kr, kc, color === 'w' ? 'b' : 'w', board);
}

function getPseudoMoves(
  r: number,
  c: number,
  board: (BoardPiece | null)[][],
  epTarget: EnPassantTarget | null
): LegalMove[] {
  const piece = board[r]?.[c];
  if (!piece) return [];

  const moves: LegalMove[] = [];
  const color = piece.color;
  const enemy: PieceColor = color === 'w' ? 'b' : 'w';

  if (piece.type === 'pawn') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !board[r + dir * 2][c]) {
        moves.push({ r: r + dir * 2, c });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] && board[nr][nc]!.color === enemy) {
        moves.push({ r: nr, c: nc, capture: true });
      } else if (
        epTarget &&
        epTarget.r === nr &&
        epTarget.c === nc &&
        epTarget.color === enemy &&
        board[r][nc]?.type === 'pawn' &&
        board[r][nc]?.color === enemy
      ) {
        moves.push({
          r: nr,
          c: nc,
          capture: true,
          enPassant: true,
          capturedR: r,
          capturedC: nc,
        });
      }
    }
  } else if (piece.type === 'knight') {
    const offsets: [number, number][] = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (!target) moves.push({ r: nr, c: nc });
      else if (target.color === enemy) moves.push({ r: nr, c: nc, capture: true });
    }
  } else if (piece.type === 'bishop' || piece.type === 'rook' || piece.type === 'queen') {
    const dirs: [number, number][] = [];
    if (piece.type === 'bishop' || piece.type === 'queen') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === 'rook' || piece.type === 'queen') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (target.color === enemy) moves.push({ r: nr, c: nc, capture: true });
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  } else if (piece.type === 'king') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (!target) moves.push({ r: nr, c: nc });
        else if (target.color === enemy) moves.push({ r: nr, c: nc, capture: true });
      }
    }
    const homeRow = color === 'w' ? 7 : 0;
    if (!piece.hasMoved && r === homeRow && c === 4 && !isKingInCheck(color, board)) {
      const kRook = board[homeRow][7];
      if (
        kRook &&
        kRook.color === color &&
        kRook.type === 'rook' &&
        !kRook.hasMoved &&
        !board[homeRow][5] &&
        !board[homeRow][6] &&
        !isSquareAttacked(homeRow, 5, enemy, board) &&
        !isSquareAttacked(homeRow, 6, enemy, board)
      ) {
        moves.push({ r: homeRow, c: 6, castle: 'k', rookFromC: 7, rookToC: 5 });
      }
      const qRook = board[homeRow][0];
      if (
        qRook &&
        qRook.color === color &&
        qRook.type === 'rook' &&
        !qRook.hasMoved &&
        !board[homeRow][1] &&
        !board[homeRow][2] &&
        !board[homeRow][3] &&
        !isSquareAttacked(homeRow, 3, enemy, board) &&
        !isSquareAttacked(homeRow, 2, enemy, board)
      ) {
        moves.push({ r: homeRow, c: 2, castle: 'q', rookFromC: 0, rookToC: 3 });
      }
    }
  }

  return moves;
}

function getLegalMovesOnBoard(
  r: number,
  c: number,
  board: (BoardPiece | null)[][],
  epTarget: EnPassantTarget | null
): LegalMove[] {
  const piece = board[r]?.[c];
  if (!piece) return [];

  const pseudo = getPseudoMoves(r, c, board, epTarget);
  const legal: LegalMove[] = [];

  for (const m of pseudo) {
    const sim = cloneBoard(board);
    sim[m.r][m.c] = sim[r][c];
    sim[r][c] = null;
    if (m.enPassant && typeof m.capturedR === 'number' && typeof m.capturedC === 'number') {
      sim[m.capturedR][m.capturedC] = null;
    }
    if (m.castle && typeof m.rookFromC === 'number' && typeof m.rookToC === 'number') {
      sim[r][m.rookToC] = sim[r][m.rookFromC];
      sim[r][m.rookFromC] = null;
    }
    if (!isKingInCheck(piece.color, sim)) {
      legal.push(m);
    }
  }

  return legal;
}

export function getLegalMovesForSquare(state: ChessRulesState, r: number, c: number): LegalMove[] {
  if (state.gameOver) return [];
  const piece = state.board[r]?.[c];
  if (!piece || piece.color !== state.currentTurn) return [];
  return getLegalMovesOnBoard(r, c, state.board, state.enPassantTarget);
}

export function getAllLegalMoves(
  state: ChessRulesState,
  color: PieceColor = state.currentTurn
): (LegalMove & { fromR: number; fromC: number })[] {
  const all: (LegalMove & { fromR: number; fromC: number })[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) {
        const moves = getLegalMovesOnBoard(r, c, state.board, state.enPassantTarget);
        for (const m of moves) {
          all.push({ fromR: r, fromC: c, ...m });
        }
      }
    }
  }
  return all;
}

function getCastlingRightsKey(board: (BoardPiece | null)[][]): string {
  let rights = '';
  const wK = board[7][4];
  if (wK?.type === 'king' && wK.color === 'w' && !wK.hasMoved) {
    if (board[7][7]?.type === 'rook' && board[7][7]?.color === 'w' && !board[7][7]?.hasMoved) rights += 'K';
    if (board[7][0]?.type === 'rook' && board[7][0]?.color === 'w' && !board[7][0]?.hasMoved) rights += 'Q';
  }
  const bK = board[0][4];
  if (bK?.type === 'king' && bK.color === 'b' && !bK.hasMoved) {
    if (board[0][7]?.type === 'rook' && board[0][7]?.color === 'b' && !board[0][7]?.hasMoved) rights += 'k';
    if (board[0][0]?.type === 'rook' && board[0][0]?.color === 'b' && !board[0][0]?.hasMoved) rights += 'q';
  }
  return rights || '-';
}

export function computePositionKey(
  board: (BoardPiece | null)[][],
  turn: PieceColor,
  epTarget: EnPassantTarget | null
): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let rowStr = '';
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      rowStr += p ? `${p.color}${p.type[0]}` : '.';
    }
    rows.push(rowStr);
  }
  const epKey = epTarget ? `${epTarget.r},${epTarget.c}` : '-';
  return `${rows.join('/')}|${turn}|${getCastlingRightsKey(board)}|${epKey}`;
}

export function createInitialChessState(): ChessRulesState {
  const board: (BoardPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: 'b', hasMoved: false };
    board[1][c] = { type: 'pawn', color: 'b', hasMoved: false };
    board[6][c] = { type: 'pawn', color: 'w', hasMoved: false };
    board[7][c] = { type: backRow[c], color: 'w', hasMoved: false };
  }

  return {
    board,
    currentTurn: 'w',
    enPassantTarget: null,
    halfMoveClock: 0,
    positionHistory: [computePositionKey(board, 'w', null)],
    moveCount: 0,
    inCheck: false,
    isCheckmate: false,
    drawReason: null,
    gameOver: false,
    lastMove: null,
  };
}

export function applyChessMove(
  state: ChessRulesState,
  fromR: number,
  fromC: number,
  toR: number,
  toC: number,
  promotion?: PromotionPieceType
): { ok: true; move: AppliedMove; state: ChessRulesState } | { ok: false; error: string } {
  if (state.gameOver) {
    return { ok: false, error: 'Partija je već završena.' };
  }

  const piece = state.board[fromR]?.[fromC];
  if (!piece || piece.color !== state.currentTurn) {
    return { ok: false, error: 'Nije tvoj potez ili polje nema tvoju figuru.' };
  }

  const legalMoves = getLegalMovesOnBoard(fromR, fromC, state.board, state.enPassantTarget);
  const matched = legalMoves.find((m) => m.r === toR && m.c === toC);
  if (!matched) {
    return { ok: false, error: 'Nedozvoljen šahovski potez.' };
  }

  const nextBoard = cloneBoard(state.board);
  const moving = nextBoard[fromR][fromC]!;
  const isPromotion = moving.type === 'pawn' && (toR === 0 || toR === 7);
  const promoType: PromotionPieceType | undefined = isPromotion
    ? promotion && PROMOTION_TYPES.includes(promotion)
      ? promotion
      : 'queen'
    : undefined;

  const isEnPassant = Boolean(matched.enPassant);
  const destTarget = nextBoard[toR][toC];
  const epTargetPiece =
    isEnPassant && typeof matched.capturedR === 'number' && typeof matched.capturedC === 'number'
      ? nextBoard[matched.capturedR][matched.capturedC]
      : null;
  const isCapture = Boolean(destTarget || epTargetPiece);

  const nextEnPassantTarget: EnPassantTarget | null =
    moving.type === 'pawn' && Math.abs(toR - fromR) === 2
      ? {
          r: (fromR + toR) / 2,
          c: fromC,
          pawnR: toR,
          pawnC: toC,
          color: moving.color,
        }
      : null;

  const originalType = moving.type;
  moving.hasMoved = true;
  if (promoType) {
    moving.type = promoType;
  }

  nextBoard[toR][toC] = moving;
  nextBoard[fromR][fromC] = null;

  if (isEnPassant && typeof matched.capturedR === 'number' && typeof matched.capturedC === 'number') {
    nextBoard[matched.capturedR][matched.capturedC] = null;
  }

  if (matched.castle && typeof matched.rookFromC === 'number' && typeof matched.rookToC === 'number') {
    const rook = nextBoard[fromR][matched.rookFromC];
    if (rook) {
      rook.hasMoved = true;
      nextBoard[fromR][matched.rookToC] = rook;
      nextBoard[fromR][matched.rookFromC] = null;
    }
  }

  const nextTurn: PieceColor = state.currentTurn === 'w' ? 'b' : 'w';
  const nextHalfMoveClock = originalType === 'pawn' || isCapture ? 0 : state.halfMoveClock + 1;
  const nextPosKey = computePositionKey(nextBoard, nextTurn, nextEnPassantTarget);
  const nextHistory = [...state.positionHistory, nextPosKey];

  const nextInCheck = isKingInCheck(nextTurn, nextBoard);
  const tempState: ChessRulesState = {
    board: nextBoard,
    currentTurn: nextTurn,
    enPassantTarget: nextEnPassantTarget,
    halfMoveClock: nextHalfMoveClock,
    positionHistory: nextHistory,
    moveCount: state.moveCount + 1,
    inCheck: nextInCheck,
    isCheckmate: false,
    drawReason: null,
    gameOver: false,
    lastMove: null,
  };

  const nextLegal = getAllLegalMoves(tempState, nextTurn);
  let drawReason: DrawReason = null;
  let isCheckmate = false;
  let gameOver = false;

  if (nextLegal.length === 0) {
    gameOver = true;
    if (nextInCheck) {
      isCheckmate = true;
    } else {
      drawReason = 'stalemate';
    }
  } else {
    const reps = nextHistory.reduce((acc, k) => (k === nextPosKey ? acc + 1 : acc), 0);
    if (reps >= 3) {
      drawReason = 'repetition';
      gameOver = true;
    } else if (nextHalfMoveClock >= 100) {
      drawReason = 'fifty-move';
      gameOver = true;
    }
  }

  const fileChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const appliedMove: AppliedMove = {
    fromR,
    fromC,
    toR,
    toC,
    color: moving.color,
    pieceType: originalType,
    fromSquare: `${fileChars[fromC] || '?'}${8 - fromR}`,
    toSquare: `${fileChars[toC] || '?'}${8 - toR}`,
    capture: isCapture,
    enPassant: isEnPassant,
    castle: matched.castle,
    promotion: promoType,
  };

  const nextState: ChessRulesState = {
    ...tempState,
    isCheckmate,
    drawReason,
    gameOver,
    lastMove: appliedMove,
  };

  return { ok: true, move: appliedMove, state: nextState };
}
