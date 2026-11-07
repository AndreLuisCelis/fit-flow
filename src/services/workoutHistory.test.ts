import assert from 'node:assert/strict';
import test from 'node:test';
import './userProgression.test';
import './activeWorkoutPersistence.test';
import {
  isDemoSession,
  filterRealSessions,
  calculateRealTotalVolume,
  calculateRealSessionCount,
  calculateRealTotalXp,
  extractRealPersonalRecords,
  calculateRealStreak,
  calculateRealStreakHistory,
  diffCalendarDays,
  extractRealFrequentExercises,
  getLocalDateString,
  updateStreakHistory,
  KNOWN_DEMO_SESSION_IDS,
  buildRealExercisePeaks,
  buildRealExerciseProgression,
  calculateRealWeeklyVolume,
  getLastRealMuscleStimulus,
  calculatePersonalRecordAchievements,
  extractRealPersonalRecordAchievements,
  formatPersonalRecordAchievements,
  getPersonalRecordType,
  getRealExercisePreviousBest,
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

test('PRs só são concedidos ao superar séries reais e comparáveis do mesmo exercício', () => {
  const earlierHistory = analyticsSession('pr-history-early', '2026-10-25', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 75, reps: 8 }],
  }]);
  const latestHistory = analyticsSession('pr-history-late', '2026-11-01', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 80, reps: 8 }],
  }]);
  const history = [latestHistory, earlierHistory];
  const samePerformance = [{ exerciseId: 'bench_press', primaryMuscle: 'chest' as const, sets: [{ weight: 80, reps: 8 }] }];
  const improvedLoad = [{ exerciseId: 'bench_press', primaryMuscle: 'chest' as const, sets: [{ weight: 82.5, reps: 8 }] }];
  const differentExercise = [{ exerciseId: 'barbell_squat', primaryMuscle: 'quads' as const, sets: [{ weight: 100, reps: 8 }] }];

  assert.deepEqual(calculatePersonalRecordAchievements([], samePerformance, {}, '2026-11-02'), []);
  assert.deepEqual(calculatePersonalRecordAchievements(history, samePerformance, {}, '2026-11-02'), []);
  assert.deepEqual(
    calculatePersonalRecordAchievements(history, improvedLoad, { bench_press: 'Supino' }, '2026-11-02')
      .map(({ type, weightKg, reps }) => ({ type, weightKg, reps })),
    [{ type: 'load', weightKg: 82.5, reps: 8 }],
  );
  assert.deepEqual(calculatePersonalRecordAchievements(history, differentExercise, {}, '2026-11-02'), []);
});

test('Mais repetições na mesma carga é recorde; mais carga com menos reps não é falso positivo', () => {
  const history = analyticsSession('rep-history', '2026-11-01', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 80, reps: 8 }, { weight: 100, reps: 10 }],
  }]);

  const repRecord = calculatePersonalRecordAchievements([history], [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 80, reps: 9 }],
  }], {}, '2026-11-02');
  const incomparableLoad = calculatePersonalRecordAchievements([history], [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 110, reps: 8 }],
  }], {}, '2026-11-02');

  assert.deepEqual(repRecord.map(({ type, weightKg, reps }) => ({ type, weightKg, reps })), [
    { type: 'reps', weightKg: 80, reps: 9 },
  ]);
  assert.deepEqual(incomparableLoad, []);
});

test('Demos e histórico legado sem séries não contaminam a comparação de PRs', () => {
  const realHistory = analyticsSession('pr-real', '2026-11-01', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 60, reps: 8 }],
  }]);
  const demoHistory = {
    ...analyticsSession('pr-demo', '2026-11-02', 100000, [{
      exerciseId: 'bench_press',
      primaryMuscle: 'chest' as const,
      sets: [{ weight: 200, reps: 8 }],
    }]),
    isDemo: true,
  };
  const legacyHistory = analyticsSession('pr-legacy', '2026-11-03', 100);
  const current = [{ exerciseId: 'bench_press', primaryMuscle: 'chest' as const, sets: [{ weight: 70, reps: 8 }] }];

  assert.deepEqual(
    calculatePersonalRecordAchievements([realHistory, demoHistory], current, {}, '2026-11-04')
      .map(({ type }) => type),
    ['load'],
  );
  assert.deepEqual(calculatePersonalRecordAchievements([demoHistory, legacyHistory], current, {}, '2026-11-04'), []);
});

