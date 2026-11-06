import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDemoSession,
  filterRealSessions,
  calculateRealTotalVolume,
  calculateRealSessionCount,
  calculateRealTotalXp,
  extractRealPersonalRecords,
  calculateRealStreak,
  extractRealFrequentExercises,
  KNOWN_DEMO_SESSION_IDS,
  buildRealExercisePeaks,
  buildRealExerciseProgression,
  calculateRealWeeklyVolume,
  getLastRealMuscleStimulus,
} from './workoutHistory';
import { FitFlowDatabase, createFitFlowDatabase } from '../db/indexedDb';
import { CompletedSessionSummary, Exercise, WorkoutRoutine } from '../types/workout';

// Mock in-memory IndexedDB factory to test IndexedDB operations deterministically in Node.js
function createMemoryIdbFactory() {
  const storeData = new Map<string, Map<string, any>>();

  function getOrCreateStoreMap(storeName: string): Map<string, any> {
    if (!storeData.has(storeName)) {
      storeData.set(storeName, new Map());
    }
    return storeData.get(storeName)!;
  }

  const factory = {
    _storeData: storeData,
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
            getOrCreateStoreMap(sName);
            return {
              createIndex: () => {},
            };
          },
          transaction(stores: string | string[], mode: 'readonly' | 'readwrite') {
            const storeList = Array.isArray(stores) ? stores : [stores];
            const tx: any = {
              mode,
              oncomplete: null,
              onerror: null,
              objectStore(sName: string) {
                const map = getOrCreateStoreMap(sName);
                return {
                  get(key: string) {
                    const req: any = { result: map.get(key), onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                    return req;
                  },
                  getAll() {
                    const req: any = { result: Array.from(map.values()), onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                    return req;
                  },
                  count() {
                    const req: any = { result: map.size, onsuccess: null, onerror: null };
                    setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                    return req;
                  },
                  put(val: any) {
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
              },
            };

            setTimeout(() => {
              if (tx.oncomplete) tx.oncomplete();
            }, 10);

            return tx;
          },
        };

        if (openReq.onupgradeneeded) {
          openReq.onupgradeneeded({ target: { result: fakeDb } });
        }

        openReq.result = fakeDb;
        if (openReq.onsuccess) {
          openReq.onsuccess({ target: openReq });
        }
      }, 0);

      return openReq;
    },
  };

  return factory as unknown as IDBFactory & { _storeData: Map<string, Map<string, any>> };
}

const mockRealSession1: CompletedSessionSummary = {
  id: 'sess-1730880000000',
  date: '2026-11-05',
  routineTitle: 'Supino & Peitorais Real',
  durationSeconds: 2700,
  totalVolumeKg: 8500,
  setsCount: 15,
  repsCount: 120,
  xpEarned: 350,
  prsAchieved: ['Supino Reto 85kg × 8'],
};

const mockRealSession2: CompletedSessionSummary = {
  id: 'sess-1730966400000',
  date: '2026-11-06',
  routineTitle: 'Costas & Bíceps Real',
  durationSeconds: 3000,
  totalVolumeKg: 9200,
  setsCount: 16,
  repsCount: 130,
  xpEarned: 350,
  prsAchieved: ['Remada Curvada 75kg × 10'],
};

const mockLegacyDemoSession1: CompletedSessionSummary = {
  id: 'sess-seed-1',
  date: '2026-10-30',
  routineTitle: 'Push Alfa: Hipertrofia & Ombros',
  durationSeconds: 3120,
  totalVolumeKg: 10450,
  setsCount: 17,
  repsCount: 154,
  xpEarned: 350,
  prsAchieved: ['Supino Reto 90kg × 8'],
};

const mockLegacyDemoSession2: CompletedSessionSummary = {
  id: 'sess-seed-2',
  date: '2026-10-28',
  routineTitle: 'Leg Hiper-Drive: Quadríceps & Glúteos',
  durationSeconds: 3400,
  totalVolumeKg: 13500,
  setsCount: 18,
  repsCount: 168,
  xpEarned: 400,
  prsAchieved: ['Agachamento 120kg × 6'],
};

