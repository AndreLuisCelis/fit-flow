import { WorkoutRoutine, MasteryBadge, UserStats } from '../types/workout';
import { EXERCISE_GUIDE, ExerciseGuide } from './exerciseGuides';
import {
  EXERCISE_DATABASE,
  EXERCISE_MEDIA_CDN_BASE,
  EXERCISE_MEDIA_VERSION,
  createPlannedExerciseMedia,
} from './exerciseCatalog';

export {
  EXERCISE_GUIDE,
  EXERCISE_DATABASE,
  EXERCISE_MEDIA_CDN_BASE,
  EXERCISE_MEDIA_VERSION,
  createPlannedExerciseMedia,
};
export type { ExerciseGuide };

const createSets = (count: number, weight: number, reps: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${Date.now()}-${i + 1}`,
    setNumber: i + 1,
    weight,
    reps,
    previousBest: {
      weight: Math.round(weight * 0.95),
      reps,
    },
    rpe: i === count - 1 ? 9 : 8,
    isCompleted: false,
    isWarmup: i === 0 && count > 3,
  }));
};

export const PRESET_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'push_hypertrophy_alpha',
    title: 'Push Alpha: Hypertrophy & Delts',
    titlePt: 'Push Alfa: Hipertrofia & Deltóides',
    category: 'Push',
    targetDurationMinutes: 55,
    difficulty: 'Advanced',
    targetMuscles: ['chest', 'shoulders', 'triceps'],
    xpReward: 350,
    exercises: [
      {
        exerciseId: 'bench_press',
        targetRestSeconds: 90,
        sets: createSets(4, 85, 8),
      },
      {
        exerciseId: 'incline_db_press',
        targetRestSeconds: 75,
        sets: createSets(3, 34, 10),
      },
      {
        exerciseId: 'overhead_press',
        targetRestSeconds: 90,
        sets: createSets(3, 52.5, 8),
      },
      {
        exerciseId: 'lateral_raise',
        targetRestSeconds: 60,
        sets: createSets(4, 14, 12),
      },
      {
        exerciseId: 'tricep_pushdown',
        targetRestSeconds: 60,
        sets: createSets(3, 27.5, 12),
      },
    ],
  },
  {
    id: 'pull_posterior_titan',
    title: 'Pull Titan: Lats & Posterior Chain',
    titlePt: 'Pull Titã: Dorsais & Cadeia Posterior',
    category: 'Pull',
    targetDurationMinutes: 60,
    difficulty: 'Hardcore',
    targetMuscles: ['back', 'biceps', 'hamstrings'],
    xpReward: 420,
    exercises: [
      {
        exerciseId: 'barbell_deadlift',
        targetRestSeconds: 120,
        sets: createSets(4, 150, 5),
      },
      {
        exerciseId: 'lat_pulldown',
        targetRestSeconds: 75,
        sets: createSets(4, 70, 10),
      },
      {
        exerciseId: 'barbell_row',
        targetRestSeconds: 90,
        sets: createSets(3, 80, 8),
      },
      {
        exerciseId: 'barbell_curl',
        targetRestSeconds: 60,
        sets: createSets(3, 37.5, 10),
      },
    ],
  },
  {
    id: 'leg_hyper_drive',
    title: 'Leg Hyper-Drive: Quads & Glute Force',
    titlePt: 'Leg Hiper-Drive: Quadríceps & Glúteos',
    category: 'Legs',
    targetDurationMinutes: 50,
    difficulty: 'Advanced',
    targetMuscles: ['quads', 'hamstrings', 'calves', 'glutes'],
    xpReward: 400,
    exercises: [
      {
        exerciseId: 'barbell_squat',
        targetRestSeconds: 120,
        sets: createSets(4, 115, 6),
      },
      {
        exerciseId: 'romanian_deadlift',
        targetRestSeconds: 90,
        sets: createSets(3, 95, 10),
      },
      {
        exerciseId: 'leg_press',
        targetRestSeconds: 90,
        sets: createSets(3, 240, 10),
      },
      {
        exerciseId: 'standing_calf',
        targetRestSeconds: 60,
        sets: createSets(4, 80, 15),
      },
      {
        exerciseId: 'hanging_leg_raise',
        targetRestSeconds: 60,
        sets: createSets(3, 0, 15),
      },
    ],
  },
  {
    id: 'upper_athletic_speed',
    title: 'Upper Velocity: Power & Volume',
    titlePt: 'Superior Veloz: Potência & Volume',
    category: 'Upper',
    targetDurationMinutes: 45,
    difficulty: 'Intermediate',
    targetMuscles: ['chest', 'back', 'shoulders', 'arms' as unknown as any],
    xpReward: 320,
    exercises: [
      {
        exerciseId: 'bench_press',
        targetRestSeconds: 75,
        sets: createSets(3, 80, 10),
      },
      {
        exerciseId: 'barbell_row',
        targetRestSeconds: 75,
        sets: createSets(3, 70, 10),
      },
      {
        exerciseId: 'lateral_raise',
        targetRestSeconds: 60,
        sets: createSets(3, 12, 15),
      },
      {
        exerciseId: 'cable_fly',
        targetRestSeconds: 60,
        sets: createSets(3, 15, 12),
      },
    ],
  },
];

export const INITIAL_USER_STATS: UserStats = {
  level: 14,
  currentXP: 6450,
  xpForNextLevel: 8000,
  streakDays: 8,
  streakFrozenToday: false,
  lastWorkoutDate: new Date().toISOString().split('T')[0],
  totalWorkoutsCompleted: 42,
  totalLifetimeVolumeKg: 78450,
  streakHistory: [true, true, true, false, true, true, true],
};

export const INITIAL_BADGES: MasteryBadge[] = [
  {
    id: 'streak_flame_7',
    title: 'Infernal Streak',
    titlePt: 'Chama Infernal',
    description: 'Maintain a consistent 7-day training consistency streak.',
    descriptionPt: 'Mantenha 7 dias consecutivos de consistência de treino.',
    iconName: 'Flame',
    tier: 'neon',
    progress: 8,
    target: 7,
    isUnlocked: true,
    unlockedAt: '2026-10-24',
  },
  {
    id: 'tonnage_titan',
    title: 'Tonnage Titan',
    titlePt: 'Titã da Tonelagem',
    description: 'Accumulate 50,000 kg of volume moved across workouts.',
    descriptionPt: 'Acumule 50.000 kg de volume total movimentado.',
    iconName: 'Dumbbell',
    tier: 'gold',
    progress: 78450,
    target: 50000,
    isUnlocked: true,
    unlockedAt: '2026-10-18',
  },
  {
    id: 'iron_centurion',
    title: 'Iron Centurion',
    titlePt: 'Centurião de Ferro',
    description: 'Complete 100 logged high-intensity sessions.',
    descriptionPt: 'Complete 100 sessões de treino registradas.',
    iconName: 'Shield',
    tier: 'silver',
    progress: 42,
    target: 100,
    isUnlocked: false,
  },
  {
    id: 'pr_overload',
    title: 'Overload Breaker',
    titlePt: 'Quebrador de PRs',
    description: 'Hit 10 Personal Records under optimal RPE conditions.',
    descriptionPt: 'Bata 10 recordes pessoais sob condições ótimas de RPE.',
    iconName: 'Trophy',
    tier: 'neon',
    progress: 7,
    target: 10,
    isUnlocked: false,
  },
  {
    id: 'hyper_recovery',
    title: 'Neural Restorer',
    titlePt: 'Mestre da Recuperação',
    description: 'Achieve 90%+ muscular readiness score before heavy session.',
    descriptionPt: 'Atinja 90%+ de prontidão muscular antes do treino pesado.',
    iconName: 'Zap',
    tier: 'gold',
    progress: 94,
    target: 90,
    isUnlocked: true,
    unlockedAt: '2026-10-30',
  },
];
