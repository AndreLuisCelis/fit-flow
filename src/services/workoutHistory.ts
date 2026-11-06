import {
  CompletedExerciseSummary,
  CompletedSessionSummary,
  Exercise,
  MuscleGroup,
  PersonalRecordAchievement,
  SetEntry,
  WorkoutRoutine,
} from '../types/workout';

export const KNOWN_DEMO_SESSION_IDS = ['sess-seed-1', 'sess-seed-2'] as const;

/**
 * Identifies whether a session is a demonstration / fictitious seed.
 * A session is considered demo if:
 * 1. It explicitly carries `isDemo === true`.
 * 2. Its ID matches known seed IDs ('sess-seed-1', 'sess-seed-2') or prefix 'sess-seed-'.
 * 3. It matches the exact historical seed signature (Push Alfa 30/10/2026 or Leg Hiper-Drive 28/10/2026 with exact seed volume and duration).
 */
export function isDemoSession(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  const candidate = session as Partial<CompletedSessionSummary>;

  if (candidate.isDemo === true) {
    return true;
  }

  if (typeof candidate.id === 'string') {
    if (
      candidate.id === 'sess-seed-1' ||
      candidate.id === 'sess-seed-2' ||
      candidate.id.startsWith('sess-seed-')
    ) {
      return true;
    }
  }

  // Safety signature match for legacy seeds
  if (
    candidate.routineTitle === 'Push Alfa: Hipertrofia & Ombros' &&
    candidate.date === '2026-10-30' &&
    candidate.totalVolumeKg === 10450
  ) {
    return true;
  }

  if (
    candidate.routineTitle === 'Leg Hiper-Drive: Quadríceps & Glúteos' &&
    candidate.date === '2026-10-28' &&
    candidate.totalVolumeKg === 13500
  ) {
    return true;
  }

  return false;
}

/**
 * Filters out all demonstration and fictitious sessions, guaranteeing that only genuine user activities are returned.
 */
export function filterRealSessions(sessions: CompletedSessionSummary[]): CompletedSessionSummary[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.filter((s) => !isDemoSession(s));
}

/**
 * Calculates total volume moved in kg, strictly ignoring demo sessions.
 */
export function calculateRealTotalVolume(sessions: CompletedSessionSummary[]): number {
  return filterRealSessions(sessions).reduce((acc, s) => acc + (Number.isFinite(s.totalVolumeKg) ? s.totalVolumeKg : 0), 0);
}

export interface WeeklyVolumeDay {
  date: string;
  volumeKg: number;
  sessionCount: number;
}

export interface ExerciseProgressionPoint {
  date: string;
  weightKg: number;
  reps: number;
}

export interface RecordedExercisePeak extends ExerciseProgressionPoint {
  exerciseId: string;
}

export type ExercisePreviousBest = NonNullable<SetEntry['previousBest']>;

function isValidRecordedSet(set: { weight: number; reps: number }): boolean {
  return Number.isFinite(set.weight) && set.weight >= 0 &&
    Number.isInteger(set.reps) && set.reps > 0;
}

/**
 * Builds comparison baselines from actual sets in real sessions.
 */
export function getRealExercisePreviousBest(
  sessions: CompletedSessionSummary[],
  exerciseId: string,
): ExercisePreviousBest | undefined {
  const sets = filterRealSessions(sessions)
    .flatMap((session) => session.exerciseDetails || [])
    .filter((exercise) => exercise.exerciseId === exerciseId)
    .flatMap((exercise) => exercise.sets)
    .filter(isValidRecordedSet);
  if (sets.length === 0) return undefined;

  const bestSet = sets.reduce((best, set) =>
    set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) ? set : best,
  );
  const repsByWeight: Record<string, number> = {};

  sets.forEach(({ weight, reps }) => {
    repsByWeight[String(weight)] = Math.max(repsByWeight[String(weight)] ?? 0, reps);
  });

  return { ...bestSet, repsByWeight };
}

export function getPersonalRecordType(
  set: Pick<SetEntry, 'weight' | 'reps'>,
  previousBest?: ExercisePreviousBest,
): PersonalRecordAchievement['type'][] {
  if (!previousBest || !isValidRecordedSet(set)) return [];
  const achievements: PersonalRecordAchievement['type'][] = [];
  const previousRepsAtWeight = previousBest.repsByWeight?.[String(set.weight)];

  if (set.weight > previousBest.weight && set.reps >= previousBest.reps) {
    achievements.push('load');
  }
  if (previousRepsAtWeight !== undefined && set.reps > previousRepsAtWeight) {
    achievements.push('reps');
  }
  return achievements;
}

