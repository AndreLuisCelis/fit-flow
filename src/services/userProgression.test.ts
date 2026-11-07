import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addExperience,
  reconcileUserStats,
  XP_PER_LEVEL,
  MAX_SAFE_XP,
  MAX_SAFE_LEVEL,
} from './userProgression';
import { INITIAL_USER_STATS } from '../data/presetRoutines';
import { UserStats } from '../types/workout';

test('1. Ganho de XP abaixo do limiar mantém o nível e incrementa currentXP', () => {
  const initial = { level: 14, currentXP: 6450, xpForNextLevel: 8000 };
  const result = addExperience(initial, 350);

  assert.equal(result.currentXP, 6800);
  assert.equal(result.level, 14);
  assert.equal(result.xpForNextLevel, 8000);
  assert.equal(result.levelsGained, 0);
  assert.equal(Number.isSafeInteger(result.currentXP), true);
  assert.equal(Number.isSafeInteger(result.level), true);
  assert.equal(Number.isSafeInteger(result.xpForNextLevel), true);
});

test('2. Ganho exatamente no limiar sobe de nível e incrementa o próximo limiar em 2000', () => {
  // 8000 - 6450 = 1550 XP necessários para atingir exatamente o limiar
  const initial = { level: 14, currentXP: 6450, xpForNextLevel: 8000 };
  const result = addExperience(initial, 1550);

  assert.equal(result.currentXP, 8000);
  assert.equal(result.level, 15);
  assert.equal(result.xpForNextLevel, 10000);
  assert.equal(result.levelsGained, 1);
  assert.equal(Number.isSafeInteger(result.currentXP), true);
  assert.equal(Number.isSafeInteger(result.level), true);
  assert.equal(Number.isSafeInteger(result.xpForNextLevel), true);
});

test('3. Ganho acima de um limiar preserva XP excedente e sobe de nível', () => {
  // 6450 + 1600 = 8050 (ultrapassa 8000 em 50 XP)
  const initial = { level: 14, currentXP: 6450, xpForNextLevel: 8000 };
  const result = addExperience(initial, 1600);

  assert.equal(result.currentXP, 8050);
  assert.equal(result.level, 15);
  assert.equal(result.xpForNextLevel, 10000);
  assert.equal(result.levelsGained, 1);
});

test('4. Ganho que atravessa dois ou mais níveis processa todos os limiares em O(1)', () => {
  // 6450 + 4000 = 10450:
  // - 10450 >= 8000 -> Nível 15, próximo limiar 10000
  // - 10450 >= 10000 -> Nível 16, próximo limiar 12000
  // - 10450 < 12000 -> permanece Nível 16
  const initial = { level: 14, currentXP: 6450, xpForNextLevel: 8000 };
  const doubleLevelResult = addExperience(initial, 4000);

  assert.equal(doubleLevelResult.currentXP, 10450);
  assert.equal(doubleLevelResult.level, 16);
  assert.equal(doubleLevelResult.xpForNextLevel, 12000);
  assert.equal(doubleLevelResult.levelsGained, 2);

  // Ganho gigante de 10000 XP (atravessa 5 níveis: 15, 16, 17, 18, 19)
  // 6450 + 10000 = 16450 -> Limiares: 8000, 10000, 12000, 14000, 16000 (meta nível 20 é 18000)
  const multiLevelResult = addExperience(initial, 10000);
  assert.equal(multiLevelResult.currentXP, 16450);
  assert.equal(multiLevelResult.level, 19);
  assert.equal(multiLevelResult.xpForNextLevel, 18000);
  assert.equal(multiLevelResult.levelsGained, 5);
});

test('5. Bônus diário de 250 XP acumula corretamente', () => {
  // Abaixo do limiar
  const initial = { level: 14, currentXP: 6450, xpForNextLevel: 8000 };
  const dailyGain1 = addExperience(initial, 250);
  assert.equal(dailyGain1.currentXP, 6700);
  assert.equal(dailyGain1.level, 14);
  assert.equal(dailyGain1.xpForNextLevel, 8000);
  assert.equal(dailyGain1.levelsGained, 0);

  // Bônus diário que atinge e ultrapassa o limiar
  const nearThreshold = { level: 14, currentXP: 7800, xpForNextLevel: 8000 };
  const dailyGain2 = addExperience(nearThreshold, 250);
  assert.equal(dailyGain2.currentXP, 8050);
  assert.equal(dailyGain2.level, 15);
  assert.equal(dailyGain2.xpForNextLevel, 10000);
  assert.equal(dailyGain2.levelsGained, 1);
});

