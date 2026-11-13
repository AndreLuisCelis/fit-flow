import express from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Exercise } from '../types/workout';
import { ExperienceLevel, ProfileGoal, TrainingEquipment } from '../types/profile';
import { EXERCISE_DATABASE } from '../data/presetRoutines';
import {
  describeGoals,
  experiencePrompt,
  getEligibleCatalogExercises,
  getWorkoutSetBudget,
  GeneratedWorkout,
  hasValidExerciseMedia,
  isEquipmentAvailable,
  validateAndAdaptGeneratedWorkout,
  validateGeneratedWorkout,
  validateWorkoutRequest,
} from '../utils/workoutPersonalization';

// Initialize Gemini Client
const initialApiKey = process.env.GEMINI_API_KEY || '';
export const geminiClient = {
  current: initialApiKey ? new GoogleGenAI({ apiKey: initialApiKey }) : null,
};

// ---- Proteção do endpoint Gemini contra abuso ----

/**
 * NOTA DE ARQUITETURA — LIMITAÇÃO DO RATE LIMIT EM MEMÓRIA NO VERCEL (SERVERLESS):
 *
 * 1. Estado efêmero por instância: Em ambientes serverless como a Vercel, cada execução
 *    pode ocorrer em contêineres/lambdas isolados com ciclo de vida curto.
 *    O `rateLimitMap` e o contador `geminiConcurrentRequests` residem na memória da instância local.
 * 2. Ausência de estado compartilhado: Múltiplas instâncias simultâneas ou invocadas em
 *    regiões distintas não compartilham os contadores em memória.
 * 3. Solução recomendada para escala: Para governança distribuída estrita, avaliar a adoção
 *    de armazenamento compartilhado de baixa latência (como Upstash Redis via @upstash/ratelimit
 *    ou Vercel KV / Redis).
 * 4. Proteção temporária básica: Como o projeto não possui infraestrutura compartilhada já
 *    provisionada, mantemos a implementação em memória como proteção contra rajadas (burst) e
 *    abuso local por instância, sem onerar com dependências ou custos externos desnecessários.
 */

export const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS) || 25_000;
export const GEMINI_MAX_CONCURRENT = Number(process.env.GEMINI_MAX_CONCURRENT) || 4;
export const GEMINI_RATE_LIMIT_MAX = Number(process.env.GEMINI_RATE_LIMIT_MAX) || 20;
export const GEMINI_RATE_LIMIT_WINDOW_MS = Number(process.env.GEMINI_RATE_LIMIT_WINDOW_MS) || 60_000;

let geminiTimeoutMs = GEMINI_TIMEOUT_MS;
let geminiConcurrentRequests = 0;

export function getGeminiConcurrentRequests(): number {
  return geminiConcurrentRequests;
}

export function setGeminiTimeoutForTesting(ms: number): void {
  geminiTimeoutMs = ms;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function getRateLimitKey(req: express.Request): string {
  // 1. x-real-ip é injetado diretamente pelo proxy da Vercel no edge e não pode ser manipulado pelo cliente.
  const xRealIp = req.headers?.['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }

  // 2. Se trust proxy estiver ativo, o Express extrai o IP confiável em req.ip.
  if (req.ip) {
    return req.ip;
  }

  // 3. Em caso de múltiplos proxies em x-forwarded-for, obtém o primeiro IP válido da cadeia.
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  return req.socket?.remoteAddress || 'unknown';
}

export function rateLimiter(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const now = Date.now();
  const key = getRateLimitKey(req);
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + GEMINI_RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= GEMINI_RATE_LIMIT_MAX) {
    res.status(429).json({ success: false, message: 'Muitas requisições. Tente novamente mais tarde.' });
    return;
  }

  entry.count += 1;
  next();
}

// Limpa entradas expiradas periodicamente sem reter o processo Node
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now >= entry.resetTime) rateLimitMap.delete(key);
    }
  }, GEMINI_RATE_LIMIT_WINDOW_MS);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

export function resetRateLimitForTesting(): void {
  rateLimitMap.clear();
  geminiConcurrentRequests = 0;
  geminiTimeoutMs = GEMINI_TIMEOUT_MS;
}

