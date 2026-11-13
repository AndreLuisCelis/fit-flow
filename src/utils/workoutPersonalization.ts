import { Exercise, ExerciseMedia, ExerciseMediaType, WorkoutRoutine } from '../types/workout';
import { EXERCISE_DATABASE } from '../data/presetRoutines';
import {
  EXPERIENCE_LEVELS,
  PROFILE_GOALS,
  ExperienceLevel,
  ProfileGoal,
  TRAINING_EQUIPMENT,
  TrainingEquipment,
  UserProfile,
} from '../types/profile';

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
  exerciseId: string;
  name: string;
  namePt?: string;
  primaryMuscle: Exercise['primaryMuscle'];
  secondaryMuscles?: Exercise['secondaryMuscles'];
  category: Exercise['category'];
  defaultWeight: number;
  defaultReps: number;
  setsCount: number;
  targetRestSeconds: number;
  equipmentRequired?: TrainingEquipment[];
  tempo?: string;
  notes?: string;
  notesPt?: string;
  media?: ExerciseMedia;
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

export interface ValidateGeneratedWorkoutOptions {
  catalog?: Record<string, Exercise>;
  language?: 'pt' | 'en';
}

export interface ValidatedWorkoutRequest {
  focus: string;
  durationMinutes: number;
  language: 'pt' | 'en';
  equipment: TrainingEquipment[];
  profileEquipment: TrainingEquipment[];
  profileGoals: ProfileGoal[];
  experienceLevel: UserProfile['experience'];
  fatigueLevel: 'fresh' | 'normal' | 'fatigued';
  targetGoal: 'hypertrophy' | 'strength' | 'endurance' | 'deload';
  frequentExercises: string[];
}

const muscleGroups: Exercise['primaryMuscle'][] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'calves', 'core', 'glutes',
];
const routineCategories: WorkoutRoutine['category'][] = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio & Core'];
const routineDifficulties: WorkoutRoutine['difficulty'][] = ['Beginner', 'Intermediate', 'Advanced', 'Hardcore'];
const maximumTargetMuscles = 6;
const maximumExercises = 10;
const exerciseCategories: Exercise['category'][] = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'bands'];
const exerciseMediaTypes: ExerciseMediaType[] = ['image', 'gif', 'lottie', 'webp', 'mp4', 'webm', 'svg'];
const requestFatigueLevels = ['fresh', 'normal', 'fatigued'] as const;
const requestGoals = ['hypertrophy', 'strength', 'endurance', 'deload'] as const;
const allowedRoutineFields = ['title', 'category', 'targetDurationMinutes', 'difficulty', 'targetMuscles', 'xpReward', 'coachingNotes', 'exercises'];
const allowedExerciseFields = [
  'exerciseId',
  'name',
  'namePt',
  'primaryMuscle',
  'secondaryMuscles',
  'category',
  'equipmentRequired',
  'defaultWeight',
  'defaultReps',
  'setsCount',
  'targetRestSeconds',
  'tempo',
  'notes',
  'notesPt',
  'media',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyFields(value: Record<string, unknown>, allowedFields: string[]): boolean {
  return Object.keys(value).every((field) => allowedFields.includes(field));
}

function isEquipmentList(value: unknown): value is TrainingEquipment[] {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'string' && TRAINING_EQUIPMENT.includes(item as TrainingEquipment));
}

export function isValidExternalMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidExerciseMedia(media: unknown): media is ExerciseMedia {
  if (!isRecord(media)) return false;
  if (!isValidExternalMediaUrl(media.imageUrl)) return false;
  if (typeof media.alt !== 'string' || media.alt.trim().length === 0 || media.alt.length > 300) return false;
  if (media.altPt !== undefined && (typeof media.altPt !== 'string' || media.altPt.trim().length === 0 || media.altPt.length > 300)) return false;
  if (media.animationUrl !== undefined && !isValidExternalMediaUrl(media.animationUrl)) return false;
  if (media.videoUrl !== undefined && !isValidExternalMediaUrl(media.videoUrl)) return false;
  if (typeof media.mediaType !== 'string' || !exerciseMediaTypes.includes(media.mediaType as ExerciseMediaType)) return false;
  if (typeof media.assetId !== 'string' || media.assetId.trim().length === 0 || media.assetId.length > 120) return false;
  if (typeof media.version !== 'string' || media.version.trim().length === 0 || media.version.length > 40) return false;
  return true;
}

export function hasValidExerciseMedia(exercise: Exercise | undefined | null): boolean {
  return Boolean(exercise && isValidExerciseMedia(exercise.media));
}

