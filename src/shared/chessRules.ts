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

const NORMAL_BOARD_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const REVERSED_BOARD_INDICES = [7, 6, 5, 4, 3, 2, 1, 0] as const;

export function get2DBoardOrientation(playerColor: PieceColor, flipped: boolean) {
  const isViewFlipped = flipped ? playerColor === 'w' : playerColor === 'b';
  return {
    isViewFlipped,
    rowIndices: isViewFlipped ? REVERSED_BOARD_INDICES : NORMAL_BOARD_INDICES,
    colIndices: isViewFlipped ? REVERSED_BOARD_INDICES : NORMAL_BOARD_INDICES,
  };
}

export type StockfishPersonaId = 'mentor' | 'roast' | 'rival';
export type StockfishDifficulty = 'easy' | 'medium' | 'hard';
export type MoveQuality = 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface FenBoardPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export interface ParsedUciMove {
  uci: string;
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  fromSquare: string;
  toSquare: string;
  promotion?: PromotionPieceType;
}

export interface StockfishEval {
  whiteCp: number;
  mateIn: number | null;
  bestMoveUci?: string | null;
  depth?: number;
}

const FILE_CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const FEN_PIECE_CHAR: Record<PieceType, string> = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k',
};

const PROMO_CHAR_TO_TYPE: Record<string, PromotionPieceType> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

export function coordsToSquare(r: number, c: number): string {
  if (r < 0 || r > 7 || c < 0 || c > 7) return '';
  return `${FILE_CHARS[c]}${8 - r}`;
}

export function squareToCoords(square: string): { r: number; c: number } | null {
  if (typeof square !== 'string' || square.length < 2) return null;
  const c = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const r = 8 - rank;
  if (c < 0 || c > 7 || r < 0 || r > 7 || Number.isNaN(rank)) return null;
  return { r, c };
}

export function parseUciMove(uci: string): ParsedUciMove | null {
  if (typeof uci !== 'string') return null;
  const clean = uci.trim().toLowerCase();
  if (clean.length < 4 || clean === '(none)') return null;
  const fromSquare = clean.slice(0, 2);
  const toSquare = clean.slice(2, 4);
  const from = squareToCoords(fromSquare);
  const to = squareToCoords(toSquare);
  if (!from || !to) return null;
  const promoChar = clean[4];
  const promotion = promoChar ? PROMO_CHAR_TO_TYPE[promoChar] : undefined;
  return {
    uci: clean,
    fromR: from.r,
    fromC: from.c,
    toR: to.r,
    toC: to.c,
    fromSquare,
    toSquare,
    promotion,
  };
}

export function boardToFen(
  board: (FenBoardPiece | null)[][],
  options: {
    currentTurn: PieceColor;
    enPassantTarget?: { r: number; c: number } | null;
    halfMoveClock?: number;
    moveCount?: number;
  }
): string {
  const rankRows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let rowStr = '';
    for (let c = 0; c < 8; c++) {
      const piece = board[r]?.[c];
      if (!piece) {
        empty += 1;
      } else {
        if (empty > 0) {
          rowStr += String(empty);
          empty = 0;
        }
        const ch = FEN_PIECE_CHAR[piece.type] || 'p';
        rowStr += piece.color === 'w' ? ch.toUpperCase() : ch.toLowerCase();
      }
    }
    if (empty > 0) rowStr += String(empty);
    rankRows.push(rowStr);
  }

  let castling = '';
  const wKing = board[7]?.[4];
  if (wKing && wKing.type === 'king' && wKing.color === 'w' && !wKing.hasMoved) {
    const wKRook = board[7]?.[7];
    const wQRook = board[7]?.[0];
    if (wKRook && wKRook.type === 'rook' && wKRook.color === 'w' && !wKRook.hasMoved) castling += 'K';
    if (wQRook && wQRook.type === 'rook' && wQRook.color === 'w' && !wQRook.hasMoved) castling += 'Q';
  }
  const bKing = board[0]?.[4];
  if (bKing && bKing.type === 'king' && bKing.color === 'b' && !bKing.hasMoved) {
    const bKRook = board[0]?.[7];
    const bQRook = board[0]?.[0];
    if (bKRook && bKRook.type === 'rook' && bKRook.color === 'b' && !bKRook.hasMoved) castling += 'k';
    if (bQRook && bQRook.type === 'rook' && bQRook.color === 'b' && !bQRook.hasMoved) castling += 'q';
  }
  if (!castling) castling = '-';

  const epSq = options.enPassantTarget
    ? coordsToSquare(options.enPassantTarget.r, options.enPassantTarget.c) || '-'
    : '-';

  const halfMove = Math.max(0, Math.floor(options.halfMoveClock ?? 0));
  const fullMove = Math.max(1, Math.floor((options.moveCount ?? 0) / 2) + 1);
  const turn = options.currentTurn === 'b' ? 'b' : 'w';

  return `${rankRows.join('/')} ${turn} ${castling} ${epSq} ${halfMove} ${fullMove}`;
}

