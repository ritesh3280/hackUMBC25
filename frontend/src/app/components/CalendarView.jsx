'use client';

import { useState, useMemo } from 'react';
import { formatDuration, formatTime } from '../utils/sessionAnalytics';
import { WeeklyTimeView } from './WeeklyTimeView';

export function CalendarView({ sessions, analytics, onSessionSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewType, setViewType] = useState('month'); // 'month' or 'week'

  // Get the first day of the month
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  // Get the last day of the month
  const lastDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

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

  // Get the starting day of the week (0 = Sunday)
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Calculate the number of days to display (including padding)
  const daysInMonth = lastDayOfMonth.getDate();
  const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;

  // Helper functions
  const isToday = (date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped = {};
    
    console.log('CalendarView processing sessions:', sessions.length);
    console.log('CalendarView processing analytics:', analytics.length);
    
    sessions.forEach((session, index) => {
      console.log(`Processing session ${index}:`, {
        id: session.id,
        startedAt: session.startedAt,
        date: new Date(session.startedAt),
        intervals: session.intervals?.length || 0
      });
      
      const date = new Date(session.startedAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      // Find the corresponding analytics
      const sessionAnalytic = analytics.find(a => a.sessionId === session.id);
      console.log(`Found analytics for session ${session.id}:`, !!sessionAnalytic);
      
      // Only add ONE entry per session, not per interval
      grouped[dateKey].push({
        session,
        analytics: sessionAnalytic,
        index
      });
    });
    
    console.log('Sessions grouped by date:', Object.keys(grouped).length, 'dates');
    console.log('Grouped sessions:', grouped);
    
    return grouped;
  }, [sessions, analytics]);

  // Generate calendar days for month view
  const monthCalendarDays = useMemo(() => {
    const days = [];
    
    for (let i = 0; i < totalCells; i++) {
      if (i < startingDayOfWeek) {
        // Empty cells before the first day
        days.push(null);
      } else if (i - startingDayOfWeek < daysInMonth) {
        // Actual days of the month
        const dayNumber = i - startingDayOfWeek + 1;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        
        days.push({
          date,
          dayNumber,
          dateKey,
          sessions: sessionsByDate[dateKey] || [],
          isToday: isToday(date),
          isSelected: selectedDate && isSameDay(date, selectedDate)
        });
      } else {
        // Empty cells after the last day
        days.push(null);
      }
    }
    
    return days;
  }, [currentDate, totalCells, startingDayOfWeek, daysInMonth, sessionsByDate, selectedDate]);

  // Generate calendar days for week view
  const weekCalendarDays = useMemo(() => {
    const days = [];
    const { weekStart } = getWeekBounds;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      days.push({
        date,
        dayNumber: date.getDate(),
        dateKey,
        sessions: sessionsByDate[dateKey] || [],
        isToday: isToday(date),
        isSelected: selectedDate && isSameDay(date, selectedDate),
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()],
        monthName: date.toLocaleDateString('en-US', { month: 'short' })
      });
    }
    
    return days;
  }, [getWeekBounds, sessionsByDate, selectedDate]);

  // Use the appropriate calendar days based on view type
  const calendarDays = viewType === 'week' ? weekCalendarDays : monthCalendarDays;

  const navigate = (direction) => {
    if (viewType === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction * 7));
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSessionClick = (sessionData) => {
    if (onSessionSelect) {
      onSessionSelect(sessionData.analytics);
    }
  };

  const handleDayClick = (day) => {
    if (day && day.sessions.length > 0) {
      setSelectedDate(day.date);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Calendar Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {viewType === 'week' 
                ? `Week of ${getWeekBounds.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${getWeekBounds.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              }
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType('month')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  viewType === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewType('week')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  viewType === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navigate(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Day Names - Only show for month view */}
        {viewType === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className={viewType === 'week' ? '' : 'p-4'}>
        {viewType === 'week' ? (
          // Week Time View
          <WeeklyTimeView
            sessions={sessions}
            analytics={analytics}
            onSessionSelect={onSessionSelect}
            currentDate={currentDate}
          />
        ) : (
          // Month View
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`
                  min-h-[100px] p-2 border rounded-lg transition-all
                  ${!day ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-blue-300'}
                  ${day?.isToday ? 'ring-2 ring-blue-500' : ''}
                  ${day?.isSelected ? 'bg-blue-50' : ''}
                  ${day?.sessions.length > 0 ? 'cursor-pointer' : ''}
                `}
                onClick={() => day && handleDayClick(day)}
              >
                {day && (
                  <>
                    {/* Day Number */}
                    <div className={`text-sm font-medium mb-1 ${day.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {day.dayNumber}
                    </div>

                  {/* Sessions */}
                  <div className="space-y-1">
                    {day.sessions.slice(0, 3).map((sessionData, idx) => (
                      <div
                        key={sessionData.session.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSessionClick(sessionData);
                        }}
                        className={`
                          px-2 py-1 rounded text-xs cursor-pointer transition-all
                          ${sessionData.analytics?.focusPercentage >= 80 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : sessionData.analytics?.focusPercentage >= 60 
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }
                        `}
                        title={`Session ${sessions.length - sessionData.index} - ${sessionData.analytics?.focusPercentage}% focus`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {formatTime(sessionData.session.startedAt)}
                          </span>
                          <span>
                            {sessionData.analytics?.focusPercentage}%
                          </span>
                        </div>
                        <div className="text-xs opacity-75">
                          {formatDuration(sessionData.analytics?.totalWorkTime || 0)}
                        </div>
                      </div>
                    ))}
                    
                    {day.sessions.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{day.sessions.length - 3} more
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Footer - Summary (only show for month view) */}
      {viewType === 'month' && (
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-600">Total Sessions</div>
              <div className="font-semibold text-gray-900">
                {Object.values(sessionsByDate).reduce((sum, sessions) => sum + sessions.length, 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">This Month</div>
              <div className="font-semibold text-gray-900">
                {calendarDays.filter(day => day?.sessions.length > 0).length} days
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
      )}
    </div>
  );
}
