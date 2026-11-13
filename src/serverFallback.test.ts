import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import express from 'express';
import { createServer } from 'node:http';
import test from 'node:test';
import vercelWorkoutHandler from '../api/generate-workout.js';
import { MAX_PAYLOAD_BYTES } from './server/apiHandler';
import {
  exerciseCatalog,
  generateFallbackRoutine,
  generateProfileFallback,
  geminiClient,
  handleGenerateWorkout,
  GEMINI_MAX_CONCURRENT,
  getGeminiConcurrentRequests,
  getRateLimitKey,
  resetRateLimitForTesting,
  setGeminiTimeoutForTesting,
} from '../server';
import { validateGeneratedWorkout } from './utils/workoutPersonalization';
import { EXERCISE_DATABASE } from './data/presetRoutines';
import { TrainingEquipment } from './types/profile';
import { Exercise } from './types/workout';

function buildVerifiedTestCatalog(source: Record<string, Exercise> = EXERCISE_DATABASE): Record<string, Exercise> {
  return Object.fromEntries(
    Object.entries(source).map(([id, exercise]) => [
      id,
      exercise.media
        ? {
            ...exercise,
            media: {
              ...exercise.media,
              status: 'published' as const,
              verifiedAt: '2026-11-13T10:00:00.000Z',
            },
          }
        : exercise,
    ]),
  );
}

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

function assertValidRoutine(
  res: { statusCode?: number; body?: unknown },
  equipment: TrainingEquipment[],
  catalog: Record<string, Exercise> = EXERCISE_DATABASE,
) {
  assert.equal(res.statusCode, 200);
  const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
  assert.equal(body.success, true);
  assert.ok(body.routine, 'a rotina de fallback deve ser retornada');
  assert.ok(
    validateGeneratedWorkout(body.routine, equipment, {
      catalog,
      allowUnpublishedMedia: Boolean(body.isFallback),
    }),
    'a rotina resultante deve passar na validacao',
  );
}

test('generateFallbackRoutine nao prescreve cargas absolutas e usa IDs do catalogo com midia', () => {
  const pull = generateFallbackRoutine('Pull', 45, 'pt');
  const push = generateFallbackRoutine('Push', 45, 'en');
  for (const routine of [pull, push]) {
    assert.ok(routine.exercises.length > 0);
    for (const exercise of routine.exercises) {
      assert.equal(exercise.defaultWeight, 0);
      assert.ok(EXERCISE_DATABASE[exercise.exerciseId], `${exercise.exerciseId} deve existir no catálogo`);
      assert.ok(exercise.media?.imageUrl, `${exercise.exerciseId} deve possuir mídia`);
    }
  }
});

test('generateProfileFallback nao prescreve cargas absolutas e emite exercicios do catalogo', () => {
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
    assert.ok(EXERCISE_DATABASE[exercise.exerciseId], `${exercise.exerciseId} deve existir no catálogo`);
    assert.ok(exercise.media?.imageUrl, `${exercise.exerciseId} deve possuir mídia`);
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
  assert.ok(validateGeneratedWorkout(routine, ['dumbbell'], { allowUnpublishedMedia: true }));
});

