"""
Smart Alarm System with Multiple Smoothing Techniques
Prevents false alarms through time-based smoothing and debouncing

State encoding: 0 = focused, 1 = not focused (distracted)
Alarm triggers when distraction level exceeds threshold
"""

from collections import deque
import time
from typing import Optional, Callable
from dataclasses import dataclass


@dataclass
class AlarmConfig:
    """Configuration for alarm behavior"""
    window_size: int = 30  # Number of samples for sliding window
    threshold: float = 0.4  # Distraction threshold (0.0 to 1.0) - alarm triggers when distraction > threshold
    min_dwell_time: float = 3.0  # Minimum seconds before state change
    ema_alpha: float = 0.1  # EMA smoothing factor (0.0 to 1.0)
    hysteresis_margin: float = 0.1  # Additional margin for turning off alarm


class SlidingWindowAlarm:
    """Alarm using sliding window average with hysteresis"""
    
    def __init__(self, config: AlarmConfig):
        self.config = config
        self.window = deque(maxlen=config.window_size)
        self.alarm_on = False
        
    def update(self, state: int) -> bool:
        """Update with new state (0=focused, 1=not focused) and return alarm status"""
        self.window.append(state)
        
        if len(self.window) == 0:
            return self.alarm_on
            
        avg_distraction = sum(self.window) / len(self.window)
        
        # Use hysteresis to prevent flapping
        if not self.alarm_on and avg_distraction > self.config.threshold:
            self.alarm_on = True
            print(f"🚨 ALARM ON - Distraction: {avg_distraction:.2f} > {self.config.threshold}")
        elif self.alarm_on and avg_distraction < (self.config.threshold - self.config.hysteresis_margin):
            self.alarm_on = False
            print(f"✅ ALARM OFF - Distraction: {avg_distraction:.2f} < {self.config.threshold - self.config.hysteresis_margin}")
            
        return self.alarm_on
    
    def get_focus_percentage(self) -> float:
        """Get current focus percentage (0=focused, 1=distracted)"""
        if len(self.window) == 0:
            return 0.0
        avg_distraction = sum(self.window) / len(self.window)
        return 1.0 - avg_distraction  # Convert to focus percentage


class DebouncedAlarm:
    """Alarm with minimum dwell time (debouncing)"""
    
    def __init__(self, config: AlarmConfig):
        self.config = config
        self.window = deque(maxlen=config.window_size)
        self.alarm_on = False
        self.last_switch_time = time.time()
        
    def update(self, state: int) -> bool:
        """Update with new state (0=focused, 1=not focused) and return alarm status"""
        self.window.append(state)
        
        if len(self.window) == 0:
            return self.alarm_on
            
        avg_distraction = sum(self.window) / len(self.window)
        now = time.time()
        
        # Check if enough time has passed since last state change
        time_since_switch = now - self.last_switch_time
        
        if not self.alarm_on and avg_distraction > self.config.threshold:
            if time_since_switch >= self.config.min_dwell_time:
                self.alarm_on = True
                self.last_switch_time = now
                print(f"🚨 ALARM ON (debounced) - Distraction: {avg_distraction:.2f}, Dwell: {time_since_switch:.1f}s")
                
        elif self.alarm_on and avg_distraction < (self.config.threshold - self.config.hysteresis_margin):
            if time_since_switch >= self.config.min_dwell_time:
                self.alarm_on = False
                self.last_switch_time = now
                print(f"✅ ALARM OFF (debounced) - Distraction: {avg_distraction:.2f}, Dwell: {time_since_switch:.1f}s")
                
        return self.alarm_on


class EMAAlarm:
    """Alarm using Exponential Moving Average smoothing"""
    
    def __init__(self, config: AlarmConfig):
        self.config = config
        self.ema_score = 0.5  # Start at neutral
        self.alarm_on = False
        self.initialized = False
        
    def update(self, state: int) -> bool:
        """Update with new state (0=focused, 1=not focused) and return alarm status"""
        if not self.initialized:
            self.ema_score = float(state)
            self.initialized = True
        else:
            # EMA formula: score_t = α * state_t + (1 - α) * score_{t-1}
            self.ema_score = (self.config.ema_alpha * state + 
                             (1 - self.config.ema_alpha) * self.ema_score)
        
        # Use hysteresis for alarm switching
        if not self.alarm_on and self.ema_score > self.config.threshold:
            self.alarm_on = True
            print(f"🚨 ALARM ON (EMA) - Score: {self.ema_score:.3f} > {self.config.threshold}")
        elif self.alarm_on and self.ema_score < (self.config.threshold - self.config.hysteresis_margin):
            self.alarm_on = False
            print(f"✅ ALARM OFF (EMA) - Score: {self.ema_score:.3f} < {self.config.threshold - self.config.hysteresis_margin}")
            
        return self.alarm_on
    
    def get_ema_score(self) -> float:
        """Get current EMA score"""
        return self.ema_score


class SmartAlarm:
    """
    Hybrid alarm combining EMA smoothing with dwell time debouncing
    This is the recommended approach for production use
    """
    
    def __init__(self, config: AlarmConfig, alarm_callback: Optional[Callable[[bool], None]] = None):
        self.config = config
        self.window = deque(maxlen=config.window_size)
        self.ema_score = 0.5  # Start at neutral
        self.alarm_on = False
        self.last_switch_time = time.time()
        self.initialized = False
        self.alarm_callback = alarm_callback
        
    def update(self, state: int) -> bool:
        """Update with new state (0=focused, 1=not focused) and return alarm status"""
        # Add to sliding window for backup calculations
        self.window.append(state)
        
        # Update EMA score
        if not self.initialized:
            self.ema_score = float(state)
            self.initialized = True
        else:
            self.ema_score = (self.config.ema_alpha * state + 
                             (1 - self.config.ema_alpha) * self.ema_score)
        
        now = time.time()
        time_since_switch = now - self.last_switch_time
        
        # Determine if we should switch alarm state
        should_turn_on = (not self.alarm_on and 
                         self.ema_score > self.config.threshold and
                         time_since_switch >= self.config.min_dwell_time)
        
        should_turn_off = (self.alarm_on and 
                          self.ema_score < (self.config.threshold - self.config.hysteresis_margin) and
                          time_since_switch >= self.config.min_dwell_time)
        
        if should_turn_on:
            self.alarm_on = True
            self.last_switch_time = now
            message = f"🚨 SMART ALARM ON - EMA: {self.ema_score:.3f}, Dwell: {time_since_switch:.1f}s"
            print(message)
            if self.alarm_callback:
                self.alarm_callback(True)
                
        elif should_turn_off:
            self.alarm_on = False
            self.last_switch_time = now
            message = f"✅ SMART ALARM OFF - EMA: {self.ema_score:.3f}, Dwell: {time_since_switch:.1f}s"
            print(message)
            if self.alarm_callback:
                self.alarm_callback(False)
                
        return self.alarm_on
    
    def get_status(self) -> dict:
        """Get detailed status information"""
        window_avg_distraction = sum(self.window) / len(self.window) if self.window else 0.0
        window_avg_focus = 1.0 - window_avg_distraction
        return {
            'alarm_on': self.alarm_on,
            'ema_score': self.ema_score,
            'window_average': window_avg_distraction,  # For backward compatibility
            'window_average_distraction': window_avg_distraction,
            'window_average_focus': window_avg_focus,
            'window_size': len(self.window),
            'time_since_switch': time.time() - self.last_switch_time,
            'threshold': self.config.threshold,
            'hysteresis_threshold': self.config.threshold - self.config.hysteresis_margin
        }
