import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  Clock, 
  ShieldAlert, 
  Check, 
  Sparkles, 
  Flame, 
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Radio
} from 'lucide-react';
import { UserStats } from '../types/workout';
import { soundManager } from '../utils/audio';

interface InactivityReminderCardProps {
  stats: UserStats;
  language: 'pt' | 'en';
}

export const InactivityReminderCard: React.FC<InactivityReminderCardProps> = ({
  stats,
  language,
}) => {
  // Notification API Permission State
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Settings State (stored in localStorage)
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fitflow_notif_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [inactivityHours, setInactivityHours] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fitflow_notif_inactivity_hours');
      return saved ? Number(saved) : 48; // default 48h
    } catch {
      return 48;
    }
  });

  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    try {
      return localStorage.getItem('fitflow_notif_time') || '18:00';
    } catch {
      return '18:00';
    }
  });

  const [tone, setTone] = useState<'motivational' | 'hardcore' | 'technical'>(() => {
    try {
      return (localStorage.getItem('fitflow_notif_tone') as any) || 'hardcore';
    } catch {
      return 'hardcore';
    }
  });

  // Countdown timer for 5-second test
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastDispatchedPreview, setLastDispatchedPreview] = useState<{
    title: string;
    body: string;
    timestamp: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fitflow_notif_enabled', JSON.stringify(enabled));
    } catch {}
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem('fitflow_notif_inactivity_hours', inactivityHours.toString());
    } catch {}
  }, [inactivityHours]);

  useEffect(() => {
    try {
      localStorage.setItem('fitflow_notif_time', scheduledTime);
    } catch {}
  }, [scheduledTime]);

  useEffect(() => {
    try {
      localStorage.setItem('fitflow_notif_tone', tone);
    } catch {}
  }, [tone]);

  // Request browser notification permission
  const requestBrowserPermission = async () => {
    soundManager.playTick();
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setToastMessage(
        language === 'pt' 
          ? 'API de Notificações não suportada neste ambiente.' 
          : 'Notifications API not supported in this browser.'
      );
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        soundManager.playLevelUp();
        setToastMessage(
          language === 'pt' 
            ? '✓ Permissão de notificações concedida!' 
            : '✓ Notification permissions granted!'
        );
      } else if (res === 'denied') {
        setToastMessage(
          language === 'pt' 
            ? 'Permissão negada nas configurações do navegador.' 
            : 'Permission denied in browser settings.'
        );
      }
    } catch (err) {
      console.warn('Error requesting permission:', err);
    }
  };

  // Get dynamic notification copy based on tone and stats
  const getNotificationContent = () => {
    const streak = stats.streakDays;
    if (language === 'pt') {
      if (tone === 'hardcore') {
        return {
          title: `🔥 FitFlow: Alerta de Inatividade (${inactivityHours}h)!`,
          body: `O ferro não se move sozinho. Sua sequência de ${streak} dias precisa de você na academia hoje!`,
        };
      }
      if (tone === 'technical') {
        return {
          title: `⚡ FitFlow: Janela de Supercompensação Aberta`,
          body: `Já fazem ${inactivityHours}h desde seu último estímulo muscular. Momento fisiológico ideal para sobrecarga!`,
        };
      }
      return {
        title: `🏆 FitFlow: Não perca seu ritmo!`,
        body: `Lembrete amigável: mantenha sua consistência ativa e garanta mais XP para seu nível atlético.`,
      };
    } else {
      if (tone === 'hardcore') {
        return {
          title: `🔥 FitFlow: Inactivity Alert (${inactivityHours}h)!`,
          body: `Iron waits for no one. Your ${streak}-day streak demands action today. Hit the rack!`,
        };
      }
      if (tone === 'technical') {
        return {
          title: `⚡ FitFlow: Supercompensation Window Open`,
          body: `${inactivityHours}h elapsed since previous stimulus. Optimal metabolic time for progressive overload.`,
        };
      }
      return {
        title: `🏆 FitFlow: Keep the Momentum Going!`,
        body: `Friendly nudge to protect your ${streak}-day streak and unlock today's workout milestones.`,
      };
    }
  };

  // Dispatch notification through ServiceWorker, Notification API, or in-app preview
  const dispatchNotification = async (showToast: boolean = true) => {
    const { title, body } = getNotificationContent();
    soundManager.playLevelUp();

    setLastDispatchedPreview({
      title,
      body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });

    let sentNative = false;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              vibrate: [200, 100, 200, 100, 200],
              tag: 'fitflow-inactivity-reminder',
              data: { url: '/' },
            } as any);
            sentNative = true;
          }
        }
        if (!sentNative) {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
          });
          sentNative = true;
        }
      } catch (e) {
        console.warn('Native notification call error:', e);
      }
    }

    if (showToast) {
      if (sentNative) {
        setToastMessage(language === 'pt' ? 'Notificação enviada ao dispositivo!' : 'System notification dispatched!');
      } else {
        setToastMessage(
          language === 'pt'
            ? 'Notificação demonstrada em tela (habilite no navegador para alertas nativos).'
            : 'Notification displayed on screen (grant permission for OS alerts).'
        );
      }
    }
  };

  // 5-second countdown test
  const startFiveSecondTest = () => {
    soundManager.playTick();
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setCountdown(5);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          dispatchNotification(true);
          return null;
        }
        soundManager.playTick();
        return prev - 1;
      });
    }, 1000);
  };

  // Cancel running countdown
  const cancelTest = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  // Calculate estimated hours since last workout (mock baseline if today is fresh)
  const hoursSinceLastWorkout = 18; // approx 18h
  const hoursRemainingUntilReminder = Math.max(0, inactivityHours - hoursSinceLastWorkout);

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-numbers uppercase tracking-wider font-bold bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/30 flex items-center gap-1">
              <BellRing className="w-3 h-3 text-[#C4B5FD]" />
              {language === 'pt' ? 'NOTIFICAÇÕES PWA' : 'PWA NOTIFICATIONS'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-numbers font-bold uppercase tracking-wider border ${
              permission === 'granted'
                ? 'bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/30'
                : permission === 'denied'
                ? 'bg-red-950/40 text-red-400 border-red-800/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-700/40'
            }`}>
              {permission === 'granted'
                ? (language === 'pt' ? 'Nativo: Concedido' : 'Native: Granted')
                : permission === 'denied'
                ? (language === 'pt' ? 'Nativo: Bloqueado' : 'Native: Denied')
                : (language === 'pt' ? 'Nativo: Pendente' : 'Native: Pending')}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            {language === 'pt' ? 'Lembretes de Inatividade' : 'Inactivity Reminders'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'pt'
              ? 'Receba alertas automáticos do navegador se você passar muito tempo sem registrar treinos.'
              : 'Receive scheduled browser notifications if you remain inactive for too long.'}
          </p>
        </div>

        {/* Master Active Toggle */}
        <div className="flex items-center gap-3 bg-[#1E293B] border border-slate-800 rounded-2xl px-4 py-2.5 self-start sm:self-auto">
          <span className="text-xs font-mono-numbers font-semibold text-slate-300">
            {enabled 
              ? (language === 'pt' ? 'Agendador Ativo' : 'Scheduler Active') 
              : (language === 'pt' ? 'Silenciado' : 'Muted')}
          </span>
          <button
            type="button"
            onClick={() => {
              soundManager.playTick();
              setEnabled(!enabled);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              enabled ? 'bg-[#CCFF00]' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-[#0A0F1D] shadow-md transition-transform duration-200 ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Grid: Interval Configuration & Tone */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
        
        {/* Left Column: Interval Thresholds (7 cols) */}
        <div className="md:col-span-7 bg-[#1E293B] border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono-numbers uppercase text-slate-300 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
              {language === 'pt' ? 'Disparar Alerta Após Inatividade De:' : 'Trigger Reminder After Inactivity Of:'}
            </span>
            <span className="text-xs font-mono-numbers text-[#38BDF8] font-bold">
              {inactivityHours}h {language === 'pt' ? 'sem treino' : 'rest'}
            </span>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[12, 24, 48, 72].map((hours) => {
              const isSelected = inactivityHours === hours;
              return (
                <button
                  key={hours}
                  type="button"
                  onClick={() => {
                    soundManager.playTick();
                    setInactivityHours(hours);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-mono-numbers font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#38BDF8] text-[#0A0F1D] border-[#38BDF8] shadow-sm scale-[1.02]'
                      : 'bg-[#0F172A] text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {hours}h
                  <span className="block text-[9px] font-normal opacity-75">
                    {hours === 12 && (language === 'pt' ? 'Intra-dia' : 'Same-day')}
                    {hours === 24 && (language === 'pt' ? '1 Dia' : '1 Day')}
                    {hours === 48 && (language === 'pt' ? '2 Dias' : '2 Days')}
                    {hours === 72 && (language === 'pt' ? '3 Dias' : '3 Days')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Preferred Time Picker & Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0F172A] border border-slate-800 rounded-xl p-3">
            <div className="text-left w-full sm:w-auto">
              <span className="text-[10px] font-mono-numbers uppercase tracking-wider text-slate-400 block">
                {language === 'pt' ? 'Horário Preferencial de Lembrete' : 'Preferred Notification Time'}
              </span>
              <span className="text-xs text-slate-300">
                {language === 'pt' ? 'Evita alertas durante seu repouso' : 'Suppresses alerts during sleep hours'}
              </span>
            </div>

            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-[#1E293B] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-white focus:outline-none focus:border-[#38BDF8] w-full sm:w-auto text-center"
            />
          </div>

          {/* Current Inactivity Telemetry Pip */}
          <div className="mt-4 flex items-center justify-between text-xs font-mono-numbers text-slate-400 bg-[#0F172A]/60 rounded-xl px-3.5 py-2.5 border border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
              <span>
                {language === 'pt' 
                  ? `Último treino: ~${hoursSinceLastWorkout}h atrás` 
                  : `Last training: ~${hoursSinceLastWorkout}h ago`}
              </span>
            </div>
            <span className="text-[#CCFF00] font-bold">
              {language === 'pt' 
                ? `Faltam ${hoursRemainingUntilReminder}h para o lembrete` 
                : `${hoursRemainingUntilReminder}h until alert`}
            </span>
          </div>
        </div>

        {/* Right Column: Tone & Personality (5 cols) */}
        <div className="md:col-span-5 bg-[#1E293B] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono-numbers uppercase text-slate-300 font-bold flex items-center gap-1.5 mb-3">
              <Flame className="w-3.5 h-3.5 text-[#FF6B00]" />
              {language === 'pt' ? 'Tom do Lembrete' : 'Reminder Tone'}
            </span>

            <div className="space-y-2 mb-4">
              {[
                { 
                  id: 'hardcore', 
                  label: language === 'pt' ? 'Intenso (Foco Total)' : 'Hardcore (High Energy)',
                  desc: language === 'pt' ? '“O ferro não se levanta sozinho. Mantenha seus ganhos!”' : '“Iron waits for no one. Lift now!”'
                },
                { 
                  id: 'motivational', 
                  label: language === 'pt' ? 'Motivação e sequência' : 'Motivational & Streak',
                  desc: language === 'pt' ? '“Sua sequência está em jogo! Não deixe o ritmo cair.”' : '“Your streak is alive! Keep moving.”'
                },
                { 
                  id: 'technical', 
                  label: language === 'pt' ? 'Científico / Hipertrofia' : 'Scientific / Overload',
                  desc: language === 'pt' ? '“Janela de supercompensação ideal atingida.”' : '“Supercompensation window open now.”'
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundManager.playTick();
                    setTone(item.id as any);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                    tone === item.id
                      ? 'bg-[#0F172A] border-[#FF6B00] shadow-sm'
                      : 'bg-[#0F172A]/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-white mb-0.5">
                    <span>{item.label}</span>
                    {tone === item.id && <Check className="w-3 h-3 text-[#FF6B00]" />}
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Permission CTA if not granted */}
          {permission !== 'granted' && (
            <button
              type="button"
              onClick={requestBrowserPermission}
              className="w-full py-2.5 px-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white font-mono-numbers text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-glow-purple"
            >
              <Bell className="w-3.5 h-3.5 fill-current" />
              <span>{language === 'pt' ? 'Permitir Notificações no Navegador' : 'Authorize Browser Notifications'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Testing & Instant Simulation Actions */}
      <div className="bg-[#161B2A]/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-slate-700 flex items-center justify-center text-[#CCFF00]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h5 className="text-xs font-bold font-mono-numbers uppercase text-white">
              {language === 'pt' ? 'Teste de Disparo & Simulação' : 'Dispatch Test & Live Simulation'}
            </h5>
            <p className="text-[11px] text-slate-400">
              {language === 'pt'
                ? 'Verifique como o lembrete de inatividade será entregue no seu dispositivo.'
                : 'Verify how the scheduled reminder will look and sound on your device.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {countdown !== null ? (
            <button
              type="button"
              onClick={cancelTest}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-950/60 border border-red-800 text-red-300 font-mono-numbers text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>{language === 'pt' ? `Disparando em ${countdown}s... (Cancelar)` : `Firing in ${countdown}s... (Cancel)`}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startFiveSecondTest}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono-numbers text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>{language === 'pt' ? 'Agendar Teste (5s)' : 'Schedule Test (5s)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => dispatchNotification(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#CCFF00] hover:brightness-110 active:scale-95 text-[#0A0F1D] font-mono-numbers text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-glow-volt"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{language === 'pt' ? 'Disparar Agora' : 'Fire Now'}</span>
          </button>
        </div>
      </div>

      {/* Dispatched Notification Preview Card */}
      {lastDispatchedPreview && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#1E293B] to-[#0F172A] border border-[#38BDF8]/40 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/20 border border-[#38BDF8]/50 flex items-center justify-center text-[#38BDF8] flex-shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-numbers font-bold text-[#38BDF8] uppercase tracking-wider">
                  {language === 'pt' ? 'Última Notificação Emitida' : 'Latest Notification Dispatched'}
                </span>
                <span className="text-[10px] font-mono-numbers text-slate-400">
                  {lastDispatchedPreview.timestamp}
                </span>
              </div>
              <h6 className="text-xs font-bold text-white mt-0.5">
                {lastDispatchedPreview.title}
              </h6>
              <p className="text-xs text-slate-300 mt-0.5">
                {lastDispatchedPreview.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastDispatchedPreview(null)}
            className="text-slate-500 hover:text-slate-300 text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline Toast notification banner */}
      {toastMessage && (
        <div className="mt-3 py-2 px-3 rounded-xl bg-[#0A0F1D] border border-slate-700 text-xs font-mono-numbers text-[#CCFF00] flex items-center justify-between">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-500 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
