import assert from 'node:assert/strict';
import test from 'node:test';
import { Exercise, WorkoutRoutine } from '../types/workout';
import { TrainingEquipment, UserProfile } from '../types/profile';
import {
  adaptGeneratedWorkout,
  getEligibleCatalogExercises,
  getExerciseEligibilityStatus,
  hasExerciseMediaMetadata,
  hasValidExerciseMedia,
  hasVerifiedExerciseMedia,
  isRoutineCompatible,
  isValidExerciseMedia,
  rankCompatibleRoutines,
  validateAndAdaptGeneratedWorkout,
  validateGeneratedWorkout,
  validateWorkoutRequest,
} from './workoutPersonalization';
import { EXERCISE_DATABASE, EXERCISE_GUIDE } from '../data/presetRoutines';
import {
  buildCatalogCoverageReport,
  EXERCISE_MEDIA_MANIFEST,
  getExercisesWithoutPublishedMedia,
} from '../data/exerciseMediaManifest';

function createVerifiedCatalog(source: Record<string, Exercise> = EXERCISE_DATABASE): Record<string, Exercise> {
  return Object.fromEntries(
    Object.entries(source).map(([id, exercise]) => [
      id,
      exercise.media
        ? {
            ...exercise,
            media: {
              ...exercise.media,
              status: 'published' as const,
              verifiedAt: '2026-11-13T10:00:00.000Z',
            },
          }
        : exercise,
    ]),
  );
}

const verifiedCatalog = createVerifiedCatalog();

const database: Record<string, Exercise> = {
  bodyweight_squat: {
    id: 'bodyweight_squat', name: 'Squat', namePt: 'Agachamento', primaryMuscle: 'quads',
    category: 'bodyweight', defaultSets: 3, defaultReps: 12, defaultWeight: 0, restSeconds: 60,
  },
  barbell_bench: {
    id: 'barbell_bench', name: 'Bench Press', namePt: 'Supino', primaryMuscle: 'chest',
    category: 'barbell', defaultSets: 3, defaultReps: 8, defaultWeight: 50, restSeconds: 90,
  },
};

function routine(id: string, category: WorkoutRoutine['category'], difficulty: WorkoutRoutine['difficulty'], exerciseId: string): WorkoutRoutine {
  return {
    id,
    title: id,
    titlePt: id,
    category,
    targetDurationMinutes: 45,
    difficulty,
    targetMuscles: ['quads'],
    xpReward: 100,
    exercises: [{
      exerciseId,
      targetRestSeconds: 60,
      sets: [{ id: `${id}-set`, setNumber: 1, weight: 0, reps: 10, isCompleted: false }],
    }],
  };
}

const bodyweightBeginner: UserProfile = {
  name: 'Test User', goals: ['fitness'], experience: 'beginner', equipment: ['bodyweight'],
};

