import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Zap, Dumbbell, Clock, Check, ArrowRight, Share2 } from 'lucide-react';
import { CompletedSessionSummary } from '../types/workout';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  summary: CompletedSessionSummary | null;
  onClose: () => void;
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  summary,
  onClose,
  language,
  unit,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundManager.playLevelUp();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#CCFF00', '#FF6B00', '#38BDF8', '#8B5CF6'],
      });
    }
  }, [isOpen]);

  if (!isOpen || !summary) return null;

  const formatWeight = (kg: number) => {
    if (unit === 'lbs') return Math.round(kg * 2.20462);
    return kg;
  };

  const minutes = Math.round(summary.durationSeconds / 60);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const handleShare = async () => {
    soundManager.playTick();
    const prsText = summary.prsAchieved.length > 0
      ? `\n🏆 Recordes (PRs): ${summary.prsAchieved.join(', ')}`
      : '';

    const shareTitle = language === 'pt' ? '🔥 Treino Concluído no FitFlow PWA!' : '🔥 Workout Completed on FitFlow PWA!';
    const shareMessage = language === 'pt'
      ? `⚡ FitFlow PWA — Treino Concluído!\n🏋️‍♂️ Rotina: ${summary.routineTitle}\n⏱️ Duração: ${minutes} min\n🦾 Volume Movimentado: ${formatWeight(summary.totalVolumeKg)} ${unit}\n📊 Séries Concluídas: ${summary.setsCount}\n⚡ XP Ganho: +${summary.xpEarned} XP${prsText}\n\n#FitFlow #SobrecargaProgressiva #Treino`
      : `⚡ FitFlow PWA — Session Conquered!\n🏋️‍♂️ Routine: ${summary.routineTitle}\n⏱️ Duration: ${minutes} min\n🦾 Total Tonnage: ${formatWeight(summary.totalVolumeKg)} ${unit}\n📊 Sets Completed: ${summary.setsCount}\n⚡ XP Yield: +${summary.xpEarned} XP${prsText}\n\n#FitFlow #ProgressiveOverload #Fitness`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: window.location.href,
        });
      } catch (err: unknown) {
        // If user cancelled, do nothing; if error, fallback to clipboard
        if ((err as Error)?.name !== 'AbortError') {
          copyToClipboard(shareMessage);
        }
      }
    } else {
      // Fallback for desktop or unsupported browsers: Clipboard
      copyToClipboard(shareMessage);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0F172A] border-2 border-[#CCFF00]/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Glow ambient circle */}
        <div className="w-20 h-20 rounded-full bg-[#CCFF00]/15 border-2 border-[#CCFF00] flex items-center justify-center text-[#CCFF00] mb-4 shadow-glow-volt">
          <Trophy className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono-numbers uppercase text-[#CCFF00] font-bold tracking-widest mb-1">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>{language === 'pt' ? 'SESSÃO CONCLUÍDA' : 'SESSION CONQUERED'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white mb-2">
          {summary.routineTitle}
        </h2>

        <p className="text-xs text-slate-300 mb-5">
          {language === 'pt'
            ? 'Treino finalizado com sucesso! Sobrecarga registrada na sua biometria e bônus de XP computado.'
            : 'Outstanding athletic output. Volume logged into hypertrophy telemetry with full XP yields applied.'}
        </p>

        {/* PR Breakthrough Pill if any */}
        {summary.prsAchieved.length > 0 && (
          <div className="w-full bg-[#FF6B00]/15 border border-[#FF6B00]/40 rounded-2xl p-2.5 mb-4 flex items-center justify-center gap-2 text-xs font-mono-numbers text-[#FF6B00] font-bold">
            <Trophy className="w-4 h-4 fill-current" />
            <span>
              {language === 'pt' ? 'Novo PR Registrado: ' : 'New PR Breakthrough: '}
              {summary.prsAchieved.join(', ')}
            </span>
          </div>
        )}

        {/* Highlight Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-4">
          <div className="bg-[#1E293B] rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-0.5">
              {language === 'pt' ? 'Duração' : 'Duration'}
            </span>
            <span className="text-lg font-bold font-mono-numbers text-white">
              {minutes} <span className="text-xs text-slate-400">min</span>
            </span>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-0.5">
              {language === 'pt' ? 'Tonelagem' : 'Tonnage'}
            </span>
            <span className="text-lg font-bold font-mono-numbers text-[#CCFF00]">
              {formatWeight(summary.totalVolumeKg)} <span className="text-xs text-slate-400">{unit}</span>
            </span>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-0.5">
              {language === 'pt' ? 'Séries Feitas' : 'Sets Done'}
            </span>
            <span className="text-lg font-bold font-mono-numbers text-[#38BDF8]">
              {summary.setsCount}
            </span>
          </div>
        </div>

        {/* XP Boost Pill */}
        <div className="w-full bg-[#1E293B] border border-[#8B5CF6]/50 rounded-2xl p-3 flex items-center justify-between mb-5 shadow-glow-purple">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center text-[#C4B5FD]">
              <Flame className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {language === 'pt' ? 'Recompensa de Treino' : 'Session XP Reward'}
              </span>
              <span className="text-[10px] font-mono-numbers text-slate-400">
                Consistency multiplier: 1.25x
              </span>
            </div>
          </div>
          <span className="text-lg font-extrabold font-mono-numbers text-[#C4B5FD]">
            +{summary.xpEarned} XP
          </span>
        </div>

        {/* Action Buttons: Web Share & Return */}
        <div className="w-full space-y-2.5">
          {/* Web Share CTA */}
          <button
            type="button"
            onClick={handleShare}
            className="w-full min-h-[48px] rounded-full bg-[#1E293B] hover:bg-slate-700 active:scale-[0.98] border border-[#38BDF8]/50 text-white font-bold text-xs uppercase tracking-wider font-mono-numbers flex items-center justify-center gap-2 shadow-glow-cyan transition-all"
          >
            {copiedToast ? (
              <>
                <Check className="w-4 h-4 text-[#CCFF00] stroke-[3]" />
                <span className="text-[#CCFF00]">
                  {language === 'pt' ? 'Resumo Copiado para Área de Transferência!' : 'Summary Copied to Clipboard!'}
                </span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#38BDF8]" />
                <span>{language === 'pt' ? 'Compartilhar PRs & Resumo (Web Share)' : 'Share PRs & Summary (Web Share)'}</span>
              </>
            )}
          </button>

          {/* Primary Action Button: Save & Return */}
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[50px] rounded-full bg-[#CCFF00] hover:brightness-110 active:scale-[0.98] text-[#0A0F1D] font-bold text-sm uppercase tracking-wider shadow-glow-volt flex items-center justify-center gap-2 transition-all font-mono-numbers"
          >
            <span>{language === 'pt' ? 'Salvar & Voltar ao Painel' : 'Save & Return to Dashboard'}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
