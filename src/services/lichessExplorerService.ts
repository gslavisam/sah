export interface LichessMasterMove {
  san: string;
  uci: string;
  totalGames: number;
  whitePct: number;
  drawPct: number;
  blackPct: number;
}

export interface LichessMasterTopGame {
  id: string;
  whiteName: string;
  whiteRating?: number;
  blackName: string;
  blackRating?: number;
  year?: number;
  winner?: 'white' | 'black' | null;
}

export interface LichessMasterStats {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'rate-limited' | 'offline';
  eco?: string;
  openingName?: string;
  totalGames: number;
  topMoves: LichessMasterMove[];
  topGames: LichessMasterTopGame[];
}

interface LichessApiMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
}

interface LichessApiTopGame {
  id?: string;
  winner?: 'white' | 'black' | null;
  year?: number;
  white?: { name?: string; rating?: number };
  black?: { name?: string; rating?: number };
}

interface LichessApiResponse {
  white?: number;
  draws?: number;
  black?: number;
  opening?: {
    eco?: string;
    name?: string;
  } | null;
  moves?: LichessApiMove[];
  topGames?: LichessApiTopGame[];
}

const LICHESS_MASTERS_ENDPOINT = 'https://explorer.lichess.ovh/masters';
const MAX_CACHE_ENTRIES = 200;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

const fenStatsCache = new Map<string, LichessMasterStats>();
const masterGamePgnCache = new Map<string, string>();
let rateLimitedUntilMs = 0;

function computeRoundedPercentages(
  white: number,
  draws: number,
  black: number
): { whitePct: number; drawPct: number; blackPct: number } {
  const total = white + draws + black;
  if (total <= 0) {
    return { whitePct: 0, drawPct: 0, blackPct: 0 };
  }
  const whitePct = Math.round((white / total) * 100);
  const drawPct = Math.round((draws / total) * 100);
  const blackPct = Math.max(0, 100 - whitePct - drawPct);
  return { whitePct, drawPct, blackPct };
}

function setCachedStats(fen: string, stats: LichessMasterStats) {
  if (fenStatsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = fenStatsCache.keys().next().value;
    if (oldestKey !== undefined) {
      fenStatsCache.delete(oldestKey);
    }
  }
  fenStatsCache.set(fen, stats);
}

export function getCachedLichessMasterStats(fen: string): LichessMasterStats | undefined {
  return fenStatsCache.get(fen);
}