test('Séries inválidas não geram recordes e o baseline usa apenas valores reais válidos', () => {
  const history = analyticsSession('valid-history', '2026-11-01', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 80, reps: 8 }, { weight: -5, reps: 10 }, { weight: 90, reps: 8.5 }],
  }]);
  const baseline = getRealExercisePreviousBest([history], 'bench_press');

  assert.deepEqual(baseline, {
    weight: 80,
    reps: 8,
    repsByWeight: { '80': 8 },
  });
  assert.deepEqual(
    calculatePersonalRecordAchievements([history], [{
      exerciseId: 'bench_press',
      primaryMuscle: 'chest',
      sets: [{ weight: 100, reps: 8.5 }, { weight: -1, reps: 10 }],
    }], {}, '2026-11-02'),
    [],
  );
  assert.deepEqual(getPersonalRecordType({ weight: 90, reps: 7 }, baseline), []);
});

test('Resumo persiste conquistas confirmadas e a galeria não infere PRs de sessões antigas', () => {
  const history = analyticsSession('summary-history', '2026-11-01', 100, [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 80, reps: 8 }],
  }]);
  const records = calculatePersonalRecordAchievements([history], [{
    exerciseId: 'bench_press',
    primaryMuscle: 'chest',
    sets: [{ weight: 82.5, reps: 8 }],
  }], { bench_press: 'Supino' }, '2026-11-02');
  const summary = {
    ...analyticsSession('summary-new', '2026-11-02', 100),
    prsAchieved: formatPersonalRecordAchievements(records, 'pt', 'kg'),
    personalRecords: records,
  };

  assert.deepEqual(summary.prsAchieved, ['Supino — recorde de carga: 82.5 kg × 8']);
  assert.deepEqual(extractRealPersonalRecordAchievements([summary]), records);
  assert.deepEqual(extractRealPersonalRecordAchievements([{
    ...history,
    prsAchieved: ['PR legado sem evidência'],
  }]), []);
});

test('Streak: dois ou mais treinos no mesmo dia contam apenas uma vez', () => {
  const sessions = [
    analyticsSession('sess-1', '2026-11-06', 1000),
    analyticsSession('sess-2', '2026-11-06', 1500),
    analyticsSession('sess-3', '2026-11-06', 800),
  ];
  assert.equal(calculateRealStreak(sessions, '2026-11-06'), 1);

  const consecutiveWithMultiple = [
    analyticsSession('sess-y1', '2026-11-05', 1000),
    analyticsSession('sess-t1', '2026-11-06', 1500),
    analyticsSession('sess-t2', '2026-11-06', 800),
  ];
  assert.equal(calculateRealStreak(consecutiveWithMultiple, '2026-11-06'), 2);
});

test('Streak: dias consecutivos incrementam a sequência corretamente', () => {
  const sessions = [
    analyticsSession('s1', '2026-11-02', 1000),
    analyticsSession('s2', '2026-11-03', 1000),
    analyticsSession('s3', '2026-11-04', 1000),
    analyticsSession('s4', '2026-11-05', 1000),
    analyticsSession('s5', '2026-11-06', 1000),
  ];
  assert.equal(calculateRealStreak(sessions, '2026-11-06'), 5);
});

test('Streak: lacuna de um dia reinicia a sequência', () => {
  // Lacuna no dia 2026-11-05, treino hoje (2026-11-06)
  const sessions = [
    analyticsSession('s1', '2026-11-03', 1000),
    analyticsSession('s2', '2026-11-04', 1000),
    analyticsSession('s3', '2026-11-06', 1000),
  ];
  assert.equal(calculateRealStreak(sessions, '2026-11-06'), 1);
});

