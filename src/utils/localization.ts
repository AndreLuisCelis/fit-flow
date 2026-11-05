import { MuscleGroup } from '../types/workout';

const muscleNamesPt: Record<MuscleGroup, string> = {
  chest: 'Peitoral',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Quadríceps',
  hamstrings: 'Posteriores da coxa',
  calves: 'Panturrilhas',
  core: 'Abdômen e core',
  glutes: 'Glúteos',
};

export function getMuscleLabel(muscle: MuscleGroup | string, language: 'pt' | 'en'): string {
  if (language === 'en') return muscle;
  if (muscle === 'arms') return 'Braços';
  return muscle in muscleNamesPt ? muscleNamesPt[muscle as MuscleGroup] : muscle;
}