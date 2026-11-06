import { UserStats } from '../types/workout';
import { INITIAL_USER_STATS } from '../data/presetRoutines';

export const XP_PER_LEVEL = 2000;

export interface ProgressionResult {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  levelsGained: number;
}

/**
 * Calculates level progression for a given amount of XP gained.
 *
 * Rules:
 * - Cumulative XP is preserved (currentXP is never reset to 0 upon leveling up).
 * - Threshold increments by 2,000 XP per level.
 * - Processes all thresholds crossed in a single XP gain (e.g. gaining multiple levels).
 * - Negative or invalid XP gains are rejected (treated as 0).
 */
export function addExperience(
  stats: Pick<UserStats, 'level' | 'currentXP' | 'xpForNextLevel'>,
  xpGained: number,
): ProgressionResult {
  const validXpGain = Number.isFinite(xpGained) && xpGained > 0 ? Math.round(xpGained) : 0;

  let level = typeof stats.level === 'number' && Number.isInteger(stats.level) && stats.level > 0
    ? stats.level
    : 1;

  let currentXP = typeof stats.currentXP === 'number' && Number.isFinite(stats.currentXP) && stats.currentXP >= 0
    ? Math.round(stats.currentXP)
    : 0;

  let xpForNextLevel = typeof stats.xpForNextLevel === 'number' && Number.isFinite(stats.xpForNextLevel) && stats.xpForNextLevel > 0
    ? Math.round(stats.xpForNextLevel)
    : XP_PER_LEVEL;

  // Ensure xpForNextLevel is consistent with current level
  if (level >= 14) {
    const minThresholdForLevel = 8000 + (level - 14) * XP_PER_LEVEL;
    if (xpForNextLevel < minThresholdForLevel) {
      xpForNextLevel = minThresholdForLevel;
    }
  }

  const newXP = currentXP + validXpGain;
  let levelsGained = 0;

  while (newXP >= xpForNextLevel) {
    level += 1;
    xpForNextLevel += XP_PER_LEVEL;
    levelsGained += 1;
  }

  return {
    level,
    currentXP: newXP,
    xpForNextLevel,
    levelsGained,
  };
}

/**
 * Reconciles and sanitizes user statistics from persistent storage (e.g. LocalStorage).
 *
 * Guarantees:
 * - Does not re-grant XP or erase legitimate accumulated progress.
 * - If currentXP >= xpForNextLevel (e.g. from previous single-threshold progression),
 *   advances level and xpForNextLevel to reconcile consistency.
 * - Gracefully handles malformed JSON, corrupted numbers, negative values, and missing fields.
 * - Preserves full compatibility with UserStats format.
 */
export function reconcileUserStats(
  saved: unknown,
  fallback: UserStats = INITIAL_USER_STATS,
): UserStats {
  let candidate: unknown = saved;

  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      candidate = null;
    }
  }

  if (!candidate || typeof candidate !== 'object') {
    return { ...fallback, streakHistory: [...fallback.streakHistory] };
  }

  const data = candidate as Partial<UserStats>;

  let level = typeof data.level === 'number' && Number.isInteger(data.level) && data.level > 0
    ? data.level
    : fallback.level;

  let currentXP = typeof data.currentXP === 'number' && Number.isFinite(data.currentXP) && data.currentXP >= 0
    ? Math.round(data.currentXP)
    : fallback.currentXP;

  let xpForNextLevel = typeof data.xpForNextLevel === 'number' && Number.isFinite(data.xpForNextLevel) && data.xpForNextLevel > 0
    ? Math.round(data.xpForNextLevel)
    : fallback.xpForNextLevel;

  if (level >= 14) {
    const minThresholdForLevel = 8000 + (level - 14) * XP_PER_LEVEL;
    if (xpForNextLevel < minThresholdForLevel) {
      xpForNextLevel = minThresholdForLevel;
    }
  }

  // Advance level if currentXP already met or exceeded threshold
  while (currentXP >= xpForNextLevel) {
    level += 1;
    xpForNextLevel += XP_PER_LEVEL;
  }

  const streakDays = typeof data.streakDays === 'number' && Number.isFinite(data.streakDays) && data.streakDays >= 0
    ? Math.floor(data.streakDays)
    : fallback.streakDays;

  const streakFrozenToday = typeof data.streakFrozenToday === 'boolean'
    ? data.streakFrozenToday
    : fallback.streakFrozenToday;

  const lastWorkoutDate = typeof data.lastWorkoutDate === 'string' && data.lastWorkoutDate.trim().length > 0
    ? data.lastWorkoutDate
    : fallback.lastWorkoutDate;

  const totalWorkoutsCompleted = typeof data.totalWorkoutsCompleted === 'number' && Number.isFinite(data.totalWorkoutsCompleted) && data.totalWorkoutsCompleted >= 0
    ? Math.floor(data.totalWorkoutsCompleted)
    : fallback.totalWorkoutsCompleted;

  const totalLifetimeVolumeKg = typeof data.totalLifetimeVolumeKg === 'number' && Number.isFinite(data.totalLifetimeVolumeKg) && data.totalLifetimeVolumeKg >= 0
    ? Math.round(data.totalLifetimeVolumeKg)
    : fallback.totalLifetimeVolumeKg;

  const streakHistory = Array.isArray(data.streakHistory) && data.streakHistory.length === 7
    ? data.streakHistory.map(Boolean)
    : [...fallback.streakHistory];

  return {
    level,
    currentXP,
    xpForNextLevel,
    streakDays,
    streakFrozenToday,
    lastWorkoutDate,
    totalWorkoutsCompleted,
    totalLifetimeVolumeKg,
    streakHistory,
  };
}