test('1. Inicialização de um banco vazio sem inserção de sessões fictícias', async () => {
  const idb = createMemoryIdbFactory();
  const db = createFitFlowDatabase(idb);

  const history = await db.getHistory();
  assert.equal(Array.isArray(history), true);
  assert.equal(history.length, 0, 'O histórico de uma instalação limpa deve iniciar vazio');

  const historyStoreMap = idb._storeData.get('history');
  assert.ok(historyStoreMap);
  assert.equal(historyStoreMap.has('sess-seed-1'), false);
  assert.equal(historyStoreMap.has('sess-seed-2'), false);
  assert.equal(historyStoreMap.size, 0);
});

test('2. Persistência de uma sessão real', async () => {
  const idb = createMemoryIdbFactory();
  const db = createFitFlowDatabase(idb);

  await db.addHistory(mockRealSession1);

  const history = await db.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, mockRealSession1.id);
  assert.equal(history[0].routineTitle, mockRealSession1.routineTitle);
  assert.equal(history[0].totalVolumeKg, mockRealSession1.totalVolumeKg);
});

test('3. Recuperação de sessões reais após reinicialização', async () => {
  const idb = createMemoryIdbFactory();
  const firstInstance = createFitFlowDatabase(idb);

  await firstInstance.addHistory(mockRealSession1);
  await firstInstance.addHistory(mockRealSession2);

  // Simula reinicialização do app / reabertura da conexão
  const restartedInstance = createFitFlowDatabase(idb);
  const history = await restartedInstance.getHistory();

  assert.equal(history.length, 2);
  // Ordenado por data mais recente primeiro
  assert.equal(history[0].id, mockRealSession2.id);
  assert.equal(history[1].id, mockRealSession1.id);
  assert.equal(history.some((s) => isDemoSession(s)), false);
});

test('4. Tratamento de registros demonstrativos antigos, quando aplicável', async () => {
  const idb = createMemoryIdbFactory();
  const historyMap = idb._storeData.get('history') || new Map();
  idb._storeData.set('history', historyMap);

  // Injeta registros antigos de seeds fictícios no banco simulando instalação existente
  historyMap.set(mockLegacyDemoSession1.id, mockLegacyDemoSession1);
  historyMap.set(mockLegacyDemoSession2.id, mockLegacyDemoSession2);

  assert.equal(historyMap.size, 2);

  // Inicializa o banco (deve executar a migração automática e idempotente)
  const db = createFitFlowDatabase(idb);
  const history = await db.getHistory();

  assert.equal(history.length, 0, 'Sessões demonstrativas antigas devem ter sido removidas');
  assert.equal(historyMap.has('sess-seed-1'), false);
  assert.equal(historyMap.has('sess-seed-2'), false);
});

test('5. Preservação de sessões legítimas durante migrações', async () => {
  const idb = createMemoryIdbFactory();
  const historyMap = idb._storeData.get('history') || new Map();
  idb._storeData.set('history', historyMap);

  // Injeta sessões legítimas misturadas com sessões fictícias
  historyMap.set(mockLegacyDemoSession1.id, mockLegacyDemoSession1);
  historyMap.set(mockRealSession1.id, mockRealSession1);
  historyMap.set(mockLegacyDemoSession2.id, mockLegacyDemoSession2);
  historyMap.set(mockRealSession2.id, mockRealSession2);

  assert.equal(historyMap.size, 4);

  const db = createFitFlowDatabase(idb);
  const history = await db.getHistory();

  assert.equal(history.length, 2, 'Apenas as 2 sessões legítimas devem ser preservadas');
  assert.deepEqual(history.map((s) => s.id).sort(), [mockRealSession1.id, mockRealSession2.id].sort());

  // Garante que todos os dados da sessão real continuam íntegros
  const foundSession1 = history.find((s) => s.id === mockRealSession1.id);
  assert.ok(foundSession1);
  assert.equal(foundSession1.totalVolumeKg, 8500);
  assert.equal(foundSession1.durationSeconds, 2700);
  assert.deepEqual(foundSession1.prsAchieved, ['Supino Reto 85kg × 8']);
});

