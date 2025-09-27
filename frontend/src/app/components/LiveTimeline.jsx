'use client';

import { useSessionStore } from '../store/sessionStore';

export default function LiveTimeline() {
  const { session, timer } = useSessionStore();

  // Calculate timeline data based on current session and EEG samples
  const getTimelineData = () => {
    if (!session || !session.intervals.length) {
      return { segments: [], switches: [], totalDuration: 0 };
    }

    const currentInterval = session.intervals[session.intervals.length - 1];
    if (!currentInterval || currentInterval.kind !== 'work') {
      return { segments: [], switches: [], totalDuration: 0 };
    }

    const now = Date.now();
    const startTime = currentInterval.start;
    const endTime = currentInterval.end || now;
    const totalDuration = (endTime - startTime) / 1000; // in seconds
    
    // Create segments based on duration (1 segment per 1 second for real-time updates)
    const segmentCount = Math.max(1, Math.ceil(totalDuration));
    const segments = Array.from({ length: segmentCount }, (_, i) => {
      const segmentStart = startTime + (i * 1000);
      const segmentEnd = startTime + ((i + 1) * 1000);
      
      // Find samples in this 1-second bucket
      const samplesInSegment = currentInterval.samples.filter(sample => 
        sample.t >= segmentStart && sample.t < segmentEnd
      );
      
      if (samplesInSegment.length === 0) {
        return 'empty'; // No data yet
      }
      
      // Determine focus state based on majority of samples in this bucket
      const focusedSamples = samplesInSegment.filter(s => s.focused);
      const focusRatio = focusedSamples.length / samplesInSegment.length;
      
      return focusRatio >= 0.5 ? 'focused' : 'unfocused';
    });

    // Calculate switch positions based on actual switch times
    const switches = currentInterval.switches.map(switchTime => {
      const switchProgress = (switchTime - startTime) / (endTime - startTime);
      return Math.min(segmentCount - 1, Math.floor(switchProgress * segmentCount));
    });

    return { segments, switches, totalDuration };
  };

  const { segments, switches, totalDuration } = getTimelineData();

  const getSegmentColor = (type) => {
    switch (type) {
      case 'focused':
        return 'bg-green-500';
      case 'unfocused':
        return 'bg-red-500';
      default:
        return 'bg-gray-200 dark:bg-gray-700';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeLabels = () => {
    if (totalDuration === 0) return ['0:00', '15:00', '30:00'];
    
    const quarter = totalDuration / 4;
    const half = totalDuration / 2;
    const threeQuarter = (totalDuration * 3) / 4;
    
    return [
      formatTime(0),
      formatTime(quarter),
      formatTime(half),
      formatTime(threeQuarter),
      formatTime(totalDuration)
    ];
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Live Timeline</h3>
      
      <div className="space-y-3">
        {segments.length > 0 ? (
          <>
            {/* Timeline Bar */}
            <div className="flex h-8 bg-muted rounded-lg overflow-hidden">
              {segments.map((segment, index) => (
                <div
                  key={index}
                  className={`flex-1 h-full ${getSegmentColor(segment)} ${
                    index === 0 ? 'rounded-l-lg' : ''
                  } ${
                    index === segments.length - 1 ? 'rounded-r-lg' : ''
                  }`}
                />
              ))}
            </div>
            
            {/* Switch Ticks */}
            {switches.length > 0 && (
              <div className="relative h-4">
                {switches.map((switchIndex, i) => (
                  <div 
                    key={i}
                    className="absolute w-0.5 h-4 bg-black dark:bg-white top-0"
                    style={{ left: `${(switchIndex / segments.length) * 100}%` }}
                  />
                ))}
              </div>
            )}
            
            {/* Time Labels */}
            <div className="flex justify-between text-xs text-muted-foreground">
              {getTimeLabels().map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div>No active work session</div>
            <div className="text-sm mt-1">Start a work session to see timeline</div>
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Focused</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Unfocused</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-0.5 h-3 bg-black dark:bg-white"></div>
            <span>Task Switch</span>
          </div>
        </div>
      </div>
    </div>
  );
}