test('6. Persistência e reload sem alteração indevida', () => {
  const currentStats: UserStats = {
    ...INITIAL_USER_STATS,
    level: 15,
    currentXP: 8350,
    xpForNextLevel: 10000,
    totalWorkoutsCompleted: 43,
  };

  const serialized = JSON.stringify(currentStats);
  const reloaded = reconcileUserStats(serialized);

  // Nenhum XP extra concedido, nenhum progresso apagado
  assert.deepEqual(reloaded, currentStats);
});

test('7. Compatibilidade com dados antigos preserva campos existentes', () => {
  // Simula registro legado salvo antes de campos recentes (ex: sem streakFrozenToday)
  const legacyData = {
    level: 14,
    currentXP: 6450,
    streakDays: 8,
    lastWorkoutDate: '2026-11-05',
    totalWorkoutsCompleted: 42,
    totalLifetimeVolumeKg: 78450,
    streakHistory: [true, true, true, false, true, true, true],
  };

  const reconciled = reconcileUserStats(legacyData);

  assert.equal(reconciled.level, 14);
  assert.equal(reconciled.currentXP, 6450);
  assert.equal(reconciled.xpForNextLevel, 8000);
  assert.equal(reconciled.streakFrozenToday, false);
  assert.equal(reconciled.streakDays, 8);
  assert.equal(reconciled.lastWorkoutDate, '2026-11-05');
  assert.equal(reconciled.totalWorkoutsCompleted, 42);
  assert.equal(reconciled.totalLifetimeVolumeKg, 78450);
  assert.deepEqual(reconciled.streakHistory, [true, true, true, false, true, true, true]);
});

test('8. Valores inválidos ou inconsistentes no LocalStorage são reconciliados com segurança', () => {
  // A. Inconsistência onde currentXP >= xpForNextLevel (bug antigo de não iterar múltiplos níveis)
  const inconsistentMultiLevel = {
    level: 14,
    currentXP: 10500,
    xpForNextLevel: 8000,
    streakDays: 5,
    streakFrozenToday: false,
    lastWorkoutDate: '2026-11-06',
    totalWorkoutsCompleted: 10,
    totalLifetimeVolumeKg: 20000,
    streakHistory: [false, true, true, true, true, true, true],
  };
  const fixedProgression = reconcileUserStats(inconsistentMultiLevel);
  // Deve avançar para nível 16 com meta 12000, preservando 10500 XP sem dar bônus nem apagar
  assert.equal(fixedProgression.level, 16);
  assert.equal(fixedProgression.currentXP, 10500);
  assert.equal(fixedProgression.xpForNextLevel, 12000);
  assert.equal(fixedProgression.totalWorkoutsCompleted, 10);

  // B. Valores corrompidos (NaN, números negativos, tipos inválidos)
  const corrupted = {
    level: -5,
    currentXP: NaN,
    xpForNextLevel: 0,
    streakDays: -1,
    streakFrozenToday: 'not-a-boolean' as any,
    lastWorkoutDate: '',
    totalWorkoutsCompleted: -2,
    totalLifetimeVolumeKg: NaN,
    streakHistory: 'not-an-array' as any,
  };
  const sanitized = reconcileUserStats(corrupted);
  assert.equal(sanitized.level, INITIAL_USER_STATS.level);
  assert.equal(sanitized.currentXP, INITIAL_USER_STATS.currentXP);
  assert.equal(sanitized.xpForNextLevel, INITIAL_USER_STATS.xpForNextLevel);
  assert.equal(sanitized.streakDays, INITIAL_USER_STATS.streakDays);
  assert.equal(sanitized.totalWorkoutsCompleted, INITIAL_USER_STATS.totalWorkoutsCompleted);
  assert.equal(sanitized.totalLifetimeVolumeKg, INITIAL_USER_STATS.totalLifetimeVolumeKg);
  assert.deepEqual(sanitized.streakHistory, INITIAL_USER_STATS.streakHistory);

  // C. JSON malformado ou entrada nula
  assert.deepEqual(reconcileUserStats(null), INITIAL_USER_STATS);
  assert.deepEqual(reconcileUserStats('{ corrupt json string'), INITIAL_USER_STATS);
  assert.deepEqual(reconcileUserStats(12345), INITIAL_USER_STATS);
});

test('9. Number.MAX_SAFE_INTEGER: cálculo O(1) imediato sem travar nem estourar precisão', () => {
  const initial = { level: 14, currentXP: 6450, xpForNextLevel: 8000 };

  // Passando Number.MAX_SAFE_INTEGER como ganho de XP
  const startTime = Date.now();
  const result = addExperience(initial, Number.MAX_SAFE_INTEGER);
  const durationMs = Date.now() - startTime;

  // Deve executar instantaneamente (menos de 50ms) comprovando cálculo O(1)
  assert.ok(durationMs < 50, `Executou em ${durationMs}ms, esperado < 50ms`);
  assert.equal(Number.isSafeInteger(result.level), true);
  assert.equal(Number.isSafeInteger(result.currentXP), true);
  assert.equal(Number.isSafeInteger(result.xpForNextLevel), true);
  assert.equal(result.currentXP, Number.MAX_SAFE_INTEGER);
  assert.equal(result.level, MAX_SAFE_LEVEL);
});