function generatedWorkout(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Bodyweight session',
    category: 'Full Body',
    targetDurationMinutes: 30,
    difficulty: 'Beginner',
    targetMuscles: ['quads'],
    xpReward: 100,
    coachingNotes: 'Keep controlled form.',
    exercises: [{
      exerciseId: 'bodyweight_squat',
      name: 'Bodyweight squat',
      primaryMuscle: 'quads',
      category: 'bodyweight',
      defaultWeight: 0,
      defaultReps: 10,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
    ...overrides,
  };
}

const validWorkoutRequest = {
  focus: 'Full Body',
  durationMinutes: 45,
  equipment: ['bodyweight'],
  profileEquipment: ['bodyweight', 'pull_up_bar'],
  profileGoals: ['fitness'],
  experienceLevel: 'beginner',
  fatigueLevel: 'normal',
  targetGoal: 'endurance',
  language: 'pt',
};

test('routines never require equipment missing from the profile', () => {
  const bodyweightRoutine = routine('bodyweight', 'Full Body', 'Beginner', 'bodyweight_squat');
  const barbellRoutine = routine('barbell', 'Push', 'Beginner', 'barbell_bench');
  assert.equal(isRoutineCompatible(bodyweightRoutine, database, bodyweightBeginner), true);
  assert.equal(isRoutineCompatible(barbellRoutine, database, bodyweightBeginner), false);
});

test('bodyweight exercise with an explicit pull-up bar requirement needs that bar', () => {
  const hangingExercise: Exercise = {
    ...database.bodyweight_squat,
    id: 'hanging_leg_raise',
    equipmentRequired: ['pull_up_bar'],
  };
  const hangingRoutine = routine('hanging', 'Full Body', 'Beginner', 'hanging_leg_raise');
  assert.equal(isRoutineCompatible(hangingRoutine, { hanging_leg_raise: hangingExercise }, bodyweightBeginner), false);
  assert.equal(isRoutineCompatible(hangingRoutine, { hanging_leg_raise: hangingExercise }, {
    ...bodyweightBeginner,
    equipment: ['pull_up_bar'],
  }), true);
});

test('objective changes routine ordering toward full-body conditioning', () => {
  const routines = [
    routine('push', 'Push', 'Intermediate', 'bodyweight_squat'),
    routine('full-body', 'Full Body', 'Intermediate', 'bodyweight_squat'),
  ];
  const ranked = rankCompatibleRoutines(routines, database, bodyweightBeginner);
  assert.equal(ranked[0].id, 'full-body');
});

test('multiple goals are combined when ranking routines', () => {
  const routines = [
    routine('push', 'Push', 'Intermediate', 'bodyweight_squat'),
    routine('full-body', 'Full Body', 'Intermediate', 'bodyweight_squat'),
  ];
  const combinedGoals = rankCompatibleRoutines(routines, database, {
    ...bodyweightBeginner,
    goals: ['muscle_gain', 'fitness'],
  });
  assert.ok(combinedGoals.some(item => item.id === 'push'));
  assert.ok(combinedGoals.some(item => item.id === 'full-body'));
});

test('experience changes routine ordering toward beginner-appropriate difficulty', () => {
  const routines = [
    routine('advanced', 'Push', 'Advanced', 'bodyweight_squat'),
    routine('intermediate', 'Push', 'Intermediate', 'bodyweight_squat'),
  ];
  const ranked = rankCompatibleRoutines(routines, database, bodyweightBeginner);
  assert.equal(ranked[0].id, 'intermediate');
});

test('generated workout validation rejects exercises outside the selected equipment', () => {
  const generated = {
    title: 'Bodyweight session', category: 'Full Body', targetDurationMinutes: 30,
    difficulty: 'Beginner', targetMuscles: ['quads'], xpReward: 100,
    exercises: [{
      exerciseId: 'barbell_squat',
      name: 'Barbell squat', primaryMuscle: 'quads', category: 'barbell',
      defaultWeight: 20, defaultReps: 10, setsCount: 3, targetRestSeconds: 60,
    }],
  };
  assert.equal(validateGeneratedWorkout(generated, ['bodyweight']), null);

  // Even if the AI claims category is bodyweight, catalog metadata blocks incompatible equipment
  const spoofedGenerated = {
    ...generated,
    exercises: [{
      exerciseId: 'barbell_squat',
      name: 'Fake bodyweight squat', primaryMuscle: 'quads', category: 'bodyweight',
      defaultWeight: 0, defaultReps: 10, setsCount: 3, targetRestSeconds: 60,
    }],
  };
  assert.equal(validateGeneratedWorkout(spoofedGenerated, ['bodyweight']), null);
});

test('generated workout validation rejects bodyweight movements that need unavailable apparatus', () => {
  const generated = {
    title: 'Hanging core', category: 'Full Body', targetDurationMinutes: 30,
    difficulty: 'Beginner', targetMuscles: ['core'], xpReward: 100,
    exercises: [{
      exerciseId: 'hanging_leg_raise',
      name: 'Hanging leg raise', primaryMuscle: 'core', category: 'bodyweight',
      equipmentRequired: ['pull_up_bar'], defaultWeight: 0, defaultReps: 10,
      setsCount: 3, targetRestSeconds: 60,
    }],
  };
  assert.equal(validateGeneratedWorkout(generated, ['bodyweight'], { catalog: verifiedCatalog }), null);
  assert.ok(validateGeneratedWorkout(generated, ['pull_up_bar'], { catalog: verifiedCatalog }));
});

test('generated workout validation accepts a well-formed compatible routine', () => {
  const generated = {
    title: 'Bodyweight session', category: 'Full Body', targetDurationMinutes: 30,
    difficulty: 'Beginner', targetMuscles: ['quads'], xpReward: 100,
    exercises: [{
      exerciseId: 'bodyweight_squat',
      name: 'Bodyweight squat', primaryMuscle: 'quads', category: 'bodyweight',
      defaultWeight: 0, defaultReps: 10, setsCount: 3, targetRestSeconds: 60,
    }],
  };
  const result = validateGeneratedWorkout(generated, ['bodyweight'], { catalog: verifiedCatalog });
  assert.equal(result?.exercises.length, 1);
  assert.equal(result?.exercises[0].exerciseId, 'bodyweight_squat');
  assert.ok(result?.exercises[0].media?.imageUrl);
});

test('generated workout is capped to beginner difficulty and volume', () => {
  const generated = validateGeneratedWorkout({
    title: 'Advanced session', category: 'Push', targetDurationMinutes: 45,
    difficulty: 'Hardcore', targetMuscles: ['chest'], xpReward: 300,
    exercises: [{
      exerciseId: 'bench_press',
      name: 'Bench press', primaryMuscle: 'chest', category: 'barbell',
      defaultWeight: 60, defaultReps: 8, setsCount: 6, targetRestSeconds: 90,
    }],
  }, ['barbell'], { catalog: verifiedCatalog });
  assert.ok(generated);
  if (generated) {
    const adapted = adaptGeneratedWorkout(generated, 'beginner');
    assert.equal(adapted.difficulty, 'Beginner');
    assert.equal(adapted.exercises[0].setsCount, 3);
  }
});

test('advanced users may receive advanced routines without being downgraded', () => {
  const generated = validateGeneratedWorkout({
    title: 'Advanced session', category: 'Push', targetDurationMinutes: 45,
    difficulty: 'Advanced', targetMuscles: ['chest'], xpReward: 300,
    exercises: [{
      exerciseId: 'bench_press',
      name: 'Bench press', primaryMuscle: 'chest', category: 'barbell',
      defaultWeight: 60, defaultReps: 8, setsCount: 4, targetRestSeconds: 90,
    }],
  }, ['barbell'], { catalog: verifiedCatalog });
  assert.ok(generated);
  if (generated) assert.equal(adaptGeneratedWorkout(generated, 'advanced').difficulty, 'Advanced');
});

test('workout request validation accepts current client payloads and legacy profileGoal', () => {
  assert.deepEqual(validateWorkoutRequest(validWorkoutRequest), {
    ...validWorkoutRequest,
    frequentExercises: [],
  });
  assert.deepEqual(validateWorkoutRequest({
    focus: 'Push',
    durationMinutes: 30,
    equipment: ['barbell'],
    profileGoal: 'muscle_gain',
  })?.profileGoals, ['muscle_gain']);
});

test('workout request validation rejects missing required fields, malformed objects, and wrong types', () => {
  assert.equal(validateWorkoutRequest(null), null);
  assert.equal(validateWorkoutRequest([]), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, focus: undefined }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, durationMinutes: '45' }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, equipment: undefined }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, profileEquipment: 'bodyweight' }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, frequentExercises: 'squat' }), null);
});

