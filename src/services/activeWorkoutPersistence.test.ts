import assert from 'node:assert/strict';
import test from 'node:test';
import { FitFlowDatabase, createFitFlowDatabase } from '../db/indexedDb';
import { ActiveWorkoutPersistenceManager, reconstructRestTimer } from './activeWorkoutPersistence';
import { ActiveWorkoutSession, CompletedSessionSummary, PersistedRestTimerState, UserStats } from '../types/workout';
import { addExperience } from './userProgression';
import { calculateRealStreak, updateStreakHistory } from './workoutHistory';

// Mock in-memory IndexedDB factory to test active workout operations deterministically in Node.js
function createMemoryIdbFactory(initialVersion = 2) {
  const storeData = new Map<string, Map<string, any>>();

  function getOrCreateStoreMap(storeName: string): Map<string, any> {
    if (!storeData.has(storeName)) {
      storeData.set(storeName, new Map());
    }
    return storeData.get(storeName)!;
  }

  let simulateAbortOnce = false;
  let simulateCompleteWorkoutAbortOnce = false;
  let simulateSaveFailureOnce = false;
  let simulateClearFailureOnce = false;

  function createStoreMock(map: Map<string, any>) {
    return {
      createIndex: () => {},
      get(key: string) {
        const val = map.get(key);
        const req: any = { result: val ? JSON.parse(JSON.stringify(val)) : undefined, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
      getAll() {
        const req: any = { result: Array.from(map.values()).map(v => JSON.parse(JSON.stringify(v))), onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
      count() {
        const req: any = { result: map.size, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
      put(val: any) {
        if (simulateSaveFailureOnce) {
          simulateSaveFailureOnce = false;
          throw new Error('Simulated active workout save failure');
        }
        const key = val.id;
        map.set(key, JSON.parse(JSON.stringify(val)));
        const req: any = { result: key, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
      add(val: any) {
        const key = val.id;
        map.set(key, JSON.parse(JSON.stringify(val)));
        const req: any = { result: key, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
      delete(key: string) {
        if (key === 'active' && simulateClearFailureOnce) {
          simulateClearFailureOnce = false;
          throw new Error('Simulated active workout deletion failure');
        }
        map.delete(key);
        const req: any = { result: undefined, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
      clear() {
        map.clear();
        const req: any = { result: undefined, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
        return req;
      },
    };
  }

  const factory = {
    _storeData: storeData,
    get simulateAbortOnce() {
      return simulateAbortOnce;
    },
    set simulateAbortOnce(val: boolean) {
      simulateAbortOnce = val;
    },
    get simulateCompleteWorkoutAbortOnce() {
      return simulateCompleteWorkoutAbortOnce;
    },
    set simulateCompleteWorkoutAbortOnce(val: boolean) {
      simulateCompleteWorkoutAbortOnce = val;
    },
    get simulateSaveFailureOnce() {
      return simulateSaveFailureOnce;
    },
    set simulateSaveFailureOnce(val: boolean) {
      simulateSaveFailureOnce = val;
    },
    get simulateClearFailureOnce() {
      return simulateClearFailureOnce;
    },
    set simulateClearFailureOnce(val: boolean) {
      simulateClearFailureOnce = val;
    },
    open(name: string, version: number) {
      const openReq: any = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      setTimeout(() => {
        const storeNames = new Set<string>();
        for (const key of storeData.keys()) {
          storeNames.add(key);
        }

        const fakeDb: any = {
          name,
          version,
          objectStoreNames: {
            contains: (sName: string) => storeNames.has(sName) || storeData.has(sName),
          },
          createObjectStore(sName: string) {
            storeNames.add(sName);
            const map = getOrCreateStoreMap(sName);
            return createStoreMock(map);
          },
          transaction(stores: string | string[], mode: 'readonly' | 'readwrite') {
            const storeList = Array.isArray(stores) ? stores : [stores];

            // Transaction snapshot for rollback simulation
            const snapshots = new Map<string, Map<string, any>>();
            if (mode === 'readwrite') {
              for (const sName of storeList) {
                const map = getOrCreateStoreMap(sName);
                snapshots.set(sName, new Map(map));
              }
            }

            const tx: any = {
              mode,
              error: null,
              oncomplete: null,
              onerror: null,
              onabort: null,
              abort() {
                tx.error = new Error('Transaction aborted manually');
                if (tx.onabort) tx.onabort({ target: tx });
              },
              objectStore(sName: string) {
                const map = getOrCreateStoreMap(sName);
                return createStoreMock(map);
              },
            };

            setTimeout(() => {
              const isCompleteWorkoutTx = storeList.includes('history') && storeList.includes('active_workout');
              if (simulateAbortOnce || (isCompleteWorkoutTx && simulateCompleteWorkoutAbortOnce)) {
                simulateAbortOnce = false;
                simulateCompleteWorkoutAbortOnce = false;
                // Atomic rollback to snapshot
                for (const [sName, snap] of snapshots.entries()) {
                  const map = getOrCreateStoreMap(sName);
                  map.clear();
                  for (const [k, v] of snap.entries()) {
                    map.set(k, v);
                  }
                }
                const err = new Error('Simulated transaction failure: disk write error');
                tx.error = err;
                if (tx.onerror) tx.onerror({ target: tx });
                if (tx.onabort) tx.onabort({ target: tx });
                return;
              }

              if (tx.oncomplete) tx.oncomplete({ target: tx });
            }, 5);

            return tx;
          },
        };

        if (version > initialVersion && openReq.onupgradeneeded) {
          const upgradeTx = fakeDb.transaction(['exercises', 'routines', 'history', 'active_workout'], 'readwrite');
          openReq.transaction = upgradeTx;
          openReq.onupgradeneeded({
            target: {
              result: fakeDb,
              transaction: upgradeTx,
            },
          });
        } else if (openReq.onupgradeneeded && storeNames.size === 0) {
          const upgradeTx = fakeDb.transaction(['exercises', 'routines', 'history', 'active_workout'], 'readwrite');
          openReq.transaction = upgradeTx;
          openReq.onupgradeneeded({
            target: {
              result: fakeDb,
              transaction: upgradeTx,
            },
          });
        }

        openReq.result = fakeDb;
        if (openReq.onsuccess) {
          openReq.onsuccess({ target: openReq });
        }
      }, 0);

      return openReq;
    },
  };

  return factory;
}

function createSampleActiveSession(overrides: Partial<ActiveWorkoutSession> = {}): ActiveWorkoutSession {
  return {
    routineId: 'routine-push-hypertrophy',
    routineTitle: 'Push Hypertrophy',
    startTime: 1700000000000,
    currentExerciseIndex: 0,
    exercises: [
      {
        exercise: {
          id: 'bench-press',
          name: 'Barbell Bench Press',
          namePt: 'Supino Reto',
          primaryMuscle: 'chest',
          category: 'barbell',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeight: 60,
          restSeconds: 90,
        },
        sets: [
          { id: 'set-1', setNumber: 1, weight: 60, reps: 10, rpe: 8, isCompleted: true },
          { id: 'set-2', setNumber: 2, weight: 65, reps: 8, rpe: 8.5, isCompleted: true },
          { id: 'set-3', setNumber: 3, weight: 70, reps: 6, rpe: 9, isCompleted: false },
        ],
        targetRestSeconds: 90,
        notes: 'Focar na cadência excêntrica lenta',
      },
      {
        exercise: {
          id: 'overhead-press',
          name: 'Overhead Press',
          namePt: 'Desenvolvimento Militar',
          primaryMuscle: 'shoulders',
          category: 'barbell',
          defaultSets: 3,
          defaultReps: 8,
          defaultWeight: 40,
          restSeconds: 75,
        },
        sets: [
          { id: 'set-4', setNumber: 1, weight: 40, reps: 8, rpe: 7.5, isCompleted: false },
          { id: 'set-5', setNumber: 2, weight: 40, reps: 8, rpe: 8, isCompleted: false },
        ],
        targetRestSeconds: 75,
      },
    ],
    totalVolumeMovedKg: 1120,
    setsCompletedCount: 2,
    isFinished: false,
    ...overrides,
  };
}

test('Active Workout Persistence Suite', async (t) => {
  // 1. Salvar e recuperar sessão completa
  await t.test('1. Salvar e recuperar sessão completa no IndexedDB', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const session = createSampleActiveSession();
    const timer: PersistedRestTimerState = {
      isOpen: true,
      timeLeft: 45,
      totalTime: 90,
      isRunning: true,
      nextExerciseName: 'Supino Reto',
      nextSetNumber: 3,
      isMinimized: false,
      savedAt: 1700000000000,
    };

    await db.saveActiveWorkout(session, timer);
    const restored = await db.getActiveWorkout();

    assert.ok(restored, 'Sessão ativa restaurada deve ser não-nula');
    assert.strictEqual(restored.id, 'active');
    assert.strictEqual(restored.session.routineId, session.routineId);
    assert.strictEqual(restored.session.routineTitle, session.routineTitle);
    assert.strictEqual(restored.session.exercises.length, 2);
    assert.strictEqual(restored.restTimer?.timeLeft, 45);
    assert.strictEqual(restored.restTimer?.totalTime, 90);
    assert.strictEqual(restored.restTimer?.nextExerciseName, 'Supino Reto');
  });

  // 2. Restaurar exercício atual e séries concluídas
  await t.test('2. Restaurar exercício atual e status das séries concluídas', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const session = createSampleActiveSession({
      currentExerciseIndex: 1,
      exercises: [
        {
          exercise: {
            id: 'bench-press',
            name: 'Bench Press',
            namePt: 'Supino Reto',
            primaryMuscle: 'chest',
            category: 'barbell',
            defaultSets: 2,
            defaultReps: 10,
            defaultWeight: 60,
            restSeconds: 90,
          },
          sets: [
            { id: 's1', setNumber: 1, weight: 60, reps: 10, isCompleted: true },
            { id: 's2', setNumber: 2, weight: 60, reps: 10, isCompleted: true },
          ],
          targetRestSeconds: 90,
        },
        {
          exercise: {
            id: 'incline-dumbbell-press',
            name: 'Incline Dumbbell Press',
            namePt: 'Supino Inclinado com Halteres',
            primaryMuscle: 'chest',
            category: 'dumbbell',
            defaultSets: 2,
            defaultReps: 10,
            defaultWeight: 24,
            restSeconds: 75,
          },
          sets: [
            { id: 's3', setNumber: 1, weight: 24, reps: 10, isCompleted: true },
            { id: 's4', setNumber: 2, weight: 24, reps: 8, isCompleted: false },
          ],
          targetRestSeconds: 75,
        },
      ],
    });

    await db.saveActiveWorkout(session);
    const restored = await db.getActiveWorkout();

    assert.ok(restored);
    assert.strictEqual(restored.session.currentExerciseIndex, 1);
    assert.strictEqual(restored.session.exercises[0].sets[0].isCompleted, true);
    assert.strictEqual(restored.session.exercises[0].sets[1].isCompleted, true);
    assert.strictEqual(restored.session.exercises[1].sets[0].isCompleted, true);
    assert.strictEqual(restored.session.exercises[1].sets[1].isCompleted, false);
  });

  // 3. Preservar carga, repetições, RPE e descanso
  await t.test('3. Preservar carga decimal, repetições, RPE, descanso e notas', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const session = createSampleActiveSession({
      exercises: [
        {
          exercise: {
            id: 'squat',
            name: 'Barbell Squat',
            namePt: 'Agachamento com Barra',
            primaryMuscle: 'quads',
            category: 'barbell',
            defaultSets: 1,
            defaultReps: 5,
            defaultWeight: 102.5,
            restSeconds: 120,
          },
          sets: [
            { id: 'sq1', setNumber: 1, weight: 102.5, reps: 5, rpe: 8.5, isCompleted: true },
          ],
          targetRestSeconds: 120,
          notes: 'Atenção à profundidade abaixo de 90 graus',
        },
      ],
    });

    await db.saveActiveWorkout(session);
    const restored = await db.getActiveWorkout();

    assert.ok(restored);
    const targetSet = restored.session.exercises[0].sets[0];
    assert.strictEqual(targetSet.weight, 102.5);
    assert.strictEqual(targetSet.reps, 5);
    assert.strictEqual(targetSet.rpe, 8.5);
    assert.strictEqual(restored.session.exercises[0].targetRestSeconds, 120);
    assert.strictEqual(restored.session.exercises[0].notes, 'Atenção à profundidade abaixo de 90 graus');
  });

  // 4. Restaurar temporizador considerando tempo transcorrido
  await t.test('4. Restaurar temporizador considerando tempo real transcorrido', async () => {
    const baseTime = 1700000000000;

    // 4.1 Timer ativo com tempo restante
    const runningTimer: PersistedRestTimerState = {
      isOpen: true,
      timeLeft: 60,
      totalTime: 90,
      isRunning: true,
      nextExerciseName: 'Crucifixo',
      nextSetNumber: 2,
      isMinimized: true,
      savedAt: baseTime,
    };
    // 25 segundos depois
    const restoredRunning = reconstructRestTimer(runningTimer, baseTime + 25000);
    assert.ok(restoredRunning);
    assert.strictEqual(restoredRunning.isOpen, true);
    assert.strictEqual(restoredRunning.timeLeft, 35);
    assert.strictEqual(restoredRunning.isRunning, true);
    assert.strictEqual(restoredRunning.isMinimized, true);
    assert.strictEqual(restoredRunning.nextExerciseName, 'Crucifixo');

    // 4.2 Timer ativo que expirou enquanto o app estava fechado
    const restoredExpired = reconstructRestTimer(runningTimer, baseTime + 75000);
    assert.ok(restoredExpired);
    assert.strictEqual(restoredExpired.isOpen, false, 'Timer expirado não deve reabrir modal');
    assert.strictEqual(restoredExpired.timeLeft, 0, 'Tempo restante não deve ser negativo');
    assert.strictEqual(restoredExpired.isRunning, false);

    // 4.3 Timer pausado não decrementa tempo transcorrido
    const pausedTimer: PersistedRestTimerState = {
      isOpen: true,
      timeLeft: 40,
      totalTime: 60,
      isRunning: false,
      isMinimized: false,
      savedAt: baseTime,
    };
    const restoredPaused = reconstructRestTimer(pausedTimer, baseTime + 100000);
    assert.ok(restoredPaused);
    assert.strictEqual(restoredPaused.isOpen, true);
    assert.strictEqual(restoredPaused.timeLeft, 40);
    assert.strictEqual(restoredPaused.isRunning, false);

    // 4.4 PersistedTimer nulo ou fechado
    const closedResult = reconstructRestTimer({
      isOpen: false,
      timeLeft: 10,
      totalTime: 60,
      isRunning: false,
      isMinimized: false,
      savedAt: baseTime,
    });
    assert.strictEqual(closedResult, null);
    assert.strictEqual(reconstructRestTimer(null), null);
  });

  // 5. Limpar sessão ao cancelar
  await t.test('5. Limpar sessão ao cancelar treino', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);

    const session = createSampleActiveSession();
    await manager.scheduleSave(session);
    await manager.waitForPendingOperations();

    const beforeCancel = await manager.restore();
    assert.ok(beforeCancel, 'Sessão deve existir antes do cancelamento');

    await manager.clear();
    await manager.waitForPendingOperations();

    const afterCancel = await manager.restore();
    assert.strictEqual(afterCancel, null, 'Sessão deve ser nula após cancelamento');
  });

  await t.test('5.1 Falha ao excluir mantém o treino e permite tentar cancelar novamente', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);
    const session = createSampleActiveSession();
    await manager.scheduleSave(session);
    await manager.waitForPendingOperations();

    memoryFactory.simulateClearFailureOnce = true;
    await assert.rejects(manager.clear(), /Simulated active workout deletion failure/);
    assert.strictEqual(manager.isSessionTerminated(), false);
    assert.deepStrictEqual((await manager.restore())?.session, session);

    await manager.clear();
    assert.strictEqual(await manager.restore(), null);
    assert.strictEqual(manager.isSessionTerminated(), true);
  });

  // 6. Limpar sessão ao finalizar
  await t.test('6. Limpar sessão e persistir histórico atomicamente ao finalizar', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const session = createSampleActiveSession();

    await db.saveActiveWorkout(session);
    assert.ok(await db.getActiveWorkout());

    const summary: CompletedSessionSummary = {
      id: 'sess-test-finalized-1',
      date: '2026-11-06',
      routineTitle: session.routineTitle,
      durationSeconds: 2400,
      totalVolumeKg: 1120,
      setsCount: 2,
      repsCount: 18,
      xpEarned: 350,
      prsAchieved: [],
      personalRecords: [],
      exerciseDetails: [],
    };

    await db.completeWorkoutTransaction(summary);

    const activeAfterFinish = await db.getActiveWorkout();
    assert.strictEqual(activeAfterFinish, null, 'Treino ativo deve ter sido removido');

    const history = await db.getHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].id, 'sess-test-finalized-1');
  });

  // 7. Reabrir após finalização sem duplicar histórico ou recompensas
  await t.test('7. Reabrir app após finalização sem duplicar histórico ou treino ativo', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);

    const session = createSampleActiveSession();
    await manager.scheduleSave(session);
    await manager.waitForPendingOperations();

    const summary: CompletedSessionSummary = {
      id: 'sess-completed-reopen',
      date: '2026-11-06',
      routineTitle: session.routineTitle,
      durationSeconds: 1800,
      totalVolumeKg: 1200,
      setsCount: 3,
      repsCount: 24,
      xpEarned: 350,
      prsAchieved: [],
      personalRecords: [],
      exerciseDetails: [],
    };

    await manager.completeWorkout(summary);
    await manager.waitForPendingOperations();

    // Simula reload do app: restaura estado
    const restoredActive = await manager.restore();
    assert.strictEqual(restoredActive, null, 'Não deve reabrir treino já finalizado');

    const historyList = await db.getHistory();
    assert.strictEqual(historyList.length, 1, 'Histórico deve conter exatamente 1 registro');
  });

  // 8. Migração do IndexedDB sem perda dos dados anteriores
  await t.test('8. Migração do banco preserva dados existentes de rotinas, exercícios e histórico', async () => {
    const memoryFactory = createMemoryIdbFactory(1);
    // Cria dados em versão 1
    const routinesMap = memoryFactory._storeData.set('routines', new Map()).get('routines')!;
    const exercisesMap = memoryFactory._storeData.set('exercises', new Map()).get('exercises')!;
    const historyMap = memoryFactory._storeData.set('history', new Map()).get('history')!;

    routinesMap.set('r1', { id: 'r1', title: 'Custom Routine 1' });
    exercisesMap.set('e1', { id: 'e1', name: 'Custom Exercise 1' });
    historyMap.set('h1', { id: 'h1', routineTitle: 'Old Session 1' });

    // Instancia o banco versão 2 com a nova store active_workout
    const db = createFitFlowDatabase(memoryFactory as any);
    await db.getRoutines();

    // Salva treino ativo na nova store da v2
    const session = createSampleActiveSession();
    await db.saveActiveWorkout(session);

    // Valida que os dados legados continuam 100% preservados
    assert.strictEqual(routinesMap.get('r1')?.title, 'Custom Routine 1');
    assert.strictEqual(exercisesMap.get('e1')?.name, 'Custom Exercise 1');
    assert.strictEqual(historyMap.get('h1')?.routineTitle, 'Old Session 1');

    const active = await db.getActiveWorkout();
    assert.ok(active);
    assert.strictEqual(active.session.routineTitle, 'Push Hypertrophy');
  });

  // 9. Falhas de persistência e recuperação
  await t.test('9. Resiliência a falhas de persistência e proteção de hidratação', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);

    // 9.1 Proteção contra hidratação incompleta: não sobrescreve sessão existente com null antes de carregar
    manager.setHydrated(false);
    await manager.scheduleSave(null);
    assert.strictEqual(manager.getHydrated(), false);

    // 9.2 Sessão marcada como finished nunca é salva
    manager.setHydrated(true);
    const finishedSession = createSampleActiveSession({ isFinished: true });
    await manager.scheduleSave(finishedSession);
    const restoredFinished = await manager.restore();
    assert.strictEqual(restoredFinished, null, 'Sessão finalizada não deve ser gravada no active_workout');

    // 9.3 Concorrência: fila serializada de saves sucessivos
    const s1 = createSampleActiveSession({ totalVolumeMovedKg: 100 });
    const s2 = createSampleActiveSession({ totalVolumeMovedKg: 200 });
    const s3 = createSampleActiveSession({ totalVolumeMovedKg: 300 });

    await Promise.all([
      manager.scheduleSave(s1),
      manager.scheduleSave(s2),
      manager.scheduleSave(s3),
    ]);
    await manager.waitForPendingOperations();

    const latest = await manager.restore();
    assert.ok(latest);
    assert.strictEqual(latest.session.totalVolumeMovedKg, 300, 'Último estado enfileirado deve prevalecer');
  });

  await t.test('9.1 Falha de gravação é comunicada e uma gravação posterior recupera a persistência', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    const saveStatus: string[] = [];
    manager.setHydrated(true);
    manager.setSaveErrorHandler(() => saveStatus.push('error'));
    manager.setSaveSuccessHandler(() => saveStatus.push('success'));
    await db.getActiveWorkout();
    memoryFactory.simulateSaveFailureOnce = true;

    await assert.doesNotReject(manager.scheduleSave(createSampleActiveSession()));
    assert.deepStrictEqual(saveStatus, ['error']);
    assert.strictEqual(await db.getActiveWorkout(), null);

    await manager.scheduleSave(createSampleActiveSession({ totalVolumeMovedKg: 900 }));
    assert.deepStrictEqual(saveStatus, ['error', 'success']);
    assert.strictEqual((await db.getActiveWorkout())?.session.totalVolumeMovedKg, 900);
  });

  // 10. Concorrência: Gravações pendentes durante finalização
  await t.test('10. Gravações pendentes durante finalização não recriam a sessão após seu término', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);

    const baseSession = createSampleActiveSession();
    await manager.scheduleSave(baseSession);

    // Enfileira atualizações rápidas simulando usuário clicando séries
    const update1 = createSampleActiveSession({ totalVolumeMovedKg: 1200 });
    const update2 = createSampleActiveSession({ totalVolumeMovedKg: 1300 });
    const update3 = createSampleActiveSession({ totalVolumeMovedKg: 1400 });

    manager.scheduleSave(update1);
    manager.scheduleSave(update2);
    manager.scheduleSave(update3);

    // Finalização acionada imediatamente enquanto gravações estavam enfileiradas
    const summary: CompletedSessionSummary = {
      id: `sess-${baseSession.startTime}`,
      date: '2026-11-06',
      routineTitle: baseSession.routineTitle,
      durationSeconds: 1900,
      totalVolumeKg: 1400,
      setsCount: 3,
      repsCount: 20,
      xpEarned: 350,
      prsAchieved: [],
      personalRecords: [],
      exerciseDetails: [],
    };

    await manager.completeWorkout(summary);
    await manager.waitForPendingOperations();

    // Nenhuma gravação pendente pode ter recriado o registro ativo
    const activeSessionInDb = await db.getActiveWorkout();
    assert.strictEqual(activeSessionInDb, null, 'O treino ativo deve ser nulo no banco após finalização');

    // O histórico deve conter a sessão finalizada
    const history = await db.getHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].id, `sess-${baseSession.startTime}`);

    // Tentativa subsequente de salvar a mesma sessão é sumariamente ignorada
    await manager.scheduleSave(createSampleActiveSession({ totalVolumeMovedKg: 9999 }));
    await manager.waitForPendingOperations();
    assert.strictEqual(await db.getActiveWorkout(), null, 'Sessão finalizada permanece bloqueada contra gravação');
  });

  // 11. Concorrência: Cancelamento descarta gravações pendentes
  await t.test('11. Cancelamento descarta imediatamente gravações pendentes e impede gravações posteriores', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);

    const baseSession = createSampleActiveSession();
    await manager.scheduleSave(baseSession);

    // Enfileira alterações
    manager.scheduleSave(createSampleActiveSession({ totalVolumeMovedKg: 500 }));
    manager.scheduleSave(createSampleActiveSession({ totalVolumeMovedKg: 600 }));

    // Usuário confirma cancelamento
    await manager.clear();
    await manager.waitForPendingOperations();

    assert.strictEqual(await db.getActiveWorkout(), null, 'Sessão deve ter sido removida do IndexedDB');
    assert.strictEqual(manager.isSessionTerminated(), true);

    // Nenhuma gravação tardia pode recriar a sessão descartada
    await manager.scheduleSave(createSampleActiveSession({ totalVolumeMovedKg: 700 }));
    await manager.waitForPendingOperations();
    assert.strictEqual(await db.getActiveWorkout(), null, 'Nenhuma gravação tardia recria a sessão cancelada');
  });

  // 12. Falha de transação com rollback automático e preservação de sessão
  await t.test('12. Falha na transação de finalização executa rollback, preserva o treino ativo e permite retry', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);

    const session = createSampleActiveSession({ totalVolumeMovedKg: 850 });
    await manager.scheduleSave(session);
    await manager.waitForPendingOperations(); // Garante conclusão da gravação inicial

    const summary: CompletedSessionSummary = {
      id: `sess-${session.startTime}`,
      date: '2026-11-06',
      routineTitle: session.routineTitle,
      durationSeconds: 1500,
      totalVolumeKg: 850,
      setsCount: 2,
      repsCount: 16,
      xpEarned: 350,
      prsAchieved: [],
      personalRecords: [],
      exerciseDetails: [],
    };

    // Força falha transacional no IndexedDB (ex: erro de disco ou abort)
    memoryFactory.simulateCompleteWorkoutAbortOnce = true;

    await assert.rejects(
      async () => {
        await manager.completeWorkout(summary);
      },
      /Simulated transaction failure/,
      'A finalização deve rejeitar a promessa quando a transação sofrer rollback',
    );

    // Rollback verificado: treino ativo NÃO pode ter sido deletado
    const preservedActive = await db.getActiveWorkout();
    assert.ok(preservedActive, 'Treino ativo deve continuar salvo no IndexedDB após rollback');
    assert.strictEqual(preservedActive.session.totalVolumeMovedKg, 850);

    // Histórico NÃO pode ter recebido gravação fantasma
    const historyAfterFailure = await db.getHistory();
    assert.strictEqual(historyAfterFailure.length, 0, 'Histórico deve estar vazio após rollback');

    // A flag de terminação deve ter sido revertida para permitir novas tentativas
    assert.strictEqual(manager.isSessionTerminated(), false, 'Terminação deve ser false para permitir retry');

    // Retry agora com o armazenamento estável
    await manager.completeWorkout(summary);
    await manager.waitForPendingOperations();

    // Verificação pós-retry: treino ativo foi removido e histórico registrado com sucesso
    assert.strictEqual(await db.getActiveWorkout(), null, 'Treino ativo foi limpo após retry bem-sucedido');
    const historyAfterRetry = await db.getHistory();
    assert.strictEqual(historyAfterRetry.length, 1);
    assert.strictEqual(historyAfterRetry[0].id, `sess-${session.startTime}`);
  });

  // 13. Idempotência estrita em retentativas de finalização
  await t.test('13. Histórico é estritamente idempotente em chamadas repetidas de finalização', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);

    const session = createSampleActiveSession();
    await manager.scheduleSave(session);
    await manager.waitForPendingOperations();

    const summary: CompletedSessionSummary = {
      id: `sess-${session.startTime}`,
      date: '2026-11-06',
      routineTitle: session.routineTitle,
      durationSeconds: 1800,
      totalVolumeKg: 1000,
      setsCount: 3,
      repsCount: 25,
      xpEarned: 350,
      prsAchieved: [],
      personalRecords: [],
      exerciseDetails: [],
    };

    // Primeira conclusão
    await manager.completeWorkout(summary);
    const history1 = await db.getHistory();
    assert.strictEqual(history1.length, 1);

    // Simulação de segunda execução idêntica (retry ou duplo envio)
    await db.completeWorkoutTransaction(summary);
    const history2 = await db.getHistory();
    assert.strictEqual(history2.length, 1, 'Histórico deve conter exatamente 1 registro (idempotência preservada)');
  });

  // 14. Integridade da aplicação: falha de finalização preserva XP, nível e sessão em memória
  await t.test('14. Falha na finalização preserva estatísticas e sessão em memória sem conceder XP indevido', async () => {
    const memoryFactory = createMemoryIdbFactory();
    const db = createFitFlowDatabase(memoryFactory as any);
    const manager = new ActiveWorkoutPersistenceManager(db);
    manager.setHydrated(true);

    let activeSessionInMemory: ActiveWorkoutSession | null = createSampleActiveSession({ totalVolumeMovedKg: 750 });
    await manager.scheduleSave(activeSessionInMemory);
    await manager.waitForPendingOperations(); // Garante gravação inicial concluída

    let userStats: UserStats = {
      level: 14,
      currentXP: 6450,
      xpForNextLevel: 8000,
      streakDays: 3,
      lastWorkoutDate: '2026-11-05',
      streakFrozenToday: false,
      totalWorkoutsCompleted: 10,
      totalLifetimeVolumeKg: 50000,
      streakHistory: [false, false, false, false, false, false, true],
    };

    let completedSessionsInMemory: CompletedSessionSummary[] = [];

    const summary: CompletedSessionSummary = {
      id: `sess-${activeSessionInMemory.startTime}`,
      date: '2026-11-06',
      routineTitle: activeSessionInMemory.routineTitle,
      durationSeconds: 1200,
      totalVolumeKg: 750,
      setsCount: 2,
      repsCount: 15,
      xpEarned: 350,
      prsAchieved: [],
      personalRecords: [],
      exerciseDetails: [],
    };

    const xpEarned = 350;
    const progression = addExperience(userStats, xpEarned);
    const updatedStats: UserStats = {
      ...userStats,
      level: progression.level,
      currentXP: progression.currentXP,
      xpForNextLevel: progression.xpForNextLevel,
      streakDays: calculateRealStreak([summary, ...completedSessionsInMemory], '2026-11-06'),
      lastWorkoutDate: '2026-11-06',
      totalWorkoutsCompleted: userStats.totalWorkoutsCompleted + 1,
      totalLifetimeVolumeKg: userStats.totalLifetimeVolumeKg + 750,
      streakHistory: updateStreakHistory(userStats.streakHistory, userStats.lastWorkoutDate, '2026-11-06'),
    };

    // Simula falha no banco de dados na primeira tentativa
    memoryFactory.simulateAbortOnce = true;

    let finishFailed = false;
    try {
      await manager.completeWorkout(summary);
      // O código de produção só executa se a linha acima resolver:
      userStats = updatedStats;
      completedSessionsInMemory = [summary, ...completedSessionsInMemory];
      activeSessionInMemory = null;
    } catch {
      finishFailed = true;
      // Trata erro sem alterar estatísticas nem destruir a sessão em memória
    }

    assert.strictEqual(finishFailed, true);
    // Verificações de integridade: nada foi alterado!
    assert.strictEqual(userStats.currentXP, 6450, 'XP não deve ser concedido em caso de falha de persistência');
    assert.strictEqual(userStats.level, 14, 'Nível não deve ser alterado');
    assert.strictEqual(userStats.totalWorkoutsCompleted, 10, 'Contagem de treinos não deve ser incrementada');
    assert.ok(activeSessionInMemory, 'Treino em memória deve continuar preservado');
    assert.strictEqual(activeSessionInMemory.totalVolumeMovedKg, 750);
    assert.strictEqual(completedSessionsInMemory.length, 0);

    // Agora simula o usuário clicando novamente em "Finalizar Treino" (Retry)
    try {
      await manager.completeWorkout(summary);
      userStats = updatedStats;
      completedSessionsInMemory = [summary, ...completedSessionsInMemory.filter(s => s.id !== summary.id)];
      activeSessionInMemory = null;
    } catch {
      assert.fail('Retry não deveria falhar');
    }

    // Pós-retry com sucesso: estatísticas atualizadas exatamente uma vez
    assert.strictEqual(userStats.currentXP, 6800, 'XP deve ser creditado exatamente uma vez');
    assert.strictEqual(userStats.level, 14);
    assert.strictEqual(userStats.totalWorkoutsCompleted, 11);
    assert.strictEqual(activeSessionInMemory, null, 'Sessão em memória limpa somente após sucesso');
    assert.strictEqual(completedSessionsInMemory.length, 1);
  });
});
