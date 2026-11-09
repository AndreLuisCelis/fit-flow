import React, { useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Download,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CompletedSessionSummary, MuscleGroup } from '../types/workout';
import {
  buildRealExerciseProgression,
  calculateRealWeeklyVolume,
  extractRealPersonalRecordAchievements,
  filterRealSessions,
  getLastRealMuscleStimulus,
} from '../services/workoutHistory';
import { getMuscleLabel } from '../utils/localization';
import { soundManager } from '../utils/audio';
import { MuscleDiagram } from './MuscleDiagram';
import { PersonalRecordsGallery } from './PersonalRecordsGallery';

interface AnalyticsViewProps {
  completedSessions: CompletedSessionSummary[];
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
}

interface ProgressionPoint {
  date: string;
  displayDate: string;
  weightKg: number;
  reps: number;
  displayWeight: number;
  estimated1RM: number;
}

const trackableExercises = [
  { id: 'bench_press', namePt: 'Supino Reto com Barra', nameEn: 'Barbell Bench Press' },
  { id: 'barbell_squat', namePt: 'Agachamento Livre com Barra', nameEn: 'Barbell Back Squat' },
  { id: 'barbell_deadlift', namePt: 'Levantamento Terra Convencional', nameEn: 'Conventional Deadlift' },
  { id: 'overhead_press', namePt: 'Desenvolvimento Militar (OHP)', nameEn: 'Standing Barbell OHP' },
  { id: 'barbell_row', namePt: 'Remada Curvada com Barra', nameEn: 'Bent-Over Barbell Row' },
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ completedSessions, language, unit }) => {
  const [selectedMuscleFocus, setSelectedMuscleFocus] = useState<MuscleGroup>('chest');
  const [selectedExercise, setSelectedExercise] = useState('bench_press');
  const realSessions = useMemo(() => filterRealSessions(completedSessions), [completedSessions]);

  const formatWeight = (kg: number) => unit === 'lbs' ? Math.round(kg * 2.20462) : Math.round(kg * 10) / 10;

  const progressionData = useMemo<ProgressionPoint[]>(() =>
    buildRealExerciseProgression(realSessions, selectedExercise).map((point) => {
      const displayWeight = formatWeight(point.weightKg);
      return {
        ...point,
        displayWeight,
        displayDate: new Date(`${point.date}T00:00:00Z`).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
          day: '2-digit',
          month: 'short',
          timeZone: 'UTC',
        }),
        estimated1RM: Math.round(displayWeight * (1 + point.reps / 30)),
      };
    }), [realSessions, selectedExercise, language, unit]);
  const firstPoint = progressionData[0];
  const lastPoint = progressionData[progressionData.length - 1];
  const maxPoint = progressionData.length
    ? progressionData.reduce((peak, point) => point.displayWeight > peak.displayWeight ? point : peak)
    : undefined;
  const totalGain = progressionData.length > 1 && firstPoint && lastPoint
    ? Math.round((lastPoint.displayWeight - firstPoint.displayWeight) * 10) / 10
    : null;
  const percentageGain = firstPoint && totalGain !== null && firstPoint.displayWeight > 0
    ? Math.round((totalGain / firstPoint.displayWeight) * 100)
    : null;

  const weeklyData = useMemo(() => calculateRealWeeklyVolume(realSessions), [realSessions]);
  const weeklyTotalKg = weeklyData.reduce((sum, day) => sum + day.volumeKg, 0);
  const weeklySessionCount = weeklyData.reduce((sum, day) => sum + day.sessionCount, 0);
  const maxWeeklyVol = Math.max(...weeklyData.map((day) => day.volumeKg), 0);
  const weeklyChartData = weeklyData.map((day) => {
    const date = new Date(`${day.date}T00:00:00Z`);
    return {
      ...day,
      dayLabel: date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', timeZone: 'UTC' }),
      dateLabel: date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      }),
    };
  });
  const lastMuscleStimulus = useMemo(
    () => getLastRealMuscleStimulus(realSessions, selectedMuscleFocus),
    [realSessions, selectedMuscleFocus],
  );
  const personalRecords = useMemo(() => extractRealPersonalRecordAchievements(realSessions), [realSessions]);

  const CustomOverloadTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ProgressionPoint }[] }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <div className="bg-[#0F172A] border border-[#CCFF00]/50 rounded-2xl p-3 shadow-2xl font-mono-numbers text-xs">
        <div className="flex items-center justify-between gap-3 mb-1 border-b border-slate-800 pb-1">
          <span className="text-slate-400 font-semibold">{point.displayDate}</span>
          <span className="text-[10px] text-slate-500">{point.date}</span>
        </div>
        <div className="flex items-baseline gap-1 my-1">
          <span className="text-slate-400">{language === 'pt' ? 'Carga registrada:' : 'Recorded load:'}</span>
          <span className="text-lg font-bold text-[#CCFF00]">{point.displayWeight} {unit}</span>
          <span className="text-slate-400 text-[11px]">× {point.reps} {language === 'pt' ? 'repetições' : 'reps'}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
          <span className="text-slate-400">{language === 'pt' ? '1RM estimado:' : 'Est. 1RM:'}</span>
          <span className="font-bold text-[#38BDF8]">{point.estimated1RM} {unit}</span>
        </div>
      </div>
    );
  };

  const handleExportCSV = () => {
    soundManager.playTick();
    const headers = 'Date,Routine,Duration_Minutes,Total_Volume_Kg,Sets_Count,XP_Earned\n';
    const rows = realSessions.map((session) =>
      `"${session.date}","${session.routineTitle}",${Math.round(session.durationSeconds / 60)},${session.totalVolumeKg},${session.setsCount},${session.xpEarned}`,
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kinetic_volt_workout_log_${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 pt-2 px-3 sm:px-6 space-y-6">
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#38BDF8] font-bold">
                {language === 'pt' ? 'BIOMETRIA & PERFORMANCE' : 'BIOMETRIC TELEMETRY'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              {language === 'pt' ? 'Painel de Recuperação & Tonalidade' : 'Recovery & Volume Analytics'}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1E293B] hover:bg-slate-700 text-xs font-mono-numbers text-slate-200 border border-slate-700 transition-colors w-fit"
          >
            <Download className="w-4 h-4 text-[#CCFF00]" />
            <span>{language === 'pt' ? 'Exportar CSV' : 'Export Log CSV'}</span>
          </button>
        </div>
      </div>

      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#CCFF00]" />
              <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#CCFF00] font-bold">
                {language === 'pt' ? 'SOBRECARGA PROGRESSIVA' : 'PROGRESSIVE OVERLOAD'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              {language === 'pt' ? 'Histórico de Cargas Registradas' : 'Recorded Load History'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'pt'
                ? 'Exibe somente séries registradas em sessões reais; 1RM é uma estimativa calculada a partir delas.'
                : 'Shows only sets recorded in real sessions; 1RM is an estimate calculated from those sets.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-[#1E293B] border border-slate-700/80 rounded-2xl overflow-x-auto w-full md:w-auto">
            {trackableExercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => {
                  soundManager.playTick();
                  setSelectedExercise(exercise.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono-numbers font-semibold transition-all whitespace-nowrap ${
                  selectedExercise === exercise.id ? 'bg-[#CCFF00] text-[#0A0F1D] font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {(language === 'pt' ? exercise.namePt : exercise.nameEn).split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Metric label={language === 'pt' ? 'Carga Máxima Atual' : 'Current Peak Load'}>
            {lastPoint ? `${lastPoint.displayWeight} ${unit}` : '—'}
            <MetricDetail>{lastPoint ? `${lastPoint.displayDate} (${lastPoint.reps} reps)` : unavailableText(language)}</MetricDetail>
          </Metric>
          <Metric label={language === 'pt' ? 'Carga Inicial' : 'Baseline Load'}>
            {firstPoint ? `${firstPoint.displayWeight} ${unit}` : '—'}
            <MetricDetail>{firstPoint?.displayDate || unavailableText(language)}</MetricDetail>
          </Metric>
          <Metric label={language === 'pt' ? 'Variação Registrada' : 'Recorded Change'} accent>
            {totalGain === null ? '—' : `${totalGain > 0 ? '+' : ''}${totalGain} ${unit}`}
            <MetricDetail>
              {percentageGain === null
                ? language === 'pt' ? 'São necessárias duas sessões' : 'Two sessions are required'
                : `${percentageGain > 0 ? '+' : ''}${percentageGain}%`}
            </MetricDetail>
          </Metric>
          <Metric label={language === 'pt' ? '1RM estimado' : 'Estimated 1RM'} blue>
            {maxPoint ? `${maxPoint.estimated1RM} ${unit}` : '—'}
            <MetricDetail>{language === 'pt' ? 'Fórmula de Epley' : 'Epley formula'}</MetricDetail>
          </Metric>
        </div>

        {progressionData.length === 0 ? (
          <EmptyState>
            {language === 'pt'
              ? 'Sem séries reais com carga e repetições registradas para este exercício. Inicie um treino, registre as séries e conclua/salve a sessão para gerar métricas.'
              : 'No real sets with recorded load and reps for this exercise. Start a workout, record sets and complete/save the session to generate metrics.'}
          </EmptyState>
        ) : (
          <div className="w-full h-72 sm:h-80 pt-2 pb-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  unit={` ${unit}`}
                />
                <Tooltip content={<CustomOverloadTooltip />} />
                {maxPoint && (
                  <ReferenceLine
                    y={maxPoint.displayWeight}
                    stroke="#FF6B00"
                    strokeDasharray="4 4"
                    label={{ value: language === 'pt' ? 'Maior carga registrada' : 'Recorded peak', fill: '#FF6B00', fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="displayWeight"
                  stroke="#CCFF00"
                  strokeWidth={3}
                  dot={{ fill: '#0A0F1D', stroke: '#CCFF00', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, fill: '#CCFF00', stroke: '#0A0F1D', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <PersonalRecordsGallery
        records={personalRecords}
        onSelectExercise={setSelectedExercise}
        language={language}
        unit={unit}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 bg-[#0F172A] border border-[#38BDF8]/40 rounded-3xl p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#38BDF8] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {language === 'pt' ? 'Histórico de Estímulo Muscular' : 'Muscle Stimulus History'}
            </span>
            <span className="text-sm font-bold font-mono-numbers text-slate-400">
              {language === 'pt' ? 'Indisponível' : 'Unavailable'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            {language === 'pt'
              ? 'O histórico registra grupos musculares e datas, mas não permite estimar recuperação fisiológica.'
              : 'Workout history records muscle groups and dates, but cannot estimate physiological recovery.'}
          </p>
          <MuscleDiagram
            primaryMuscle={selectedMuscleFocus}
            interactive
            onSelectMuscle={(muscle) => {
              soundManager.playTick();
              setSelectedMuscleFocus(muscle);
            }}
            showLabels={false}
            language={language}
          />
          <div className="mt-4 bg-[#1E293B] rounded-2xl p-4 border border-slate-800">
            <div className="text-xs uppercase font-mono-numbers font-bold text-white mb-2">
              {getMuscleLabel(selectedMuscleFocus, language)}
            </div>
            <p className="text-xs text-slate-400 font-mono-numbers">
              {lastMuscleStimulus
                ? language === 'pt'
                  ? `Último estímulo registrado em ${lastMuscleStimulus}. Percentual e estado de recuperação não podem ser determinados.`
                  : `Last recorded stimulus: ${lastMuscleStimulus}. Recovery percentage and status cannot be determined.`
                : language === 'pt'
                  ? 'Não há dados reais suficientes para identificar um estímulo deste grupo muscular.'
                  : 'There is not enough real data to identify a stimulus for this muscle group.'}
            </p>
          </div>
        </section>

        <section className="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#CCFF00] font-bold block mb-1">
                {language === 'pt' ? 'VOLUME DOS ÚLTIMOS 7 DIAS' : 'LAST 7 DAYS VOLUME'}
              </span>
              <h3 className="text-lg font-bold font-display text-white">
                {formatWeight(weeklyTotalKg)} <span className="text-xs font-mono-numbers text-slate-400">{unit} {language === 'pt' ? 'no total' : 'total'}</span>
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-mono-numbers bg-[#1E293B] text-slate-300 border border-slate-700 font-bold">
              {weeklySessionCount} {language === 'pt' ? 'treinos' : 'sessions'}
            </span>
          </div>

          {weeklySessionCount === 0 ? (
            <EmptyState>
              {language === 'pt'
                ? 'Nenhum treino real registrado nos últimos 7 dias.'
                : 'No real workouts recorded in the last 7 days.'}
            </EmptyState>
          ) : (
            <div className="h-60 flex items-end justify-between gap-2 pt-6 pb-2 px-1 border-b border-slate-800">
              {weeklyChartData.map((day) => {
                const height = maxWeeklyVol > 0 ? (day.volumeKg / maxWeeklyVol) * 100 : 0;
                return (
                  <div
                    key={day.date}
                    title={`${day.sessionCount} ${language === 'pt' ? 'treinos' : 'sessions'} · ${formatWeight(day.volumeKg)} ${unit}`}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                  >
                    <div className="text-[10px] font-mono-numbers text-slate-400 opacity-0 group-hover:opacity-100">
                      {formatWeight(day.volumeKg)} {unit}
                    </div>
                    <div
                      className={`w-full max-w-[36px] rounded-t-xl transition-all ${day.volumeKg > 0 ? 'bg-gradient-to-t from-[#0F172A] to-[#38BDF8]' : 'bg-slate-800/50'}`}
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-center">
                      <span className="text-xs font-mono-numbers font-bold text-slate-300 block">{day.dayLabel}</span>
                      <span className="text-[9px] font-mono-numbers text-slate-500">{day.dateLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#CCFF00]" />
            <h3 className="text-lg font-bold font-display text-white">
              {language === 'pt' ? 'Histórico de Sessões Registradas' : 'Executed Session Logs'}
            </h3>
          </div>
          <span className="text-xs font-mono-numbers text-slate-400">
            {realSessions.length} {language === 'pt' ? 'sessões' : 'sessions'}
          </span>
        </div>
        <div className="space-y-3">
          {realSessions.map((session) => (
            <div key={session.id} className="bg-[#1E293B] border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-numbers text-slate-400 mb-1">
                  <span>{session.date}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(session.durationSeconds / 60)} MIN</span>
                  <span>·</span>
                  <span className="text-[#8B5CF6]">+{session.xpEarned} XP</span>
                </div>
                <h4 className="text-base font-bold text-white font-display">{session.routineTitle}</h4>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 font-mono-numbers">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">{language === 'pt' ? 'Tonelagem' : 'Tonnage'}</span>
                  <span className="text-base font-bold text-[#CCFF00]">{formatWeight(session.totalVolumeKg)} {unit}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">{language === 'pt' ? 'Séries concluídas' : 'Sets done'}</span>
                  <span className="text-base font-bold text-white">{session.setsCount}</span>
                </div>
              </div>
            </div>
          ))}
          {realSessions.length === 0 && (
            <EmptyState>
              {language === 'pt'
                ? 'Nenhuma sessão real registrada. Inicie um treino, registre as séries e conclua/salve a sessão para gerar métricas.'
                : 'No real sessions have been recorded. Start a workout, record sets and complete/save the session to generate metrics.'}
            </EmptyState>
          )}
        </div>
      </section>
    </div>
  );
};

function unavailableText(language: 'pt' | 'en') {
  return language === 'pt' ? 'Sem dados registrados' : 'No recorded data';
}

const Metric: React.FC<{
  label: string;
  accent?: boolean;
  blue?: boolean;
  children: React.ReactNode;
}> = ({ label, accent, blue, children }) => (
  <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-slate-800">
    <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-1">{label}</span>
    <div className={`text-xl sm:text-2xl font-extrabold font-mono-numbers ${accent ? 'text-[#CCFF00]' : blue ? 'text-[#38BDF8]' : 'text-white'}`}>
      {children}
    </div>
  </div>
);

const MetricDetail: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[10px] text-slate-500 font-mono-numbers mt-1 block font-normal">{children}</span>
);

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#1E293B] p-5 text-sm text-slate-400">
    {children}
  </div>
);
