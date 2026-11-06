import { CompletedSessionSummary, Exercise, WorkoutRoutine } from '../types/workout';

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
  return filterRealSessions(sessions).reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);
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
