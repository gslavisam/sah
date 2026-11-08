import React, { useEffect, useState } from 'react';
import { PlayerStats, progressionService } from '../services/progressionService';

export const PlayerLevelBar: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats>(progressionService.getStats());
  const [floatingAward, setFloatingAward] = useState<string | null>(null);

  useEffect(() => {
    return progressionService.subscribe((newStats) => {
      setStats(newStats);
      if (newStats.lastAward) {
        setFloatingAward(newStats.lastAward);
        const timer = setTimeout(() => setFloatingAward(null), 2200);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const progress = progressionService.getLevelProgress();

  return (
    <div className="player-level-container" title={`Ukupno XP: ${stats.xp}`}>
      <div className="level-badge-wrap">
        <span className="level-num">Lv.{stats.level}</span>
        <span className="level-title">{stats.title}</span>
      </div>

      <div className="xp-bar-outer">
        <div className="xp-bar-inner" style={{ width: `${progress.percent}%` }}></div>
        <span className="xp-label">
          {progress.current} / {progress.max} XP
        </span>
      </div>

      {stats.streak > 1 && (
        <div className="streak-badge" title="Uzastopna uzimanja figura!">
          🔥 x{stats.streak}
        </div>
      )}

      {floatingAward && <div className="floating-xp-award">{floatingAward}</div>}
    </div>
  );
};

