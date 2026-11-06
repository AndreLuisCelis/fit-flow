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
