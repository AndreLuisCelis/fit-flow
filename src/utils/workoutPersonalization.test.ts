import assert from 'node:assert/strict';
import test from 'node:test';
import { Exercise, WorkoutRoutine } from '../types/workout';
import { UserProfile } from '../types/profile';
import {
  adaptGeneratedWorkout,
  isRoutineCompatible,
  rankCompatibleRoutines,
  validateAndAdaptGeneratedWorkout,
  validateGeneratedWorkout,
  validateWorkoutRequest,
} from './workoutPersonalization';

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
      name: 'Barbell squat', primaryMuscle: 'quads', category: 'barbell',
      defaultWeight: 20, defaultReps: 10, setsCount: 3, targetRestSeconds: 60,
    }],
  };
  assert.equal(validateGeneratedWorkout(generated, ['bodyweight']), null);
});

test('generated workout validation rejects bodyweight movements that need unavailable apparatus', () => {
  const generated = {
    title: 'Hanging core', category: 'Full Body', targetDurationMinutes: 30,
    difficulty: 'Beginner', targetMuscles: ['core'], xpReward: 100,
    exercises: [{
      name: 'Hanging leg raise', primaryMuscle: 'core', category: 'bodyweight',
      equipmentRequired: ['pull_up_bar'], defaultWeight: 0, defaultReps: 10,
      setsCount: 3, targetRestSeconds: 60,
    }],
  };
  assert.equal(validateGeneratedWorkout(generated, ['bodyweight']), null);
  assert.ok(validateGeneratedWorkout(generated, ['pull_up_bar']));
});

test('generated workout validation accepts a well-formed compatible routine', () => {
  const generated = {
    title: 'Bodyweight session', category: 'Full Body', targetDurationMinutes: 30,
    difficulty: 'Beginner', targetMuscles: ['quads'], xpReward: 100,
    exercises: [{
      name: 'Bodyweight squat', primaryMuscle: 'quads', category: 'bodyweight',
      defaultWeight: 0, defaultReps: 10, setsCount: 3, targetRestSeconds: 60,
    }],
  };
  assert.equal(validateGeneratedWorkout(generated, ['bodyweight'])?.exercises.length, 1);
});

test('generated workout is capped to beginner difficulty and volume', () => {
  const generated = validateGeneratedWorkout({
    title: 'Advanced session', category: 'Push', targetDurationMinutes: 45,
    difficulty: 'Hardcore', targetMuscles: ['chest'], xpReward: 300,
    exercises: [{
      name: 'Bench press', primaryMuscle: 'chest', category: 'barbell',
      defaultWeight: 60, defaultReps: 8, setsCount: 6, targetRestSeconds: 90,
    }],
  }, ['barbell']);
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
      name: 'Bench press', primaryMuscle: 'chest', category: 'barbell',
      defaultWeight: 60, defaultReps: 8, setsCount: 4, targetRestSeconds: 90,
    }],
  }, ['barbell']);
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
      name: 'Weighted squat',
      primaryMuscle: 'quads',
      category: 'bodyweight',
      defaultWeight: 0,
      defaultReps: 1,
      setsCount: 1,
      targetRestSeconds: 0,
    }],
  });
  assert.ok(validateGeneratedWorkout(atMinimums, ['bodyweight']));

  const atMaximums = generatedWorkout({
    targetDurationMinutes: 240,
    xpReward: 5000,
    exercises: [{
      name: 'Loaded squat',
      primaryMuscle: 'quads',
      category: 'bodyweight',
      defaultWeight: 500,
      defaultReps: 30,
      setsCount: 12,
      targetRestSeconds: 600,
    }],
  });
  assert.ok(validateGeneratedWorkout(atMaximums, ['bodyweight']));
  assert.ok(validateGeneratedWorkout(generatedWorkout({
    exercises: [{ ...generatedWorkout().exercises[0], defaultWeight: 22.5 }],
  }), ['bodyweight']));
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
  const exercise = generatedWorkout().exercises[0];
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    exercises: Array(11).fill(exercise),
  }), ['bodyweight']), null);

  const muscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'glutes'];
  assert.equal(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: muscles,
    exercises: muscles.map((primaryMuscle) => ({ ...exercise, primaryMuscle })),
  }), ['bodyweight']), null);

  const maximumMuscles = muscles.slice(0, 6);
  assert.ok(validateGeneratedWorkout(generatedWorkout({
    targetMuscles: maximumMuscles,
    exercises: maximumMuscles.map((primaryMuscle) => ({ ...exercise, primaryMuscle })),
  }), ['bodyweight']));
  assert.ok(validateGeneratedWorkout(generatedWorkout({
    exercises: Array.from({ length: 10 }, (_, index) => ({ ...exercise, name: `Squat ${index}`, setsCount: 1 })),
  }), ['bodyweight']));
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
  const validated = validateGeneratedWorkout(generatedWorkout({
    difficulty: 'Hardcore',
    targetDurationMinutes: 45,
    exercises: Array.from({ length: 4 }, (_, index) => ({
      ...generatedWorkout().exercises[0],
      name: `Squat variation ${index}`,
      setsCount: 6,
    })),
  }), ['bodyweight']);
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