test('workout request validation rejects invalid enums and equipment not in profile', () => {
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, experienceLevel: 'expert' }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, profileGoals: ['unknown'] }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, targetGoal: 'bulk' }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, fatigueLevel: 'exhausted' }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, language: 'es' }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, equipment: ['unlisted'] }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, equipment: ['barbell'] }), null);
});

test('workout request validation enforces integer duration boundaries and optional-list limits', () => {
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, durationMinutes: 9 }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, durationMinutes: 241 }), null);
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, durationMinutes: 30.5 }), null);
  assert.ok(validateWorkoutRequest({ ...validWorkoutRequest, durationMinutes: 10 }));
  assert.ok(validateWorkoutRequest({ ...validWorkoutRequest, durationMinutes: 240 }));
  assert.equal(validateWorkoutRequest({ ...validWorkoutRequest, frequentExercises: Array(9).fill('Squat') }), null);
});

test('generated workout validation accepts numeric boundaries and fractional kilogram weights', () => {
  const atMinimums = generatedWorkout({
    targetDurationMinutes: 10,
    xpReward: 0,
    exercises: [{
      exerciseId: 'bodyweight_squat',
      name: 'Weighted squat',
      primaryMuscle: 'quads',
      category: 'bodyweight',
      defaultWeight: 0,
      defaultReps: 1,
      setsCount: 1,
      targetRestSeconds: 0,
    }],
  });
  assert.ok(validateGeneratedWorkout(atMinimums, ['bodyweight'], { catalog: verifiedCatalog }));

  const atMaximums = generatedWorkout({
    targetDurationMinutes: 240,
    xpReward: 5000,
    exercises: [{
      exerciseId: 'bodyweight_squat',
      name: 'Loaded squat',
      primaryMuscle: 'quads',
      category: 'bodyweight',
      defaultWeight: 500,
      defaultReps: 30,
      setsCount: 12,
      targetRestSeconds: 600,
    }],
  });
  assert.ok(validateGeneratedWorkout(atMaximums, ['bodyweight'], { catalog: verifiedCatalog }));
  assert.ok(validateGeneratedWorkout(generatedWorkout({
    exercises: [{ ...generatedWorkout().exercises[0], defaultWeight: 22.5 }],
  }), ['bodyweight'], { catalog: verifiedCatalog }));
});

