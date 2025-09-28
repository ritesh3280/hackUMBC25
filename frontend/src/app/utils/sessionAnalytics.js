/**
 * Session Analytics Utilities
 * Calculates all core metrics for focus session analysis
 */

export const generateHardcodedSessions = () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  
  return [
    {
      id: 'session-1',
      startedAt: now - (3 * oneDay),
      endedAt: now - (3 * oneDay) + (45 * 60 * 1000), // 45 minutes
      intervals: [
        {
          kind: 'work',
          start: now - (3 * oneDay),
          end: now - (3 * oneDay) + (25 * 60 * 1000),
          samples: generateFocusSamples(now - (3 * oneDay), 25 * 60, [
            { start: 0, end: 300, focused: true },      // 5 min focused
            { start: 300, end: 480, focused: false },   // 3 min distracted
            { start: 480, end: 900, focused: true },    // 7 min focused
            { start: 900, end: 1080, focused: false },  // 3 min distracted
            { start: 1080, end: 1500, focused: true }   // 7 min focused
          ]),
          focusArray: generateFocusArray([
            { start: 0, end: 300, focused: true },      // 5 min focused
            { start: 300, end: 480, focused: false },   // 3 min distracted
            { start: 480, end: 900, focused: true },    // 7 min focused
            { start: 900, end: 1080, focused: false },  // 3 min distracted
            { start: 1080, end: 1500, focused: true }   // 7 min focused
          ], 25 * 60),
          switches: [now - (3 * oneDay) + (10 * 60 * 1000)]
        }
      ],
      presets: { workMin: 25, breakMin: 5, adaptive: false }
    },
    {
      id: 'session-2',
      startedAt: now - (2 * oneDay),
      endedAt: now - (2 * oneDay) + (52 * 60 * 1000), // 52 minutes
      intervals: [
        {
          kind: 'work',
          start: now - (2 * oneDay),
          end: now - (2 * oneDay) + (25 * 60 * 1000),
          samples: generateFocusSamples(now - (2 * oneDay), 25 * 60, [
            { start: 0, end: 600, focused: true },      // 10 min focused
            { start: 600, end: 720, focused: false },   // 2 min distracted
            { start: 720, end: 1200, focused: true },   // 8 min focused
            { start: 1200, end: 1320, focused: false }, // 2 min distracted
            { start: 1320, end: 1500, focused: true }   // 3 min focused
          ]),
          focusArray: generateFocusArray([
            { start: 0, end: 600, focused: true },      // 10 min focused
            { start: 600, end: 720, focused: false },   // 2 min distracted
            { start: 720, end: 1200, focused: true },   // 8 min focused
            { start: 1200, end: 1320, focused: false }, // 2 min distracted
            { start: 1320, end: 1500, focused: true }   // 3 min focused
          ], 25 * 60),
          switches: []
        },
        {
          kind: 'work',
          start: now - (2 * oneDay) + (30 * 60 * 1000),
          end: now - (2 * oneDay) + (52 * 60 * 1000),
          samples: generateFocusSamples(now - (2 * oneDay) + (30 * 60 * 1000), 22 * 60, [
            { start: 0, end: 480, focused: true },      // 8 min focused
            { start: 480, end: 600, focused: false },   // 2 min distracted
            { start: 600, end: 1320, focused: true }    // 12 min focused
          ]),
          focusArray: generateFocusArray([
            { start: 0, end: 480, focused: true },      // 8 min focused
            { start: 480, end: 600, focused: false },   // 2 min distracted
            { start: 600, end: 1320, focused: true }    // 12 min focused
          ], 22 * 60),
          switches: [now - (2 * oneDay) + (35 * 60 * 1000)]
        }
      ],
      presets: { workMin: 25, breakMin: 5, adaptive: false }
    },
    {
      id: 'session-3',
      startedAt: now - oneDay,
      endedAt: now - oneDay + (38 * 60 * 1000), // 38 minutes
      intervals: [
        {
          kind: 'work',
          start: now - oneDay,
          end: now - oneDay + (25 * 60 * 1000),
          samples: generateFocusSamples(now - oneDay, 25 * 60, [
            { start: 0, end: 180, focused: false },     // 3 min distracted
            { start: 180, end: 900, focused: true },    // 12 min focused
            { start: 900, end: 1020, focused: false },  // 2 min distracted
            { start: 1020, end: 1500, focused: true }   // 8 min focused
          ]),
          focusArray: generateFocusArray([
            { start: 0, end: 180, focused: false },     // 3 min distracted
            { start: 180, end: 900, focused: true },    // 12 min focused
            { start: 900, end: 1020, focused: false },  // 2 min distracted
            { start: 1020, end: 1500, focused: true }   // 8 min focused
          ], 25 * 60),
          switches: []
        }
      ],
      presets: { workMin: 25, breakMin: 5, adaptive: false }
    },
    {
      id: 'session-4',
      startedAt: now - (oneHour * 4),
      endedAt: now - (oneHour * 3),
      intervals: [
        {
          kind: 'work',
          start: now - (oneHour * 4),
          end: now - (oneHour * 4) + (25 * 60 * 1000),
          samples: generateFocusSamples(now - (oneHour * 4), 25 * 60, [
            { start: 0, end: 1200, focused: true },     // 20 min focused
            { start: 1200, end: 1380, focused: false }, // 3 min distracted
            { start: 1380, end: 1500, focused: true }   // 2 min focused
          ]),
          focusArray: generateFocusArray([
            { start: 0, end: 1200, focused: true },     // 20 min focused
            { start: 1200, end: 1380, focused: false }, // 3 min distracted
            { start: 1380, end: 1500, focused: true }   // 2 min focused
          ], 25 * 60),
          switches: [now - (oneHour * 4) + (15 * 60 * 1000)]
        },
        {
          kind: 'work',
          start: now - (oneHour * 4) + (30 * 60 * 1000),
          end: now - (oneHour * 3),
          samples: generateFocusSamples(now - (oneHour * 4) + (30 * 60 * 1000), 30 * 60, [
            { start: 0, end: 900, focused: true },      // 15 min focused
            { start: 900, end: 1080, focused: false },  // 3 min distracted
            { start: 1080, end: 1800, focused: true }   // 12 min focused
          ]),
          focusArray: generateFocusArray([
            { start: 0, end: 900, focused: true },      // 15 min focused
            { start: 900, end: 1080, focused: false },  // 3 min distracted
            { start: 1080, end: 1800, focused: true }   // 12 min focused
          ], 30 * 60),
          switches: []
        }
      ],
      presets: { workMin: 25, breakMin: 5, adaptive: false }
    }
  ];
};

