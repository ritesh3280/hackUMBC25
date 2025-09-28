'use client';

import { useEffect, useState } from 'react';

export default function Timer({ 
  remainingSeconds, 
  totalSeconds, 
  mode = 'work',
  nextBreakAt 
}) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (totalSeconds > 0) {
      const newProgress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
      setProgress(newProgress);
    }
  }, [remainingSeconds, totalSeconds]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNextBreak = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work': return 'text-accent';
      case 'break': return 'text-success';
      case 'paused': return 'text-warning';
      default: return 'text-gray-500';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'work': return 'Work';
      case 'break': return 'Break';
      case 'paused': return 'Paused';
      default: return 'Ready';
    }
  };

  const radius = 80;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="workspace-card p-2 text-center" style={{ minHeight: '300px' }}>
      {/* Timer Display with Circle */}
      <div className="relative w-48 h-48 mx-auto mb-2">
        <svg
          className="w-full h-full transform -rotate-90"
          width="192"
          height="192"
        >
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r={normalizedRadius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
            r={normalizedRadius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`timer-ring ${getModeColor()}`}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-mono font-bold ${getModeColor()} mb-1`}>
            {formatTime(remainingSeconds)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{getModeLabel()}</div>
        </div>
      </div>

      {/* Next break info - always reserve space */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4" style={{ minHeight: '20px' }}>
        {nextBreakAt && mode === 'work' ? (
          `Next break at ${formatNextBreak(nextBreakAt)}`
        ) : (
          <span className="invisible">placeholder</span>
        )}
      </div>

      {/* Progress percentage */}
      {totalSeconds > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {Math.round(progress)}% complete
        </div>
      )}
    </div>
  );
}
