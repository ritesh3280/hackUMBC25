'use client';

import { useMemo, useState } from 'react';
import { formatDuration, formatTime } from '../utils/sessionAnalytics';

export function TimelineChart({ timelineData, totalDuration, className = "" }) {
  const segments = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return [];
    
    return timelineData.map(segment => ({
      ...segment,
      widthPercent: (segment.duration / totalDuration) * 100,
      leftPercent: (segment.relativeStart / totalDuration) * 100
    }));
  }, [timelineData, totalDuration]);

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center text-gray-500 ${className}`}>
        No timeline data available
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Focus Timeline</h4>
        <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
          {segments.map((segment, index) => (
            <div
              key={index}
              className={`absolute h-full transition-all duration-300 ${
                segment.focused 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              style={{
                left: `${segment.leftPercent}%`,
                width: `${segment.widthPercent}%`
              }}
              title={`${segment.focused ? 'Focused' : 'Distracted'} - ${formatDuration(segment.duration)}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0:00</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Focused</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600">Distracted</span>
        </div>
      </div>
    </div>
  );
}

export function PieChart({ focusedTime, distractedTime, className = "" }) {
  const total = focusedTime + distractedTime;
  const focusPercent = total > 0 ? (focusedTime / total) * 100 : 0;
  const distractedPercent = 100 - focusPercent;
  
  // Calculate SVG path for pie chart
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const focusStroke = (focusPercent / 100) * circumference;
  const distractedStroke = (distractedPercent / 100) * circumference;

  if (total === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center text-gray-500 ${className}`}>
        No data available
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <div className="relative inline-block">
        <svg width="120" height="120" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          
          {/* Focused time arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="10"
            strokeDasharray={`${focusStroke} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          
          {/* Distracted time arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth="10"
            strokeDasharray={`${distractedStroke} ${circumference}`}
            strokeDashoffset={-focusStroke}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(focusPercent)}%
            </div>
            <div className="text-xs text-gray-500">Focus</div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Focused</span>
          </div>
          <span className="font-semibold text-gray-900">{formatDuration(focusedTime)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">Distracted</span>
          </div>
          <span className="font-semibold text-gray-900">{formatDuration(distractedTime)}</span>
        </div>
      </div>
    </div>
  );
}

export function BarChart({ sessions, className = "" }) {
  const maxFocusPercent = Math.max(...sessions.map(s => s.focusPercentage || 0));
  
  if (sessions.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center text-gray-500 ${className}`}>
        No sessions to display
      </div>
    );
  }

  return (
    <div className={className}>
      <h4 className="text-sm font-medium text-gray-700 mb-4">Focus Trends</h4>
      <div className="space-y-3">
        {sessions.slice(0, 8).map((session, index) => (
          <div key={session.sessionId} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">
                Session #{sessions.length - index}
              </span>
              <span className="font-medium text-gray-900">
                {Math.round(session.focusPercentage)}%
              </span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    session.focusPercentage >= 80 
                      ? 'bg-green-500' 
                      : session.focusPercentage >= 60 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${session.focusPercentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionHeatmap({ focusArray, className = "" }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!focusArray || focusArray.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 text-center text-gray-500 ${className}`}>
        No heatmap data available
      </div>
    );
  }

  const totalItems = focusArray.length;
  const focusedCount = focusArray.filter(v => v === 0).length;
  const distractedCount = focusArray.filter(v => v === 1).length;

  // Compact view: show only first 50 items in 10x5 grid
  const compactItems = focusArray.slice(0, 50);
  const compactItemsPerRow = 10;
  
  // Expanded view: optimal grid dimensions
  const expandedItemsPerRow = Math.min(25, Math.ceil(Math.sqrt(totalItems * 1.5)));

  const itemsToShow = isExpanded ? focusArray : compactItems;
  const itemsPerRow = isExpanded ? expandedItemsPerRow : compactItemsPerRow;

  return (
    <div className={className}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Focus State Heatmap</h4>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mb-3">
          {isExpanded 
            ? `${totalItems} data points • ${itemsPerRow} per row`
            : `Showing first ${compactItems.length} of ${totalItems} data points`
          }
        </div>
        
        <div 
          className={`grid gap-0.5 w-full bg-gray-100 p-2 rounded-lg cursor-pointer transition-all duration-300 ${
            !isExpanded ? 'hover:bg-gray-200' : ''
          }`}
          style={{ 
            gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`
          }}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          {itemsToShow.map((value, index) => (
            <div
              key={index}
              className={`aspect-square rounded-sm transition-all duration-200 hover:scale-125 hover:z-10 relative ${
                value === 0 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              } ${!isExpanded ? 'cursor-pointer' : ''}`}
              title={`Sample ${index + 1}: ${value === 0 ? 'Focused' : 'Distracted'}`}
            />
          ))}
        </div>
        
        {!isExpanded && totalItems > 50 && (
          <div className="text-center mt-2">
            <div className="text-xs text-gray-500">
              Click to view all {totalItems} data points
            </div>
          </div>
        )}
        
        {isExpanded && (
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Sample 1</span>
            <span>Reading left to right, top to bottom</span>
            <span>Sample {totalItems}</span>
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="font-semibold text-green-700">
            {focusedCount}
          </div>
          <div className="text-xs text-green-600">Focused samples</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="font-semibold text-red-700">
            {distractedCount}
          </div>
          <div className="text-xs text-red-600">Distracted samples</div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Focused (0)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600">Distracted (1)</span>
        </div>
      </div>
    </div>
  );
}

export function HeatmapChart({ sessions, className = "" }) {
  // Group sessions by hour of day
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({
      hour: i,
      sessions: [],
      avgFocus: 0,
      totalSessions: 0
    }));

    sessions.forEach(session => {
      const hour = new Date(session.startedAt).getHours();
      hours[hour].sessions.push(session);
      hours[hour].totalSessions++;
    });

    // Calculate average focus for each hour
    hours.forEach(hourData => {
      if (hourData.sessions.length > 0) {
        hourData.avgFocus = hourData.sessions.reduce((sum, s) => sum + (s.focusPercentage || 0), 0) / hourData.sessions.length;
      }
    });

    return hours;
  }, [sessions]);

  const maxSessions = Math.max(...hourlyData.map(h => h.totalSessions));

  return (
    <div className={className}>
      <h4 className="text-sm font-medium text-gray-700 mb-4">Focus Patterns by Hour</h4>
      <div className="grid grid-cols-12 gap-1">
        {hourlyData.map((hourData, index) => {
          const intensity = maxSessions > 0 ? hourData.totalSessions / maxSessions : 0;
          const focusQuality = hourData.avgFocus / 100;
          
          return (
            <div
              key={index}
              className={`aspect-square rounded text-xs flex items-center justify-center text-white font-medium transition-all duration-200 hover:scale-110 ${
                intensity === 0 
                  ? 'bg-gray-100 text-gray-400' 
                  : focusQuality >= 0.8 
                  ? 'bg-green-500' 
                  : focusQuality >= 0.6 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
              }`}
              style={{ 
                opacity: intensity === 0 ? 0.3 : 0.4 + (intensity * 0.6)
              }}
              title={`${index}:00 - ${hourData.totalSessions} sessions, ${Math.round(hourData.avgFocus)}% avg focus`}
            >
              {index}
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hover over hours to see details
      </div>
    </div>
  );
}