// API Route: Generate or adapt workout via Gemini 3.8 Flash
export async function handleGenerateWorkout(
  req: express.Request,
  res: express.Response,
) {
  const workoutRequest = validateWorkoutRequest(req.body);
  if (!workoutRequest) {
    return res.status(400).json({ success: false, message: 'Parâmetros inválidos para gerar a rotina.' });
  }

  const {
    focus,
    durationMinutes,
    fatigueLevel,
    language,
    frequentExercises,
    targetGoal,
    equipment: allowedEquipment,
    profileGoals,
    experienceLevel,
  } = workoutRequest;

  try {
    const eligibleExercises = getEligibleCatalogExercises(allowedEquipment);
    if (eligibleExercises.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Não há exercícios elegíveis cadastrados para os equipamentos selecionados.',
      });
    }

    // Lazily initialize client if environment variable was added/updated at runtime
    if (!geminiClient.current && process.env.GEMINI_API_KEY) {
      geminiClient.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    if (!geminiClient.current) {
      // Fallback if no API key configured in dev
      const routine = generateProfileFallback(focus, durationMinutes, language, allowedEquipment, experienceLevel, profileGoals);
      const validatedFallback = routine
        ? validateAndAdaptGeneratedWorkout(routine, allowedEquipment, experienceLevel, { language })
        : null;
      if (!validatedFallback) {
        return res.status(422).json({ success: false, message: 'Não há exercícios cadastrados para os equipamentos selecionados.' });
      }
      return res.status(200).json({
        success: true,
        isFallback: true,
        message: 'No API key provided, generated via local kinetic engine',
        routine: validatedFallback,
      });
    }

    // 1. Limite de concorrência: recusar novas solicitações quando atingir GEMINI_MAX_CONCURRENT
    if (geminiConcurrentRequests >= GEMINI_MAX_CONCURRENT) {
      return res.status(503).json({
        success: false,
        message: 'Serviço temporariamente sobrecarregado por excesso de requisições simultâneas. Tente novamente em instantes.',
      });
    }

    geminiConcurrentRequests++;
    const abortController = new AbortController();
    let isTimeout = false;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const langName = language === 'en' ? 'English' : 'Portuguese (Português do Brasil)';
      const freqExercisesText = Array.isArray(frequentExercises) && frequentExercises.length > 0
          ? frequentExercises.join(', ')
        : 'No exercise history available';

      const catalogPromptLines = eligibleExercises
        .map((exercise) => {
          const reqPart = exercise.equipmentRequired?.length
            ? ` | required: ${exercise.equipmentRequired.join(',')}`
            : '';
          return `- ${exercise.id} | ${exercise.name} (${exercise.namePt}) | muscle: ${exercise.primaryMuscle} | category: ${exercise.category}${reqPart} | defaultSets: ${exercise.defaultSets} | defaultReps: ${exercise.defaultReps} | rest: ${exercise.restSeconds}s`;
        })
        .join('\n');

      const prompt = `
You are the elite conditioning coach behind FitFlow PWA.
Create an athletic workout routine with progressive overload metrics in ${langName}.

User Parameters & Historical Telemetry:
- Muscle Focus: ${focus}
- Session Duration: ${durationMinutes} minutes
- Available Equipment: ${allowedEquipment.join(', ')}
- Main Goals: ${describeGoals(profileGoals)}
- Experience Level: ${experiencePrompt[experienceLevel]}
- Athlete Fatigue Level: ${fatigueLevel}
- Specific Training Goal: ${targetGoal}
- Athlete's Most Frequent Exercises from IndexedDB History: ${freqExercisesText}
- Request Variation Seed: ${Date.now()}-${Math.random().toString(36).slice(2)}

Eligible Catalog Exercises (you MUST select ONLY from these exact exerciseId values; NEVER invent free-form exercise names or IDs):
${catalogPromptLines}

Coaching Directives:
1. Select ONLY exercises whose exact exerciseId appears in "Eligible Catalog Exercises" above. Do NOT invent new exercises, do NOT repeat the same exerciseId twice in a routine, and do NOT select exercises outside the eligible list.
2. Prioritize and intelligently incorporate the athlete's most frequent exercises (or compatible progressions from the eligible catalog) matching their focus and goals.
3. Prescribe realistic defaultWeight in kg (0 for bodyweight/bands), defaultReps, setsCount, targetRestSeconds, and optional tempo/notes tailored to the athlete's experience and fatigue level.
4. Use the request variation seed to vary exercise selection, order, rep ranges, loads, and rest periods while strictly respecting the catalog and duration constraints.

Respond ONLY with valid JSON (no markdown formatting, no code block backticks) adhering strictly to this schema:
{
  "title": "string (Creative athletic title)",
  "category": "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Full Body" | "Cardio & Core",
  "targetDurationMinutes": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Hardcore",
  "targetMuscles": ["chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "calves" | "core" | "glutes"],
  "xpReward": integer from 0 to 5000 (e.g. 380),
  "coachingNotes": "string (1 concise motivational tactical sentence)",
  "exercises": [
    {
      "exerciseId": "string (EXACT exerciseId from Eligible Catalog Exercises above, unique within this array)",
      "defaultWeight": number (in kg, from 0 to 500),
      "defaultReps": integer (from 1 to 30),
      "setsCount": integer (from 1 to 12),
      "targetRestSeconds": integer (from 0 to 600),
      "tempo": "string (optional, e.g. 3-0-1-0)",
      "notes": "string (optional concise form cue)"
    }
  ]
}
Constraints: targetDurationMinutes is an integer from 10 to 240. Include 1–6 unique targetMuscles, matching the exact primaryMuscle values of the selected catalog exercises. Include 1–5 unique eligible exercises (never duplicate an exerciseId; if fewer than 4 eligible exercises exist, use up to the available count). Keep coachingNotes to 1 concise sentence. defaultWeight must be from 0 to 500 kg; defaultReps an integer from 1 to 30; setsCount an integer from 1 to 12; targetRestSeconds an integer from 0 to 600. Total sets must not exceed two thirds of targetDurationMinutes (rounded down). Use only declared fields; do not add fields.
`;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          isTimeout = true;
          try {
            abortController.abort();
          } catch {
            // ignore
          }
          reject(new Error('GEMINI_TIMEOUT'));
        }, geminiTimeoutMs);
      });

      const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
      const modelConfig: Record<string, unknown> = {
        responseMimeType: 'application/json',
        abortSignal: abortController.signal,
      };
      if (modelName.includes('3.') || modelName.includes('gemini-4')) {
        modelConfig.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW,
        };
      }

      const response = await Promise.race([
        geminiClient.current.models.generateContent({
          model: modelName,
          contents: prompt,
          config: modelConfig as any,
        }),
        timeoutPromise,
      ]);

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      const personalizedRoutine = validateAndAdaptGeneratedWorkout(parsedData, allowedEquipment, experienceLevel, { language });
      if (!personalizedRoutine) {
        throw new Error('Gemini returned an invalid, non-catalog, or equipment-incompatible workout');
      }

      return res.status(200).json({
        success: true,
        routine: personalizedRoutine,
      });
    } catch (error: unknown) {
      // 2. Retornar erro controlado em caso de timeout sem vazar stack trace ou detalhes internos
      if (isTimeout || (error instanceof Error && (error.name === 'AbortError' || error.message === 'GEMINI_TIMEOUT'))) {
        return res.status(504).json({
          success: false,
          message: 'Tempo limite esgotado ao gerar treino com o modelo de IA. Tente novamente.',
        });
      }

      console.error('Error generating workout with Gemini:', error);
      // Return graceful fallback routine on failure
      const fallback = generateProfileFallback(
        focus,
        durationMinutes,
        language,
        allowedEquipment,
        experienceLevel,
        profileGoals,
      );
      const validatedFallback = fallback
        ? validateAndAdaptGeneratedWorkout(fallback, allowedEquipment, experienceLevel, { language })
        : null;
      if (!validatedFallback) {
        return res.status(422).json({ success: false, message: 'Não há exercícios cadastrados para os equipamentos selecionados.' });
      }
      return res.status(200).json({
        success: true,
        isFallback: true,
        routine: validatedFallback,
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      geminiConcurrentRequests = Math.max(0, geminiConcurrentRequests - 1);
    }
  } catch (error: unknown) {
    console.error('Unexpected error in handleGenerateWorkout:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao processar a requisição.',
    });
  }
}

