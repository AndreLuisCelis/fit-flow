import React, { useState } from 'react';
import { 
  Flame, 
  Zap, 
  Trophy, 
  Shield, 
  Award, 
  Dumbbell, 
  Check, 
  ChevronRight, 
  Lock, 
  TrendingUp,
  Sparkles,
  Calculator
} from 'lucide-react';
import { UserStats, MasteryBadge, CompletedSessionSummary, ActiveWorkoutSession } from '../types/workout';
import { soundManager } from '../utils/audio';
import { DailyVolumeGoalCard } from './DailyVolumeGoalCard';
import { InactivityReminderCard } from './InactivityReminderCard';

interface GamificationViewProps {
  stats: UserStats;
  badges: MasteryBadge[];
  onClaimFreeze: () => void;
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
  completedSessions?: CompletedSessionSummary[];
  activeSession?: ActiveWorkoutSession | null;
  onClaimGoalReward?: (bonusXP: number) => void;
}

export const GamificationView: React.FC<GamificationViewProps> = ({
  stats,
  badges,
  onClaimFreeze,
  language,
  unit,
  completedSessions,
  activeSession,
  onClaimGoalReward,
}) => {
  const [calcWeight, setCalcWeight] = useState<number>(100);
  const [calcReps, setCalcReps] = useState<number>(6);

  // Epley 1RM Formula: 1RM = weight * (1 + reps / 30)
  const estimated1RM = Math.round(calcWeight * (1 + calcReps / 30));

  const xpProgressPercent = Math.min(100, Math.round((stats.currentXP / stats.xpForNextLevel) * 100));

  const formatWeight = (kg: number) => {
    if (unit === 'lbs') return Math.round(kg * 2.20462);
    return kg;
  };

  const dayNames = language === 'pt' ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 pt-2 px-3 sm:px-6 space-y-6">
      
      {/* Top Banner: Level & Electrified XP Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#38BDF8] flex items-center justify-center text-white font-extrabold text-2xl font-mono-numbers shadow-glow-purple">
              {stats.level}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest text-[#C4B5FD] font-mono-numbers font-bold">
                  {language === 'pt' ? 'RANK ATLÉTICO' : 'ATHLETIC DIVISION'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/40">
                  TIER III
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
                {language === 'pt' ? 'Atleta Cinético Apex' : 'Apex Kinetic Athlete'}
              </h2>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono-numbers">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">
              {language === 'pt' ? 'XP para Próximo Nível' : 'Milestone Progress'}
            </span>
            <span className="text-lg sm:text-xl font-bold text-white">
              {stats.currentXP.toLocaleString()} <span className="text-slate-500 text-sm">/ {stats.xpForNextLevel.toLocaleString()} XP</span>
            </span>
          </div>
        </div>

        {/* Electrified Gradient XP Track (10px high rounded track from #8B5CF6 to #38BDF8) */}
        <div className="w-full h-3 bg-[#1E293B] rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#38BDF8] transition-all duration-1000 shadow-glow-purple"
            style={{ width: `${xpProgressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs font-mono-numbers text-slate-400">
          <span>{xpProgressPercent}% {language === 'pt' ? 'completado' : 'unlocked'}</span>
          <span className="text-[#38BDF8] font-bold">
            +{stats.xpForNextLevel - stats.currentXP} {language === 'pt' ? `XP para o Nível ${stats.level + 1}` : `XP to Level ${stats.level + 1}`}
          </span>
        </div>
      </div>

      {/* Metas de Volume Diário & Selo Titã */}
      <DailyVolumeGoalCard
        language={language}
        unit={unit}
        completedSessions={completedSessions}
        activeSession={activeSession}
        onClaimGoalReward={onClaimGoalReward}
      />

      {/* Grid: Streak Flame Card & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Streak Flame Card (5 cols) */}
        <div className="md:col-span-5 bg-[#0F172A] border border-[#FF6B00]/40 rounded-3xl p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#FF6B00] font-bold flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-current animate-pulse text-[#FF6B00]" />
                {language === 'pt' ? 'SEQUÊNCIA ATIVA' : 'CONSISTENCY STREAK'}
              </span>

              {stats.streakFrozenToday && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers bg-cyan-950/80 text-[#38BDF8] border border-[#38BDF8]/40 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {language === 'pt' ? 'Escudo Ativo' : 'Shield Active'}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-black font-mono-numbers text-white tracking-tight">
                {stats.streakDays}
              </span>
              <span className="text-xl font-bold font-display text-[#FF6B00] uppercase">
                {language === 'pt' ? 'DIAS CONSECUTIVOS' : 'DAYS STRONG'}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {language === 'pt'
                ? 'Sua intensidade metabólica está alta! Mantenha a disciplina de treino para multiplicar recompensas de XP.'
                : 'Metabolic momentum is peaking. Complete today’s session to safeguard your consistency coefficient.'}
            </p>

            {/* 7-Day Connected Geometric Progress Pips */}
            <div className="bg-[#1E293B] rounded-2xl p-3 border border-slate-800 mb-5">
              <div className="flex items-center justify-between gap-1">
                {stats.streakHistory.map((isDayDone, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-[10px] font-mono-numbers text-slate-400">
                      {dayNames[idx]}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isDayDone
                          ? 'bg-[#FF6B00] text-white shadow-glow-blaze scale-105'
                          : 'bg-[#0F172A] border border-slate-700 text-slate-600'
                      }`}
                    >
                      {isDayDone ? <Flame className="w-3.5 h-3.5 fill-current" /> : '·'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Streak Freeze Shield Action */}
          <button
            type="button"
            onClick={() => {
              soundManager.playTick();
              onClaimFreeze();
            }}
            disabled={stats.streakFrozenToday}
            className="w-full min-h-[48px] rounded-full bg-[#1E293B] hover:bg-slate-800 border border-[#FF6B00]/40 disabled:opacity-50 text-white font-mono-numbers text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <Shield className="w-4 h-4 text-[#FF6B00]" />
            <span>
              {stats.streakFrozenToday 
                ? (language === 'pt' ? 'Escudo Anti-Inatividade Equipado' : 'Freeze Shield Equipped') 
                : (language === 'pt' ? 'Ativar Proteção de Sequência (Freeze)' : 'Activate Streak Freeze Protection')}
            </span>
          </button>
        </div>

        {/* Lifetime Telemetry & 1RM Estimator (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-5">
          
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4">
              <span className="text-[11px] font-mono-numbers uppercase text-slate-400 block mb-1">
                {language === 'pt' ? 'Treinos Concluídos' : 'Total Sessions'}
              </span>
              <div className="text-3xl font-extrabold font-mono-numbers text-[#CCFF00]">
                {stats.totalWorkoutsCompleted}
              </div>
              <span className="text-[11px] text-slate-500 font-mono-numbers mt-1 block">
                {language === 'pt' ? '+4 esta semana' : '+4 this week'}
              </span>
            </div>

            <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-4">
              <span className="text-[11px] font-mono-numbers uppercase text-slate-400 block mb-1">
                {language === 'pt' ? 'Tonelagem Vitalícia' : 'Lifetime Tonnage'}
              </span>
              <div className="text-3xl font-extrabold font-mono-numbers text-[#38BDF8]">
                {formatWeight(stats.totalLifetimeVolumeKg).toLocaleString()} <span className="text-sm font-normal">{unit}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono-numbers mt-1 block">
                {language === 'pt' ? 'Classe Mestre do Ferro' : 'Iron Master Class'}
              </span>
            </div>
          </div>

          {/* 1RM Athletic Calculator */}
          <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#CCFF00]" />
                <span className="text-xs font-bold font-mono-numbers uppercase tracking-wider text-white">
                  {language === 'pt' ? 'Calculadora de 1RM (Força Máxima)' : '1RM Maximal Force Calculator'}
                </span>
              </div>
              <span className="text-[10px] font-mono-numbers text-slate-400">
                Epley Formula
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="text-[10px] uppercase font-mono-numbers text-slate-400 block mb-1">
                  {language === 'pt' ? `Carga (${unit})` : `Weight (${unit})`}
                </label>
                <input
                  type="number"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value) || 0)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono-numbers text-white focus:outline-none focus:border-[#CCFF00]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono-numbers text-slate-400 block mb-1">
                  {language === 'pt' ? 'Repetições Feitas' : 'Reps Performed'}
                </label>
                <input
                  type="number"
                  value={calcReps}
                  onChange={(e) => setCalcReps(Number(e.target.value) || 1)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono-numbers text-white focus:outline-none focus:border-[#CCFF00]"
                />
              </div>

              <div className="bg-[#0F172A] border border-[#CCFF00]/40 rounded-xl p-3 text-center sm:text-right">
                <span className="text-[10px] uppercase font-mono-numbers text-slate-400 block">
                  {language === 'pt' ? '1RM Teórico' : 'Estimated 1RM'}
                </span>
                <span className="text-2xl font-black font-mono-numbers text-[#CCFF00]">
                  {estimated1RM} <span className="text-xs">{unit}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inactivity Notifications & Scheduled Reminders */}
      <InactivityReminderCard
        stats={stats}
        language={language}
      />

      {/* Mastery Badges Roster */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-lg font-bold font-display text-white">
                {language === 'pt' ? 'Distintivos de Maestria & Conquistas' : 'Mastery Badges & Milestones'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'pt' ? 'Desbloqueie condecorações através de consistência, quebra de recordes e tonelagem total.' : 'Earn permanent badge insignias through progressive overload, streak consistency, and volume.'}
            </p>
          </div>
          <span className="text-xs font-mono-numbers font-semibold text-[#8B5CF6]">
            {badges.filter(b => b.isUnlocked).length} / {badges.length} {language === 'pt' ? 'Desbloqueados' : 'Unlocked'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const title = language === 'pt' ? badge.titlePt : badge.title;
            const desc = language === 'pt' ? badge.descriptionPt : badge.description;
            const percent = Math.min(100, Math.round((badge.progress / badge.target) * 100));

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all ${
                  badge.isUnlocked
                    ? 'bg-[#1E293B] border-[#8B5CF6]/50 shadow-sm'
                    : 'bg-[#161B2A]/70 border-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    badge.isUnlocked
                      ? 'bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/50 shadow-glow-purple'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {badge.isUnlocked ? <Trophy className="w-5 h-5 text-[#8B5CF6]" /> : <Lock className="w-4 h-4 text-slate-500" />}
                  </div>

                  <span className={`text-[10px] font-mono-numbers uppercase tracking-wider px-2 py-0.5 rounded ${
                    badge.isUnlocked
                      ? 'bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/30 font-bold'
                      : 'text-slate-500'
                  }`}>
                    {badge.isUnlocked ? (language === 'pt' ? 'DESBLOQUEADO' : 'UNLOCKED') : `${percent}%`}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-1">
                  {title}
                </h4>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  {desc}
                </p>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.isUnlocked ? 'bg-[#CCFF00]' : 'bg-[#8B5CF6]'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
