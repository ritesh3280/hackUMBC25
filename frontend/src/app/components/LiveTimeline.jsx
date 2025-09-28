'use client';

export default function LiveTimeline({ 
  segments = [],
  currentTime = 0,
  totalTime = 1800 // 30 minutes in seconds
}) {
  // Generate placeholder segments if none provided
  const generateSegments = () => {
    const segmentCount = 30;
    const segmentDuration = totalTime / segmentCount;
    const segments = [];
    
    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * segmentDuration;
      const endTime = (i + 1) * segmentDuration;
      const isFocused = i < 20; // First 20 segments are focused
      const hasSwitch = i === 10; // Switch at segment 10
      
      segments.push({
        id: i,
        startTime,
        endTime,
        isFocused,
        hasSwitch,
        taskName: isFocused ? 'Design System' : 'Break'
      });
    }
    
    return segments;
  };

  const timelineSegments = segments.length > 0 ? segments : generateSegments();
  const currentSegment = Math.floor((currentTime / totalTime) * timelineSegments.length);

  return (
    <div className="workspace-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Live Timeline
      </h3>

      {/* Timeline container */}
      <div className="relative">
        {/* Timeline track */}
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="flex h-full">
            {timelineSegments.map((segment, index) => {
              const isActive = index <= currentSegment;
              const isCurrent = index === currentSegment;
              
              return (
                <div
                  key={segment.id}
                  className={`relative flex-1 h-full transition-all duration-300 ${
                    isActive
                      ? segment.isFocused
                        ? 'bg-success'
                        : 'bg-error'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{
                    opacity: isCurrent && isActive ? 1 : isActive ? 0.8 : 0.3
                  }}
                >
                  {/* Task switch indicator */}
                  {segment.hasSwitch && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gray-400 dark:bg-gray-500"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline labels */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>Start</span>
          <span>{Math.floor(totalTime / 60)}m</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-success rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Focused</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-error rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Unfocused</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Future</span>
        </div>
      </div>

      {/* Current status */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {currentSegment < timelineSegments.length ? (
            <>
              Segment {currentSegment + 1} of {timelineSegments.length}
              {timelineSegments[currentSegment]?.hasSwitch && (
                <span className="ml-2 text-accent">• Task Switch</span>
              )}
            </>
          ) : (
            'Session Complete'
          )}
        </div>
      </div>
    </div>
  );
}