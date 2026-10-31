import React, { useEffect } from 'react';
import { Play, Pause, Plus, SkipForward, X, Clock } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface RestTimerModalProps {
  isOpen: boolean;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onAddSeconds: (sec: number) => void;
  onSkip: () => void;
  nextExerciseName?: string;
  nextSetNumber?: number;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  language?: 'pt' | 'en';
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  isOpen,
  timeLeft,
  totalTime,
  isRunning,
  onClose,
  onTogglePlay,
  onAddSeconds,
  onSkip,
  nextExerciseName,
  nextSetNumber,
  isMinimized = false,
  onToggleMinimize,
  language = 'pt',
}) => {
  // Beep when reaching last 3 seconds
  useEffect(() => {
    if (isRunning && timeLeft > 0 && timeLeft <= 3) {
      soundManager.playCountdownTick(false);
    } else if (isRunning && timeLeft === 0) {
      soundManager.playCountdownTick(true);
    }
  }, [timeLeft, isRunning]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Calculate progress for radial ring (0 to 1)
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  // Floating Minimized Bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 bg-[#0F172A]/95 backdrop-blur-xl border border-[#38BDF8]/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom duration-200">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={onToggleMinimize}
        >
          <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#38BDF8]/60 flex items-center justify-center text-[#38BDF8] shadow-glow-cyan">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono-numbers">
              {language === 'pt' ? 'Descanso Ativo' : 'Rest Recovery Active'}
            </div>
            <div className="text-xl font-bold font-mono-numbers text-[#38BDF8] tracking-tight">
              {formattedTime}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-[#1E293B] hover:bg-slate-700 text-white flex items-center justify-center transition-colors border border-slate-700"
            title={isRunning ? (language === 'pt' ? 'Pausar' : 'Pause') : (language === 'pt' ? 'Continuar' : 'Play')}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => onAddSeconds(30)}
            className="px-2.5 py-1.5 rounded-full bg-[#1E293B] hover:bg-slate-700 text-[#38BDF8] font-mono-numbers text-xs font-semibold border border-[#38BDF8]/30"
          >
            +30s
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="px-3 py-1.5 rounded-full bg-[#CCFF00] text-[#0A0F1D] text-xs font-bold uppercase tracking-wider shadow-glow-volt hover:brightness-110"
          >
            {language === 'pt' ? 'Próxima Série' : 'Next Set'}
          </button>
        </div>
      </div>
    );
  }

  // Full Screen Tactical Rest Sheet / Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-[#0F172A] border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shadow-glow-cyan animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#38BDF8] font-mono-numbers">
              {language === 'pt' ? 'Ciclo Metabólico de Descanso' : 'Metabolic Rest Cycle'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onToggleMinimize && (
              <button
                type="button"
                onClick={onToggleMinimize}
                className="w-8 h-8 rounded-full bg-[#1E293B] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title={language === 'pt' ? 'Minimizar' : 'Minimize Rest Bar'}
              >
                —
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1E293B] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              title={language === 'pt' ? 'Fechar' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Circular Countdown Dial */}
        <div className="relative w-56 h-56 flex items-center justify-center my-3">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="#1E293B"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Active animated progress ring */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="#38BDF8"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s ease',
                filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))',
              }}
            />
          </svg>

          {/* Center Digital Clock */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-extrabold font-mono-numbers tracking-tight text-[#F8FAFC]">
              {formattedTime}
            </span>
            <span className="text-xs uppercase tracking-wider text-slate-400 mt-1 font-semibold">
              {isRunning 
                ? (language === 'pt' ? 'Janela de Recuperação' : 'Recovery Window') 
                : (language === 'pt' ? 'Cronômetro Pausado' : 'Timer Paused')}
            </span>
          </div>
        </div>

        {/* Next Set Preview */}
        {nextExerciseName && (
          <div className="w-full bg-[#1E293B]/70 border border-slate-800 rounded-2xl p-3 my-3 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono-numbers block mb-0.5">
              {language === 'pt' ? `A Seguir: Série ${nextSetNumber || 1}` : `Up Next: Set ${nextSetNumber || 1}`}
            </span>
            <span className="text-sm font-bold text-white tracking-wide">
              {nextExerciseName}
            </span>
          </div>
        )}

        {/* Tactical Adjustment Buttons (+30s, +60s, -15s) */}
        <div className="flex items-center gap-2 mb-4 w-full">
          <button
            type="button"
            onClick={() => onAddSeconds(-15)}
            disabled={timeLeft <= 15}
            className="flex-1 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-mono-numbers text-xs font-semibold border border-slate-700/80 transition-colors"
          >
            -15s
          </button>
          <button
            type="button"
            onClick={() => onAddSeconds(30)}
            className="flex-1 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-[#38BDF8] font-mono-numbers text-xs font-semibold border border-[#38BDF8]/40 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 30s
          </button>
          <button
            type="button"
            onClick={() => onAddSeconds(60)}
            className="flex-1 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-[#38BDF8] font-mono-numbers text-xs font-semibold border border-[#38BDF8]/40 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 60s
          </button>
        </div>

        {/* Primary Action Controls */}
        <div className="w-full flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
              isRunning
                ? 'bg-[#1E293B] text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-[#38BDF8] text-[#0A0F1D] border-[#38BDF8] shadow-glow-cyan'
            }`}
            title={isRunning ? (language === 'pt' ? 'Pausar' : 'Pause Rest') : (language === 'pt' ? 'Continuar' : 'Resume Rest')}
          >
            {isRunning ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="flex-1 h-14 rounded-full bg-[#CCFF00] hover:brightness-110 active:scale-[0.97] transition-all text-[#0A0F1D] font-bold text-sm uppercase tracking-wider shadow-glow-volt flex items-center justify-center gap-2"
          >
            <span>{language === 'pt' ? 'Pronto · Pular Descanso' : 'Ready · Skip Rest'}</span>
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