test('nao devolve exercicios fora do foco muscular solicitado', () => {
  // Legs com apenas cabos: se houver exercícios de cable compatíveis para pernas ou corpo todo, respeita equipamento disponível.
  const legs = generateProfileFallback('Legs', 45, 'pt', ['cable'], 'beginner', ['health']);
  assert.ok(legs);
  if (!legs) return;
  assert.equal(legs.category, 'Full Body');
  assert.ok(/FitFlow/.test(legs.title));
  for (const exercise of legs.exercises) {
    assert.equal(exercise.category, 'cable');
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
  t.beforeEach(() => {
    resetRateLimitForTesting();
  });

  t.afterEach(() => {
    resetRateLimitForTesting();
  });

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

  await t.test('nao invoca Gemini quando o catalogo real possui apenas midia planejada nao verificada', async () => {
    let geminiCalled = false;
    const res = await invokeRoute(baseRequestBody, {
      models: {
        generateContent: async () => {
          geminiCalled = true;
          return { text: '{}' };
        },
      },
    });
    assert.equal(geminiCalled, false);
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; message?: string; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight']);
  });

  await t.test('faz fallback quando a Gemini retorna erro', async () => {
    exerciseCatalog.current = buildVerifiedTestCatalog();
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
    exerciseCatalog.current = buildVerifiedTestCatalog();
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
    exerciseCatalog.current = buildVerifiedTestCatalog();
    const res = await invokeRoute(baseRequestBody, {
      models: { generateContent: async () => ({ text: '{}' }) },
    });
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight']);
  });

  await t.test('retorna rotina da Gemini sem flag de fallback quando a resposta referencia exerciseId valido e verificado', async () => {
    const verified = buildVerifiedTestCatalog();
    // Deixa um exercicio de bodyweight sem verificacao para comprovar que nao entra no prompt
    verified.bodyweight_squat = {
      ...verified.bodyweight_squat,
      media: { ...verified.bodyweight_squat.media!, status: 'planned', verifiedAt: undefined },
    };
    exerciseCatalog.current = verified;

    let capturedPrompt = '';
    const res = await invokeRoute(baseRequestBody, {
      models: {
        generateContent: async (args: { contents?: string }) => {
          capturedPrompt = args?.contents || '';
          return {
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
                  exerciseId: 'push_up',
                  name: 'Nome divergente ignorado pelo servidor',
                  defaultWeight: 0,
                  defaultReps: 10,
                  setsCount: 3,
                  targetRestSeconds: 60,
                  tempo: '2-0-1-0',
                  notes: 'Mantenha a técnica.',
                },
              ],
            }),
          };
        },
      },
    });
    assert.equal(res.statusCode, 200);
    assert.ok(capturedPrompt.includes('push_up'));
    assert.ok(!capturedPrompt.includes('bench_press'));
    assert.ok(!capturedPrompt.includes('bodyweight_squat'));
    const body = res.body as {
      success?: boolean;
      isFallback?: boolean;
      routine?: { exercises: Array<{ exerciseId: string; name: string; media?: { imageUrl: string } }> };
    };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, undefined);
    assert.ok(body.routine);
    assert.equal(body.routine.exercises[0].exerciseId, 'push_up');
    assert.equal(body.routine.exercises[0].name, verified.push_up.namePt);
    assert.equal(body.routine.exercises[0].media?.imageUrl, verified.push_up.media?.imageUrl);
    assert.ok(validateGeneratedWorkout(body.routine, ['bodyweight'], { catalog: verified }));
  });

  await t.test('faz fallback quando a Gemini retorna exercicio cuja midia ainda nao esta publicada/verificada', async () => {
    const mixedCatalog = buildVerifiedTestCatalog();
    mixedCatalog.bodyweight_squat = {
      ...mixedCatalog.bodyweight_squat,
      media: { ...mixedCatalog.bodyweight_squat.media!, status: 'planned', verifiedAt: undefined },
    };
    exerciseCatalog.current = mixedCatalog;

    const res = await invokeRoute(baseRequestBody, {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            title: 'Unpublished Asset Routine',
            category: 'Legs',
            targetDurationMinutes: 45,
            difficulty: 'Beginner',
            targetMuscles: ['quads'],
            xpReward: 150,
            exercises: [{
              exerciseId: 'bodyweight_squat',
              defaultWeight: 0,
              defaultReps: 12,
              setsCount: 3,
              targetRestSeconds: 60,
            }],
          }),
        }),
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight'], mixedCatalog);
  });

  await t.test('faz fallback quando a Gemini retorna exercicio em texto livre sem exerciseId', async () => {
    exerciseCatalog.current = buildVerifiedTestCatalog();
    const res = await invokeRoute(baseRequestBody, {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            title: 'Free Form Routine',
            category: 'Push',
            targetDurationMinutes: 45,
            difficulty: 'Beginner',
            targetMuscles: ['chest'],
            xpReward: 150,
            exercises: [
              {
                name: 'Exercicio Inventado Sem ID',
                primaryMuscle: 'chest',
                category: 'bodyweight',
                defaultWeight: 0,
                defaultReps: 12,
                setsCount: 3,
                targetRestSeconds: 60,
              },
            ],
          }),
        }),
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
    assert.equal(body.success, true);
    assert.equal(body.isFallback, true);
    assertValidRoutine(res, ['bodyweight']);
  });

  await t.test('faz fallback quando a Gemini retorna exerciseId inexistente, duplicado ou de equipamento incompativel', async () => {
    exerciseCatalog.current = buildVerifiedTestCatalog();
    const invalidPayloads = [
      {
        title: 'Unknown ID',
        category: 'Push',
        targetDurationMinutes: 45,
        difficulty: 'Beginner',
        targetMuscles: ['chest'],
        xpReward: 150,
        exercises: [{
          exerciseId: 'id_inexistente',
          defaultWeight: 0,
          defaultReps: 10,
          setsCount: 3,
          targetRestSeconds: 60,
        }],
      },
      {
        title: 'Duplicate IDs',
        category: 'Push',
        targetDurationMinutes: 45,
        difficulty: 'Beginner',
        targetMuscles: ['chest'],
        xpReward: 150,
        exercises: [
          { exerciseId: 'push_up', defaultWeight: 0, defaultReps: 10, setsCount: 2, targetRestSeconds: 60 },
          { exerciseId: 'push_up', defaultWeight: 0, defaultReps: 12, setsCount: 2, targetRestSeconds: 60 },
        ],
      },
      {
        title: 'Incompatible Equipment',
        category: 'Push',
        targetDurationMinutes: 45,
        difficulty: 'Beginner',
        targetMuscles: ['chest'],
        xpReward: 150,
        exercises: [{
          exerciseId: 'bench_press',
          defaultWeight: 50,
          defaultReps: 8,
          setsCount: 3,
          targetRestSeconds: 90,
        }],
      },
    ];

    for (const payload of invalidPayloads) {
      const res = await invokeRoute(baseRequestBody, {
        models: {
          generateContent: async () => ({ text: JSON.stringify(payload) }),
        },
      });
      assert.equal(res.statusCode, 200);
      const body = res.body as { success?: boolean; isFallback?: boolean; routine?: unknown };
      assert.equal(body.success, true);
      assert.equal(body.isFallback, true);
      assertValidRoutine(res, ['bodyweight']);
    }
  });

  await t.test('rejeita requisicao invalida com 400', async () => {
    const res = await invokeRoute({ focus: '', durationMinutes: 45, equipment: ['bodyweight'] }, null);
    assert.equal(res.statusCode, 400);
    const body = res.body as { success?: boolean; message?: string };
    assert.equal(body.success, false);
    assert.ok(body.message);
  });
});

