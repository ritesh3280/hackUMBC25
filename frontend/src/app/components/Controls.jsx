'use client';

export default function Controls({ 
  mode = 'idle',
  onStart,
  onPause,
  onReset,
  onSkipBreak,
  onSwitchTask,
  preset = '30/10',
  onPresetChange,
  adaptive = false,
  onAdaptiveChange,
}) {
  const handleMainAction = () => {
    if (mode === 'work' || mode === 'break') {
      onPause();
    } else {
      onStart();
    }
  };

  return (
    <div className="workspace-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Controls
      </h3>

      {/* Main action button */}
      <div className="mb-3">
        {mode === 'work' || mode === 'break' ? (
          <button
            onClick={handleMainAction}
            className="w-full py-3 px-6 font-medium rounded-lg btn-primary"
          >
            Pause
          </button>
        ) : mode === 'paused' ? (
          <button
            onClick={handleMainAction}
            className="w-full py-3 px-6 font-medium rounded-lg btn-primary"
          >
            Resume
          </button>
        ) : (
          <button
            onClick={handleMainAction}
            className="w-full py-3 px-6 font-medium rounded-lg btn-primary"
          >
            Start Focus
          </button>
        )}
      </div>

      {/* Secondary controls */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={onReset}
          className="btn-secondary text-sm py-2 px-4"
        >
          Reset
        </button>
        <button
          onClick={onSkipBreak}
          className="btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={mode !== 'break'}
        >
          Skip Break
        </button>
      </div>

    </div>
  );
}