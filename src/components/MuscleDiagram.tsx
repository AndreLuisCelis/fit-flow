import React, { useState } from 'react';
import { MuscleGroup } from '../types/workout';
import { getMuscleLabel } from '../utils/localization';

interface MuscleDiagramProps {
  primaryMuscle?: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  interactive?: boolean;
  onSelectMuscle?: (muscle: MuscleGroup) => void;
  className?: string;
  showLabels?: boolean;
  language?: 'pt' | 'en';
}

export const MuscleDiagram: React.FC<MuscleDiagramProps> = ({
  primaryMuscle,
  secondaryMuscles = [],
  interactive = false,
  onSelectMuscle,
  className = '',
  showLabels = true,
  language = 'pt',
}) => {
  const [view, setView] = useState<'anterior' | 'posterior'>('anterior');
  const isPt = language !== 'en';

  const getMuscleColor = (muscle: MuscleGroup) => {
    if (primaryMuscle === muscle) {
      return '#CCFF00'; // Lime Volt
    }
    if (secondaryMuscles.includes(muscle)) {
      return '#38BDF8'; // Cyan AI
    }
    return '#273248'; // Muted dark slate
  };

  const getMuscleGlow = (muscle: MuscleGroup) => {
    if (primaryMuscle === muscle) {
      return 'drop-shadow(0 0 8px rgba(204, 255, 0, 0.7))';
    }
    if (secondaryMuscles.includes(muscle)) {
      return 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))';
    }
    return 'none';
  };

  const handleMuscleClick = (m: MuscleGroup) => {
    if (interactive && onSelectMuscle) {
      onSelectMuscle(m);
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center p-3 bg-[#0F172A] rounded-2xl border border-slate-800 ${className}`}>
      {/* View Switcher Button */}
      <div className="flex items-center gap-1 mb-2 bg-[#1E293B] p-1 rounded-full border border-slate-700/60 z-10">
        <button
          type="button"
          onClick={() => setView('anterior')}
          className={`px-3 py-1 text-[11px] font-semibold tracking-wider uppercase transition-all rounded-full ${
            view === 'anterior'
              ? 'bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isPt ? 'Frente' : 'Front'}
        </button>
        <button
          type="button"
          onClick={() => setView('posterior')}
          className={`px-3 py-1 text-[11px] font-semibold tracking-wider uppercase transition-all rounded-full ${
            view === 'posterior'
              ? 'bg-[#CCFF00] text-[#0A0F1D] shadow-glow-volt'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isPt ? 'Costas' : 'Back'}
        </button>
      </div>

      {/* SVG Anatomical Diagram */}
      <div className="relative w-44 h-56 flex items-center justify-center">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-radial from-slate-800/40 via-transparent to-transparent opacity-80 pointer-events-none" />

        <svg
          viewBox="0 0 200 280"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* HEAD & NECK */}
          <ellipse cx="100" cy="22" rx="14" ry="18" fill="#1b2336" stroke="#334155" strokeWidth="1.5" />
          <path d="M94 38 L94 48 L106 48 L106 38 Z" fill="#1b2336" stroke="#334155" strokeWidth="1" />

          {view === 'anterior' ? (
            /* ANTERIOR (FRONT) VIEW */
            <g id="anterior-view">
              {/* SHOULDERS / DELTOIDS */}
              <g
                style={{ filter: getMuscleGlow('shoulders'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('shoulders')}
              >
                {/* Left Delt */}
                <path
                  d="M68 50 C60 52 54 62 58 74 C62 76 72 70 73 60 Z"
                  fill={getMuscleColor('shoulders')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Delt */}
                <path
                  d="M132 50 C140 52 146 62 142 74 C138 76 128 70 127 60 Z"
                  fill={getMuscleColor('shoulders')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* CHEST / PECS */}
              <g
                style={{ filter: getMuscleGlow('chest'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('chest')}
              >
                {/* Left Pec */}
                <path
                  d="M74 52 C84 50 98 55 98 75 C94 82 76 80 72 70 C70 62 72 56 74 52 Z"
                  fill={getMuscleColor('chest')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Pec */}
                <path
                  d="M126 52 C116 50 102 55 102 75 C106 82 124 80 128 70 C130 62 128 56 126 52 Z"
                  fill={getMuscleColor('chest')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* BICEPS / ARMS */}
              <g
                style={{ filter: getMuscleGlow('biceps'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('biceps')}
              >
                {/* Left Bicep */}
                <path
                  d="M58 74 C55 84 55 98 62 104 C66 102 69 88 68 76 Z"
                  fill={getMuscleColor('biceps')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Bicep */}
                <path
                  d="M142 74 C145 84 145 98 138 104 C134 102 131 88 132 76 Z"
                  fill={getMuscleColor('biceps')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* FOREARMS */}
              <path d="M60 106 L52 142 L58 144 L67 110 Z" fill="#1b2336" stroke="#334155" strokeWidth="1" />
              <path d="M140 106 L148 142 L142 144 L133 110 Z" fill="#1b2336" stroke="#334155" strokeWidth="1" />

              {/* ABDOMINALS / CORE */}
              <g
                style={{ filter: getMuscleGlow('core'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('core')}
              >
                <rect x="85" y="82" width="13" height="12" rx="2" fill={getMuscleColor('core')} stroke="#0A0F1D" strokeWidth="1" />
                <rect x="102" y="82" width="13" height="12" rx="2" fill={getMuscleColor('core')} stroke="#0A0F1D" strokeWidth="1" />
                <rect x="86" y="96" width="12" height="12" rx="2" fill={getMuscleColor('core')} stroke="#0A0F1D" strokeWidth="1" />
                <rect x="102" y="96" width="12" height="12" rx="2" fill={getMuscleColor('core')} stroke="#0A0F1D" strokeWidth="1" />
                <rect x="88" y="110" width="10" height="12" rx="2" fill={getMuscleColor('core')} stroke="#0A0F1D" strokeWidth="1" />
                <rect x="102" y="110" width="10" height="12" rx="2" fill={getMuscleColor('core')} stroke="#0A0F1D" strokeWidth="1" />
              </g>

              {/* PELVIS / HIPS */}
              <path d="M78 124 L100 134 L122 124 L114 140 L86 140 Z" fill="#1b2336" stroke="#334155" strokeWidth="1" />

              {/* QUADS (THIGHS) */}
              <g
                style={{ filter: getMuscleGlow('quads'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('quads')}
              >
                {/* Left Quad */}
                <path
                  d="M78 140 C74 165 72 195 86 205 C94 204 98 175 97 142 Z"
                  fill={getMuscleColor('quads')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Quad */}
                <path
                  d="M122 140 C126 165 128 195 114 205 C106 204 102 175 103 142 Z"
                  fill={getMuscleColor('quads')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* KNEES */}
              <circle cx="88" cy="210" r="5" fill="#1b2336" stroke="#334155" strokeWidth="1" />
              <circle cx="112" cy="210" r="5" fill="#1b2336" stroke="#334155" strokeWidth="1" />

              {/* CALVES / SHINS */}
              <g
                style={{ filter: getMuscleGlow('calves'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('calves')}
              >
                {/* Left Tibialis / Calf front */}
                <path
                  d="M84 216 C80 230 80 250 86 265 C92 265 94 240 92 216 Z"
                  fill={getMuscleColor('calves')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Tibialis / Calf front */}
                <path
                  d="M116 216 C120 230 120 250 114 265 C108 265 106 240 108 216 Z"
                  fill={getMuscleColor('calves')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>
            </g>
          ) : (
            /* POSTERIOR (BACK) VIEW */
            <g id="posterior-view">
              {/* TRAPS / UPPER BACK */}
              <path
                d="M85 48 C94 44 106 44 115 48 L122 58 L100 85 L78 58 Z"
                fill={getMuscleColor('back')}
                style={{ filter: getMuscleGlow('back') }}
                stroke="#0A0F1D"
                strokeWidth="1.5"
              />

              {/* LATS / MID BACK */}
              <g
                style={{ filter: getMuscleGlow('back'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('back')}
              >
                {/* Left Lat */}
                <path
                  d="M74 60 C66 74 72 105 84 118 L96 95 Z"
                  fill={getMuscleColor('back')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Lat */}
                <path
                  d="M126 60 C134 74 128 105 116 118 L104 95 Z"
                  fill={getMuscleColor('back')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* TRICEPS (BACK OF ARMS) */}
              <g
                style={{ filter: getMuscleGlow('triceps'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('triceps')}
              >
                <path
                  d="M62 70 C57 80 56 95 62 102 C67 96 68 85 68 74 Z"
                  fill={getMuscleColor('triceps')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                <path
                  d="M138 70 C143 80 144 95 138 102 C133 96 132 85 132 74 Z"
                  fill={getMuscleColor('triceps')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* GLUTES */}
              <g
                style={{ filter: getMuscleGlow('glutes'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('glutes')}
              >
                {/* Left Glute */}
                <path
                  d="M76 125 C74 144 88 155 98 152 C98 135 90 125 76 125 Z"
                  fill={getMuscleColor('glutes')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Glute */}
                <path
                  d="M124 125 C126 144 112 155 102 152 C102 135 110 125 124 125 Z"
                  fill={getMuscleColor('glutes')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* HAMSTRINGS */}
              <g
                style={{ filter: getMuscleGlow('hamstrings'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('hamstrings')}
              >
                {/* Left Hamstring */}
                <path
                  d="M78 155 C74 175 75 195 86 205 C94 205 96 175 97 155 Z"
                  fill={getMuscleColor('hamstrings')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Hamstring */}
                <path
                  d="M122 155 C126 175 125 195 114 205 C106 205 104 175 103 155 Z"
                  fill={getMuscleColor('hamstrings')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>

              {/* CALVES (GASTROCNEMIUS) */}
              <g
                style={{ filter: getMuscleGlow('calves'), cursor: interactive ? 'pointer' : 'default' }}
                onClick={() => handleMuscleClick('calves')}
              >
                {/* Left Calf */}
                <path
                  d="M84 215 C76 228 78 245 85 264 C92 264 96 238 93 215 Z"
                  fill={getMuscleColor('calves')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
                {/* Right Calf */}
                <path
                  d="M116 215 C124 228 122 245 115 264 C108 264 104 238 107 215 Z"
                  fill={getMuscleColor('calves')}
                  stroke="#0A0F1D"
                  strokeWidth="1.5"
                />
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Legend / Status pills */}
      {showLabels && (
        <div className="flex items-center gap-3 mt-2 text-[11px] font-mono-numbers">
          {primaryMuscle && (
            <div className="flex items-center gap-1.5 text-[#CCFF00]">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00] shadow-glow-volt" />
              <span className="uppercase font-semibold tracking-wider">
                {isPt ? 'Principal: ' : 'Target: '}{getMuscleLabel(primaryMuscle, language)}
              </span>
            </div>
          )}
          {secondaryMuscles.length > 0 && (
            <div className="flex items-center gap-1.5 text-[#38BDF8]">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
              <span className="uppercase font-semibold tracking-wider">
                {isPt ? 'Auxiliares: ' : 'Support: '}{secondaryMuscles.map(muscle => getMuscleLabel(muscle, language)).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
