'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from './components/Logo';
import TaskList from './components/TaskList';
import Timer from './components/Timer';
import Controls from './components/Controls';
import FocusPill from './components/FocusPill';
import SessionStats from './components/SessionStats';
import { useSessionStore } from './store/sessionStore';
import { useRealEEG } from './hooks/useRealEEG';
import EEGGraphs from './components/EEGGraphs';
import FocusAlarm from './components/FocusAlarm';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

export default function SessionPage() {
  const {
    session,
    timer,
    tasks,
    currentTaskId,
    startWork,
    pause,
    resume,
    reset,
    endSession,
    tick,
    appendSample,
    addTask,
    removeTask,
    switchTask
  } = useSessionStore();

  const { connected, latestSample, eegData, heartRate, focusHistory, subscribe } = useRealEEG();

  // Memoize focus data for stable chart rendering with sliding window
  const focusChartData = useMemo(() => {
    if (focusHistory.length === 0) return [];
    
    // Sliding window: always show last 10 points
    const windowSize = 10;
    const startIndex = Math.max(0, focusHistory.length - windowSize);
    const recentData = focusHistory.slice(startIndex);
    
    return recentData.map((point, index) => ({
      time: index, // Simple index for x-axis
      timestamp: point.timestamp,
      focused: point.focused ? 1 : 0,
      confidence: point.confidence * 100,
    }));
  }, [focusHistory]);
  const [preset, setPreset] = useState('30/10');
  const [adaptive, setAdaptive] = useState(false);

  // Timer tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // EEG subscription
  useEffect(() => {
    if (!connected) return;
    const unsubscribe = subscribe((sample) => {
      if (timer.mode === 'work') {
        appendSample(sample);
      }
    });
    return unsubscribe;
  }, [connected, subscribe, appendSample, timer.mode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (timer.mode === 'idle' || timer.mode === 'paused') {
            startWork();
          } else {
            pause();
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          reset();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          // Focus on add task input
          const addButton = document.querySelector('[title="Add task (N)"]');
          if (addButton) addButton.click();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (tasks.length > 0) {
            const currentIndex = tasks.findIndex(t => t.id === currentTaskId);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : tasks.length - 1;
            switchTask(tasks[prevIndex].id);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (tasks.length > 0) {
            const currentIndex = tasks.findIndex(t => t.id === currentTaskId);
            const nextIndex = currentIndex < tasks.length - 1 ? currentIndex + 1 : 0;
            switchTask(tasks[nextIndex].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [timer.mode, tasks, currentTaskId, startWork, pause, reset, switchTask]);

  const handleStart = () => {
    if (timer.mode === 'idle') {
      startWork();
    } else if (timer.mode === 'paused') {
      resume();
    }
  };

  const handlePause = () => {
    if (timer.mode === 'work' || timer.mode === 'break') {
      pause();
    }
  };

  const handleSkipBreak = () => {
    // Skip break logic
    console.log('Skip break');
  };

  const handleSwitchTask = () => {
    if (tasks.length > 0) {
      const currentIndex = tasks.findIndex(t => t.id === currentTaskId);
      const nextIndex = currentIndex < tasks.length - 1 ? currentIndex + 1 : 0;
      switchTask(tasks[nextIndex].id);
    }
  };

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    // Update timer preset logic here
  };

  const handleAdaptiveChange = (newAdaptive) => {
    setAdaptive(newAdaptive);
    // Update adaptive mode logic here
  };

  // Calculate next break time
  const nextBreakAt = timer.mode === 'work' ? Date.now() + (timer.remainingSeconds * 1000) : null;

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <div className="workspace-card mx-10 mt-4 mb-4">
        <div className="flex items-center justify-between p-4">
          {/* Left: Logo + Name */}
          <Logo />
          
          {/* Center: Session breadcrumbs */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Session</span>
            <span>&gt;</span>
            <span>{tasks.length} tasks</span>
            {currentTaskId && (
              <>
                <span>&gt;</span>
                <span className="text-gray-900 dark:text-white">
                  {tasks.find(t => t.id === currentTaskId)?.name || 'Unknown'}
                </span>
              </>
            )}
          </div>
          
          {/* Right: Status + Navigation */}
          <div className="flex items-center space-x-4">
            {/* EEG Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">EEG</span>
            </div>
            
            {/* Focus Status */}
            <FocusPill isFocused={latestSample?.focused || false} />
            
            {/* Navigation */}
            <div className="flex items-center space-x-2">
              <Link
                href="/"
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                Session
              </Link>
              <Link
                href="/history"
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                History
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Task Drawer + EEG Graphs */}
          <div className="lg:col-span-1 space-y-6">
            <TaskList
              tasks={tasks}
              currentTaskId={currentTaskId}
              onAddTask={addTask}
              onRemoveTask={removeTask}
              onSwitchTask={switchTask}
            />
            
            {/* EEG Graphs - Compact Version */}
            <EEGGraphs 
              eegData={eegData}
              heartRate={heartRate}
              focusHistory={focusHistory}
            />
          </div>

          {/* Center Column - Timer */}
          <div className="lg:col-span-1">
            <Timer
              remainingSeconds={timer.remainingSeconds}
              totalSeconds={timer.totalSeconds}
              mode={timer.mode}
              nextBreakAt={nextBreakAt}
            />
            
            <div className="mt-6">
              <Controls
                mode={timer.mode}
                onStart={handleStart}
                onPause={handlePause}
                onReset={reset}
                onSkipBreak={handleSkipBreak}
                onSwitchTask={handleSwitchTask}
                preset={preset}
                onPresetChange={handlePresetChange}
                adaptive={adaptive}
                onAdaptiveChange={handleAdaptiveChange}
              />
            </div>
          </div>

          {/* Right Column - Focus Status + Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Focus Status - Clean Chart */}
            <div className="workspace-card p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Focus Status
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {focusHistory.length > 0
                    ? `${Math.round(focusHistory[focusHistory.length - 1].confidence * 100)}% focus`
                    : 'No data available'}
                </p>
              </div>
              
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={focusChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                      domain={[0, 100]}
                      tickFormatter={val => `${val}%`}
                      label={{ value: 'Focus (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="confidence"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hidden Focus Alarm - still works but no visual card */}
            <FocusAlarm 
              focusHistory={focusHistory}
              isEnabled={connected}
              hidden={true}
            />

            <SessionStats
              focusPercentage={85}
              longestStreak={12}
              heartRate={heartRate || 72}
              nextBreakIn={Math.ceil(timer.remainingSeconds / 60)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}