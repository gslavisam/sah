import type { AcademyAreaId } from './academyCatalog';
import type { AcademyProgressMap } from '../shared/authTypes';

type AcademyProgress = Record<AcademyAreaId | 'puzzles', string[]>;

const STORAGE_KEY = 'wizard_academy_progress_v1';
const TUTORIAL_STORAGE_KEY = 'wizard_academy_tutorials_v1';
const EMPTY_PROGRESS: AcademyProgress = {
  games: [],
  openings: [],
  strategy: [],
  puzzles: []
};

function isProgress(value: unknown): value is AcademyProgress {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return ['games', 'openings', 'strategy', 'puzzles'].every(
    (key) => Array.isArray(record[key]) && record[key].every((id) => typeof id === 'string')
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

class AcademyProgressionService {
  private progress = this.load();
  private completedTutorials = this.loadTutorials();
  private listeners = new Set<() => void>();

  private load(): AcademyProgress {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return { ...EMPTY_PROGRESS };
      const parsed: unknown = JSON.parse(serialized);
      if (isProgress(parsed)) return parsed;
      console.warn('Academy progress has an invalid format; starting with empty progress.');
    } catch (error) {
      console.warn('Academy progress could not be loaded from local storage.', error);
    }
    return { ...EMPTY_PROGRESS };
  }

  private loadTutorials(): string[] {
    try {
      const serialized = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!serialized) return [];
      const parsed: unknown = JSON.parse(serialized);
      if (isStringArray(parsed)) return parsed;
    } catch (error) {
      console.warn('Academy tutorial progress could not be loaded from local storage.', error);
    }
    return [];
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(this.completedTutorials));
    } catch (error) {
      console.warn('Academy progress could not be saved to local storage.', error);
    }
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCompleted(area: AcademyAreaId | 'puzzles') {
    return [...this.progress[area]];
  }

  getCompletedTutorials() {
    return [...this.completedTutorials];
  }

  getProgressMap(): AcademyProgressMap {
    return {
      games: [...this.progress.games],
      openings: [...this.progress.openings],
      strategy: [...this.progress.strategy],
      puzzles: [...this.progress.puzzles],
    };
  }

  markCompleted(area: AcademyAreaId | 'puzzles', id: string) {
    if (this.progress[area].includes(id)) return false;
    this.progress[area] = [...this.progress[area], id];
    this.save();
    return true;
  }

  markTutorialCompleted(id: string) {
    if (this.completedTutorials.includes(id)) return false;
    this.completedTutorials = [...this.completedTutorials, id];
    this.save();
    return true;
  }

  replaceFromCloud(map: AcademyProgressMap) {
    this.progress = {
      games: [...(map.games || [])],
      openings: [...(map.openings || [])],
      strategy: [...(map.strategy || [])],
      puzzles: [...(map.puzzles || [])],
    };
    this.save();
  }

  resetLocal() {
    this.progress = {
      games: [],
      openings: [],
      strategy: [],
      puzzles: [],
    };
    this.completedTutorials = [];
    this.save();
  }

  getTotalCompleted() {
    const coreTotal = Object.values(this.progress).reduce((total, items) => total + items.length, 0);
    return coreTotal + this.completedTutorials.length;
  }
}

export const academyProgression = new AcademyProgressionService();
