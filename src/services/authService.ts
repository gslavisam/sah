import type { MatchMode, MatchRecord, MatchResult, UserProfile } from '../shared/authTypes';
import { progressionService } from './progressionService';
import { academyProgression } from './academyProgression';

const AUTH_TOKEN_KEY = 'wizard_auth_token';
const GUEST_NAME_KEY = 'wizard_guest_name';
const GUEST_MATCHES_KEY = 'wizard_guest_matches';

export interface AuthSnapshot {
  initializing: boolean;
  user: UserProfile | null;
  matches: MatchRecord[];
  guestName: string;
}

function loadToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function saveToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function loadOrCreateGuestName(): string {
  try {
    const existing = localStorage.getItem(GUEST_NAME_KEY);
    if (existing && existing.trim().length >= 2) {
      return existing.trim().slice(0, 28);
    }
    const generated = `Gost #${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(GUEST_NAME_KEY, generated);
    return generated;
  } catch {
    return 'Gost';
  }
}

function loadGuestMatches(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(GUEST_MATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

function saveGuestMatches(matches: MatchRecord[]) {
  try {
    localStorage.setItem(GUEST_MATCHES_KEY, JSON.stringify(matches.slice(0, 30)));
  } catch {
    // ignore
  }
}

class AuthService {
  private token: string | null = loadToken();
  private listeners = new Set<(snap: AuthSnapshot) => void>();
  private initialized = false;
  private suppressAutoSync = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  private state: AuthSnapshot = {
    initializing: Boolean(this.token),
    user: null,
    matches: loadGuestMatches(),
    guestName: loadOrCreateGuestName(),
  };

  constructor() {
    if (typeof window !== 'undefined') {
      progressionService.subscribe(() => this.scheduleAutoSync());
      academyProgression.subscribe(() => this.scheduleAutoSync());
    }
  }

  public subscribe(listener: (snap: AuthSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): AuthSnapshot {
    return this.state;
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private updateState(patch: Partial<AuthSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private applyCloudUser(user: UserProfile, matches?: MatchRecord[]) {
    this.suppressAutoSync = true;
    try {
      progressionService.replaceFromCloud(user.stats);
      academyProgression.replaceFromCloud(user.academyProgress);
    } finally {
      this.suppressAutoSync = false;
    }
    this.updateState({
      initializing: false,
      user,
      matches: matches ?? this.state.matches,
    });
  }

  private scheduleAutoSync() {
    if (this.suppressAutoSync || !this.token || !this.state.user) return;
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.pushProgressNow();
    }, 650);
  }

  private async pushProgressNow() {
    if (!this.token || !this.state.user) return;
    try {
      const res = await fetch('/api/profile/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          stats: progressionService.getCloudStats(),
          academyProgress: academyProgression.getProgressMap(),
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { user?: UserProfile };
      if (data.user) {
        this.updateState({ user: data.user });
      }
    } catch {
      // keep local state silently if network momentarily fails
    }
  }

  public async init() {
    if (this.initialized) return;
    this.initialized = true;
    if (!this.token) {
      this.updateState({ initializing: false });
      return;
    }
    await this.refreshProfile();
  }

  public async refreshProfile(): Promise<void> {
    if (!this.token) {
      this.updateState({ initializing: false, user: null, matches: loadGuestMatches() });
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) {
        this.token = null;
        saveToken(null);
        this.updateState({ initializing: false, user: null, matches: loadGuestMatches() });
        return;
      }
      const data = (await res.json()) as { user: UserProfile; matches: MatchRecord[] };
      this.applyCloudUser(data.user, data.matches);
    } catch {
      this.updateState({ initializing: false });
    }
  }

  public async register(
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          displayName,
          guestStats: progressionService.getCloudStats(),
          guestAcademy: academyProgression.getProgressMap(),
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: UserProfile;
        matches?: MatchRecord[];
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        return { ok: false, error: data.error || 'Registracija nije uspela.' };
      }
      this.token = data.token;
      saveToken(data.token);
      saveGuestMatches([]);
      this.applyCloudUser(data.user, data.matches || []);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Greška u povezivanju sa serverom.' };
    }
  }

  public async login(
    username: string,
    password: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          guestStats: progressionService.getCloudStats(),
          guestAcademy: academyProgression.getProgressMap(),
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: UserProfile;
        matches?: MatchRecord[];
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        return { ok: false, error: data.error || 'Prijava nije uspela.' };
      }
      this.token = data.token;
      saveToken(data.token);
      saveGuestMatches([]);
      this.applyCloudUser(data.user, data.matches || []);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Greška u povezivanju sa serverom.' };
    }
  }

  public async logout(): Promise<void> {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    const oldToken = this.token;
    this.token = null;
    saveToken(null);

    if (oldToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${oldToken}` },
        });
      } catch {
        // ignore
      }
    }

    this.suppressAutoSync = true;
    try {
      progressionService.resetLocal();
      academyProgression.resetLocal();
    } finally {
      this.suppressAutoSync = false;
    }

    this.updateState({
      initializing: false,
      user: null,
      matches: loadGuestMatches(),
    });
  }

  public async updateDisplayName(
    displayName: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.token) {
      this.setGuestName(displayName);
      return { ok: true };
    }
    try {
      const res = await fetch('/api/profile/display-name', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ displayName }),
      });
      const data = (await res.json()) as { user?: UserProfile; error?: string };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error || 'Promena imena nije uspela.' };
      }
      this.updateState({ user: data.user });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Greška u povezivanju sa serverom.' };
    }
  }

  public setGuestName(name: string) {
    const cleaned = name.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (cleaned.length < 2) return;
    try {
      localStorage.setItem(GUEST_NAME_KEY, cleaned);
    } catch {
      // ignore
    }
    this.updateState({ guestName: cleaned });
  }

  public async recordSinglePlayerMatch(input: {
    playerColor: 'w' | 'b';
    opponentName: string;
    result: MatchResult;
    reason: string;
    moveCount: number;
  }) {
    if (this.token && this.state.user) {
      // Flush local XP first so cloud stats include the final move XP
      await this.pushProgressNow();
      try {
        const res = await fetch('/api/profile/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const data = (await res.json()) as { user?: UserProfile; matches?: MatchRecord[] };
          if (data.user) {
            this.applyCloudUser(data.user, data.matches);
            return;
          }
        }
      } catch {
        // fallback below if network fails
      }
    }

    this.recordLocalGuestMatch({ ...input, mode: 'single' });
  }

  public recordLocalGuestMatch(input: {
    mode: MatchMode;
    playerColor: 'w' | 'b';
    opponentName: string;
    result: MatchResult;
    reason: string;
    moveCount: number;
  }) {
    this.suppressAutoSync = true;
    try {
      progressionService.recordMatchOutcome(input.result);
    } finally {
      this.suppressAutoSync = false;
    }
    if (this.state.user) {
      return;
    }
    const nextRecord: MatchRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: input.mode,
      playerColor: input.playerColor,
      opponentName: input.opponentName,
      result: input.result,
      reason: input.reason,
      moveCount: input.moveCount,
      createdAt: Date.now(),
    };
    const nextMatches = [nextRecord, ...loadGuestMatches()].slice(0, 30);
    saveGuestMatches(nextMatches);
    this.updateState({ matches: nextMatches });
  }

  public getDuelIdentity(): { authToken?: string; displayName: string } {
    if (this.token && this.state.user) {
      return {
        authToken: this.token,
        displayName: this.state.user.displayName,
      };
    }
    return {
      displayName: this.state.guestName,
    };
  }
}

export const authService = new AuthService();
