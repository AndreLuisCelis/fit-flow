import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import test from 'node:test';
import vercelWorkoutHandler from '../api/generate-workout';
import {
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
      assert.ok(validateGeneratedWorkout(body.routine, ['bodyweight']));
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
    const errorClient = {
      models: {
        generateContent: async () => { throw new Error('Falha no modelo'); },
      },
    };

    await invokeRoute(baseRequestBody, errorClient);
    assert.equal(getGeminiConcurrentRequests(), 0);
  });

  await t.test('timeout efetivo cancela a chamada Gemini e retorna erro controlado sem vazar detalhes internos', async () => {
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
