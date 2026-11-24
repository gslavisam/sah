import { Chess } from 'chess.js';
import {
  CURATED_MULTI_MOVE_PUZZLES,
  type TacticPuzzle,
  type TacticThemeId,
} from '../data/tacticsArenaCatalog.ts';

const LICHESS_DAILY_PUZZLE_ENDPOINT = 'https://lichess.org/api/puzzle/daily';
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const MAX_CACHE_ENTRIES = 14;

export interface LichessDailyPuzzleApiResponse {
  game?: {
    id?: string;
    pgn?: string;
  };
  puzzle?: {
    id?: string;
    rating?: number;
    plays?: number;
    initialPly?: number;
    solution?: string[];
    themes?: string[];
  };
}

export interface DailyLichessPuzzleResult {
  status: 'ready' | 'rate-limited' | 'offline';
  dateKey: string;
  puzzle: TacticPuzzle;
  plays?: number;
  rawThemes?: string[];
}

const dailyCache = new Map<string, DailyLichessPuzzleResult>();
let rateLimitedUntilMs = 0;

const PIECE_GENITIVE_SR: Record<string, string> = {
  p: 'pešakom',
  n: 'skakačem',
  b: 'lovcem',
  r: 'topom',
  q: 'damom',
  k: 'kraljem',
};

const LICHESS_THEME_MAP: Record<string, { id: TacticThemeId; sr: string }> = {
  mateIn1: { id: 'mate1', sr: 'Mat u 1 potezu' },
  mateIn2: { id: 'mate2', sr: 'Mat u 2 poteza' },
  mateIn3: { id: 'mate3', sr: 'Mat u 3 poteza' },
  fork: { id: 'fork', sr: 'Viljuška' },
  pin: { id: 'pin', sr: 'Vezivanje' },
  skewer: { id: 'skewer', sr: 'Ražanj' },
  discoveredAttack: { id: 'discovered', sr: 'Otkriveni napad' },
  sacrifice: { id: 'sacrifice', sr: 'Žrtva' },
  deflection: { id: 'sacrifice', sr: 'Odvlačenje branioca' },
  attraction: { id: 'sacrifice', sr: 'Navlačenje figure' },
  backRankMate: { id: 'mate2', sr: 'Mat na poslednjem redu' },
  smotheredMate: { id: 'mate2', sr: 'Gušeni mat' },
  crushing: { id: 'sacrifice', sr: 'Odlučujući napad' },
  advantage: { id: 'fork', sr: 'Osvajanje prednosti' },
  short: { id: 'mate2', sr: 'Kratka kombinacija' },
  long: { id: 'mate3', sr: 'Duboka kombinacija' },
};

export function getUtcDateKey(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function getDeterministicFallbackDailyPuzzle(nowMs = Date.now()): TacticPuzzle {
  const daySeed = Math.floor(nowMs / 86_400_000);
  const idx = Math.abs(daySeed) % CURATED_MULTI_MOVE_PUZZLES.length;
  const base = CURATED_MULTI_MOVE_PUZZLES[idx];
  return {
    ...base,
    id: `daily-fallback-${getUtcDateKey(nowMs)}-${base.id}`,
    title: `Dnevni izazov · ${base.title}`,
    themes: Array.from(new Set<TacticThemeId>(['daily', ...base.themes])),
    source: 'lichess-daily',
  };
}

function setCachedDaily(dateKey: string, result: DailyLichessPuzzleResult) {
  if (dailyCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = dailyCache.keys().next().value;
    if (oldestKey !== undefined) {
      dailyCache.delete(oldestKey);
    }
  }
  dailyCache.set(dateKey, result);
}

export function clearDailyLichessPuzzleCache() {
  dailyCache.clear();
  rateLimitedUntilMs = 0;
}

function replayAndVerifySolution(
  pgn: string,
  initialPly: number,
  solutionUci: string[]
): { fen: string; turn: 'w' | 'b'; triggerMoveUci?: string; firstPieceType?: string } | null {
  if (!pgn.trim() || solutionUci.length === 0) return null;

  const gameChess = new Chess();
  try {
    gameChess.loadPgn(pgn, { strict: false });
  } catch {
    return null;
  }

  const history = gameChess.history({ verbose: true });
  if (history.length === 0) return null;

  // Lichess daily puzzle PGN ends around initialPly / initialPly + 1.
  // Test exact ply candidates and accept the first position where every solution UCI move is legal.
  const plyCandidates = Array.from(
    new Set([initialPly + 1, initialPly, history.length].filter((p) => p >= 0 && p <= history.length))
  );

  for (const targetPly of plyCandidates) {
    const probe = new Chess();
    let triggerMoveUci: string | undefined;
    for (let i = 0; i < targetPly; i += 1) {
      const histMove = history[i];
      const moved = probe.move({
        from: histMove.from,
        to: histMove.to,
        promotion: histMove.promotion,
      });
      if (i === targetPly - 1 && moved) {
        triggerMoveUci = `${moved.from}${moved.to}${moved.promotion || ''}`;
      }
    }

    const startFen = probe.fen();
    const startTurn = probe.turn();
    let allLegal = true;
    let firstPieceType: string | undefined;

    for (let j = 0; j < solutionUci.length; j += 1) {
      const uci = solutionUci[j].trim().toLowerCase();
      if (uci.length < 4) {
        allLegal = false;
        break;
      }
      try {
        const moved = probe.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] as 'q' | 'r' | 'b' | 'n' | undefined,
        });
        if (!moved) {
          allLegal = false;
          break;
        }
        if (j === 0) {
          firstPieceType = moved.piece;
        }
      } catch {
        allLegal = false;
        break;
      }
    }

    if (allLegal) {
      return {
        fen: startFen,
        turn: startTurn,
        triggerMoveUci,
        firstPieceType,
      };
    }
  }

  return null;
}

