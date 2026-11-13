import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { createFitFlowDatabase } from '../db/indexedDb';
import { ActiveWorkoutPersistenceManager } from './activeWorkoutPersistence';
import { ActiveWorkoutSession, CompletedSessionSummary, PersistedRestTimerState } from '../types/workout';

function createSession(): ActiveWorkoutSession {
  return {
    routineId: 'indexeddb-test-routine',
    routineTitle: 'IndexedDB transaction test',
    startTime: 1700000000000,
    currentExerciseIndex: 0,
    exercises: [],
    totalVolumeMovedKg: 320,
    setsCompletedCount: 1,
    isFinished: false,
  };
}

function createSummary(id: string): CompletedSessionSummary {
  return {
    id,
    date: '2026-11-08',
    routineTitle: 'IndexedDB transaction test',
    durationSeconds: 1200,
    totalVolumeKg: 320,
    setsCount: 1,
    repsCount: 8,
    xpEarned: 350,
    prsAchieved: [],
    exerciseDetails: [],
  };
}

function createAbortOnActiveDeleteFactory(factory: IDBFactory): IDBFactory {
  const abortingFactory = Object.create(factory) as IDBFactory;
  let shouldAbort = true;
  abortingFactory.open = (name: string, version?: number) => {
    const request = factory.open(name, version);
    request.addEventListener('success', () => {
      const db = request.result;
      const originalTransaction = db.transaction.bind(db);
      Object.defineProperty(db, 'transaction', {
        configurable: true,
        value: (storeNames: string | string[], mode?: IDBTransactionMode) => {
          const names = Array.isArray(storeNames) ? storeNames : [storeNames];
          const transaction = originalTransaction(storeNames, mode);
          if (!names.includes('history') || !names.includes('active_workout')) return transaction;

          const originalObjectStore = transaction.objectStore.bind(transaction);
          Object.defineProperty(transaction, 'objectStore', {
            configurable: true,
            value: (name: string) => {
              const store = originalObjectStore(name);
              if (name === 'active_workout') {
                const originalDelete = store.delete.bind(store);
                Object.defineProperty(store, 'delete', {
                  configurable: true,
                  value: (key: IDBValidKey | IDBKeyRange) => {
                    const deleteRequest = originalDelete(key);
                    deleteRequest.onsuccess = () => {
                      if (shouldAbort) {
                        shouldAbort = false;
                        transaction.abort();
                      }
                    };
                    return deleteRequest;
                  },
                });
              }
              return store;
            },
          });
          return transaction;
        },
      });
    }, { once: true });
    return request;
  };
  return abortingFactory;
}

test('real IndexedDB preserves the running timer when a saved workout is restored after reopening', async () => {
  const factory = new IDBFactory();
  const firstDb = createFitFlowDatabase(factory);
  const writer = new ActiveWorkoutPersistenceManager(firstDb);
  writer.setHydrated(true);

  const session = createSession();
  const timer: PersistedRestTimerState = {
    isOpen: true,
    timeLeft: 42,
    totalTime: 75,
    isRunning: true,
    nextExerciseName: 'Bench Press',
    nextSetNumber: 2,
    isMinimized: true,
    savedAt: 1794170000000,
  };
  await writer.scheduleSave(session, timer);

  const reopenedDb = createFitFlowDatabase(factory);
  const restoredManager = new ActiveWorkoutPersistenceManager(reopenedDb);
  const persisted = await restoredManager.restore();
  assert.ok(persisted);
  restoredManager.resumeSession(persisted.session);
  await restoredManager.waitForPendingOperations();

  const afterResume = await reopenedDb.getActiveWorkout();
  assert.ok(afterResume);
  assert.deepEqual(afterResume.session, session);
  assert.deepEqual(afterResume.restTimer, timer);
  assert.equal(afterResume.restTimer?.timeLeft, 42);
  assert.equal(afterResume.restTimer?.isRunning, true);
  assert.equal(afterResume.restTimer?.nextExerciseName, 'Bench Press');
  assert.equal(afterResume.restTimer?.nextSetNumber, 2);
  assert.equal(afterResume.restTimer?.isMinimized, true);
  assert.equal(afterResume.restTimer?.savedAt, timer.savedAt);
});

test('real IndexedDB commits workout history and active-session deletion atomically and idempotently', async () => {
  const factory = new IDBFactory();
  const db = createFitFlowDatabase(factory);
  const manager = new ActiveWorkoutPersistenceManager(db);
  manager.setHydrated(true);
  await manager.scheduleSave(createSession());

  const summary = createSummary('real-idb-commit');
  await manager.completeWorkout(summary);

  assert.equal(await db.getActiveWorkout(), null);
  assert.deepEqual(await db.getHistory(), [summary]);

  await db.completeWorkoutTransaction(summary);
  assert.deepEqual(await db.getHistory(), [summary]);
});

