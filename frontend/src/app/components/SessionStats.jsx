export default function SessionStats({ 
  focusPercentage = 85,
  longestStreak = 12,
  heartRate = 72,
  nextBreakIn = 8
}) {
  const stats = [
    {
      label: 'Focus %',
      value: `${focusPercentage}%`,
      color: 'success',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Longest Streak',
      value: `${longestStreak}m`,
      color: 'accent',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      label: 'Heart Rate',
      value: `${heartRate} BPM`,
      color: 'error',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      label: 'Next Break',
      value: `${nextBreakIn}m`,
      color: 'success',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'success': return 'border-success/30 bg-success/5';
      case 'accent': return 'border-accent/30 bg-accent/5';
      case 'warning': return 'border-warning/30 bg-warning/5';
      case 'error': return 'border-error/30 bg-error/5';
      default: return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Session Stats
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`workspace-card p-4 border transition-all duration-300 hover:shadow-lg hover:scale-105 ${getColorClasses(stat.color)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{stat.label}</div>
              <div className="text-gray-400 dark:text-gray-500">{stat.icon}</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}