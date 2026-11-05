import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createUserProfileStore,
  USER_PROFILE_STORAGE_KEY,
  validateUserProfile,
} from './userProfile';
import { UserProfile } from '../types/profile';

const validProfile: UserProfile = {
  name: 'Ana Silva',
  goals: ['muscle_gain', 'fitness'],
  experience: 'beginner',
  equipment: ['bodyweight'],
};

function createMemoryStorage(initialValue: string | null = null) {
  const values = new Map<string, string>();
  if (initialValue !== null) values.set(USER_PROFILE_STORAGE_KEY, initialValue);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

test('accepts a valid profile and optional measurements may be empty', () => {
  const result = validateUserProfile(validProfile);
  assert.equal(result.valid, true);
  if (result.valid) assert.deepEqual(result.profile, validProfile);
});

test('reports required fields and rejects implausible measurements', () => {
  const result = validateUserProfile({
    ...validProfile,
    name: 'A',
    goals: ['unknown'],
    experience: undefined,
    equipment: [],
    weightKg: 500,
    heightCm: 50,
  });
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.errors.name);
    assert.ok(result.errors.goals);
    assert.ok(result.errors.experience);
    assert.ok(result.errors.equipment);
    assert.ok(result.errors.weightKg);
    assert.ok(result.errors.heightCm);
  }
});

test('saves a profile and restores it after creating a new store instance', () => {
  const storage = createMemoryStorage();
  const firstInstance = createUserProfileStore(() => storage);
  firstInstance.save(validProfile);

  const restartedInstance = createUserProfileStore(() => storage);
  assert.deepEqual(restartedInstance.load(), { status: 'valid', profile: validProfile });
});

test('allows editing a saved profile', () => {
  const storage = createMemoryStorage();
  const store = createUserProfileStore(() => storage);
  store.save(validProfile);
  const updated = store.save({ ...validProfile, name: 'Ana Costa', weightKg: 68 });
  assert.equal(updated.name, 'Ana Costa');
  assert.equal(store.load().status, 'valid');
});

test('recovers gracefully when stored profile is invalid or unreadable', () => {
  const corruptStore = createUserProfileStore(() => createMemoryStorage('{not-json'));
  assert.deepEqual(corruptStore.load(), { status: 'invalid' });

  const invalidProfileStore = createUserProfileStore(() => createMemoryStorage(JSON.stringify({ name: 'No objective' })));
  assert.deepEqual(invalidProfileStore.load(), { status: 'invalid' });

  const failingStore = createUserProfileStore(() => {
    throw new Error('storage unavailable');
  });
  assert.deepEqual(failingStore.load(), { status: 'error' });
});

test('preserves form data by reporting storage write failures', () => {
  const store = createUserProfileStore(() => ({
    getItem: () => null,
    setItem: () => { throw new Error('quota exceeded'); },
  }));
  assert.throws(() => store.save(validProfile), /Seus dados continuam no formulário/);
});

test('migrates an older profile with one goal and accepts multiple selected goals', () => {
  const legacyProfile = { ...validProfile, goals: undefined, goal: 'fitness' };
  const store = createUserProfileStore(() => createMemoryStorage(JSON.stringify(legacyProfile)));
  assert.deepEqual(store.load(), {
    status: 'valid',
    profile: { ...validProfile, goals: ['fitness'] },
  });

  const result = validateUserProfile({ ...validProfile, goals: ['weight_loss', 'health'] });
  assert.equal(result.valid, true);
  if (result.valid) assert.deepEqual(result.profile.goals, ['weight_loss', 'health']);
});