'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSessionStore } from './store/sessionStore';
import { useMockEEG } from './hooks/useMockEEG';

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

  const { connected, latestSample, subscribe } = useMockEEG();
  const [newTaskName, setNewTaskName] = useState('');

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timer.mode === 'work') return 'text-blue-600';
    if (timer.mode === 'break') return 'text-green-600';
    if (timer.mode === 'paused') return 'text-orange-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (timer.mode === 'work') return 'Focus Time';
    if (timer.mode === 'break') return 'Break Time';
    if (timer.mode === 'paused') return 'Paused';
    return 'Ready to Focus';
  };

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

  const handleAddTask = () => {
    if (newTaskName.trim()) {
      addTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FocusFlow</h1>
                <p className="text-sm text-gray-600">Brain-aware productivity</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* EEG Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">EEG</span>
              </div>
              
              {/* Focus Status */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                latestSample?.focused 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {latestSample?.focused ? 'Focused' : 'Unfocused'}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <Link
                  href="/history"
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  History
                </Link>
                <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Tasks */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>
              
              {/* Add Task */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Add a task..."
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTask}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Add
                </button>
              </div>

              {/* Task List */}
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div>No tasks yet</div>
                    <div className="text-sm mt-1">Add a task to get started</div>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                        task.id === currentTaskId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => switchTask(task.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          task.id === currentTaskId ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <span className={`text-sm ${
                          task.id === currentTaskId ? 'text-blue-700 font-medium' : 'text-gray-700'
                        }`}>
                          {task.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTask(task.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center Column - Timer */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              {/* Timer Display */}
              <div className="mb-8">
                <div className={`text-6xl font-mono font-bold ${getTimerColor()}`}>
                  {formatTime(timer.remainingSeconds)}
                </div>
                <div className="text-lg text-gray-600 mt-2">{getStatusText()}</div>
              </div>

              {/* Progress Bar */}
              {timer.totalSeconds > 0 && (
                <div className="mb-8">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        timer.mode === 'work' ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Control Buttons */}
              <div className="space-y-4">
                <div className="flex gap-3 justify-center">
                  {timer.mode === 'idle' || timer.mode === 'paused' ? (
                    <button
                      onClick={handleStart}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                    >
                      {timer.mode === 'paused' ? 'Resume' : 'Start Focus'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-lg"
                    >
                      Pause
                    </button>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={reset}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Reset
                  </button>
                  
                  {session && (
                    <button
                      onClick={endSession}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      End Session
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Focus Stats */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Focus Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">85%</div>
                    <div className="text-sm text-gray-600">Focus Rate</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">12m</div>
                    <div className="text-sm text-gray-600">Best Streak</div>
                  </div>
                </div>
              </div>

              {/* Current Task */}
              {currentTaskId && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Task</h3>
                  <div className="text-gray-700">
                    {tasks.find(t => t.id === currentTaskId)?.name || 'Unknown'}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}