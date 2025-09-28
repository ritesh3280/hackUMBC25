'use client';

import { useState, useEffect } from 'react';
import { formatDuration, formatDate, formatTime, calculateSessionAnalytics } from '../utils/sessionAnalytics';
import { TimelineChart, PieChart, BarChart, HeatmapChart, SessionHeatmap } from '../components/SessionVisualization';
import { CalendarView } from '../components/CalendarView';
import { generateFocusInsights, generateTrendInsights } from '../utils/geminiInsights';
import Link from 'next/link';
import Logo from '../components/Logo';

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [insights, setInsights] = useState(null);
  const [trendInsights, setTrendInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  // Generate insights when sessions are loaded
  useEffect(() => {
    if (sessions.length > 0) {
      generateAllInsights();
    }
  }, [sessions]);

  // Generate insights for selected session
  useEffect(() => {
    if (selectedSession && sessions.length > 0) {
      const session = sessions.find(s => s.id === selectedSession.sessionId);
      if (session) {
        generateSessionInsights(session);
      }
    }
  }, [selectedSession]);

  // Refresh sessions when page becomes visible (in case new session was added)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadSessions = async () => {
    try {
      // Load sessions from localStorage only
      const sessions = JSON.parse(localStorage.getItem('focusSessions') || '[]');
      
      console.log('Raw sessions from localStorage:', sessions.length);
      console.log('Sample session structure:', sessions[0]);
      
      // Sort by start time (newest first)
      sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      
      // Calculate analytics for each session using the existing calculateSessionAnalytics function
      const sessionAnalytics = sessions.map(session => {
        const analytics = calculateSessionAnalytics(session);
        if (analytics) {
          // Ensure sessionId matches the session id
          analytics.sessionId = session.id;
        }
        return analytics;
      }).filter(analytics => analytics !== null);
      
      console.log('Processed sessions:', sessions.length);
      console.log('Session analytics:', sessionAnalytics.length);
      console.log('Sample session:', sessions[0]);
      console.log('Sample analytics:', sessionAnalytics[0]);
      
      setSessions(sessions);
      setAnalytics(sessionAnalytics);
      
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAllInsights = async () => {
    setLoadingInsights(true);
    try {
      // Generate trend insights for all sessions
      const trends = await generateTrendInsights(sessions);
      setTrendInsights(trends);
    } catch (error) {
      console.error('Error generating trend insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const generateSessionInsights = async (session) => {
    setLoadingInsights(true);
    try {
      const sessionInsights = await generateFocusInsights(session);
      setInsights(sessionInsights);
    } catch (error) {
      console.error('Error generating session insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const getOverallStats = () => {
    console.log('Calculating overall stats with analytics:', analytics.length);
    console.log('Analytics data:', analytics);
    
    if (analytics.length === 0) return { totalSessions: 0, avgFocus: 0, totalTime: 0 };
    
    const totalSessions = analytics.length;
    const avgFocus = analytics.reduce((sum, a) => sum + (a.focusPercentage || 0), 0) / totalSessions;
    const totalTime = analytics.reduce((sum, a) => sum + (a.totalWorkTime || a.totalDuration || 0), 0);
    
    const stats = { totalSessions, avgFocus, totalTime };
    console.log('Overall stats calculated:', stats);
    
    return stats;
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
              <p className="text-sm text-gray-600 mt-1">Track your focus progress over time</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
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
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {analytics.length === 0 ? (
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
        ) : viewMode === 'calendar' ? (
          // Calendar View
          <div className="space-y-4">
            {/* Overview Stats - Smaller */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const stats = getOverallStats();
                return (
                  <>
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <div className="text-lg font-bold text-gray-900">{stats.totalSessions}</div>
                      <div className="text-xs text-gray-600">Total Sessions</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <div className="text-lg font-bold text-green-600">{Math.round(stats.avgFocus)}%</div>
                      <div className="text-xs text-gray-600">Average Focus</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <div className="text-lg font-bold text-blue-600">{formatDuration(stats.totalTime)}</div>
                      <div className="text-xs text-gray-600">Total Focus Time</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <div className="text-lg font-bold text-purple-600">
                        {selectedSession ? Math.round(selectedSession.longestFocusStreak / 60) : 0}m
                      </div>
                      <div className="text-xs text-gray-600">Best Focus Streak</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Main Layout Grid - 2/3 Calendar, 1/3 Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Calendar Section - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                <div className="relative">
                <CalendarView 
                  sessions={sessions}
                  analytics={analytics}
                  onSessionSelect={setSelectedSession}
                />

                {/* Session Details Popup Overlay */}
                {selectedSession && (
                  <>
                    {/* Backdrop with blur */}
                    <div 
                      className="absolute inset-0 z-40 backdrop-blur-sm bg-white/30"
                      onClick={() => setSelectedSession(null)}
                    />
                    
                    {/* Popup Modal */}
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto pointer-events-auto transform transition-all duration-200 scale-100">
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Session Details
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {formatDate(sessions.find(s => s.id === selectedSession.sessionId)?.startedAt)} at {formatTime(sessions.find(s => s.id === selectedSession.sessionId)?.startedAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedSession(null)}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                      {/* Core Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">{formatDuration(selectedSession.totalWorkTime)}</div>
                          <div className="text-xs text-gray-600">Total Time</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{formatDuration(selectedSession.totalFocusedTime)}</div>
                          <div className="text-xs text-gray-600">Focused Time</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-lg font-bold text-red-600">{formatDuration(selectedSession.totalDistractedTime)}</div>
                          <div className="text-xs text-gray-600">Distracted Time</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{selectedSession.focusPercentage}%</div>
                          <div className="text-xs text-gray-600">Focus Rate</div>
                        </div>
                      </div>

                        {/* Visualizations */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          <div>
                            <SessionHeatmap 
                              focusArray={selectedSession?.focusArray || []}
                            />
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">Time Distribution</h4>
                              <PieChart 
                                focusedTime={selectedSession.totalFocusedTime}
                                distractedTime={selectedSession.totalDistractedTime}
                              />
                            </div>
                         
                          </div>
                        </div>

                
                      </div>
                    </div>
                  </>
                )}
                </div>

              </div>

              {/* Right Sidebar - 1/3 width (Insights and Recommendations only) - Smaller */}
              <div className="space-y-4">
                {/* Insights Panel */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Focus Insights
                    {loadingInsights && (
                      <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {insights ? (
                      <>
                        {/* Show AI-generated insights */}
                        {insights.insights?.slice(0, 3).map((insight, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="text-gray-900 font-medium mb-1">• {insight}</div>
                          </div>
                        ))}
                        {/* Show strengths if available */}
                        {insights.strengths && insights.strengths.length > 0 && (
                          <div className="mt-3 p-2 bg-green-50 rounded">
                            <div className="text-xs font-semibold text-green-900 mb-1">Strengths:</div>
                            {insights.strengths.map((strength, idx) => (
                              <div key={idx} className="text-xs text-green-700">✓ {strength}</div>
                            ))}
                          </div>
                        )}
                        {/* Show improvements if available */}
                        {insights.improvements && insights.improvements.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded">
                            <div className="text-xs font-semibold text-yellow-900 mb-1">Areas to Improve:</div>
                            {insights.improvements.map((improvement, idx) => (
                              <div key={idx} className="text-xs text-yellow-700">→ {improvement}</div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : trendInsights ? (
                      <>
                        {/* Show trend insights when no session is selected */}
                        <div>
                          <div className="text-xs text-gray-600">Overall Focus</div>
                          <div className="text-base font-bold text-green-600">{trendInsights.overallAvgFocus}%</div>
                          <div className="text-xs text-gray-500">Across {trendInsights.totalSessions} sessions</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Recent Trend</div>
                          <div className="text-base font-bold text-blue-600">
                            {trendInsights.trend === 'improving' ? '↑' : trendInsights.trend === 'declining' ? '↓' : '→'} {trendInsights.trend}
                          </div>
                          <div className="text-xs text-gray-500">{trendInsights.recentAvgFocus}% recent average</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Total Focus Time</div>
                          <div className="text-base font-bold text-purple-600">{formatDuration(trendInsights.totalMinutes * 60)}</div>
                          <div className="text-xs text-gray-500">Lifetime total</div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Fallback to default content */}
                        <div>
                          <div className="text-xs text-gray-600">Best Focus Day</div>
                          <div className="text-base font-bold text-green-600">Wednesday</div>
                          <div className="text-xs text-gray-500">Average 92% focus</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Peak Productivity</div>
                          <div className="text-base font-bold text-blue-600">9:00 AM - 11:00 AM</div>
                          <div className="text-xs text-gray-500">Most focused time window</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Weekly Goal</div>
                          <div className="text-base font-bold text-purple-600">15 / 20 hours</div>
                          <div className="text-xs text-gray-500">75% completed</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Recommendations
                    {loadingInsights && (
                      <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {insights?.recommendations ? (
                      <>
                        {insights.recommendations.slice(0, 3).map((rec, idx) => {
                          const colors = [
                            { bg: 'bg-blue-50', text: 'text-blue-900', subtext: 'text-blue-700' },
                            { bg: 'bg-green-50', text: 'text-green-900', subtext: 'text-green-700' },
                            { bg: 'bg-yellow-50', text: 'text-yellow-900', subtext: 'text-yellow-700' }
                          ];
                          const color = colors[idx % colors.length];
                          const [title, ...description] = rec.split('. ');
                          
                          return (
                            <div key={idx} className={`p-2 ${color.bg} rounded`}>
                              <div className={`text-xs font-medium ${color.text}`}>
                                {title}
                              </div>
                              {description.length > 0 && (
                                <div className={`text-xs ${color.subtext} mt-0.5`}>
                                  {description.join('. ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {insights.motivationalMessage && (
                          <div className="mt-2 p-2 bg-indigo-50 rounded">
                            <div className="text-xs text-indigo-900 italic">
                              💪 {insights.motivationalMessage}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-blue-50 rounded">
                          <div className="text-xs font-medium text-blue-900">Schedule Deep Work</div>
                          <div className="text-xs text-blue-700 mt-0.5">
                            Your focus peaks at 9-11 AM. Schedule important tasks during this window.
                          </div>
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <div className="text-xs font-medium text-green-900">Maintain Streak</div>
                          <div className="text-xs text-green-700 mt-0.5">
                            You&apos;ve had 3 consecutive days with 80%+ focus. Keep it up!
                          </div>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded">
                          <div className="text-xs font-medium text-yellow-900">Take Breaks</div>
                          <div className="text-xs text-yellow-700 mt-0.5">
                            Consider shorter work intervals after 2 PM when focus tends to drop.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* This Week Stats */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">This Week</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Sessions</span>
                      <span className="text-xs font-semibold">12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Total Focus Time</span>
                      <span className="text-xs font-semibold">8h 45m</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Avg Session Length</span>
                      <span className="text-xs font-semibold">43 min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Focus Improvement</span>
                      <span className="text-xs font-semibold text-green-600">+12%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // List View (existing code)
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {(() => {
                const stats = getOverallStats();
                return (
                  <>
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <div className="text-2xl font-bold text-gray-900">{stats.totalSessions}</div>
                      <div className="text-sm text-gray-600">Total Sessions</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <div className="text-2xl font-bold text-green-600">{Math.round(stats.avgFocus)}%</div>
                      <div className="text-sm text-gray-600">Average Focus</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <div className="text-2xl font-bold text-blue-600">{formatDuration(stats.totalTime)}</div>
                      <div className="text-sm text-gray-600">Total Focus Time</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedSession ? Math.round(selectedSession.longestFocusStreak / 60) : 0}m
                      </div>
                      <div className="text-sm text-gray-600">Best Focus Streak</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sessions List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Session Details */}
                {selectedSession && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Session Details - {formatDate(sessions.find(s => s.id === selectedSession.sessionId)?.startedAt)}
                      </h3>
                      <div className="text-sm text-gray-500">
                        {formatTime(sessions.find(s => s.id === selectedSession.sessionId)?.startedAt)}
                      </div>
                    </div>

                    {/* Core Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">{formatDuration(selectedSession.totalWorkTime)}</div>
                        <div className="text-xs text-gray-600">Total Time</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{formatDuration(selectedSession.totalFocusedTime)}</div>
                        <div className="text-xs text-gray-600">Focused Time</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">{formatDuration(selectedSession.totalDistractedTime)}</div>
                        <div className="text-xs text-gray-600">Distracted Time</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{selectedSession.focusPercentage}%</div>
                        <div className="text-xs text-gray-600">Focus Rate</div>
                      </div>
                    </div>

                    {/* Timeline Visualization */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                   
                      <SessionHeatmap 
                        focusArray={selectedSession.focusArray}
                      />
                    </div>

           
                  </div>
                )}

                {/* Sessions List */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">Session History</h2>
                    <p className="text-sm text-gray-600 mt-1">{analytics.length} sessions completed</p>
                  </div>
                  
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {analytics.map((sessionAnalytic, index) => {
                      const session = sessions.find(s => s.id === sessionAnalytic.sessionId);
                      const isSelected = selectedSession?.sessionId === sessionAnalytic.sessionId;
                      
                      return (
                        <div 
                          key={sessionAnalytic.sessionId} 
                          className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                          onClick={() => setSelectedSession(sessionAnalytic)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                                isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                              }`}>
                                #{analytics.length - index}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {formatDate(session?.startedAt)} at {formatTime(session?.startedAt)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {formatDuration(sessionAnalytic.totalWorkTime)} • {sessionAnalytic.workIntervals} intervals
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className={`text-lg font-semibold ${
                                sessionAnalytic.focusPercentage >= 80 ? 'text-green-600' :
                                sessionAnalytic.focusPercentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {Math.round(sessionAnalytic.focusPercentage)}%
                              </div>
                              <div className="text-xs text-gray-500">Focus</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sidebar Visualizations */}
              <div className="space-y-6">
                {/* Pie Chart */}
                {selectedSession && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Distribution</h3>
                    <PieChart 
                      focusedTime={selectedSession.totalFocusedTime}
                      distractedTime={selectedSession.totalDistractedTime}
                    />
                  </div>
                )}

                {/* Focus Trends */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <BarChart sessions={analytics} />
                </div>

                {/* Heatmap */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <HeatmapChart sessions={sessions} />
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
            
            {/* Load more button */}
            <div className="mt-6 text-center">
              <button className="btn-secondary text-sm px-4 py-2">
                Load More Sessions
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}