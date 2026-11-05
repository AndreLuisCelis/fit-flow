import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Dumbbell, 
  Zap, 
  ShieldCheck, 
  Download,
  Flame,
  Award,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { CompletedSessionSummary, MuscleGroup } from '../types/workout';
import { MuscleDiagram } from './MuscleDiagram';
import { PersonalRecordsGallery } from './PersonalRecordsGallery';
import { soundManager } from '../utils/audio';
import { getMuscleLabel } from '../utils/localization';

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
  note?: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  completedSessions,
  language,
  unit,
}) => {
  const [selectedMuscleFocus, setSelectedMuscleFocus] = useState<MuscleGroup>('chest');
  const [selectedExercise, setSelectedExercise] = useState<string>('bench_press');

  const formatWeight = (kg: number) => {
    if (unit === 'lbs') return Math.round(kg * 2.20462);
    return Math.round(kg * 10) / 10;
  };

  // Supported exercises for progressive overload tracking
  const trackableExercises = [
    { id: 'bench_press', namePt: 'Supino Reto com Barra', nameEn: 'Barbell Bench Press', muscle: 'Peitoral' },
    { id: 'barbell_squat', namePt: 'Agachamento Livre com Barra', nameEn: 'Barbell Back Squat', muscle: 'Quadríceps' },
    { id: 'barbell_deadlift', namePt: 'Levantamento Terra Convencional', nameEn: 'Conventional Deadlift', muscle: 'Dorsais' },
    { id: 'overhead_press', namePt: 'Desenvolvimento Militar (OHP)', nameEn: 'Standing Barbell OHP', muscle: 'Ombros' },
    { id: 'barbell_row', namePt: 'Remada Curvada com Barra', nameEn: 'Bent-Over Barbell Row', muscle: 'Costas' },
  ];

  // Base historical timeline for each exercise (6-week progressive overload data)
  const baseOverloadHistory: Record<string, { date: string; displayDatePt: string; displayDateEn: string; weightKg: number; reps: number }[]> = {
    bench_press: [
      { date: '2026-09-18', displayDatePt: '18 Set', displayDateEn: 'Sep 18', weightKg: 75, reps: 8 },
      { date: '2026-09-25', displayDatePt: '25 Set', displayDateEn: 'Sep 25', weightKg: 77.5, reps: 8 },
      { date: '2026-10-02', displayDatePt: '02 Out', displayDateEn: 'Oct 02', weightKg: 80, reps: 8 },
      { date: '2026-10-09', displayDatePt: '09 Out', displayDateEn: 'Oct 09', weightKg: 82.5, reps: 7 },
      { date: '2026-10-16', displayDatePt: '16 Out', displayDateEn: 'Oct 16', weightKg: 85, reps: 8 },
      { date: '2026-10-23', displayDatePt: '23 Out', displayDateEn: 'Oct 23', weightKg: 87.5, reps: 6 },
      { date: '2026-10-30', displayDatePt: '30 Out', displayDateEn: 'Oct 30', weightKg: 90, reps: 8 },
    ],
    barbell_squat: [
      { date: '2026-09-18', displayDatePt: '18 Set', displayDateEn: 'Sep 18', weightKg: 95, reps: 6 },
      { date: '2026-09-25', displayDatePt: '25 Set', displayDateEn: 'Sep 25', weightKg: 100, reps: 6 },
      { date: '2026-10-02', displayDatePt: '02 Out', displayDateEn: 'Oct 02', weightKg: 105, reps: 6 },
      { date: '2026-10-09', displayDatePt: '09 Out', displayDateEn: 'Oct 09', weightKg: 110, reps: 5 },
      { date: '2026-10-16', displayDatePt: '16 Out', displayDateEn: 'Oct 16', weightKg: 115, reps: 6 },
      { date: '2026-10-23', displayDatePt: '23 Out', displayDateEn: 'Oct 23', weightKg: 117.5, reps: 6 },
      { date: '2026-10-28', displayDatePt: '28 Out', displayDateEn: 'Oct 28', weightKg: 120, reps: 6 },
    ],
    barbell_deadlift: [
      { date: '2026-09-18', displayDatePt: '18 Set', displayDateEn: 'Sep 18', weightKg: 125, reps: 5 },
      { date: '2026-09-25', displayDatePt: '25 Set', displayDateEn: 'Sep 25', weightKg: 130, reps: 5 },
      { date: '2026-10-02', displayDatePt: '02 Out', displayDateEn: 'Oct 02', weightKg: 135, reps: 5 },
      { date: '2026-10-09', displayDatePt: '09 Out', displayDateEn: 'Oct 09', weightKg: 140, reps: 5 },
      { date: '2026-10-16', displayDatePt: '16 Out', displayDateEn: 'Oct 16', weightKg: 145, reps: 5 },
      { date: '2026-10-26', displayDatePt: '26 Out', displayDateEn: 'Oct 26', weightKg: 150, reps: 5 },
    ],
    overhead_press: [
      { date: '2026-09-18', displayDatePt: '18 Set', displayDateEn: 'Sep 18', weightKg: 45, reps: 8 },
      { date: '2026-09-25', displayDatePt: '25 Set', displayDateEn: 'Sep 25', weightKg: 47.5, reps: 8 },
      { date: '2026-10-02', displayDatePt: '02 Out', displayDateEn: 'Oct 02', weightKg: 47.5, reps: 8 },
      { date: '2026-10-16', displayDatePt: '16 Out', displayDateEn: 'Oct 16', weightKg: 50, reps: 6 },
      { date: '2026-10-23', displayDatePt: '23 Out', displayDateEn: 'Oct 23', weightKg: 52.5, reps: 8 },
    ],
    barbell_row: [
      { date: '2026-09-18', displayDatePt: '18 Set', displayDateEn: 'Sep 18', weightKg: 65, reps: 10 },
      { date: '2026-09-25', displayDatePt: '25 Set', displayDateEn: 'Sep 25', weightKg: 70, reps: 8 },
      { date: '2026-10-09', displayDatePt: '09 Out', displayDateEn: 'Oct 09', weightKg: 72.5, reps: 8 },
      { date: '2026-10-23', displayDatePt: '23 Out', displayDateEn: 'Oct 23', weightKg: 77.5, reps: 8 },
      { date: '2026-10-30', displayDatePt: '30 Out', displayDateEn: 'Oct 30', weightKg: 80, reps: 8 },
    ],
  };

  // Build chart dataset with unit conversion and 1RM calculation
  const progressionData: ProgressionPoint[] = useMemo(() => {
    const rawList = baseOverloadHistory[selectedExercise] || baseOverloadHistory['bench_press'];
    return rawList.map((pt) => {
      const displayWeight = formatWeight(pt.weightKg);
      // Epley Formula: 1RM = Weight * (1 + Reps / 30)
      const e1RM = Math.round(displayWeight * (1 + pt.reps / 30));
      return {
        date: pt.date,
        displayDate: language === 'pt' ? pt.displayDatePt : pt.displayDateEn,
        weightKg: pt.weightKg,
        reps: pt.reps,
        displayWeight,
        estimated1RM: e1RM,
      };
    });
  }, [selectedExercise, unit, language]);

  // Derived metrics
  const firstPoint = progressionData[0];
  const lastPoint = progressionData[progressionData.length - 1];
  const maxPoint = progressionData.reduce((prev, curr) => (curr.displayWeight > prev.displayWeight ? curr : prev), progressionData[0]);

  const totalGain = lastPoint && firstPoint ? Math.round((lastPoint.displayWeight - firstPoint.displayWeight) * 10) / 10 : 0;
  const percentageGain = firstPoint && firstPoint.displayWeight > 0 ? Math.round((totalGain / firstPoint.displayWeight) * 100) : 0;

  // Custom Dark Tooltip
  const CustomOverloadTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: ProgressionPoint = payload[0].payload;
      return (
        <div className="bg-[#0F172A] border border-[#CCFF00]/50 rounded-2xl p-3 shadow-2xl font-mono-numbers text-xs">
          <div className="flex items-center justify-between gap-3 mb-1 border-b border-slate-800 pb-1">
            <span className="text-slate-400 font-semibold">{data.displayDate}</span>
            <span className="text-[10px] text-slate-500">{data.date}</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-slate-400">{language === 'pt' ? 'Carga Máxima:' : 'Peak Load:'}</span>
            <span className="text-lg font-bold text-[#CCFF00]">
              {data.displayWeight} {unit}
            </span>
            <span className="text-slate-400 text-[11px]">× {data.reps} {language === 'pt' ? 'repetições' : 'reps'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">{language === 'pt' ? '1RM Teórico:' : 'Est. 1RM:'}</span>
            <span className="font-bold text-[#38BDF8]">
              {data.estimated1RM} {unit}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Mock weekly volume data (last 7 days)
  const weeklyData = [
    { day: language === 'pt' ? 'Seg' : 'Mon', date: language === 'pt' ? '25 Out' : 'Oct 25', volumeKg: 9400, label: language === 'pt' ? 'Empurrar' : 'Push' },
    { day: language === 'pt' ? 'Ter' : 'Tue', date: language === 'pt' ? '26 Out' : 'Oct 26', volumeKg: 11200, label: language === 'pt' ? 'Puxar' : 'Pull' },
    { day: language === 'pt' ? 'Qua' : 'Wed', date: language === 'pt' ? '27 Out' : 'Oct 27', volumeKg: 0, label: language === 'pt' ? 'Descanso' : 'Rest' },
    { day: language === 'pt' ? 'Qui' : 'Thu', date: language === 'pt' ? '28 Out' : 'Oct 28', volumeKg: 13500, label: language === 'pt' ? 'Pernas' : 'Legs' },
    { day: language === 'pt' ? 'Sex' : 'Fri', date: language === 'pt' ? '29 Out' : 'Oct 29', volumeKg: 8700, label: language === 'pt' ? 'Superior' : 'Upper' },
    { day: language === 'pt' ? 'Sáb' : 'Sat', date: language === 'pt' ? '30 Out' : 'Oct 30', volumeKg: 10400, label: language === 'pt' ? 'Empurrar B' : 'Push B' },
    { day: language === 'pt' ? 'Dom' : 'Sun', date: language === 'pt' ? '31 Out' : 'Oct 31', volumeKg: 7800, label: language === 'pt' ? 'Abdômen' : 'Core' },
  ];

  const maxWeeklyVol = Math.max(...weeklyData.map(d => d.volumeKg), 14000);

  // Recovery breakdown by muscle group
  const muscleRecoveryStatus: Record<MuscleGroup, { percent: number; hours: number; status: string }> = {
    chest: { percent: 96, hours: 48, status: 'Optimal Readiness' },
    back: { percent: 92, hours: 36, status: 'Optimal Readiness' },
    shoulders: { percent: 88, hours: 30, status: 'Recovered' },
    biceps: { percent: 94, hours: 42, status: 'Optimal Readiness' },
    triceps: { percent: 98, hours: 54, status: 'Optimal Readiness' },
    quads: { percent: 74, hours: 22, status: 'Rebuilding (Active Rest)' },
    hamstrings: { percent: 70, hours: 20, status: 'Rebuilding (Active Rest)' },
    calves: { percent: 95, hours: 48, status: 'Optimal Readiness' },
    core: { percent: 90, hours: 28, status: 'Recovered' },
    glutes: { percent: 78, hours: 24, status: 'Rebuilding' },
  };

  const handleExportCSV = () => {
    soundManager.playTick();
    const headers = 'Date,Routine,Duration_Minutes,Total_Volume_Kg,Sets_Count,XP_Earned\n';
    const rows = completedSessions.map(s => 
      `"${s.date}","${s.routineTitle}",${Math.round(s.durationSeconds / 60)},${s.totalVolumeKg},${s.setsCount},${s.xpEarned}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinetic_volt_workout_log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 pt-2 px-3 sm:px-6 space-y-6">
      
      {/* Top Telemetry Summary Header */}
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

      {/* Interactive Progressive Overload Line Chart (Recharts) */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#CCFF00]" />
              <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#CCFF00] font-bold">
                {language === 'pt' ? 'SOBRECARGA PROGRESSIVA (RECHARTS)' : 'PROGRESSIVE OVERLOAD TELEMETRY'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              {language === 'pt' ? 'Histórico de Carga Máxima por Exercício' : 'Peak Load Overload History'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'pt'
                ? 'Monitore a progressão das maiores cargas levantadas e a curva de força máxima estimada (1RM).'
                : 'Track the trajectory of peak weight lifted and theoretical maximal 1RM progression across sessions.'}
            </p>
          </div>

          {/* Exercise Selector Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-[#1E293B] border border-slate-700/80 rounded-2xl overflow-x-auto w-full md:w-auto">
            {trackableExercises.map((ex) => {
              const isSelected = selectedExercise === ex.id;
              const name = language === 'pt' ? ex.namePt : ex.nameEn;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    soundManager.playTick();
                    setSelectedExercise(ex.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono-numbers font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {name.split(' ')[0]} {name.split(' ')[1] || ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Highlight Overload Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-1">
              {language === 'pt' ? 'Carga Máxima Atual' : 'Current Peak Load'}
            </span>
            <div className="text-2xl font-extrabold font-mono-numbers text-[#CCFF00]">
              {lastPoint?.displayWeight} <span className="text-xs text-slate-400">{unit}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-numbers mt-0.5 block">
              {lastPoint?.displayDate} ({lastPoint?.reps} reps)
            </span>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-1">
              {language === 'pt' ? 'Carga Inicial (Baseline)' : 'Baseline Load'}
            </span>
            <div className="text-2xl font-extrabold font-mono-numbers text-white">
              {firstPoint?.displayWeight} <span className="text-xs text-slate-400">{unit}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-numbers mt-0.5 block">
              {firstPoint?.displayDate} ({firstPoint?.reps} reps)
            </span>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-1">
              {language === 'pt' ? 'Ganho de Sobrecarga' : 'Overload Delta'}
            </span>
            <div className="text-2xl font-extrabold font-mono-numbers text-[#CCFF00] flex items-center gap-1">
              <ArrowUpRight className="w-5 h-5 text-[#CCFF00]" />
              <span>+{totalGain} {unit}</span>
            </div>
            <span className="text-[10px] text-[#CCFF00] font-mono-numbers mt-0.5 block font-semibold">
              +{percentageGain}% {language === 'pt' ? 'de evolução' : 'gain'}
            </span>
          </div>

          <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-mono-numbers uppercase text-slate-400 block mb-1">
              {language === 'pt' ? '1RM Teórico Máximo' : 'Theoretical 1RM'}
            </span>
            <div className="text-2xl font-extrabold font-mono-numbers text-[#38BDF8]">
              {maxPoint?.estimated1RM} <span className="text-xs text-slate-400">{unit}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-numbers mt-0.5 block">
              {language === 'pt' ? 'Fórmula de Epley' : 'Epley Estimate'}
            </span>
          </div>
        </div>

        {/* Recharts Interactive LineChart Container */}
        <div className="w-full h-72 sm:h-80 pt-2 pb-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={progressionData}
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            >
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#64748B" 
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis 
                stroke="#64748B" 
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                domain={['dataMin - 5', 'dataMax + 5']}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                unit={` ${unit}`}
              />
              <Tooltip content={<CustomOverloadTooltip />} />
              <ReferenceLine 
                y={maxPoint.displayWeight} 
                stroke="#FF6B00" 
                strokeDasharray="4 4"
                label={{ 
                  value: language === 'pt' ? 'Recorde (PR)' : 'PR', 
                  fill: '#FF6B00', 
                  fontSize: 10, 
                  position: 'insideTopRight',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="displayWeight" 
                stroke="#CCFF00" 
                strokeWidth={3} 
                dot={{ fill: '#0A0F1D', stroke: '#CCFF00', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, fill: '#CCFF00', stroke: '#0A0F1D', strokeWidth: 2 }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono-numbers pt-3 border-t border-slate-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#CCFF00] rounded-full" />
              <span>{language === 'pt' ? 'Carga Máxima Levantada' : 'Peak Weight Trajectory'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-[#FF6B00]" />
              <span>{language === 'pt' ? 'Marca Recorde (PR)' : 'PR Reference Mark'}</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {language === 'pt' ? 'Passe o cursor sobre os pontos para detalhes' : 'Hover data points for set rep telemetry'}
          </span>
        </div>
      </div>

      {/* Galeria de Recordes Pessoais (PRs) */}
      <PersonalRecordsGallery
        onSelectExercise={(exId) => {
          setSelectedExercise(exId);
        }}
        language={language}
        unit={unit}
      />

      {/* Grid: Muscular Readiness Heatmap & Weekly Volume Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Muscular Readiness Heatmap (5 cols) */}
        <div className="lg:col-span-5 bg-[#0F172A] border border-[#38BDF8]/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#38BDF8] font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                {language === 'pt' ? 'Prontidão Fisiológica' : 'Physiological Readiness'}
              </span>
              <span className="text-xl font-extrabold font-mono-numbers text-[#38BDF8]">
                94%
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {language === 'pt'
                ? 'Toque nas áreas musculares para checar tempo de recuperação e recomendação de estímulo.'
                : 'Select muscle groups to inspect stimulus latency and supercompensation state.'}
            </p>

            <MuscleDiagram
              primaryMuscle={selectedMuscleFocus}
              secondaryMuscles={['triceps', 'shoulders']}
              interactive={true}
              onSelectMuscle={(m) => {
                soundManager.playTick();
                setSelectedMuscleFocus(m);
              }}
              showLabels={false}
              language={language}
            />

            {/* Selected Muscle Deep-Dive */}
            <div className="mt-4 bg-[#1E293B] rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-mono-numbers font-bold text-white">
                  {getMuscleLabel(selectedMuscleFocus, language)}
                </span>
                <span className="text-xs font-mono-numbers font-bold text-[#38BDF8]">
                  {muscleRecoveryStatus[selectedMuscleFocus]?.percent || 90}% {language === 'pt' ? 'Recuperado' : 'Recovered'}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono-numbers">
                {language === 'pt' ? 'Último estímulo:' : 'Last stimulus:'} {muscleRecoveryStatus[selectedMuscleFocus]?.hours || 40} {language === 'pt' ? 'horas atrás · Estado:' : 'hours ago · Status:'} {language === 'pt'
                  ? muscleRecoveryStatus[selectedMuscleFocus]?.percent && muscleRecoveryStatus[selectedMuscleFocus].percent < 80 ? 'Em recuperação' : 'Pronto para treinar'
                  : muscleRecoveryStatus[selectedMuscleFocus]?.status}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Tonnage / Volume Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#CCFF00] font-bold block mb-1">
                  {language === 'pt' ? 'VOLUME SEMANAL (TONELAGEM)' : 'WEEKLY TONNAGE TELEMETRY'}
                </span>
                <h3 className="text-lg font-bold font-display text-white">
                  {language === 'pt' ? '61.000' : '61,000'} <span className="text-xs font-mono-numbers text-slate-400">{unit} {language === 'pt' ? 'no total' : 'Total'}</span>
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-mono-numbers bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/40 font-bold">
                {language === 'pt' ? '+14,2% vs. semana passada' : '+14.2% vs Last Wk'}
              </span>
            </div>

            {/* Bar Chart Visualization */}
            <div className="h-60 flex items-end justify-between gap-2 pt-6 pb-2 px-1 border-b border-slate-800">
              {weeklyData.map((col, idx) => {
                const heightPercent = col.volumeKg > 0 ? Math.max(12, Math.round((col.volumeKg / maxWeeklyVol) * 100)) : 4;
                const isPeak = col.volumeKg === Math.max(...weeklyData.map(d => d.volumeKg));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono-numbers bg-[#1E293B] text-white px-2 py-1 rounded border border-slate-700 whitespace-nowrap pointer-events-none mb-1">
                      {formatWeight(col.volumeKg)} {unit}
                    </div>

                    <div
                      className={`w-full max-w-[36px] rounded-t-xl transition-all duration-500 ${
                        col.volumeKg === 0
                          ? 'bg-slate-800/50'
                          : isPeak
                          ? 'bg-[#CCFF00] shadow-glow-volt'
                          : 'bg-gradient-to-t from-[#0F172A] to-[#38BDF8]'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <div className="text-center">
                      <span className="text-xs font-mono-numbers font-bold text-slate-300 block">
                        {col.day}
                      </span>
                      <span className="text-[9px] font-mono-numbers text-slate-500">
                        {col.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-mono-numbers">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#CCFF00]" /> {language === 'pt' ? 'Maior volume da semana' : 'Peak Hypertrophy Session'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#38BDF8]" /> {language === 'pt' ? 'Volume padrão' : 'Standard Volume'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-800" /> {language === 'pt' ? 'Descanso' : 'Active Rest'}
            </span>
          </div>
        </div>
      </div>

      {/* Completed Sessions Log Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#CCFF00]" />
            <h3 className="text-lg font-bold font-display text-white">
              {language === 'pt' ? 'Histórico de Sessões Registradas' : 'Executed Session Logs'}
            </h3>
          </div>
          <span className="text-xs font-mono-numbers text-slate-400">
            {completedSessions.length} {language === 'pt' ? 'Sessões Registradas' : 'Total Sessions Logged'}
          </span>
        </div>

        <div className="space-y-3">
          {completedSessions.map((sessionItem) => (
            <div
              key={sessionItem.id}
              className="bg-[#1E293B] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-numbers text-slate-400 mb-1">
                  <span>{sessionItem.date}</span>
                  <span>·</span>
                  <span className="text-[#38BDF8] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.round(sessionItem.durationSeconds / 60)} MIN
                  </span>
                  <span>·</span>
                  <span className="text-[#8B5CF6]">+{sessionItem.xpEarned} XP</span>
                </div>
                <h4 className="text-base font-bold text-white font-display">
                  {sessionItem.routineTitle}
                </h4>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 font-mono-numbers">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">
                    {language === 'pt' ? 'Tonelagem' : 'Tonnage'}
                  </span>
                  <span className="text-base font-bold text-[#CCFF00]">
                    {formatWeight(sessionItem.totalVolumeKg)} {unit}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">
                    {language === 'pt' ? 'Séries Concluídas' : 'Sets Done'}
                  </span>
                  <span className="text-base font-bold text-white">
                    {sessionItem.setsCount}
                  </span>
                </div>

                {sessionItem.prsAchieved.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono-numbers font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/40 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {sessionItem.prsAchieved.length} PRs
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
