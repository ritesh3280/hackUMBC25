import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveSession, getSession, getAllSessions, clearAllSessions } from '../db/indexeddb';
import { classifyTask } from '../utils/taskClassifier';

/**
 * @typedef {{ id: string, name: string, createdAt: number, category?: string, confidence?: number }} Task
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

      addTask: async (name) => {
        const newTask = { 
          id: crypto.randomUUID(), 
          name, 
          createdAt: Date.now(),
          category: 'life', // default category
          confidence: 0,
          classifying: true // New property
        };
        
        // Add task immediately with default category
        set((state) => ({
          tasks: [...state.tasks, newTask],
          currentTaskId: state.currentTaskId || newTask.id,
        }));

        // Classify task in background and update
        try {
          const classification = await classifyTask(name);
          set((state) => ({
            tasks: state.tasks.map(task => 
              task.id === newTask.id 
                ? { ...task, category: classification.category, confidence: classification.confidence, classifying: false }
                : task
            )
          }));
        } catch (error) {
          console.error('Failed to classify task:', error);
          // Task remains with default category, but we should stop the classifying indicator
          set((state) => ({
            tasks: state.tasks.map(task => 
              task.id === newTask.id 
                ? { ...task, classifying: false }
                : task
            )
          }));
        }
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
        const { session, tasks, currentTaskId } = get();
        console.log('Ending session with:', {
          sessionExists: !!session,
          tasksCount: tasks.length,
          currentTaskId,
          tasks: tasks.map(t => ({ id: t.id, name: t.name, category: t.category }))
        });
        
        if (session) {
          get().endInterval();
          const endedSession = { ...session, endedAt: Date.now() };
          
          // Calculate session analytics
          const sessionAnalytics = get().calculateSessionAnalytics(endedSession);
          
          // Save to localStorage
          get().saveSessionToLocalStorage(endedSession, sessionAnalytics);
          
          // Also save to IndexedDB for compatibility
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
          const sampleWithTaskId = { ...sample, taskId: state.currentTaskId };
          currentInterval.samples = [...currentInterval.samples, sampleWithTaskId];
          updatedIntervals[currentIntervalIndex] = currentInterval;

          console.log('Appending sample:', {
            sample: sampleWithTaskId,
            currentTaskId: state.currentTaskId,
            totalSamples: currentInterval.samples.length
          });

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
          const sampleTime = sample.timestamp || sample.t; // Handle both timestamp formats
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
      },

      // Calculate comprehensive session analytics
      calculateSessionAnalytics: (session) => {
        if (!session || !session.intervals.length) {
          return {
            totalDuration: 0,
            focusedTime: 0,
            unfocusedTime: 0,
            focusPercentage: 0,
            tasks: []
          };
        }

        const workIntervals = session.intervals.filter(interval => interval.kind === 'work');
        console.log('Work intervals found:', workIntervals.length);
        console.log('All intervals:', session.intervals.map(i => ({ kind: i.kind, sampleCount: i.samples?.length || 0 })));
        
        let totalFocusedTime = 0;
        let totalUnfocusedTime = 0;
        let totalDuration = 0;
        const taskAnalytics = {};

        // Process each work interval
        workIntervals.forEach(interval => {
          const intervalDuration = (interval.end || Date.now()) - interval.start;
          totalDuration += intervalDuration;

          console.log('Processing interval:', {
            duration: intervalDuration,
            sampleCount: interval.samples?.length || 0,
            samples: interval.samples?.slice(0, 3) // Show first 3 samples for debugging
          });

          if (interval.samples && interval.samples.length > 0) {
            let intervalFocusedTime = 0;
            let intervalUnfocusedTime = 0;
            let lastSampleTime = interval.start;

            // Group samples by taskId to track task-specific analytics
            const taskSamples = {};
            interval.samples.forEach(sample => {
              const taskId = sample.taskId || 'no-task';
              if (!taskSamples[taskId]) {
                taskSamples[taskId] = [];
              }
              taskSamples[taskId].push(sample);
            });

            console.log('Task samples grouped:', taskSamples);

            // Process samples to calculate focus time
            interval.samples.forEach(sample => {
              const sampleTime = sample.timestamp || sample.t; // Handle both timestamp formats
              const sampleDuration = sampleTime - lastSampleTime;
              if (sample.focused) {
                intervalFocusedTime += sampleDuration;
              } else {
                intervalUnfocusedTime += sampleDuration;
              }
              lastSampleTime = sampleTime;
            });

            // Handle time from last sample to end
            const endTime = interval.end || Date.now();
            const remainingTime = endTime - lastSampleTime;
            if (interval.samples.length > 0) {
              const lastSample = interval.samples[interval.samples.length - 1];
              if (lastSample.focused) {
                intervalFocusedTime += remainingTime;
              } else {
                intervalUnfocusedTime += remainingTime;
              }
            }

            totalFocusedTime += intervalFocusedTime;
            totalUnfocusedTime += intervalUnfocusedTime;

            // Track task-specific analytics for each task in this interval
            Object.keys(taskSamples).forEach(taskId => {
              if (taskId === 'no-task') return; // Skip samples without task
              
              console.log('Processing task:', taskId, 'with', taskSamples[taskId].length, 'samples');
              
              if (!taskAnalytics[taskId]) {
                const task = get().tasks.find(t => t.id === taskId);
                console.log('Found task:', task);
                taskAnalytics[taskId] = {
                  taskId: taskId,
                  taskName: task?.name || 'Unknown Task',
                  category: task?.category || 'uncategorized',
                  confidence: task?.confidence || 0,
                  duration: 0,
                  focusedTime: 0,
                  unfocusedTime: 0,
                  focusPercentage: 0
                };
              }

              // Calculate task-specific focus time from samples
              const taskSampleList = taskSamples[taskId];
              let taskFocusedTime = 0;
              let taskUnfocusedTime = 0;
              let lastTaskSampleTime = interval.start;

              console.log(`Calculating focus time for task ${taskId}:`, {
                sampleCount: taskSampleList.length,
                samples: taskSampleList.slice(0, 3) // Show first 3 samples
              });

              taskSampleList.forEach((sample, index) => {
                const sampleTime = sample.timestamp || sample.t; // Handle both timestamp formats
                const sampleDuration = sampleTime - lastTaskSampleTime;
                console.log(`Sample ${index}:`, {
                  sample,
                  duration: sampleDuration,
                  focused: sample.focused,
                  sampleTime,
                  lastTaskSampleTime
                });
                
                if (sample.focused) {
                  taskFocusedTime += sampleDuration;
                } else {
                  taskUnfocusedTime += sampleDuration;
                }
                lastTaskSampleTime = sampleTime;
              });

              // Handle remaining time for this task
              const endTime = interval.end || Date.now();
              const remainingTaskTime = endTime - lastTaskSampleTime;
              if (taskSampleList.length > 0) {
                const lastTaskSample = taskSampleList[taskSampleList.length - 1];
                if (lastTaskSample.focused) {
                  taskFocusedTime += remainingTaskTime;
                } else {
                  taskUnfocusedTime += remainingTaskTime;
                }
              }

              console.log(`Task ${taskId} focus calculation:`, {
                focusedTime: taskFocusedTime,
                unfocusedTime: taskUnfocusedTime,
                totalTime: taskFocusedTime + taskUnfocusedTime
              });

              taskAnalytics[taskId].duration += intervalDuration;
              taskAnalytics[taskId].focusedTime += taskFocusedTime;
              taskAnalytics[taskId].unfocusedTime += taskUnfocusedTime;
            });
          }
        });

        // Calculate focus percentages for tasks
        Object.values(taskAnalytics).forEach(task => {
          task.focusPercentage = task.duration > 0 ? (task.focusedTime / task.duration) * 100 : 0;
          console.log(`Final task analytics for ${task.taskName}:`, {
            duration: task.duration,
            focusedTime: task.focusedTime,
            unfocusedTime: task.unfocusedTime,
            focusPercentage: task.focusPercentage
          });
        });

        const focusPercentage = totalDuration > 0 ? (totalFocusedTime / totalDuration) * 100 : 0;

        const result = {
          totalDuration: Math.round(totalDuration / 1000), // Convert to seconds
          focusedTime: Math.round(totalFocusedTime / 1000),
          unfocusedTime: Math.round(totalUnfocusedTime / 1000),
          focusPercentage: Math.round(focusPercentage),
          tasks: Object.values(taskAnalytics)
        };

        console.log('Session Analytics Calculated:', result);
        console.log('Task analytics object:', taskAnalytics);
        console.log('Number of tasks found:', Object.keys(taskAnalytics).length);
        return result;
      },

      // Save session to localStorage
      saveSessionToLocalStorage: (session, analytics) => {
        try {
          // Generate focusArray for each interval (history page format)
          const intervalsWithFocusArray = session.intervals.map(interval => {
            if (interval.kind !== 'work' || !interval.samples) {
              return interval;
            }

            // Generate focusArray: 0 = focused, 1 = distracted
            const focusArray = interval.samples.map(sample => {
              // Convert confidence percentage to binary (30% threshold)
              const confidence = sample.confidence || 0;
              return confidence >= 30 ? 0 : 1; // 0 = focused, 1 = distracted
            });

            return {
              ...interval,
              focusArray: focusArray
            };
          });

          const sessionData = {
            id: session.id,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            intervals: intervalsWithFocusArray,
            presets: session.presets,
            // Additional analytics for compatibility
            totalDuration: analytics.totalDuration,
            focusedTime: analytics.focusedTime,
            unfocusedTime: analytics.unfocusedTime,
            focusPercentage: analytics.focusPercentage,
            tasks: analytics.tasks.map(task => {
              const convertedTask = {
                id: task.taskId,
                name: task.taskName,
                category: task.category,
                confidence: task.confidence,
                duration: Math.round(task.duration / 1000), // Convert to seconds
                focusedTime: Math.round(task.focusedTime / 1000),
                unfocusedTime: Math.round(task.unfocusedTime / 1000),
                focusPercentage: Math.round(task.focusPercentage)
              };
              console.log(`Converting task ${task.taskName}:`, {
                original: task,
                converted: convertedTask
              });
              return convertedTask;
            })
          };

          // Get existing sessions from localStorage
          const existingSessions = JSON.parse(localStorage.getItem('focusSessions') || '[]');
          
          // Add new session
          const updatedSessions = [...existingSessions, sessionData];
          
          // Save back to localStorage
          localStorage.setItem('focusSessions', JSON.stringify(updatedSessions));
          
          console.log('Session saved to localStorage:', sessionData);
          console.log('Tasks in session:', sessionData.tasks);
        } catch (error) {
          console.error('Error saving session to localStorage:', error);
        }
      },

      // Get sessions from localStorage
      getSessionsFromLocalStorage: () => {
        try {
          const sessions = JSON.parse(localStorage.getItem('focusSessions') || '[]');
          return sessions;
        } catch (error) {
          console.error('Error loading sessions from localStorage:', error);
          return [];
        }
      },

      // Test function to manually add a sample with taskId
      testAddSample: () => {
        const { session, currentTaskId } = get();
        if (session && currentTaskId) {
          const testSample = {
            t: Date.now(),
            focused: true
          };
          get().appendSample(testSample);
          console.log('Test sample added:', testSample, 'to task:', currentTaskId);
        } else {
          console.log('No active session or currentTaskId');
        }
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