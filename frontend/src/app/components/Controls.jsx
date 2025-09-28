'use client';

export default function Controls({ 
  mode = 'idle',
  onStart,
  onPause,
  onReset,
  onSkipBreak,
  onEndSession,
  onSwitchTask,
  preset = '30/10',
  onPresetChange,
  adaptive = false,
  onAdaptiveChange,
  alarmMuted = false,
  onAlarmMuteToggle,
}) {
  const handleMainAction = () => {
    if (mode === 'work' || mode === 'break') {
      onPause();
    } else {
      onStart();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* End Session button - only show when session is active */}
      {(mode === 'work' || mode === 'break' || mode === 'paused') && (
        <div className="mb-3">
          <button
            onClick={onEndSession}
            className="w-full py-2 px-4 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            End Session
          </button>
        </div>
      )}

      {/* Focus Alarm Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Focus Alarm</span>
        </div>
        <button
          onClick={onAlarmMuteToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            alarmMuted ? 'bg-gray-300' : 'bg-blue-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              alarmMuted ? 'translate-x-1' : 'translate-x-6'
            }`}
          />
        </button>
      </div>

    </div>
  );
}