export const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FEN_CHAR_TO_TYPE: Record<string, PieceType> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

export function parseFenPosition(fen: string = DEFAULT_START_FEN): ChessRulesState | null {
  if (typeof fen !== 'string' || !fen.trim()) return null;
  const parts = fen.trim().split(/\s+/);
  const placement = parts[0];
  if (!placement) return null;

  const ranks = placement.split('/');
  if (ranks.length !== 8) return null;

  const board: (BoardPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of ranks[r]) {
      if (ch >= '1' && ch <= '8') {
        c += Number(ch);
      } else {
        const lower = ch.toLowerCase();
        const type = FEN_CHAR_TO_TYPE[lower];
        if (!type || c >= 8) return null;
        const color: PieceColor = ch === lower ? 'b' : 'w';
        const isUnmovedPawn = type === 'pawn' && ((color === 'w' && r === 6) || (color === 'b' && r === 1));
        board[r][c] = {
          type,
          color,
          hasMoved: !isUnmovedPawn,
        };
        c += 1;
      }
    }
    if (c !== 8) return null;
  }

  const castlingField = parts[2] || '-';
  if (castlingField.includes('K')) {
    if (board[7][4]?.type === 'king' && board[7][4]?.color === 'w') board[7][4]!.hasMoved = false;
    if (board[7][7]?.type === 'rook' && board[7][7]?.color === 'w') board[7][7]!.hasMoved = false;
  }
  if (castlingField.includes('Q')) {
    if (board[7][4]?.type === 'king' && board[7][4]?.color === 'w') board[7][4]!.hasMoved = false;
    if (board[7][0]?.type === 'rook' && board[7][0]?.color === 'w') board[7][0]!.hasMoved = false;
  }
  if (castlingField.includes('k')) {
    if (board[0][4]?.type === 'king' && board[0][4]?.color === 'b') board[0][4]!.hasMoved = false;
    if (board[0][7]?.type === 'rook' && board[0][7]?.color === 'b') board[0][7]!.hasMoved = false;
  }
  if (castlingField.includes('q')) {
    if (board[0][4]?.type === 'king' && board[0][4]?.color === 'b') board[0][4]!.hasMoved = false;
    if (board[0][0]?.type === 'rook' && board[0][0]?.color === 'b') board[0][0]!.hasMoved = false;
  }

  const turn: PieceColor = parts[1] === 'b' ? 'b' : 'w';
  const epField = parts[3] || '-';
  let enPassantTarget: EnPassantTarget | null = null;
  if (epField !== '-') {
    const epCoords = squareToCoords(epField);
    if (epCoords) {
      const pawnR = turn === 'w' ? epCoords.r + 1 : epCoords.r - 1;
      const enemyColor: PieceColor = turn === 'w' ? 'b' : 'w';
      if (inBounds(pawnR, epCoords.c) && board[pawnR][epCoords.c]?.type === 'pawn' && board[pawnR][epCoords.c]?.color === enemyColor) {
        enPassantTarget = {
          r: epCoords.r,
          c: epCoords.c,
          pawnR,
          pawnC: epCoords.c,
          color: enemyColor,
        };
      }
    }
  }

  const halfMoveParsed = Number.parseInt(parts[4] || '0', 10);
  const fullMoveParsed = Number.parseInt(parts[5] || '1', 10);
  const halfMoveClock = Number.isNaN(halfMoveParsed) ? 0 : Math.max(0, halfMoveParsed);
  const fullMove = Number.isNaN(fullMoveParsed) ? 1 : Math.max(1, fullMoveParsed);
  const moveCount = Math.max(0, (fullMove - 1) * 2 + (turn === 'b' ? 1 : 0));

  const inCheck = isKingInCheck(turn, board);
  const posKey = computePositionKey(board, turn, enPassantTarget);
  const baseState: ChessRulesState = {
    board,
    currentTurn: turn,
    enPassantTarget,
    halfMoveClock,
    positionHistory: [posKey],
    moveCount,
    inCheck,
    isCheckmate: false,
    drawReason: null,
    gameOver: false,
    lastMove: null,
  };

  const nextLegal = getAllLegalMoves(baseState, turn);
  if (nextLegal.length === 0) {
    baseState.gameOver = true;
    if (inCheck) {
      baseState.isCheckmate = true;
    } else {
      baseState.drawReason = 'stalemate';
    }
  }

  return baseState;
}

