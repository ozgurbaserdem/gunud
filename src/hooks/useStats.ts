import { useState, useCallback, useEffect } from 'react';
import type { Stats, RatingCounts } from '../types';
import { getTodayDateString } from '../utils/dungeonGenerator';
import { getGunudRating } from '../utils/sharing';

const STATS_KEY = 'gunud-stats';

const DEFAULT_RATING_COUNTS: RatingCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 };

const DEFAULT_STATS: Stats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  moveHistory: [],
  ratingCounts: { ...DEFAULT_RATING_COUNTS },
};

function loadStats(): Stats {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: add ratingCounts if missing (backwards compatibility)
      if (!parsed.ratingCounts) {
        parsed.ratingCounts = { ...DEFAULT_RATING_COUNTS };
      }
      return parsed;
    }
  } catch {
    // Ignore errors
  }
  return { ...DEFAULT_STATS, ratingCounts: { ...DEFAULT_RATING_COUNTS } };
}

function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore errors
  }
}

interface UseStatsReturn {
  stats: Stats;
  recordWin: (moves: number, par: number) => void;
  hasPlayedToday: boolean;
  averageMoves: number;
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<Stats>(loadStats);

  const todayString = getTodayDateString();
  const hasPlayedToday = stats.lastPlayedDate === todayString;

  const averageMoves =
    stats.moveHistory.length > 0
      ? stats.moveHistory.reduce((a, b) => a + b, 0) / stats.moveHistory.length
      : 0;

  const recordWin = useCallback(
    (moves: number, par: number) => {
      if (hasPlayedToday) return; // Already played today

      setStats((prev) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        const isConsecutive = prev.lastPlayedDate === yesterdayString;
        const newStreak = isConsecutive ? prev.currentStreak + 1 : 1;

        const rating = getGunudRating(moves, par);
        const newRatingCounts: RatingCounts = {
          ...prev.ratingCounts,
          [rating.grade]: prev.ratingCounts[rating.grade] + 1,
        };

        const newStats: Stats = {
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + 1,
          currentStreak: newStreak,
          maxStreak: Math.max(prev.maxStreak, newStreak),
          lastPlayedDate: todayString,
          moveHistory: [...prev.moveHistory.slice(-29), moves], // Keep last 30 games
          ratingCounts: newRatingCounts,
        };

        saveStats(newStats);
        return newStats;
      });
    },
    [hasPlayedToday, todayString]
  );

  // Sync stats when localStorage changes from another tab
  useEffect(() => {
    function handleStorage(): void {
      setStats(loadStats());
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    stats,
    recordWin,
    hasPlayedToday,
    averageMoves,
  };
}
