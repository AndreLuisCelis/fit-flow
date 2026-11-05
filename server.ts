import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { Exercise } from './src/types/workout';
import { EXPERIENCE_LEVELS, PROFILE_GOALS, TRAINING_EQUIPMENT, ExperienceLevel, ProfileGoal, TrainingEquipment } from './src/types/profile';
import { EXERCISE_DATABASE } from './src/data/presetRoutines';
import { adaptGeneratedWorkout, describeGoals, experiencePrompt, GeneratedWorkout, isEquipmentAvailable, validateGeneratedWorkout } from './src/utils/workoutPersonalization';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

function normalizeProfileGoals(value: unknown): ProfileGoal[] {
  const input = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const goals = [...new Set(input.filter(
    (goal): goal is ProfileGoal =>
      typeof goal === 'string' && PROFILE_GOALS.includes(goal as ProfileGoal),
  ))];
  return goals.length > 0 ? goals : ['muscle_gain'];
}

// API Route: Generate or adapt workout via Gemini 3.8 Flash
app.post('/api/gemini/generate-workout', async (req, res) => {
  try {
    const body = req.body ?? {};
    const { 
      focus, 
      durationMinutes, 
      fatigueLevel, 
      language, 
      frequentExercises, 
      targetGoal 
    } = body;
    const requestedEquipment = Array.isArray(body.profileEquipment)
      ? body.profileEquipment
      : Array.isArray(body.equipment)
        ? body.equipment
        : ['barbell', 'dumbbell', 'cable', 'machine'];
    const availableEquipment: TrainingEquipment[] = [...new Set<TrainingEquipment>(requestedEquipment.filter(
      (item: unknown): item is TrainingEquipment =>
        typeof item === 'string' && TRAINING_EQUIPMENT.includes(item as TrainingEquipment),
    ))];
    if (availableEquipment.length === 0) {
      return res.status(400).json({ success: false, message: 'Selecione equipamentos válidos no perfil.' });
    }

    const profileGoals = normalizeProfileGoals(body.profileGoals ?? body.profileGoal);
    const experienceLevel: ExperienceLevel = EXPERIENCE_LEVELS.includes(body.experienceLevel) ? body.experienceLevel : 'intermediate';
    const allowedEquipment = Array.isArray(body.equipment)
      ? availableEquipment.filter(item => body.equipment.includes(item))
      : availableEquipment;
    if (allowedEquipment.length === 0) {
      return res.status(400).json({ success: false, message: 'Selecione ao menos um equipamento disponível no perfil.' });
    }

    if (!ai) {
      // Fallback if no API key configured in dev
      const routine = generateProfileFallback(focus, durationMinutes, language, allowedEquipment, experienceLevel, profileGoals);
      if (!routine) {
        return res.status(422).json({ success: false, message: 'Não há exercícios cadastrados para os equipamentos selecionados.' });
      }
      return res.status(200).json({
        success: true,
        isFallback: true,
        message: 'No API key provided, generated via local kinetic engine',
        routine,
      });
    }

    const langName = language === 'en' ? 'English' : 'Portuguese (Português do Brasil)';
    const freqExercisesText = Array.isArray(frequentExercises) && frequentExercises.length > 0
        ? frequentExercises.join(', ')
      : 'No exercise history available';

    const prompt = `
You are the elite conditioning coach behind FitFlow PWA.
Create an athletic workout routine with progressive overload metrics in ${langName}.

User Parameters & Historical Telemetry:
- Muscle Focus: ${focus || 'Full Body Hypertrophy'}
- Session Duration: ${durationMinutes || 45} minutes
- Available Equipment: ${allowedEquipment.join(', ')}
- Main Goals: ${describeGoals(profileGoals)}
- Experience Level: ${experiencePrompt[experienceLevel]}
- Athlete Fatigue Level: ${fatigueLevel || 'Normal'}
- Specific Training Goal: ${targetGoal || 'Hipertrofia & Sobrecarga Progressiva'}
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
  "xpReward": number (e.g. 380),
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
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9,
        topP: 0.95,
      },
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);
    const validatedRoutine = validateGeneratedWorkout(parsedData, allowedEquipment);
    if (!validatedRoutine) {
      throw new Error('Gemini returned an invalid or equipment-incompatible workout');
    }
    const personalizedRoutine = adaptGeneratedWorkout(validatedRoutine, experienceLevel);

    return res.status(200).json({
      success: true,
      routine: personalizedRoutine,
    });
  } catch (error: unknown) {
    console.error('Error generating workout with Gemini:', error);
    // Return graceful fallback routine on failure
    const fallback = generateProfileFallback(
      req.body?.focus,
      req.body?.durationMinutes,
      req.body?.language,
      Array.isArray(req.body?.profileEquipment)
        ? req.body.profileEquipment.filter((item: unknown): item is TrainingEquipment =>
            TRAINING_EQUIPMENT.includes(item as TrainingEquipment) &&
            (!Array.isArray(req.body?.equipment) || req.body.equipment.includes(item)))
        : ['barbell', 'dumbbell', 'cable', 'machine'],
      EXPERIENCE_LEVELS.includes(req.body?.experienceLevel) ? req.body.experienceLevel : 'intermediate',
      normalizeProfileGoals(req.body?.profileGoals ?? req.body?.profileGoal),
    );
    if (!fallback) {
      return res.status(422).json({ success: false, message: 'Não há exercícios cadastrados para os equipamentos selecionados.' });
    }
    return res.status(200).json({
      success: true,
      isFallback: true,
      routine: fallback,
    });
  }
});

function generateProfileFallback(
  focus: string | undefined,
  duration: number | undefined,
  language: string | undefined,
  equipment: TrainingEquipment[],
  experience: ExperienceLevel,
  goals: ProfileGoal[],
): GeneratedWorkout | null {
  const isPt = language !== 'en';
  const fallback = generateFallbackRoutine(focus, duration, language);
  const focusText = (focus || '').toLowerCase();
  const prefersFullBody = focusText.includes('full') || goals.some(goal => goal === 'weight_loss' || goal === 'fitness' || goal === 'health');
  const focusLower = (focus || '').toLowerCase();
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
      .sort(() => Math.random() - 0.5);
    const count = Math.min(compatible.length, 4 + (Math.random() > 0.5 ? 1 : 0));
    exercises = compatible.slice(0, count).map((exercise: Exercise) => ({
      name: isPt ? exercise.namePt : exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      category: exercise.category,
      ...(exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {}),
      defaultWeight: exercise.defaultWeight,
      defaultReps: exercise.defaultReps,
      setsCount: experience === 'beginner' ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
      targetRestSeconds: exercise.restSeconds,
      tempo: exercise.tempo || '',
      notes: exercise.notes || '',
      ...(exercise.notesPt ? { notesPt: exercise.notesPt } : {}),
    }));
  }

  if (exercises.length === 0) {
    exercises = fallback.exercises
      .filter((exercise: any) => equipment.includes(exercise.category as TrainingEquipment))
      .sort(() => Math.random() - 0.5);
  }
  const needsExerciseCatalogFallback = exercises.length === 0;

  if (prefersFullBody || needsExerciseCatalogFallback) {
    const compatible = Object.values(EXERCISE_DATABASE)
      .filter((exercise: Exercise) => isEquipmentAvailable(exercise.category, equipment, exercise.equipmentRequired))
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    exercises = compatible.map((exercise: Exercise) => ({
      name: isPt ? exercise.namePt : exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      category: exercise.category,
      ...(exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {}),
      defaultWeight: exercise.defaultWeight,
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

  // Introduce light variation so repeated generations are not identical
  exercises = exercises.map(exercise => ({
    ...exercise,
    setsCount: Math.max(2, (exercise.setsCount || 3) + (Math.random() > 0.5 ? 1 : 0)),
    defaultReps: Math.max(5, (exercise.defaultReps || 10) + (Math.floor(Math.random() * 3) - 1)),
    defaultWeight: typeof exercise.defaultWeight === 'number'
      ? Math.max(0, Math.round(exercise.defaultWeight * (0.9 + Math.random() * 0.2)))
      : exercise.defaultWeight,
    targetRestSeconds: [60, 75, 90][Math.floor(Math.random() * 3)],
  }));

  const targetMuscles = [...new Set(exercises.map(exercise => exercise.primaryMuscle))];
  const candidate = {
    ...fallback,
    title: prefersFullBody || needsExerciseCatalogFallback
      ? (isPt ? 'FitFlow Corpo Todo Adaptado' : 'FitFlow Adapted Full Body')
      : `${fallback.title} ${['· Alfa','· Beta','· Gama','· Delta'][Math.floor(Math.random() * 4)]}`,
    category: prefersFullBody || needsExerciseCatalogFallback ? 'Full Body' : fallback.category,
    difficulty: experience === 'beginner' ? 'Beginner' : experience === 'intermediate' ? 'Intermediate' : 'Advanced',
    targetDurationMinutes: duration || 45,
    targetMuscles,
    exercises,
    coachingNotes: isPt
      ? `Rotina adaptada para seus objetivos de ${describeGoals(goals)} e nível ${experiencePrompt[experience]}.`
      : `Routine adapted for your goals (${describeGoals(goals)}) and ${experiencePrompt[experience]} experience level.`,
  };

  return validateGeneratedWorkout(candidate, equipment);
}

// Helper for deterministic high quality fallback
function generateFallbackRoutine(
  focus?: string, 
  duration?: number, 
  language?: string,
) {
  const isPt = language !== 'en';
  const focusStr = (focus || 'Push').toLowerCase();

  if (focusStr.includes('pull') || focusStr.includes('costas') || focusStr.includes('back')) {
    return {
      title: isPt ? 'Pull Dinâmico: Dorsais & Bíceps' : 'Dynamic Pull: Lats & Posterior Power',
      category: 'Pull',
      targetDurationMinutes: duration || 45,
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
          defaultWeight: 120,
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
          defaultWeight: 65,
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
          defaultWeight: 70,
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
          defaultWeight: 30,
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
    targetDurationMinutes: duration || 45,
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
        defaultWeight: 80,
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
        defaultWeight: 30,
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
        defaultWeight: 22,
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
        defaultWeight: 25,
        defaultReps: 12,
        setsCount: 3,
        targetRestSeconds: 60,
        tempo: '2-0-1-1',
        notes: isPt ? 'Abra a corda no final da extensão.' : 'Flare rope at full extension.',
      },
    ],
  };
}

// Development vs Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const server = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FitFlow PWA server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