test('generated workout validation rejects extra fields and incomplete structures', () => {
  assert.equal(validateGeneratedWorkout(generatedWorkout({ unexpected: true }), ['bodyweight']), null);
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    exercises: [{ ...generatedWorkout().exercises[0], debug: true }],
  }), ['bodyweight']), null);
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    exercises: [{ name: 'Squat' }],
  }), ['bodyweight']), null);
});

test('generated workout validation rejects invalid enums and equipment values', () => {
  assert.equal(validateGeneratedWorkout(generatedWorkout({ category: 'Unknown' }), ['bodyweight']), null);
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    exercises: [{ ...generatedWorkout().exercises[0], primaryMuscle: 'unknown' }],
  }), ['bodyweight']), null);
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    exercises: [{ ...generatedWorkout().exercises[0], equipmentRequired: ['unknown'] }],
  }), ['bodyweight']), null);
});

test('generated workout validation rejects decimals for integer fields and invalid boundaries', () => {
  for (const [field, value] of [
    ['targetDurationMinutes', 30.5],
    ['xpReward', 100.5],
  ] as const) {
    assert.equal(validateGeneratedWorkout(generatedWorkout({ [field]: value }), ['bodyweight']), null);
  }
  for (const [field, value] of [
    ['defaultReps', 10.5],
    ['defaultReps', 31],
    ['setsCount', 0],
    ['setsCount', 12.5],
    ['targetRestSeconds', 601],
  ] as const) {
    assert.equal(validateGeneratedWorkout(generatedWorkout({
      exercises: [{ ...generatedWorkout().exercises[0], [field]: value }],
    }), ['bodyweight']), null);
  }
});

test('generated workout validation enforces exercise and muscle-count limits', () => {
  const allEquipment: TrainingEquipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'pull_up_bar', 'bands'];
  const exercise = generatedWorkout().exercises[0];
  const elevenUniqueIds = [
    'bench_press', 'incline_db_press', 'cable_fly', 'overhead_press', 'lateral_raise',
    'tricep_pushdown', 'barbell_deadlift', 'lat_pulldown', 'barbell_row', 'barbell_curl', 'barbell_squat',
  ];
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: ['chest', 'shoulders', 'triceps', 'back', 'biceps', 'quads'],
    exercises: elevenUniqueIds.map((exerciseId) => ({ ...exercise, exerciseId, setsCount: 1 })),
  }), allEquipment), null);

  const sevenMuscleExercises = [
    { exerciseId: 'bench_press', primaryMuscle: 'chest' },
    { exerciseId: 'barbell_deadlift', primaryMuscle: 'back' },
    { exerciseId: 'overhead_press', primaryMuscle: 'shoulders' },
    { exerciseId: 'barbell_curl', primaryMuscle: 'biceps' },
    { exerciseId: 'tricep_pushdown', primaryMuscle: 'triceps' },
    { exerciseId: 'barbell_squat', primaryMuscle: 'quads' },
    { exerciseId: 'glute_bridge', primaryMuscle: 'glutes' },
  ] as const;
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: sevenMuscleExercises.map((item) => item.primaryMuscle),
    exercises: sevenMuscleExercises.map((item) => ({ ...exercise, exerciseId: item.exerciseId, setsCount: 1 })),
  }), allEquipment), null);

  const sixMuscleExercises = sevenMuscleExercises.slice(0, 6);
  assert.ok(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: sixMuscleExercises.map((item) => item.primaryMuscle),
    exercises: sixMuscleExercises.map((item) => ({ ...exercise, exerciseId: item.exerciseId, setsCount: 1 })),
  }), allEquipment, { catalog: verifiedCatalog }));

  const tenValidIds = elevenUniqueIds.slice(0, 10);
  assert.ok(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: ['chest', 'shoulders', 'triceps', 'back', 'biceps'],
    exercises: tenValidIds.map((exerciseId) => ({ ...exercise, exerciseId, setsCount: 1 })),
  }), allEquipment, { catalog: verifiedCatalog }));
});

