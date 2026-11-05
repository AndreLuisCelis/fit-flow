import {
  EXPERIENCE_LEVELS,
  PROFILE_GOALS,
  TRAINING_EQUIPMENT,
  UserProfile,
  UserProfileErrors,
} from '../types/profile';

export const USER_PROFILE_STORAGE_KEY = 'fitflow_profile_v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type UserProfileReadResult =
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'error' }
  | { status: 'valid'; profile: UserProfile };

export type UserProfileValidationResult =
  | { valid: true; profile: UserProfile }
  | { valid: false; errors: UserProfileErrors };

function getBrowserStorage(): KeyValueStorage {
  if (typeof window === 'undefined') {
    throw new Error('Armazenamento local indisponível.');
  }
  return window.localStorage;
}

function optionalNumber(value: unknown): number | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

export function validateUserProfile(value: unknown): UserProfileValidationResult {
  const errors: UserProfileErrors = {};
  const candidate = typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {};

  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  if (name.length < 2 || name.length > 60) {
    errors.name = 'Informe um nome com 2 a 60 caracteres.';
  }

  const weightKg = optionalNumber(candidate.weightKg);
  const normalizedWeightKg = weightKg === null ? undefined : weightKg;
  if (weightKg === null || (weightKg !== undefined && (weightKg < 25 || weightKg > 350))) {
    errors.weightKg = 'Informe um peso entre 25 e 350 kg ou deixe o campo vazio.';
  }

  const heightCm = optionalNumber(candidate.heightCm);
  const normalizedHeightCm = heightCm === null ? undefined : heightCm;
  if (heightCm === null || (heightCm !== undefined && (heightCm < 100 || heightCm > 250))) {
    errors.heightCm = 'Informe uma altura entre 100 e 250 cm ou deixe o campo vazio.';
  }

  const goalInput = Array.isArray(candidate.goals)
    ? candidate.goals
    : candidate.goal === undefined ? [] : [candidate.goal];
  const goals = [...new Set(goalInput.filter(
    (option): option is UserProfile['goals'][number] =>
      typeof option === 'string' && PROFILE_GOALS.includes(option as UserProfile['goals'][number]),
  ))];
  if (goals.length === 0 || !goalInput.every(option =>
    typeof option === 'string' && PROFILE_GOALS.includes(option as UserProfile['goals'][number]),
  )) errors.goals = 'Selecione pelo menos um objetivo válido.';

  const experience = EXPERIENCE_LEVELS.find(option => option === candidate.experience);
  if (!experience) errors.experience = 'Selecione um nível de experiência válido.';

  const equipmentInput = Array.isArray(candidate.equipment) ? candidate.equipment : [];
  const equipment = [...new Set(equipmentInput.filter(
    (option): option is UserProfile['equipment'][number] =>
      typeof option === 'string' && TRAINING_EQUIPMENT.includes(option as UserProfile['equipment'][number]),
  ))];
  if (equipmentInput.length !== equipment.length || equipment.length === 0) {
    errors.equipment = 'Selecione pelo menos um equipamento disponível.';
  }

  if (Object.keys(errors).length > 0 || goals.length === 0 || !experience) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    profile: {
      name,
      ...(normalizedWeightKg === undefined ? {} : { weightKg: normalizedWeightKg }),
      ...(normalizedHeightCm === undefined ? {} : { heightCm: normalizedHeightCm }),
      goals,
      experience,
      equipment,
    },
  };
}

export function createUserProfileStore(
  storageProvider: () => KeyValueStorage = getBrowserStorage,
) {
  return {
    load(): UserProfileReadResult {
      try {
        const serialized = storageProvider().getItem(USER_PROFILE_STORAGE_KEY);
        if (serialized === null) return { status: 'missing' };

        let parsed: unknown;
        try {
          parsed = JSON.parse(serialized);
        } catch {
          return { status: 'invalid' };
        }

        const result = validateUserProfile(parsed);
        return result.valid
          ? { status: 'valid', profile: result.profile }
          : { status: 'invalid' };
      } catch {
        return { status: 'error' };
      }
    },

    save(value: unknown): UserProfile {
      const result = validateUserProfile(value);
      if (!result.valid) {
        throw new Error('Revise os campos destacados antes de salvar o perfil.');
      }

      try {
        storageProvider().setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(result.profile));
        return result.profile;
      } catch {
        throw new Error('Não foi possível salvar o perfil neste dispositivo. Seus dados continuam no formulário.');
      }
    },
  };
}

export const userProfileStore = createUserProfileStore();