export function parseLichessDailyPuzzleResponse(
  data: LichessDailyPuzzleApiResponse,
  dateKey: string
): DailyLichessPuzzleResult | null {
  const pgn = data?.game?.pgn;
  const puzzleData = data?.puzzle;
  if (!pgn || !puzzleData || !Array.isArray(puzzleData.solution) || puzzleData.solution.length === 0) {
    return null;
  }

  const initialPly = Number.isFinite(puzzleData.initialPly) ? Number(puzzleData.initialPly) : 0;
  const cleanSolution = puzzleData.solution
    .map((m) => String(m || '').trim().toLowerCase())
    .filter((m) => m.length >= 4);

  if (cleanSolution.length === 0) return null;

  const verified = replayAndVerifySolution(pgn, initialPly, cleanSolution);
  if (!verified) return null;

  const rawThemes = Array.isArray(puzzleData.themes) ? puzzleData.themes.map(String) : [];
  const mappedThemes: TacticThemeId[] = ['daily'];
  const srLabels: string[] = [];

  for (const rawTheme of rawThemes) {
    const mapped = LICHESS_THEME_MAP[rawTheme];
    if (mapped) {
      if (!mappedThemes.includes(mapped.id)) {
        mappedThemes.push(mapped.id);
      }
      if (!srLabels.includes(mapped.sr)) {
        srLabels.push(mapped.sr);
      }
    }
  }

  if (mappedThemes.length === 1) {
    const playerMoves = Math.ceil(cleanSolution.length / 2);
    mappedThemes.push(playerMoves >= 3 ? 'mate3' : playerMoves === 2 ? 'mate2' : 'fork');
  }

  const firstMove = cleanSolution[0];
  const fromSq = firstMove.slice(0, 2);
  const toSq = firstMove.slice(2, 4);
  const pieceText = PIECE_GENITIVE_SR[verified.firstPieceType || ''] || 'figurom';
  const motifText = srLabels.slice(0, 2).join(' · ') || 'Kombinovana taktika';
  const rating = Math.max(600, Math.min(2800, Number(puzzleData.rating) || 1500));
  const playerMoveCount = Math.ceil(cleanSolution.length / 2);

  const puzzle: TacticPuzzle = {
    id: `lichess-daily-${puzzleData.id || dateKey}`,
    title: `Lichess dnevni izazov (${dateKey})`,
    fen: verified.fen,
    turn: verified.turn,
    rating,
    themes: mappedThemes,
    solutionUci: cleanSolution,
    triggerMoveUci: verified.triggerMoveUci,
    hints: [
      `Motiv pozicije: ${motifText}. Potraži najjači forsirani nastavak u ${playerMoveCount} ${playerMoveCount === 1 ? 'potezu' : 'poteza'}.`,
      `Prvi ključni potez vučeš ${pieceText} sa polja ${fromSq}.`,
      `Odigraj ${fromSq} → ${toSq} i prati nastavak kombinacije.`,
    ],
    explanation: `Lichess dnevna zagonetka #${puzzleData.id || dateKey} (Elo ${rating}, tema: ${motifText}). Kompletno rešenje: ${cleanSolution.join(' → ')}.`,
    source: 'lichess-daily',
  };

  return {
    status: 'ready',
    dateKey,
    puzzle,
    plays: Number(puzzleData.plays) || undefined,
    rawThemes,
  };
}

export async function fetchDailyLichessPuzzle(options?: {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  nowMs?: () => number;
}): Promise<DailyLichessPuzzleResult> {
  const now = options?.nowMs ? options.nowMs() : Date.now();
  const dateKey = getUtcDateKey(now);

  const cached = dailyCache.get(dateKey);
  if (cached) return cached;

  if (now < rateLimitedUntilMs) {
    return {
      status: 'rate-limited',
      dateKey,
      puzzle: getDeterministicFallbackDailyPuzzle(now),
    };
  }

  const fetchFn = options?.fetchImpl ?? fetch;

  try {
    const response = await fetchFn(LICHESS_DAILY_PUZZLE_ENDPOINT, {
      method: 'GET',
      signal: options?.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 429) {
      rateLimitedUntilMs = (options?.nowMs ? options.nowMs() : Date.now()) + RATE_LIMIT_COOLDOWN_MS;
      return {
        status: 'rate-limited',
        dateKey,
        puzzle: getDeterministicFallbackDailyPuzzle(now),
      };
    }

    if (!response.ok) {
      return {
        status: 'offline',
        dateKey,
        puzzle: getDeterministicFallbackDailyPuzzle(now),
      };
    }

    const data = (await response.json()) as LichessDailyPuzzleApiResponse;
    const parsed = parseLichessDailyPuzzleResponse(data, dateKey);
    if (!parsed) {
      return {
        status: 'offline',
        dateKey,
        puzzle: getDeterministicFallbackDailyPuzzle(now),
      };
    }

    setCachedDaily(dateKey, parsed);
    return parsed;
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      throw error;
    }
    return {
      status: 'offline',
      dateKey,
      puzzle: getDeterministicFallbackDailyPuzzle(now),
    };
  }
}