test('a função Vercel atende o endpoint público e sua rota interna usando o handler Express compartilhado', async () => {
  const previousClient = geminiClient.current;
  geminiClient.current = null;
  const testApp = express();
  testApp.all('/api/gemini/generate-workout', vercelWorkoutHandler);
  testApp.all('/api/generate-workout', vercelWorkoutHandler);
  const server = createServer(testApp);

  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    for (const route of ['/api/gemini/generate-workout', '/api/generate-workout']) {
      const apiResponse: Response = await fetch(`http://127.0.0.1:${address.port}${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseRequestBody),
      });

      assert.equal(apiResponse.status, 200);
      const body = await apiResponse.json() as { success?: boolean; isFallback?: boolean; routine?: unknown };
      assert.equal(body.success, true);
      assert.equal(body.isFallback, true);
      assert.ok(validateGeneratedWorkout(body.routine, ['bodyweight'], { allowUnpublishedMedia: true }));
    }

    // Valida recusa de métodos que não sejam POST
    const getResponse: Response = await fetch(`http://127.0.0.1:${address.port}/api/gemini/generate-workout`, {
      method: 'GET',
    });
    assert.equal(getResponse.status, 405);
    const getBody = await getResponse.json() as { success: boolean; message: string };
    assert.equal(getBody.success, false);

    // Valida preflight OPTIONS
    const optionsResponse: Response = await fetch(`http://127.0.0.1:${address.port}/api/gemini/generate-workout`, {
      method: 'OPTIONS',
    });
    assert.equal(optionsResponse.status, 204);

    // Valida execução quando req.body já vem pré-parseado pelo runtime serverless da Vercel
    const preParsedReq = {
      method: 'POST',
      body: baseRequestBody,
      headers: { 'x-real-ip': '1.2.3.4' },
    } as any;
    let resCode = 0;
    let resData: any = null;
    const preParsedRes = {
      status: (code: number) => {
        resCode = code;
        return preParsedRes;
      },
      json: (data: any) => {
        resData = data;
        return preParsedRes;
      },
    } as any;
    vercelWorkoutHandler(preParsedReq, preParsedRes);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(resCode, 200);
    assert.equal(resData?.success, true);
    assert.equal(resData?.isFallback, true);
  } finally {
    geminiClient.current = previousClient;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test('protecao do endpoint Gemini contra abuso', async (t) => {
  t.beforeEach(() => {
    resetRateLimitForTesting();
  });

  t.afterEach(() => {
    resetRateLimitForTesting();
  });

  await t.test('limite de concorrencia recusa requisicao quando atingir GEMINI_MAX_CONCURRENT', async () => {
    exerciseCatalog.current = buildVerifiedTestCatalog();
    let unblock: () => void = () => {};
    const hangingPromise = new Promise<{ text: string }>((resolve) => {
      unblock = () => resolve({
        text: JSON.stringify({
          title: 'Concorrente',
          category: 'Full Body',
          targetDurationMinutes: 45,
          difficulty: 'Beginner',
          targetMuscles: ['chest'],
          xpReward: 100,
          coachingNotes: 'Ok',
          exercises: [{
            exerciseId: 'push_up',
            name: 'Flexão',
            primaryMuscle: 'chest',
            category: 'bodyweight',
            defaultWeight: 0,
            defaultReps: 10,
            setsCount: 2,
            targetRestSeconds: 60,
            tempo: '2-0-1-0',
            notes: 'ok',
          }],
        }),
      });
    });

    const mockClient = {
      models: {
        generateContent: async () => hangingPromise,
      },
    };

    // Inicia GEMINI_MAX_CONCURRENT requisições concorrentes
    const inFlight = [];
    for (let i = 0; i < GEMINI_MAX_CONCURRENT; i++) {
      inFlight.push(invokeRoute(baseRequestBody, mockClient));
    }

    // Espera microtask para garantir que as requisições entraram
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(getGeminiConcurrentRequests(), GEMINI_MAX_CONCURRENT);

    // Próxima requisição deve ser recusada com HTTP 503 ou 429
    const rejectedRes = await invokeRoute(baseRequestBody, mockClient);
    assert.ok(
      rejectedRes.statusCode === 503 || rejectedRes.statusCode === 429,
      `deve retornar 503 ou 429, recebido: ${rejectedRes.statusCode}`,
    );
    const body = rejectedRes.body as { success?: boolean; message?: string };
    assert.equal(body.success, false);
    assert.ok(/concorrência|simultâneas|sobrecarregado/i.test(body.message || ''));

    // Libera as requisições pendentes
    unblock();
    await Promise.all(inFlight);

    // Garante decremento obrigatório em finally
    assert.equal(getGeminiConcurrentRequests(), 0);
  });

  await t.test('decrementar contador de concorrencia mesmo quando ocorrer erro ou rejeicao', async () => {
    exerciseCatalog.current = buildVerifiedTestCatalog();
    const errorClient = {
      models: {
        generateContent: async () => { throw new Error('Falha no modelo'); },
      },
    };

    await invokeRoute(baseRequestBody, errorClient);
    assert.equal(getGeminiConcurrentRequests(), 0);
  });

  await t.test('timeout efetivo cancela a chamada Gemini e retorna erro controlado sem vazar detalhes internos', async () => {
    exerciseCatalog.current = buildVerifiedTestCatalog();
    let receivedSignal: AbortSignal | undefined;
    setGeminiTimeoutForTesting(50); // timeout rápido para o teste

    const hangingClient = {
      models: {
        generateContent: async (args: any) => {
          receivedSignal = args?.config?.abortSignal;
          return new Promise<never>(() => {
            // Nunca resolve, espera o timeout disparar
          });
        },
      },
    };

    const res = await invokeRoute(baseRequestBody, hangingClient);
    assert.equal(res.statusCode, 504);
    const body = res.body as { success?: boolean; message?: string; stack?: unknown };
    assert.equal(body.success, false);
    assert.equal(body.stack, undefined);
    assert.ok(/tempo limite/i.test(body.message || ''));
    // Garante que o AbortSignal foi acionado para cancelar a requisição subjacente
    assert.ok(receivedSignal?.aborted, 'AbortSignal deve ter sido acionado');
    assert.equal(getGeminiConcurrentRequests(), 0);
  });

  await t.test('getRateLimitKey identifica corretamente o IP do cliente atras do proxy da Vercel', () => {
    // 1. x-real-ip fornecido pelo edge da Vercel
    const reqVercel = {
      headers: {
        'x-real-ip': '203.0.113.195',
        'x-forwarded-for': '198.51.100.1, 10.0.0.1',
      },
      ip: '10.0.0.1',
    } as any;
    assert.equal(getRateLimitKey(reqVercel), '203.0.113.195');

    // 2. req.ip pelo trust proxy
    const reqProxy = {
      headers: {},
      ip: '198.51.100.42',
    } as any;
    assert.equal(getRateLimitKey(reqProxy), '198.51.100.42');

    // 3. Primeiro IP de x-forwarded-for caso x-real-ip não exista
    const reqForwarded = {
      headers: {
        'x-forwarded-for': '192.0.2.1, 10.0.0.2',
      },
    } as any;
    assert.equal(getRateLimitKey(reqForwarded), '192.0.2.1');
  });
});

test('validacao uniforme do limite de payload de 10 KB na API Vercel', async (t) => {
  t.beforeEach(() => {
    resetRateLimitForTesting();
  });

  t.afterEach(() => {
    resetRateLimitForTesting();
  });

  function createMockRes() {
    let statusCode = 200;
    let body: any = null;
    const res: any = {
      statusCode,
      status(code: number) {
        statusCode = code;
        res.statusCode = code;
        return res;
      },
      json(data: any) {
        body = data;
        res.body = data;
        return res;
      },
      setHeader() {},
      end(data?: string) {
        if (data && body === null) {
          try {
            body = JSON.parse(data);
          } catch {
            body = data;
          }
        }
        res.body = body;
      },
      get code() {
        return res.statusCode ?? statusCode;
      },
      get data() {
        return res.body ?? body;
      },
    };
    return res;
  }

  await t.test('body pre-interpretado dentro do limite: aceito', async () => {
    const req = {
      method: 'POST',
      body: baseRequestBody,
      headers: {},
    } as any;
    const res = createMockRes();

    vercelWorkoutHandler(req, res);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(res.code, 200);
    assert.equal(res.data?.success, true);
  });

  await t.test('body pre-interpretado acima de 10 KB: rejeitado com 413', async () => {
    const hugeBody = {
      ...baseRequestBody,
      overflow: 'x'.repeat(12000),
    };
    const req = {
      method: 'POST',
      body: hugeBody,
      headers: {},
    } as any;
    const res = createMockRes();

    vercelWorkoutHandler(req, res);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(res.code, 413);
    assert.equal(res.data?.success, false);
    assert.equal(res.data?.message, 'Corpo da requisição excede o limite permitido.');
  });

  await t.test('body recebido como JSON string: tratado corretamente', async () => {
    // 1. JSON string dentro do limite
    const validJsonReq = {
      method: 'POST',
      body: JSON.stringify(baseRequestBody),
      headers: {},
    } as any;
    const resValid = createMockRes();

    vercelWorkoutHandler(validJsonReq, resValid);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(resValid.code, 200);
    assert.equal(resValid.data?.success, true);

    // 2. JSON string acima de 10 KB
    const overLimitJsonReq = {
      method: 'POST',
      body: JSON.stringify({ ...baseRequestBody, overflow: 'y'.repeat(12000) }),
      headers: {},
    } as any;
    const resOver = createMockRes();

    vercelWorkoutHandler(overLimitJsonReq, resOver);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(resOver.code, 413);
    assert.equal(resOver.data?.success, false);
    assert.equal(resOver.data?.message, 'Corpo da requisição excede o limite permitido.');
  });

  await t.test('payload com caracteres multibyte: tamanho calculado corretamente em UTF-8', async () => {
    // '🔥' ocupa 4 bytes em UTF-8, mas tem tamanho 2 em UTF-16 (surrogate pair)
    // 3.000 emojis '🔥' têm string.length = 6000 (< 10240 caracteres),
    // porém o tamanho real em UTF-8 é 12.000 bytes (> 10240 bytes)
    const multibyteBody = {
      ...baseRequestBody,
      notes: '🔥'.repeat(3000),
    };
    const serialized = JSON.stringify(multibyteBody);
    assert.ok(serialized.length < MAX_PAYLOAD_BYTES, 'comprimento de caracteres menor que o limite');
    assert.ok(Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES, 'tamanho em bytes maior que 10 KB');

    const req = {
      method: 'POST',
      body: multibyteBody,
      headers: {},
    } as any;
    const res = createMockRes();

    vercelWorkoutHandler(req, res);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(res.code, 413, 'payload multibyte que excede 10 KB deve ser recusado com 413');
    assert.equal(res.data?.success, false);
    assert.equal(res.data?.message, 'Corpo da requisição excede o limite permitido.');
  });

  await t.test('payload exatamente no limite: comportamento consistente', async () => {
    // Constrói payload com exatamente 10240 bytes em UTF-8
    const baseEmpty = JSON.stringify({ ...baseRequestBody, padding: '' });
    const neededPadding = MAX_PAYLOAD_BYTES - Buffer.byteLength(baseEmpty, 'utf8');
    const exactBody = { ...baseRequestBody, padding: 'a'.repeat(neededPadding) };
    const exactJson = JSON.stringify(exactBody);
    assert.equal(Buffer.byteLength(exactJson, 'utf8'), MAX_PAYLOAD_BYTES);

    const reqExact = {
      method: 'POST',
      body: exactBody,
      headers: {},
    } as any;
    const resExact = createMockRes();

    vercelWorkoutHandler(reqExact, resExact);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(resExact.code, 200, 'payload exatamente com 10240 bytes deve ser aceito');
    assert.equal(resExact.data?.success, true);

    // 1 byte a mais (10241 bytes) deve ser rejeitado com 413
    const overByOneBody = { ...baseRequestBody, padding: 'a'.repeat(neededPadding + 1) };
    const overByOneJson = JSON.stringify(overByOneBody);
    assert.equal(Buffer.byteLength(overByOneJson, 'utf8'), MAX_PAYLOAD_BYTES + 1);

    const reqOverByOne = {
      method: 'POST',
      body: overByOneBody,
      headers: {},
    } as any;
    const resOverByOne = createMockRes();

    vercelWorkoutHandler(reqOverByOne, resOverByOne);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(resOverByOne.code, 413, 'payload com 10241 bytes deve ser recusado com 413');
    assert.equal(resOverByOne.data?.success, false);
  });

  await t.test('payload acima do limite nao chega ao gerador Gemini', async () => {
    let geminiCalled = false;
    const previousClient = geminiClient.current;
    geminiClient.current = {
      models: {
        generateContent: async () => {
          geminiCalled = true;
          return { text: '{}' };
        },
      },
    } as any;

    try {
      const req = {
        method: 'POST',
        body: { ...baseRequestBody, overflow: 'z'.repeat(12000) },
        headers: {},
      } as any;
      const res = createMockRes();

      vercelWorkoutHandler(req, res);
      await new Promise((r) => setTimeout(r, 20));

      assert.equal(res.code, 413);
      assert.equal(geminiCalled, false, 'gerador Gemini não deve ser invocado quando payload exceder o limite');
    } finally {
      geminiClient.current = previousClient;
    }
  });

  await t.test('payload invalido continua recebendo tratamento adequado', async () => {
    // 1. JSON string com sintaxe corrompida
    const corruptReq = {
      method: 'POST',
      body: '{"focus": "Full Body", corrupted',
      headers: {},
    } as any;
    const resCorrupt = createMockRes();

    vercelWorkoutHandler(corruptReq, resCorrupt);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(resCorrupt.code, 400);
    assert.equal(resCorrupt.data?.success, false);
    assert.equal(resCorrupt.data?.message, 'Corpo JSON inválido.');

    // 2. Objeto JSON válido sintaticamente mas com schema inválido (sem campos obrigatórios)
    const invalidSchemaReq = {
      method: 'POST',
      body: { invalidField: 123 },
      headers: {},
    } as any;
    const resInvalidSchema = createMockRes();

    vercelWorkoutHandler(invalidSchemaReq, resInvalidSchema);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(resInvalidSchema.code, 400);
    assert.equal(resInvalidSchema.data?.success, false);
    assert.ok(resInvalidSchema.data?.message);
  });

  await t.test('requisicao em stream acima de 10 KB e rejeitada durante recepcao de chunks', async () => {
    const streamReq = new EventEmitter() as any;
    streamReq.method = 'POST';
    streamReq.headers = {};
    const resStream = createMockRes();

    vercelWorkoutHandler(streamReq, resStream);

    // Emite primeiro chunk de 6 KB (aceito)
    streamReq.emit('data', Buffer.from('a'.repeat(6000), 'utf8'));
    assert.equal(resStream.code, 200, 'ainda abaixo de 10 KB, status pendente');

    // Emite segundo chunk de 6 KB (total 12 KB, estoura o limite)
    streamReq.emit('data', Buffer.from('a'.repeat(6000), 'utf8'));
    assert.equal(resStream.code, 413, 'deve recusar com 413 imediatamente ao exceder 10 KB');
    assert.equal(resStream.data?.success, false);
    assert.equal(resStream.data?.message, 'Corpo da requisição excede o limite permitido.');
  });
});
