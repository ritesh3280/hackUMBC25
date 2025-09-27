import random
import time
import pygame
import threading
import requests
import json
from alarm import SmartAlarm, AlarmConfig

# Configure the alarm for production use
config = AlarmConfig(
    window_size=30,
    threshold=0.4,
    min_dwell_time=3.0,   # More stable for real use
    ema_alpha=0.15,       # Balanced EMA reaction
    hysteresis_margin=0.15
)

# Backend URL - adjust if your backend runs on a different port
BACKEND_URL = "http://localhost:8000/stream"

# Option to use mock data for testing
USE_MOCK_DATA = False  # Set to True to use test arrays instead of backend

# Test arrays for mock mode
testArray1 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]

class SoundManager:
    """Manages alarm sound playback using pygame"""
    
    def __init__(self):
        pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
        self.is_playing = False
        self.sound_thread = None
        self.stop_event = threading.Event()
        
        # Generate a simple beep sound programmatically
        self.create_alarm_sound()
        
    def create_alarm_sound(self):
        """Create a simple alarm beep sound programmatically"""
        import numpy as np
        
        # Sound parameters
        sample_rate = 22050
        duration = 0.5  # 0.5 seconds
        frequency = 800  # 800 Hz beep
        
        # Generate sine wave
        frames = int(duration * sample_rate)
        arr = np.zeros((frames, 2))
        
        for i in range(frames):
            # Create a beep that fades in and out to avoid clicks
            fade_frames = int(0.05 * sample_rate)  # 50ms fade
            amplitude = 0.3
            
            if i < fade_frames:
                amplitude *= i / fade_frames
            elif i > frames - fade_frames:
                amplitude *= (frames - i) / fade_frames
                
            wave = amplitude * np.sin(2 * np.pi * frequency * i / sample_rate)
            arr[i][0] = wave  # Left channel
            arr[i][1] = wave  # Right channel
            
        # Convert to pygame sound
        sound_array = (arr * 32767).astype(np.int16)
        self.alarm_sound = pygame.sndarray.make_sound(sound_array)
        
    def start_alarm(self):
        """Start playing the alarm sound in a loop"""
        if not self.is_playing:
            self.is_playing = True
            self.stop_event.clear()
            self.sound_thread = threading.Thread(target=self._play_loop)
            self.sound_thread.daemon = True
            self.sound_thread.start()
            print("🔊 Alarm sound started")
            
    def stop_alarm(self):
        """Stop playing the alarm sound"""
        if self.is_playing:
            self.is_playing = False
            self.stop_event.set()
            pygame.mixer.stop()
            if self.sound_thread:
                self.sound_thread.join(timeout=1.0)
            print("🔇 Alarm sound stopped")
            
    def _play_loop(self):
        """Internal method to play sound in a loop"""
        while self.is_playing and not self.stop_event.is_set():
            try:
                self.alarm_sound.play()
                # Wait for the sound to finish, but check stop event periodically
                for _ in range(10):  # Check 10 times during the 0.5s sound
                    if self.stop_event.wait(0.05):  # Wait 50ms
                        return
                # Brief pause between beeps
                if self.stop_event.wait(0.3):  # 300ms pause
                    return
            except Exception as e:
                print(f"Sound playback error: {e}")
                break
                
    def cleanup(self):
        """Clean up pygame mixer"""
        self.stop_alarm()
        pygame.mixer.quit()

# Initialize sound manager
try:
    sound_manager = SoundManager()
except Exception as e:
    print(f"Warning: Could not initialize sound system: {e}")
    print("Sound functionality will be disabled")
    sound_manager = None

def alarm_callback(alarm_on):
    """Callback function to handle alarm state changes with sound"""
    if sound_manager:
        if alarm_on:
            sound_manager.start_alarm()
        else:
            sound_manager.stop_alarm()

# Initialize alarm with sound callback
alarm = SmartAlarm(config, alarm_callback=alarm_callback)

def connect_to_backend_stream():
    """Connect to the backend SSE stream and yield focus states."""
    try:
        print(f"Connecting to backend at {BACKEND_URL}...")
        response = requests.get(BACKEND_URL, stream=True, timeout=5)
        response.raise_for_status()
        
        print("✅ Connected to backend stream")
        
        # Process SSE stream manually
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    try:
                        # Extract JSON data after "data: "
                        json_str = line[6:]  # Skip "data: " prefix
                        
                        # Skip empty data
                        if not json_str or json_str.strip() == '':
                            continue
                            
                        data = json.loads(json_str)
                        
                        # Check if data is None or not a dictionary
                        if data is None or not isinstance(data, dict):
                            print(f"Warning: Received invalid data format: {data}")
                            continue
                        
                        label = data.get('label', '')
                        probs = data.get('probs', {})
                        
                        # Validate that we have valid data
                        if not label and not probs:
                            print(f"Warning: No label or probs in data: {data}")
                            continue
                        
                        # Convert label to binary state (0=focused, 1=unfocused)
                        if label == 'focused':
                            state = 0
                        elif label == 'unfocused':
                            state = 1
                        else:
                            # If unknown label, use probability
                            if probs and isinstance(probs, dict):
                                focused_prob = probs.get('focused', 0.5)
                                state = 0 if focused_prob > 0.5 else 1
                            else:
                                # Default to focused if we can't determine
                                print(f"Warning: Unknown label '{label}' and no valid probs, defaulting to focused")
                                state = 0
                        
                        # Debug output
                        if probs and isinstance(probs, dict):
                            prob_text = " | ".join([f"{k}: {v:.2f}" for k, v in probs.items()])
                            print(f"[Backend] Label: {label} | State: {state} | {prob_text}")
                        else:
                            print(f"[Backend] Label: {label} | State: {state} | No probability data")
                        
                        yield state
                        
                    except json.JSONDecodeError as e:
                        print(f"Error parsing SSE data: {e} | Raw: {line}")
                        continue
                    except AttributeError as e:
                        print(f"AttributeError processing event: {e} | Data type: {type(data) if 'data' in locals() else 'unknown'}")
                        continue
                    except Exception as e:
                        print(f"Unexpected error processing event: {e}")
                        continue
                
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to backend at {BACKEND_URL}")
        print("Make sure the backend is running: uvicorn backend:app --reload")
        raise
    except Exception as e:
        print(f"❌ Stream error: {e}")
        raise