test('generated workout validation rejects values beyond numeric upper and lower bounds', () => {
  assert.equal(validateGeneratedWorkout(generatedWorkout({ targetDurationMinutes: 9 }), ['bodyweight']), null);
  assert.equal(validateGeneratedWorkout(generatedWorkout({ targetDurationMinutes: 241 }), ['bodyweight']), null);
  assert.equal(validateGeneratedWorkout(generatedWorkout({ xpReward: 5001 }), ['bodyweight']), null);
  for (const [field, value] of [
    ['defaultWeight', 501],
    ['defaultWeight', -0.1],
    ['defaultReps', 0],
    ['setsCount', 13],
    ['targetRestSeconds', -1],
  ] as const) {
    assert.equal(validateGeneratedWorkout(generatedWorkout({
      exercises: [{ ...generatedWorkout().exercises[0], [field]: value }],
    }), ['bodyweight']), null);
  }
});

test('generated workout validation rejects sets that cannot fit the requested duration', () => {
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    targetDurationMinutes: 10,
    exercises: [{ ...generatedWorkout().exercises[0], setsCount: 7 }],
  }), ['bodyweight']), null);
});

test('generated workout validation requires declared target muscles to match exercise muscles', () => {
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: ['chest'],
  }), ['bodyweight']), null);
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: ['quads', 'quads'],
  }), ['bodyweight']), null);
});

test('level adaptation is deterministic and caps difficulty and training volume', () => {
  const fourBodyweightIds = ['bodyweight_squat', 'push_up', 'reverse_lunge', 'glute_bridge'];
  const validated = validateGeneratedWorkout(generatedWorkout({
    difficulty: 'Hardcore',
    targetDurationMinutes: 45,
    targetMuscles: ['quads', 'chest', 'glutes'],
    exercises: fourBodyweightIds.map((exerciseId) => ({
      ...generatedWorkout().exercises[0],
      exerciseId,
      setsCount: 6,
    })),
  }), ['bodyweight'], { catalog: verifiedCatalog });
  assert.ok(validated);
  if (!validated) return;

  const firstAdaptation = adaptGeneratedWorkout(validated, 'beginner');
  const secondAdaptation = adaptGeneratedWorkout(validated, 'beginner');
  assert.deepEqual(firstAdaptation, secondAdaptation);
  assert.equal(firstAdaptation.difficulty, 'Beginner');
  assert.deepEqual(firstAdaptation.exercises.map((exercise) => exercise.setsCount), [3, 3, 3, 3]);
  assert.ok(firstAdaptation.exercises.reduce((sum, exercise) => sum + exercise.setsCount, 0) <= 30);
  assert.equal(adaptGeneratedWorkout(validated, 'intermediate').difficulty, 'Intermediate');
  assert.equal(adaptGeneratedWorkout(validated, 'advanced').difficulty, 'Hardcore');
});

test('fallback validation returns null instead of passing through an invalid routine', () => {
  assert.equal(validateAndAdaptGeneratedWorkout({
    ...generatedWorkout(),
    exercises: [{ ...generatedWorkout().exercises[0], category: 'invalid' }],
  }, ['bodyweight'], 'beginner'), null);
});

