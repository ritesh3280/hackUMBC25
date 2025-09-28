'use client';

import Link from 'next/link';
import Logo from '../components/Logo';

export default function HistoryPage() {
  // Mock data for demonstration
  const sessionSummary = {
    totalSessions: 24,
    totalFocusTime: '18h 32m',
    averageFocus: 78,
    bestStreak: '2h 15m'
  };

  const recentSessions = [
    {
      id: 1,
      date: '2024-01-15',
      duration: '2h 15m',
      focusPercentage: 85,
      taskCount: 4,
      tasks: ['Design System', 'API Integration', 'Testing', 'Documentation']
    },
    {
      id: 2,
      date: '2024-01-14',
      duration: '1h 45m',
      focusPercentage: 72,
      taskCount: 3,
      tasks: ['User Research', 'Wireframes', 'Prototyping']
    },
    {
      id: 3,
      date: '2024-01-13',
      duration: '3h 20m',
      focusPercentage: 91,
      taskCount: 5,
      tasks: ['Database Design', 'Backend API', 'Frontend Components', 'Authentication', 'Deployment']
    },
    {
      id: 4,
      date: '2024-01-12',
      duration: '1h 30m',
      focusPercentage: 68,
      taskCount: 2,
      tasks: ['Code Review', 'Bug Fixes']
    },
    {
      id: 5,
      date: '2024-01-11',
      duration: '2h 45m',
      focusPercentage: 88,
      taskCount: 3,
      tasks: ['Feature Planning', 'Architecture Design', 'Team Sync']
    }
  ];

  const focusData = {
    focused: 70,
    unfocused: 30
  };

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <div className="workspace-card mx-6 mt-6 mb-8">
        <div className="flex items-center justify-between p-6">
          <Logo />
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>History</span>
            <span>•</span>
            <span>{sessionSummary.totalSessions} sessions</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              Session
            </Link>
            <Link
              href="/history"
              className="px-3 py-1 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg transition-all duration-200"
            >
              History
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Header with Session Summary */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Session History</h1>
          
          {/* Summary Chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 border border-purple-500/30">
              <div className="text-2xl font-bold text-purple-500 font-mono">{sessionSummary.totalSessions}</div>
              <div className="text-sm text-white/60">Total Sessions</div>
            </div>
            <div className="glass-card p-4 border border-green-500/30">
              <div className="text-2xl font-bold text-green-500 font-mono">{sessionSummary.totalFocusTime}</div>
              <div className="text-sm text-white/60">Focus Time</div>
            </div>
            <div className="glass-card p-4 border border-yellow-500/30">
              <div className="text-2xl font-bold text-yellow-500 font-mono">{sessionSummary.averageFocus}%</div>
              <div className="text-sm text-white/60">Avg Focus</div>
            </div>
            <div className="glass-card p-4 border border-green-500/30">
              <div className="text-2xl font-bold text-green-500 font-mono">{sessionSummary.bestStreak}</div>
              <div className="text-sm text-white/60">Best Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Focus vs Unfocused Donut Chart */}
          <div className="workspace-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              Focus Distribution
            </h3>
            
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="16"
                  fill="none"
                />
                {/* Focused segment */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="#22C55E"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80 * (focusData.focused / 100)} ${2 * Math.PI * 80}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                {/* Unfocused segment */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke="#EF4444"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80 * (focusData.unfocused / 100)} ${2 * Math.PI * 80}`}
                  strokeDashoffset={`-${2 * Math.PI * 80 * (focusData.focused / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white font-mono">{focusData.focused}%</div>
                <div className="text-sm text-white/60">Focused</div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Focused ({focusData.focused}%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-error rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Unfocused ({focusData.unfocused}%)</span>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="workspace-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Recent Sessions
            </h3>
            
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {session.duration}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {session.taskCount} tasks
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {session.tasks.join(' • ')}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {session.focusPercentage}%
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Focus</div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      session.focusPercentage >= 80 ? 'bg-success' :
                      session.focusPercentage >= 60 ? 'bg-warning' : 'bg-error'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load more button */}
            <div className="mt-6 text-center">
              <button className="btn-secondary text-sm px-4 py-2">
                Load More Sessions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}