export function calculatePersonalRecordAchievements(
  history: CompletedSessionSummary[],
  completedExercises: CompletedExerciseSummary[],
  exerciseNames: Record<string, string>,
  date: string,
): PersonalRecordAchievement[] {
  const achievements: PersonalRecordAchievement[] = [];

  completedExercises.forEach((exercise) => {
    const previousBest = getRealExercisePreviousBest(history, exercise.exerciseId);
    if (!previousBest) return;

    const validSets = exercise.sets.filter(isValidRecordedSet);
    const repsCounts = new Set(validSets.map((set) => set.reps));
    const weights = new Set(validSets.map((set) => set.weight));

    repsCounts.forEach((reps) => {
      const currentBestWeight = Math.max(...validSets.filter((set) => set.reps === reps).map((set) => set.weight));
      if (getPersonalRecordType({ weight: currentBestWeight, reps }, previousBest).includes('load')) {
        achievements.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exerciseNames[exercise.exerciseId] || exercise.exerciseId,
          type: 'load',
          weightKg: currentBestWeight,
          reps,
          date,
        });
      }
    });

    weights.forEach((weightKg) => {
      const currentBestReps = Math.max(...validSets.filter((set) => set.weight === weightKg).map((set) => set.reps));
      if (getPersonalRecordType({ weight: weightKg, reps: currentBestReps }, previousBest).includes('reps')) {
        achievements.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exerciseNames[exercise.exerciseId] || exercise.exerciseId,
          type: 'reps',
          weightKg,
          reps: currentBestReps,
          date,
        });
      }
    });
  });

  return achievements;
}

export function formatPersonalRecordAchievements(
  achievements: PersonalRecordAchievement[],
  language: 'pt' | 'en',
  unit: 'kg' | 'lbs',
): string[] {
  return achievements.map((record) => {
    const weight = unit === 'lbs'
      ? `${Math.round(record.weightKg * 2.20462)} lbs`
      : `${record.weightKg} kg`;
    const typeLabel = record.type === 'load'
      ? language === 'pt' ? 'recorde de carga' : 'load record'
      : language === 'pt' ? 'recorde de repetições' : 'rep record';
    return `${record.exerciseName} — ${typeLabel}: ${weight} × ${record.reps}`;
  });
}

export function extractRealPersonalRecordAchievements(
  sessions: CompletedSessionSummary[],
): PersonalRecordAchievement[] {
  const bestRecords = new Map<string, PersonalRecordAchievement>();
  filterRealSessions(sessions).forEach((session) => {
    (session.personalRecords || []).forEach((record) => {
      const key = `${record.exerciseId}:${record.type}`;
      const current = bestRecords.get(key);
      const isBetter = !current || (record.type === 'load'
        ? record.weightKg > current.weightKg || (record.weightKg === current.weightKg && record.reps > current.reps)
        : record.reps > current.reps || (record.reps === current.reps && record.weightKg > current.weightKg));
      if (isBetter) bestRecords.set(key, record);
    });
  });
  return Array.from(bestRecords.values()).sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName) || a.type.localeCompare(b.type),
  );
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Returns actual daily volume for the seven calendar days ending on referenceDate.
 * Zero-volume days represent days with no recorded sessions, not generated workout data.
 */
export function calculateRealWeeklyVolume(
  sessions: CompletedSessionSummary[],
  referenceDate = new Date().toISOString().slice(0, 10),
): WeeklyVolumeDay[] {
  const startDate = addDays(referenceDate, -6);
  const realSessions = filterRealSessions(sessions).filter(
    (session) => session.date >= startDate && session.date <= referenceDate,
  );
  const volumeByDate = new Map<string, WeeklyVolumeDay>();

  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(startDate, offset);
    volumeByDate.set(date, { date, volumeKg: 0, sessionCount: 0 });
  }

  realSessions.forEach((session) => {
    const day = volumeByDate.get(session.date);
    if (!day) return;
    day.volumeKg += Number.isFinite(session.totalVolumeKg) ? session.totalVolumeKg : 0;
    day.sessionCount++;
  });

  return Array.from(volumeByDate.values());
}

/**
 * Builds one maximum-load point per real session using recorded sets only.
 */
export function buildRealExerciseProgression(
  sessions: CompletedSessionSummary[],
  exerciseId: string,
): ExerciseProgressionPoint[] {
  return filterRealSessions(sessions)
    .map((session) => {
      const sets = (session.exerciseDetails || [])
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .flatMap((exercise) => exercise.sets)
        .filter((set) => Number.isFinite(set.weight) && set.weight > 0 && Number.isFinite(set.reps) && set.reps > 0);
      if (sets.length === 0) return null;

      const peak = sets.reduce((highest, current) => current.weight > highest.weight ? current : highest);
      return { date: session.date, weightKg: peak.weight, reps: peak.reps, sessionId: session.id };
    })
    .filter((point): point is ExerciseProgressionPoint & { sessionId: string } => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.sessionId.localeCompare(b.sessionId))
    .map(({ date, weightKg, reps }) => ({ date, weightKg, reps }));
}

