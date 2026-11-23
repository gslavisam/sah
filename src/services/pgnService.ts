import { Chess, type Move } from 'chess.js';
import type { AcademyStep, ChessAcademyLesson } from '../data/chessAcademyLessons.ts';
import { DEFAULT_START_FEN, type PromotionPieceType } from '../shared/chessRules.ts';

export const CUSTOM_PGN_STORAGE_KEY = 'wizard_academy_custom_pgn_lessons_v1';
const MAX_CUSTOM_PGN_LESSONS = 25;
const MAX_PGN_TEXT_CHARS = 250_000;

export interface GameExportMove {
  from: string;
  to: string;
  promotion?: PromotionPieceType | 'q' | 'r' | 'b' | 'n';
}

export interface GameExportSnapshot {
  startingFen?: string;
  currentFen?: string;
  hasIncompleteHistory?: boolean;
  moves: GameExportMove[];
  result?: '1-0' | '0-1' | '1/2-1/2' | '*';
  playerColor?: 'w' | 'b';
  whiteName?: string;
  blackName?: string;
  eventName?: string;
}

const PIECE_NAMES_GENITIVE: Record<string, string> = {
  p: 'pešaka',
  n: 'skakača',
  b: 'lovca',
  r: 'topa',
  q: 'kraljice',
  k: 'kralja',
};

const PIECE_NAMES_NOMINATIVE: Record<string, string> = {
  p: 'Pešak',
  n: 'Skakač',
  b: 'Lovac',
  r: 'Top',
  q: 'Kraljica',
  k: 'Kralj',
};

