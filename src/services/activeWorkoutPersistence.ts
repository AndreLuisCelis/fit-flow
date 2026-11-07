import { ActiveWorkoutSession, PersistedRestTimerState, PersistedActiveWorkout } from '../types/workout';
import { FitFlowDatabase, fitFlowDB } from '../db/indexedDb';

export interface RestoredRestTimerResult {
  isOpen: boolean;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  nextExerciseName?: string;
  nextSetNumber?: number;
  isMinimized: boolean;
}

/**
 * Reconstructs the rest timer state after reopening the app.
 * Considers elapsed real-world time if the timer was actively running.
 * Avoids negative counts and avoids reopening already elapsed timers.
 */
export function reconstructRestTimer(
  persisted: PersistedRestTimerState | null | undefined,
  now = Date.now(),
): RestoredRestTimerResult | null {
  if (!persisted || !persisted.isOpen) {
    return null;
  }

  const savedAt = Number.isFinite(persisted.savedAt) && persisted.savedAt > 0 ? persisted.savedAt : now;
  const elapsedMs = Math.max(0, now - savedAt);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const totalTime = Math.max(1, persisted.totalTime || 75);

  if (persisted.isRunning) {
    const remaining = Math.max(0, persisted.timeLeft - elapsedSeconds);
    if (remaining <= 0) {
      // Timer finished while app was closed / in background
      return {
        isOpen: false,
        timeLeft: 0,
        totalTime,
        isRunning: false,
        nextExerciseName: persisted.nextExerciseName,
        nextSetNumber: persisted.nextSetNumber,
        isMinimized: false,
      };
    }

    return {
      isOpen: true,
      timeLeft: remaining,
      totalTime,
      isRunning: true,
      nextExerciseName: persisted.nextExerciseName,
      nextSetNumber: persisted.nextSetNumber,
      isMinimized: Boolean(persisted.isMinimized),
    };
  }

  // Timer was paused: elapsed real-world time does not decrement paused timer
  return {
    isOpen: persisted.isOpen,
    timeLeft: Math.max(0, persisted.timeLeft),
    totalTime,
    isRunning: false,
    nextExerciseName: persisted.nextExerciseName,
    nextSetNumber: persisted.nextSetNumber,
    isMinimized: Boolean(persisted.isMinimized),
  };
}

export interface SavePayload {
  session: ActiveWorkoutSession;
  restTimer?: PersistedRestTimerState | null;
}

/**
 * Manages serialized, race-free persistence of the active workout session in IndexedDB.
 * Prevents hydration overwrite, serializes async operations, and drops obsolete states.
 */
export class ActiveWorkoutPersistenceManager {
  private inFlight = false;
  private pendingPayload: SavePayload | null = null;
  private isHydrated = false;

  constructor(private db: FitFlowDatabase = fitFlowDB) {}

  public setHydrated(hydrated: boolean): void {
    this.isHydrated = hydrated;
  }

  public getHydrated(): boolean {
    return this.isHydrated;
  }

  /**
   * Queues an active workout update. If a write is already in flight,
   * stores the newest state as pending so it will be saved immediately after.
   */
  public async scheduleSave(
    session: ActiveWorkoutSession | null,
    restTimer?: PersistedRestTimerState | null,
  ): Promise<void> {
    if (!this.isHydrated) {
      return;
    }

    if (!session || session.isFinished) {
      this.pendingPayload = null;
      return;
    }

    this.pendingPayload = { session, restTimer };

    if (this.inFlight) {
      return;
    }

    this.inFlight = true;
    try {
      while (this.pendingPayload) {
        const payload = this.pendingPayload;
        this.pendingPayload = null;
        try {
          await this.db.saveActiveWorkout(payload.session, payload.restTimer);
        } catch (err) {
          console.warn('[ActiveWorkoutPersistence] Error writing to IndexedDB:', err);
        }
      }
    } finally {
      this.inFlight = false;
    }
  }

  /**
   * Restores the active session from storage upon app mount.
   */
  public async restore(): Promise<PersistedActiveWorkout | null> {
    try {
      return await this.db.getActiveWorkout();
    } catch (err) {
      console.warn('[ActiveWorkoutPersistence] Error restoring from IndexedDB:', err);
      return null;
    }
  }

  /**
   * Safely clears active workout storage.
   */
  public async clear(): Promise<void> {
    this.pendingPayload = null;
    try {
      await this.db.clearActiveWorkout();
    } catch (err) {
      console.warn('[ActiveWorkoutPersistence] Error clearing from IndexedDB:', err);
    }
  }
}

export const activeWorkoutManager = new ActiveWorkoutPersistenceManager();
