import {
  getAllArenaPuzzles,
  type TacticPuzzle,
  type TacticThemeFilter,
} from '../data/tacticsArenaCatalog.ts';
import { getUtcDateKey } from './lichessPuzzleService.ts';

export type ArenaTrainingMode = 'elo' | 'survival' | 'theme' | 'daily';

export const TACTICS_ARENA_STORAGE_KEY = 'wizard_chess_tactics_arena_v1';
export const DEFAULT_TACTICAL_RATING = 1200;

export interface TacticsArenaStats {
  rating: number;
  bestRating: number;
  solvedIds: string[];
  attemptedCount: number;
  solvedCount: number;
  cleanStreak: number;
  bestSurvivalStreak: number;
  dailySolvedDate: string | null;
}

const listeners = new Set<() => void>();
let cachedStats: TacticsArenaStats | null = null;

function defaultStats(): TacticsArenaStats {
  return {
    rating: DEFAULT_TACTICAL_RATING,
    bestRating: DEFAULT_TACTICAL_RATING,
    solvedIds: [],
    attemptedCount: 0,
    solvedCount: 0,
    cleanStreak: 0,
    bestSurvivalStreak: 0,
    dailySolvedDate: null,
  };
}

function clampRating(val: number): number {
  return Math.max(400, Math.min(2800, Math.round(val)));
}

function normalizeStats(raw: unknown): TacticsArenaStats {
  const base = defaultStats();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const rating = typeof r.rating === 'number' && Number.isFinite(r.rating)
    ? clampRating(r.rating)
    : DEFAULT_TACTICAL_RATING;
  const bestRating = typeof r.bestRating === 'number' && Number.isFinite(r.bestRating)
    ? Math.max(rating, clampRating(r.bestRating))
    : rating;
  const solvedIds = Array.isArray(r.solvedIds)
    ? Array.from(new Set(r.solvedIds.filter((id): id is string => typeof id === 'string')))
    : [];
  const attemptedCount = typeof r.attemptedCount === 'number' && Number.isFinite(r.attemptedCount)
    ? Math.max(0, Math.floor(r.attemptedCount))
    : 0;
  const solvedCount = typeof r.solvedCount === 'number' && Number.isFinite(r.solvedCount)
    ? Math.max(0, Math.floor(r.solvedCount))
    : solvedIds.length;
  const cleanStreak = typeof r.cleanStreak === 'number' && Number.isFinite(r.cleanStreak)
    ? Math.max(0, Math.floor(r.cleanStreak))
    : 0;
  const bestSurvivalStreak = typeof r.bestSurvivalStreak === 'number' && Number.isFinite(r.bestSurvivalStreak)
    ? Math.max(0, Math.floor(r.bestSurvivalStreak))
    : 0;
  const dailySolvedDate = typeof r.dailySolvedDate === 'string' && r.dailySolvedDate.length >= 8
    ? r.dailySolvedDate
    : null;

  return {
    rating,
    bestRating,
    solvedIds,
    attemptedCount,
    solvedCount,
    cleanStreak,
    bestSurvivalStreak,
    dailySolvedDate,
  };
}

function loadStats(): TacticsArenaStats {
  if (cachedStats) return cachedStats;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TACTICS_ARENA_STORAGE_KEY);
      if (raw) {
        cachedStats = normalizeStats(JSON.parse(raw));
        return cachedStats;
      }
    }
  } catch (err) {
    console.warn('Could not read tactics arena stats:', err);
  }
  cachedStats = defaultStats();
  return cachedStats;
}

function saveStats(next: TacticsArenaStats) {
  cachedStats = next;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TACTICS_ARENA_STORAGE_KEY, JSON.stringify(next));
    }
  } catch (err) {
    console.warn('Could not persist tactics arena stats:', err);
  }
  listeners.forEach((cb) => cb());
}

export function calculateEloDelta(
  playerRating: number,
  puzzleRating: number,
  outcome: 'clean' | 'assisted' | 'mistake'
): number {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
  const k = 32;
  if (outcome === 'clean') {
    return Math.max(5, Math.round(k * (1 - expected)));
  }
  if (outcome === 'assisted') {
    return puzzleRating >= playerRating ? 2 : 0;
  }
  return Math.min(-4, Math.round(k * (0 - expected)));
}