test('Streak: último treino ontem mantém a sequência ativa', () => {
  const sessions = [
    analyticsSession('s1', '2026-11-03', 1000),
    analyticsSession('s2', '2026-11-04', 1000),
    analyticsSession('s3', '2026-11-05', 1000),
  ];
  // Sem treino hoje (2026-11-06), último ontem (2026-11-05)
  assert.equal(calculateRealStreak(sessions, '2026-11-06'), 3);
});

test('Streak: ausência de atividade hoje e ontem zera a sequência (dois ou mais dias)', () => {
  const sessions = [
    analyticsSession('s1', '2026-11-02', 1000),
    analyticsSession('s2', '2026-11-03', 1000),
    analyticsSession('s3', '2026-11-04', 1000),
  ];
  // Último treino em 2026-11-04 (2 dias atrás em relação a 2026-11-06)
  assert.equal(calculateRealStreak(sessions, '2026-11-06'), 0);

  // Último treino há 5 dias
  assert.equal(calculateRealStreak([analyticsSession('s1', '2026-11-01', 1000)], '2026-11-06'), 0);
});

test('Streak: sessões demonstrativas são estritamente ignoradas', () => {
  const demoOnly = [
    { ...analyticsSession('sess-seed-1', '2026-11-06', 5000), isDemo: true },
    { ...analyticsSession('sess-seed-2', '2026-11-05', 5000), isDemo: true },
  ];
  assert.equal(calculateRealStreak(demoOnly, '2026-11-06'), 0);

  // Demo intercalado entre treinos reais não preenche lacuna
  const mixedGap = [
    analyticsSession('real-1', '2026-11-04', 1000),
    { ...analyticsSession('fake-seed', '2026-11-05', 5000), isDemo: true },
    analyticsSession('real-2', '2026-11-06', 1000),
  ];
  // 2026-11-05 só tem demo, então é uma lacuna real. Streak hoje deve ser 1.
  assert.equal(calculateRealStreak(mixedGap, '2026-11-06'), 1);

  // Sessões demo no mesmo dia do treino real não duplicam nem interferem
  const realPlusDemoSameDay = [
    analyticsSession('real-1', '2026-11-06', 1000),
    { ...analyticsSession('fake-1', '2026-11-06', 5000), isDemo: true },
  ];
  assert.equal(calculateRealStreak(realPlusDemoSameDay, '2026-11-06'), 1);
});

test('Streak: virada de mês e ano são calculadas corretamente', () => {
  // Virada de mês regular (31 de outubro -> 01 de novembro)
  const monthTurn = [
    analyticsSession('m1', '2026-10-30', 1000),
    analyticsSession('m2', '2026-10-31', 1000),
    analyticsSession('m3', '2026-11-01', 1000),
  ];
  assert.equal(calculateRealStreak(monthTurn, '2026-11-01'), 3);

  // Virada de mês em ano bissexto (28 e 29 de fevereiro -> 01 de março de 2024)
  const leapYearTurn = [
    analyticsSession('l1', '2024-02-28', 1000),
    analyticsSession('l2', '2024-02-29', 1000),
    analyticsSession('l3', '2024-03-01', 1000),
  ];
  assert.equal(calculateRealStreak(leapYearTurn, '2024-03-01'), 3);

  // Virada de mês em ano não-bissexto (28 de fevereiro -> 01 de março de 2023)
  const nonLeapYearTurn = [
    analyticsSession('nl1', '2023-02-28', 1000),
    analyticsSession('nl2', '2023-03-01', 1000),
  ];
  assert.equal(calculateRealStreak(nonLeapYearTurn, '2023-03-01'), 2);

  // Virada de ano (30 e 31 de dezembro de 2025 -> 01 de janeiro de 2026)
  const yearTurn = [
    analyticsSession('y1', '2025-12-30', 1000),
    analyticsSession('y2', '2025-12-31', 1000),
    analyticsSession('y3', '2026-01-01', 1000),
  ];
  assert.equal(calculateRealStreak(yearTurn, '2026-01-01'), 3);
});

