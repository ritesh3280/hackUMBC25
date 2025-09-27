'use client';

export default function TimerRing({ 
  timeRemaining = 1500, // 25 minutes in seconds
  totalTime = 1500,
  mode = 'work' // 'work' or 'break'
}) {
  const radius = 80;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Handle edge cases to prevent NaN
  const safeTimeRemaining = Math.max(0, timeRemaining || 0);
  const safeTotalTime = Math.max(1, totalTime || 1); // Avoid division by zero
  const progress = Math.min(1, Math.max(0, (safeTotalTime - safeTimeRemaining) / safeTotalTime));
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - progress * circumference;

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeColor = () => {
    return mode === 'work' ? '#3b82f6' : '#10b981'; // blue for work, green for break
  };

  const getModeLabel = () => {
    return mode === 'work' ? 'Work Time' : 'Break Time';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-semibold text-foreground mb-4">
        {getModeLabel()}
      </div>
      
      <div className="relative">
        <svg
          width={radius * 2}
          height={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="dark:stroke-gray-600"
          />
          
          {/* Progress circle */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            stroke={getModeColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-foreground">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              remaining
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
