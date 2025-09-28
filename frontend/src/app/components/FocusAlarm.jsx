'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Configuration for the alarm system
const ALARM_CONFIG = {
  windowSize: 30,           // Number of samples for sliding window
  threshold: 0.4,          // Distraction threshold (0.0 to 1.0)
  minDwellTime: 3.0,       // Minimum seconds before state change
  emaAlpha: 0.15,          // EMA smoothing factor
  hysteresisMargin: 0.15   // Additional margin for turning off alarm
};

export default function FocusAlarm({ focusHistory, isEnabled = true, hidden = false }) {
  const [alarmOn, setAlarmOn] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [status, setStatus] = useState({
    emaScore: 0.5,
    windowAverage: 0.0,
    timeSinceSwitch: 0,
    alarmOn: false
  });

  // Refs for maintaining state across renders
  const windowRef = useRef([]);
  const emaScoreRef = useRef(0.5);
  const lastSwitchTimeRef = useRef(Date.now());
  const initializedRef = useRef(false);

  // Initialize notification permission
  useEffect(() => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Update alarm state based on focus data
  useEffect(() => {
    if (!isEnabled || focusHistory.length === 0) return;

    const latestFocus = focusHistory[focusHistory.length - 1];
    if (!latestFocus) return;

    // Convert focus state to distraction state (0=focused, 1=distracted)
    const state = latestFocus.focused ? 0 : 1;

    // Add to sliding window
    windowRef.current.push(state);
    if (windowRef.current.length > ALARM_CONFIG.windowSize) {
      windowRef.current.shift();
    }

    // Update EMA score
    if (!initializedRef.current) {
      emaScoreRef.current = state;
      initializedRef.current = true;
    } else {
      emaScoreRef.current = (ALARM_CONFIG.emaAlpha * state + 
                           (1 - ALARM_CONFIG.emaAlpha) * emaScoreRef.current);
    }

    const now = Date.now();
    const timeSinceSwitch = (now - lastSwitchTimeRef.current) / 1000; // Convert to seconds

    // Determine if we should switch alarm state
    const shouldTurnOn = (!alarmOn && 
                         emaScoreRef.current > ALARM_CONFIG.threshold &&
                         timeSinceSwitch >= ALARM_CONFIG.minDwellTime);

    const shouldTurnOff = (alarmOn && 
                          emaScoreRef.current < (ALARM_CONFIG.threshold - ALARM_CONFIG.hysteresisMargin) &&
                          timeSinceSwitch >= ALARM_CONFIG.minDwellTime);

    if (shouldTurnOn) {
      setAlarmOn(true);
      setShowNotification(true);
      lastSwitchTimeRef.current = now;
      console.log(`🚨 FOCUS ALARM ON - EMA: ${emaScoreRef.current.toFixed(3)}, Dwell: ${timeSinceSwitch.toFixed(1)}s`);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('🚨 Focus Alarm!', {
          body: 'You appear distracted - refocus on your task!',
          icon: '/favicon.ico',
          tag: 'focus-alarm'
        });
      }
      
      // Hide notification after 5 seconds
      setTimeout(() => setShowNotification(false), 5000);
    } else if (shouldTurnOff) {
      setAlarmOn(false);
      setShowNotification(false);
      lastSwitchTimeRef.current = now;
      console.log(`✅ FOCUS ALARM OFF - EMA: ${emaScoreRef.current.toFixed(3)}, Dwell: ${timeSinceSwitch.toFixed(1)}s`);
    }

    // Update status
    const windowAverage = windowRef.current.length > 0 ? 
      windowRef.current.reduce((sum, val) => sum + val, 0) / windowRef.current.length : 0;

    setStatus({
      emaScore: emaScoreRef.current,
      windowAverage,
      timeSinceSwitch,
      alarmOn
    });

  }, [focusHistory.length, isEnabled, alarmOn]);

  if (!isEnabled) return null;

  return (
    <>
      {/* Notification Banner */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <div className="font-bold">🚨 FOCUS ALARM!</div>
              <div className="text-sm opacity-90">You appear distracted - refocus on your task!</div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
