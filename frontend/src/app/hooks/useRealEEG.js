'use client';

import { useState, useEffect, useRef } from 'react';

export function useRealEEG() {
  const [connected, setConnected] = useState(false);
  const [latestSample, setLatestSample] = useState(null);
  const [eegData, setEegData] = useState([]);
  const [heartRate, setHeartRate] = useState(null);
  const [focusHistory, setFocusHistory] = useState([]);
  const eventSourceRef = useRef(null);
  const subscribersRef = useRef(new Set());

  // Connect to WebSocket
  useEffect(() => {
    let isConnecting = false;
    
    const connectToWebSocket = () => {
      // Prevent multiple connections
      if (isConnecting) {
        console.log('Already connecting, skipping...');
        return;
      }
      if (eventSourceRef.current && eventSourceRef.current.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket already connecting, skipping...');
        return;
      }
      if (eventSourceRef.current && eventSourceRef.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected, skipping...');
        return;
      }
      
      isConnecting = true;
      console.log('🧠 Attempting to connect to EEG WebSocket...');
      
      try {
        const websocket = new WebSocket('ws://localhost:8001');
        eventSourceRef.current = websocket;

        websocket.onopen = () => {
          console.log('🧠 EEG WebSocket connected');
          setConnected(true);
          isConnecting = false;
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Update latest sample
            const sample = {
              focused: data.focus?.label === 'focused',
              confidence: data.focus?.probabilities?.focused || 0,
              timestamp: data.timestamp,
              eeg: data.eeg,
              heartRate: data.heart_rate
            };
            
            setLatestSample(sample);
            
            // Update EEG data for graphs (keep last 60 points)
            if (data.eeg) {
              setEegData(prev => {
                const newData = [...prev, {
                  timestamp: data.timestamp,
                  channels: data.eeg,
                  time: new Date(data.timestamp).toLocaleTimeString()
                }];
                return newData.slice(-60); // Keep last 60 points
              });
            }
            
            // Update heart rate
            if (data.heart_rate) {
              setHeartRate(data.heart_rate);
            }
            
            // Update focus history for timeline
            setFocusHistory(prev => {
              const newHistory = [...prev, {
                timestamp: data.timestamp,
                focused: data.focus?.label === 'focused',
                confidence: data.focus?.probabilities?.focused || 0
              }];
              return newHistory.slice(-120); // Keep last 2 minutes
            });
            
            // Notify all subscribers
            subscribersRef.current.forEach(callback => {
              try {
                callback(sample);
              } catch (error) {
                console.error('Error in EEG subscriber callback:', error);
              }
            });
          } catch (error) {
            console.error('Error parsing EEG data:', error);
          }
        };

        websocket.onerror = (error) => {
          console.log('EEG WebSocket connection failed - will retry in 10 seconds...');
          setConnected(false);
          isConnecting = false;
          // Attempt to reconnect after 10 seconds (longer delay)
          setTimeout(connectToWebSocket, 10000);
        };

        websocket.onclose = () => {
          console.log('🔌 EEG WebSocket closed - attempting to reconnect in 10 seconds...');
          setConnected(false);
          isConnecting = false;
          // Attempt to reconnect after 10 seconds (longer delay)
          setTimeout(connectToWebSocket, 10000);
        };

      } catch (error) {
        console.error('Failed to connect to EEG stream:', error);
        setConnected(false);
        isConnecting = false;
        // Fallback to mock data after 10 seconds
        setTimeout(() => {
          if (!connected) {
            console.log('🧠 No EEG device connected - using mock data for demonstration');
            setConnected(true);
            // Start mock data generation
            startMockData();
          }
        }, 10000);
      }
    };

    connectToWebSocket();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // Empty dependency array to run only once

  // Mock data fallback
  const startMockData = () => {
    let currentFocus = true;
    let lastFlipTime = Date.now();
    const flipProbability = 0.05;
    const minFlipInterval = 2000;

    const generateMockSample = () => {
      const now = Date.now();
      const timeSinceLastFlip = now - lastFlipTime;
      
      if (timeSinceLastFlip > minFlipInterval && Math.random() < flipProbability) {
        currentFocus = !currentFocus;
        lastFlipTime = now;
      }

      const sample = {
        focused: currentFocus,
        confidence: currentFocus ? 0.85 : 0.15,
        timestamp: now,
        eeg: Array.from({length: 5}, () => (Math.random() - 0.5) * 0.1),
        heartRate: 70 + Math.random() * 10
      };

      setLatestSample(sample);
      
      // Update data arrays
      setEegData(prev => {
        const newData = [...prev, {
          timestamp: now,
          channels: sample.eeg,
          time: new Date(now).toLocaleTimeString()
        }];
        return newData.slice(-60);
      });
      
      setHeartRate(sample.heartRate);
      
      setFocusHistory(prev => {
        const newHistory = [...prev, {
          timestamp: now,
          focused: currentFocus,
          confidence: sample.confidence
        }];
        return newHistory.slice(-120);
      });
      
      // Notify subscribers
      subscribersRef.current.forEach(callback => {
        try {
          callback(sample);
        } catch (error) {
          console.error('Error in mock EEG subscriber callback:', error);
        }
      });
    };

    const interval = setInterval(generateMockSample, 1000);
    
    return () => clearInterval(interval);
  };

  const subscribe = (callback) => {
    subscribersRef.current.add(callback);
    
    return () => {
      subscribersRef.current.delete(callback);
    };
  };

  const disconnect = () => {
    setConnected(false);
    setLatestSample(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    subscribersRef.current.clear();
  };

  return {
    connected,
    latestSample,
    eegData,
    heartRate,
    focusHistory,
    subscribe,
    disconnect
  };
}