export function generateProfileFallback(
  focus: string,
  duration: number,
  language: 'pt' | 'en',
  equipment: TrainingEquipment[],
  experience: ExperienceLevel,
  goals: ProfileGoal[],
): GeneratedWorkout | null {
  const isPt = language !== 'en';
  const fallback = generateFallbackRoutine(focus, duration, language);
  const focusText = focus.toLowerCase();
  const prefersFullBody = focusText.includes('full') || goals.some(goal => goal === 'weight_loss' || goal === 'fitness' || goal === 'health');
  const focusLower = focus.toLowerCase();
  const focusMuscleMap: Record<string, string[]> = {
    push: ['chest', 'shoulders', 'triceps'],
    pull: ['back', 'biceps', 'hamstrings'],
    legs: ['quads', 'glutes', 'hamstrings', 'calves'],
    upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    lower: ['quads', 'glutes', 'hamstrings', 'calves'],
  };
  let targetFocusMuscles: string[] = [];
  Object.keys(focusMuscleMap).forEach((key) => {
    if (focusLower.includes(key)) targetFocusMuscles = focusMuscleMap[key];
  });
  if (targetFocusMuscles.length === 0) {
    targetFocusMuscles = ['chest', 'back', 'shoulders', 'quads'];
  }

  let exercises: any[] = [];
  if (!prefersFullBody) {
    const compatible = Object.values(EXERCISE_DATABASE)
      .filter((exercise: Exercise) =>
        hasValidExerciseMedia(exercise) &&
        isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired) &&
        targetFocusMuscles.includes(exercise.primaryMuscle),
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    const count = Math.min(compatible.length, 5);
    exercises = compatible.slice(0, count).map((exercise: Exercise) => ({
      exerciseId: exercise.id,
      name: isPt ? exercise.namePt : exercise.name,
      ...(exercise.namePt ? { namePt: exercise.namePt } : {}),
      primaryMuscle: exercise.primaryMuscle,
      ...(exercise.secondaryMuscles?.length ? { secondaryMuscles: exercise.secondaryMuscles } : {}),
      category: exercise.category,
      ...(exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {}),
      // Fallback sem avaliação individual: não prescreve carga. O usuário ajusta pela técnica e pelo esforço percebido (RPE).
      defaultWeight: 0,
      defaultReps: exercise.defaultReps,
      setsCount: experience === 'beginner' ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
      targetRestSeconds: exercise.restSeconds,
      tempo: exercise.tempo || '',
      notes: exercise.notes || '',
      ...(exercise.notesPt ? { notesPt: exercise.notesPt } : {}),
      ...(exercise.media ? { media: exercise.media } : {}),
    }));
  }

  if (exercises.length === 0) {
    exercises = [];
  }
  const needsExerciseCatalogFallback = exercises.length === 0;

  if (prefersFullBody || needsExerciseCatalogFallback) {
    const compatible = Object.values(EXERCISE_DATABASE)
      .filter((exercise: Exercise) =>
        hasValidExerciseMedia(exercise) &&
        isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired),
      )
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, 5);
    exercises = compatible.map((exercise: Exercise) => ({
      exerciseId: exercise.id,
      name: isPt ? exercise.namePt : exercise.name,
      ...(exercise.namePt ? { namePt: exercise.namePt } : {}),
      primaryMuscle: exercise.primaryMuscle,
      ...(exercise.secondaryMuscles?.length ? { secondaryMuscles: exercise.secondaryMuscles } : {}),
      category: exercise.category,
      ...(exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {}),
      // Fallback sem avaliação individual: não prescreve carga. O usuário ajusta pela técnica e pelo esforço percebido (RPE).
      defaultWeight: 0,
      defaultReps: exercise.defaultReps,
      setsCount: experience === 'beginner' ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
      targetRestSeconds: exercise.restSeconds,
      tempo: exercise.tempo || '',
      notes: exercise.notes || '',
      ...(exercise.notesPt ? { notesPt: exercise.notesPt } : {}),
      ...(exercise.media ? { media: exercise.media } : {}),
    }));
  } else if (experience === 'beginner') {
    exercises = exercises.map(exercise => ({ ...exercise, setsCount: Math.min(3, exercise.setsCount) }));
  }

  if (exercises.length === 0) return null;

  let remainingSets = getWorkoutSetBudget(duration);
  exercises = exercises.flatMap((exercise) => {
    const setsCount = Math.min(exercise.setsCount, remainingSets);
    if (setsCount < 1) return [];
    remainingSets -= setsCount;
    return [{ ...exercise, setsCount }];
  });
  if (exercises.length === 0) return null;

  const targetMuscles = [...new Set(exercises.map(exercise => exercise.primaryMuscle))];
  const candidate = {
    ...fallback,
    title: prefersFullBody || needsExerciseCatalogFallback
      ? (isPt ? 'FitFlow Corpo Todo Adaptado' : 'FitFlow Adapted Full Body')
      : fallback.title,
    category: prefersFullBody || needsExerciseCatalogFallback ? 'Full Body' : fallback.category,
    difficulty: experience === 'beginner' ? 'Beginner' : experience === 'intermediate' ? 'Intermediate' : 'Advanced',
    targetDurationMinutes: duration,
    targetMuscles,
    exercises,
    coachingNotes: isPt
      ? `Rotina adaptada para seus objetivos de ${describeGoals(goals)} e nível ${experiencePrompt[experience]}. Carga não prescrita: comece sem peso ou com carga leve, ajuste pela execução técnica e pelo esforço percebido (RPE). Reduza a carga ou interrompa o exercício se houver dor, tontura, falta de ar ou sintomas anormais.`
      : `Routine adapted for your goals (${describeGoals(goals)}) and ${experiencePrompt[experience]} experience level. No load prescribed: start with no weight or a light load, adjust by technique and perceived exertion (RPE). Reduce the load or stop the exercise if you feel pain, dizziness, shortness of breath, or abnormal symptoms.`,
  };

  return validateGeneratedWorkout(candidate, equipment, { language });
}