def generate_mock_focus_stream(test_array, update_interval=0.2):
    """Generate a focus stream from a predefined array (for testing)."""
    for state in test_array:
        yield state
        time.sleep(update_interval)

def process_focus_stream(stream_generator):
    """Process the focus stream in real-time."""
    prev_alarm_state = None
    stats = {
        'total_samples': 0,
        'focused_samples': 0,
        'unfocused_samples': 0,
        'alarm_triggers': 0
    }
    
    try:
        for state in stream_generator:
            # Update statistics
            stats['total_samples'] += 1
            if state == 0:
                stats['focused_samples'] += 1
            else:
                stats['unfocused_samples'] += 1
            
            # Update alarm
            alarm_on = alarm.update(state)
            
            # Track alarm state changes
            if alarm_on != prev_alarm_state:
                if alarm_on:
                    stats['alarm_triggers'] += 1
                    print("\n🚨 ALARM TRIGGERED - User appears distracted!")
                else:
                    print("\n✅ ALARM CLEARED - User is focused again")
                prev_alarm_state = alarm_on
            
            # Get detailed status
            status = alarm.get_status()
            
            # Print periodic status update (every 10 samples)
            if stats['total_samples'] % 10 == 0:
                focus_pct = (stats['focused_samples'] / stats['total_samples']) * 100
                print(f"\n[Stats] Samples: {stats['total_samples']} | "
                      f"Focus: {focus_pct:.1f}% | "
                      f"Alarms: {stats['alarm_triggers']} | "
                      f"EMA: {status['ema_score']:.3f}")
    
    except KeyboardInterrupt:
        print("\n\nStopping alarm monitor...")
    except Exception as e:
        print(f"\nError in processing: {e}")
    finally:
        # Print final statistics
        if stats['total_samples'] > 0:
            focus_pct = (stats['focused_samples'] / stats['total_samples']) * 100
            print(f"\n" + "="*50)
            print("Final Statistics:")
            print(f"Total Samples: {stats['total_samples']}")
            print(f"Focus Rate: {focus_pct:.1f}%")
            print(f"Alarm Triggers: {stats['alarm_triggers']}")
            print("="*50)

if __name__ == "__main__":
    print("="*50)
    print("Smart Alarm System with EEG Backend Integration")
    print("="*50)
    
    # Display configuration
    print(f"\nAlarm Configuration:")
    print(f"  - Window Size: {config.window_size} samples")
    print(f"  - Distraction Threshold: {config.threshold}")
    print(f"  - Min Dwell Time: {config.min_dwell_time}s")
    print(f"  - EMA Alpha: {config.ema_alpha}")
    print(f"  - Hysteresis Margin: {config.hysteresis_margin}")
    
    if USE_MOCK_DATA:
        print("\n⚠️  Running in MOCK DATA mode")
        print("Using testArray1 for simulation")
        stream_generator = generate_mock_focus_stream(testArray1, update_interval=0.2)
    else:
        print(f"\n🔗 Connecting to backend at {BACKEND_URL}")
        print("Make sure the backend is running:")
        print("  uvicorn backend:app --reload --host 0.0.0.0 --port 8000")
        print()
        
        try:
            # Test connection first
            test_response = requests.get(BACKEND_URL, stream=True, timeout=5)
            test_response.raise_for_status()
            test_response.close()  # Close the test connection
            
            # If successful, create the actual stream generator
            stream_generator = connect_to_backend_stream()
        except Exception as e:
            print(f"\n❌ Failed to connect to backend: {e}")
            print("\nFalling back to MOCK DATA mode...")
            stream_generator = generate_mock_focus_stream(testArray1, update_interval=0.2)
    
    print("\n" + "="*50)
    print("Starting alarm monitoring...")
    print("Press Ctrl+C to stop")
    print("="*50 + "\n")
    
    # Process the stream
    process_focus_stream(stream_generator)
    
    # Clean up sound system
    if sound_manager:
        sound_manager.cleanup()
        print("\nSound system cleaned up")