export function getStockfishEloProfile(
  personaId: StockfishPersonaId | string,
  difficulty: StockfishDifficulty | string
): {
  uciElo: number;
  movetimeMs: number;
  label: string;
} {
  const persona: StockfishPersonaId =
    personaId === 'roast' || personaId === 'rival' ? personaId : 'mentor';
  const diff: StockfishDifficulty =
    difficulty === 'medium' || difficulty === 'hard' ? difficulty : 'easy';

  const table: Record<StockfishPersonaId, Record<StockfishDifficulty, { uciElo: number; movetimeMs: number }>> = {
    mentor: {
      easy: { uciElo: 1320, movetimeMs: 110 },
      medium: { uciElo: 1500, movetimeMs: 150 },
      hard: { uciElo: 1750, movetimeMs: 210 },
    },
    roast: {
      easy: { uciElo: 1400, movetimeMs: 120 },
      medium: { uciElo: 1650, movetimeMs: 160 },
      hard: { uciElo: 1950, movetimeMs: 220 },
    },
    rival: {
      easy: { uciElo: 1550, movetimeMs: 130 },
      medium: { uciElo: 1850, movetimeMs: 180 },
      hard: { uciElo: 2200, movetimeMs: 240 },
    },
  };

  const entry = table[persona][diff];
  return {
    ...entry,
    label: `Elo ${entry.uciElo}`,
  };
}

export function normalizeScoreToWhite(
  scoreType: 'cp' | 'mate',
  rawValue: number,
  sideToMove: PieceColor
): { whiteCp: number; mateIn: number | null } {
  const sign = sideToMove === 'b' ? -1 : 1;
  if (scoreType === 'mate') {
    const mateIn = rawValue * sign;
    const mag = Math.max(1, Math.abs(mateIn));
    const whiteCp = mateIn === 0
      ? (sideToMove === 'w' ? -10000 : 10000)
      : (mateIn > 0 ? 10000 - mag * 10 : -10000 + mag * 10);
    return { whiteCp, mateIn };
  }
  return {
    whiteCp: rawValue * sign,
    mateIn: null,
  };
}

export function evalToDisplay(evalState: StockfishEval): {
  whitePercent: number;
  label: string;
  advantageText: string;
} {
  if (evalState.mateIn !== null) {
    if (evalState.mateIn === 0) {
      const whiteWon = evalState.whiteCp >= 0;
      return {
        whitePercent: whiteWon ? 100 : 0,
        label: 'Mat',
        advantageText: whiteWon ? 'Šah-mat · Beli pobeđuje' : 'Šah-mat · Crni pobeđuje',
      };
    }
    const whiteMates = evalState.mateIn > 0;
    const moves = Math.abs(evalState.mateIn);
    return {
      whitePercent: whiteMates ? 100 : 0,
      label: `${whiteMates ? '' : '-'}M${moves}`,
      advantageText: whiteMates ? `Mat u ${moves} za belog` : `Mat u ${moves} za crnog`,
    };
  }

  const cp = evalState.whiteCp;
  const logistic = 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
  const whitePercent = Math.max(4, Math.min(96, Math.round(logistic * 10) / 10));
  const pawns = cp / 100;
  const absPawns = Math.abs(pawns);
  const label =
    absPawns < 0.05
      ? '0.0'
      : `${pawns > 0 ? '+' : '-'}${absPawns >= 10 ? absPawns.toFixed(0) : absPawns.toFixed(1)}`;

  let advantageText = 'Jednako';
  if (cp >= 150) advantageText = 'Jasna prednost belog';
  else if (cp >= 50) advantageText = 'Blaga prednost belog';
  else if (cp <= -150) advantageText = 'Jasna prednost crnog';
  else if (cp <= -50) advantageText = 'Blaga prednost crnog';

  return { whitePercent, label, advantageText };
}

export function classifyPlayerMoveQuality(
  evalBefore: StockfishEval,
  evalAfter: StockfishEval,
  playerColor: PieceColor
): { quality: MoveQuality; cpLoss: number } {
  const sign = playerColor === 'w' ? 1 : -1;
  const playerBefore = evalBefore.whiteCp * sign;
  const playerAfter = evalAfter.whiteCp * sign;
  const cpLoss = Math.max(0, Math.round(playerBefore - playerAfter));

  // Immediate forced mate against the player or dropping a forced mate of their own
  if (cpLoss >= 200) {
    return { quality: 'blunder', cpLoss };
  }
  if (cpLoss >= 100) {
    return { quality: 'mistake', cpLoss };
  }
  if (cpLoss >= 45) {
    return { quality: 'inaccuracy', cpLoss };
  }
  return { quality: 'good', cpLoss };
}


