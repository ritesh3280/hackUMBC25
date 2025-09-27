'use client';

import { useSessionStore } from '../store/sessionStore';

export default function SessionStats() {
  const { session, timer, getCurrentFocusMetrics } = useSessionStore();
  
  const metrics = getCurrentFocusMetrics();
  const taskSwitches = session?.intervals?.[session.intervals.length - 1]?.switches?.length || 0;
  
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

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const stats = [
    {
      label: 'Focus %',
      value: `${metrics.focusPercent}%`,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      label: 'Longest Streak',
      value: formatDuration(metrics.longestStreak),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      label: 'Task Switches',
      value: taskSwitches.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      label: 'Next Break',
      value: getNextBreakTime(),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Session Stats</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${stat.bgColor} ${stat.borderColor}`}
          >
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
