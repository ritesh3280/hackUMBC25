'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { formatDuration, formatTime } from '../utils/sessionAnalytics';

export function WeeklyTimeView({ sessions, analytics, onSessionSelect, currentDate }) {
  const scrollContainerRef = useRef(null);
  const [hoveredSession, setHoveredSession] = useState(null);

  // Get the start and end of the current week
  const getWeekBounds = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day;
    const weekStart = new Date(date.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  }, [currentDate]);

  // Helper functions
  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isToday = (date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    const { weekStart } = getWeekBounds;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push({
        date,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: isToday(date)
      });
    }
    
    return days;
  }, [getWeekBounds]);

  // Group sessions by day and calculate positions
  const sessionsByDayAndTime = useMemo(() => {
    const grouped = {};
    
    weekDays.forEach(day => {
      const dayKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
      grouped[dayKey] = [];
    });
    
    sessions.forEach((session, index) => {
      const sessionDate = new Date(session.startedAt);
      const dayKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}-${sessionDate.getDate()}`;
      
      // Only include sessions that fall within this week
      if (grouped[dayKey] !== undefined) {
        const sessionAnalytic = analytics.find(a => a.sessionId === session.id);
        const startHour = sessionDate.getHours() + sessionDate.getMinutes() / 60;
        const duration = session.endedAt ? (session.endedAt - session.startedAt) / (1000 * 60 * 60) : 1; // in hours
        
        grouped[dayKey].push({
          session,
          analytics: sessionAnalytic,
          index,
          startHour,
          duration,
          topPosition: startHour * 60, // pixels from top (60px per hour)
          height: Math.max(duration * 60, 30) // minimum 30px height
        });
      }
    });
    
    return grouped;
  }, [sessions, analytics, weekDays]);

  // Generate time labels (0-23 hours)
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let hour = 0; hour < 24; hour++) {
      const time = new Date();
      time.setHours(hour, 0, 0, 0);
      labels.push({
        hour,
        label: time.toLocaleTimeString('en-US', { 
          hour: 'numeric',
          hour12: true 
        }),
        position: hour * 60 // 60px per hour
      });
    }
    return labels;
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = Math.max(0, (currentHour - 2) * 60); // Scroll to 2 hours before current time
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, []);

  const handleSessionClick = (sessionData) => {
    if (onSessionSelect) {
      onSessionSelect(sessionData.analytics);
    }
  };

  // Calculate current time line position
  const currentTimeLine = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    return currentHour * 60; // pixels from top
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border h-[600px] flex flex-col">
      {/* Header with day names */}
      <div className="border-b bg-gray-50 sticky top-0 z-20">
        <div className="grid grid-cols-8 divide-x divide-gray-200">
          <div className="p-3 text-center">
            <div className="text-xs font-medium text-gray-500">Time</div>
          </div>
          {weekDays.map((day, index) => (
            <div 
              key={index} 
              className={`p-3 text-center ${day.isToday ? 'bg-blue-50' : ''}`}
            >
              <div className={`text-sm font-semibold ${day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {day.dayName}
              </div>
              <div className="text-xs text-gray-600">
                {day.monthName} {day.dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
      >
        <div className="grid grid-cols-8 divide-x divide-gray-200 relative" style={{ height: '1440px' }}>
          {/* Time column */}
          <div className="relative bg-gray-50">
            {timeLabels.map((time) => (
              <div
                key={time.hour}
                className="absolute w-full px-2 text-right"
                style={{ top: `${time.position}px` }}
              >
                <span className="text-xs text-gray-500 font-medium">
                  {time.label}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns with sessions */}
          {weekDays.map((day, dayIndex) => {
            const dayKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`;
            const daySessions = sessionsByDayAndTime[dayKey] || [];
            
            return (
              <div 
                key={dayIndex} 
                className="relative"
              >
                {/* Hour lines */}
                {timeLabels.map((time) => (
                  <div
                    key={time.hour}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: `${time.position}px` }}
                  />
                ))}

                {/* Current time line (only for today) */}
                {day.isToday && (
                  <div
                    className="absolute w-full border-t-2 border-red-500 z-10"
                    style={{ top: `${currentTimeLine}px` }}
                  >
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}

                {/* Sessions */}
                {daySessions.map((sessionData) => (
                  <div
                    key={sessionData.session.id}
                    className={`absolute left-1 right-1 rounded-lg p-2 cursor-pointer transition-all z-5 border ${
                      sessionData.analytics?.focusPercentage >= 80 
                        ? 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300' 
                        : sessionData.analytics?.focusPercentage >= 60 
                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300'
                        : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                    } ${hoveredSession === sessionData.session.id ? 'z-20 shadow-lg scale-105' : ''}`}
                    style={{
                      top: `${sessionData.topPosition}px`,
                      height: `${sessionData.height}px`,
                      minHeight: '30px'
                    }}
                    onClick={() => handleSessionClick(sessionData)}
                    onMouseEnter={() => setHoveredSession(sessionData.session.id)}
                    onMouseLeave={() => setHoveredSession(null)}
                    title={`Session ${sessions.length - sessionData.index} - ${sessionData.analytics?.focusPercentage}% focus`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {formatTime(sessionData.session.startedAt)}
                      </span>
                      {sessionData.analytics?.focusPercentage !== undefined && (
                        <span className="text-xs font-semibold">
                          {sessionData.analytics.focusPercentage}%
                        </span>
                      )}
                    </div>
                    {/* Show duration for taller blocks */}
                    {sessionData.height > 50 && (
                      <div className="text-xs opacity-75 mt-1">
                        {formatDuration(sessionData.analytics?.totalWorkTime || 0)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with stats - matching monthly view style */}
      <div className="p-4 border-t bg-gray-50">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-600">Week Sessions</div>
            <div className="font-semibold text-gray-900">
              {Object.values(sessionsByDayAndTime).reduce((sum, sessions) => sum + sessions.length, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Active Days</div>
            <div className="font-semibold text-gray-900">
              {Object.values(sessionsByDayAndTime).filter(sessions => sessions.length > 0).length} days
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Avg Focus</div>
            <div className="font-semibold text-green-600">
              {analytics.length > 0 
                ? Math.round(analytics.reduce((sum, a) => sum + a.focusPercentage, 0) / analytics.length) 
                : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">Total Time</div>
            <div className="font-semibold text-blue-600">
              {formatDuration(analytics.reduce((sum, a) => sum + a.totalWorkTime, 0))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
