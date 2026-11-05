import { WorkoutRoutine, Exercise, CompletedSessionSummary } from '../types/workout';
import { PRESET_ROUTINES, EXERCISE_DATABASE } from '../data/presetRoutines';

const DB_NAME = 'FitFlowDB';
const DB_VERSION = 1;

class FitFlowDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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
        // Seed default exercises and preset routines if empty
        await this.seedDefaultsIfEmpty(db);
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
        const tx = db.transaction(['routines', 'exercises', 'history'], 'readwrite');
        const routinesStore = tx.objectStore('routines');
        const exercisesStore = tx.objectStore('exercises');
        const historyStore = tx.objectStore('history');

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
              if (exercise.equipmentRequired?.length && JSON.stringify(existing.equipmentRequired) !== JSON.stringify(exercise.equipmentRequired)) {
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
            PRESET_ROUTINES.forEach((r) => routinesStore.put(r));
          }
        };

        const exCountReq = exercisesStore.count();
        exCountReq.onsuccess = () => {
          if (exCountReq.result === 0) {
            // Seed preset exercises
            Object.values(EXERCISE_DATABASE).forEach((ex) => exercisesStore.put(ex));
          }
        };

        const histCountReq = historyStore.count();
        histCountReq.onsuccess = () => {
          if (histCountReq.result === 0) {
            // Seed sample past sessions
            const sampleHistory: CompletedSessionSummary[] = [
              {
                id: 'sess-seed-1',
                date: '2026-10-30',
                routineTitle: 'Push Alfa: Hipertrofia & Ombros',
                durationSeconds: 3120,
                totalVolumeKg: 10450,
                setsCount: 17,
                repsCount: 154,
                xpEarned: 350,
                prsAchieved: ['Supino Reto 90kg × 8'],
              },
              {
                id: 'sess-seed-2',
                date: '2026-10-28',
                routineTitle: 'Leg Hiper-Drive: Quadríceps & Glúteos',
                durationSeconds: 3400,
                totalVolumeKg: 13500,
                setsCount: 18,
                repsCount: 168,
                xpEarned: 400,
                prsAchieved: ['Agachamento 120kg × 6'],
              },
            ];
            sampleHistory.forEach((h) => historyStore.put(h));
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); // continue gracefully even if seeding fails
      } catch {
        resolve();
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
        // Sort newest first
        results.sort((a, b) => (a.date < b.date ? 1 : -1));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addHistory(session: CompletedSessionSummary): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const fitFlowDB = new FitFlowDatabase();
