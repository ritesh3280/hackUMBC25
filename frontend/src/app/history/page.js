'use client';

import { useState, useEffect } from 'react';
import { getAllSessions } from '../db/indexeddb';
import Link from 'next/link';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (session) => {
    if (!session || !session.endedAt) return 'Incomplete';
    const duration = (session.endedAt - session.startedAt) / 1000 / 60;
    return `${Math.round(duration)} min`;
  };

  const calculateFocusPercent = (session) => {
    if (!session || !session.intervals) return 0;
    
    let totalWorkSeconds = 0;
    let focusedSeconds = 0;

    session.intervals.forEach(interval => {
      if (interval.kind === 'work' && interval.end && interval.samples) {
        const duration = (interval.end - interval.start) / 1000;
        totalWorkSeconds += duration;

        // Simple focus calculation - count focused samples
        const focusedSamples = interval.samples.filter(s => s.focused);
        focusedSeconds += (focusedSamples.length / interval.samples.length) * duration;
      }
    });

    return totalWorkSeconds > 0 ? Math.round((focusedSeconds / totalWorkSeconds) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
                <p className="text-sm text-gray-600">Track your focus progress</p>
              </div>
            </div>
            
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Session
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h2>
            <p className="text-gray-600 mb-6">Start your first focus session to see your progress here</p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start First Session
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sessions List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
                  <p className="text-sm text-gray-600 mt-1">{sessions.length} sessions completed</p>
                </div>
                
                <div className="divide-y">
                  {sessions.map((session, index) => (
                    <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">#{sessions.length - index}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{formatDate(session.startedAt)}</div>
                            <div className="text-sm text-gray-600">{formatDuration(session)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600">
                              {calculateFocusPercent(session)}%
                            </div>
                            <div className="text-xs text-gray-500">Focus Rate</div>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-6">
              {/* Overall Stats */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Sessions</span>
                    <span className="font-semibold text-gray-900">{sessions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Focus</span>
                    <span className="font-semibold text-green-600">
                      {Math.round(sessions.reduce((acc, s) => acc + calculateFocusPercent(s), 0) / sessions.length)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Time</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(sessions.reduce((acc, s) => {
                        if (!s.endedAt) return acc;
                        return acc + (s.endedAt - s.startedAt) / 1000 / 60;
                      }, 0))} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Focus Distribution */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Focus Distribution</h3>
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session, index) => {
                    const focusPercent = calculateFocusPercent(session);
                    return (
                      <div key={session.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Session #{sessions.length - index}</span>
                          <span className="font-medium">{focusPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${focusPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Start New Session
                  </Link>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    Export Data
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}