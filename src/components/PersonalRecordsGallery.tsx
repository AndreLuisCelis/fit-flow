import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Flame, 
  Calendar, 
  Zap, 
  ArrowUpRight, 
  Dumbbell, 
  Sparkles,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';

export interface PersonalRecordItem {
  id: string;
  exerciseId: string;
  exerciseNamePt: string;
  exerciseNameEn: string;
  muscleGroup: string;
  category: 'Push' | 'Pull' | 'Legs' | 'Shoulders';
  peakWeightKg: number;
  reps: number;
  dateAchieved: string;
  previousWeightKg: number;
  tier: 'elite' | 'gold' | 'neon';
  iconType: 'trophy' | 'flame' | 'zap' | 'dumbbell';
}

interface PersonalRecordsGalleryProps {
  onSelectExercise?: (exerciseId: string) => void;
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
}

export const PersonalRecordsGallery: React.FC<PersonalRecordsGalleryProps> = ({
  onSelectExercise,
  language,
  unit,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const formatWeight = (kg: number) => {
    if (unit === 'lbs') return Math.round(kg * 2.20462);
    return Math.round(kg * 10) / 10;
  };

  // Curated list of verified Personal Records achieved by the athlete
  const personalRecords: PersonalRecordItem[] = [
    {
      id: 'pr-deadlift',
      exerciseId: 'barbell_deadlift',
      exerciseNamePt: 'Levantamento Terra Convencional',
      exerciseNameEn: 'Conventional Barbell Deadlift',
      muscleGroup: language === 'pt' ? 'Cadeia Posterior & Dorsais' : 'Posterior Chain & Lats',
      category: 'Pull',
      peakWeightKg: 150,
      reps: 5,
      dateAchieved: '2026-10-26',
      previousWeightKg: 140,
      tier: 'elite',
      iconType: 'trophy',
    },
    {
      id: 'pr-squat',
      exerciseId: 'barbell_squat',
      exerciseNamePt: 'Agachamento Livre com Barra',
      exerciseNameEn: 'Barbell Back Squat',
      muscleGroup: language === 'pt' ? 'Quadríceps & Glúteos' : 'Quads & Glutes',
      category: 'Legs',
      peakWeightKg: 120,
      reps: 6,
      dateAchieved: '2026-10-28',
      previousWeightKg: 110,
      tier: 'gold',
      iconType: 'zap',
    },
    {
      id: 'pr-bench',
      exerciseId: 'bench_press',
      exerciseNamePt: 'Supino Reto com Barra',
      exerciseNameEn: 'Barbell Bench Press',
      muscleGroup: language === 'pt' ? 'Peitoral & Tríceps' : 'Chest & Triceps',
      category: 'Push',
      peakWeightKg: 90,
      reps: 8,
      dateAchieved: '2026-10-30',
      previousWeightKg: 82.5,
      tier: 'neon',
      iconType: 'flame',
    },
    {
      id: 'pr-row',
      exerciseId: 'barbell_row',
      exerciseNamePt: 'Remada Curvada com Barra',
      exerciseNameEn: 'Bent-Over Barbell Row',
      muscleGroup: language === 'pt' ? 'Dorsais & Rombóides' : 'Lats & Rhomboids',
      category: 'Pull',
      peakWeightKg: 80,
      reps: 8,
      dateAchieved: '2026-10-30',
      previousWeightKg: 72.5,
      tier: 'gold',
      iconType: 'dumbbell',
    },
    {
      id: 'pr-ohp',
      exerciseId: 'overhead_press',
      exerciseNamePt: 'Desenvolvimento Militar (OHP)',
      exerciseNameEn: 'Standing Barbell OHP',
      muscleGroup: language === 'pt' ? 'Deltóides & Tríceps' : 'Delts & Core',
      category: 'Shoulders',
      peakWeightKg: 52.5,
      reps: 8,
      dateAchieved: '2026-10-23',
      previousWeightKg: 47.5,
      tier: 'neon',
      iconType: 'trophy',
    },
  ];

  const categories = [
    { id: 'All', labelPt: 'Todos os PRs', labelEn: 'All PRs' },
    { id: 'Push', labelPt: 'Push (Peito/Tríceps)', labelEn: 'Push' },
    { id: 'Pull', labelPt: 'Pull (Costas/Bíceps)', labelEn: 'Pull' },
    { id: 'Legs', labelPt: 'Pernas (Legs)', labelEn: 'Legs' },
    { id: 'Shoulders', labelPt: 'Ombros (Shoulders)', labelEn: 'Shoulders' },
  ];

  const filteredRecords = personalRecords.filter((pr) => {
    if (selectedFilter === 'All') return true;
    return pr.category === selectedFilter;
  });

  const handleCelebratePR = (pr: PersonalRecordItem) => {
    soundManager.playSetComplete();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#CCFF00', '#FF6B00', '#38BDF8', '#8B5CF6'],
    });

    if (onSelectExercise) {
      onSelectExercise(pr.exerciseId);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'elite':
        return {
          label: 'ELITE TITAN',
          style: 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/40 shadow-glow-blaze',
          iconColor: 'text-[#FF6B00]',
        };
      case 'neon':
        return {
          label: 'NEON PEAK',
          style: 'bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/40 shadow-glow-volt',
          iconColor: 'text-[#CCFF00]',
        };
      case 'gold':
      default:
        return {
          label: 'GOLD OVERLOAD',
          style: 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/40 shadow-glow-cyan',
          iconColor: 'text-[#38BDF8]',
        };
    }
  };

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#CCFF00]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-[#CCFF00]" />
            <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#CCFF00] font-bold">
              {language === 'pt' ? 'GALERIA DE RECORDES PESSOAIS' : 'PERSONAL RECORDS VAULT'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            {language === 'pt' ? 'Conquistas de Carga Máxima (PRs)' : 'All-Time Maximal PR Breakthroughs'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'pt'
              ? 'Registro oficial dos recordes batidos em treino, calculados com a data exata da superação de sobrecarga.'
              : 'Verified personal records achieved under peak training loads, tracked with exact milestone timestamps.'}
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono-numbers">
          <span className="px-3 py-1.5 rounded-full bg-[#1E293B] border border-slate-700 text-xs text-[#CCFF00] font-bold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#CCFF00]" />
            <span>{personalRecords.length} {language === 'pt' ? 'PRs Registrados' : 'Logged PRs'}</span>
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#1E293B] border border-slate-800 rounded-2xl mb-6 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              soundManager.playTick();
              setSelectedFilter(cat.id);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-numbers font-semibold transition-all whitespace-nowrap ${
              selectedFilter === cat.id
                ? 'bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'pt' ? cat.labelPt : cat.labelEn}
          </button>
        ))}
      </div>

      {/* Grid of PR Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecords.map((pr) => {
          const name = language === 'pt' ? pr.exerciseNamePt : pr.exerciseNameEn;
          const peakDisplay = formatWeight(pr.peakWeightKg);
          const prevDisplay = formatWeight(pr.previousWeightKg);
          const delta = Math.round((peakDisplay - prevDisplay) * 10) / 10;
          const percentage = Math.round((delta / prevDisplay) * 100);
          const tierData = getTierBadge(pr.tier);

          // Epley Formula for 1RM: weight * (1 + reps / 30)
          const estimated1RM = Math.round(peakDisplay * (1 + pr.reps / 30));

          return (
            <div
              key={pr.id}
              onClick={() => handleCelebratePR(pr)}
              className="bg-[#1E293B] border border-slate-800/90 hover:border-[#CCFF00]/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between group cursor-pointer shadow-lg hover:shadow-2xl relative overflow-hidden"
            >
              {/* Top Row: Icon, Badge and Category */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl bg-[#0F172A] border border-slate-700/80 flex items-center justify-center ${tierData.iconColor} group-hover:scale-105 transition-transform`}>
                      <Trophy className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono-numbers font-extrabold uppercase tracking-wider border ${tierData.style}`}>
                        {tierData.label}
                      </span>
                    </div>
                  </div>

                  {/* Date Badge */}
                  <div className="flex items-center gap-1 text-[11px] font-mono-numbers text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{pr.dateAchieved}</span>
                  </div>
                </div>

                {/* Title and Muscle Group */}
                <h3 className="text-base font-bold font-display text-white group-hover:text-[#CCFF00] transition-colors mb-1">
                  {name}
                </h3>
                <span className="text-[11px] font-mono-numbers text-slate-400 block mb-4">
                  {pr.muscleGroup}
                </span>

                {/* Big Metric Display */}
                <div className="bg-[#0F172A] rounded-xl p-3 border border-slate-800/80 mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono-numbers uppercase text-slate-500 block">
                      {language === 'pt' ? 'Carga Máxima Batida' : 'Peak PR Load'}
                    </span>
                    <div className="text-2xl font-black font-mono-numbers text-[#CCFF00] tracking-tight">
                      {peakDisplay} <span className="text-xs font-normal text-slate-400">{unit}</span>
                      <span className="text-xs font-semibold text-slate-400 ml-1.5">× {pr.reps} reps</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono-numbers uppercase text-slate-500 block">
                      {language === 'pt' ? '1RM Teórico' : 'Est. 1RM'}
                    </span>
                    <span className="text-lg font-extrabold font-mono-numbers text-[#38BDF8]">
                      {estimated1RM} <span className="text-[11px]">{unit}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Progress Row */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono-numbers">
                <div className="flex items-center gap-1 text-[#CCFF00] font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+{delta} {unit} (+{percentage}%)</span>
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
                  {language === 'pt' ? 'Toque para celebrar 🎉' : 'Tap to celebrate 🎉'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
