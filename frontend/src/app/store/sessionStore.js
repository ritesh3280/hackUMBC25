import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveSession, getSession, getAllSessions, clearAllSessions } from '../db/indexeddb';

/**
 * @typedef {{ id: string, name: string, createdAt: number }} Task
 * @typedef {"work"|"break"} IntervalKind
 * @typedef {{ t: number, focused: boolean, taskId?: string }} FocusSample
 * @typedef {{
 *   kind: IntervalKind,
 *   start: number,
 *   end?: number,
 *   taskId?: string,
 *   samples: FocusSample[],
 *   switches: number[]
 * }} Interval
 * @typedef {{
 *   id: string,
 *   startedAt: number,
 *   endedAt?: number,
 *   intervals: Interval[],
 *   presets: { workMin: number, breakMin: number, adaptive: boolean }
 * }} Session
 */

export const useSessionStore = create(
  persist(
    (set, get) => ({
      tasks: [],
      currentTaskId: null,
      session: null,
      timer: { mode: 'idle', remainingSeconds: 0, totalSeconds: 0 },
      presets: { workMin: 25, breakMin: 5, adaptive: false },

      addTask: (name) => {
        const newTask = { id: crypto.randomUUID(), name, createdAt: Date.now() };
        set((state) => ({
          tasks: [...state.tasks, newTask],
          currentTaskId: state.currentTaskId || newTask.id,
        }));
      },

      removeTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          currentTaskId: state.currentTaskId === id ? null : state.currentTaskId,
        }));
      },

      switchTask: (id) => {
        set({ currentTaskId: id });
        const { session, timer } = get();
        if (session && timer.mode === 'work') {
          get().markSwitch(Date.now());
        }
      },

      startWork: () => {
        const { currentTaskId, presets } = get();
        
        const now = Date.now();
        const session = {
          id: crypto.randomUUID(),
          startedAt: now,
          intervals: [],
          presets: { ...presets }
        };

        const workInterval = {
          kind: 'work',
          start: now,
          taskId: currentTaskId || null,
          samples: [],
          switches: []
        };

        session.intervals.push(workInterval);

        set({
          session,
          timer: {
            mode: 'work',
            remainingSeconds: presets.workMin * 60,
            totalSeconds: presets.workMin * 60
          }
        });
      },

      startBreak: () => {
        const { session, presets } = get();
        if (!session) return;

        // End current work interval
        get().endInterval();

        const now = Date.now();
        const breakInterval = {
          kind: 'break',
          start: now,
          samples: [],
          switches: []
        };

        const updatedSession = {
          ...session,
          intervals: [...session.intervals, breakInterval]
        };

        set({
          session: updatedSession,
          timer: {
            mode: 'break',
            remainingSeconds: presets.breakMin * 60,
            totalSeconds: presets.breakMin * 60
          }
        });
      },

      pause: () => {
        const { timer } = get();
        if (timer.mode === 'work' || timer.mode === 'break') {
          set({
            timer: {
              ...timer,
              mode: 'paused'
            }
          });
        }
      },

      resume: () => {
        const { timer, session } = get();
        if (timer.mode === 'paused' && session) {
          // Get the original mode from the last interval
          const lastInterval = session.intervals[session.intervals.length - 1];
          const originalMode = lastInterval.kind;
          
          set({
            timer: {
              ...timer,
              mode: originalMode
            }
          });
        }
      },

      reset: () => {
        const { session } = get();
        if (session) {
          get().endSession();
        }
        set({
          session: null,
          timer: { mode: 'idle', remainingSeconds: 0, totalSeconds: 0 },
          currentTaskId: get().tasks.length > 0 ? get().tasks[0].id : null,
        });
      },

      endSession: async () => {
        const { session } = get();
        if (session) {
          get().endInterval();
          const endedSession = { ...session, endedAt: Date.now() };
          await saveSession(endedSession);
          set({
            session: null,
            timer: { mode: 'idle', remainingSeconds: 0, totalSeconds: 0 },
            currentTaskId: get().tasks.length > 0 ? get().tasks[0].id : null,
          });
        }
      },

      appendSample: (sample) => {
        set((state) => {
          if (!state.session || state.timer.mode !== 'work') return state;

          const updatedIntervals = [...state.session.intervals];
          const currentIntervalIndex = updatedIntervals.length - 1;
          if (currentIntervalIndex < 0) return state;

          const currentInterval = { ...updatedIntervals[currentIntervalIndex] };
          currentInterval.samples = [...currentInterval.samples, { ...sample, taskId: state.currentTaskId }];
          updatedIntervals[currentIntervalIndex] = currentInterval;

          return {
            session: {
              ...state.session,
              intervals: updatedIntervals,
            },
          };
        });
      },

      markSwitch: (timestamp) => {
        set((state) => {
          if (!state.session || state.timer.mode !== 'work') return state;

          const updatedIntervals = [...state.session.intervals];
          const currentIntervalIndex = updatedIntervals.length - 1;
          if (currentIntervalIndex < 0) return state;

          const currentInterval = { ...updatedIntervals[currentIntervalIndex] };
          currentInterval.switches = [...currentInterval.switches, timestamp];
          updatedIntervals[currentIntervalIndex] = currentInterval;

          return {
            session: {
              ...state.session,
              intervals: updatedIntervals,
            },
          };
        });
      },

      endInterval: () => {
        set((state) => {
          if (!state.session || state.session.intervals.length === 0) return state;

          const updatedIntervals = [...state.session.intervals];
          const lastIntervalIndex = updatedIntervals.length - 1;
          const lastInterval = { ...updatedIntervals[lastIntervalIndex] };

          if (!lastInterval.end) {
            lastInterval.end = Date.now();
            updatedIntervals[lastIntervalIndex] = lastInterval;
          }

          return {
            session: {
              ...state.session,
              intervals: updatedIntervals,
            },
          };
        });
      },

      setPresets: (newPresets) => {
        set({ presets: { ...get().presets, ...newPresets } });
      },

      // Timer tick - called every second
      tick: () => {
        const { timer } = get();
        if (timer.mode === 'idle' || timer.mode === 'paused') {
          return;
        }
        
        if (timer.remainingSeconds <= 0) {
          if (timer.mode === 'work') {
            get().startBreak();
          } else if (timer.mode === 'break') {
            get().startWork();
          }
        } else {
          set({
            timer: {
              ...timer,
              remainingSeconds: timer.remainingSeconds - 1
            }
          });
        }
      },

      // Calculate focus metrics for current work interval
      getCurrentFocusMetrics: () => {
        const { session } = get();
        if (!session || !session.intervals.length) {
          return { focusPercent: 0, focusSeconds: 0, workSeconds: 0, longestStreak: 0 };
        }

        const currentInterval = session.intervals[session.intervals.length - 1];
        if (!currentInterval || currentInterval.kind !== 'work' || !currentInterval.samples.length) {
          return { focusPercent: 0, focusSeconds: 0, workSeconds: 0, longestStreak: 0 };
        }

        const samples = currentInterval.samples;
        const now = Date.now();
        const endTime = currentInterval.end || now;
        const workSeconds = (endTime - currentInterval.start) / 1000;

        let focusSeconds = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let lastSampleTime = currentInterval.start;

        // Process samples to calculate focus metrics
        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i];
          const sampleTime = sample.t;
          const duration = (sampleTime - lastSampleTime) / 1000;

          if (sample.focused) {
            focusSeconds += duration;
            currentStreak += duration;
            longestStreak = Math.max(longestStreak, currentStreak);
          } else {
            currentStreak = 0;
          }

          lastSampleTime = sampleTime;
        }

        // Handle time from last sample to end
        const remainingTime = (endTime - lastSampleTime) / 1000;
        if (samples.length > 0 && samples[samples.length - 1].focused) {
          focusSeconds += remainingTime;
          currentStreak += remainingTime;
          longestStreak = Math.max(longestStreak, currentStreak);
        }

        const focusPercent = workSeconds > 0 ? (focusSeconds / workSeconds) * 100 : 0;

        return {
          focusPercent: Math.round(focusPercent),
          focusSeconds: Math.round(focusSeconds),
          workSeconds: Math.round(workSeconds),
          longestStreak: Math.round(longestStreak)
        };
      },

      // Check if should show extension prompt (focused in last 3 minutes)
      shouldShowExtensionPrompt: () => {
        const { session, timer } = get();
        if (!session || timer.mode !== 'work') return false;

        const remainingMinutes = timer.remainingSeconds / 60;
        if (remainingMinutes > 3) return false;

        const currentInterval = session.intervals[session.intervals.length - 1];
        if (!currentInterval || !currentInterval.samples.length) return false;

        // Check if focused in the last 3 minutes
        const threeMinutesAgo = Date.now() - (3 * 60 * 1000);
        const recentSamples = currentInterval.samples.filter(s => s.t >= threeMinutesAgo);

        if (recentSamples.length === 0) return false;

        const focusedSamples = recentSamples.filter(s => s.focused);
        const focusRatio = focusedSamples.length / recentSamples.length;

        return focusRatio >= 0.7; // 70% focused in last 3 minutes
      },

      // Check if should show early break prompt (unfocused for 90 seconds)
      shouldShowEarlyBreakPrompt: () => {
        const { session, timer } = get();
        if (!session || timer.mode !== 'work') return false;

        const currentInterval = session.intervals[session.intervals.length - 1];
        if (!currentInterval || !currentInterval.samples.length) return false;

        const now = Date.now();
        const ninetySecondsAgo = now - (90 * 1000);

        // Check if unfocused for 90 seconds straight
        const recentSamples = currentInterval.samples.filter(s => s.t >= ninetySecondsAgo);
        if (recentSamples.length === 0) return false;

        const unfocusedSamples = recentSamples.filter(s => !s.focused);
        return unfocusedSamples.length === recentSamples.length; // All unfocused
      },

      // Extend current work session by 3 minutes (max +6 minutes total)
      extendWorkSession: () => {
        const { timer, session } = get();
        if (!session || timer.mode !== 'work') return;

        const originalDuration = session.presets.workMin * 60;
        const currentDuration = timer.totalSeconds;
        const maxExtension = 6 * 60; // 6 minutes

        if (currentDuration >= originalDuration + maxExtension) return;

        const extension = 3 * 60; // 3 minutes
        set({
          timer: {
            ...timer,
            remainingSeconds: timer.remainingSeconds + extension,
            totalSeconds: timer.totalSeconds + extension
          }
        });
      },

      // Start break early
      startBreakEarly: () => {
        get().startBreak();
      }
    }),
    {
      name: 'session-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        currentTaskId: state.currentTaskId,
        presets: state.presets,
      }),
    }
  )
);