import { Exercise, WorkoutRoutine } from '../types/workout';
import { ProfileGoal, TRAINING_EQUIPMENT, TrainingEquipment, UserProfile } from '../types/profile';

const equipmentForCategory: Record<Exercise['category'], TrainingEquipment> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  bodyweight: 'bodyweight',
  bands: 'bands',
};

export const equipmentLabels: Record<TrainingEquipment, string> = {
  bodyweight: 'Peso corporal',
  pull_up_bar: 'Barra fixa',
  barbell: 'Barra e anilhas',
  dumbbell: 'Halteres',
  cable: 'Cabos e polias',
  machine: 'Máquinas',
  bands: 'Elásticos de resistência',
};

const difficultyRank: Record<WorkoutRoutine['difficulty'], number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
  Hardcore: 3,
};

export const goalPrompt: Record<ProfileGoal, string> = {
  weight_loss: 'emagrecimento e condicionamento físico',
  muscle_gain: 'ganho de massa muscular e hipertrofia',
  fitness: 'condicionamento físico geral',
  health: 'manutenção da saúde e do condicionamento',
};

export function describeGoals(goals: ProfileGoal[]): string {
  return goals.map(goal => goalPrompt[goal]).join(', ');
}

export const experiencePrompt: Record<UserProfile['experience'], string> = {
  beginner: 'iniciante',
  intermediate: 'intermediário',
  advanced: 'avançado',
};

export interface GeneratedWorkoutExercise {
  name: string;
  primaryMuscle: Exercise['primaryMuscle'];
  category: Exercise['category'];
  defaultWeight: number;
  defaultReps: number;
  setsCount: number;
  targetRestSeconds: number;
  equipmentRequired?: TrainingEquipment[];
  tempo?: string;
  notes?: string;
  notesPt?: string;
}

export interface GeneratedWorkout {
  title: string;
  category: WorkoutRoutine['category'];
  targetDurationMinutes: number;
  difficulty: WorkoutRoutine['difficulty'];
  targetMuscles: WorkoutRoutine['targetMuscles'];
  xpReward: number;
  coachingNotes?: string;
  exercises: GeneratedWorkoutExercise[];
}

const muscleGroups: Exercise['primaryMuscle'][] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'calves', 'core', 'glutes',
];
const routineCategories: WorkoutRoutine['category'][] = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio & Core'];
const routineDifficulties: WorkoutRoutine['difficulty'][] = ['Beginner', 'Intermediate', 'Advanced', 'Hardcore'];

export function validateGeneratedWorkout(
  value: unknown,
  availableEquipment: TrainingEquipment[],
): GeneratedWorkout | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.title !== 'string' || candidate.title.trim().length === 0 ||
    !routineCategories.includes(candidate.category as WorkoutRoutine['category']) ||
    !routineDifficulties.includes(candidate.difficulty as WorkoutRoutine['difficulty']) ||
    !Array.isArray(candidate.targetMuscles) ||
    !candidate.targetMuscles.every(muscle => muscleGroups.includes(muscle as Exercise['primaryMuscle'])) ||
    !Array.isArray(candidate.exercises) || candidate.exercises.length === 0
  ) return null;

  const exercises: GeneratedWorkoutExercise[] = [];
  for (const rawExercise of candidate.exercises) {
    if (typeof rawExercise !== 'object' || rawExercise === null) return null;
    const exercise = rawExercise as Record<string, unknown>;
    const category = exercise.category as Exercise['category'];
    const primaryMuscle = exercise.primaryMuscle as Exercise['primaryMuscle'];
    const equipmentRequired = Array.isArray(exercise.equipmentRequired)
      ? exercise.equipmentRequired.filter((item): item is TrainingEquipment =>
          typeof item === 'string' && TRAINING_EQUIPMENT.includes(item as TrainingEquipment))
      : [];
    if (
      !['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'bands'].includes(category) ||
      (exercise.equipmentRequired !== undefined && !Array.isArray(exercise.equipmentRequired)) ||
      equipmentRequired.length !== (Array.isArray(exercise.equipmentRequired) ? exercise.equipmentRequired.length : 0) ||
      !isEquipmentAvailable(category, availableEquipment, equipmentRequired) ||
      !muscleGroups.includes(primaryMuscle) ||
      typeof exercise.name !== 'string' || exercise.name.trim().length === 0 ||
      typeof exercise.defaultWeight !== 'number' || !Number.isFinite(exercise.defaultWeight) || exercise.defaultWeight < 0 || exercise.defaultWeight > 500 ||
      typeof exercise.defaultReps !== 'number' || !Number.isInteger(exercise.defaultReps) || exercise.defaultReps < 1 || exercise.defaultReps > 100 ||
      typeof exercise.setsCount !== 'number' || !Number.isInteger(exercise.setsCount) || exercise.setsCount < 1 || exercise.setsCount > 12 ||
      typeof exercise.targetRestSeconds !== 'number' || !Number.isInteger(exercise.targetRestSeconds) || exercise.targetRestSeconds < 0 || exercise.targetRestSeconds > 600
    ) return null;

    exercises.push({
      name: exercise.name.trim().slice(0, 100),
      primaryMuscle,
      category,
      defaultWeight: exercise.defaultWeight,
      defaultReps: exercise.defaultReps,
      setsCount: exercise.setsCount,
      targetRestSeconds: exercise.targetRestSeconds,
      ...(equipmentRequired.length ? { equipmentRequired } : {}),
      ...(typeof exercise.tempo === 'string' ? { tempo: exercise.tempo.slice(0, 30) } : {}),
      ...(typeof exercise.notes === 'string' ? { notes: exercise.notes.slice(0, 300) } : {}),
      ...(typeof exercise.notesPt === 'string' ? { notesPt: exercise.notesPt.slice(0, 300) } : {}),
    });
  }

  if (
    typeof candidate.targetDurationMinutes !== 'number' || !Number.isFinite(candidate.targetDurationMinutes) || candidate.targetDurationMinutes < 10 || candidate.targetDurationMinutes > 240 ||
    typeof candidate.xpReward !== 'number' || !Number.isFinite(candidate.xpReward) || candidate.xpReward < 0 || candidate.xpReward > 5000
  ) return null;

  return {
    title: candidate.title.trim().slice(0, 100),
    category: candidate.category as WorkoutRoutine['category'],
    targetDurationMinutes: candidate.targetDurationMinutes,
    difficulty: candidate.difficulty as WorkoutRoutine['difficulty'],
    targetMuscles: candidate.targetMuscles as WorkoutRoutine['targetMuscles'],
    xpReward: candidate.xpReward,
    ...(typeof candidate.coachingNotes === 'string' ? { coachingNotes: candidate.coachingNotes.slice(0, 500) } : {}),
    exercises,
  };
}

