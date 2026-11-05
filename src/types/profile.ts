export const PROFILE_GOALS = ['weight_loss', 'muscle_gain', 'fitness', 'health'] as const;
export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const TRAINING_EQUIPMENT = ['bodyweight', 'pull_up_bar', 'barbell', 'dumbbell', 'cable', 'machine', 'bands'] as const;

export type ProfileGoal = (typeof PROFILE_GOALS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type TrainingEquipment = (typeof TRAINING_EQUIPMENT)[number];

export interface UserProfile {
  name: string;
  weightKg?: number;
  heightCm?: number;
  goals: ProfileGoal[];
  experience: ExperienceLevel;
  equipment: TrainingEquipment[];
}

export type UserProfileField = keyof UserProfile;
export type UserProfileErrors = Partial<Record<UserProfileField, string>>;