export function getNextArenaPuzzle(
  mode: Exclude<ArenaTrainingMode, 'daily'>,
  options?: {
    theme?: TacticThemeFilter;
    currentPuzzleId?: string | null;
    excludeIds?: string[];
    survivalStreak?: number;
    playerRating?: number;
  }
): TacticPuzzle {
  const all = getAllArenaPuzzles();
  const stats = loadStats();
  const playerRating = options?.playerRating ?? stats.rating;
  const excluded = new Set<string>(options?.excludeIds || []);
  if (options?.currentPuzzleId) excluded.add(options.currentPuzzleId);

  let pool = all;
  if (mode === 'theme' && options?.theme && options.theme !== 'all') {
    const filtered = all.filter((p) => p.themes.includes(options.theme as Exclude<TacticThemeFilter, 'all'>));
    if (filtered.length > 0) {
      pool = filtered;
    }
  }

  const unexcluded = pool.filter((p) => !excluded.has(p.id));
  const candidates = unexcluded.length > 0 ? unexcluded : pool;

  if (mode === 'theme') {
    const unsolved = candidates.filter((p) => !stats.solvedIds.includes(p.id));
    const bucket = unsolved.length > 0 ? unsolved : candidates;
    return bucket.slice().sort((a, b) => a.rating - b.rating)[0];
  }

  const targetRating =
    mode === 'survival'
      ? Math.min(1800, 720 + (options?.survivalStreak ?? 0) * 70)
      : playerRating;

  const unsolved = candidates.filter((p) => !stats.solvedIds.includes(p.id));
  const rankingPool = mode === 'elo' && unsolved.length > 0 ? unsolved : candidates;

  return rankingPool
    .slice()
    .sort((a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating))[0];
}

export const tacticsArenaService = {
  getStats(): TacticsArenaStats {
    return loadStats();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  recordPuzzleMistake(puzzleRating: number, applyEloPenalty: boolean): number {
    const current = loadStats();
    const delta = applyEloPenalty ? calculateEloDelta(current.rating, puzzleRating, 'mistake') : 0;
    const nextRating = clampRating(current.rating + delta);
    saveStats({
      ...current,
      rating: nextRating,
      attemptedCount: current.attemptedCount + 1,
      cleanStreak: 0,
    });
    return delta;
  },

  recordPuzzleSolved(options: {
    puzzleId: string;
    puzzleRating: number;
    cleanSolve: boolean;
    mode: ArenaTrainingMode;
    survivalStreakAfter?: number;
    utcDateKey?: string;
  }): { ratingDelta: number; nextStats: TacticsArenaStats } {
    const current = loadStats();
    const shouldScoreElo = options.mode === 'elo' || options.mode === 'daily';
    const outcome = options.cleanSolve ? 'clean' : 'assisted';
    const ratingDelta = shouldScoreElo
      ? calculateEloDelta(current.rating, options.puzzleRating, outcome)
      : 0;
    const nextRating = clampRating(current.rating + ratingDelta);
    const nextBestRating = Math.max(current.bestRating, nextRating);
    const nextSolvedIds = current.solvedIds.includes(options.puzzleId)
      ? current.solvedIds
      : [...current.solvedIds, options.puzzleId];
    const nextBestSurvival =
      typeof options.survivalStreakAfter === 'number'
        ? Math.max(current.bestSurvivalStreak, options.survivalStreakAfter)
        : current.bestSurvivalStreak;
    const dailySolvedDate =
      options.mode === 'daily'
        ? options.utcDateKey || getUtcDateKey()
        : current.dailySolvedDate;

    const nextStats: TacticsArenaStats = {
      rating: nextRating,
      bestRating: nextBestRating,
      solvedIds: nextSolvedIds,
      attemptedCount: current.attemptedCount + (options.cleanSolve ? 1 : 0),
      solvedCount: current.solvedCount + 1,
      cleanStreak: options.cleanSolve ? current.cleanStreak + 1 : 0,
      bestSurvivalStreak: nextBestSurvival,
      dailySolvedDate,
    };

    saveStats(nextStats);
    return { ratingDelta, nextStats };
  },

  updateBestSurvivalStreak(streak: number): void {
    const current = loadStats();
    if (streak <= current.bestSurvivalStreak) return;
    saveStats({
      ...current,
      bestSurvivalStreak: streak,
    });
  },

  resetCacheForTests(): void {
    cachedStats = null;
  },
};
