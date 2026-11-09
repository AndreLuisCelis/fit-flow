import express from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Exercise } from '../types/workout';
import { ExperienceLevel, ProfileGoal, TrainingEquipment } from '../types/profile';
import { EXERCISE_DATABASE } from '../data/presetRoutines';
import {
  describeGoals,
  experiencePrompt,
  getWorkoutSetBudget,
  GeneratedWorkout,
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
    // Lazily initialize client if environment variable was added/updated at runtime
    if (!geminiClient.current && process.env.GEMINI_API_KEY) {
      geminiClient.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    if (!geminiClient.current) {
      // Fallback if no API key configured in dev
      const routine = generateProfileFallback(focus, durationMinutes, language, allowedEquipment, experienceLevel, profileGoals);
      const validatedFallback = routine
        ? validateAndAdaptGeneratedWorkout(routine, allowedEquipment, experienceLevel)
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

Coaching Directives:
1. Prioritize and intelligently incorporate the athlete's most frequent exercises (or progressive overload variations of them) that strictly match the available equipment.
2. Only select exercises that can be performed using the specified available equipment.
  For bodyweight movements that require apparatus (for example, hanging leg raises), declare that apparatus in equipmentRequired.
3. Include specific tempo (e.g. 3-0-1-0), realistic default starting weights in kg, target rep ranges, and rest intervals.
5. Use the request variation seed to ensure this routine is not identical to previous generations; vary exercise order, rep ranges, loads and rest periods while staying within equipment constraints.

Respond ONLY with valid JSON (no markdown formatting, no code block backticks) adhering strictly to this schema:
{
  "title": "string (Creative athletic title)",
  "category": "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Full Body",
  "targetDurationMinutes": number,
  "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Hardcore",
  "targetMuscles": ["chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "calves" | "core" | "glutes"],
  "xpReward": integer from 0 to 5000 (e.g. 380),
  "coachingNotes": "string (1-2 motivational tactical sentences tailored to their frequent exercises)",
  "exercises": [
    {
      "name": "string (Exercise name)",
      "primaryMuscle": "chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "calves" | "core" | "glutes",
      "category": "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "bands",
      "equipmentRequired": ["pull_up_bar"] (optional; list additional required equipment),
      "defaultWeight": number (in kg, realistic default like 60, 80, 20),
      "defaultReps": number (e.g. 8, 10, 12),
      "setsCount": number (e.g. 3 or 4),
      "targetRestSeconds": number (e.g. 60, 75, 90),
      "tempo": "string (e.g. 3-0-1-0)",
      "notes": "string (form cue)"
    }
  ]
}
Constraints: targetDurationMinutes is an integer from 10 to 240. Include 1–6 unique target muscles, exactly matching the primaryMuscle values used by the exercises. Include 4–5 focused exercises (do not exceed 5). Keep coachingNotes to 1 concise sentence. defaultWeight must be from 0 to 500 kg; defaultReps an integer from 1 to 30; setsCount an integer from 1 to 12; targetRestSeconds an integer from 0 to 600. Total sets must not exceed two thirds of targetDurationMinutes (rounded down). Use only declared fields; do not add fields.
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

      const response = await Promise.race([
        geminiClient.current.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            abortSignal: abortController.signal,
          },
        }),
        timeoutPromise,
      ]);

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      const personalizedRoutine = validateAndAdaptGeneratedWorkout(parsedData, allowedEquipment, experienceLevel);
      if (!personalizedRoutine) {
        throw new Error('Gemini returned an invalid or equipment-incompatible workout');
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
        ? validateAndAdaptGeneratedWorkout(fallback, allowedEquipment, experienceLevel)
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
      .filter((exercise: Exercise) => isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired) && targetFocusMuscles.includes(exercise.primaryMuscle))
      .sort((left, right) => left.id.localeCompare(right.id));
    const count = Math.min(compatible.length, 5);
    exercises = compatible.slice(0, count).map((exercise: Exercise) => ({
      name: isPt ? exercise.namePt : exercise.name,
      primaryMuscle: exercise.primaryMuscle,
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
    }));
  }

  if (exercises.length === 0) {
    exercises = [];
  }
  const needsExerciseCatalogFallback = exercises.length === 0;

  if (prefersFullBody || needsExerciseCatalogFallback) {
    const compatible = Object.values(EXERCISE_DATABASE)
      .filter((exercise: Exercise) => isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired))
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, 5);
    exercises = compatible.map((exercise: Exercise) => ({
      name: isPt ? exercise.namePt : exercise.name,
      primaryMuscle: exercise.primaryMuscle,
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

  return validateGeneratedWorkout(candidate, equipment);
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
      targetMuscles: ['back', 'biceps', 'hamstrings'],
      xpReward: 380,
      coachingNotes: isPt
        ? 'Foque em puxar com os cotovelos e sustentar 1s no pico de contração.'
        : 'Drive with your elbows and pause for 1s at peak contraction.',
      exercises: [
        {
          name: isPt ? 'Levantamento Terra Convencional' : 'Conventional Deadlift',
          primaryMuscle: 'back',
          category: 'barbell',
          defaultWeight: 0,
          defaultReps: 5,
          setsCount: 4,
          targetRestSeconds: 90,
          tempo: '2-1-1-0',
          notes: isPt ? 'Trave o abdômen e exploda na subida.' : 'Brace core and explode through hips.',
        },
        {
          name: isPt ? 'Puxada Alta na Polia' : 'Lat Pulldown',
          primaryMuscle: 'back',
          category: 'cable',
          defaultWeight: 0,
          defaultReps: 10,
          setsCount: 4,
          targetRestSeconds: 75,
          tempo: '2-0-1-1',
          notes: isPt ? 'Puxe a barra até a clavícula.' : 'Pull bar to clavicle.',
        },
        {
          name: isPt ? 'Remada Curvada com Barra' : 'Bent-Over Barbell Row',
          primaryMuscle: 'back',
          category: 'barbell',
          defaultWeight: 0,
          defaultReps: 8,
          setsCount: 3,
          targetRestSeconds: 75,
          tempo: '2-0-1-0',
          notes: isPt ? 'Tronco fixo em 45 graus.' : 'Lock torso at 45 degrees.',
        },
        {
          name: isPt ? 'Rosca Direta com Barra W' : 'EZ-Bar Bicep Curl',
          primaryMuscle: 'biceps',
          category: 'barbell',
          defaultWeight: 0,
          defaultReps: 10,
          setsCount: 3,
          targetRestSeconds: 60,
          tempo: '2-0-1-1',
          notes: isPt ? 'Cotovelos firmes ao lado do tronco.' : 'Keep elbows pinned to sides.',
        },
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
      {
        name: isPt ? 'Supino Reto com Barra' : 'Barbell Bench Press',
        primaryMuscle: 'chest',
        category: 'barbell',
        defaultWeight: 0,
        defaultReps: 8,
        setsCount: 4,
        targetRestSeconds: 90,
        tempo: '3-0-1-0',
        notes: isPt ? 'Escápulas aduzidas e pés cravados no chão.' : 'Retract scapula and drive feet into ground.',
      },
      {
        name: isPt ? 'Supino Inclinado com Halteres' : 'Incline Dumbbell Press',
        primaryMuscle: 'chest',
        category: 'dumbbell',
        defaultWeight: 0,
        defaultReps: 10,
        setsCount: 3,
        targetRestSeconds: 75,
        tempo: '2-1-1-0',
        notes: isPt ? 'Banco a 30 graus, alongamento completo na base.' : '30-degree incline, deep stretch at bottom.',
      },
      {
        name: isPt ? 'Desenvolvimento com Halteres' : 'Dumbbell Shoulder Press',
        primaryMuscle: 'shoulders',
        category: 'dumbbell',
        defaultWeight: 0,
        defaultReps: 10,
        setsCount: 3,
        targetRestSeconds: 75,
        tempo: '2-0-1-0',
        notes: isPt ? 'Trave o core ao empurrar verticalmente.' : 'Lock core while pressing overhead.',
      },
      {
        name: isPt ? 'Tríceps Corda no Cross' : 'Cable Triceps Pushdown',
        primaryMuscle: 'triceps',
        category: 'cable',
        defaultWeight: 0,
        defaultReps: 12,
        setsCount: 3,
        targetRestSeconds: 60,
        tempo: '2-0-1-1',
        notes: isPt ? 'Abra a corda no final da extensão.' : 'Flare rope at full extension.',
      },
    ],
  };
}
