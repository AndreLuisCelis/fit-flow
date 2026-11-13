import { TrainingEquipment } from './profile';

export type MuscleGroup = 
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'core'
  | 'glutes';

export type IntensityTag = 'hardcore' | 'optimal' | 'xp-multiplier' | 'warmup' | 'dropset';

export interface SetEntry {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  previousBest?: {
    weight: number;
    reps: number;
    repsByWeight?: Record<string, number>;
  };
  rpe?: number; // 6 to 10
  isCompleted: boolean;
  isWarmup?: boolean;
  isDropSet?: boolean;
}

export type ExerciseMediaType = 'webp' | 'avif' | 'image' | 'svg' | 'gif' | 'lottie' | 'mp4' | 'webm';
export type ExerciseMediaStatus = 'planned' | 'published' | 'missing' | 'invalid';

export interface ExerciseMedia {
  /** URL externa estável da imagem estática principal (WebP/AVIF preferencial; fallback obrigatório) */
  imageUrl: string;
  /** Texto alternativo acessível em inglês */
  alt: string;
  /** Texto alternativo acessível em português (opcional) */
  altPt?: string;
  /** URL externa opcional de animação leve (WebM, MP4, Lottie ou WebP animado) */
  animationUrl?: string;
  /** URL externa opcional de vídeo demonstrativo (MP4/WebM) */
  videoUrl?: string;
  /** Tipo/formato da mídia principal */
  mediaType: ExerciseMediaType;
  /** Identificador único do ativo de mídia no catálogo externo */
  assetId: string;
  /** Versão do ativo para rastreabilidade e cache */
  version: string;
  /** Estado real de publicação e verificação do ativo no CDN */
  status?: ExerciseMediaStatus;
  /** Timestamp ISO-8601 da última verificação HTTP real bem-sucedida */
  verifiedAt?: string;
  /** Origem documentada do ativo (ex.: pending-batch, imagen-batch-v1, vector-studio) */
  source?: string;
}

export interface Exercise {
  id: string;
  name: string;
  namePt: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  category: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'bands';
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number; // in kg
  restSeconds: number;
  equipmentRequired?: TrainingEquipment[];
  notes?: string;
  notesPt?: string;
  tempo?: string; // e.g. "3-1-1-0"
  guide?: any; // ExerciseGuide from presetRoutines
  media?: ExerciseMedia;
}

export interface ExerciseInRoutine {
  exerciseId: string;
  sets: SetEntry[];
  targetRestSeconds: number;
  customNotes?: string;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  titlePt: string;
  category: 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Cardio & Core';
  targetDurationMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Hardcore';
  targetMuscles: MuscleGroup[];
  exercises: ExerciseInRoutine[];
  xpReward: number;
  createdAt?: string;
}

export interface ActiveWorkoutSession {
  routineId: string;
  routineTitle: string;
  startTime: number;
  currentExerciseIndex: number;
  exercises: {
    exercise: Exercise;
    sets: SetEntry[];
    targetRestSeconds: number;
    notes?: string;
  }[];
  totalVolumeMovedKg: number;
  setsCompletedCount: number;
  isFinished: boolean;
}

export interface PersistedRestTimerState {
  isOpen: boolean;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  nextExerciseName?: string;
  nextSetNumber?: number;
  isMinimized: boolean;
  savedAt: number; // Date.now() timestamp
}

export interface PersistedActiveWorkout {
  id: string; // 'active'
  session: ActiveWorkoutSession;
  restTimer?: PersistedRestTimerState | null;
  updatedAt: number;
}

export interface CompletedSessionSummary {
  id: string;
  date: string;
  routineTitle: string;
  durationSeconds: number;
  totalVolumeKg: number;
  setsCount: number;
  repsCount: number;
  xpEarned: number;
  prsAchieved: string[];
  isDemo?: boolean;
  exerciseDetails?: CompletedExerciseSummary[];
  personalRecords?: PersonalRecordAchievement[];
}

export interface CompletedExerciseSummary {
  exerciseId: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  sets: {
    weight: number;
    reps: number;
  }[];
}

export interface PersonalRecordAchievement {
  exerciseId: string;
  exerciseName: string;
  type: 'load' | 'reps';
  weightKg: number;
  reps: number;
  date: string;
}

export interface MasteryBadge {
  id: string;
  title: string;
  titlePt: string;
  description: string;
  descriptionPt: string;
  iconName: string;
  tier: 'bronze' | 'silver' | 'gold' | 'neon';
  progress: number;
  target: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface UserStats {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  streakDays: number;
  streakFrozenToday: boolean;
  lastWorkoutDate: string;
  totalWorkoutsCompleted: number;
  totalLifetimeVolumeKg: number;
  streakHistory: boolean[]; // last 7 days
}

export interface RecoveryStatus {
  muscle: MuscleGroup;
  recoveryPercentage: number; // 0 to 100
  hoursSinceLastStimulus: number;
  status: 'recovered' | 'optimal' | 'fatigued';
}
