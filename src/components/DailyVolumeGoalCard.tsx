import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Trophy, 
  Award, 
  Sparkles, 
  Zap, 
  Check, 
  Plus, 
  Minus, 
  Flame, 
  Lock, 
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Dumbbell
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CompletedSessionSummary, ActiveWorkoutSession } from '../types/workout';
import { soundManager } from '../utils/audio';
import { filterRealSessions } from '../services/workoutHistory';

interface DailyVolumeGoalCardProps {
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
  completedSessions?: CompletedSessionSummary[];
  activeSession?: ActiveWorkoutSession | null;
  onClaimGoalReward?: (bonusXP: number) => void;
}

export const DailyVolumeGoalCard: React.FC<DailyVolumeGoalCardProps> = ({
  language,
  unit,
  completedSessions = [],
  activeSession = null,
  onClaimGoalReward,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Daily target volume in KG (saved in localStorage)
  const [dailyGoalKg, setDailyGoalKg] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fitflow_daily_volume_goal_kg');
      return saved ? Number(saved) : 10000;
    } catch {
      return 10000;
    }
  });

  // Manual / simulated boost for today (e.g., if testing or logging external sets)
  const [bonusVolumeKg, setBonusVolumeKg] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`fitflow_daily_manual_volume_${todayStr}`);
      // Default to 8,200 kg if fresh so user can see active progress and easily test the remaining 1,800 kg to trigger the seal!
      return saved !== null ? Number(saved) : 8200;
    } catch {
      return 8200;
    }
  });

  // Track if XP reward was claimed today
  const [isRewardClaimed, setIsRewardClaimed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`fitflow_daily_seal_claimed_${todayStr}`) === 'true';
    } catch {
      return false;
    }
  });

  // Confetti trigger flag to avoid re-triggering constantly
  const [hasCelebrated, setHasCelebrated] = useState<boolean>(false);

  // Calculate real volume from completed workouts today (excluding demo workouts)
  const realTodaySessionsVol = filterRealSessions(completedSessions)
    .filter(s => s.date === todayStr)
    .reduce((sum, s) => sum + (s.totalVolumeKg || 0), 0);

  // Active workout volume in real-time
  const activeSessionVol = (activeSession?.exercises || []).reduce((sum, ex) => {
    return sum + ex.sets.reduce((sSum, s) => s.isCompleted ? sSum + (s.weight * s.reps) : sSum, 0);
  }, 0);

  // Total current volume today
  const currentVolumeKg = Math.round(realTodaySessionsVol + activeSessionVol + bonusVolumeKg);

  // Convert kg to display unit (kg or lbs)
  const toDisplayWeight = (kg: number) => {
    if (unit === 'lbs') return Math.round(kg * 2.20462);
    return kg;
  };

  const currentDisplay = toDisplayWeight(currentVolumeKg);
  const goalDisplay = toDisplayWeight(dailyGoalKg);

  const progressPercent = Math.min(150, Math.round((currentVolumeKg / Math.max(1, dailyGoalKg)) * 100));
  const isGoalAchieved = currentVolumeKg >= dailyGoalKg;
  const remainingKg = Math.max(0, dailyGoalKg - currentVolumeKg);
  const remainingDisplay = toDisplayWeight(remainingKg);

  // Save goal changes to localStorage
  const handleUpdateGoal = (newGoalKg: number) => {
    const clamped = Math.max(1000, Math.min(50000, newGoalKg));
    setDailyGoalKg(clamped);
    soundManager.playTick();
    try {
      localStorage.setItem('fitflow_daily_volume_goal_kg', clamped.toString());
    } catch {}
  };

  // Add / adjust manual volume
  const handleAddVolume = (addedKg: number) => {
    const updated = Math.max(0, bonusVolumeKg + addedKg);
    setBonusVolumeKg(updated);
    soundManager.playTick();
    try {
      localStorage.setItem(`fitflow_daily_manual_volume_${todayStr}`, updated.toString());
    } catch {}
  };

  // Reset bonus volume
  const handleResetManualVolume = () => {
    setBonusVolumeKg(0);
    soundManager.playTick();
    try {
      localStorage.setItem(`fitflow_daily_manual_volume_${todayStr}`, '0');
    } catch {}
  };

  // Trigger celebration fanfare
  const triggerCelebration = () => {
    soundManager.playLevelUp();
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#CCFF00', '#FF6B00', '#38BDF8', '#FACC15', '#A855F7']
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#CCFF00', '#FF6B00', '#FACC15']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#38BDF8', '#CCFF00', '#A855F7']
        });
      }, 250);
    } catch {
      // Confetti fallback
    }
  };

  // Fire celebration once when goal is hit
  useEffect(() => {
    if (isGoalAchieved && !hasCelebrated) {
      triggerCelebration();
      setHasCelebrated(true);
    }
  }, [isGoalAchieved]);

  // Claim XP reward
  const handleClaimReward = () => {
    if (isRewardClaimed) return;
    setIsRewardClaimed(true);
    triggerCelebration();
    try {
      localStorage.setItem(`fitflow_daily_seal_claimed_${todayStr}`, 'true');
    } catch {}
    if (onClaimGoalReward) {
      onClaimGoalReward(250);
    }
  };

  const presetGoals = [
    { label: language === 'pt' ? '5.000 kg (Leve)' : '5,000 kg (Light)', value: 5000 },
    { label: language === 'pt' ? '8.000 kg (Hipertrofia)' : '8,000 kg (Standard)', value: 8000 },
    { label: language === 'pt' ? '10.000 kg (Titã I)' : '10,000 kg (Titan I)', value: 10000 },
    { label: language === 'pt' ? '15.000 kg (Titã II)' : '15,000 kg (Titan II)', value: 15000 },
    { label: language === 'pt' ? '20.000 kg (Besta)' : '20,000 kg (Beast)', value: 20000 },
  ];

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl transition-all">
      {/* Dynamic ambient background glow */}
      <div 
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isGoalAchieved ? 'bg-[#CCFF00]/15' : 'bg-[#38BDF8]/10'
        }`} 
      />

      {/* Header with Title and Current Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-numbers uppercase tracking-wider font-bold bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/30 flex items-center gap-1">
              <Target className="w-3 h-3" />
              {language === 'pt' ? 'SOBRECARGA DIÁRIA' : 'DAILY OVERLOAD TARGET'}
            </span>
            {isGoalAchieved ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-numbers uppercase tracking-wider font-extrabold bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt flex items-center gap-1 animate-pulse">
                <Check className="w-3 h-3 stroke-[3]" />
                {language === 'pt' ? 'META BATIDA!' : 'GOAL CRUSHED!'}
              </span>
            ) : (
              <span className="text-[11px] font-mono-numbers text-slate-400">
                {language === 'pt' ? `Faltam ${remainingDisplay.toLocaleString()} ${unit}` : `${remainingDisplay.toLocaleString()} ${unit} to go`}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            {language === 'pt' ? 'Metas de Volume Diário' : 'Daily Volume Target'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'pt'
              ? 'Defina sua meta de tonelagem para hoje e desbloqueie o Selo Titã exclusivo ao atingir 100%.'
              : 'Set your total daily tonnage target and earn the exclusive Titan Seal upon reaching 100%.'}
          </p>
        </div>

        {/* Live Ton Display Counter */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-2xl px-5 py-3 text-right font-mono-numbers">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
            {language === 'pt' ? 'Volume Levantado Hoje' : 'Today’s Tonnage Moved'}
          </span>
          <div className="flex items-baseline justify-end gap-1.5">
            <span className={`text-2xl sm:text-3xl font-black ${isGoalAchieved ? 'text-[#CCFF00]' : 'text-white'}`}>
              {currentDisplay.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">
              / {goalDisplay.toLocaleString()} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar with Volt styling */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-mono-numbers mb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">
              {language === 'pt' ? 'Progresso da Meta:' : 'Goal Completion:'}
            </span>
            <span className={`font-black text-sm ${isGoalAchieved ? 'text-[#CCFF00]' : 'text-[#38BDF8]'}`}>
              {progressPercent}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono-numbers">
            {isGoalAchieved 
              ? (language === 'pt' ? '🎉 Meta 100% Conquistada!' : '🎉 100% Achieved!') 
              : `${currentDisplay.toLocaleString()} / ${goalDisplay.toLocaleString()} ${unit}`}
          </span>
        </div>

        {/* Bar */}
        <div className="w-full h-4 bg-[#1E293B] rounded-full overflow-hidden p-0.5 border border-slate-700/80">
          <div
            className={`h-full rounded-full transition-all duration-700 relative ${
              isGoalAchieved
                ? 'bg-gradient-to-r from-[#CCFF00] via-[#FACC15] to-[#FF6B00] shadow-[0_0_15px_rgba(204,255,0,0.5)]'
                : 'bg-gradient-to-r from-[#38BDF8] to-[#CCFF00]'
            }`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          >
            {isGoalAchieved && (
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            )}
          </div>
        </div>
      </div>

      {/* SPECIAL TITAN SEAL SECTION */}
      <div className="mb-6">
        {isGoalAchieved ? (
          /* UNLOCKED TITAN SEAL: GLOWING CEREMONIAL EMBLEM */
          <div className="relative rounded-2xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] border-2 border-[#CCFF00] p-5 shadow-[0_0_30px_rgba(204,255,0,0.25)] overflow-hidden">
            {/* Background radiant beams */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#CCFF00]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#FF6B00]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
              {/* Seal Emblem Graphic */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {/* Outer pulsating ring */}
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#FF6B00] via-[#FACC15] to-[#CCFF00] p-1 shadow-glow-volt animate-[spin_12s_linear_infinite]">
                    <div className="w-full h-full rounded-full bg-[#0A0F1D] flex items-center justify-center">
                      <Trophy className="w-8 h-8 sm:w-9 sm:h-9 text-[#CCFF00]" />
                    </div>
                  </div>
                  {/* Star Badge Pin */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FF6B00] text-white rounded-full flex items-center justify-center border-2 border-[#0A0F1D] shadow-md">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-numbers font-extrabold uppercase tracking-wider bg-[#CCFF00] text-[#0A0F1D]">
                      {language === 'pt' ? 'SELO DESBLOQUEADO' : 'SEAL UNLOCKED'}
                    </span>
                    <span className="text-[11px] font-mono-numbers text-[#CCFF00] font-bold">
                      ★ DIA OFICIAL VENCIDO
                    </span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black font-display text-white tracking-wide flex items-center gap-2">
                    {language === 'pt' ? 'Selo Titã do Dia: Meta Conquistada' : 'Daily Titan Seal: Objective Conquered'}
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mt-1 leading-relaxed">
                    {language === 'pt'
                      ? `Você superou a gravidade e moveu incríveis ${currentDisplay.toLocaleString()} ${unit} hoje! Seu status atlético foi elevado.`
                      : `You overcame gravity and moved an incredible ${currentDisplay.toLocaleString()} ${unit} today! Your athletic mastery is proven.`}
                  </p>
                </div>
              </div>

              {/* Action buttons & XP Reward */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={triggerCelebration}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-xs font-mono-numbers font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
                  <span>{language === 'pt' ? 'Comemorar 🎉' : 'Celebrate 🎉'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClaimReward}
                  disabled={isRewardClaimed}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-mono-numbers text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isRewardClaimed
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                      : 'bg-[#CCFF00] hover:brightness-110 text-[#0A0F1D] shadow-glow-volt active:scale-95'
                  }`}
                >
                  {isRewardClaimed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#CCFF00]" />
                      <span>{language === 'pt' ? 'Bônus +250 XP Coletado' : '+250 XP Claimed'}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current text-[#0A0F1D]" />
                      <span>{language === 'pt' ? 'Resgatar +250 XP' : 'Claim +250 XP'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* LOCKED TITAN SEAL PREVIEW: HOLOGRAPHIC BLUEPRINT */
          <div className="rounded-2xl bg-[#161B2A]/90 border border-slate-800/80 p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#1E293B] border border-slate-700 flex items-center justify-center text-slate-500 relative flex-shrink-0">
                <Lock className="w-6 h-6 text-slate-500" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-300">
                  !
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono-numbers uppercase tracking-wider text-slate-400 font-bold">
                    {language === 'pt' ? 'SELO ESPECIAL BLOQUEADO' : 'SPECIAL SEAL LOCKED'}
                  </span>
                  <span className="text-[10px] font-mono-numbers text-[#38BDF8]">
                    +250 XP Bônus
                  </span>
                </div>
                <h5 className="text-sm font-bold text-white">
                  {language === 'pt' ? 'Selo Titã do Dia: Meta Batida' : 'Daily Titan Seal'}
                </h5>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'pt'
                    ? `Atinja 100% da sua meta diária (faltam ${remainingDisplay.toLocaleString()} ${unit}) para desbloquear este selo.`
                    : `Hit 100% of your daily volume target (${remainingDisplay.toLocaleString()} ${unit} remaining) to unlock.`}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto text-center sm:text-right">
              <span className="text-[11px] font-mono-numbers text-slate-500 block">
                {language === 'pt' ? 'Status de Conquista' : 'Unlock Status'}
              </span>
              <span className="text-sm font-mono-numbers font-bold text-slate-300">
                {progressPercent}% / 100%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Target Volume Configuration & Steppers */}
      <div className="border-t border-slate-800/80 pt-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          {/* Steppers & Direct Input */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-mono-numbers text-slate-400 font-semibold mr-1 block sm:inline">
              {language === 'pt' ? 'Ajustar Meta:' : 'Target Config:'}
            </span>

            {/* Decrement Steppers */}
            <button
              type="button"
              onClick={() => handleUpdateGoal(dailyGoalKg - 1000)}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-xs font-mono-numbers text-slate-200 flex items-center gap-1 active:scale-95 transition-all"
              title="-1.000 kg"
            >
              <Minus className="w-3 h-3" />
              <span>1k</span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateGoal(dailyGoalKg - 500)}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-xs font-mono-numbers text-slate-200 flex items-center gap-1 active:scale-95 transition-all"
              title="-500 kg"
            >
              <Minus className="w-3 h-3" />
              <span>500</span>
            </button>

            {/* Direct Input */}
            <div className="flex items-center bg-[#0A0F1D] border border-slate-700 rounded-xl px-2.5 py-1">
              <input
                type="number"
                step="500"
                min="1000"
                max="50000"
                value={dailyGoalKg}
                onChange={(e) => handleUpdateGoal(Number(e.target.value) || 1000)}
                className="w-20 bg-transparent text-xs font-mono-numbers text-white font-bold text-center focus:outline-none"
              />
              <span className="text-[10px] font-mono-numbers text-slate-400">
                kg
              </span>
            </div>

            {/* Increment Steppers */}
            <button
              type="button"
              onClick={() => handleUpdateGoal(dailyGoalKg + 500)}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-xs font-mono-numbers text-[#CCFF00] flex items-center gap-1 active:scale-95 transition-all"
              title="+500 kg"
            >
              <Plus className="w-3 h-3" />
              <span>500</span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateGoal(dailyGoalKg + 1000)}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-xs font-mono-numbers text-[#CCFF00] flex items-center gap-1 active:scale-95 transition-all"
              title="+1.000 kg"
            >
              <Plus className="w-3 h-3" />
              <span>1k</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <span className="text-[11px] font-mono-numbers text-slate-500 mr-1 hidden sm:inline">
              {language === 'pt' ? 'Atalhos:' : 'Presets:'}
            </span>
            {presetGoals.map((p) => {
              const isSelected = dailyGoalKg === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleUpdateGoal(p.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-numbers transition-all ${
                    isSelected
                      ? 'bg-[#CCFF00] text-[#0A0F1D] font-bold shadow-sm'
                      : 'bg-[#1E293B]/70 hover:bg-[#1E293B] text-slate-300 border border-slate-800'
                  }`}
                >
                  {p.value >= 1000 ? `${p.value / 1000}k` : p.value} kg
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Volume Simulator / Test Boost */}
        <div className="mt-4 p-3 rounded-xl bg-[#161B2A]/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Dumbbell className="w-4 h-4 text-[#CCFF00]" />
            <span className="text-[11px] font-mono-numbers">
              {language === 'pt' 
                ? 'Treinos concluídos e séries ativas somam volume automaticamente aqui.' 
                : 'Completed workouts and active sets log daily volume automatically here.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-numbers text-slate-500 uppercase">
              {language === 'pt' ? 'Testar Meta:' : 'Test Goal:'}
            </span>
            <button
              type="button"
              onClick={() => handleAddVolume(1000)}
              className="px-2 py-1 rounded bg-[#1E293B] hover:bg-slate-700 text-[10px] font-mono-numbers text-[#CCFF00] font-bold border border-slate-700 active:scale-95 transition-all"
            >
              +1.000 kg
            </button>
            <button
              type="button"
              onClick={() => handleAddVolume(2000)}
              className="px-2 py-1 rounded bg-[#1E293B] hover:bg-slate-700 text-[10px] font-mono-numbers text-[#CCFF00] font-bold border border-slate-700 active:scale-95 transition-all"
            >
              +2.000 kg
            </button>
            {bonusVolumeKg > 0 && (
              <button
                type="button"
                onClick={handleResetManualVolume}
                className="px-2 py-1 rounded bg-[#1E293B] hover:bg-red-950/40 text-[10px] font-mono-numbers text-slate-400 hover:text-red-400 border border-slate-700 active:scale-95 transition-all"
                title={language === 'pt' ? 'Zerar ajuste manual' : 'Reset manual test volume'}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
