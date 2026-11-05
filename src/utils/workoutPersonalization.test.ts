import assert from 'node:assert/strict';
import test from 'node:test';
import { Exercise, WorkoutRoutine } from '../types/workout';
import { UserProfile } from '../types/profile';
import { adaptGeneratedWorkout, isRoutineCompatible, rankCompatibleRoutines, validateGeneratedWorkout } from './workoutPersonalization';

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