test('real IndexedDB abort rolls back both stores and a retry recovers successfully', async () => {
  const factory = new IDBFactory();
  const db = createFitFlowDatabase(factory);
  const manager = new ActiveWorkoutPersistenceManager(db);
  manager.setHydrated(true);
  const activeSession = createSession();
  await manager.scheduleSave(activeSession);

  const abortingDb = createFitFlowDatabase(createAbortOnActiveDeleteFactory(factory));
  const abortingManager = new ActiveWorkoutPersistenceManager(abortingDb);
  const summary = createSummary('real-idb-abort');
  await assert.rejects(abortingManager.completeWorkout(summary));
  assert.equal(abortingManager.isSessionTerminated(), false);
  const preservedSession = await db.getActiveWorkout();
  assert.ok(preservedSession);
  assert.deepEqual(preservedSession.session, activeSession);
  assert.deepEqual(await db.getHistory(), []);

  await abortingManager.completeWorkout(summary);
  assert.equal(await db.getActiveWorkout(), null);
  assert.deepEqual(await db.getHistory(), [summary]);
});

test('real IndexedDB restores legacy active workout sessions without media and preserves sessions with media', async () => {
  const factory = new IDBFactory();

  // 1. Legacy active workout without media field on Exercise
  const legacyDb = createFitFlowDatabase(factory);
  const legacySession: ActiveWorkoutSession = {
    routineId: 'legacy-routine',
    routineTitle: 'Legacy Session',
    startTime: 1700000100000,
    currentExerciseIndex: 0,
    exercises: [
      {
        exercise: {
          id: 'legacy-ex-1',
          name: 'Legacy Push-up',
          namePt: 'Flexão Legada',
          primaryMuscle: 'chest',
          category: 'bodyweight',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeight: 0,
          restSeconds: 60,
        },
        sets: [
          { id: 's1', setNumber: 1, weight: 0, reps: 12, isCompleted: true },
        ],
        targetRestSeconds: 60,
      },
    ],
    totalVolumeMovedKg: 0,
    setsCompletedCount: 1,
    isFinished: false,
  };
  await legacyDb.saveActiveWorkout(legacySession, null);

  const reopenedLegacyDb = createFitFlowDatabase(factory);
  const restoredLegacy = await reopenedLegacyDb.getActiveWorkout();
  assert.ok(restoredLegacy);
  assert.deepEqual(restoredLegacy.session, legacySession);
  assert.equal(restoredLegacy.session.exercises[0].exercise.media, undefined);

  // 2. Active workout with structured ExerciseMedia
  const sessionWithMedia: ActiveWorkoutSession = {
    ...legacySession,
    routineId: 'media-routine',
    exercises: [
      {
        ...legacySession.exercises[0],
        exercise: {
          ...legacySession.exercises[0].exercise,
          id: 'push_up',
          media: {
            imageUrl: 'https://cdn.fitflow.celisapp.com/exercises/v1/push_up.webp',
            animationUrl: 'https://cdn.fitflow.celisapp.com/exercises/v1/push_up.lottie',
            alt: 'Push-up form',
            altPt: 'Execução da flexão',
            mediaType: 'lottie',
            assetId: 'exercise_push_up',
            version: '1.0.0',
          },
        },
      },
    ],
  };
  await reopenedLegacyDb.saveActiveWorkout(sessionWithMedia, null);
  const reopenedMediaDb = createFitFlowDatabase(factory);
  const restoredMedia = await reopenedMediaDb.getActiveWorkout();
  assert.ok(restoredMedia);
  assert.deepEqual(restoredMedia.session.exercises[0].exercise.media, sessionWithMedia.exercises[0].exercise.media);
});

test('real IndexedDB non-destructively backfills catalog media while preserving legacy custom exercises and routines', async () => {
  const factory = new IDBFactory();
  const db = createFitFlowDatabase(factory);

  const legacyCustomExercise = {
    id: 'legacy-custom-ex-1',
    name: 'Legacy Custom Exercise',
    namePt: 'Exercício Customizado Antigo',
    primaryMuscle: 'chest' as const,
    category: 'bodyweight' as const,
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
  };
  await db.saveExercise(legacyCustomExercise);

  // Simulate an older persisted catalog exercise that existed before media was added
  await db.saveExercise({
    id: 'push_up',
    name: 'Push-Up',
    namePt: 'Flexão de Braço',
    primaryMuscle: 'chest',
    category: 'bodyweight',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 60,
  });

  // Reopen DB triggers seedDefaultsIfEmpty
  const reopenedDb = createFitFlowDatabase(factory);
  const exercises = await reopenedDb.getExercises();
  const byId = Object.fromEntries(exercises.map((item) => [item.id, item]));

  // Custom legacy exercise remains completely preserved
  assert.deepEqual(byId['legacy-custom-ex-1'], legacyCustomExercise);
  // Catalog exercise receives non-destructive media backfill and new expanded exercises are seeded
  assert.ok(byId['push_up']?.media?.imageUrl.startsWith('https://'));
  assert.ok(exercises.length >= 90, `Expected at least 90 seeded+custom exercises, got ${exercises.length}`);
});

