import { ActiveWorkoutSession, PersistedRestTimerState, PersistedActiveWorkout, CompletedSessionSummary } from '../types/workout';
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
 * Coordinates all saves, cancels, and completions through a verified async queue to prevent
 * any pending write from recreating a session after completion or cancellation.
 */
export class ActiveWorkoutPersistenceManager {
  private queue: Promise<void> = Promise.resolve();
  private pendingPayload: SavePayload | null = null;
  private isHydrated = false;
  private isTerminated = false;
  private activeSessionId: string | null = null;

  constructor(private db: FitFlowDatabase = fitFlowDB) {}

  public setHydrated(hydrated: boolean): void {
    this.isHydrated = hydrated;
  }

  public getHydrated(): boolean {
    return this.isHydrated;
  }

  public isSessionTerminated(): boolean {
    return this.isTerminated;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(() => task(), () => task());
    this.queue = run.then(() => {}, () => {});
    return run;
  }

  /**
   * Starts tracking a new or resumed session, resetting the termination flag.
   */
  public async startSession(session: ActiveWorkoutSession): Promise<void> {
    this.isTerminated = false;
    this.activeSessionId = `${session.routineId}-${session.startTime}`;
    await this.scheduleSave(session, null);
  }

  /**
   * Queues an active workout update in a serialized pipeline.
   * If the session was already terminated (cleared or completed), any pending write is dropped.
   */
  public async scheduleSave(
    session: ActiveWorkoutSession | null,
    restTimer?: PersistedRestTimerState | null,
  ): Promise<void> {
    if (!this.isHydrated || this.isTerminated) {
      return;
    }

    if (!session || session.isFinished) {
      this.pendingPayload = null;
      return;
    }

    const sessionId = `${session.routineId}-${session.startTime}`;
    if (this.activeSessionId && this.activeSessionId !== sessionId) {
      this.isTerminated = false;
    }
    this.activeSessionId = sessionId;
    this.pendingPayload = { session, restTimer };

    return this.enqueue(async () => {
      if (this.isTerminated || !this.pendingPayload) {
        return;
      }
      const payload = this.pendingPayload;
      this.pendingPayload = null;
      try {
        await this.db.saveActiveWorkout(payload.session, payload.restTimer);
      } catch (err) {
        console.warn('[ActiveWorkoutPersistence] Error writing to IndexedDB:', err);
      }
    });
  }

  /**
   * Atomically completes the active workout session:
   * Discards pending saves, flags the session as terminated,
   * awaits any in-flight operations, and executes the atomic transaction
   * to write the history summary and delete the active workout.
   *
   * If the database transaction fails, reverts termination so the session can be preserved and retried.
   */
  public async completeWorkout(summary: CompletedSessionSummary): Promise<void> {
    this.isTerminated = true;
    this.pendingPayload = null;

    return this.enqueue(async () => {
      this.pendingPayload = null;
      try {
        await this.db.completeWorkoutTransaction(summary);
      } catch (err) {
        this.isTerminated = false;
        throw err;
      }
    });
  }

  /**
   * Safely clears active workout storage upon cancellation.
   * Sets isTerminated=true so no in-flight or subsequent save can recreate the discarded session.
   */
  public async clear(): Promise<void> {
    this.isTerminated = true;
    this.pendingPayload = null;

    return this.enqueue(async () => {
      this.pendingPayload = null;
      try {
        await this.db.clearActiveWorkout();
      } catch (err) {
        console.warn('[ActiveWorkoutPersistence] Error clearing from IndexedDB:', err);
      }
    });
  }

  /**
   * Restores the active session from storage upon app mount.
   */
  public async restore(): Promise<PersistedActiveWorkout | null> {
    return this.enqueue(async () => {
      try {
        return await this.db.getActiveWorkout();
      } catch (err) {
        console.warn('[ActiveWorkoutPersistence] Error restoring from IndexedDB:', err);
        return null;
      }
    });
  }

  /**
   * Flushes and waits for all queued storage tasks to finish.
   */
  public async waitForPendingOperations(): Promise<void> {
    await this.queue;
  }
}

export const activeWorkoutManager = new ActiveWorkoutPersistenceManager();
