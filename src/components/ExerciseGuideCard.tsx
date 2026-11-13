import React from 'react';
import { Exercise } from '../types/workout';
import { ExerciseGuide } from '../data/presetRoutines';
import { getMuscleLabel, getCategoryLabel } from '../utils/localization';
import { Dumbbell } from 'lucide-react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';

interface ExerciseGuideCardProps {
  exercise: Exercise;
  language: 'pt' | 'en';
  className?: string;
}

export const ExerciseGuideCard: React.FC<ExerciseGuideCardProps> = ({
  exercise,
  language,
  className = '',
}) => {
  const guide = exercise.guide as ExerciseGuide | undefined;

  return (
    <div className={`bg-[#0A0F1D] border border-[#CCFF00]/30 rounded-2xl p-4 shadow-glow-volt-lg ${className}`}>
      {/* Exercício header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#CCFF00]/20 flex items-center justify-center">
          <Dumbbell className="w-4.5 h-4.5 text-[#CCFF00]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white font-display leading-tight">
            {language === 'pt' ? exercise.namePt : exercise.name}
          </h3>
          <p className="text-[10px] font-mono-numbers text-[#38BDF8] uppercase tracking-wider">
            {getCategoryLabel(exercise.category, language)}
          </p>
        </div>
      </div>

      {/* Muscle / equipment strip */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {exercise.primaryMuscle && (
          <span className="text-[10px] font-mono-numbers font-semibold text-[#CCFF00] uppercase tracking-wider">
            {language === 'pt' ? `Foco: ${getMuscleLabel(exercise.primaryMuscle, language)}` : `Target: ${getMuscleLabel(exercise.primaryMuscle, language)}`}
          </span>
        )}
        {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
          <span className="text-[10px] font-mono-numbers text-[#38BDF8] uppercase tracking-wider">
            + {exercise.secondaryMuscles.map(m => getMuscleLabel(m, language)).join(', ')}
          </span>
        )}
      </div>

      {/* Guide description */}
      {guide ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-2.5"
        >
          <p className="text-xs leading-relaxed text-slate-300">
            {language === 'pt'
              ? guide.descriptionPt || guide.description
              : guide.description || guide.descriptionPt}
          </p>
          {(guide.commonMistakesPt || guide.commonMistakes) && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2">
              <p className="text-[10px] font-mono-numbers font-bold uppercase tracking-wider text-amber-300 mb-0.5">
                {language === 'pt' ? 'Erros Comuns a Evitar' : 'Common Mistakes to Avoid'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {language === 'pt'
                  ? guide.commonMistakesPt || guide.commonMistakes
                  : guide.commonMistakes || guide.commonMistakesPt}
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <p className="text-xs leading-relaxed text-slate-400 italic">
          {language === 'pt'
            ? 'Sem descrição de execução disponível.'
            : 'Execution description not available.'}
        </p>
      )}
    </div>
  );
};