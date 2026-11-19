import type { CloudPlayerStats, MatchResult } from '../shared/authTypes';

export interface PlayerStats {
  xp: number;
  level: number;
  title: string;
  streak: number;
  totalCaptures: number;
  totalMoves: number;
  wins: number;
  losses: number;
  draws: number;
  lastAward: string | null;
}

const RANKS = [
  { level: 1, title: 'Šegrt Sanctuma', minXp: 0, nextXp: 150 },
  { level: 2, title: 'Kameni Adept', minXp: 150, nextXp: 400 },
  { level: 3, title: 'Bojni Mag', minXp: 400, nextXp: 850 },
  { level: 4, title: 'Gospodar Senki', minXp: 850, nextXp: 1600 },
  { level: 5, title: 'Vrhovni Arhimag', minXp: 1600, nextXp: 999999 },
];

function createEmptyStats(): PlayerStats {
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
    lastAward: null,
  };
}

class ProgressionService {
  private stats: PlayerStats = createEmptyStats();

  private listeners: ((stats: PlayerStats) => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const data = localStorage.getItem('wizard_player_stats');
      if (data) {
        this.stats = { ...createEmptyStats(), ...JSON.parse(data), lastAward: null };
        this.recalculateLevel();
      }
    } catch {
      // fallback
    }
  }

  private save() {
    try {
      localStorage.setItem('wizard_player_stats', JSON.stringify(this.stats));
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(fn: (stats: PlayerStats) => void) {
    this.listeners.push(fn);
    fn(this.getStats());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    const copy = this.getStats();
    for (const l of this.listeners) {
      l(copy);
    }
  }

  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  public getCloudStats(): CloudPlayerStats {
    return {
      xp: this.stats.xp,
      level: this.stats.level,
      title: this.stats.title,
      streak: this.stats.streak,
      totalCaptures: this.stats.totalCaptures,
      totalMoves: this.stats.totalMoves,
      wins: this.stats.wins,
      losses: this.stats.losses,
      draws: this.stats.draws,
    };
  }

  public getLevelProgress(): { current: number; max: number; percent: number } {
    const r = RANKS.find((rk) => rk.level === this.stats.level) || RANKS[0];
    const nextXp = r.nextXp;
    const prevXp = r.minXp;
    const currentInLevel = Math.max(0, this.stats.xp - prevXp);
    const needed = nextXp - prevXp;
    const percent = Math.min(100, Math.round((currentInLevel / needed) * 100));
    return { current: currentInLevel, max: needed, percent };
  }

  private recalculateLevel() {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (this.stats.xp >= RANKS[i].minXp) {
        this.stats.level = RANKS[i].level;
        this.stats.title = RANKS[i].title;
        break;
      }
    }
  }

  public awardMove(isCapture: boolean, inCheck: boolean, isCheckmate: boolean, isDraw: boolean = false) {
    let earned = 20;
    let label = '+20 XP Potez';

    if (isCapture) {
      this.stats.streak += 1;
      this.stats.totalCaptures += 1;
      const streakBonus = Math.min(50, this.stats.streak * 15);
      earned += 60 + streakBonus;
      label = `+${60 + streakBonus} XP Udarac! 🔥 x${this.stats.streak}`;
    } else {
      this.stats.streak = Math.max(0, this.stats.streak - 1);
    }

    if (inCheck && !isCheckmate) {
      earned += 40;
      label = '+40 XP ŠAH!';
    }

    if (isCheckmate) {
      earned += 250;
      label = '👑 +250 XP MAT! POBEDA!';
    } else if (isDraw) {
      earned += 40;
      label = '🤝 +40 XP Remi!';
    }

    this.stats.xp += earned;
    this.stats.totalMoves += 1;
    this.stats.lastAward = label;
    this.recalculateLevel();
    this.save();
  }

  public recordOpponentMove(isCapture: boolean, isCheckmate: boolean) {
    if (!isCapture && !isCheckmate) return;
    this.stats.streak = 0;
    if (isCheckmate) {
      this.stats.xp += 15;
      this.stats.lastAward = '+15 XP Lekcija iz poraza';
      this.recalculateLevel();
    } else {
      this.stats.lastAward = null;
    }
    this.save();
  }

  public awardHint() {
    this.stats.xp += 15;
    this.stats.lastAward = '+15 XP Znanje';
    this.recalculateLevel();
    this.save();
  }

  public recordMatchOutcome(result: MatchResult) {
    if (result === 'win') {
      this.stats.wins += 1;
    } else if (result === 'loss') {
      this.stats.losses += 1;
    } else {
      this.stats.draws += 1;
    }
    this.save();
  }

  public replaceFromCloud(cloud: CloudPlayerStats) {
    this.stats = {
      ...createEmptyStats(),
      ...cloud,
      lastAward: null,
    };
    this.recalculateLevel();
    this.save();
  }

  public resetLocal() {
    this.stats = createEmptyStats();
    this.save();
  }
}

export const progressionService = new ProgressionService();
