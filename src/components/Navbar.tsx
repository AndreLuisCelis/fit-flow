import React from 'react';
import { Dumbbell, Flame, BarChart3, Layers, Zap, Volume2, VolumeX, Globe, Bot, UserRound } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { UserProfile } from '../types/profile';

interface NavbarProps {
  currentTab: 'workout' | 'routines' | 'coach' | 'gamification' | 'analytics' | 'profile';
  onChangeTab: (tab: 'workout' | 'routines' | 'coach' | 'gamification' | 'analytics' | 'profile') => void;
  isWorkoutActive: boolean;
  onQuickStart: () => void;
  language: 'pt' | 'en';
  onToggleLanguage: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  streakDays: number;
  profile: UserProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onChangeTab,
  isWorkoutActive,
  onQuickStart,
  language,
  onToggleLanguage,
  soundEnabled,
  onToggleSound,
  streakDays,
  profile,
}) => {
  const isOnline = useOnlineStatus();
  const navItems = [
    { id: 'workout' as const, label: language === 'pt' ? 'Treino' : 'Session', icon: Dumbbell },
    { id: 'routines' as const, label: language === 'pt' ? 'Rotinas' : 'Routines', icon: Layers },
    { id: 'coach' as const, label: language === 'pt' ? 'Treinador IA' : 'AI Coach', icon: Bot },
    { id: 'gamification' as const, label: language === 'pt' ? 'Nível' : 'Progression', icon: Flame },
    { id: 'analytics' as const, label: language === 'pt' ? 'Biometria' : 'Telemetry', icon: BarChart3 },
  ];

  return (
    <>
      {/* Top Bar (adheres to Top Bar Contract: 3 zones, gap-8) */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0F1D]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-3 sm:gap-x-5 lg:gap-x-4 xl:gap-x-8 gap-y-2">
          
          {/* Zone 1: Single brand wordmark element */}
          <div 
            onClick={() => {
              soundManager.playTick();
              onChangeTab('routines');
            }}
            className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-[#CCFF00] text-[#0A0F1D] flex items-center justify-center font-black font-display shadow-glow-volt">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight font-display text-white">
                FIT<span className="text-[#CCFF00]">FLOW</span>
              </span>
              <span className="hidden sm:inline-block ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono-numbers font-bold bg-[#1E293B] text-[#38BDF8] border border-[#38BDF8]/40">
                PWA
              </span>
            </div>
          </div>

          {/* Zone 2: 4 nav links, single-line text with active state */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-6 text-xs font-mono-numbers uppercase tracking-wider">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundManager.playTick();
                    onChangeTab(item.id);
                  }}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 relative py-2 ${
                    isActive
                      ? 'text-[#CCFF00] font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.id === 'workout' && isWorkoutActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] shadow-glow-volt animate-ping" />
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CCFF00] shadow-glow-volt" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action area */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onChangeTab('profile')}
              aria-label={language === 'pt' ? `Perfil de ${profile.name}` : `${profile.name}'s profile`}
              title={language === 'pt' ? `Perfil de ${profile.name}` : `${profile.name}'s profile`}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                currentTab === 'profile'
                  ? 'bg-[#CCFF00]/10 border-[#CCFF00] text-[#CCFF00]'
                  : 'bg-[#1E293B] border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
            >
              <UserRound className="w-4 h-4" />
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton language={language} />

            {/* Quick sound toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className="w-8 h-8 rounded-full bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-slate-300 flex items-center justify-center transition-colors"
              title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Efeitos Sonoros'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#CCFF00]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {/* Language toggle PT/EN */}
            <button
              type="button"
              onClick={onToggleLanguage}
              className="px-2.5 py-1 rounded-full bg-[#1E293B] border border-slate-700 hover:border-slate-500 text-xs font-mono-numbers text-slate-300 flex items-center gap-1 transition-colors"
              title="Alternar Idioma"
            >
              <Globe className="w-3 h-3 text-[#38BDF8]" />
              <span className="font-bold">{language.toUpperCase()}</span>
            </button>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTick();
                if (isWorkoutActive) {
                  onChangeTab('workout');
                } else {
                  onQuickStart();
                }
              }}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-[#CCFF00] hover:brightness-110 active:scale-95 text-[#0A0F1D] font-bold text-xs uppercase tracking-wider font-mono-numbers shadow-glow-volt transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Dumbbell className="w-3.5 h-3.5 fill-current" />
              <span>{isWorkoutActive ? (language === 'pt' ? 'Retomar' : 'Resume') : (language === 'pt' ? 'Iniciar' : 'Start')}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Fixed Bottom Dock Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F172A]/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl">
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundManager.playTick();
                  onChangeTab(item.id);
                }}
                className={`flex flex-col items-center justify-center h-full min-h-11 transition-colors relative ${
                  isActive ? 'text-[#CCFF00]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {item.id === 'workout' && isWorkoutActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#CCFF00] shadow-glow-volt animate-ping" />
                  )}
                </div>
                <span className="text-[10px] font-mono-numbers font-semibold uppercase tracking-wider mt-1">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-[#CCFF00] shadow-glow-volt rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
