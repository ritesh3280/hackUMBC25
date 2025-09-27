'use client';

import { useSessionStore } from '../store/sessionStore';

export default function Controls() {
  const { 
    session, 
    timer, 
    presets, 
    tasks,
    currentTaskId,
    startWork, 
    startBreak, 
    pause, 
    resume, 
    reset, 
    endSession,
    setPresets 
  } = useSessionStore();

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

  const handleReset = () => {
    reset();
  };

  const handleSkipBreak = () => {
    if (timer.mode === 'break') {
      startWork();
    }
  };

  const handleEndSession = async () => {
    await endSession();
  };

  const getNextBreakTime = () => {
    if (timer.mode !== 'work') return 'N/A';
    
    const now = new Date();
    const breakTime = new Date(now.getTime() + (timer.remainingSeconds * 1000));
    return breakTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button 
          onClick={handleStart}
          disabled={timer.mode === 'work' || timer.mode === 'break'}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {timer.mode === 'paused' ? 'Resume' : 'Start Focus Session'}
        </button>
        
        <button 
          onClick={handlePause}
          disabled={timer.mode === 'idle' || timer.mode === 'paused'}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pause
        </button>
        
        <button 
          onClick={handleReset}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Reset
        </button>
        
        <button 
          onClick={handleSkipBreak}
          disabled={timer.mode !== 'break'}
          className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Skip Break
        </button>
        
        <button 
          onClick={handleEndSession}
          disabled={!session}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          End Session
        </button>
      </div>

      {/* Preset Settings */}
      <div className="bg-muted rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Session Settings</h3>
        
        {/* Work Minutes */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">Work Minutes</label>
          <select
            value={presets.workMin}
            onChange={(e) => setPresets({ workMin: parseInt(e.target.value) })}
            disabled={!!session}
            className="px-3 py-1 border border-border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={15}>15 min</option>
            <option value={20}>20 min</option>
            <option value={25}>25 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>

        {/* Break Minutes */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">Break Minutes</label>
          <select
            value={presets.breakMin}
            onChange={(e) => setPresets({ breakMin: parseInt(e.target.value) })}
            disabled={!!session}
            className="px-3 py-1 border border-border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={3}>3 min</option>
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={20}>20 min</option>
          </select>
        </div>

        {/* Adaptive Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">Adaptive Breaks</label>
          <button
            disabled
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              presets.adaptive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            } opacity-50 cursor-not-allowed`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                presets.adaptive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          Adaptive breaks adjust based on focus patterns (coming soon)
        </div>
      </div>

      {/* Next Break Info */}
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Next break at</div>
        <div className="text-lg font-mono font-semibold text-foreground">
          {getNextBreakTime()}
        </div>
      </div>

      {/* Current Task Display */}
      {currentTaskId && (
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Current Task:</strong> {tasks.find(t => t.id === currentTaskId)?.name || 'Unknown'}
          </div>
        </div>
      )}
    </div>
  );
}
