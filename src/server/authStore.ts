import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import type {
  AcademyProgressMap,
  CloudPlayerStats,
  MatchMode,
  MatchRecord,
  MatchResult,
  UserProfile,
} from '../shared/authTypes.ts';

const RANKS = [
  { level: 1, title: 'Šegrt Sanctuma', minXp: 0 },
  { level: 2, title: 'Kameni Adept', minXp: 150 },
  { level: 3, title: 'Bojni Mag', minXp: 400 },
  { level: 4, title: 'Gospodar Senki', minXp: 850 },
  { level: 5, title: 'Vrhovni Arhimag', minXp: 1600 },
];

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function computeLevelAndTitle(xp: number): { level: number; title: string } {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (safeXp >= RANKS[i].minXp) {
      return { level: RANKS[i].level, title: RANKS[i].title };
    }
  }
  return { level: 1, title: 'Šegrt Sanctuma' };
}

function emptyStats(): CloudPlayerStats {
  return {
    xp: 0,
    level: 1,
    title: 'Šegrt Sanctuma',
    streak: 0,
    totalCaptures: 0,
    totalMoves: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

function emptyAcademy(): AcademyProgressMap {
  return { games: [], openings: [], strategy: [], puzzles: [] };
}

function sanitizeStats(raw: unknown): CloudPlayerStats {
  const base = emptyStats();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  const xp = Math.max(0, Math.min(10_000_000, Math.floor(Number(obj.xp) || 0)));
  const { level, title } = computeLevelAndTitle(xp);
  return {
    xp,
    level,
    title,
    streak: Math.max(0, Math.min(1000, Math.floor(Number(obj.streak) || 0))),
    totalCaptures: Math.max(0, Math.min(1_000_000, Math.floor(Number(obj.totalCaptures) || 0))),
    totalMoves: Math.max(0, Math.min(10_000_000, Math.floor(Number(obj.totalMoves) || 0))),
    wins: Math.max(0, Math.min(1_000_000, Math.floor(Number(obj.wins) || 0))),
    losses: Math.max(0, Math.min(1_000_000, Math.floor(Number(obj.losses) || 0))),
    draws: Math.max(0, Math.min(1_000_000, Math.floor(Number(obj.draws) || 0))),
  };
}

function sanitizeAcademy(raw: unknown): AcademyProgressMap {
  const result = emptyAcademy();
  if (!raw || typeof raw !== 'object') return result;
  const obj = raw as Record<string, unknown>;
  const keys: (keyof AcademyProgressMap)[] = ['games', 'openings', 'strategy', 'puzzles'];
  for (const k of keys) {
    const arr = obj[k];
    if (Array.isArray(arr)) {
      const seen = new Set<string>();
      for (const item of arr) {
        if (typeof item === 'string' && item.trim().length > 0 && item.length <= 80) {
          seen.add(item.trim());
          if (seen.size >= 100) break;
        }
      }
      result[k] = Array.from(seen);
    }
  }
  return result;
}

function mergeStats(existing: CloudPlayerStats, incoming?: Partial<CloudPlayerStats> | null): CloudPlayerStats {
  if (!incoming) return sanitizeStats(existing);
  const cleanIn = sanitizeStats(incoming);
  const xp = Math.max(existing.xp, cleanIn.xp);
  const { level, title } = computeLevelAndTitle(xp);
  return {
    xp,
    level,
    title,
    streak: xp >= existing.xp ? Math.max(existing.streak, cleanIn.streak) : existing.streak,
    totalCaptures: Math.max(existing.totalCaptures, cleanIn.totalCaptures),
    totalMoves: Math.max(existing.totalMoves, cleanIn.totalMoves),
    wins: Math.max(existing.wins, cleanIn.wins),
    losses: Math.max(existing.losses, cleanIn.losses),
    draws: Math.max(existing.draws, cleanIn.draws),
  };
}

function mergeAcademy(
  existing: AcademyProgressMap,
  incoming?: Partial<AcademyProgressMap> | null
): AcademyProgressMap {
  if (!incoming) return sanitizeAcademy(existing);
  const cleanIn = sanitizeAcademy(incoming);
  return {
    games: Array.from(new Set([...existing.games, ...cleanIn.games])).slice(0, 100),
    openings: Array.from(new Set([...existing.openings, ...cleanIn.openings])).slice(0, 100),
    strategy: Array.from(new Set([...existing.strategy, ...cleanIn.strategy])).slice(0, 100),
    puzzles: Array.from(new Set([...existing.puzzles, ...cleanIn.puzzles])).slice(0, 100),
  };
}

export function sanitizeDisplayName(val: unknown, fallback = 'Igrač'): string {
  if (typeof val !== 'string') return fallback;
  const cleaned = val.replace(/\s+/g, ' ').trim().slice(0, 28);
  return cleaned.length >= 2 ? cleaned : fallback;
}

function normalizeUsername(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Unesi korisničko ime ili email adresu.' };
  }
  const value = raw.trim().toLowerCase();
  if (value.length < 3 || value.length > 48) {
    return { ok: false, error: 'Korisničko ime mora imati između 3 i 48 karaktera.' };
  }
  if (!/^[a-z0-9._@-]+$/.test(value)) {
    return { ok: false, error: 'Dozvoljena su slova, brojevi i simboli . _ - @' };
  }
  return { ok: true, value };
}

function validatePassword(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string' || raw.length < 6) {
    return { ok: false, error: 'Lozinka mora imati najmanje 6 karaktera.' };
  }
  if (raw.length > 128) {
    return { ok: false, error: 'Lozinka je predugačka.' };
  }
  return { ok: true, value: raw };
}