test('Streak: datas locais e limites de fuso horário', () => {
  // getLocalDateString formata datas locais com zero-padding
  const sampleDate = new Date(2026, 4, 3, 23, 59, 59); // 03 de maio de 2026 às 23:59:59 local
  assert.equal(getLocalDateString(sampleDate), '2026-05-03');

  const startOfDay = new Date(2026, 0, 1, 0, 0, 1); // 01 de janeiro de 2026 às 00:00:01 local
  assert.equal(getLocalDateString(startOfDay), '2026-01-01');

  // String YYYY-MM-DD já existente é preservada sem conversões indevidas
  assert.equal(getLocalDateString('2026-11-06'), '2026-11-06');

  // Diferenças de dias são consistentes e independentes de fuso
  assert.equal(diffCalendarDays('2026-11-06', '2026-11-05'), 1);
  assert.equal(diffCalendarDays('2026-11-06', '2026-11-06'), 0);
  assert.equal(diffCalendarDays('2026-11-01', '2026-10-31'), 1);
  assert.equal(diffCalendarDays('2027-01-01', '2026-12-31'), 1);
});

test('Streak: atualização de streakHistory por dia do calendário sem duplicar o dia', () => {
  const initialHistory = [false, true, true, false, true, true, false];

  // 1. Treino no mesmo dia (dia já concluído hoje): não deve deslocar nem duplicar
  const sameDayUpdate = updateStreakHistory(initialHistory, '2026-11-06', '2026-11-06');
  assert.deepEqual(sameDayUpdate, [false, true, true, false, true, true, true]);
  assert.equal(sameDayUpdate.length, 7);

  // Outro treino adicional no mesmo dia: continua idêntico
  const sameDaySecondUpdate = updateStreakHistory(sameDayUpdate, '2026-11-06', '2026-11-06');
  assert.deepEqual(sameDaySecondUpdate, [false, true, true, false, true, true, true]);

  // 2. Treino no dia seguinte consecutivo: desloca 1 dia para a esquerda
  const nextDayUpdate = updateStreakHistory(sameDayUpdate, '2026-11-06', '2026-11-07');
  assert.deepEqual(nextDayUpdate, [true, true, false, true, true, true, true]);
  assert.equal(nextDayUpdate.length, 7);

  // 3. Treino após lacuna de 1 dia (2 dias de diferença): desloca 2 posições, inserindo false no dia pulado
  const gapUpdate = updateStreakHistory(sameDayUpdate, '2026-11-06', '2026-11-08');
  assert.deepEqual(gapUpdate, [true, false, true, true, true, false, true]);
  assert.equal(gapUpdate.length, 7);

  // 4. Treino após mais de 7 dias: janela reiniciada com apenas hoje true
  const longGapUpdate = updateStreakHistory(sameDayUpdate, '2026-10-01', '2026-11-06');
  assert.deepEqual(longGapUpdate, [false, false, false, false, false, false, true]);

  // 5. calculateRealStreakHistory a partir de sessões reais
  const sessions = [
    analyticsSession('s1', '2026-11-05', 1000),
    analyticsSession('s2', '2026-11-06', 1500),
    analyticsSession('s3', '2026-11-06', 1200), // Segundo treino hoje
    { ...analyticsSession('fake', '2026-11-04', 5000), isDemo: true }, // Demo ignorado
  ];
  const calculatedHistory = calculateRealStreakHistory(sessions, '2026-11-06');
  // Janela de 7 dias terminando em 2026-11-06:
  // [2026-10-31, 2026-11-01, 2026-11-02, 2026-11-03, 2026-11-04, 2026-11-05, 2026-11-06]
  assert.deepEqual(calculatedHistory, [false, false, false, false, false, true, true]);
  assert.equal(calculatedHistory.length, 7);
});