function generateFocusSamples(startTime, durationSeconds, focusSegments) {
  const samples = [];
  const sampleInterval = 2000; // 2 seconds between samples
  
  for (let t = 0; t < durationSeconds; t += 2) {
    const currentTime = startTime + (t * 1000);
    let focused = false;
    
    // Determine focus state based on segments
    for (const segment of focusSegments) {
      if (t >= segment.start && t < segment.end) {
        focused = segment.focused;
        break;
      }
    }
    
    samples.push({
      t: currentTime,
      focused: focused,
      taskId: 'default-task'
    });
  }
  
  return samples;
}

function generateFocusArray(focusSegments, durationSeconds) {
  const focusArray = [];
  
  for (let t = 0; t < durationSeconds; t += 2) { // 2 second intervals
    let focused = false;
    
    // Determine focus state based on segments
    for (const segment of focusSegments) {
      if (t >= segment.start && t < segment.end) {
        focused = segment.focused;
        break;
      }
    }
    
    focusArray.push(focused ? 0 : 1); // 0 = focused, 1 = distracted
  }
  
  return focusArray;
}

export const calculateSessionAnalytics = (session) => {
  console.log('calculateSessionAnalytics: Processing session', session);
  
  if (!session || !session.intervals) {
    console.log('calculateSessionAnalytics: Invalid session or no intervals');
    return null;
  }

  // Use the analytics that were already calculated and stored with the session
  if (session.focusPercentage !== undefined) {
    console.log('Using pre-calculated analytics from session:', {
      focusPercentage: session.focusPercentage,
      focusedTime: session.focusedTime,
      unfocusedTime: session.unfocusedTime,
      totalDuration: session.totalDuration
    });

    // Generate focus array from samples using 30% threshold
    const combinedFocusArray = session.intervals?.flatMap(interval => {
      if (!interval.samples) return [];
      return interval.samples.map(sample => {
        const confidence = sample.confidence || 0;
        // High confidence (focused) = 0 (green), Low confidence (distracted) = 1 (red)
        // Convert confidence to percentage: 0.85 -> 85%, 0.15 -> 15%
        const confidencePercent = confidence * 100;
        return confidencePercent >= 30 ? 0 : 1;
      });
    }) || [];

    console.log('Generated focus array from samples:', combinedFocusArray.length, 'items');

    return {
      sessionId: session.id,
      totalSessionTime: session.totalDuration,
      totalWorkTime: session.totalDuration,
      totalFocusedTime: session.focusedTime,
      totalDistractedTime: session.unfocusedTime,
      focusPercentage: session.focusPercentage,
      focusStreaks: [],
      distractionStreaks: [],
      longestFocusStreak: 0,
      longestDistractionStreak: 0,
      averageFocusStreak: 0,
      averageDistractionStreak: 0,
      stateTransitions: 0,
      alarmTriggers: 0,
      alarmFrequency: 0,
      averageRecoveryTime: 0,
      timelineData: [],
      focusArray: combinedFocusArray,
      workIntervals: session.intervals.filter(i => i.kind === 'work').length,
      taskSwitches: 0
    };
  }

  // Fallback: calculate from intervals if no pre-calculated analytics
  const startTime = session.startedAt;
  const endTime = session.endedAt || Date.now();
  const totalDuration = (endTime - startTime) / 1000; // in seconds

  let totalWorkTime = 0;
  let totalFocusedTime = 0;
  let totalDistractedTime = 0;

  // Process each work interval
  session.intervals.forEach(interval => {
    if (interval.kind !== 'work' || !interval.samples || !interval.end) {
      return;
    }

    const intervalDuration = (interval.end - interval.start) / 1000;
    totalWorkTime += intervalDuration;

    // Process samples to calculate focus times
    const samples = interval.samples;
    if (samples.length === 0) return;

    let lastSampleTime = interval.start;
    samples.forEach((sample, index) => {
      const sampleTime = sample.timestamp || sample.t;
      const confidence = sample.confidence || 0;
      const confidencePercent = confidence * 100;
      const focused = confidencePercent >= 30; // Use same 30% threshold as heatmap
      
      // Calculate time duration for this sample
      const sampleDuration = (sampleTime - lastSampleTime) / 1000;
      
      if (focused) {
        totalFocusedTime += sampleDuration;
      } else {
        totalDistractedTime += sampleDuration;
      }
      
      lastSampleTime = sampleTime;
    });

    // Handle remaining time after last sample
    const remainingTime = (interval.end - lastSampleTime) / 1000;
    if (samples.length > 0) {
      const lastSample = samples[samples.length - 1];
      const lastConfidence = lastSample.confidence || 0;
      const lastConfidencePercent = lastConfidence * 100;
      const lastFocused = lastConfidencePercent >= 30; // Use same 30% threshold
      if (lastFocused) {
        totalFocusedTime += remainingTime;
      } else {
        totalDistractedTime += remainingTime;
      }
    }
  });

  // Calculate focus percentage
  const focusPercentage = totalWorkTime > 0 ? (totalFocusedTime / totalWorkTime) * 100 : 0;

  // Generate focus array from samples using 30% threshold
  const combinedFocusArray = session.intervals?.flatMap(interval => {
    if (!interval.samples) return [];
    return interval.samples.map(sample => {
      const confidence = sample.confidence || 0;
      // High confidence (focused) = 0 (green), Low confidence (distracted) = 1 (red)
      return confidence >= 30 ? 0 : 1;
    });
  }) || [];

  console.log('Calculated analytics:', {
    totalDuration,
    totalWorkTime,
    totalFocusedTime,
    totalDistractedTime,
    focusPercentage,
    focusArrayLength: combinedFocusArray.length
  });

  return {
    sessionId: session.id,
    totalSessionTime: totalDuration,
    totalWorkTime: totalWorkTime,
    totalFocusedTime: totalFocusedTime,
    totalDistractedTime: totalDistractedTime,
    focusPercentage: Math.round(focusPercentage),
    focusStreaks: [],
    distractionStreaks: [],
    longestFocusStreak: 0,
    longestDistractionStreak: 0,
    averageFocusStreak: 0,
    averageDistractionStreak: 0,
    stateTransitions: 0,
    alarmTriggers: 0,
    alarmFrequency: 0,
    averageRecoveryTime: 0,
    timelineData: [],
    focusArray: combinedFocusArray,
    workIntervals: session.intervals.filter(i => i.kind === 'work').length,
    taskSwitches: 0
  };
};