test('6. Exclusão de dados demonstrativos dos cálculos de estatísticas', () => {
  const mixedSessions = [
    mockLegacyDemoSession1,
    mockRealSession1,
    mockLegacyDemoSession2,
    mockRealSession2,
  ];

  // Cálculo de volume total
  const realVolume = calculateRealTotalVolume(mixedSessions);
  const expectedVolume = mockRealSession1.totalVolumeKg + mockRealSession2.totalVolumeKg;
  assert.equal(realVolume, expectedVolume);
  assert.equal(realVolume, 8500 + 9200);

  // Contagem de sessões
  const realCount = calculateRealSessionCount(mixedSessions);
  assert.equal(realCount, 2);

  // Total de XP
  const realXp = calculateRealTotalXp(mixedSessions);
  assert.equal(realXp, mockRealSession1.xpEarned + mockRealSession2.xpEarned);
  assert.equal(realXp, 350 + 350);
});

test('7. Exclusão de dados demonstrativos dos cálculos de recordes e streak', () => {
  const mixedSessions = [
    mockLegacyDemoSession1,
    mockRealSession1,
    mockLegacyDemoSession2,
    mockRealSession2,
  ];

  // Recordes Pessoais (PRs)
  const realPRs = extractRealPersonalRecords(mixedSessions);
  assert.equal(realPRs.includes('Supino Reto 85kg × 8'), true);
  assert.equal(realPRs.includes('Remada Curvada 75kg × 10'), true);
  assert.equal(realPRs.includes('Supino Reto 90kg × 8'), false, 'PR da sessão demo Push Alfa deve ser excluído');
  assert.equal(realPRs.includes('Agachamento 120kg × 6'), false, 'PR da sessão demo Leg Hiper-Drive deve ser excluído');

  // Streak
  // mockRealSession1 é 2026-11-05 e mockRealSession2 é 2026-11-06 (2 dias consecutivos até 2026-11-06)
  const streakWithReal = calculateRealStreak(mixedSessions, '2026-11-06');
  assert.equal(streakWithReal, 2);

  // Se houvesse apenas sessões demo de outubro (2026-10-28 e 2026-10-30), streak em 2026-11-06 deve ser 0
  const demoOnlyStreak = calculateRealStreak([mockLegacyDemoSession1, mockLegacyDemoSession2], '2026-11-06');
  assert.equal(demoOnlyStreak, 0);
});

test('8. Idempotência da migração de banco', async () => {
  const idb = createMemoryIdbFactory();
  const historyMap = idb._storeData.get('history') || new Map();
  idb._storeData.set('history', historyMap);

  historyMap.set(mockLegacyDemoSession1.id, mockLegacyDemoSession1);
  historyMap.set(mockLegacyDemoSession2.id, mockLegacyDemoSession2);
  historyMap.set(mockRealSession1.id, mockRealSession1);

  const db = createFitFlowDatabase(idb);

  // Primeira execução da migração
  const openResult1 = await db.getHistory();
  assert.equal(openResult1.length, 1);
  assert.equal(openResult1[0].id, mockRealSession1.id);
  assert.equal(historyMap.size, 1);

  // Segunda execução da migração na mesma base
  db.resetConnection();
  const openResult2 = await db.getHistory();
  assert.equal(openResult2.length, 1);
  assert.equal(openResult2[0].id, mockRealSession1.id);
  assert.equal(historyMap.size, 1);

  // Terceira execução explícita
  db.resetConnection();
  const openResult3 = await db.getHistory();
  assert.equal(openResult3.length, 1);
  assert.equal(openResult3[0].id, mockRealSession1.id);
  assert.equal(historyMap.size, 1);
});

const analyticsSession = (
  id: string,
  date: string,
  totalVolumeKg: number,
  exerciseDetails?: CompletedSessionSummary['exerciseDetails'],
): CompletedSessionSummary => ({
  id,
  date,
  routineTitle: 'Real workout',
  durationSeconds: 1800,
  totalVolumeKg,
  setsCount: exerciseDetails?.reduce((sum, exercise) => sum + exercise.sets.length, 0) || 0,
  repsCount: 0,
  xpEarned: 0,
  prsAchieved: [],
  exerciseDetails,
});