export async function fetchLichessMasterStats(
  fen: string,
  options?: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    nowMs?: () => number;
  }
): Promise<LichessMasterStats> {
  const cached = fenStatsCache.get(fen);
  if (cached) return cached;

  const now = options?.nowMs ? options?.nowMs() : Date.now();
  if (now < rateLimitedUntilMs) {
    return {
      status: 'rate-limited',
      totalGames: 0,
      topMoves: [],
      topGames: [],
    };
  }

  const fetchFn = options?.fetchImpl ?? fetch;
  const url = `${LICHESS_MASTERS_ENDPOINT}?fen=${encodeURIComponent(fen)}&topGames=4&recentGames=0`;

  try {
    const response = await fetchFn(url, {
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
        totalGames: 0,
        topMoves: [],
        topGames: [],
      };
    }

    if (!response.ok) {
      return {
        status: 'offline',
        totalGames: 0,
        topMoves: [],
        topGames: [],
      };
    }

    const data = (await response.json()) as LichessApiResponse;
    const rawMoves = Array.isArray(data.moves) ? data.moves : [];
    const totalFromSummary =
      (Number(data.white) || 0) + (Number(data.draws) || 0) + (Number(data.black) || 0);

    const topMoves: LichessMasterMove[] = rawMoves
      .map((move) => {
        const white = Math.max(0, Number(move.white) || 0);
        const draws = Math.max(0, Number(move.draws) || 0);
        const black = Math.max(0, Number(move.black) || 0);
        const totalGames = white + draws + black;
        const pct = computeRoundedPercentages(white, draws, black);
        return {
          san: move.san,
          uci: move.uci,
          totalGames,
          ...pct,
        };
      })
      .filter((move) => move.totalGames > 0)
      .sort((a, b) => b.totalGames - a.totalGames)
      .slice(0, 3);

    const rawTopGames = Array.isArray(data.topGames) ? data.topGames : [];
    const topGames: LichessMasterTopGame[] = rawTopGames
      .filter((g): g is LichessApiTopGame & { id: string } => typeof g?.id === 'string' && g.id.length > 0)
      .slice(0, 4)
      .map((g) => ({
        id: g.id,
        whiteName: g.white?.name?.trim() || 'Beli',
        whiteRating: typeof g.white?.rating === 'number' ? g.white.rating : undefined,
        blackName: g.black?.name?.trim() || 'Crni',
        blackRating: typeof g.black?.rating === 'number' ? g.black.rating : undefined,
        year: typeof g.year === 'number' ? g.year : undefined,
        winner: g.winner ?? null,
      }));

    const totalGames =
      totalFromSummary > 0
        ? totalFromSummary
        : topMoves.reduce((sum, item) => sum + item.totalGames, 0);

    const result: LichessMasterStats =
      (topMoves.length === 0 && topGames.length === 0) || totalGames === 0
        ? {
            status: 'empty',
            eco: data.opening?.eco,
            openingName: data.opening?.name,
            totalGames: 0,
            topMoves: [],
            topGames: [],
          }
        : {
            status: 'ready',
            eco: data.opening?.eco,
            openingName: data.opening?.name,
            totalGames,
            topMoves,
            topGames,
          };

    setCachedStats(fen, result);
    return result;
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      throw error;
    }
    return {
      status: 'offline',
      totalGames: 0,
      topMoves: [],
      topGames: [],
    };
  }
}

export async function fetchLichessMasterGamePgn(
  gameId: string,
  options?: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    nowMs?: () => number;
  }
): Promise<string> {
  const cleanId = gameId.trim();
  if (!cleanId) {
    throw new Error('Nedostaje ID master partije.');
  }

  const cached = masterGamePgnCache.get(cleanId);
  if (cached) return cached;

  const now = options?.nowMs ? options.nowMs() : Date.now();
  if (now < rateLimitedUntilMs) {
    throw new Error('Lichess API privremeno ograničava zahteve. Pokušaj ponovo za minut.');
  }

  const fetchFn = options?.fetchImpl ?? fetch;
  const url = `${LICHESS_MASTERS_ENDPOINT}/pgn/${encodeURIComponent(cleanId)}`;
  const response = await fetchFn(url, {
    method: 'GET',
    signal: options?.signal,
    headers: {
      Accept: 'application/x-chess-pgn, text/plain',
    },
  });

  if (response.status === 429) {
    rateLimitedUntilMs = (options?.nowMs ? options.nowMs() : Date.now()) + RATE_LIMIT_COOLDOWN_MS;
    throw new Error('Lichess API privremeno ograničava zahteve. Pokušaj ponovo za minut.');
  }
  if (!response.ok) {
    throw new Error('Nije uspelo preuzimanje PGN partije sa Lichess Masters baze.');
  }

  const pgn = (await response.text()).trim();
  if (!pgn) {
    throw new Error('Lichess Masters nije vratio PGN sadržaj za izabranu partiju.');
  }

  if (masterGamePgnCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = masterGamePgnCache.keys().next().value;
    if (oldest !== undefined) masterGamePgnCache.delete(oldest);
  }
  masterGamePgnCache.set(cleanId, pgn);
  return pgn;
}

export function __resetLichessExplorerForTests() {
  fenStatsCache.clear();
  masterGamePgnCache.clear();
  rateLimitedUntilMs = 0;
}
