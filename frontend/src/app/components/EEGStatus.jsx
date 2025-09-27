'use client';

import { useMockEEG } from '../hooks/useMockEEG';
import FocusPill from './FocusPill';

export default function EEGStatus() {
  const { connected, latestSample } = useMockEEG();

  return (
    <div className="flex items-center space-x-4">
      {/* Status Pill */}
      <FocusPill focused={latestSample?.focused ?? false} />
      
      {/* EEG Connection Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`eeg-dot ${connected ? 'connected' : 'disconnected'}`}></div>
        <span className="text-sm text-muted-foreground">EEG</span>
      </div>
    </div>
  );
}