test('9. Indicadores ficam vazios sem sessões reais', () => {
  const weekly = calculateRealWeeklyVolume([], '2026-11-06');
  assert.equal(weekly.length, 7);
  assert.equal(weekly.reduce((sum, day) => sum + day.volumeKg, 0), 0);
  assert.deepEqual(buildRealExerciseProgression([], 'bench_press'), []);
  assert.deepEqual(buildRealExercisePeaks([]), []);
  assert.equal(getLastRealMuscleStimulus([], 'chest'), null);
});

test('10. Progressão usa uma sessão real e séries registradas, sem fabricar pontos', () => {
  const session = analyticsSession('real-1', '2026-11-05', 240, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 60, reps: 8 }, { weight: 65, reps: 6 }],
  }]);

  assert.deepEqual(buildRealExerciseProgression([session], 'bench_press'), [
    { date: '2026-11-05', weightKg: 65, reps: 6 },
  ]);
  assert.deepEqual(buildRealExerciseProgression([session], 'barbell_squat'), []);
});

test('11. Progressão ordena sessões cronologicamente e ignora sessões demo misturadas', () => {
  const earlier = analyticsSession('real-early', '2026-11-01', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 50, reps: 10 }],
  }]);
  const later = analyticsSession('real-late', '2026-11-05', 200, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 70, reps: 5 }],
  }]);
  const demo = {
    ...analyticsSession('fake', '2026-11-03', 50000, [{
      exerciseId: 'bench_press',
      primaryMuscle: 'chest' as const,
      sets: [{ weight: 250, reps: 10 }],
    }]),
    isDemo: true,
  };

  assert.deepEqual(buildRealExerciseProgression([later, demo, earlier], 'bench_press'), [
    { date: '2026-11-01', weightKg: 50, reps: 10 },
    { date: '2026-11-05', weightKg: 70, reps: 5 },
  ]);
});

test('12. Volume semanal usa somente sessões reais dentro dos últimos sete dias', () => {
  const inRangeA = analyticsSession('weekly-a', '2026-11-01', 1200);
  const inRangeB = analyticsSession('weekly-b', '2026-11-03', 3400);
  const outsideRange = analyticsSession('old', '2026-10-30', 9000);
  const future = analyticsSession('future', '2026-11-07', 8000);
  const demo = { ...analyticsSession('fake', '2026-11-02', 50000), isDemo: true };

  const weekly = calculateRealWeeklyVolume([inRangeA, outsideRange, demo, inRangeB, future], '2026-11-06');
  assert.equal(weekly.length, 7);
  assert.equal(weekly[0].date, '2026-10-31');
  assert.equal(weekly.reduce((sum, day) => sum + day.volumeKg, 0), 4600);
  assert.equal(weekly.reduce((sum, day) => sum + day.sessionCount, 0), 2);
  assert.equal(weekly.find((day) => day.date === '2026-11-01')?.volumeKg, 1200);
  assert.equal(weekly.find((day) => day.date === '2026-11-03')?.volumeKg, 3400);
});

test('13. Séries insuficientes não geram progressão, recordes ou estado de recuperação', () => {
  const summaryOnly = analyticsSession('legacy-real', '2026-11-05', 5000);
  assert.deepEqual(buildRealExerciseProgression([summaryOnly], 'bench_press'), []);
  assert.deepEqual(buildRealExercisePeaks([summaryOnly]), []);
  assert.equal(getLastRealMuscleStimulus([summaryOnly], 'chest'), null);
});

test('14. Último estímulo muscular depende de detalhes reais e ignora demos', () => {
  const older = analyticsSession('chest-old', '2026-11-01', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps'],
    sets: [{ weight: 40, reps: 10 }],
  }]);
  const latest = analyticsSession('chest-new', '2026-11-05', 100, [{
    exerciseId: 'press', primaryMuscle: 'shoulders', secondaryMuscles: ['chest'], sets: [{ weight: 20, reps: 8 }],
  }]);
  const demo = {
    ...analyticsSession('chest-fake', '2026-11-06', 99999, [{
      exerciseId: 'bench_press', primaryMuscle: 'chest' as const, sets: [{ weight: 300, reps: 1 }],
    }]),
    isDemo: true,
  };

  assert.equal(getLastRealMuscleStimulus([older, latest, demo], 'chest'), '2026-11-05');
  assert.equal(getLastRealMuscleStimulus([older, latest, demo], 'quads'), null);
});
