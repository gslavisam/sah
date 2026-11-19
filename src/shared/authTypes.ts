export interface AcademyProgressMap {
  games: string[];
  openings: string[];
  strategy: string[];
  puzzles: string[];
}

export interface CloudPlayerStats {
  xp: number;
  level: number;
  title: string;
  streak: number;
  totalCaptures: number;
  totalMoves: number;
  wins: number;
  losses: number;
  draws: number;
}

export type MatchResult = 'win' | 'loss' | 'draw';
export type MatchMode = 'online' | 'single';

export interface MatchRecord {
  id: string;
  mode: MatchMode;
  playerColor: 'w' | 'b';
  opponentName: string;
  result: MatchResult;
  reason: string;
  moveCount: number;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
  stats: CloudPlayerStats;
  academyProgress: AcademyProgressMap;
}
