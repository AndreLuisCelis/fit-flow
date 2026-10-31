import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// API Route: Generate or adapt workout via Gemini 3.8 Flash
app.post('/api/gemini/generate-workout', async (req, res) => {
  try {
    const { 
      focus, 
      durationMinutes, 
      equipment, 
      fatigueLevel, 
      language, 
      frequentExercises, 
      targetGoal 
    } = req.body;

    if (!ai) {
      // Fallback if no API key configured in dev
      return res.status(200).json({
        success: true,
        isFallback: true,
        message: 'No API key provided, generated via local kinetic engine',
        routine: generateFallbackRoutine(focus, durationMinutes, language, frequentExercises, equipment),
      });
    }

    const langName = language === 'en' ? 'English' : 'Portuguese (Português do Brasil)';
    const freqExercisesText = Array.isArray(frequentExercises) && frequentExercises.length > 0
      ? frequentExercises.join(', ')
      : 'Supino Reto, Agachamento Livre, Puxada Alta, Elevação Lateral';

    const prompt = `
You are the elite conditioning coach behind FitFlow PWA.
Create an athletic workout routine with progressive overload metrics in ${langName}.

User Parameters & Historical Telemetry:
- Muscle Focus: ${focus || 'Full Body Hypertrophy'}
- Session Duration: ${durationMinutes || 45} minutes
- Available Equipment: ${equipment || 'Full Gym (Barbell, Dumbbells, Cables, Machines)'}
- Athlete Fatigue Level: ${fatigueLevel || 'Normal'}
- Specific Training Goal: ${targetGoal || 'Hipertrofia & Sobrecarga Progressiva'}
- Athlete's Most Frequent Exercises from IndexedDB History: ${freqExercisesText}

Coaching Directives:
1. Prioritize and intelligently incorporate the athlete's most frequent exercises (or progressive overload variations of them) that strictly match the available equipment.
2. Only select exercises that can be performed using the specified available equipment.
3. Include specific tempo (e.g. 3-0-1-0), realistic default starting weights in kg, target rep ranges, and rest intervals.
4. Provide 1-2 sharp, tactical coaching notes highlighting why this routine matches their historical strengths.

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
      "category": "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight",
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
      },
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      routine: parsedData,
    });
  } catch (error: unknown) {
    console.error('Error generating workout with Gemini:', error);
    // Return graceful fallback routine on failure
    const fallback = generateFallbackRoutine(
      req.body?.focus,
      req.body?.durationMinutes,
      req.body?.language,
      req.body?.frequentExercises,
      req.body?.equipment
    );
    return res.status(200).json({
      success: true,
      isFallback: true,
      routine: fallback,
    });
  }
});

// Helper for deterministic high quality fallback
function generateFallbackRoutine(
  focus?: string, 
  duration?: number, 
  language?: string,
  frequentExercises?: string[],
  equipment?: string
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