export const generateTimelineData = (session) => {
  const timelineSegments = [];
  
  session.intervals.forEach(interval => {
    if (interval.kind !== 'work' || !interval.samples || !interval.end) {
      return;
    }

    const samples = interval.samples;
    if (samples.length === 0) return;

    let currentSegment = null;
    
    samples.forEach((sample, index) => {
      const focused = sample.focused;
      const sampleTime = sample.timestamp || sample.t;
      
      if (!currentSegment || currentSegment.focused !== focused) {
        // Start new segment
        if (currentSegment) {
          currentSegment.endTime = sampleTime;
          currentSegment.duration = (currentSegment.endTime - currentSegment.startTime) / 1000;
          timelineSegments.push(currentSegment);
        }
        
        currentSegment = {
          startTime: sampleTime,
          endTime: null,
          focused: focused,
          duration: 0,
          relativeStart: (sampleTime - session.startedAt) / 1000,
          relativeEnd: null
        };
      }
    });

    // Close final segment
    if (currentSegment) {
      currentSegment.endTime = interval.end;
      currentSegment.duration = (currentSegment.endTime - currentSegment.startTime) / 1000;
      currentSegment.relativeEnd = (currentSegment.endTime - session.startedAt) / 1000;
      timelineSegments.push(currentSegment);
    }
  });

  return timelineSegments;
};

export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

export const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
};
