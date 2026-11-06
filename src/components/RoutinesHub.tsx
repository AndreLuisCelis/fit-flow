import React, { useState, useEffect } from 'react';
import { 
  Trash2,
  Play, 
  Clock, 
  Dumbbell, 
  Sparkles, 
  Plus, 
  Search, 
  CheckCircle, 
  ChevronRight,
  Flame,
  Zap,
  Sliders,
  Filter,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { WorkoutRoutine, Exercise } from '../types/workout';
import { UserProfile } from '../types/profile';
import { PRESET_ROUTINES, EXERCISE_DATABASE } from '../data/presetRoutines';
import { fitFlowDB } from '../db/indexedDb';
import { soundManager } from '../utils/audio';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  isEquipmentAvailable,
  rankCompatibleRoutines,
  validateAndAdaptGeneratedWorkout,
  validateGeneratedWorkout,
} from '../utils/workoutPersonalization';
import { getMuscleLabel } from '../utils/localization';

interface RoutinesHubProps {
  onStartRoutine: (routine: WorkoutRoutine) => void;
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
  profile: UserProfile;
  onOpenProfile: () => void;
}

export const RoutinesHub: React.FC<RoutinesHubProps> = ({
  onStartRoutine,
  language,
  unit,
  profile,
  onOpenProfile,
}) => {
  const isOnline = useOnlineStatus();
  const [routinesList, setRoutinesList] = useState<WorkoutRoutine[]>(PRESET_ROUTINES.map(routine => ({
    ...routine,
    createdAt: routine.createdAt || new Date().toISOString(),
  })));
  const [exerciseDatabase, setExerciseDatabase] = useState<Record<string, Exercise>>({ ...EXERCISE_DATABASE });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [routineToDelete, setRoutineToDelete] = useState<string | null>(null);

  // AI Generator state
  const [aiFocus, setAiFocus] = useState<string>(() => profile.goals.includes('muscle_gain') ? 'Push & Shoulders' : 'Full Body');
  const [aiDuration, setAiDuration] = useState<number>(45);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedRoutine, setGeneratedRoutine] = useState<WorkoutRoutine | null>(null);
  const [isAiOnlineSource, setIsAiOnlineSource] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>('');

  // Load routines from IndexedDB on mount
  useEffect(() => {
    async function loadIndexedDbRoutines() {
      try {
        const [storedRoutines, storedExercises] = await Promise.all([
          fitFlowDB.getRoutines(),
          fitFlowDB.getExercises(),
        ]);
        setExerciseDatabase(current => ({
          ...current,
          ...Object.fromEntries(storedExercises.map(exercise => [exercise.id, exercise])),
        }));
        if (storedRoutines && storedRoutines.length > 0) {
          const normalizedRoutines = storedRoutines.map(routine => (
            routine.createdAt ? routine : { ...routine, createdAt: new Date().toISOString() }
          ));
          // Persist normalized creation dates for routines that did not have one yet
          await Promise.all(
            normalizedRoutines
              .filter((routine, index) => !storedRoutines[index]?.createdAt)
              .map(routine => fitFlowDB.saveRoutine(routine))
          );
          setRoutinesList(normalizedRoutines);
        }
      } catch (err) {
        console.warn('Could not read from IndexedDB, using preset fallback:', err);
      }
    }
    loadIndexedDbRoutines();
  }, []);

  const categories = ['All', 'Push', 'Pull', 'Legs', 'Upper'];
  const categoryLabels: Record<string, string> = language === 'pt'
    ? { All: 'Todas', Push: 'Empurrar', Pull: 'Puxar', Legs: 'Pernas', Upper: 'Parte superior' }
    : { All: 'All', Push: 'Push', Pull: 'Pull', Legs: 'Legs', Upper: 'Upper' };

  const compatibleRoutines = rankCompatibleRoutines(routinesList, exerciseDatabase, profile);
  const filteredRoutines = compatibleRoutines.filter(routine => {
    const matchesCategory = selectedCategory === 'All' || routine.category === selectedCategory;
    const title = language === 'pt' ? (routine.titlePt || routine.title) : routine.title;
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      routine.targetMuscles.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleDeleteRoutine = async (routineId: string) => {
    soundManager.playTick();
    try {
      await fitFlowDB.deleteRoutine(routineId);
      setRoutinesList(prev => prev.filter(routine => routine.id !== routineId));
    } catch (err) {
      console.error('Could not delete routine:', err);
    } finally {
      setRoutineToDelete(null);
    }
  };

  const handleGenerateAiWorkout = async () => {
    soundManager.playTick();
    setIsGenerating(true);
    setGenerationError('');
    setGeneratedRoutine(null);

    try {
      if (isOnline) {
        // Online: invoke Gemini API via server endpoint
        const response = await fetch('/api/gemini/generate-workout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            focus: aiFocus,
            durationMinutes: aiDuration,
            equipment: profile.equipment,
            profileEquipment: profile.equipment,
            profileGoals: profile.goals,
            experienceLevel: profile.experience,
            fatigueLevel: 'Normal',
            language,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const r = validateGeneratedWorkout(data.routine, profile.equipment);
          if (r) {
            const generatedExercises: Exercise[] = [];
            const newRoutine: WorkoutRoutine = {
              id: `gemini-routine-${Date.now()}`,
              title: r.title,
              titlePt: r.title,
              category: r.category,
              targetDurationMinutes: r.targetDurationMinutes,
              difficulty: r.difficulty,
              targetMuscles: r.targetMuscles,
              xpReward: r.xpReward,
              createdAt: new Date().toISOString(),
              exercises: (r.exercises || []).map((ex: any, idx: number) => {
                const exId = `ex-${Date.now()}-${idx}`;
                // register in exercise database if new
                const newExercise: Exercise = {
                    id: exId,
                    name: ex.name,
                    namePt: ex.name,
                    primaryMuscle: ex.primaryMuscle,
                    category: ex.category,
                    equipmentRequired: ex.equipmentRequired,
                    defaultSets: ex.setsCount,
                    defaultReps: ex.defaultReps,
                    defaultWeight: ex.defaultWeight,
                    restSeconds: ex.targetRestSeconds,
                    notes: ex.notes,
                    notesPt: language === 'pt' ? ex.notes : ex.notesPt,
                    tempo: ex.tempo,
                };
                EXERCISE_DATABASE[exId] = newExercise;
                generatedExercises.push(newExercise);

                return {
                  exerciseId: exId,
                  targetRestSeconds: ex.targetRestSeconds,
                  sets: Array.from({ length: ex.setsCount }, (_, sIdx) => ({
                    id: `set-${exId}-${sIdx + 1}`,
                    setNumber: sIdx + 1,
                    weight: ex.defaultWeight,
                    reps: ex.defaultReps,
                    rpe: 8,
                    isCompleted: false,
                  })),
                };
              }),
            };

            // Save to IndexedDB!
            await Promise.all(generatedExercises.map(exercise => fitFlowDB.saveExercise(exercise)));
            await fitFlowDB.saveRoutine(newRoutine);
            setExerciseDatabase(current => ({
              ...current,
              ...Object.fromEntries(generatedExercises.map(exercise => [exercise.id, exercise])),
            }));
            setRoutinesList(prev => [newRoutine, ...prev]);
            setGeneratedRoutine(newRoutine);
            setIsAiOnlineSource(true);
            setIsGenerating(false);
            soundManager.playSetComplete();
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Network or Gemini API request failed, falling back to local synthesis:', e);
    }

    // Offline or Fallback Synthesis
    try {
      await new Promise(resolve => setTimeout(resolve, 700));
      let chosenExercises: string[] = ['bench_press', 'incline_db_press', 'lateral_raise', 'tricep_pushdown'];
      let routineName = 'FitFlow Offline Hyper-Overload: Push';
      let routineNamePt = 'FitFlow Hiper-Sobrecarga Offline: Push';
      let category: WorkoutRoutine['category'] = 'Push';

      if (aiFocus.includes('Full')) {
        chosenExercises = ['hanging_leg_raise', 'barbell_squat', 'bench_press', 'barbell_row'];
        routineName = 'FitFlow Offline Full Body';
        routineNamePt = 'FitFlow Corpo Todo Offline';
        category = 'Full Body';
      } else if (aiFocus.includes('Pull') || aiFocus.includes('Back') || aiFocus.includes('Costas')) {
        chosenExercises = ['barbell_deadlift', 'lat_pulldown', 'barbell_row', 'barbell_curl'];
        routineName = 'FitFlow Offline Posterior Chain';
        routineNamePt = 'FitFlow Cadeia Posterior Offline';
      } else if (aiFocus.includes('Legs') || aiFocus.includes('Lower') || aiFocus.includes('Pernas')) {
        chosenExercises = ['barbell_squat', 'romanian_deadlift', 'leg_press', 'standing_calf'];
        routineName = 'FitFlow Offline Lower Quad Force';
        routineNamePt = 'FitFlow Força de Pernas Offline';
        category = 'Legs';
      } else {
        // Push & Shoulders (default case - no other condition matched)
        chosenExercises = ['bench_press', 'incline_db_press', 'lateral_raise', 'tricep_pushdown'];
        routineName = 'FitFlow Offline Hyper-Overload: Push';
        routineNamePt = 'FitFlow Hiper-Sobrecarga Offline: Push';
        category = 'Push';
      }

      let compatibleExercises = chosenExercises.filter(exerciseId => {
        const exercise = exerciseDatabase[exerciseId];
        return exercise && isEquipmentAvailable(exercise.category, profile.equipment, exercise.equipmentRequired);
      });
      if (compatibleExercises.length < 3) {
        const additionalExercises = Object.values(exerciseDatabase)
          .filter(exercise =>
            !compatibleExercises.includes(exercise.id) &&
            isEquipmentAvailable(exercise.category, profile.equipment, exercise.equipmentRequired))
          .sort((left, right) => {
            const leftScore = (left.category === 'bodyweight' ? 2 : 0) + (left.primaryMuscle !== 'core' ? 1 : 0);
            const rightScore = (right.category === 'bodyweight' ? 2 : 0) + (right.primaryMuscle !== 'core' ? 1 : 0);
            return rightScore - leftScore;
          })
          .slice(0, 5 - compatibleExercises.length)
          .map(exercise => exercise.id);
        compatibleExercises = [...compatibleExercises, ...additionalExercises];
        // Preserve original category and routine name even when adding additional exercises
        // The original focus selection should not be overridden to Full Body
      }
      if (compatibleExercises.length === 0) {
        setGenerationError(language === 'pt'
          ? 'Ainda não há exercícios cadastrados para os equipamentos selecionados. Atualize os equipamentos no perfil ou conecte-se para tentar novamente.'
          : 'No exercises are currently available for the selected equipment. Update your profile equipment or connect to try again.');
        return;
      }

      const fallbackCandidate = {
        title: routineName,
        category,
        targetDurationMinutes: aiDuration,
        difficulty: profile.experience === 'beginner' ? 'Beginner' as const : profile.experience === 'intermediate' ? 'Intermediate' as const : 'Advanced' as const,
        targetMuscles: [...new Set(compatibleExercises.map((id) => exerciseDatabase[id].primaryMuscle))],
        xpReward: 380,
        exercises: compatibleExercises.map((id) => {
          const exercise = exerciseDatabase[id];
          return {
            name: language === 'pt' ? exercise.namePt : exercise.name,
            primaryMuscle: exercise.primaryMuscle,
            category: exercise.category,
            ...(exercise.equipmentRequired ? { equipmentRequired: exercise.equipmentRequired } : {}),
            defaultWeight: exercise.defaultWeight,
            defaultReps: exercise.defaultReps,
            setsCount: profile.experience === 'beginner' ? Math.min(3, exercise.defaultSets) : exercise.defaultSets,
            targetRestSeconds: exercise.restSeconds,
            ...(exercise.tempo ? { tempo: exercise.tempo } : {}),
            ...(exercise.notes ? { notes: exercise.notes } : {}),
            ...(exercise.notesPt ? { notesPt: exercise.notesPt } : {}),
          };
        }),
      };
      const validatedFallback = validateAndAdaptGeneratedWorkout(fallbackCandidate, profile.equipment, profile.experience);
      if (!validatedFallback) {
        setGenerationError(language === 'pt'
          ? 'Não foi possível validar uma rotina compatível com os equipamentos selecionados.'
          : 'Could not validate a workout compatible with the selected equipment.');
        return;
      }

      const generatedExercises: Exercise[] = [];
      const newRoutine: WorkoutRoutine = {
        id: `offline-routine-${Date.now()}`,
        title: validatedFallback.title,
        titlePt: routineNamePt,
        category: validatedFallback.category,
        targetDurationMinutes: validatedFallback.targetDurationMinutes,
        difficulty: validatedFallback.difficulty,
        targetMuscles: validatedFallback.targetMuscles,
        xpReward: validatedFallback.xpReward,
        exercises: validatedFallback.exercises.map((ex, index) => {
          const exId = `offline-ex-${Date.now()}-${index}`;
          const baseEx = exerciseDatabase[compatibleExercises[index]];
          const generatedExercise: Exercise = {
            ...baseEx,
            id: exId,
            name: ex.name,
            namePt: ex.name,
            primaryMuscle: ex.primaryMuscle,
            category: ex.category,
            equipmentRequired: ex.equipmentRequired,
            defaultSets: ex.setsCount,
            defaultReps: ex.defaultReps,
            defaultWeight: ex.defaultWeight,
            restSeconds: ex.targetRestSeconds,
            tempo: ex.tempo,
            notes: ex.notes,
            notesPt: ex.notesPt,
          };
          generatedExercises.push(generatedExercise);
          return {
            exerciseId: exId,
            targetRestSeconds: ex.targetRestSeconds,
            sets: Array.from({ length: ex.setsCount }, (_, i) => ({
              id: `offline-set-${exId}-${i + 1}`,
              setNumber: i + 1,
              weight: ex.defaultWeight,
              reps: ex.defaultReps,
              rpe: 8,
              isCompleted: false,
            })),
          };
        }),
      };

      // Save to IndexedDB!
      await Promise.all(generatedExercises.map(exercise => fitFlowDB.saveExercise(exercise)));
      await fitFlowDB.saveRoutine(newRoutine);
      setExerciseDatabase(current => ({
        ...current,
        ...Object.fromEntries(generatedExercises.map(exercise => [exercise.id, exercise])),
      }));
      setRoutinesList(prev => [newRoutine, ...prev]);
      setGeneratedRoutine(newRoutine);
      setIsAiOnlineSource(false);
      soundManager.playSetComplete();
    } catch {
      setGenerationError(language === 'pt' ? 'Não foi possível salvar a rotina neste dispositivo.' : 'Could not save this routine on this device.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 pt-2 px-3 sm:px-6">
      
      {/* Header Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 mb-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] shadow-glow-volt" />
              <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#CCFF00] font-bold">
                {language === 'pt' ? 'PROGRAMAÇÃO ATLÉTICA' : 'TACTICAL ROSTER'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              {language === 'pt' ? 'Rotinas & Treinos de Alta Performance' : 'High-Performance Workout Hub'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              {language === 'pt'
                ? 'Selecione seu programa do dia com rastreamento de sobrecarga progressiva, telemetria muscular e ganho de XP.'
                : 'Execute programmed conditioning routines with progressive overload telemetry, muscular activation tracking, and XP yield.'}
            </p>
          </div>

          {/* AI Generator CTA Button */}
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#1E293B] to-[#0F172A] border border-[#38BDF8]/60 text-white hover:border-[#38BDF8] shadow-glow-cyan transition-all text-xs font-bold uppercase tracking-wider shrink-0 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-[#38BDF8] animate-pulse" />
            <span>{language === 'pt' ? 'Gerador AI de Treino' : 'AI Routine Optimizer'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        {/* Category Filter Buttons (Interactive) */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0F172A] border border-slate-800 rounded-full overflow-x-auto w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                soundManager.playTick();
                setSelectedCategory(cat);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-mono-numbers font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'pt' ? 'Buscar treino ou músculo...' : 'Search routines or muscles...'}
            className="w-full bg-[#0F172A] border border-slate-800 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#CCFF00] font-mono-numbers"
          />
        </div>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredRoutines.length === 0 && (
          <div className="md:col-span-2 rounded-xl border border-slate-800 bg-[#0F172A] p-5 text-sm text-slate-300">
            {language === 'pt'
              ? 'Nenhuma rotina cadastrada combina com seu nível e equipamentos. Ajuste os equipamentos no perfil ou gere uma rotina personalizada.'
              : 'No saved routine matches your experience and equipment. Update equipment in your profile or generate a custom routine.'}
          </div>
        )}
        {filteredRoutines.map((routine) => {
          const title = language === 'pt' ? routine.titlePt : routine.title;
          const totalSets = routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
          const difficultyLabel = language === 'pt'
            ? ({ Beginner: 'Iniciante', Intermediate: 'Intermediário', Advanced: 'Avançado', Hardcore: 'Extremo' } as const)[routine.difficulty]
            : routine.difficulty;

          return (
            <div
              key={routine.id}
              className="bg-[#1E293B] border border-slate-800 hover:border-[#CCFF00]/40 rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between group shadow-xl relative overflow-hidden"
            >
              <div>
                {/* Meta Row: Duration, Category, XP */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono-numbers text-slate-400">
                    <span className="flex items-center gap-1 text-[#38BDF8] font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {routine.targetDurationMinutes} MIN
                    </span>
                    <span>·</span>
                    <span className="uppercase text-slate-300">{difficultyLabel}</span>
                    <span>·</span>
                    <span>{totalSets} SÉRIES</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono-numbers font-bold bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/40 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#8B5CF6]" />
                      +{routine.xpReward} XP
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoutineToDelete(routine.id)}
                      className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center transition-colors"
                      aria-label={language === 'pt' ? 'Excluir rotina' : 'Delete routine'}
                      title={language === 'pt' ? 'Excluir rotina' : 'Delete routine'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold font-display text-white mb-2 group-hover:text-[#CCFF00] transition-colors">
                  {title}
                </h3>

                {/* Created At */}
                <p className="text-[10px] font-mono-numbers text-slate-500 mb-3">
                  {language === 'pt' ? 'Criado em: ' : 'Created: '}
                  {new Date(routine.createdAt || Date.now()).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {routine.targetMuscles.map((muscle) => (
                    <span
                      key={muscle}
                      className="px-2 py-0.5 rounded text-[10px] font-mono-numbers uppercase tracking-wider bg-[#0F172A] border border-slate-700/80 text-slate-300"
                    >
                      {getMuscleLabel(muscle, language)}
                    </span>
                  ))}
                </div>

                {/* Exercise Roster Preview */}
                <div className="bg-[#0F172A]/70 rounded-2xl p-3 border border-slate-800/80 mb-5 space-y-1.5">
                  <span className="text-[10px] uppercase font-mono-numbers text-slate-500 font-bold block mb-1">
                    {language === 'pt' ? 'EXERCÍCIOS INCLUSOS:' : 'EXERCISE ROSTER:'}
                  </span>
                  {routine.exercises.map((item, idx) => {
                    const exData = exerciseDatabase[item.exerciseId];
                    if (!exData) return null;
                    const exName = language === 'pt' ? exData.namePt : exData.name;
                    return (
                      <div key={item.exerciseId} className="flex items-center justify-between text-xs text-slate-300 font-mono-numbers">
                        <span className="flex items-center gap-2">
                          <span className="text-slate-500 text-[10px]">0{idx + 1}.</span>
                          <span className="truncate max-w-[200px] sm:max-w-xs">{exName}</span>
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {item.sets.length} × {exData.defaultReps}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Start Workout Action Button (Pill CTA min 54px) */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playTick();
                  onStartRoutine(routine);
                }}
                className="w-full min-h-[52px] rounded-full bg-[#CCFF00] hover:brightness-110 active:scale-[0.98] text-[#0A0F1D] font-bold text-sm uppercase tracking-wider shadow-glow-volt flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>{language === 'pt' ? 'Iniciar Treino' : 'Start Workout'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* AI Routine Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0F172A] border border-[#38BDF8]/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="text-lg font-bold font-display text-white">
                  {language === 'pt' ? 'Sintetizador AI de Treino' : 'AI Workout Synthesizer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono-numbers uppercase"
              >
                ✕ {language === 'pt' ? 'Fechar' : 'Close'}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono-numbers font-semibold ${
                isOnline
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{language === 'pt'
                  ? (isOnline ? 'Gemini 3.8 Flash conectado' : 'Motor offline ativo')
                  : (isOnline ? 'Gemini 3.8 Flash Online' : 'Offline Engine Active')}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono-numbers font-semibold bg-[#0F172A] text-[#38BDF8] border border-[#38BDF8]/40">
                <Database className="w-3 h-3" />
                <span>{language === 'pt' ? 'Salvamento automático local' : 'IndexedDB Auto-Save'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {language === 'pt'
                ? 'Configure sua meta do dia. Nosso motor com Gemini API estrutura os exercícios, séries e cargas ótimas, salvando tudo no seu IndexedDB local.'
                : 'Define today’s conditioning constraints. Gemini API synthesizes exercises, sets, and overload metrics, stored directly into your local IndexedDB.'}
            </p>

            <div className="space-y-4 mb-6">
              {/* Target Focus */}
              <div>
                <label className="text-xs font-mono-numbers uppercase text-slate-400 block mb-1.5 font-semibold">
                  {language === 'pt' ? 'Foco Muscular Principal:' : 'Primary Muscular Focus:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Push & Shoulders', 'Pull & Upper Back', 'Legs & Quads', 'Full Body'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAiFocus(f)}
                      className={`p-2.5 rounded-xl text-xs font-mono-numbers font-semibold border text-center transition-all ${
                        aiFocus === f
                          ? 'border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] shadow-glow-cyan'
                          : 'border-slate-800 bg-[#1E293B] text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'pt'
                        ? (f === 'Push & Shoulders' ? 'Empurrar e ombros' : f === 'Pull & Upper Back' ? 'Puxar e costas' : f === 'Legs & Quads' ? 'Pernas e quadríceps' : 'Corpo todo')
                        : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Duration */}
              <div>
                <label className="text-xs font-mono-numbers uppercase text-slate-400 block mb-1.5 font-semibold">
                  {language === 'pt' ? 'Duração Disponível:' : 'Session Duration:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setAiDuration(dur)}
                      className={`p-2 rounded-xl text-xs font-mono-numbers font-semibold border text-center transition-all ${
                        aiDuration === dur
                          ? 'border-[#CCFF00] bg-[#CCFF00]/15 text-[#CCFF00]'
                          : 'border-slate-800 bg-[#1E293B] text-slate-400 hover:text-white'
                      }`}
                    >
                      {dur} MIN
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div>
                <label className="text-xs font-mono-numbers uppercase text-slate-400 block mb-1.5 font-semibold">
                  {language === 'pt' ? 'Equipamento Disponível:' : 'Available Equipment:'}
                </label>
                <p className="rounded-xl border border-slate-800 bg-[#1E293B] p-3 text-xs text-slate-300">
                  {profile.equipment.map(equipment => ({
                    bodyweight: language === 'pt' ? 'Peso corporal' : 'Bodyweight',
                    pull_up_bar: language === 'pt' ? 'Barra fixa' : 'Pull-up bar',
                    barbell: language === 'pt' ? 'Barra e anilhas' : 'Barbell',
                    dumbbell: language === 'pt' ? 'Halteres' : 'Dumbbells',
                    cable: language === 'pt' ? 'Cabos e polias' : 'Cables',
                    machine: language === 'pt' ? 'Máquinas' : 'Machines',
                    bands: language === 'pt' ? 'Elásticos' : 'Resistance bands',
                  }[equipment])).join(' · ')}
                  <button type="button" onClick={() => { setShowAiModal(false); onOpenProfile(); }} className="ml-2 font-semibold text-[#38BDF8] underline">
                    {language === 'pt' ? 'Editar no perfil' : 'Edit profile'}
                  </button>
                </p>
              </div>
            </div>

            {generationError && <p className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200" role="alert">{generationError}</p>}

            {/* Generate Button or Result Preview */}
            {!generatedRoutine ? (
              <button
                type="button"
                onClick={handleGenerateAiWorkout}
                disabled={isGenerating}
                className="w-full h-12 rounded-full bg-[#38BDF8] hover:brightness-110 text-[#0A0F1D] font-bold text-xs uppercase tracking-wider shadow-glow-cyan flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    {language === 'pt' ? 'Calculando Curva de Hipertrofia...' : 'Calculating Hypertrophy Curve...'}
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{language === 'pt' ? 'Gerar Rotina Personalizada' : 'Generate Custom Routine'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="bg-[#1E293B] border border-[#CCFF00]/40 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono-numbers font-bold text-[#CCFF00]">
                    {language === 'pt' ? '✓ PROTOCOLO OTIMIZADO GERADO' : '✓ OPTIMIZED PROTOCOL GENERATED'}
                  </span>
                  <span className="text-xs font-mono-numbers text-slate-400">
                    +{generatedRoutine.xpReward} XP
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-3">
                  {language === 'pt' ? generatedRoutine.titlePt : generatedRoutine.title}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowAiModal(false);
                    onStartRoutine(generatedRoutine);
                  }}
                  className="w-full h-12 rounded-full bg-[#CCFF00] text-[#0A0F1D] font-bold text-xs uppercase tracking-wider shadow-glow-volt flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{language === 'pt' ? 'Iniciar Treino Agora' : 'Launch Workout Now'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {routineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold font-display text-white mb-2">
              {language === 'pt' ? 'Excluir rotina' : 'Delete routine'}
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              {language === 'pt'
                ? 'Tem certeza que deseja excluir esta rotina? Esta ação não pode ser desfeita.'
                : 'Are you sure you want to delete this routine? This action cannot be undone.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRoutineToDelete(null)}
                className="flex-1 h-11 rounded-full bg-[#0F172A] border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider hover:border-slate-500 transition-colors"
              >
                {language === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRoutine(routineToDelete)}
                className="flex-1 h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                {language === 'pt' ? 'Excluir' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
