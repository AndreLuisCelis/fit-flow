import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Sparkles, 
  BrainCircuit, 
  Dumbbell, 
  Play, 
  Save, 
  RotateCcw, 
  Check, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Clock, 
  Flame, 
  Sliders, 
  Target, 
  Shield, 
  Activity, 
  Award, 
  Info,
  ChevronRight,
  Database,
  ArrowRight
} from 'lucide-react';
import { WorkoutRoutine, CompletedSessionSummary, ExerciseInRoutine, SetEntry, Exercise } from '../types/workout';
import { UserProfile, ProfileGoal, TrainingEquipment } from '../types/profile';
import { EXERCISE_DATABASE } from '../data/presetRoutines';
import { fitFlowDB } from '../db/indexedDb';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { validateGeneratedWorkout } from '../utils/workoutPersonalization';
import { getMuscleLabel } from '../utils/localization';

interface AiCoachViewProps {
  onStartRoutine: (routine: WorkoutRoutine) => void;
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
  completedSessions: CompletedSessionSummary[];
  profile: UserProfile;
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  onStartRoutine,
  language,
  unit,
  completedSessions,
  profile,
}) => {
  // Equipment selection options
  const equipmentOptions = [
    { id: 'barbell', label: language === 'pt' ? 'Barras & Anilhas' : 'Barbells & Plates', icon: '🏋️‍♂️' },
    { id: 'dumbbell', label: language === 'pt' ? 'Halteres' : 'Dumbbells', icon: '🔩' },
    { id: 'cable', label: language === 'pt' ? 'Cabos & Polias' : 'Cables & Pulleys', icon: '⚙️' },
    { id: 'machine', label: language === 'pt' ? 'Máquinas Guiadas' : 'Selectorized Machines', icon: '🏢' },
    { id: 'bodyweight', label: language === 'pt' ? 'Peso Corporal' : 'Bodyweight', icon: '🤸' },
    { id: 'pull_up_bar', label: language === 'pt' ? 'Barra Fixa' : 'Pull-up Bar', icon: '↗' },
    { id: 'bands', label: language === 'pt' ? 'Elásticos' : 'Resistance Bands', icon: '🎗️' },
  ];

  const [selectedEquipments, setSelectedEquipments] = useState<string[]>(() => [...profile.equipment]);
  const [focus, setFocus] = useState<'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body'>(() => profile.goals.includes('muscle_gain') ? 'Push' : 'Full Body');
  const [duration, setDuration] = useState<number>(45);
  const [fatigueLevel, setFatigueLevel] = useState<'fresh' | 'normal' | 'fatigued'>('normal');
  const goalDefaults: Record<ProfileGoal, 'hypertrophy' | 'strength' | 'endurance' | 'deload'> = {
    weight_loss: 'endurance',
    muscle_gain: 'hypertrophy',
    fitness: 'endurance',
    health: 'endurance',
  };
  const [targetGoal, setTargetGoal] = useState<'hypertrophy' | 'strength' | 'endurance' | 'deload'>(() =>
    profile.goals.includes('muscle_gain') ? 'hypertrophy' : goalDefaults[profile.goals[0]],
  );

  // IndexedDB Frequent exercises state
  const [frequentExercises, setFrequentExercises] = useState<{ name: string; count: number }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [generatedRoutine, setGeneratedRoutine] = useState<any | null>(null);
  const [generatedRoutineId, setGeneratedRoutineId] = useState('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract frequent exercises from IndexedDB
  useEffect(() => {
    async function analyzeHistory() {
      setIsLoadingHistory(true);
      try {
        const history = await fitFlowDB.getHistory();
        const routines = await fitFlowDB.getRoutines();
        const exercises = await fitFlowDB.getExercises();

        // Exercise lookup by ID
        const exerciseNameMap: Record<string, string> = {};
        exercises.forEach(ex => {
          exerciseNameMap[ex.id] = language === 'pt' ? ex.namePt || ex.name : ex.name;
        });

        // Frequency map
        const freqMap: Record<string, number> = {};

        // 1. Tally from completed sessions and PRs
        history.forEach(session => {
          // Check PR names
          if (session.prsAchieved) {
            session.prsAchieved.forEach(pr => {
              const cleaned = pr.split(/\d/)[0].trim();
              if (cleaned) {
                freqMap[cleaned] = (freqMap[cleaned] || 0) + 2;
              }
            });
          }

          // Cross-reference with routines in IndexedDB
          const matchedRoutine = routines.find(r => r.title === session.routineTitle || r.titlePt === session.routineTitle);
          if (matchedRoutine && matchedRoutine.exercises) {
            matchedRoutine.exercises.forEach(exInR => {
              const name = exerciseNameMap[exInR.exerciseId] || exInR.exerciseId;
              freqMap[name] = (freqMap[name] || 0) + 1;
            });
          }
        });

        // Convert to array
        const sorted = Object.entries(freqMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setFrequentExercises(sorted.slice(0, 8));
      } catch (err) {
        console.warn('Error reading from IndexedDB:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    analyzeHistory();
  }, [language, completedSessions]);

  // Toggle equipment selection
  const handleToggleEquipment = (id: string) => {
    soundManager.playTick();
    if (!profile.equipment.includes(id as TrainingEquipment)) return;
    if (selectedEquipments.includes(id)) {
      if (selectedEquipments.length > 1) {
        setSelectedEquipments(selectedEquipments.filter(e => e !== id));
      }
    } else {
      setSelectedEquipments([...selectedEquipments, id]);
    }
  };

  // Quick equipment presets
  const handleSetPresetEquipment = (preset: 'all' | 'dumbbells' | 'bodyweight') => {
    soundManager.playTick();
    if (preset === 'all') {
      setSelectedEquipments([...profile.equipment]);
    } else if (preset === 'dumbbells') {
      const selected = profile.equipment.filter(item => item === 'dumbbell' || item === 'bodyweight');
      setSelectedEquipments(selected.length ? selected : [...profile.equipment]);
    } else if (preset === 'bodyweight') {
      const selected = profile.equipment.filter(item => item === 'bodyweight' || item === 'bands');
      setSelectedEquipments(selected.length ? selected : [...profile.equipment]);
    }
  };

  // Format weight helper
  const formatWeight = (kg: number) => {
    if (unit === 'lbs') return `${Math.round(kg * 2.20462)} lbs`;
    return `${kg} kg`;
  };

  // Generate Workout Routine with Gemini API
  const handleGenerate = async () => {
    soundManager.playTick();
    setIsGenerating(true);
    setErrorMessage(null);
    setIsSaved(false);

    const stepMessages = language === 'pt' ? [
      'Acessando histórico de sobrecarga do IndexedDB...',
      'Filtrando biomecânica para os equipamentos selecionados...',
      'Sintetizando protocolo neural via Gemini 3.8 Flash...',
      'Calculando volume ótimo, cadência e períodos de descanso...',
    ] : [
      'Querying progressive overload metrics from IndexedDB...',
      'Filtering movement patterns for selected equipment...',
      'Synthesizing neural protocol via Gemini 3.8 Flash...',
      'Optimizing rep tempo, set tonnage, and rest intervals...',
    ];

    let stepIdx = 0;
    setStatusText(stepMessages[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % stepMessages.length;
      setStatusText(stepMessages[stepIdx]);
    }, 900);

    try {
      const response = await fetch('/api/gemini/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus,
          durationMinutes: duration,
          equipment: selectedEquipments,
          profileEquipment: profile.equipment,
          profileGoals: profile.goals,
          experienceLevel: profile.experience,
          fatigueLevel,
          targetGoal,
          language,
          frequentExercises: frequentExercises.map(f => f.name),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const validatedRoutine = validateGeneratedWorkout(data.routine, selectedEquipments as TrainingEquipment[]);
      if (!validatedRoutine) {
        throw new Error('Invalid response structure');
      }

      setGeneratedRoutine(validatedRoutine);
      setGeneratedRoutineId(`ai-routine-${Date.now()}`);
      soundManager.playLevelUp();

      // Confetti celebration
      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#CCFF00', '#38BDF8', '#8B5CF6'],
        });
      } catch {}

    } catch (err: any) {
      console.error('Error generating workout:', err);
      setErrorMessage(
        language === 'pt'
          ? 'Não foi possível sintetizar a rotina via Gemini. Tente novamente.'
          : 'Failed to synthesize workout via Gemini. Please try again.'
      );
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  // Convert AI generated routine into app WorkoutRoutine model
  const buildRoutineModel = (): WorkoutRoutine => {
    if (!generatedRoutine) throw new Error('No routine generated');

    const exercisesInRoutine: ExerciseInRoutine[] = generatedRoutine.exercises.map((ex: any, idx: number) => {
      const exerciseId = `${generatedRoutineId}-ex-${idx}`;
      const generatedSets: SetEntry[] = [];
      const setsCount = ex.setsCount || 3;
      const defaultWeight = typeof ex.defaultWeight === 'number' ? ex.defaultWeight : 50;
      const defaultReps = ex.defaultReps || 10;

      const exercise: Exercise = {
        id: exerciseId,
        name: ex.name,
        namePt: ex.name,
        primaryMuscle: ex.primaryMuscle,
        category: ex.category,
        equipmentRequired: ex.equipmentRequired,
        defaultSets: setsCount,
        defaultReps,
        defaultWeight,
        restSeconds: ex.targetRestSeconds || 75,
        notes: ex.notes,
        notesPt: language === 'pt' ? ex.notes : ex.notesPt,
        tempo: ex.tempo,
      };
      EXERCISE_DATABASE[exerciseId] = exercise;

      for (let i = 1; i <= setsCount; i++) {
        generatedSets.push({
          id: `set-gen-${idx}-${i}`,
          setNumber: i,
          weight: defaultWeight,
          reps: defaultReps,
          isCompleted: false,
          isWarmup: i === 1,
        });
      }

      return {
        exerciseId,
        sets: generatedSets,
        targetRestSeconds: ex.targetRestSeconds || 75,
        customNotes: ex.notes || ex.tempo ? `Cadência: ${ex.tempo}. ${ex.notes || ''}` : undefined,
      };
    });

    return {
      id: generatedRoutineId,
      title: generatedRoutine.title,
      titlePt: generatedRoutine.title,
      category: generatedRoutine.category || focus,
      targetDurationMinutes: generatedRoutine.targetDurationMinutes || duration,
      difficulty: generatedRoutine.difficulty || 'Advanced',
      targetMuscles: generatedRoutine.targetMuscles || ['chest'],
      exercises: exercisesInRoutine,
      xpReward: generatedRoutine.xpReward || 380,
      createdAt: new Date().toISOString(),
    };
  };

  // Launch Workout
  const handleLaunchWorkout = () => {
    if (!generatedRoutine) return;
    const routineModel = buildRoutineModel();
    onStartRoutine(routineModel);
  };

  // Save to IndexedDB
  const handleSaveToIndexedDb = async () => {
    if (!generatedRoutine || isSaved) return;
    try {
      const routineModel = buildRoutineModel();
      await Promise.all(routineModel.exercises.map(item => {
        const exercise = EXERCISE_DATABASE[item.exerciseId];
        return exercise ? fitFlowDB.saveExercise(exercise) : Promise.resolve();
      }));
      await fitFlowDB.saveRoutine(routineModel);
      setIsSaved(true);
      soundManager.playTick();
    } catch (err) {
      console.error('Error saving routine to IndexedDB:', err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 pt-2 px-3 sm:px-6 space-y-6">
      
      {/* Top Banner: AI Coach Hero */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#8B5CF6]/20 via-[#38BDF8]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#CCFF00] via-[#38BDF8] to-[#8B5CF6] p-0.5 shadow-glow-volt">
              <div className="w-full h-full bg-[#0A0F1D] rounded-2xl flex items-center justify-center text-[#CCFF00]">
                <Bot className="w-7 h-7" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-numbers uppercase tracking-widest text-[#CCFF00] font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#CCFF00]" />
                  {language === 'pt' ? 'MOTOR NEURAL GEMINI 3.8 FLASH' : 'GEMINI 3.8 FLASH ENGINE'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 font-bold">
                  {language === 'pt' ? 'Histórico local conectado' : 'IndexedDB Connected'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
                {language === 'pt' ? 'Treinador IA Personalizado' : 'Personalized AI Coach'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl px-3.5 py-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-xs font-mono-numbers text-slate-300">
                {completedSessions.length} {language === 'pt' ? 'treinos analisados' : 'sessions analyzed'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          {language === 'pt'
            ? 'O Treinador IA analisa seu histórico real de exercícios mais frequentes salvo no IndexedDB e gera um protocolo biomecânico sob medida para os equipamentos que você tem disponíveis hoje.'
            : 'The AI Coach analyzes your real exercise frequency from IndexedDB and synthesizes an optimized workout tailored to your available equipment today.'}
        </p>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: IndexedDB Telemetry & Frequent Exercises (5 cols) */}
        <div className="lg:col-span-5 bg-[#0F172A] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-[#38BDF8] font-bold flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-[#38BDF8]" />
                {language === 'pt' ? 'HISTÓRICO NO INDEXEDDB' : 'INDEXEDDB FREQUENCY'}
              </span>
              <span className="text-[10px] font-mono-numbers text-slate-400">
                Top Exercícios
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {language === 'pt'
                ? 'Exercícios mais frequentes identificados nos seus treinos anteriores. O Gemini dará prioridade a esses movimentos ou variações de sobrecarga:'
                : 'Most frequent exercises identified in your training logs. Gemini will prioritize these movements or progressive variations:'}
            </p>

            {/* Frequent Exercise Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {frequentExercises.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-[#1E293B] border border-slate-700/80 flex items-center gap-2 text-xs font-mono-numbers"
                >
                  <span className="text-slate-200 font-semibold">{item.name}</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-[#38BDF8]/20 text-[#38BDF8] text-[10px] font-bold">
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tip Box */}
          <div className="p-3.5 rounded-2xl bg-[#161B2A] border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
            <span>
              {language === 'pt'
                ? 'Quanto mais treinos você registra, mais preciso o modelo se torna na progressão de carga e volume.'
                : 'The more workouts you log, the more accurately Gemini calibrates your progressive overload volume.'}
            </span>
          </div>
        </div>

        {/* Right Column: Training Setup & Available Equipment (7 cols) */}
        <div className="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-3xl p-6 space-y-6">
          
          {/* Section 1: Equipment Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-mono-numbers tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-[#CCFF00]" />
                {language === 'pt' ? 'Equipamentos Disponíveis Hoje:' : 'Available Equipment Today:'}
              </span>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetPresetEquipment('all')}
                  className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#1E293B] hover:bg-slate-700 text-slate-300"
                >
                  {language === 'pt' ? 'Academia' : 'Full Gym'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetEquipment('dumbbells')}
                  className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#1E293B] hover:bg-slate-700 text-slate-300"
                >
                  {language === 'pt' ? 'Halteres' : 'Dumbbells'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetEquipment('bodyweight')}
                  className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#1E293B] hover:bg-slate-700 text-slate-300"
                >
                  {language === 'pt' ? 'Corpo' : 'Bodyweight'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {equipmentOptions.filter(eq => profile.equipment.includes(eq.id as TrainingEquipment)).map((eq) => {
                const isSelected = selectedEquipments.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => handleToggleEquipment(eq.id)}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-[#1E293B] border-[#CCFF00] text-white shadow-sm'
                        : 'bg-[#161B2A]/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">{eq.icon}</span>
                    <span className="text-xs font-mono-numbers font-semibold">
                      {eq.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#CCFF00] ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Muscle Focus & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase font-mono-numbers text-slate-400 block mb-2 font-semibold">
                {language === 'pt' ? 'Foco Muscular:' : 'Muscle Focus:'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      soundManager.playTick();
                      setFocus(cat);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-mono-numbers font-bold transition-all border ${
                      focus === cat
                        ? 'bg-[#CCFF00] text-[#0A0F1D] border-[#CCFF00]'
                        : 'bg-[#1E293B] text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {language === 'pt'
                      ? ({ Push: 'Empurrar', Pull: 'Puxar', Legs: 'Pernas', Upper: 'Parte superior', Lower: 'Parte inferior', 'Full Body': 'Corpo todo' } as const)[cat]
                      : cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase font-mono-numbers text-slate-400 block mb-2 font-semibold">
                {language === 'pt' ? 'Duração Desejada:' : 'Session Duration:'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[30, 45, 60, 75].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      soundManager.playTick();
                      setDuration(d);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-mono-numbers font-bold transition-all border ${
                      duration === d
                        ? 'bg-[#38BDF8] text-[#0A0F1D] border-[#38BDF8]'
                        : 'bg-[#1E293B] text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Fatigue Level */}
          <div>
            <label className="text-xs uppercase font-mono-numbers text-slate-400 block mb-2 font-semibold">
              {language === 'pt' ? 'Nível de Energia / Prontidão:' : 'Readiness / Energy Level:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fresh' as const, label: language === 'pt' ? 'Pico de Força (100%)' : 'Peak Power (100%)' },
                { id: 'normal' as const, label: language === 'pt' ? 'Normal / Equilibrado' : 'Normal / Balanced' },
                { id: 'fatigued' as const, label: language === 'pt' ? 'Fadiga Leve (Deload)' : 'Light Fatigue (Deload)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundManager.playTick();
                    setFatigueLevel(item.id);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-mono-numbers font-semibold border text-center transition-all ${
                    fatigueLevel === item.id
                      ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-glow-purple'
                      : 'bg-[#1E293B] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action: Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || selectedEquipments.length === 0}
            className="w-full min-h-[52px] rounded-2xl bg-[#CCFF00] hover:brightness-110 active:scale-95 disabled:opacity-50 text-[#0A0F1D] font-extrabold text-sm uppercase tracking-wider font-mono-numbers shadow-glow-volt flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <RotateCcw className="w-5 h-5 animate-spin text-[#0A0F1D]" />
                <span>{statusText || (language === 'pt' ? 'Sintetizando Rotina com Gemini...' : 'Synthesizing with Gemini...')}</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>{language === 'pt' ? 'Sintetizar Rotina Personalizada com Gemini IA' : 'Synthesize Custom Workout via Gemini AI'}</span>
              </>
            )}
          </button>

          {errorMessage && (
            <p className="text-xs font-mono-numbers text-red-400 text-center">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Generated Routine Preview Card */}
      {generatedRoutine && (
        <div className="bg-[#0F172A] border-2 border-[#CCFF00] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_0_35px_rgba(204,255,0,0.2)] animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-numbers uppercase tracking-wider font-extrabold bg-[#CCFF00] text-[#0A0F1D]">
                  {language === 'pt' ? 'ROTINA SINTETIZADA' : 'SYNTHESIZED PROTOCOL'}
                </span>
                <span className="text-xs font-mono-numbers text-[#38BDF8] font-bold">
                  {generatedRoutine.category || focus} • {generatedRoutine.targetDurationMinutes || duration} min
                </span>
                <span className="text-xs font-mono-numbers text-[#CCFF00] font-bold">
                  +{generatedRoutine.xpReward || 380} XP
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black font-display text-white">
                {generatedRoutine.title}
              </h3>
            </div>

            {/* Launch / Save Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveToIndexedDb}
                disabled={isSaved}
                className={`px-4 py-3 rounded-2xl font-mono-numbers text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all ${
                  isSaved
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-[#1E293B] hover:bg-slate-700 text-white border-slate-700 active:scale-95'
                }`}
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" /> : <Save className="w-4 h-4 text-[#38BDF8]" />}
                <span>{isSaved ? (language === 'pt' ? 'Salvo no IndexedDB' : 'Saved to IndexedDB') : (language === 'pt' ? 'Salvar Rotina' : 'Save Routine')}</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchWorkout}
                className="px-6 py-3 rounded-2xl bg-[#CCFF00] hover:brightness-110 active:scale-95 text-[#0A0F1D] font-mono-numbers text-xs font-black uppercase tracking-wider shadow-glow-volt flex items-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{language === 'pt' ? 'Iniciar Treino Agora' : 'Launch Workout Now'}</span>
              </button>
            </div>
          </div>

          {/* Coaching Notes */}
          {generatedRoutine.coachingNotes && (
            <div className="mb-6 p-4 rounded-2xl bg-[#1E293B]/70 border border-[#38BDF8]/40 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8] shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono-numbers font-bold text-[#38BDF8] uppercase tracking-wider block mb-0.5">
                  {language === 'pt' ? 'Instruções Táticas do Treinador IA' : 'AI Coach Tactical Cue'}
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                  "{generatedRoutine.coachingNotes}"
                </p>
              </div>
            </div>
          )}

          {/* Exercise Roster Table */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono-numbers font-bold text-slate-400 tracking-wider">
              {language === 'pt' ? 'Exercícios Prescritos:' : 'Prescribed Exercises:'}
            </h4>

            <div className="space-y-2.5">
              {generatedRoutine.exercises?.map((ex: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0F172A] border border-slate-700 flex items-center justify-center font-mono-numbers font-bold text-xs text-[#CCFF00]">
                      #{idx + 1}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{ex.name}</span>
                        <span className="text-[10px] font-mono-numbers uppercase px-2 py-0.2 rounded bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30">
                          {getMuscleLabel(ex.primaryMuscle, language)}
                        </span>
                      </h5>
                      {ex.notes && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {ex.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prescription Badges */}
                  <div className="flex items-center gap-3 font-mono-numbers text-xs text-slate-300">
                    <div className="bg-[#0F172A] px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase block">{language === 'pt' ? 'Séries × repetições' : 'Sets × Reps'}</span>
                      <span className="text-white font-bold">{ex.setsCount || 3} × {ex.defaultReps || 10}</span>
                    </div>

                    <div className="bg-[#0F172A] px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase block">Carga Alvo</span>
                      <span className="text-[#CCFF00] font-bold">{formatWeight(typeof ex.defaultWeight === 'number' ? ex.defaultWeight : 50)}</span>
                    </div>

                    <div className="bg-[#0F172A] px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase block">Descanso</span>
                      <span className="text-[#38BDF8] font-bold">{ex.targetRestSeconds || 75}s</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
