import { Exercise, ExerciseMediaStatus, ExerciseMediaType, MuscleGroup } from '../types/workout';
import { EXERCISE_DATABASE } from './exerciseCatalog';
import {
  getExerciseEligibilityStatus,
  hasExerciseMediaMetadata,
  hasVerifiedExerciseMedia,
} from '../utils/workoutPersonalization';

export interface ExerciseMediaManifestEntry {
  exerciseId: string;
  name: string;
  namePt: string;
  primaryMuscle: MuscleGroup;
  category: Exercise['category'];
  assetId: string;
  primaryImageUrl: string | null;
  primaryFormat: ExerciseMediaType | null;
  optionalAnimationUrl: string | null;
  optionalVideoUrl: string | null;
  version: string;
  source: string;
  status: ExerciseMediaStatus | 'unconfigured';
  verifiedAt: string | null;
  registered: true;
  hasMediaMetadata: boolean;
  isPublishedAndVerified: boolean;
  isEligibleForAi: boolean;
}

export interface CatalogCoverageReport {
  totalRegistered: number;
  withMediaMetadata: number;
  publishedAndVerified: number;
  eligibleForAi: number;
  withoutPublishedMedia: number;
  byMuscle: Record<MuscleGroup, number>;
  byCategory: Record<Exercise['category'], number>;
}

export function buildExerciseMediaManifest(
  catalog: Record<string, Exercise> = EXERCISE_DATABASE,
): ExerciseMediaManifestEntry[] {
  return Object.values(catalog)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((exercise) => {
      const eligibility = getExerciseEligibilityStatus(exercise);
      const media = exercise.media;
      return {
        exerciseId: exercise.id,
        name: exercise.name,
        namePt: exercise.namePt,
        primaryMuscle: exercise.primaryMuscle,
        category: exercise.category,
        assetId: media?.assetId ?? `exercise_${exercise.id}`,
        primaryImageUrl: media?.imageUrl ?? null,
        primaryFormat: media?.mediaType ?? null,
        optionalAnimationUrl: media?.animationUrl ?? null,
        optionalVideoUrl: media?.videoUrl ?? null,
        version: media?.version ?? '0.0.0',
        source: media?.source ?? 'unconfigured',
        status: media?.status ?? (media ? 'planned' : 'unconfigured'),
        verifiedAt: media?.verifiedAt ?? null,
        registered: true,
        hasMediaMetadata: eligibility.hasMediaMetadata,
        isPublishedAndVerified: eligibility.hasPublishedVerifiedMedia,
        isEligibleForAi: eligibility.eligibleForAi,
      };
    });
}

export const EXERCISE_MEDIA_MANIFEST: ExerciseMediaManifestEntry[] = buildExerciseMediaManifest();

export function buildCatalogCoverageReport(
  catalog: Record<string, Exercise> = EXERCISE_DATABASE,
): CatalogCoverageReport {
  const exercises = Object.values(catalog);
  const byMuscle: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    quads: 0,
    hamstrings: 0,
    calves: 0,
    core: 0,
    glutes: 0,
  };
  const byCategory: Record<Exercise['category'], number> = {
    bodyweight: 0,
    dumbbell: 0,
    barbell: 0,
    machine: 0,
    cable: 0,
    bands: 0,
  };

  let withMediaMetadata = 0;
  let publishedAndVerified = 0;
  let eligibleForAi = 0;

  for (const exercise of exercises) {
    byMuscle[exercise.primaryMuscle] += 1;
    byCategory[exercise.category] += 1;
    if (hasExerciseMediaMetadata(exercise)) withMediaMetadata += 1;
    if (hasVerifiedExerciseMedia(exercise)) {
      publishedAndVerified += 1;
      eligibleForAi += 1;
    }
  }

  return {
    totalRegistered: exercises.length,
    withMediaMetadata,
    publishedAndVerified,
    eligibleForAi,
    withoutPublishedMedia: exercises.length - publishedAndVerified,
    byMuscle,
    byCategory,
  };
}

export function getExercisesWithoutPublishedMedia(
  catalog: Record<string, Exercise> = EXERCISE_DATABASE,
): ExerciseMediaManifestEntry[] {
  return buildExerciseMediaManifest(catalog).filter((entry) => !entry.isPublishedAndVerified);
}