test('Phase 2 contract: accepts valid catalog exerciseId and hydrates authoritative catalog metadata & media', () => {
  const payload = {
    title: 'Treino Validado',
    category: 'Full Body',
    targetDurationMinutes: 30,
    difficulty: 'Beginner',
    targetMuscles: ['quads'],
    xpReward: 150,
    coachingNotes: 'Controle o ritmo.',
    exercises: [{
      exerciseId: 'bodyweight_squat',
      name: 'Invented Name That Must Be Overridden',
      primaryMuscle: 'chest', // mismatched deliberately: must be ignored and overwritten by catalog
      category: 'barbell', // mismatched deliberately: must be ignored and overwritten by catalog
      defaultWeight: 0,
      defaultReps: 12,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
  };

  const validatedPt = validateGeneratedWorkout(payload, ['bodyweight'], { language: 'pt', catalog: verifiedCatalog });
  assert.ok(validatedPt);
  assert.equal(validatedPt.exercises[0].exerciseId, 'bodyweight_squat');
  assert.equal(validatedPt.exercises[0].name, verifiedCatalog.bodyweight_squat.namePt);
  assert.equal(validatedPt.exercises[0].namePt, verifiedCatalog.bodyweight_squat.namePt);
  assert.equal(validatedPt.exercises[0].primaryMuscle, 'quads');
  assert.equal(validatedPt.exercises[0].category, 'bodyweight');
  assert.deepEqual(validatedPt.exercises[0].media, verifiedCatalog.bodyweight_squat.media);

  const validatedEn = validateGeneratedWorkout(payload, ['bodyweight'], { language: 'en', catalog: verifiedCatalog });
  assert.ok(validatedEn);
  assert.equal(validatedEn.exercises[0].name, verifiedCatalog.bodyweight_squat.name);
});

test('Phase 2 contract: rejects free-form exercises without exerciseId and non-existent exerciseIds', () => {
  const freeForm = generatedWorkout({
    exercises: [{
      name: 'Custom Burpee Freestyle',
      primaryMuscle: 'quads',
      category: 'bodyweight',
      defaultWeight: 0,
      defaultReps: 12,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
  });
  assert.equal(validateGeneratedWorkout(freeForm, ['bodyweight']), null);

  const nonExistentId = generatedWorkout({
    exercises: [{
      exerciseId: 'non_existent_exercise_xyz',
      defaultWeight: 0,
      defaultReps: 12,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
  });
  assert.equal(validateGeneratedWorkout(nonExistentId, ['bodyweight']), null);
});

test('Phase 2 contract: rejects catalog exercises without valid image/media and filters them out of eligible list', () => {
  const catalogWithoutImage: Record<string, Exercise> = {
    no_media_squat: {
      id: 'no_media_squat',
      name: 'Squat Without Media',
      namePt: 'Agachamento Sem Mídia',
      primaryMuscle: 'quads',
      category: 'bodyweight',
      defaultSets: 3,
      defaultReps: 12,
      defaultWeight: 0,
      restSeconds: 60,
    },
    data_uri_pushup: {
      id: 'data_uri_pushup',
      name: 'Embedded Data URI Push-up',
      namePt: 'Flexão Data URI',
      primaryMuscle: 'chest',
      category: 'bodyweight',
      defaultSets: 3,
      defaultReps: 10,
      defaultWeight: 0,
      restSeconds: 60,
      media: {
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        alt: 'Embedded data uri',
        mediaType: 'image',
        assetId: 'bad_asset',
        version: '1.0.0',
      },
    },
    valid_static_squat: {
      ...verifiedCatalog.bodyweight_squat,
      id: 'valid_static_squat',
    },
    planned_unverified_squat: {
      ...EXERCISE_DATABASE.bodyweight_squat,
      id: 'planned_unverified_squat',
      media: {
        ...EXERCISE_DATABASE.bodyweight_squat.media!,
        status: 'planned',
        verifiedAt: undefined,
      },
    },
    published_without_timestamp: {
      ...EXERCISE_DATABASE.bodyweight_squat,
      id: 'published_without_timestamp',
      media: {
        ...EXERCISE_DATABASE.bodyweight_squat.media!,
        status: 'published',
        verifiedAt: undefined,
      },
    },
  };

  assert.equal(hasExerciseMediaMetadata(catalogWithoutImage.no_media_squat), false);
  assert.equal(hasExerciseMediaMetadata(catalogWithoutImage.planned_unverified_squat), true);
  assert.equal(hasVerifiedExerciseMedia(catalogWithoutImage.planned_unverified_squat), false);
  assert.equal(hasVerifiedExerciseMedia(catalogWithoutImage.published_without_timestamp), false);

  assert.equal(hasValidExerciseMedia(catalogWithoutImage.no_media_squat), false);
  assert.equal(hasValidExerciseMedia(catalogWithoutImage.data_uri_pushup), false);
  assert.equal(hasValidExerciseMedia(catalogWithoutImage.planned_unverified_squat), false);
  assert.equal(hasValidExerciseMedia(catalogWithoutImage.published_without_timestamp), false);
  assert.equal(hasValidExerciseMedia(catalogWithoutImage.valid_static_squat), true);

  assert.equal(getExerciseEligibilityStatus(catalogWithoutImage.planned_unverified_squat, ['bodyweight']).reason, 'media_not_published_or_verified');
  assert.equal(getExerciseEligibilityStatus(catalogWithoutImage.valid_static_squat, ['bodyweight']).reason, 'eligible');
  assert.equal(getExerciseEligibilityStatus(catalogWithoutImage.valid_static_squat, ['barbell']).reason, 'incompatible_equipment');

  const eligible = getEligibleCatalogExercises(['bodyweight'], catalogWithoutImage);
  assert.deepEqual(eligible.map((item) => item.id), ['valid_static_squat']);

  assert.equal(validateGeneratedWorkout(generatedWorkout({
    exercises: [{
      exerciseId: 'no_media_squat',
      defaultWeight: 0,
      defaultReps: 10,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
  }), ['bodyweight'], { catalog: catalogWithoutImage }), null);

  // IA Gemini nunca pode selecionar exercício sem mídia publicada e verificada
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    exercises: [{
      exerciseId: 'planned_unverified_squat',
      defaultWeight: 0,
      defaultReps: 10,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
  }), ['bodyweight'], { catalog: catalogWithoutImage }), null);

  // Fallback determinístico local pode operar com allowUnpublishedMedia: true
  assert.ok(validateGeneratedWorkout(generatedWorkout({
    exercises: [{
      exerciseId: 'planned_unverified_squat',
      defaultWeight: 0,
      defaultReps: 10,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
  }), ['bodyweight'], { catalog: catalogWithoutImage, allowUnpublishedMedia: true }));

  assert.equal(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: ['chest'],
    exercises: [{
      exerciseId: 'data_uri_pushup',
      defaultWeight: 0,
      defaultReps: 10,
      setsCount: 3,
      targetRestSeconds: 60,
    }],
  }), ['bodyweight'], { catalog: catalogWithoutImage }), null);
});

test('Phase 2 contract: supports static fallback media and optional animation/video URLs', () => {
  assert.equal(isValidExerciseMedia({
    imageUrl: 'https://cdn.fitflow.celisapp.com/exercises/v1/push_up.webp',
    alt: 'Push-up form',
    mediaType: 'webp',
    assetId: 'exercise_push_up',
    version: '1.0.0',
  }), true);

  assert.equal(isValidExerciseMedia({
    imageUrl: 'https://cdn.fitflow.celisapp.com/exercises/v1/push_up.webp',
    animationUrl: 'https://cdn.fitflow.celisapp.com/exercises/v1/push_up.webm',
    videoUrl: 'https://cdn.fitflow.celisapp.com/exercises/v1/push_up.mp4',
    alt: 'Push-up animation',
    altPt: 'Animação da flexão',
    mediaType: 'webp',
    assetId: 'exercise_push_up',
    version: '1.1.0',
    status: 'published',
    verifiedAt: '2026-11-13T10:00:00.000Z',
  }), true);

  assert.equal(isValidExerciseMedia({
    imageUrl: 'https://cdn.fitflow.celisapp.com/exercises/v1/push_up.webp',
    animationUrl: 'javascript:alert(1)',
    alt: 'Malformed animation',
    mediaType: 'lottie',
    assetId: 'exercise_push_up',
    version: '1.1.0',
  }), false);
});

test('Phase 2 contract: rejects duplicate exerciseIds in the same routine', () => {
  const duplicateIdsPayload = generatedWorkout({
    exercises: [
      {
        exerciseId: 'bodyweight_squat',
        defaultWeight: 0,
        defaultReps: 12,
        setsCount: 2,
        targetRestSeconds: 60,
      },
      {
        exerciseId: 'bodyweight_squat',
        defaultWeight: 0,
        defaultReps: 10,
        setsCount: 2,
        targetRestSeconds: 60,
      },
    ],
  });
  assert.equal(validateGeneratedWorkout(duplicateIdsPayload, ['bodyweight'], { catalog: verifiedCatalog }), null);
});

test('Phase 2 Step 2: expanded catalog covers 80-100 unique exercises, all muscle groups, equipment types, guides, and honest media verification status', () => {
  const entries = Object.values(EXERCISE_DATABASE);
  assert.ok(entries.length >= 80 && entries.length <= 100, `Expected 80-100 exercises, got ${entries.length}`);

  const seenIds = new Set<string>();
  const seenAssetIds = new Set<string>();
  const coverage = buildCatalogCoverageReport(EXERCISE_DATABASE);

  for (const exercise of entries) {
    assert.ok(!seenIds.has(exercise.id), `Duplicate exercise id: ${exercise.id}`);
    seenIds.add(exercise.id);

    assert.ok(exercise.name.trim().length > 0, `${exercise.id} must have EN name`);
    assert.ok(exercise.namePt.trim().length > 0, `${exercise.id} must have PT name`);
    assert.equal(hasExerciseMediaMetadata(exercise), true, `${exercise.id} must have valid structural media metadata`);
    assert.ok(exercise.media?.imageUrl.startsWith('https://'), `${exercise.id} media imageUrl must be HTTPS`);
    assert.ok(!seenAssetIds.has(exercise.media!.assetId), `Duplicate assetId: ${exercise.media!.assetId}`);
    seenAssetIds.add(exercise.media!.assetId);

    const guide = EXERCISE_GUIDE[exercise.id];
    assert.ok(guide?.description.trim(), `${exercise.id} must have EN guide description`);
    assert.ok(guide?.descriptionPt.trim(), `${exercise.id} must have PT guide description`);
    assert.ok(guide?.commonMistakes?.trim(), `${exercise.id} must have EN commonMistakes`);
    assert.ok(guide?.commonMistakesPt?.trim(), `${exercise.id} must have PT commonMistakesPt`);

    // Regra de honestidade: nenhum ativo planejado sem publicação HTTP verificada deve constar como elegível para Gemini
    assert.equal(hasVerifiedExerciseMedia(exercise), false, `${exercise.id} must not claim published media without CDN verification`);
  }

  // Cobertura completa de todos os 10 grupamentos musculares e 6 categorias de equipamento + barra fixa
  for (const [muscle, count] of Object.entries(coverage.byMuscle)) {
    assert.ok(count > 0, `Muscle group ${muscle} must have at least 1 exercise`);
  }
  for (const [category, count] of Object.entries(coverage.byCategory)) {
    assert.ok(count > 0, `Equipment category ${category} must have at least 1 exercise`);
  }
  assert.ok(entries.some((ex) => ex.equipmentRequired?.includes('pull_up_bar')), 'Catalog must cover pull_up_bar');

  // Manifesto e relatório refletem com exatidão os 90 cadastrados e 0 publicados/verificados
  assert.equal(EXERCISE_MEDIA_MANIFEST.length, entries.length);
  assert.equal(coverage.totalRegistered, entries.length);
  assert.equal(coverage.withMediaMetadata, entries.length);
  assert.equal(coverage.publishedAndVerified, 0);
  assert.equal(coverage.eligibleForAi, 0);
  assert.equal(coverage.withoutPublishedMedia, entries.length);
  assert.equal(getExercisesWithoutPublishedMedia().length, entries.length);
  assert.equal(getEligibleCatalogExercises(['bodyweight', 'barbell', 'dumbbell', 'cable', 'machine', 'bands', 'pull_up_bar']).length, 0);

  // Old persisted routine referencing exercises without media field remains compatible
  const legacyRoutine = routine('legacy-routine-1', 'Full Body', 'Beginner', 'bodyweight_squat');
  assert.equal(isRoutineCompatible(legacyRoutine, database, bodyweightBeginner), true);
  assert.equal(rankCompatibleRoutines([legacyRoutine], database, bodyweightBeginner).length, 1);
});