export function adaptGeneratedWorkout(
  routine: GeneratedWorkout,
  experience: UserProfile['experience'],
): GeneratedWorkout {
  const maximumDifficulty = experience === 'beginner'
    ? 'Beginner'
    : experience === 'intermediate'
      ? 'Intermediate'
      : 'Hardcore';
  const maximumRank = difficultyRank[maximumDifficulty];
  const difficulty = difficultyRank[routine.difficulty] > maximumRank
    ? maximumDifficulty
    : routine.difficulty;

  return {
    ...routine,
    difficulty,
    exercises: routine.exercises.map(exercise => ({
      ...exercise,
      setsCount: experience === 'beginner' ? Math.min(exercise.setsCount, 3) : exercise.setsCount,
    })),
  };
}

export function isEquipmentAvailable(
  category: Exercise['category'],
  availableEquipment: TrainingEquipment[],
  equipmentRequired: TrainingEquipment[] = [],
): boolean {
  const additionalEquipmentAvailable = equipmentRequired.every(required => availableEquipment.includes(required));
  const categoryEquipmentAvailable = availableEquipment.includes(equipmentForCategory[category]) ||
    (category === 'bodyweight' && equipmentRequired.length > 0 && additionalEquipmentAvailable);
  return categoryEquipmentAvailable && additionalEquipmentAvailable;
}

export function isRoutineCompatible(
  routine: WorkoutRoutine,
  exerciseDatabase: Record<string, Exercise>,
  profile: UserProfile,
): boolean {
  return routine.exercises.length > 0 && routine.exercises.every(({ exerciseId }) => {
    const exercise = exerciseDatabase[exerciseId];
    return Boolean(exercise && isEquipmentAvailable(exercise.category, profile.equipment, exercise.equipmentRequired));
  });
}

function scoreRoutine(routine: WorkoutRoutine, profile: UserProfile): number {
  const rank = difficultyRank[routine.difficulty];
  const levelPreference = profile.experience === 'beginner'
    ? [4, 3, 0, -4][rank]
    : profile.experience === 'intermediate'
      ? [1, 4, 2, -2][rank]
      : [0, 1, 3, 4][rank];

  const goalPreference = profile.goals.reduce((total, goal) => {
    if (goal === 'weight_loss') {
      return total + (routine.category === 'Full Body' ? 4 : 0)
      + (routine.category === 'Legs' ? 2 : 0)
      + (routine.targetDurationMinutes <= 50 ? 1 : 0);
    }
    if (goal === 'muscle_gain') {
      return total + (['Push', 'Pull', 'Legs', 'Upper', 'Lower'].includes(routine.category) ? 3 : 1);
    }
    if (goal === 'fitness') {
      return total + (routine.category === 'Full Body' ? 4 : 0)
      + (routine.category === 'Upper' || routine.category === 'Lower' ? 2 : 0);
    }
    return total + (rank <= 1 ? 2 : 0);
  }, 0) / profile.goals.length;

  return levelPreference + goalPreference;
}

export function rankCompatibleRoutines(
  routines: WorkoutRoutine[],
  exerciseDatabase: Record<string, Exercise>,
  profile: UserProfile,
): WorkoutRoutine[] {
  return routines
    .filter(routine => isRoutineCompatible(routine, exerciseDatabase, profile))
    .map((routine, index) => ({ routine, index, score: scoreRoutine(routine, profile) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ routine }) => routine);
}

export function allowedExerciseCategories(equipment: TrainingEquipment[]): Exercise['category'][] {
  return (Object.keys(equipmentForCategory) as Exercise['category'][])
    .filter(category => equipment.includes(equipmentForCategory[category]));
}
