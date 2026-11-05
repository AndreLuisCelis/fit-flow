import React, { useState } from 'react';
import { 
  Check, 
  Plus, 
  Minus, 
  RotateCcw, 
  Sparkles, 
  Dumbbell, 
  ChevronRight, 
  ChevronLeft, 
  Flame, 
  Info,
  Clock,
  PlusCircle,
  Trophy,
  CheckCircle2,
  PenLine,
  FileText
} from 'lucide-react';
import { ActiveWorkoutSession, SetEntry, MuscleGroup } from '../types/workout';
import { ExerciseGuideCard } from './ExerciseGuideCard';
import { MuscleDiagram } from './MuscleDiagram';
import { getMuscleLabel } from '../utils/localization';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveWorkoutViewProps {
  session: ActiveWorkoutSession;
  onUpdateSession: (session: ActiveWorkoutSession) => void;
  onTriggerRestTimer: (seconds: number, nextExerciseName?: string, nextSetNumber?: number) => void;
  onFinishWorkout: () => void;
  onCancelWorkout: () => void;
  unit: 'kg' | 'lbs';
  onToggleUnit: () => void;
  language: 'pt' | 'en';
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  session,
  onUpdateSession,
  onTriggerRestTimer,
  onFinishWorkout,
  onCancelWorkout,
  unit,
  onToggleUnit,
  language,
}) => {
  const [selectedSetIndex, setSelectedSetIndex] = useState<number>(0);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState<boolean>(false);
  const [celebrationPR, setCelebrationPR] = useState<string | null>(null);
  const [justCompletedSetId, setJustCompletedSetId] = useState<string | null>(null);
  const [floatingFeedback, setFloatingFeedback] = useState<{ id: string; text: string } | null>(null);
  const [tonnageBump, setTonnageBump] = useState<boolean>(false);

  const currentExerciseItem = session.exercises[session.currentExerciseIndex];
  if (!currentExerciseItem) {
    return <div className="text-white p-8">{language === 'pt' ? 'Nenhum exercício encontrado nesta sessão.' : 'No exercise found in current session.'}</div>;
  }

  const { exercise, sets } = currentExerciseItem;

  {/* Exercise Guide Card - appears at the top of the session */}
  <div className="mb-4">
    <ExerciseGuideCard
      exercise={exercise}
      language={language}
    />
  </div>

  // Convert kg to display unit, rounding to .0 or .5 increments
  const formatWeight = (kg: number) => {
    if (unit === 'lbs') {
      // Convert to lbs then round to nearest 0.5 lb
      return Math.round(kg * 2.20462 * 2) / 2;
    }
    // Round to nearest 0.5 kg
    return Math.round(kg * 2) / 2;
  };

  const convertDisplayToKg = (displayVal: number) => {
    if (unit === 'lbs') {
      return Math.round((displayVal / 2.20462) * 2) / 2;
    }
    return displayVal;
  };

  // Adjust active set weight
  const adjustWeight = (delta: number) => {
    soundManager.playTick();
    const updatedSets = [...sets];
    const currentSet = updatedSets[selectedSetIndex];
    if (!currentSet) return;

    const currentDisplay = formatWeight(currentSet.weight);
    const newDisplay = Math.max(0, currentDisplay + delta);
    currentSet.weight = convertDisplayToKg(newDisplay);

    const updatedExercises = [...session.exercises];
    updatedExercises[session.currentExerciseIndex].sets = updatedSets;
    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // Adjust active set reps
  const adjustReps = (delta: number) => {
    soundManager.playTick();
    const updatedSets = [...sets];
    const currentSet = updatedSets[selectedSetIndex];
    if (!currentSet) return;

    currentSet.reps = Math.max(1, currentSet.reps + delta);

    const updatedExercises = [...session.exercises];
    updatedExercises[session.currentExerciseIndex].sets = updatedSets;
    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // Toggle set completed state
  const handleToggleSetComplete = (setIndex: number) => {
    const updatedSets = [...sets];
    const targetSet = updatedSets[setIndex];
    const wasCompleted = targetSet.isCompleted;
    targetSet.isCompleted = !wasCompleted;

    if (!wasCompleted) {
      // User just completed this set!
      soundManager.playSetComplete();

      // Trigger micro-interaction feedback
      setJustCompletedSetId(targetSet.id);
      setFloatingFeedback({
        id: targetSet.id,
        text: language === 'pt' ? '+50 XP · SÉRIE CONCLUÍDA! 🔥' : '+50 XP · SET COMPLETE! 🔥',
      });
      setTonnageBump(true);
      setTimeout(() => setJustCompletedSetId(null), 1200);
      setTimeout(() => setFloatingFeedback(null), 1900);
      setTimeout(() => setTonnageBump(false), 500);

      // Check if this is a personal record
      const isPR = targetSet.previousBest && (
        targetSet.weight > targetSet.previousBest.weight ||
        (targetSet.weight === targetSet.previousBest.weight && targetSet.reps > targetSet.previousBest.reps)
      );

      if (isPR) {
        setCelebrationPR(language === 'pt'
          ? `NOVO RECORDE: ${formatWeight(targetSet.weight)} ${unit} × ${targetSet.reps} repetições!`
          : `NEW PR: ${formatWeight(targetSet.weight)} ${unit} × ${targetSet.reps} reps!`);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#CCFF00', '#FF6B00', '#38BDF8', '#8B5CF6'],
        });
        setTimeout(() => setCelebrationPR(null), 4000);
      }

      // Automatically launch rest timer!
      const nextSetIndex = setIndex + 1;
      const nextSetExists = nextSetIndex < updatedSets.length;
      const nextExName = nextSetExists 
        ? (language === 'pt' ? exercise.namePt : exercise.name)
        : (session.exercises[session.currentExerciseIndex + 1]?.exercise.name || 'Finish');

      onTriggerRestTimer(
        currentExerciseItem.targetRestSeconds || 75,
        nextExName,
        nextSetExists ? nextSetIndex + 1 : 1
      );

      // Auto advance active selected set
      if (nextSetExists) {
        setSelectedSetIndex(nextSetIndex);
      }
    }

    // Update total volume moved
    let totalVol = 0;
    let completedSetsCount = 0;
    session.exercises.forEach(exItem => {
      exItem.sets.forEach(s => {
        if (s.isCompleted) {
          totalVol += s.weight * s.reps;
          completedSetsCount++;
        }
      });
    });

    const updatedExercises = [...session.exercises];
    updatedExercises[session.currentExerciseIndex].sets = updatedSets;

    onUpdateSession({
      ...session,
      exercises: updatedExercises,
      totalVolumeMovedKg: Math.round(totalVol),
      setsCompletedCount: completedSetsCount,
    });
  };

  // Add extra set to current exercise
  const handleAddSet = () => {
    soundManager.playTick();
    const lastSet = sets[sets.length - 1];
    const newSet: SetEntry = {
      id: `set-${Date.now()}-${sets.length + 1}`,
      setNumber: sets.length + 1,
      weight: lastSet ? lastSet.weight : 50,
      reps: lastSet ? lastSet.reps : 10,
      previousBest: lastSet?.previousBest,
      rpe: 8,
      isCompleted: false,
    };
    const updatedSets = [...sets, newSet];
    const updatedExercises = [...session.exercises];
    updatedExercises[session.currentExerciseIndex].sets = updatedSets;
    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
    setSelectedSetIndex(updatedSets.length - 1);
  };

  // Select RPE for current set
  const handleSelectRPE = (rpeVal: number) => {
    soundManager.playTick();
    const updatedSets = [...sets];
    if (updatedSets[selectedSetIndex]) {
      updatedSets[selectedSetIndex].rpe = rpeVal;
      const updatedExercises = [...session.exercises];
      updatedExercises[session.currentExerciseIndex].sets = updatedSets;
      onUpdateSession({
        ...session,
        exercises: updatedExercises,
      });
    }
  };

  // Switch active exercise
  const handleSwitchExercise = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < session.exercises.length) {
      soundManager.playTick();
      onUpdateSession({
        ...session,
        currentExerciseIndex: newIndex,
      });
      setSelectedSetIndex(0);
    }
  };

  // Update notes for current exercise
  const handleUpdateNotes = (notesText: string) => {
    const updatedExercises = [...session.exercises];
    updatedExercises[session.currentExerciseIndex].notes = notesText;
    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  const handleAppendQuickTag = (tag: string) => {
    soundManager.playTick();
    const currentNotes = currentExerciseItem.notes || '';
    const newNotes = currentNotes ? `${currentNotes} · ${tag}` : tag;
    handleUpdateNotes(newNotes);
  };

  const activeSet = sets[selectedSetIndex] || sets[0];
  const isAllSetsCompleted = sets.every(s => s.isCompleted);
  const isFinalExercise = session.currentExerciseIndex === session.exercises.length - 1;

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 pt-2 px-3 sm:px-6">
      {/* PR Celebration Toast */}
      {celebrationPR && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1E293B] border-2 border-[#CCFF00] text-white px-5 py-3 rounded-full shadow-glow-volt flex items-center gap-2.5 animate-bounce">
          <Trophy className="w-5 h-5 text-[#CCFF00]" />
          <span className="font-bold text-sm tracking-wide text-[#CCFF00] uppercase font-mono-numbers">
            {celebrationPR}
          </span>
        </div>
      )}

      {/* Top Session Progress Bar & Controls */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers uppercase tracking-wider bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/40 font-bold">
              {language === 'pt' ? 'TREINO EM ANDAMENTO' : 'LIVE SESSION'}
            </span>
            <span className="text-xs text-slate-400 font-mono-numbers">
              {session.routineTitle}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-1">
            {language === 'pt' ? exercise.namePt : exercise.name}
          </h1>
        </div>

        {/* Global Live Tonnage & Progress */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase font-mono-numbers block">
              {language === 'pt' ? 'Volume Total' : 'Tonnage Moved'}
            </span>
            <motion.span
              animate={tonnageBump ? { scale: [1, 1.18, 1], filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'] } : { scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-xl sm:text-2xl font-bold font-mono-numbers text-[#CCFF00] inline-block"
            >
              {formatWeight(session.totalVolumeMovedKg)} <span className="text-xs text-slate-400">{unit}</span>
            </motion.span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          {/* Unit Toggle KG / LBS */}
          <button
            type="button"
            onClick={onToggleUnit}
            className="flex items-center gap-1 bg-[#1E293B] border border-slate-700 hover:border-slate-500 rounded-full px-3 py-1.5 text-xs font-mono-numbers text-slate-200 transition-colors"
            title={language === 'pt' ? 'Alternar unidade de peso' : 'Toggle weight unit'}
          >
            <span className={unit === 'kg' ? 'text-[#CCFF00] font-bold' : 'text-slate-400'}>KG</span>
            <span className="text-slate-500">/</span>
            <span className={unit === 'lbs' ? 'text-[#CCFF00] font-bold' : 'text-slate-400'}>LBS</span>
          </button>

          {/* Abort Workout button */}
          <button
            type="button"
            onClick={onCancelWorkout}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            {language === 'pt' ? 'Sair' : 'Discard'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Anatomy & Cues, Right Active Stepper & Set Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (5 cols): Muscle Diagram + Exercise Coaching Notes */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-numbers">
                {language === 'pt' ? 'Ativação Muscular' : 'Target Musculature'}
              </span>
              <span className="text-xs font-mono-numbers text-[#CCFF00] uppercase font-semibold">
                {getMuscleLabel(exercise.primaryMuscle, language)}
              </span>
            </div>
            
            <MuscleDiagram
              primaryMuscle={exercise.primaryMuscle}
              secondaryMuscles={exercise.secondaryMuscles}
              showLabels={true}
              interactive={false}
              language={language}
            />

            {/* Coaching Guidance / Tempo */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
              {exercise.notes && (
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <Info className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
                  <span>{language === 'pt' ? exercise.notesPt || exercise.notes : exercise.notes}</span>
                </div>
              )}
              {exercise.tempo && (
                <div className="flex items-center justify-between text-xs bg-[#0F172A] p-2.5 rounded-xl border border-slate-800 font-mono-numbers">
                  <span className="text-slate-400 uppercase tracking-wider">
                    {language === 'pt' ? 'Cadência / Tempo:' : 'Tempo Cadence:'}
                  </span>
                  <span className="text-[#38BDF8] font-bold">{exercise.tempo}</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Overload Recommendation Card */}
          <div className="bg-[#0F172A] border border-[#38BDF8]/30 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-xs font-bold font-mono-numbers uppercase tracking-wider text-[#38BDF8]">
                {language === 'pt' ? 'Sugestão AI de Sobrecarga' : 'AI Overload Metric'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'pt'
                ? `Baseado no RPE 8 da última sessão, tente subir +2.5 ${unit} na 2ª e 3ª séries se a velocidade da barra se mantiver constante.`
                : `Based on previous RPE 8, attempt +2.5 ${unit} on sets 2-3 if bar speed remains fluid through sticking point.`}
            </p>
          </div>

          {/* Quick Notes for Active Exercise (Notas Rápidas) */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-[#CCFF00]" />
                <span className="text-xs font-bold font-mono-numbers uppercase tracking-wider text-white">
                  {language === 'pt' ? 'Notas Rápidas' : 'Quick Notes'}
                </span>
              </div>
              <span className="text-[10px] font-mono-numbers text-slate-500 uppercase">
                {language === 'pt' ? 'Execução · Dor · Ajuste' : 'Form · Pain · Setup'}
              </span>
            </div>

            <textarea
              value={currentExerciseItem.notes || ''}
              onChange={(e) => handleUpdateNotes(e.target.value)}
              placeholder={
                language === 'pt'
                  ? 'Ex: Leve pontada no ombro direito na 3ª série; Pegada mais aberta eliminou o incômodo; Ajustar banco no próximo treino...'
                  : 'e.g. Mild shoulder twinge on set 3; wider grip resolved it; adjust seat angle next time...'
              }
              rows={3}
              className="w-full bg-[#0F172A] border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#CCFF00] font-sans resize-none transition-colors"
            />

            {/* Quick-tap Tag Chips for rapid logging */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {(language === 'pt'
                ? ['Forma Perfeita ✨', 'Dor no Ombro ⚠️', 'Ajustar Banco 📐', 'Carga Leve (+kg) 🚀', 'Falha Concêntrica 💥']
                : ['Clean Form ✨', 'Shoulder Pain ⚠️', 'Adjust Seat 📐', 'Too Light (+kg) 🚀', 'Hit Failure 💥']
              ).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAppendQuickTag(tag)}
                  className="px-2 py-1 rounded-lg bg-[#0F172A] hover:bg-slate-800 border border-slate-700/80 text-[10px] font-mono-numbers text-slate-300 hover:text-white transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Active Set Steppers, RPE tags & Set Matrix */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Active Set Stepper Box (Tactile High-Contrast) */}
          <div className="bg-[#1E293B] rounded-2xl border-2 border-[#CCFF00]/40 p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#CCFF00] text-[#0A0F1D] font-bold text-xs flex items-center justify-center font-mono-numbers shadow-glow-volt">
                  #{activeSet.setNumber}
                </span>
                <span className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  {language === 'pt' ? `Série Ativa ${activeSet.setNumber} de ${sets.length}` : `Active Set ${activeSet.setNumber} of ${sets.length}`}
                </span>
              </div>

              {activeSet.previousBest && (
                <div className="text-right text-xs font-mono-numbers text-slate-400">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    {language === 'pt' ? 'Melhor Anterior' : 'Prev Best'}
                  </span>
                  <span className="text-slate-300 font-semibold">
                    {formatWeight(activeSet.previousBest.weight)} {unit} × {activeSet.previousBest.reps}
                  </span>
                </div>
              )}
            </div>

            {/* Stepper Grid: Weight & Reps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              
              {/* Weight Stepper */}
              <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xs uppercase font-mono-numbers tracking-widest text-slate-400 mb-1 font-semibold">
                  {language === 'pt' ? `Carga (${unit.toUpperCase()})` : `Weight (${unit.toUpperCase()})`}
                </span>

                <div className="flex items-center justify-between w-full my-2">
                  <button
                    type="button"
                    onClick={() => adjustWeight(unit === 'lbs' ? -5 : -2.5)}
                    className="w-12 h-12 rounded-full bg-[#1E293B] hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 transition-transform"
                    aria-label={language === 'pt' ? 'Diminuir carga' : 'Decrease weight'}
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-extrabold font-mono-numbers tracking-tight text-white">
                      {formatWeight(activeSet.weight)}
                    </span>
                    <span className="text-[10px] font-mono-numbers text-[#CCFF00] uppercase font-bold tracking-wider">
                      {unit}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustWeight(unit === 'lbs' ? 5 : 2.5)}
                    className="w-12 h-12 rounded-full bg-[#1E293B] hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 transition-transform"
                    aria-label={language === 'pt' ? 'Aumentar carga' : 'Increase weight'}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick weight adjust chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[-10, -5, +5, +10].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => adjustWeight(val)}
                      className="px-2 py-1 rounded bg-[#1E293B] hover:bg-slate-700 text-[10px] font-mono-numbers text-slate-300 font-semibold"
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reps Stepper */}
              <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xs uppercase font-mono-numbers tracking-widest text-slate-400 mb-1 font-semibold">
                  {language === 'pt' ? 'Repetições' : 'Reps Target'}
                </span>

                <div className="flex items-center justify-between w-full my-2">
                  <button
                    type="button"
                    onClick={() => adjustReps(-1)}
                    className="w-12 h-12 rounded-full bg-[#1E293B] hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 transition-transform"
                    aria-label={language === 'pt' ? 'Diminuir repetições' : 'Decrease reps'}
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-extrabold font-mono-numbers tracking-tight text-white">
                      {activeSet.reps}
                    </span>
                    <span className="text-[10px] font-mono-numbers text-[#38BDF8] uppercase font-bold tracking-wider">
                      {language === 'pt' ? 'REPETIÇÕES' : 'REPS'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustReps(1)}
                    className="w-12 h-12 rounded-full bg-[#1E293B] hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center border border-slate-700 transition-transform"
                    aria-label={language === 'pt' ? 'Aumentar repetições' : 'Increase reps'}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Rep adjust chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[-2, -1, +1, +2].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => adjustReps(val)}
                      className="px-2 py-1 rounded bg-[#1E293B] hover:bg-slate-700 text-[10px] font-mono-numbers text-slate-300 font-semibold"
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Intensity / RPE selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono-numbers uppercase tracking-wider text-slate-400 font-semibold">
                  {language === 'pt' ? 'RPE / Intensidade Percebida:' : 'RPE / Perceived Exertion:'}
                </span>
                <span className="text-xs font-mono-numbers text-slate-300 font-bold">
                  RPE {activeSet.rpe || 8} / 10
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[6, 7, 8, 9, 10].map(rpeNum => {
                  const isSelected = (activeSet.rpe || 8) === rpeNum;
                  const isHardcore = rpeNum >= 9;
                  const isOptimal = rpeNum === 7 || rpeNum === 8;

                  let borderStyle = 'border-slate-800 text-slate-400 bg-[#0F172A]';
                  if (isSelected) {
                    if (isHardcore) {
                      borderStyle = 'border-[#FF6B00] text-[#FF6B00] bg-[#FF6B00]/15 shadow-glow-blaze font-bold';
                    } else if (isOptimal) {
                      borderStyle = 'border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/15 shadow-glow-cyan font-bold';
                    } else {
                      borderStyle = 'border-[#CCFF00] text-[#CCFF00] bg-[#CCFF00]/15 font-bold';
                    }
                  }

                  return (
                    <button
                      key={rpeNum}
                      type="button"
                      onClick={() => handleSelectRPE(rpeNum)}
                      className={`py-2 px-1 rounded-xl text-center border transition-all text-xs font-mono-numbers ${borderStyle}`}
                    >
                      <div>{rpeNum}</div>
                      <div className="text-[9px] uppercase tracking-tighter opacity-80 mt-0.5">
                        {rpeNum === 10 ? (language === 'pt' ? 'MÁX' : 'MAX') : rpeNum === 9 ? 'RIR 1' : rpeNum === 8 ? 'RIR 2' : rpeNum === 7 ? 'RIR 3' : (language === 'pt' ? 'AQUEC.' : 'WARM')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button: Complete Set (Pill Shape min 54px) */}
            <button
              type="button"
              onClick={() => handleToggleSetComplete(selectedSetIndex)}
              className={`w-full min-h-[54px] rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.97] ${
                activeSet.isCompleted
                  ? 'bg-[#1E293B] text-[#CCFF00] border-2 border-[#CCFF00] hover:bg-[#CCFF00]/10'
                  : 'bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt hover:brightness-110'
              }`}
            >
              {activeSet.isCompleted ? (
                <>
                  <RotateCcw className="w-5 h-5" />
                  <span>{language === 'pt' ? 'Série Marcada · Tocar p/ Desmarcar' : 'Set Completed · Tap to Undo'}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>{language === 'pt' ? 'Completar Série & Iniciar Descanso' : 'Complete Set & Start Rest'}</span>
                </>
              )}
            </button>
          </div>

          {/* Set Log Matrix Table */}
          <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-numbers">
                {language === 'pt' ? 'Grade de Séries' : 'Set Matrix Log'}
              </span>
              <button
                type="button"
                onClick={handleAddSet}
                className="flex items-center gap-1.5 text-xs text-[#CCFF00] hover:underline font-mono-numbers font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{language === 'pt' ? '+ Adicionar Série' : '+ Add Set'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {sets.map((setItem, idx) => {
                const isSelected = selectedSetIndex === idx;
                return (
                  <div
                    key={setItem.id}
                    onClick={() => {
                      soundManager.playTick();
                      setSelectedSetIndex(idx);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F172A] border-[#CCFF00]/50 shadow-sm'
                        : 'bg-[#0F172A]/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono-numbers font-bold ${
                        isSelected ? 'bg-[#CCFF00] text-[#0A0F1D]' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {setItem.setNumber}
                      </span>
                      <div>
                          <div className="text-sm font-bold font-mono-numbers text-white">
                            {formatWeight(setItem.weight)} {unit} × {setItem.reps} {language === 'pt' ? 'repetições' : 'reps'}
                        </div>
                        <div className="text-[11px] font-mono-numbers text-slate-400">
                          RPE {setItem.rpe || 8} {setItem.previousBest && `· ${language === 'pt' ? 'Anterior' : 'Prev.'}: ${formatWeight(setItem.previousBest.weight)}×${setItem.previousBest.reps}`}
                        </div>
                      </div>
                    </div>

                    {/* Circular Checkbox (36px target with snap fill) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSetComplete(idx);
                      }}
                      className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition-all ${
                        setItem.isCompleted
                          ? 'bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt scale-105'
                          : 'border-2 border-slate-600 hover:border-slate-400 bg-transparent'
                      }`}
                      aria-label={language === 'pt' ? 'Alternar conclusão da série' : 'Toggle set complete'}
                    >
                      {setItem.isCompleted && <Check className="w-5 h-5 stroke-[3]" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Queue Navigation Bar */}
      <div className="mt-6 bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs uppercase font-mono-numbers text-slate-400 font-bold mr-1 shrink-0">
            {language === 'pt' ? 'Fila do Treino:' : 'Roster Queue:'}
          </span>
          {session.exercises.map((item, index) => {
            const isCurrent = session.currentExerciseIndex === index;
            const completedSets = item.sets.filter(s => s.isCompleted).length;
            const allDone = completedSets === item.sets.length;

            return (
              <button
                key={item.exercise.id}
                type="button"
                onClick={() => handleSwitchExercise(index)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono-numbers shrink-0 flex items-center gap-1.5 transition-all ${
                  isCurrent
                    ? 'bg-[#CCFF00] text-[#0A0F1D] font-bold shadow-glow-volt'
                    : allDone
                    ? 'bg-slate-800/80 text-[#CCFF00] border border-[#CCFF00]/30'
                    : 'bg-[#1E293B] text-slate-300 hover:bg-slate-700'
                }`}
              >
                {allDone && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{language === 'pt' ? item.exercise.namePt : item.exercise.name}</span>
                <span className="opacity-70 text-[10px]">({completedSets}/{item.sets.length})</span>
              </button>
            );
          })}
        </div>

        {/* Step Forward / Backward & Finish CTAs */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            disabled={session.currentExerciseIndex === 0}
            onClick={() => handleSwitchExercise(session.currentExerciseIndex - 1)}
            className="w-10 h-10 rounded-full bg-[#1E293B] hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
            title={language === 'pt' ? 'Exercício anterior' : 'Previous Exercise'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {!isFinalExercise ? (
            <button
              type="button"
              onClick={() => handleSwitchExercise(session.currentExerciseIndex + 1)}
              className="px-4 h-10 rounded-full bg-[#1E293B] hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-slate-700"
            >
              <span>{language === 'pt' ? 'Próximo Exercício' : 'Next Exercise'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinishWorkout}
              className="px-5 h-10 rounded-full bg-[#FF6B00] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-glow-blaze active:scale-95 transition-all"
            >
              <Flame className="w-4 h-4" />
              <span>{language === 'pt' ? 'Finalizar Treino (+350 XP)' : 'Finish Workout (+350 XP)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