export function stripPgnCommandTags(rawComment: string): string {
  return rawComment
    .replace(/\[%[a-zA-Z0-9_]+\s+[^\]]*\]/g, '')
    .replace(/\[%[a-zA-Z0-9_]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapChessJsPromotion(promo?: string): PromotionPieceType | undefined {
  if (promo === 'q') return 'queen';
  if (promo === 'r') return 'rook';
  if (promo === 'b') return 'bishop';
  if (promo === 'n') return 'knight';
  return undefined;
}

function toChessJsPromotion(
  promo?: PromotionPieceType | 'q' | 'r' | 'b' | 'n'
): 'q' | 'r' | 'b' | 'n' | undefined {
  if (!promo) return undefined;
  if (promo === 'queen' || promo === 'q') return 'q';
  if (promo === 'rook' || promo === 'r') return 'r';
  if (promo === 'bishop' || promo === 'b') return 'b';
  if (promo === 'knight' || promo === 'n') return 'n';
  return undefined;
}

function buildMoveTitle(move: Move): string {
  if (move.san.includes('#')) return 'Šah-mat!';
  if (move.san.includes('+')) return 'Šah na kralja';
  if (move.isKingsideCastle()) return 'Mala rokada';
  if (move.isQueensideCastle()) return 'Velika rokada';
  if (move.isPromotion()) return 'Promocija pešaka';
  if (move.isCapture()) return 'Uzimanje figure';
  return `Potez ${PIECE_NAMES_GENITIVE[move.piece] || 'figure'}`;
}

function buildFallbackExplanation(move: Move, isFirst: boolean): string {
  const actor = move.color === 'w' ? 'Beli' : 'Crni';
  if (move.isKingsideCastle()) {
    return `${actor} izvodi malu rokadu, sklanja kralja na sigurno i uključuje topa u igru.`;
  }
  if (move.isQueensideCastle()) {
    return `${actor} izvodi veliku rokadu i aktivira daminog topa ka centru.`;
  }
  const pieceLabel = PIECE_NAMES_NOMINATIVE[move.piece] || 'Figura';
  const baseAction = move.isCapture()
    ? `${actor}: ${pieceLabel.toLowerCase()} sa ${move.from} uzima na ${move.to}`
    : `${actor}: ${pieceLabel.toLowerCase()} prelazi sa ${move.from} na ${move.to}`;
  if (move.san.includes('#')) return `${baseAction} — partija je odlučena matom.`;
  if (move.san.includes('+')) return `${baseAction} uz direktan šah.`;
  if (move.isPromotion()) return `${baseAction} i promoviše pešaka.`;
  if (isFirst) return `${baseAction}, otvarajući poziciju iz ove PGN partije.`;
  return `${baseAction}.`;
}

function loadSingleGameFromPgn(pgnText: string): Chess {
  const trimmed = pgnText.trim();
  if (!trimmed) {
    throw new Error('Unesi ili izaberi PGN partiju pre uvoza.');
  }
  if (trimmed.length > MAX_PGN_TEXT_CHARS) {
    throw new Error('PGN tekst je prevelik za jedan uvoz (maksimum 250 KB).');
  }

  const chess = new Chess();
  try {
    chess.loadPgn(trimmed, { strict: false });
    if (chess.history().length > 0) return chess;
  } catch {
    // Fallback below: try splitting multi-game PGN archives on Event header boundaries
  }

  const blocks = trimmed
    .split(/\r?\n\r?\n(?=\[Event\s)/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const candidate = new Chess();
    try {
      candidate.loadPgn(block, { strict: false });
      if (candidate.history().length > 0) return candidate;
    } catch {
      // Try next block
    }
  }

  throw new Error('Neispravan PGN zapis ili nedostaju potezi. Proveri format i pokušaj ponovo.');
}

export function parsePgnToLesson(pgnText: string): ChessAcademyLesson {
  const chess = loadSingleGameFromPgn(pgnText);
  const headers = chess.getHeaders();

  const rawFen = headers.FEN?.trim();
  let initialFen: string | undefined;
  if (rawFen) {
    try {
      const fenCheck = new Chess(rawFen);
      initialFen = fenCheck.fen();
    } catch {
      throw new Error('Početni FEN u PGN zaglavlju nije ispravan.');
    }
  }

  const cleanTag = (val?: string) => {
    const trimmed = val?.trim();
    if (!trimmed || trimmed === '?' || trimmed === '????.??.??') return '';
    return trimmed;
  };
  const white = cleanTag(headers.White) || 'Beli';
  const black = cleanTag(headers.Black) || 'Crni';
  const whiteElo = cleanTag(headers.WhiteElo);
  const blackElo = cleanTag(headers.BlackElo);
  const event = cleanTag(headers.Event) || 'Uvezena PGN partija';
  const site = cleanTag(headers.Site);
  const fullDate = cleanTag(headers.Date);
  const rawDate = fullDate ? fullDate.split('.')[0] : '';
  const year = rawDate && !rawDate.includes('?') ? rawDate : '';
  const eco = cleanTag(headers.ECO);
  const openingFromEcoUrl = (() => {
    const rawUrl = cleanTag(headers.ECOUrl);
    if (!rawUrl) return '';
    const slug = rawUrl.split('/').filter(Boolean).pop() || '';
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  })();
  const openingName = [cleanTag(headers.Opening) || openingFromEcoUrl, cleanTag(headers.Variation)]
    .filter(Boolean)
    .join(': ');
  const result = headers.Result && headers.Result !== '*' ? headers.Result.trim() : '';

  const commentsMap = new Map<string, string>();
  for (const entry of chess.getComments()) {
    const cleaned = stripPgnCommandTags(entry.comment);
    if (cleaned) {
      commentsMap.set(entry.fen, cleaned);
    }
  }

  const verboseMoves = chess.history({ verbose: true });
  if (verboseMoves.length === 0) {
    throw new Error('PGN ne sadrži nijedan legalan potez za prikaz na tabli.');
  }

  const replay = initialFen ? new Chess(initialFen) : new Chess();
  const steps: AcademyStep[] = verboseMoves.map((move, idx) => {
    const moveNumberValue = replay.moveNumber();
    const turnBefore = replay.turn();
    const applied = replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    const afterFen = replay.fen();
    const moveNumber =
      turnBefore === 'w'
        ? `${moveNumberValue}. ${applied.san}`
        : `${moveNumberValue}... ${applied.san}`;
    const comment = commentsMap.get(afterFen) || commentsMap.get(move.after) || '';

    return {
      moveNumber,
      from: move.from,
      to: move.to,
      promotion: mapChessJsPromotion(move.promotion),
      title: buildMoveTitle(applied),
      explanation: comment || buildFallbackExplanation(applied, idx === 0),
    };
  });

  const hasNamedPlayers = white !== 'Beli' || black !== 'Crni';
  const rawName = hasNamedPlayers ? `${white} – ${black}` : event;
  const name = rawName.length > 64 ? `${rawName.slice(0, 61)}...` : rawName;
  const badge = eco || year || 'PGN';
  const summaryParts = [event];
  if (year) summaryParts.push(`(${year})`);
  if (result) summaryParts.push(`· Rezultat: ${result}`);
  summaryParts.push(`· ${steps.length} poteza`);

  return {
    id: `custom-pgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: 'Uvezene',
    name,
    badge,
    difficulty: 'Srednji',
    summary: summaryParts.join(' '),
    initialFen,
    steps,
    isCustom: true,
    createdAt: Date.now(),
    gameInfo: {
      white: white !== 'Beli' ? white : undefined,
      black: black !== 'Crni' ? black : undefined,
      whiteElo: whiteElo || undefined,
      blackElo: blackElo || undefined,
      event: event !== 'Uvezena PGN partija' ? event : undefined,
      site: site && !site.startsWith('http') ? site : undefined,
      date: fullDate || year || undefined,
      result: result || undefined,
      eco: eco || undefined,
      opening: openingName || undefined,
    },
  };
}

export function reconstructLessonFen(lesson: ChessAcademyLesson, stepIndex: number): string {
  const startFen = lesson.initialFen || DEFAULT_START_FEN;
  try {
    const chess = new Chess(startFen);
    const limit = Math.max(0, Math.min(stepIndex, lesson.steps.length));
    for (let i = 0; i < limit; i += 1) {
      const step = lesson.steps[i];
      chess.move({
        from: step.from,
        to: step.to,
        promotion: toChessJsPromotion(step.promotion),
      });
    }
    return chess.fen();
  } catch {
    return startFen;
  }
}

function formatPgnDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function exportMovesToPgn(snapshot: GameExportSnapshot): string {
  const useCurrentFenOnly = Boolean(snapshot.hasIncompleteHistory && snapshot.currentFen);
  const baseFen = useCurrentFenOnly
    ? snapshot.currentFen!
    : snapshot.startingFen && snapshot.startingFen !== DEFAULT_START_FEN
      ? snapshot.startingFen
      : DEFAULT_START_FEN;

  const chess = baseFen === DEFAULT_START_FEN ? new Chess() : new Chess(baseFen);

  if (!useCurrentFenOnly) {
    for (const move of snapshot.moves) {
      try {
        chess.move({
          from: move.from,
          to: move.to,
          promotion: toChessJsPromotion(move.promotion),
        });
      } catch {
        break;
      }
    }
  }

  chess.setHeader('Event', snapshot.eventName || 'Wizard Chess 3D Partija');
  chess.setHeader('Site', 'Wizard Chess 3D');
  chess.setHeader('Date', formatPgnDate());
  chess.setHeader('Round', '-');
  chess.setHeader('White', snapshot.whiteName || 'Beli');
  chess.setHeader('Black', snapshot.blackName || 'Crni');
  chess.setHeader('Result', snapshot.result || '*');

  if (baseFen !== DEFAULT_START_FEN) {
    chess.setHeader('SetUp', '1');
    chess.setHeader('FEN', baseFen);
  }

  return chess.pgn();
}

export function downloadPgnFile(pgnText: string, filename?: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const safeName =
    filename || `wizard-chess-${new Date().toISOString().slice(0, 10)}.pgn`;
  const blob = new Blob([pgnText], { type: 'application/x-chess-pgn;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return true;
}

function isValidCustomLesson(item: unknown): item is ChessAcademyLesson {
  if (!item || typeof item !== 'object') return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    record.category === 'Uvezene' &&
    typeof record.name === 'string' &&
    typeof record.badge === 'string' &&
    typeof record.summary === 'string' &&
    Array.isArray(record.steps) &&
    record.steps.length > 0
  );
}

export function loadCustomPgnLessons(): ChessAcademyLesson[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PGN_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCustomLesson).map((lesson) => ({
      ...lesson,
      isCustom: true,
    }));
  } catch (error) {
    console.warn('Could not load custom PGN lessons from localStorage.', error);
    return [];
  }
}

export function persistCustomPgnLessons(lessons: ChessAcademyLesson[]): boolean {
  try {
    const trimmed = lessons.slice(0, MAX_CUSTOM_PGN_LESSONS);
    localStorage.setItem(CUSTOM_PGN_STORAGE_KEY, JSON.stringify(trimmed));
    return true;
  } catch (error) {
    console.warn('Could not save custom PGN lessons to localStorage.', error);
    return false;
  }
}
