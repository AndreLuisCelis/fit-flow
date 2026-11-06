import { WorkoutRoutine, Exercise, CompletedSessionSummary } from '../types/workout';
import { PRESET_ROUTINES, EXERCISE_DATABASE } from '../data/presetRoutines';
import { isDemoSession, filterRealSessions } from '../services/workoutHistory';

const DB_NAME = 'FitFlowDB';
const DB_VERSION = 1;

export class FitFlowDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private idbFactory?: IDBFactory) {}

  private getIdb(): IDBFactory | undefined {
    if (this.idbFactory) return this.idbFactory;
    if (typeof window !== 'undefined' && window.indexedDB) {
      return window.indexedDB;
    }
    return undefined;
  }

  public resetConnection(): void {
    this.dbPromise = null;
  }

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const idb = this.getIdb();
      if (!idb) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Routines / Treinos
        if (!db.objectStoreNames.contains('routines')) {
          db.createObjectStore('routines', { keyPath: 'id' });
        }

        // Store 2: Exercises / Exercícios
        if (!db.objectStoreNames.contains('exercises')) {
          db.createObjectStore('exercises', { keyPath: 'id' });
        }

        // Store 3: History / Histórico de Sessões
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('by_date', 'date');
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        // Seed default exercises and preset routines if empty (never seeds demo sessions)
        await this.seedDefaultsIfEmpty(db);
        // Clean up legacy fictitious sessions from existing installations (safe & idempotent)
        await this.migrateLegacyDemoSessions(db);
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async seedDefaultsIfEmpty(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(['routines', 'exercises'], 'readwrite');
        const routinesStore = tx.objectStore('routines');
        const exercisesStore = tx.objectStore('exercises');

        // Add new definitions and migrate localized notes/equipment requirements.
        Object.values(EXERCISE_DATABASE).forEach((exercise) => {
          const existingRequest = exercisesStore.get(exercise.id);
          existingRequest.onsuccess = () => {
            const existing = existingRequest.result as Exercise | undefined;
            if (!existing) {
              exercisesStore.add(exercise);
            } else {
              let changed = false;
              if (exercise.notesPt && existing.notesPt !== exercise.notesPt) {
                existing.notesPt = exercise.notesPt;
                changed = true;
              }
              if (
                exercise.equipmentRequired?.length &&
                JSON.stringify(existing.equipmentRequired) !== JSON.stringify(exercise.equipmentRequired)
              ) {
                existing.equipmentRequired = exercise.equipmentRequired;
                changed = true;
              }
              if (changed) exercisesStore.put(existing);
            }
          };
        });

        const countReq = routinesStore.count();
        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            // Seed preset routines
            PRESET_ROUTINES.forEach((r) =>
              routinesStore.put({ ...r, createdAt: r.createdAt || new Date().toISOString() }),
            );
          }
        };

        const exCountReq = exercisesStore.count();
        exCountReq.onsuccess = () => {
          if (exCountReq.result === 0) {
            // Seed preset exercises
            Object.values(EXERCISE_DATABASE).forEach((ex) => exercisesStore.put(ex));
          }
        };

        // Note: Production history store is NEVER seeded with fictitious/demo workouts.
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Safe and idempotent migration for existing installations.
   * Scans the history object store and removes legacy demonstration records (sess-seed-1, sess-seed-2),
   * while completely preserving all legitimate user sessions.
   */
  public async migrateLegacyDemoSessions(db: IDBDatabase): Promise<{ removed: number; preserved: number }> {
    return new Promise((resolve) => {
      try {
        if (!db.objectStoreNames.contains('history')) {
          resolve({ removed: 0, preserved: 0 });
          return;
        }

        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');
        const getAllReq = store.getAll();
        let removed = 0;
        let preserved = 0;

        getAllReq.onsuccess = () => {
          const sessions = (getAllReq.result || []) as CompletedSessionSummary[];
          for (const session of sessions) {
            if (isDemoSession(session)) {
              store.delete(session.id);
              removed++;
            } else {
              preserved++;
            }
          }
        };

        tx.oncomplete = () => resolve({ removed, preserved });
        tx.onerror = () => resolve({ removed: 0, preserved: 0 });
      } catch {
        resolve({ removed: 0, preserved: 0 });
      }
    });
  }

  // --- Routines (Treinos) ---
  public async getRoutines(): Promise<WorkoutRoutine[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routines', 'readonly');
      const store = tx.objectStore('routines');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveRoutine(routine: WorkoutRoutine): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routines', 'readwrite');
      const store = tx.objectStore('routines');
      const request = store.put(routine);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteRoutine(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('routines', 'readwrite');
      const store = tx.objectStore('routines');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Exercises (Exercícios) ---
  public async getExercises(): Promise<Exercise[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exercises', 'readonly');
      const store = tx.objectStore('exercises');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveExercise(exercise: Exercise): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exercises', 'readwrite');
      const store = tx.objectStore('exercises');
      const request = store.put(exercise);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- History (Histórico de Treinos) ---
  public async getHistory(): Promise<CompletedSessionSummary[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result || []) as CompletedSessionSummary[];
        // Filter out any demonstration sessions defensively
        const realSessions = filterRealSessions(results);
        // Sort newest first
        realSessions.sort((a, b) => (a.date < b.date ? 1 : -1));
        resolve(realSessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addHistory(session: CompletedSessionSummary): Promise<void> {
    // Prevent fictitious / demo sessions from entering production storage
    if (isDemoSession(session)) {
      console.warn('[FitFlowDB] Tentativa de salvar sessão demonstrativa no histórico de produção bloqueada.');
      return;
    }

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteHistory(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clearHistory(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export function createFitFlowDatabase(idbFactory?: IDBFactory): FitFlowDatabase {
  return new FitFlowDatabase(idbFactory);
}

export const fitFlowDB = new FitFlowDatabase();
