'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';

export default function EEGGraphs({ eegData, heartRate, focusHistory }) {
  // Simple, clean data processing with sliding window
  const chartData = useMemo(() => {
    if (eegData.length === 0) return [];
    
    // Sliding window: always show last 10 points
    const windowSize = 10;
    const startIndex = Math.max(0, eegData.length - windowSize);
    const recentData = eegData.slice(startIndex);
    
    return recentData.map((point, index) => ({
      time: index, // Simple index for x-axis
      TP9: point.channels[0] || 0,
      AF7: point.channels[1] || 0,
      AF8: point.channels[2] || 0,
      TP10: point.channels[3] || 0,
      AUX: point.channels[4] || 0,
    }));
  }, [eegData]);

  return (
    <div className="space-y-4">
      {/* Clean EEG Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Brain Activity
          </h3>
          <p className="text-sm text-gray-600">
            Real-time EEG signals from 5 channels
          </p>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                domain={[-0.1, 0.1]}
                label={{ value: 'Amplitude (μV)', angle: -90, position: 'insideLeft' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="TP9" 
                stroke="#3b82f6" 
                strokeWidth={1.5}
                dot={false}
                name="TP9"
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="AF7" 
                stroke="#10b981" 
                strokeWidth={1.5}
                dot={false}
                name="AF7"
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="AF8" 
                stroke="#f59e0b" 
                strokeWidth={1.5}
                dot={false}
                name="AF8"
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="TP10" 
                stroke="#ef4444" 
                strokeWidth={1.5}
                dot={false}
                name="TP10"
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="AUX" 
                stroke="#8b5cf6" 
                strokeWidth={1.5}
                dot={false}
                name="AUX"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}