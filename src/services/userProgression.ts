import { UserStats } from '../types/workout';
import { INITIAL_USER_STATS } from '../data/presetRoutines';

export const XP_PER_LEVEL = 2000;
export const MAX_SAFE_XP = Number.MAX_SAFE_INTEGER;
export const MAX_SAFE_LEVEL = Math.floor((Number.MAX_SAFE_INTEGER - 8000) / XP_PER_LEVEL) + 14;

export interface ProgressionResult {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  levelsGained: number;
}

/**
 * Sanitizes any numeric candidate ensuring the result is a safe integer within [min, max].
 * - If candidate is not a finite number or is NaN, returns fallback.
 * - If candidate is below min, returns fallback.
 * - If candidate is finite above max, clamps to max.
 */
export function toSafeIntegerInRange(
  val: unknown,
  fallback: number,
  min: number,
  max: number = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    return fallback;
  }
  if (val < min) {
    return fallback;
  }
  if (val > max) {
    return max;
  }
  const floored = Math.floor(val);
  return Number.isSafeInteger(floored) ? floored : max;
}

/**
 * Calculates level progression for a given amount of XP gained in O(1).
 *
 * Rules:
 * - Cumulative XP is preserved (currentXP is never reset to 0 upon leveling up).
 * - Threshold increments by 2,000 XP per level.
 * - Processes all thresholds crossed in a single XP gain in O(1) time without loops.
 * - Validates Number.isSafeInteger on all numeric fields and protects against overflow.
 * - Negative, NaN, or non-finite XP gains are rejected (treated as 0).
 */
export function addExperience(
  stats: Pick<UserStats, 'level' | 'currentXP' | 'xpForNextLevel'>,
  xpGained: number,
): ProgressionResult {
  let level = toSafeIntegerInRange(stats?.level, 1, 1, MAX_SAFE_LEVEL);
  let currentXP = toSafeIntegerInRange(stats?.currentXP, 0, 0, MAX_SAFE_XP);
  let xpForNextLevel = toSafeIntegerInRange(stats?.xpForNextLevel, XP_PER_LEVEL, 1, MAX_SAFE_XP);

  // Validate xpGained: must be positive safe number
  let validXpGain = 0;
  if (typeof xpGained === 'number' && Number.isFinite(xpGained) && xpGained > 0) {
    validXpGain = xpGained > MAX_SAFE_XP ? MAX_SAFE_XP : Math.floor(xpGained);
    if (!Number.isSafeInteger(validXpGain)) {
      validXpGain = MAX_SAFE_XP;
    }
  }

  // Preserve established curve for level 14 / threshold 8000
  if (level >= 14) {
    const minThresholdForLevel = Math.min(
      MAX_SAFE_XP,
      8000 + (level - 14) * XP_PER_LEVEL,
    );
    if (xpForNextLevel < minThresholdForLevel) {
      xpForNextLevel = minThresholdForLevel;
    }
  }

  // Protect against addition overflow
  const newXP = (currentXP > MAX_SAFE_XP - validXpGain)
    ? MAX_SAFE_XP
    : currentXP + validXpGain;

  let levelsGained = 0;

  // O(1) mathematical calculation of levels crossed without while loops
  if (newXP >= xpForNextLevel && level < MAX_SAFE_LEVEL) {
    const diff = newXP - xpForNextLevel;
    let levels = Math.floor(diff / XP_PER_LEVEL) + 1;
    if (level + levels > MAX_SAFE_LEVEL) {
      levels = Math.max(0, MAX_SAFE_LEVEL - level);
    }
    levelsGained = levels;
    level += levels;

    const thresholdIncrement = levels * XP_PER_LEVEL;
    xpForNextLevel = (xpForNextLevel > MAX_SAFE_XP - thresholdIncrement)
      ? MAX_SAFE_XP
      : xpForNextLevel + thresholdIncrement;
  }

  return {
    level,
    currentXP: newXP,
    xpForNextLevel,
    levelsGained,
  };
}

/**
 * Reconciles and sanitizes user statistics from persistent storage in O(1).
 *
 * Guarantees:
 * - Does not re-grant XP or erase legitimate accumulated progress.
 * - Reconciles levels and thresholds in O(1) time without loops.
 * - Strictly validates Number.isSafeInteger on all numeric fields and protects against overflow.
 * - Gracefully handles malformed JSON, corrupted numbers, values above MAX_SAFE_INTEGER, and missing fields.
 * - Preserves full compatibility with UserStats format.
 * - Guaranteed idempotent: reconcile(reconcile(stats)) === reconcile(stats).
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

  let level = toSafeIntegerInRange(data.level, fallback.level, 1, MAX_SAFE_LEVEL);
  let currentXP = toSafeIntegerInRange(data.currentXP, fallback.currentXP, 0, MAX_SAFE_XP);
  let xpForNextLevel = toSafeIntegerInRange(data.xpForNextLevel, fallback.xpForNextLevel, 1, MAX_SAFE_XP);

  if (level >= 14) {
    const minThresholdForLevel = Math.min(
      MAX_SAFE_XP,
      8000 + (level - 14) * XP_PER_LEVEL,
    );
    if (xpForNextLevel < minThresholdForLevel) {
      xpForNextLevel = minThresholdForLevel;
    }
  }

  // O(1) mathematical reconciliation without while loops
  if (currentXP >= xpForNextLevel && level < MAX_SAFE_LEVEL) {
    const diff = currentXP - xpForNextLevel;
    let levels = Math.floor(diff / XP_PER_LEVEL) + 1;
    if (level + levels > MAX_SAFE_LEVEL) {
      levels = Math.max(0, MAX_SAFE_LEVEL - level);
    }
    level += levels;

    const thresholdIncrement = levels * XP_PER_LEVEL;
    xpForNextLevel = (xpForNextLevel > MAX_SAFE_XP - thresholdIncrement)
      ? MAX_SAFE_XP
      : xpForNextLevel + thresholdIncrement;
  }

  const streakDays = toSafeIntegerInRange(data.streakDays, fallback.streakDays, 0, MAX_SAFE_XP);

  const streakFrozenToday = typeof data.streakFrozenToday === 'boolean'
    ? data.streakFrozenToday
    : fallback.streakFrozenToday;

  const lastWorkoutDate = typeof data.lastWorkoutDate === 'string' && data.lastWorkoutDate.trim().length > 0
    ? data.lastWorkoutDate
    : fallback.lastWorkoutDate;

  const totalWorkoutsCompleted = toSafeIntegerInRange(data.totalWorkoutsCompleted, fallback.totalWorkoutsCompleted, 0, MAX_SAFE_XP);

  const totalLifetimeVolumeKg = toSafeIntegerInRange(data.totalLifetimeVolumeKg, fallback.totalLifetimeVolumeKg, 0, MAX_SAFE_XP);

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
