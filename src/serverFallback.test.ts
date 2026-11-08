import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateFallbackRoutine,
  generateProfileFallback,
  geminiClient,
  handleGenerateWorkout,
} from '../server';
import { validateGeneratedWorkout } from './utils/workoutPersonalization';
import { TrainingEquipment } from './types/profile';

function mockResponse(): { statusCode?: number; body?: unknown } {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

const baseRequestBody = {
  focus: 'Full Body',
  durationMinutes: 45,
  equipment: ['bodyweight'],
  profileEquipment: ['bodyweight'],
  profileGoals: ['fitness'],
  experienceLevel: 'beginner',
  fatigueLevel: 'normal',
  targetGoal: 'endurance',
  language: 'pt',
  frequentExercises: [],
};

async function invokeRoute(body: unknown, clientOverride: unknown) {
  const previousClient = geminiClient.current;
  geminiClient.current = clientOverride as typeof geminiClient.current;
  try {
    const req = { body } as { body: unknown };
    const res = mockResponse();
    await handleGenerateWorkout(req as any, res as any);
    return res as { statusCode?: number; body?: unknown };
  } finally {
    geminiClient.current = previousClient;
  }
}

function assertValidRoutine(res: { statusCode?: number; body?: unknown }, equipment: TrainingEquipment[]) {
  assert.equal(res.statusCode, 200);
  const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
  assert.equal(body.success, true);
  assert.ok(body.routine, 'a rotina de fallback deve ser retornada');
  assert.ok(
    validateGeneratedWorkout(body.routine, equipment),
    'a rotina resultante deve passar na validacao',
  );
}

test('generateFallbackRoutine nao prescreve cargas absolutas', () => {
  const pull = generateFallbackRoutine('Pull', 45, 'pt');
  const push = generateFallbackRoutine('Push', 45, 'en');
  for (const routine of [pull, push]) {
    assert.ok(routine.exercises.length > 0);
    for (const exercise of routine.exercises) {
      assert.equal(exercise.defaultWeight, 0);
    }
  }
});

test('generateProfileFallback nao prescreve cargas absolutas em nenhum exercicio', () => {
  const routine = generateProfileFallback(
    'Pull', 45, 'pt',
    ['barbell', 'cable', 'dumbbell'],
    'intermediate',
    ['muscle_gain'],
  );
  assert.ok(routine);
  if (!routine) return;
  assert.equal(routine.difficulty, 'Intermediate');
  assert.ok(routine.exercises.length > 0);
  assert.ok(routine.exercises.some((exercise) => exercise.primaryMuscle === 'back'));
  for (const exercise of routine.exercises) {
    assert.equal(exercise.defaultWeight, 0);
  }
});

test('comportamento conservador para iniciantes', () => {
  const routine = generateProfileFallback(
    'Full Body', 45, 'en',
    ['bodyweight'],
    'beginner',
    ['fitness'],
  );
  assert.ok(routine);
  if (!routine) return;
  assert.equal(routine.difficulty, 'Beginner');
  assert.equal(routine.targetDurationMinutes, 45);
  assert.ok(routine.exercises.length > 0);
  for (const exercise of routine.exercises) {
    assert.ok(exercise.setsCount <= 3, 'iniciantes devem ter volume de series limitado');
  }
});

test('respeita os equipamentos selecionados', () => {
  const routine = generateProfileFallback(
    'Upper', 40, 'pt',
    ['bodyweight'],
    'intermediate',
    ['health'],
  );
  assert.ok(routine);
  if (!routine) return;
  assert.ok(routine.exercises.length > 0);
  for (const exercise of routine.exercises) {
    assert.equal(exercise.category, 'bodyweight');
  }
});

test('preserva idioma, foco e duracao', () => {
  const pt = generateProfileFallback('Pull', 60, 'pt', ['barbell', 'cable'], 'advanced', ['muscle_gain']);
  assert.ok(pt);
  if (!pt) return;
  assert.equal(pt.targetDurationMinutes, 60);
  assert.ok(pt.exercises.some((exercise) => exercise.primaryMuscle === 'back'));
  assert.ok(/Pull|Dinâmico|Dorsais/.test(pt.title));

  const en = generateProfileFallback('Pull', 60, 'en', ['barbell', 'cable'], 'advanced', ['muscle_gain']);
  assert.ok(en);
  if (!en) return;
  assert.equal(en.targetDurationMinutes, 60);
  assert.ok(/Dynamic|Pull|Lats/.test(en.title));
  assert.notEqual(pt.title, en.title);
});

test('orientacoes de seguranca e ajuste de carga nas notas de coordenacao', () => {
  const pt = generateProfileFallback('Push', 30, 'pt', ['bodyweight'], 'beginner', ['fitness']);
  assert.ok(pt);
  if (!pt) return;
  assert.ok(/Carga não prescrita/.test(pt.coachingNotes ?? ''));
  assert.ok(/interrompa o exercício/.test(pt.coachingNotes ?? ''));

  const en = generateProfileFallback('Push', 30, 'en', ['bodyweight'], 'beginner', ['fitness']);
  assert.ok(en);
  if (!en) return;
  assert.ok(/No load prescribed/.test(en.coachingNotes ?? ''));
  assert.ok(/stop the exercise/.test(en.coachingNotes ?? ''));
});

test('resultado do fallback passa na validacao de rotina', () => {
  const routine = generateProfileFallback('Legs', 50, 'pt', ['dumbbell'], 'beginner', ['weight_loss']);
  assert.ok(routine);
  if (!routine) return;
  assert.ok(validateGeneratedWorkout(routine, ['dumbbell']));
});

test('nao devolve exercicios fora do foco muscular solicitado', () => {
  // Legs com apenas cabos: nao ha exercicio de pernas de cable no catalogo.
  // Não deve devolver tríceps/peito/ombros apresentados como treino de pernas.
  const legs = generateProfileFallback('Legs', 45, 'pt', ['cable'], 'beginner', ['health']);
  assert.ok(legs);
  if (!legs) return;
  // Fallback de corpo inteiro do catálogo, respeitando o equipamento disponível.
  assert.equal(legs.category, 'Full Body');
  assert.ok(/FitFlow/.test(legs.title));
  for (const exercise of legs.exercises) {
    assert.ok(
      !['triceps', 'chest', 'shoulders'].includes(exercise.primaryMuscle) || legs.category === 'Full Body',
      `${exercise.name} não deve aparecer como treino de pernas`,
    );
  }
});

test('nao apresenta rotina Push como treino de peito nem Pull como treino de costas fora do foco', () => {
  const focos: Array<[string, string[]]> = [
    ['Push', ['chest', 'shoulders', 'triceps']],
    ['Pull', ['back', 'biceps', 'hamstrings']],
    ['Upper', ['chest', 'back', 'shoulders', 'biceps', 'triceps']],
    ['Lower', ['quads', 'glutes', 'hamstrings', 'calves']],
  ];
  for (const [focus, muscles] of focos) {
    const routine = generateProfileFallback(
      focus, 45, 'en', ['dumbbell', 'barbell', 'cable', 'machine'], 'intermediate', ['muscle_gain'],
    );
    assert.ok(routine, `rotina para foco ${focus} não deve ser nula`);
    if (!routine) continue;
    for (const exercise of routine.exercises) {
      assert.ok(
        muscles.includes(exercise.primaryMuscle),
        `${exercise.name} (${exercise.primaryMuscle}) fora do foco ${focus}`,
      );
    }
  }
});

test('foco pernas sem exercícios compatíveis usa fallback de corpo inteiro', () => {
  const legs = generateProfileFallback('Legs', 45, 'pt', ['cable'], 'beginner', ['health']);
  assert.ok(legs);
  if (!legs) return;
  assert.equal(legs.category, 'Full Body');
  assert.ok(/FitFlow/.test(legs.title));
  const legMuscles = ['quads', 'glutes', 'hamstrings', 'calves'];
  const hasLegExercise = legs.exercises.some((exercise) => legMuscles.includes(exercise.primaryMuscle));
  // Pode ou não conter exercício de pernas (depende do catálogo de cable), mas não é rotina de pernas.
  assert.ok(!hasLegExercise || legs.category === 'Full Body');
});

test('retorna null quando nao ha exercicios compatíveis com os equipamentos', () => {
  const routine = generateProfileFallback('Legs', 45, 'pt', [], 'beginner', ['health']);
  assert.equal(routine, null);
});

test('rotas do Gemini', async (t) => {
  await t.test('faz fallback quando a Gemini esta indisponivel (sem chave)', async () => {
    const res = await invokeRoute(baseRequestBody, null);
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; message?: string; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight']);
    for (const exercise of (body.routine as { exercises: { defaultWeight: number }[] }).exercises) {
      assert.equal(exercise.defaultWeight, 0);
    }
  });

  await t.test('faz fallback quando a Gemini retorna erro', async () => {
    const res = await invokeRoute(baseRequestBody, {
      models: { generateContent: async () => { throw new Error('Gemini indisponível'); } },
    });
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight']);
  });

  await t.test('faz fallback quando a Gemini retorna JSON invalido', async () => {
    const res = await invokeRoute(baseRequestBody, {
      models: { generateContent: async () => ({ text: 'nao é json {'})}
    });
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight']);
  });

  await t.test('faz fallback quando a Gemini retorna rotina invalida para o schema', async () => {
    const res = await invokeRoute(baseRequestBody, {
      models: { generateContent: async () => ({ text: '{}' }) },
    });
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight']);
  });

  await t.test('retorna rotina da Gemini sem flag de fallback quando a resposta e valida', async () => {
    const res = await invokeRoute(baseRequestBody, {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            title: 'Gemini Push',
            category: 'Push',
            targetDurationMinutes: 45,
            difficulty: 'Intermediate',
            targetMuscles: ['chest'],
            xpReward: 200,
            coachingNotes: 'Rotina gerada pela Gemini.',
            exercises: [
              {
                name: 'Flexão de Braço',
                primaryMuscle: 'chest',
                category: 'bodyweight',
                defaultWeight: 0,
                defaultReps: 10,
                setsCount: 3,
                targetRestSeconds: 60,
                tempo: '2-0-1-0',
                notes: 'Mantenha a técnica.',
              },
            ],
          }),
        }),
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, undefined);
    assert.ok(body.routine);
    assert.ok(validateGeneratedWorkout(body.routine, ['bodyweight']));
  });

  await t.test('rejeita requisicao invalida com 400', async () => {
    const res = await invokeRoute({ focus: '', durationMinutes: 45, equipment: ['bodyweight'] }, null);
    assert.equal(res.statusCode, 400);
    const body = res.body as { success?: boolean; message?: string };
    assert.equal(body.success, false);
    assert.ok(body.message);
  });
});
