import { MuscleGroup } from '../types/workout';

// Canonical muscle group names in Portuguese
const muscleNamesPt: Record<string, string> = {
  // Standard MuscleGroup
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
  arms: 'Braços',

  // Common aliases and variations
  quadriceps: 'Quadríceps',
  quad: 'Quadríceps',
  hamstring: 'Posteriores da coxa',
  calf: 'Panturrilhas',
  glute: 'Glúteos',
  gluteus: 'Glúteos',
  lats: 'Dorsais',
  latissimus: 'Dorsais',
  traps: 'Trapézio',
  trapezius: 'Trapézio',
  delts: 'Deltoides',
  deltoids: 'Deltoides',
  abs: 'Abdômen',
  abdominals: 'Abdômen',
  forearms: 'Antebraços',
  forearm: 'Antebraços',
  pectoral: 'Peitoral',
  pectorals: 'Peitoral',
  pecs: 'Peitoral',
  upper_back: 'Costas Superior',
  'upper back': 'Costas Superior',
  lower_back: 'Lombar',
  'lower back': 'Lombar',
  lumbar: 'Lombar',
  legs: 'Pernas',
  leg: 'Pernas',
  'full body': 'Corpo Inteiro',
  full_body: 'Corpo Inteiro',
};

// Canonical category / equipment names in Portuguese
const categoryNamesPt: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Halteres',
  cable: 'Polia / Cabo',
  cables: 'Polia / Cabos',
  machine: 'Máquina',
  bodyweight: 'Peso Corporal',
  bands: 'Elásticos',
  band: 'Elástico',
  kettlebell: 'Kettlebell',
  push: 'Push (Empurrar)',
  pull: 'Pull (Puxar)',
  legs: 'Legs (Pernas)',
  upper: 'Upper (Superior)',
  lower: 'Lower (Inferior)',
  'full body': 'Corpo Inteiro',
  'cardio & core': 'Cardio & Abdômen',
};

// Common coaching note translations (exact phrase or keyword fallbacks)
const noteTranslationsPt: Record<string, string> = {
  'Keep shoulder blades retracted and drive feet firmly through the floor.':
    'Mantenha as escápulas retraídas e firme os pés no chão.',
  '30 degree bench angle, deep stretch at bottom position.':
    'Deixe o banco a 30 graus e alongue bem o peitoral na parte baixa do movimento.',
  'Squeeze pecs for 1s at peak contraction.':
    'Contraia o peitoral por 1 segundo no ponto de maior contração.',
  'Lock glutes and core, press vertically in tight bar path.':
    'Contraia os glúteos e o abdômen; empurre a barra para cima em uma trajetória firme.',
  'Slight torso lean, lead with elbows up to shoulder plane.':
    'Incline levemente o tronco e conduza o movimento com os cotovelos até a altura dos ombros.',
  'Flare rope outward at full extension for lateral head peak.':
    'Afaste as pontas da corda ao estender os braços para contrair a parte lateral do tríceps.',
  'Pull slack out of bar, brace abdomen, explode through hips.':
    'Retire a folga da barra, firme o abdômen e estenda o quadril com força.',
  'Depress scapula first, pull bar to upper clavicle.':
    'Abaixe as escápulas primeiro e puxe a barra em direção à parte superior do peito.',
  'Torso locked at 45 degrees, pull to lower ribcage.':
    'Mantenha o tronco estável a 45 graus e puxe a barra em direção às costelas inferiores.',
  'Elbows pinned to sides, zero back momentum.':
    'Mantenha os cotovelos junto ao tronco e evite impulsionar o movimento com as costas.',
  'Hit parallel depth with knees tracking toes.':
    'Desça até as coxas ficarem paralelas ao chão, mantendo os joelhos alinhados com os pés.',
  'Hips push backward, soft knee bend, huge hamstring tension.':
    'Leve o quadril para trás, mantenha os joelhos levemente flexionados e alongue os posteriores da coxa.',
  'Full range without lower back lifting off pad.':
    'Use toda a amplitude sem tirar a lombar do encosto.',
  'Pause 2s at bottom stretch and 1s at peak contraction.':
    'Pause por 2 segundos na parte baixa e por 1 segundo no ponto de contração máxima.',
  'Posterior pelvic tilt at apex, avoid swinging.':
    'Faça uma retroversão pélvica no ponto alto e evite balançar o corpo.',
  'Core tight, lower chest to floor with elbows 45 deg.':
    'Abdômen firme, desça o peito até o chão com os cotovelos a 45 graus.',
  'Keep chest tall, push knees out over toes.':
    'Mantenha o tronco ereto e projete os joelhos na direção da ponta dos pés.',
  'Step back smoothly, keep front knee stacked.':
    'Dê o passo para trás de forma controlada, mantendo o joelho da frente alinhado.',
  'Keep ribs down and pause briefly at the top.':
    'Mantenha as costelas abaixadas e faça uma breve pausa no ponto alto.',
  'Keep the chest lightly raised and move arms slowly.':
    'Eleve levemente o peito e mova os braços devagar.',
  'Anchor the band securely and pull elbows toward the ribs.':
    'Prenda o elástico com segurança e puxe os cotovelos em direção às costelas.',
  'Secure the anchor behind you and press without arching the back.':
    'Prenda o elástico atrás de você e empurre sem arquear as costas.',
  'Maintain band tension and keep knees tracking over toes.':
    'Mantenha o elástico tensionado e alinhe os joelhos com os dedos dos pés.',
};

export function getMuscleLabel(muscle: MuscleGroup | string | undefined | null, language: 'pt' | 'en' = 'pt'): string {
  if (!muscle) return '';
  if (language === 'en') return String(muscle);
  const rawKey = String(muscle).toLowerCase().trim();
  const normalizedKey = rawKey.replace(/[-_]/g, ' ');
  return muscleNamesPt[rawKey] || muscleNamesPt[normalizedKey] || String(muscle);
}

export function getCategoryLabel(category: string | undefined | null, language: 'pt' | 'en' = 'pt'): string {
  if (!category) return '';
  if (language === 'en') return String(category);
  const rawKey = String(category).toLowerCase().trim();
  const normalizedKey = rawKey.replace(/[-_]/g, ' ');
  return categoryNamesPt[rawKey] || categoryNamesPt[normalizedKey] || String(category);
}

export function getExerciseNotes(
  exercise: { notes?: string; notesPt?: string } | undefined | null,
  language: 'pt' | 'en' = 'pt'
): string {
  if (!exercise) return '';
  if (language === 'en') return exercise.notes || exercise.notesPt || '';
  if (exercise.notesPt && exercise.notesPt.trim().length > 0) {
    return exercise.notesPt;
  }
  if (!exercise.notes) return '';
  const trimmed = exercise.notes.trim();
  if (noteTranslationsPt[trimmed]) {
    return noteTranslationsPt[trimmed];
  }
  return exercise.notes;
}

export function getTempoLabel(tempo: string | undefined | null, language: 'pt' | 'en' = 'pt'): string {
  if (!tempo) return '';
  if (language === 'en') return tempo;
  const lower = tempo.toLowerCase().trim();
  const tempoMap: Record<string, string> = {
    controlled: 'Controlado',
    explosive: 'Explosivo',
    slow: 'Lento e controlado',
    pause: 'Com pausa isométrica',
    'slow eccentric': 'Excêntrica lenta (3s)',
  };
  return tempoMap[lower] || tempo;
}