test('10. Valores finitos acima de Number.MAX_SAFE_INTEGER são contidos na faixa segura', () => {
  // Valores finitos exorbitantes (ex: 1e18 ou 1e20)
  const hugeCandidate = {
    level: 1e18,
    currentXP: 1e25,
    xpForNextLevel: 1e30,
    streakDays: 1e18,
    streakFrozenToday: false,
    lastWorkoutDate: '2026-11-06',
    totalWorkoutsCompleted: 1e18,
    totalLifetimeVolumeKg: 1e20,
    streakHistory: [true, true, true, true, true, true, true],
  };

  const reconciled = reconcileUserStats(hugeCandidate);

  assert.equal(Number.isSafeInteger(reconciled.level), true);
  assert.equal(Number.isSafeInteger(reconciled.currentXP), true);
  assert.equal(Number.isSafeInteger(reconciled.xpForNextLevel), true);
  assert.equal(Number.isSafeInteger(reconciled.streakDays), true);
  assert.equal(Number.isSafeInteger(reconciled.totalWorkoutsCompleted), true);
  assert.equal(Number.isSafeInteger(reconciled.totalLifetimeVolumeKg), true);
  assert.equal(reconciled.currentXP, Number.MAX_SAFE_INTEGER);
  assert.equal(reconciled.level, MAX_SAFE_LEVEL);
  assert.equal(reconciled.streakDays, Number.MAX_SAFE_INTEGER);
});

test('11. Ganhos de XP que provoquem overflow são contidos em Number.MAX_SAFE_INTEGER', () => {
  const nearMaxStats = {
    level: 100,
    currentXP: Number.MAX_SAFE_INTEGER - 100,
    xpForNextLevel: Number.MAX_SAFE_INTEGER - 50,
  };

  // Ganho de 500 XP provocaria overflow além de Number.MAX_SAFE_INTEGER
  const result = addExperience(nearMaxStats, 500);

  assert.equal(Number.isSafeInteger(result.currentXP), true);
  assert.equal(result.currentXP, Number.MAX_SAFE_INTEGER);
  assert.equal(Number.isSafeInteger(result.level), true);
  assert.equal(Number.isSafeInteger(result.xpForNextLevel), true);
  assert.ok(result.level >= 100);
});

test('12. Níveis e limiares fora da faixa segura são corrigidos', () => {
  // Limiar zero, negativo ou NaN
  const badThresholdStats = {
    level: 14,
    currentXP: 6450,
    xpForNextLevel: -500,
  };
  const resultBadThreshold = addExperience(badThresholdStats, 350);
  assert.equal(resultBadThreshold.xpForNextLevel, 8000);
  assert.equal(resultBadThreshold.level, 14);
  assert.equal(resultBadThreshold.currentXP, 6800);

  // Nível exorbitante ou corrompido
  const badLevelStats = {
    level: Number.MAX_SAFE_INTEGER + 10,
    currentXP: 5000,
    xpForNextLevel: 10000,
  };
  const resultBadLevel = addExperience(badLevelStats, 100);
  assert.equal(Number.isSafeInteger(resultBadLevel.level), true);
  assert.ok(resultBadLevel.level <= MAX_SAFE_LEVEL);
});

test('13. Idempotência da reconciliação: reconcile(reconcile(stats)) é estritamente idêntico', () => {
  const testCases = [
    INITIAL_USER_STATS,
    { level: 14, currentXP: 10500, xpForNextLevel: 8000 },
    { level: 1e18, currentXP: 1e25, xpForNextLevel: 1e30 },
    { level: -10, currentXP: NaN, xpForNextLevel: 0 },
    { level: 20, currentXP: 25000, xpForNextLevel: 26000, streakDays: 15, streakFrozenToday: true, lastWorkoutDate: '2026-11-06' },
  ];

  for (const tc of testCases) {
    const pass1 = reconcileUserStats(tc);
    const pass2 = reconcileUserStats(pass1);
    const pass3 = reconcileUserStats(pass2);

    assert.deepEqual(pass2, pass1, 'Segunda reconciliação deve ser idêntica à primeira');
    assert.deepEqual(pass3, pass1, 'Terceira reconciliação deve ser idêntica à primeira');
  }
});