export function getEligibleCatalogExercises(
  availableEquipment: TrainingEquipment[],
  catalog: Record<string, Exercise> = EXERCISE_DATABASE,
): Exercise[] {
  if (!isEquipmentList(availableEquipment)) return [];
  return Object.values(catalog)
    .filter((exercise) =>
      hasValidExerciseMedia(exercise) &&
      isEquipmentAvailable(exercise.category, availableEquipment, exercise.equipmentRequired),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function validateWorkoutRequest(value: unknown): ValidatedWorkoutRequest | null {
  if (!isRecord(value)) return null;
  const { focus, durationMinutes } = value;
  if (
    typeof focus !== 'string' || focus.trim().length === 0 || focus.length > 100 ||
    typeof durationMinutes !== 'number' || !Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 240
  ) return null;

  if (!isEquipmentList(value.equipment)) return null;
  const profileEquipment = value.profileEquipment === undefined ? value.equipment : value.profileEquipment;
  if (!isEquipmentList(profileEquipment)) return null;
  const equipment = [...new Set(value.equipment)];
  const availableProfileEquipment = [...new Set(profileEquipment)];
  if (!equipment.every((item) => availableProfileEquipment.includes(item))) return null;

  let profileGoals: unknown = value.profileGoals;
  if (profileGoals === undefined && value.profileGoal !== undefined) {
    profileGoals = Array.isArray(value.profileGoal) ? value.profileGoal : [value.profileGoal];
  }
  if (profileGoals === undefined) profileGoals = ['muscle_gain'];
  if (
    !Array.isArray(profileGoals) || profileGoals.length === 0 ||
    !profileGoals.every((goal) => typeof goal === 'string' && PROFILE_GOALS.includes(goal as ProfileGoal))
  ) return null;

  const experienceLevel = value.experienceLevel === undefined ? 'intermediate' : value.experienceLevel;
  if (!EXPERIENCE_LEVELS.includes(experienceLevel as ExperienceLevel)) return null;
  const language = value.language === undefined ? 'pt' : value.language;
  if (language !== 'pt' && language !== 'en') return null;

  const fatigueInput = value.fatigueLevel === undefined ? 'normal' : value.fatigueLevel;
  if (typeof fatigueInput !== 'string') return null;
  const fatigueLevel = fatigueInput.toLowerCase();
  if (!requestFatigueLevels.includes(fatigueLevel as typeof requestFatigueLevels[number])) return null;

  const targetGoal = value.targetGoal === undefined ? 'hypertrophy' : value.targetGoal;
  if (!requestGoals.includes(targetGoal as typeof requestGoals[number])) return null;

  const frequentExercises = value.frequentExercises === undefined ? [] : value.frequentExercises;
  if (
    !Array.isArray(frequentExercises) || frequentExercises.length > 8 ||
    !frequentExercises.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 100)
  ) return null;

  return {
    focus: focus.trim(),
    durationMinutes,
    language,
    equipment,
    profileEquipment: availableProfileEquipment,
    profileGoals: [...new Set(profileGoals as ProfileGoal[])],
    experienceLevel: experienceLevel as ExperienceLevel,
    fatigueLevel: fatigueLevel as ValidatedWorkoutRequest['fatigueLevel'],
    targetGoal: targetGoal as ValidatedWorkoutRequest['targetGoal'],
    frequentExercises: frequentExercises.map((item: string) => item.trim()),
  };
}

export function validateGeneratedWorkout(
  value: unknown,
  availableEquipment: TrainingEquipment[],
  options: ValidateGeneratedWorkoutOptions = {},
): GeneratedWorkout | null {
  const catalog = options.catalog ?? EXERCISE_DATABASE;
  const language = options.language ?? 'pt';

  if (!isRecord(value) || !hasOnlyFields(value, allowedRoutineFields) || !isEquipmentList(availableEquipment)) return null;
  const candidate = value;
  if (
    typeof candidate.title !== 'string' || candidate.title.trim().length === 0 ||
    candidate.title.length > 100 ||
    !routineCategories.includes(candidate.category as WorkoutRoutine['category']) ||
    !routineDifficulties.includes(candidate.difficulty as WorkoutRoutine['difficulty']) ||
    !Array.isArray(candidate.targetMuscles) ||
    candidate.targetMuscles.length === 0 || candidate.targetMuscles.length > maximumTargetMuscles ||
    !candidate.targetMuscles.every(muscle => muscleGroups.includes(muscle as Exercise['primaryMuscle'])) ||
    new Set(candidate.targetMuscles).size !== candidate.targetMuscles.length ||
    !Array.isArray(candidate.exercises) || candidate.exercises.length === 0 || candidate.exercises.length > maximumExercises ||
    (candidate.coachingNotes !== undefined && (typeof candidate.coachingNotes !== 'string' || candidate.coachingNotes.length > 500))
  ) return null;

  const seenExerciseIds = new Set<string>();
  const exercises: GeneratedWorkoutExercise[] = [];

  for (const rawExercise of candidate.exercises) {
    if (!isRecord(rawExercise) || !hasOnlyFields(rawExercise, allowedExerciseFields)) return null;
    const exercise = rawExercise;

    // Contrato baseado em ID: exercício deve referenciar um ID válido existente no catálogo
    if (typeof exercise.exerciseId !== 'string' || exercise.exerciseId.trim().length === 0 || exercise.exerciseId.length > 100) {
      return null;
    }
    const exerciseId = exercise.exerciseId.trim();
    if (seenExerciseIds.has(exerciseId)) {
      return null;
    }
    seenExerciseIds.add(exerciseId);

    const catalogExercise = catalog[exerciseId];
    if (!catalogExercise) {
      return null;
    }

    // Exercício deve possuir imagem/mídia válida para elegibilidade pela IA
    if (!hasValidExerciseMedia(catalogExercise)) {
      return null;
    }

    // Compatibilidade de equipamento verificada exclusivamente contra os metadados autoritativos do catálogo
    if (!isEquipmentAvailable(catalogExercise.category, availableEquipment, catalogExercise.equipmentRequired)) {
      return null;
    }

    // Validação estrutural de campos opcionais caso presentes no payload (sem confiar neles como fonte de verdade)
    if (exercise.category !== undefined && !exerciseCategories.includes(exercise.category as Exercise['category'])) {
      return null;
    }
    if (exercise.primaryMuscle !== undefined && !muscleGroups.includes(exercise.primaryMuscle as Exercise['primaryMuscle'])) {
      return null;
    }
    if (
      exercise.secondaryMuscles !== undefined &&
      (!Array.isArray(exercise.secondaryMuscles) ||
        !exercise.secondaryMuscles.every((m) => typeof m === 'string' && muscleGroups.includes(m as Exercise['primaryMuscle'])))
    ) {
      return null;
    }
    if (
      exercise.equipmentRequired !== undefined &&
      (!Array.isArray(exercise.equipmentRequired) ||
        !exercise.equipmentRequired.every((item) => typeof item === 'string' && TRAINING_EQUIPMENT.includes(item as TrainingEquipment)))
    ) {
      return null;
    }
    if (exercise.name !== undefined && (typeof exercise.name !== 'string' || exercise.name.trim().length === 0 || exercise.name.length > 100)) {
      return null;
    }
    if (exercise.namePt !== undefined && (typeof exercise.namePt !== 'string' || exercise.namePt.trim().length === 0 || exercise.namePt.length > 100)) {
      return null;
    }
    if (exercise.media !== undefined && !isValidExerciseMedia(exercise.media)) {
      return null;
    }

    const optionalTextFields = ['tempo', 'notes', 'notesPt'] as const;
    if (
      typeof exercise.defaultWeight !== 'number' || !Number.isFinite(exercise.defaultWeight) || exercise.defaultWeight < 0 || exercise.defaultWeight > 500 ||
      typeof exercise.defaultReps !== 'number' || !Number.isInteger(exercise.defaultReps) || exercise.defaultReps < 1 || exercise.defaultReps > 30 ||
      typeof exercise.setsCount !== 'number' || !Number.isInteger(exercise.setsCount) || exercise.setsCount < 1 || exercise.setsCount > 12 ||
      typeof exercise.targetRestSeconds !== 'number' || !Number.isInteger(exercise.targetRestSeconds) || exercise.targetRestSeconds < 0 || exercise.targetRestSeconds > 600
    ) return null;
    if (optionalTextFields.some((field) =>
      exercise[field] !== undefined &&
      (typeof exercise[field] !== 'string' || exercise[field].length > (field === 'tempo' ? 30 : 300)),
    )) return null;

    // Recupera nome, categoria, músculos e mídia exclusivamente do catálogo (fonte única de verdade)
    const authoritativeName = language === 'pt'
      ? (catalogExercise.namePt || catalogExercise.name)
      : catalogExercise.name;
    const resolvedNotes = typeof exercise.notes === 'string' && exercise.notes.trim().length > 0
      ? exercise.notes.trim()
      : (language === 'pt' ? (catalogExercise.notesPt || catalogExercise.notes) : catalogExercise.notes);
    const resolvedNotesPt = typeof exercise.notesPt === 'string' && exercise.notesPt.trim().length > 0
      ? exercise.notesPt.trim()
      : catalogExercise.notesPt;
    const resolvedTempo = typeof exercise.tempo === 'string' && exercise.tempo.trim().length > 0
      ? exercise.tempo.trim()
      : catalogExercise.tempo;

    exercises.push({
      exerciseId: catalogExercise.id,
      name: authoritativeName,
      ...(catalogExercise.namePt ? { namePt: catalogExercise.namePt } : {}),
      primaryMuscle: catalogExercise.primaryMuscle,
      ...(catalogExercise.secondaryMuscles?.length ? { secondaryMuscles: [...catalogExercise.secondaryMuscles] } : {}),
      category: catalogExercise.category,
      defaultWeight: exercise.defaultWeight,
      defaultReps: exercise.defaultReps,
      setsCount: exercise.setsCount,
      targetRestSeconds: exercise.targetRestSeconds,
      ...(catalogExercise.equipmentRequired?.length ? { equipmentRequired: [...catalogExercise.equipmentRequired] } : {}),
      ...(resolvedTempo ? { tempo: resolvedTempo } : {}),
      ...(resolvedNotes ? { notes: resolvedNotes } : {}),
      ...(resolvedNotesPt ? { notesPt: resolvedNotesPt } : {}),
      ...(catalogExercise.media ? { media: { ...catalogExercise.media } } : {}),
    });
  }

  const actualTargetMuscles = new Set(exercises.map((exercise) => exercise.primaryMuscle));
  const declaredTargetMuscles = new Set(candidate.targetMuscles as Exercise['primaryMuscle'][]);
  const totalSets = exercises.reduce((sum, exercise) => sum + exercise.setsCount, 0);
  if (
    typeof candidate.targetDurationMinutes !== 'number' || !Number.isInteger(candidate.targetDurationMinutes) || candidate.targetDurationMinutes < 10 || candidate.targetDurationMinutes > 240 ||
    typeof candidate.xpReward !== 'number' || !Number.isInteger(candidate.xpReward) || candidate.xpReward < 0 || candidate.xpReward > 5000 ||
    totalSets > getWorkoutSetBudget(candidate.targetDurationMinutes) ||
    actualTargetMuscles.size !== declaredTargetMuscles.size ||
    [...actualTargetMuscles].some((muscle) => !declaredTargetMuscles.has(muscle))
  ) return null;

  return {
    title: candidate.title.trim(),
    category: candidate.category as WorkoutRoutine['category'],
    targetDurationMinutes: candidate.targetDurationMinutes,
    difficulty: candidate.difficulty as WorkoutRoutine['difficulty'],
    targetMuscles: candidate.targetMuscles as WorkoutRoutine['targetMuscles'],
    xpReward: candidate.xpReward,
    ...(typeof candidate.coachingNotes === 'string' ? { coachingNotes: candidate.coachingNotes } : {}),
    exercises,
  };
}

export function getWorkoutSetBudget(durationMinutes: number): number {
  return Math.floor(durationMinutes * 2 / 3);
}

export function adaptGeneratedWorkout(
  routine: GeneratedWorkout,
  experience: UserProfile['experience'],
): GeneratedWorkout {
  if (!EXPERIENCE_LEVELS.includes(experience)) {
    throw new Error('Invalid experience level');
  }
  const maximumDifficulty = experience === 'beginner'
    ? 'Beginner'
    : experience === 'intermediate'
      ? 'Intermediate'
      : 'Hardcore';
  const maximumRank = difficultyRank[maximumDifficulty];
  const difficulty = difficultyRank[routine.difficulty] > maximumRank
    ? maximumDifficulty
    : routine.difficulty;
  const maximumSetsPerExercise = experience === 'beginner' ? 3 : experience === 'intermediate' ? 5 : 8;
  let remainingSets = getWorkoutSetBudget(routine.targetDurationMinutes);

  return {
    ...routine,
    difficulty,
    exercises: routine.exercises.map((exercise) => {
      const setsCount = Math.min(exercise.setsCount, maximumSetsPerExercise, remainingSets);
      remainingSets -= setsCount;
      return { ...exercise, setsCount };
    }),
  };
}

export function validateAndAdaptGeneratedWorkout(
  value: unknown,
  availableEquipment: TrainingEquipment[],
  experience: UserProfile['experience'],
  options: ValidateGeneratedWorkoutOptions = {},
): GeneratedWorkout | null {
  const validated = validateGeneratedWorkout(value, availableEquipment, options);
  if (!validated) return null;
  const adapted = adaptGeneratedWorkout(validated, experience);
  return validateGeneratedWorkout(adapted, availableEquipment, options);
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
