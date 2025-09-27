'use client';

import { useState, useEffect, useRef } from 'react';

export function useMockEEG() {
  const [connected, setConnected] = useState(false);
  const [latestSample, setLatestSample] = useState(null);
  const intervalRef = useRef(null);
  const subscribersRef = useRef(new Set());

  // Simulate connection delay
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setConnected(true);
    }, 1000);

    return () => clearTimeout(connectTimer);
  }, []);

  // Mock EEG data generation
  useEffect(() => {
    if (!connected) return;

    let currentFocus = true; // Start focused
    let lastFlipTime = Date.now();
    const flipProbability = 0.05; // 5% chance to flip each sample
    const minFlipInterval = 2000; // Minimum 2 seconds between flips

    const generateSample = () => {
      const now = Date.now();
      const timeSinceLastFlip = now - lastFlipTime;
      
      // Random flip with probability, but respect minimum interval
      if (timeSinceLastFlip > minFlipInterval && Math.random() < flipProbability) {
        currentFocus = !currentFocus;
        lastFlipTime = now;
      }

      const sample = {
        focused: currentFocus,
        ts: now
      };

      setLatestSample(sample);
      
      // Notify all subscribers
      subscribersRef.current.forEach(callback => {
        try {
          callback(sample);
        } catch (error) {
          console.error('Error in EEG subscriber callback:', error);
        }
      });
    };

    // Generate samples every 500ms
    intervalRef.current = setInterval(generateSample, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [connected]);

  const subscribe = (callback) => {
    subscribersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
    };
  };

  const disconnect = () => {
    setConnected(false);
    setLatestSample(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    subscribersRef.current.clear();
  };

  return {
    connected,
    latestSample,
    subscribe,
    disconnect
  };
}
