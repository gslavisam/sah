export interface PlayerStats {
  xp: number;
  level: number;
  title: string;
  streak: number;
  totalCaptures: number;
  totalMoves: number;
  lastAward: string | null;
}

const RANKS = [
  { level: 1, title: 'Šegrt Sanctuma', minXp: 0, nextXp: 150 },
  { level: 2, title: 'Kameni Adept', minXp: 150, nextXp: 400 },
  { level: 3, title: 'Bojni Mag', minXp: 400, nextXp: 850 },
  { level: 4, title: 'Gospodar Senki', minXp: 850, nextXp: 1600 },
  { level: 5, title: 'Vrhovni Arhimag', minXp: 1600, nextXp: 999999 },
];

class ProgressionService {
  private stats: PlayerStats = {
    xp: 0,
    level: 1,
    title: 'Šegrt Sanctuma',
    streak: 0,
    totalCaptures: 0,
    totalMoves: 0,
    lastAward: null,
  };

  private listeners: ((stats: PlayerStats) => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const data = localStorage.getItem('wizard_player_stats');
      if (data) {
        this.stats = { ...this.stats, ...JSON.parse(data), lastAward: null };
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

  public awardMove(isCapture: boolean, inCheck: boolean, isCheckmate: boolean) {
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

    if (inCheck) {
      earned += 40;
      label = '+40 XP ŠAH!';
    }

    if (isCheckmate) {
      earned += 250;
      label = '👑 +250 XP MAT! POBEDA!';
    }

    this.stats.xp += earned;
    this.stats.totalMoves += 1;
    this.stats.lastAward = label;
    this.recalculateLevel();
    this.save();
  }

  public awardHint() {
    this.stats.xp += 15;
    this.stats.lastAward = '+15 XP Znanje';
    this.recalculateLevel();
    this.save();
  }
}

export const progressionService = new ProgressionService();