function buildFallbackExerciseEntry(exerciseId: string, isPt: boolean) {
  const ex = EXERCISE_DATABASE[exerciseId];
  return {
    exerciseId: ex.id,
    name: isPt ? ex.namePt : ex.name,
    ...(ex.namePt ? { namePt: ex.namePt } : {}),
    primaryMuscle: ex.primaryMuscle,
    ...(ex.secondaryMuscles?.length ? { secondaryMuscles: ex.secondaryMuscles } : {}),
    category: ex.category,
    ...(ex.equipmentRequired ? { equipmentRequired: ex.equipmentRequired } : {}),
    defaultWeight: 0,
    defaultReps: ex.defaultReps,
    setsCount: ex.defaultSets,
    targetRestSeconds: ex.restSeconds,
    ...(ex.tempo ? { tempo: ex.tempo } : {}),
    ...(ex.notes ? { notes: ex.notes } : {}),
    ...(ex.notesPt ? { notesPt: ex.notesPt } : {}),
    ...(ex.media ? { media: ex.media } : {}),
  };
}

// Helper for deterministic high quality fallback
export function generateFallbackRoutine(
  focus: string,
  duration: number,
  language: 'pt' | 'en',
) {
  const isPt = language !== 'en';
  const focusStr = focus.toLowerCase();

  if (focusStr.includes('pull') || focusStr.includes('costas') || focusStr.includes('back')) {
    return {
      title: isPt ? 'Pull Dinâmico: Dorsais & Bíceps' : 'Dynamic Pull: Lats & Posterior Power',
      category: 'Pull',
      targetDurationMinutes: duration,
      difficulty: 'Advanced',
      targetMuscles: ['back', 'biceps'],
      xpReward: 380,
      coachingNotes: isPt
        ? 'Foque em puxar com os cotovelos e sustentar 1s no pico de contração.'
        : 'Drive with your elbows and pause for 1s at peak contraction.',
      exercises: [
        buildFallbackExerciseEntry('barbell_deadlift', isPt),
        buildFallbackExerciseEntry('lat_pulldown', isPt),
        buildFallbackExerciseEntry('barbell_row', isPt),
        buildFallbackExerciseEntry('barbell_curl', isPt),
      ],
    };
  }

  return {
    title: isPt ? 'Push Alfa: Peitorais & Tríceps' : 'Alpha Push: Chest & Deltoid Force',
    category: 'Push',
    targetDurationMinutes: duration,
    difficulty: 'Advanced',
    targetMuscles: ['chest', 'shoulders', 'triceps'],
    xpReward: 380,
    coachingNotes: isPt
      ? 'Controle a fase excêntrica da descida para gerar o máximo de estímulo hipertrófico.'
      : 'Control the eccentric descent to maximize mechanical hypertrophy tension.',
    exercises: [
      buildFallbackExerciseEntry('bench_press', isPt),
      buildFallbackExerciseEntry('incline_db_press', isPt),
      buildFallbackExerciseEntry('lateral_raise', isPt),
      buildFallbackExerciseEntry('tricep_pushdown', isPt),
    ],
  };
}