function hashPassword(password: string, saltHex: string): string {
  return crypto.scryptSync(password, saltHex, 64).toString('hex');
}

function verifyPassword(password: string, saltHex: string, expectedHashHex: string): boolean {
  const actualBuf = Buffer.from(hashPassword(password, saltHex), 'hex');
  const expectedBuf = Buffer.from(expectedHashHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export interface AuthResult {
  token: string;
  user: UserProfile;
  matches: MatchRecord[];
}

export function createAuthStore(
  dbPath: string = path.resolve(process.cwd(), 'data', 'wizardchess.db')
) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      stats_json TEXT NOT NULL,
      academy_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      player_color TEXT NOT NULL,
      opponent_name TEXT NOT NULL,
      result TEXT NOT NULL,
      reason TEXT NOT NULL,
      move_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_match_history_user_time ON match_history(user_id, created_at DESC);
  `);

  const stmtInsertUser = db.prepare(
    'INSERT INTO users (id, username, display_name, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const stmtFindUserByUsername = db.prepare(
    'SELECT id, username, display_name, password_salt, password_hash, created_at FROM users WHERE username = ?'
  );
  const stmtFindUserById = db.prepare(
    'SELECT id, username, display_name, created_at FROM users WHERE id = ?'
  );
  const stmtUpdateDisplayName = db.prepare('UPDATE users SET display_name = ? WHERE id = ?');

  const stmtInsertSession = db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  );
  const stmtFindSession = db.prepare(
    'SELECT token_hash, user_id, expires_at FROM sessions WHERE token_hash = ?'
  );
  const stmtDeleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const stmtDeleteExpiredSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

  const stmtGetProgress = db.prepare(
    'SELECT stats_json, academy_json FROM user_progress WHERE user_id = ?'
  );
  const stmtUpsertProgress = db.prepare(`
    INSERT INTO user_progress (user_id, stats_json, academy_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      stats_json = excluded.stats_json,
      academy_json = excluded.academy_json,
      updated_at = excluded.updated_at
  `);

  const stmtInsertMatch = db.prepare(`
    INSERT INTO match_history (id, user_id, mode, player_color, opponent_name, result, reason, move_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const stmtGetMatches = db.prepare(`
    SELECT id, mode, player_color, opponent_name, result, reason, move_count, created_at
    FROM match_history
    WHERE user_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT ?
  `);
  const stmtPruneMatches = db.prepare(`
    DELETE FROM match_history
    WHERE user_id = ? AND id NOT IN (
      SELECT id FROM match_history WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50
    )
  `);

  function loadUserProfile(userId: string): UserProfile | null {
    const userRow = stmtFindUserById.get(userId) as
      | { id: string; username: string; display_name: string; created_at: number }
      | undefined;
    if (!userRow) return null;

    const progRow = stmtGetProgress.get(userId) as
      | { stats_json: string; academy_json: string }
      | undefined;

    let stats = emptyStats();
    let academyProgress = emptyAcademy();
    if (progRow) {
      try {
        stats = sanitizeStats(JSON.parse(progRow.stats_json));
      } catch {
        stats = emptyStats();
      }
      try {
        academyProgress = sanitizeAcademy(JSON.parse(progRow.academy_json));
      } catch {
        academyProgress = emptyAcademy();
      }
    }

    return {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.display_name,
      createdAt: userRow.created_at,
      stats,
      academyProgress,
    };
  }

  function getMatches(userId: string, limit = 30): MatchRecord[] {
    const rows = stmtGetMatches.all(userId, Math.max(1, Math.min(50, limit))) as {
      id: string;
      mode: string;
      player_color: string;
      opponent_name: string;
      result: string;
      reason: string;
      move_count: number;
      created_at: number;
    }[];

    return rows.map((r) => ({
      id: r.id,
      mode: r.mode === 'online' ? 'online' : 'single',
      playerColor: r.player_color === 'b' ? 'b' : 'w',
      opponentName: r.opponent_name,
      result: r.result === 'win' || r.result === 'loss' ? r.result : 'draw',
      reason: r.reason,
      moveCount: r.move_count,
      createdAt: r.created_at,
    }));
  }

  function createSessionForUser(userId: string): string {
    const now = Date.now();
    stmtDeleteExpiredSessions.run(now);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    stmtInsertSession.run(tokenHash, userId, now + SESSION_TTL_MS, now);
    return rawToken;
  }

  function registerUser(input: {
    username: unknown;
    password: unknown;
    displayName?: unknown;
    guestStats?: Partial<CloudPlayerStats> | null;
    guestAcademy?: Partial<AcademyProgressMap> | null;
  }): { ok: true; data: AuthResult } | { ok: false; error: string; status: number } {
    const uname = normalizeUsername(input.username);
    if (!uname.ok) return { ok: false, error: uname.error, status: 400 };

    const pass = validatePassword(input.password);
    if (!pass.ok) return { ok: false, error: pass.error, status: 400 };

    const existing = stmtFindUserByUsername.get(uname.value);
    if (existing) {
      return { ok: false, error: 'Ovo korisničko ime je već zauzeto.', status: 409 };
    }

    const defaultName = uname.value.includes('@') ? uname.value.split('@')[0] : uname.value;
    const displayName = sanitizeDisplayName(input.displayName, defaultName.slice(0, 20) || 'Čarobnjak');
    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const passHash = hashPassword(pass.value, salt);
    const now = Date.now();

    const initialStats = mergeStats(emptyStats(), input.guestStats);
    const initialAcademy = mergeAcademy(emptyAcademy(), input.guestAcademy);

    stmtInsertUser.run(userId, uname.value, displayName, salt, passHash, now);
    stmtUpsertProgress.run(
      userId,
      JSON.stringify(initialStats),
      JSON.stringify(initialAcademy),
      now
    );

    const token = createSessionForUser(userId);
    const user = loadUserProfile(userId)!;
    return {
      ok: true,
      data: { token, user, matches: [] },
    };
  }

  function loginUser(input: {
    username: unknown;
    password: unknown;
    guestStats?: Partial<CloudPlayerStats> | null;
    guestAcademy?: Partial<AcademyProgressMap> | null;
  }): { ok: true; data: AuthResult } | { ok: false; error: string; status: number } {
    const uname = normalizeUsername(input.username);
    if (!uname.ok) return { ok: false, error: uname.error, status: 400 };

    if (typeof input.password !== 'string' || !input.password) {
      return { ok: false, error: 'Unesi lozinku.', status: 400 };
    }

    const row = stmtFindUserByUsername.get(uname.value) as
      | {
          id: string;
          username: string;
          display_name: string;
          password_salt: string;
          password_hash: string;
          created_at: number;
        }
      | undefined;

    if (!row || !verifyPassword(input.password, row.password_salt, row.password_hash)) {
      return { ok: false, error: 'Pogrešno korisničko ime ili lozinka.', status: 401 };
    }

    if (input.guestStats || input.guestAcademy) {
      syncProgress(row.id, input.guestStats || {}, input.guestAcademy || {});
    }

    const token = createSessionForUser(row.id);
    const user = loadUserProfile(row.id)!;
    const matches = getMatches(row.id);
    return {
      ok: true,
      data: { token, user, matches },
    };
  }

  function getSessionUser(rawToken: string | null | undefined): { user: UserProfile; matches: MatchRecord[] } | null {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const tokenHash = hashSessionToken(rawToken.trim());
    const sess = stmtFindSession.get(tokenHash) as
      | { token_hash: string; user_id: string; expires_at: number }
      | undefined;
    if (!sess) return null;
    if (sess.expires_at <= Date.now()) {
      stmtDeleteSession.run(tokenHash);
      return null;
    }
    const user = loadUserProfile(sess.user_id);
    if (!user) return null;
    return { user, matches: getMatches(user.id) };
  }

  function logoutSession(rawToken: string | null | undefined): void {
    if (!rawToken || typeof rawToken !== 'string') return;
    stmtDeleteSession.run(hashSessionToken(rawToken.trim()));
  }

  function updateDisplayName(
    userId: string,
    rawName: unknown
  ): { ok: true; user: UserProfile } | { ok: false; error: string } {
    if (typeof rawName !== 'string' || rawName.trim().length < 2) {
      return { ok: false, error: 'Ime za prikaz mora imati najmanje 2 karaktera.' };
    }
    const clean = sanitizeDisplayName(rawName, '');
    if (!clean) {
      return { ok: false, error: 'Ime za prikaz nije validno.' };
    }
    stmtUpdateDisplayName.run(clean, userId);
    const user = loadUserProfile(userId);
    if (!user) return { ok: false, error: 'Korisnik nije pronađen.' };
    return { ok: true, user };
  }

  function syncProgress(
    userId: string,
    incomingStats?: Partial<CloudPlayerStats> | null,
    incomingAcademy?: Partial<AcademyProgressMap> | null
  ): UserProfile | null {
    const existing = loadUserProfile(userId);
    if (!existing) return null;
    const nextStats = mergeStats(existing.stats, incomingStats);
    const nextAcademy = mergeAcademy(existing.academyProgress, incomingAcademy);
    stmtUpsertProgress.run(
      userId,
      JSON.stringify(nextStats),
      JSON.stringify(nextAcademy),
      Date.now()
    );
    return loadUserProfile(userId);
  }

  function recordMatch(
    userId: string,
    input: {
      mode: MatchMode;
      playerColor: 'w' | 'b';
      opponentName: string;
      result: MatchResult;
      reason: string;
      moveCount: number;
    }
  ): { user: UserProfile | null; matches: MatchRecord[] } {
    const existing = loadUserProfile(userId);
    if (!existing) return { user: null, matches: [] };

    const now = Date.now();
    const id = crypto.randomUUID();
    const cleanOpp = sanitizeDisplayName(input.opponentName, 'Protivnik');
    const cleanReason = String(input.reason || 'completed').slice(0, 32);
    const cleanMoves = Math.max(0, Math.min(2000, Math.floor(Number(input.moveCount) || 0)));

    stmtInsertMatch.run(
      id,
      userId,
      input.mode === 'online' ? 'online' : 'single',
      input.playerColor === 'b' ? 'b' : 'w',
      cleanOpp,
      input.result,
      cleanReason,
      cleanMoves,
      now
    );
    stmtPruneMatches.run(userId, userId);

    const nextStats: CloudPlayerStats = {
      ...existing.stats,
      wins: existing.stats.wins + (input.result === 'win' ? 1 : 0),
      losses: existing.stats.losses + (input.result === 'loss' ? 1 : 0),
      draws: existing.stats.draws + (input.result === 'draw' ? 1 : 0),
    };
    stmtUpsertProgress.run(
      userId,
      JSON.stringify(nextStats),
      JSON.stringify(existing.academyProgress),
      now
    );

    return {
      user: loadUserProfile(userId),
      matches: getMatches(userId),
    };
  }

  function close() {
    db.close();
  }

  return {
    registerUser,
    loginUser,
    getSessionUser,
    logoutSession,
    updateDisplayName,
    syncProgress,
    recordMatch,
    getMatches,
    close,
  };
}