/**
 * Returns the date of the most recent real workout with completed sets for a muscle.
 * This does not infer a physiological recovery percentage.
 */
export function getLastRealMuscleStimulus(
  sessions: CompletedSessionSummary[],
  muscle: MuscleGroup,
): string | null {
  return filterRealSessions(sessions)
    .filter((session) => (session.exerciseDetails || []).some((exercise) =>
      (exercise.primaryMuscle === muscle || exercise.secondaryMuscles?.includes(muscle)) &&
      exercise.sets.some((set) => Number.isFinite(set.reps) && set.reps > 0),
    ))
    .map((session) => session.date)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

/**
 * Finds the highest positively loaded set recorded for each exercise.
 */
export function buildRealExercisePeaks(sessions: CompletedSessionSummary[]): RecordedExercisePeak[] {
  const peaks = new Map<string, RecordedExercisePeak>();

  filterRealSessions(sessions).forEach((session) => {
    (session.exerciseDetails || []).forEach((exercise: CompletedExerciseSummary) => {
      exercise.sets.forEach((set) => {
        if (!Number.isFinite(set.weight) || set.weight <= 0 || !Number.isFinite(set.reps) || set.reps <= 0) return;
        const current = peaks.get(exercise.exerciseId);
        if (!current || set.weight > current.weightKg) {
          peaks.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            date: session.date,
            weightKg: set.weight,
            reps: set.reps,
          });
        }
      });
    });
  });

  return Array.from(peaks.values()).sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
}

/**
 * Calculates total count of real sessions.
 */
export function calculateRealSessionCount(sessions: CompletedSessionSummary[]): number {
  return filterRealSessions(sessions).length;
}

/**
 * Calculates total XP earned, strictly from real sessions.
 */
export function calculateRealTotalXp(sessions: CompletedSessionSummary[]): number {
  return filterRealSessions(sessions).reduce((acc, s) => acc + (s.xpEarned || 0), 0);
}

/**
 * Extracts personal records (PRs) exclusively from real sessions.
 */
export function extractRealPersonalRecords(sessions: CompletedSessionSummary[]): string[] {
  const prs: string[] = [];
  filterRealSessions(sessions).forEach((session) => {
    if (Array.isArray(session.prsAchieved)) {
      session.prsAchieved.forEach((pr) => {
        if (pr && !prs.includes(pr)) {
          prs.push(pr);
        }
      });
    }
  });
  return prs;
}

/**
 * Calculates user streak based strictly on real workout session dates.
 * Dates are sorted unique and consecutive days before today (or given reference date) are counted.
 */
export function calculateRealStreak(sessions: CompletedSessionSummary[], referenceDateStr?: string): number {
  const real = filterRealSessions(sessions);
  if (real.length === 0) return 0;

  const uniqueDates = Array.from(new Set(real.map((s) => s.date).filter(Boolean)))
    .sort()
    .reverse();
  if (uniqueDates.length === 0) return 0;

  const todayStr = referenceDateStr || new Date().toISOString().split('T')[0];
  const mostRecent = uniqueDates[0];

  const refTime = new Date(todayStr + 'T00:00:00').getTime();
  const mostRecentTime = new Date(mostRecent + 'T00:00:00').getTime();
  const diffDays = Math.round((refTime - mostRecentTime) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    return 0; // Streak broken if older than yesterday
  }

  let streak = 1;
  let currentDate = new Date(mostRecent + 'T00:00:00');

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i] + 'T00:00:00');
    const dayDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff === 1) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Extracts frequent exercises exclusively from real workouts.
 */
export function extractRealFrequentExercises(
  sessions: CompletedSessionSummary[],
  routines: WorkoutRoutine[],
  exercises: Exercise[],
  language: 'pt' | 'en' = 'pt',
): { name: string; count: number }[] {
  const realSessions = filterRealSessions(sessions);
  const exerciseNameMap: Record<string, string> = {};
  exercises.forEach((ex) => {
    exerciseNameMap[ex.id] = language === 'pt' ? ex.namePt || ex.name : ex.name;
  });

  const freqMap: Record<string, number> = {};

  realSessions.forEach((session) => {
    if (session.prsAchieved) {
      session.prsAchieved.forEach((pr) => {
        const cleaned = pr.split(/\d/)[0].trim();
        if (cleaned) {
          freqMap[cleaned] = (freqMap[cleaned] || 0) + 2;
        }
      });
    }

    const matchedRoutine = routines.find(
      (r) => r.title === session.routineTitle || r.titlePt === session.routineTitle,
    );
    if (matchedRoutine && matchedRoutine.exercises) {
      matchedRoutine.exercises.forEach((exInR) => {
        const name = exerciseNameMap[exInR.exerciseId] || exInR.exerciseId;
        freqMap[name] = (freqMap[name] || 0) + 1;
      });
    }
  });

  return Object.entries(freqMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
