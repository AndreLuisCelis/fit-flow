import React, { useState } from 'react';
import { Calendar, Dumbbell, Trophy } from 'lucide-react';
import { PersonalRecordAchievement } from '../types/workout';

interface PersonalRecordsGalleryProps {
  records: PersonalRecordAchievement[];
  onSelectExercise?: (exerciseId: string) => void;
  language: 'pt' | 'en';
  unit: 'kg' | 'lbs';
}

const exerciseDetails: Record<string, { namePt: string; nameEn: string; groupPt: string; groupEn: string; category: string }> = {
  bench_press: { namePt: 'Supino Reto com Barra', nameEn: 'Barbell Bench Press', groupPt: 'Peitoral', groupEn: 'Chest', category: 'Push' },
  barbell_squat: { namePt: 'Agachamento Livre com Barra', nameEn: 'Barbell Back Squat', groupPt: 'Quadríceps', groupEn: 'Quads', category: 'Legs' },
  barbell_deadlift: { namePt: 'Levantamento Terra Convencional', nameEn: 'Conventional Barbell Deadlift', groupPt: 'Cadeia posterior', groupEn: 'Posterior chain', category: 'Pull' },
  overhead_press: { namePt: 'Desenvolvimento Militar (OHP)', nameEn: 'Standing Barbell OHP', groupPt: 'Ombros', groupEn: 'Shoulders', category: 'Shoulders' },
  barbell_row: { namePt: 'Remada Curvada com Barra', nameEn: 'Bent-Over Barbell Row', groupPt: 'Costas', groupEn: 'Back', category: 'Pull' },
};

const categories = ['All', 'Push', 'Pull', 'Legs', 'Shoulders'];

export const PersonalRecordsGallery: React.FC<PersonalRecordsGalleryProps> = ({
  records,
  onSelectExercise,
  language,
  unit,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('All');

  const formatWeight = (kg: number) => unit === 'lbs' ? Math.round(kg * 2.20462) : Math.round(kg * 10) / 10;
  const knownRecords = records.filter((record) => exerciseDetails[record.exerciseId]);
  const filteredRecords = knownRecords.filter((record) => {
    const category = exerciseDetails[record.exerciseId].category;
    return selectedFilter === 'All' || category === selectedFilter;
  });

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-[#CCFF00]" />
            <span className="text-xs uppercase font-mono-numbers tracking-widest text-[#CCFF00] font-bold">
              {language === 'pt' ? 'RECORDES PESSOAIS CONFIRMADOS' : 'CONFIRMED PERSONAL RECORDS'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            {language === 'pt' ? 'Conquistas por exercício' : 'Achievements by exercise'}
          </h2>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-[#1E293B] border border-slate-700 text-xs text-[#CCFF00] font-bold">
          {knownRecords.length} {language === 'pt' ? 'recordes' : 'records'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-[#1E293B] border border-slate-800 rounded-2xl mb-6 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedFilter(category)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-numbers font-semibold whitespace-nowrap ${
              selectedFilter === category ? 'bg-[#CCFF00] text-[#0A0F1D] font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {category === 'All'
              ? language === 'pt' ? 'Todos' : 'All'
              : language === 'pt'
                ? ({ Push: 'Empurrar', Pull: 'Puxar', Legs: 'Pernas', Shoulders: 'Ombros' }[category])
                : category}
          </button>
        ))}
      </div>

      {filteredRecords.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-[#1E293B] p-5 text-sm text-slate-400">
          {language === 'pt'
            ? 'Nenhum recorde pessoal confirmado para os exercícios desta categoria.'
            : 'No confirmed personal records for exercises in this category yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => {
            const details = exerciseDetails[record.exerciseId];
            const name = language === 'pt' ? details.namePt : details.nameEn;
            const group = language === 'pt' ? details.groupPt : details.groupEn;
            const displayWeight = formatWeight(record.weightKg);

            return (
              <button
                key={`${record.exerciseId}-${record.type}`}
                type="button"
                onClick={() => onSelectExercise?.(record.exerciseId)}
                className="text-left bg-[#1E293B] border border-slate-800/90 hover:border-[#CCFF00]/50 rounded-2xl p-5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Dumbbell className="w-5 h-5 text-[#CCFF00]" />
                    <span className="flex items-center gap-1 text-[11px] font-mono-numbers text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {record.date}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-display text-white group-hover:text-[#CCFF00] mb-1">{name}</h3>
                  <span className="text-[11px] font-mono-numbers text-slate-400 block mb-4">{group}</span>
                </div>
                <div className="bg-[#0F172A] rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono-numbers uppercase text-slate-500 block">
                      {record.type === 'load'
                        ? language === 'pt' ? 'Recorde de carga' : 'Load record'
                        : language === 'pt' ? 'Recorde de repetições' : 'Rep record'}
                    </span>
                    <span className="text-xl font-black font-mono-numbers text-[#CCFF00]">
                      {record.type === 'load'
                        ? <>{displayWeight} <span className="text-xs font-normal text-slate-400">{unit} × {record.reps}</span></>
                        : <>{record.reps} <span className="text-xs font-normal text-slate-400">{language === 'pt' ? 'reps a' : 'reps at'} {displayWeight} {unit}</span></>}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
