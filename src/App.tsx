import React, { useState, useEffect, useRef } from 'react';
import { 
  WorkoutRoutine, 
  ActiveWorkoutSession, 
  CompletedSessionSummary, 
  UserStats, 
  MasteryBadge,
  CompletedExerciseSummary,
} from './types/workout';
import { PRESET_ROUTINES, EXERCISE_DATABASE, INITIAL_USER_STATS, INITIAL_BADGES } from './data/presetRoutines';
import { Navbar } from './components/Navbar';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { RoutinesHub } from './components/RoutinesHub';
import { GamificationView } from './components/GamificationView';
import { AnalyticsView } from './components/AnalyticsView';
import { RestTimerModal } from './components/RestTimerModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AiCoachView } from './components/AiCoachView';
import { UserProfileView } from './components/UserProfileView';
import { fitFlowDB } from './db/indexedDb';
import { userProfileStore, UserProfileReadResult } from './services/userProfile';
import { UserProfile } from './types/profile';
import { soundManager } from './utils/audio';
import { rankCompatibleRoutines } from './utils/workoutPersonalization';
import { addExperience, reconcileUserStats } from './services/userProgression';
import {
  calculatePersonalRecordAchievements,
  calculateRealStreak,
  filterRealSessions,
  formatPersonalRecordAchievements,
  getLocalDateString,
  getRealExercisePreviousBest,
  updateStreakHistory,
} from './services/workoutHistory';
import { Dumbbell, Play, Sparkles, Flame, CheckCircle, Shield } from 'lucide-react';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'workout' | 'routines' | 'coach' | 'gamification' | 'analytics' | 'profile'>('routines');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileGate, setProfileGate] = useState<'loading' | 'setup' | 'ready' | 'storage-error'>('loading');
  const [profileNotice, setProfileNotice] = useState('');

  const applyProfileReadResult = (result: UserProfileReadResult) => {
    if (result.status === 'valid') {
      setProfile(result.profile);
      setProfileGate('ready');
      setProfileNotice('');
    } else if (result.status === 'error') {
      setProfileGate('storage-error');
    } else {
      setProfile(null);
      setProfileGate('setup');
      setProfileNotice(result.status === 'invalid'
        ? 'Os dados de perfil salvos estão inválidos. Revise e salve suas informações novamente.'
        : '');
    }
  };

  useEffect(() => {
    applyProfileReadResult(userProfileStore.load());
  }, []);

  // LocalStorage: Preferências e Configurações
  const [language, setLanguage] = useState<'pt' | 'en'>(() => {
    try {
      return (localStorage.getItem('fitflow_language') as 'pt' | 'en') || 'pt';
    } catch {
      return 'pt';
    }
  });

  const [unit, setUnit] = useState<'kg' | 'lbs'>(() => {
    try {
      return (localStorage.getItem('fitflow_unit') as 'kg' | 'lbs') || 'kg';
    } catch {
      return 'kg';
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('fitflow_sound');
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  });

  // User Stats & Badges (LocalStorage)
  const [userStats, setUserStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem('fitflow_user_stats');
      return reconcileUserStats(saved, INITIAL_USER_STATS);
    } catch {
      return INITIAL_USER_STATS;
    }
  });

  const [badges, setBadges] = useState<MasteryBadge[]>(() => {
    try {
      const saved = localStorage.getItem('fitflow_badges');
      return saved ? JSON.parse(saved) : INITIAL_BADGES;
    } catch {
      return INITIAL_BADGES;
    }
  });

  // IndexedDB: Histórico de Treinos
  const [completedSessions, setCompletedSessions] = useState<CompletedSessionSummary[]>([]);

  // Load IndexedDB History on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const hist = await fitFlowDB.getHistory();
        setCompletedSessions(hist);
        const realSessions = filterRealSessions(hist);
        if (realSessions.length > 0) {
          const today = getLocalDateString();
          const currentStreak = calculateRealStreak(realSessions, today);
          setUserStats((prev) => {
            if (prev.streakDays === currentStreak) return prev;
            return {
              ...prev,
              streakDays: currentStreak,
            };
          });
        }
      } catch (e) {
        console.warn('Could not load history from IndexedDB:', e);
      }
    }
    loadHistory();
  }, []);

  // Active Workout Session
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(null);

  // Rest Timer State
  const [restTimerOpen, setRestTimerOpen] = useState<boolean>(false);
  const [restTimeLeft, setRestTimeLeft] = useState<number>(75);
  const [restTotalTime, setRestTotalTime] = useState<number>(75);
  const [restTimerRunning, setRestTimerRunning] = useState<boolean>(false);
  const [restNextExName, setRestNextExName] = useState<string | undefined>(undefined);
  const [restNextSetNum, setRestNextSetNum] = useState<number | undefined>(undefined);
  const [restTimerMinimized, setRestTimerMinimized] = useState<boolean>(false);

  // Workout Completion Modal
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [lastSummary, setLastSummary] = useState<CompletedSessionSummary | null>(null);

  // Sync Audio preferences
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    try {
      localStorage.setItem('fitflow_sound', JSON.stringify(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  // Save Preferences to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('fitflow_language', language);
    } catch {}
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('fitflow_unit', unit);
    } catch {}
  }, [unit]);

  useEffect(() => {
    try {
      localStorage.setItem('fitflow_user_stats', JSON.stringify(userStats));
    } catch {}
  }, [userStats]);

  useEffect(() => {
    try {
      localStorage.setItem('fitflow_badges', JSON.stringify(badges));
    } catch {}
  }, [badges]);

  // Rest Timer Countdown Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (restTimerOpen && restTimerRunning && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            setRestTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimerOpen, restTimerRunning, restTimeLeft]);

  // Start a chosen routine
  const handleStartRoutine = (routine: WorkoutRoutine) => {
    soundManager.playSetComplete();
    const newSession: ActiveWorkoutSession = {
      routineId: routine.id,
      routineTitle: language === 'pt' ? routine.titlePt : routine.title,
      startTime: Date.now(),
      currentExerciseIndex: 0,
      exercises: routine.exercises.map(item => {
        const baseEx = EXERCISE_DATABASE[item.exerciseId] || {
          id: item.exerciseId,
          name: 'Exercise',
          namePt: 'Exercício',
          primaryMuscle: 'chest',
          category: 'barbell',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeight: 50,
          restSeconds: 75,
        };
        return {
          exercise: baseEx,
          sets: JSON.parse(JSON.stringify(item.sets)).map((set: ActiveWorkoutSession['exercises'][number]['sets'][number]) => ({
            ...set,
            previousBest: getRealExercisePreviousBest(completedSessions, item.exerciseId),
          })),
          targetRestSeconds: item.targetRestSeconds || 75,
          notes: item.customNotes,
        };
      }),
      totalVolumeMovedKg: 0,
      setsCompletedCount: 0,
      isFinished: false,
    };

    setActiveSession(newSession);
    setCurrentTab('workout');
  };

  const handleQuickStart = () => {
    if (activeSession) {
      setCurrentTab('workout');
      return;
    }

    const recommendedRoutine = profile
      ? rankCompatibleRoutines(PRESET_ROUTINES, EXERCISE_DATABASE, profile)[0]
      : undefined;
    if (recommendedRoutine) handleStartRoutine(recommendedRoutine);
    else setCurrentTab('routines');
  };

  const handleSaveProfile = async (nextProfile: UserProfile) => {
    const savedProfile = userProfileStore.save(nextProfile);
    setProfile(savedProfile);
    setProfileGate('ready');
    setProfileNotice('');
    setCurrentTab('routines');
  };

  if (profileGate === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0F1D] text-white flex items-center justify-center" role="status">
        <span className="text-sm font-mono-numbers text-slate-300">Carregando perfil...</span>
      </div>
    );
  }

  if (profileGate === 'storage-error') {
    return (
      <div className="min-h-screen bg-[#0A0F1D] px-4 flex items-center justify-center text-white">
        <section className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0F172A] p-6">
          <h1 className="text-xl font-bold">Não foi possível acessar seu perfil</h1>
          <p className="mt-2 text-sm text-slate-300">O armazenamento local está indisponível. Verifique as permissões do navegador e tente novamente.</p>
          <button type="button" onClick={() => applyProfileReadResult(userProfileStore.load())} className="mt-5 min-h-11 rounded-lg bg-[#CCFF00] px-4 text-sm font-bold text-[#0A0F1D]">Tentar novamente</button>
        </section>
      </div>
    );
  }

  if (profileGate === 'setup') {
    return (
      <div className="min-h-screen bg-[#0A0F1D] text-[#F8FAFC] font-body selection:bg-[#CCFF00] selection:text-[#0A0F1D]">
        {profileNotice && <p className="mx-auto mt-4 max-w-3xl px-4 text-sm text-amber-200" role="status">{profileNotice}</p>}
        <UserProfileView mode="onboarding" language={language} onSave={handleSaveProfile} />
      </div>
    );
  }

  // Trigger Rest Timer
  const handleTriggerRestTimer = (seconds: number, nextExName?: string, nextSetNum?: number) => {
    setRestTimeLeft(seconds);
    setRestTotalTime(seconds);
    setRestNextExName(nextExName);
    setRestNextSetNum(nextSetNum);
    setRestTimerRunning(true);
    setRestTimerOpen(true);
    setRestTimerMinimized(false);
  };

  // Complete & Finish Active Workout
  const handleFinishWorkout = () => {
    if (!activeSession) return;
    soundManager.playLevelUp();

    const durationSec = Math.max(60, Math.round((Date.now() - activeSession.startTime) / 1000));
    let totalVol = 0;
    let setsCount = 0;
    let repsCount = 0;

    activeSession.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        if (s.isCompleted) {
          totalVol += s.weight * s.reps;
          setsCount++;
          repsCount += s.reps;
        }
      });
    });

    const xpEarned = 350;
    const today = getLocalDateString();

    const exerciseDetails: CompletedExerciseSummary[] = activeSession.exercises
      .map(({ exercise, sets }) => ({
        exerciseId: exercise.id,
        primaryMuscle: exercise.primaryMuscle,
        secondaryMuscles: exercise.secondaryMuscles,
        sets: sets
          .filter((set) => set.isCompleted && Number.isFinite(set.weight) && set.weight >= 0 && Number.isInteger(set.reps) && set.reps > 0)
          .map(({ weight, reps }) => ({ weight, reps })),
      }))
      .filter(({ sets }) => sets.length > 0);
    const exerciseNames = Object.fromEntries(activeSession.exercises.map(({ exercise }) => [
      exercise.id,
      language === 'pt' ? exercise.namePt : exercise.name,
    ]));
    const personalRecords = calculatePersonalRecordAchievements(
      completedSessions,
      exerciseDetails,
      exerciseNames,
      today,
    );

    const summary: CompletedSessionSummary = {
      id: `sess-${Date.now()}`,
      date: today,
      routineTitle: activeSession.routineTitle,
      durationSeconds: durationSec,
      totalVolumeKg: Math.round(totalVol),
      setsCount,
      repsCount,
      xpEarned,
      prsAchieved: formatPersonalRecordAchievements(personalRecords, language, unit),
      personalRecords,
      exerciseDetails,
    };

    // Update User Stats
    const progression = addExperience(userStats, xpEarned);

    const nextSessions = [summary, ...completedSessions];
    const newStreakDays = calculateRealStreak(nextSessions, today);
    const newStreakHistory = updateStreakHistory(
      userStats.streakHistory,
      userStats.lastWorkoutDate,
      today,
    );

    const updatedStats: UserStats = {
      ...userStats,
      level: progression.level,
      currentXP: progression.currentXP,
      xpForNextLevel: progression.xpForNextLevel,
      streakDays: newStreakDays,
      lastWorkoutDate: today,
      totalWorkoutsCompleted: userStats.totalWorkoutsCompleted + 1,
      totalLifetimeVolumeKg: userStats.totalLifetimeVolumeKg + Math.round(totalVol),
      streakHistory: newStreakHistory,
    };

    setUserStats(updatedStats);
    setCompletedSessions(prev => [summary, ...prev]);
    setLastSummary(summary);
    setShowSummaryModal(true);
    setActiveSession(null);
    setRestTimerOpen(false);

    // Save to IndexedDB (Offline-first persistence)
    fitFlowDB.addHistory(summary).catch((err) => {
      console.warn('Failed to save workout to IndexedDB:', err);
    });
  };

  // Discard / Cancel Workout
  const handleCancelWorkout = () => {
    if (confirm(language === 'pt' ? 'Deseja realmente cancelar este treino?' : 'Discard current session progress?')) {
      setActiveSession(null);
      setRestTimerOpen(false);
      setCurrentTab('routines');
    }
  };

  // Claim streak freeze protection
  const handleClaimFreeze = () => {
    setUserStats(prev => ({
      ...prev,
      streakFrozenToday: true,
    }));
  };

  // Claim Daily Volume Goal Reward (+XP)
  const handleClaimGoalReward = (bonusXP: number) => {
    setUserStats(prev => {
      const progression = addExperience(prev, bonusXP);
      return {
        ...prev,
        level: progression.level,
        currentXP: progression.currentXP,
        xpForNextLevel: progression.xpForNextLevel,
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-[#F8FAFC] flex flex-col font-body selection:bg-[#CCFF00] selection:text-[#0A0F1D]">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        isWorkoutActive={!!activeSession}
        onQuickStart={handleQuickStart}
        language={language}
        onToggleLanguage={() => setLanguage(l => l === 'pt' ? 'en' : 'pt')}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(s => !s)}
        streakDays={userStats.streakDays}
        profile={profile!}
      />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 w-full pt-4">
        {currentTab === 'workout' && (
          activeSession ? (
            <ActiveWorkoutView
              session={activeSession}
              onUpdateSession={setActiveSession}
              onTriggerRestTimer={handleTriggerRestTimer}
              onFinishWorkout={handleFinishWorkout}
              onCancelWorkout={handleCancelWorkout}
              unit={unit}
              onToggleUnit={() => setUnit(u => u === 'kg' ? 'lbs' : 'kg')}
              language={language}
            />
          ) : (
            /* Empty State: No Workout Running */
            <div className="max-w-md mx-auto px-4 py-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#1E293B] border-2 border-slate-700 flex items-center justify-center text-[#CCFF00] mb-5 shadow-glow-volt">
                <Dumbbell className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold font-display text-white mb-2">
                {language === 'pt' ? 'Nenhuma Sessão Ativa' : 'No Active Session'}
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {language === 'pt'
                  ? 'Escolha uma rotina pré-configurada no catálogo ou gere um protocolo personalizado para começar a registrar suas séries.'
                  : 'Select an athletic program from your roster or synthesize a custom session to begin logging sets.'}
              </p>
              <button
                type="button"
                onClick={handleQuickStart}
                className="w-full min-h-[52px] rounded-full bg-[#CCFF00] hover:brightness-110 active:scale-95 text-[#0A0F1D] font-bold text-sm uppercase tracking-wider shadow-glow-volt flex items-center justify-center gap-2 mb-3 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{language === 'pt' ? 'Iniciar Treino Recomendado' : 'Start Recommended Workout'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('routines')}
                className="text-xs font-mono-numbers text-slate-400 hover:text-white uppercase tracking-wider"
              >
                {language === 'pt' ? 'Ver Todas as Rotinas →' : 'Browse All Routines →'}
              </button>
            </div>
          )
        )}

        {currentTab === 'routines' && (
          <RoutinesHub
            onStartRoutine={handleStartRoutine}
            language={language}
            unit={unit}
            profile={profile!}
            onOpenProfile={() => setCurrentTab('profile')}
          />
        )}

        {currentTab === 'coach' && (
          <AiCoachView
            onStartRoutine={handleStartRoutine}
            language={language}
            unit={unit}
            completedSessions={completedSessions}
            profile={profile!}
          />
        )}

        {currentTab === 'gamification' && (
          <GamificationView
            stats={userStats}
            badges={badges}
            onClaimFreeze={handleClaimFreeze}
            language={language}
            unit={unit}
            completedSessions={completedSessions}
            activeSession={activeSession}
            onClaimGoalReward={handleClaimGoalReward}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            completedSessions={completedSessions}
            language={language}
            unit={unit}
          />
        )}

        {currentTab === 'profile' && profile && (
          <UserProfileView
            key="profile-edit"
            mode="edit"
            profile={profile}
            language={language}
            onSave={handleSaveProfile}
            onCancel={() => setCurrentTab('routines')}
          />
        )}
      </main>

      {/* Rest Timer Modal / Minimized Floating Bar */}
      <RestTimerModal
        isOpen={restTimerOpen}
        timeLeft={restTimeLeft}
        totalTime={restTotalTime}
        isRunning={restTimerRunning}
        onClose={() => setRestTimerOpen(false)}
        onTogglePlay={() => setRestTimerRunning(r => !r)}
        onAddSeconds={(sec) => setRestTimeLeft(t => Math.max(0, t + sec))}
        onSkip={() => {
          soundManager.playTick();
          setRestTimerOpen(false);
          setRestTimerRunning(false);
        }}
        nextExerciseName={restNextExName}
        nextSetNumber={restNextSetNum}
        isMinimized={restTimerMinimized}
        onToggleMinimize={() => setRestTimerMinimized(m => !m)}
        language={language}
      />

      {/* Workout Completion Summary Modal */}
      <WorkoutSummaryModal
        isOpen={showSummaryModal}
        summary={lastSummary}
        onClose={() => {
          setShowSummaryModal(false);
          setCurrentTab('analytics');
        }}
        language={language}
        unit={unit}
      />

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator language={language} />
    </div>
  );
}
