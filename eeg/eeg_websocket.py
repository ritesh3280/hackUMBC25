#!/usr/bin/env python3
"""
Minimal WebSocket server for EEG data streaming
Connects directly to the EEG system and streams to frontend
"""

import asyncio
import json
import time
import websockets
from randomforestinference import EEGMoodDetector
from pylsl import StreamInlet, resolve_byprop
from heartpy import process as hp_process

class EEGWebSocketServer:
    def __init__(self):
        self.detector = None
        self.ppg_inlet = None
        self.clients = set()
        
    async def initialize_eeg(self):
        """Initialize EEG detector and PPG inlet"""
        try:
            print("🧠 Initializing EEG detector...")
            self.detector = EEGMoodDetector(window_sec=6.0)
            self.detector.run()
            
            if self.detector.available:
                print("✅ EEG detector ready!")
            else:
                print("⚠️  No EEG device connected - will use mock data")
                
            # Setup PPG inlet for heart rate
            try:
                ppg_streams = resolve_byprop('type', 'PPG', timeout=5)
                self.ppg_inlet = StreamInlet(ppg_streams[0], max_chunklen=256) if ppg_streams else None
                if self.ppg_inlet:
                    # Initialize PPG buffer for heart rate calculation
                    from collections import deque
                    self.ppg_buffer = deque(maxlen=1000)  # 10 seconds at 100Hz
                    self.ppg_fs = 100  # PPG sample rate
                    print("✅ PPG inlet ready!")
                else:
                    print("⚠️  No PPG device connected")
            except Exception as e:
                print(f"⚠️  PPG not available: {e}")
                self.ppg_inlet = None
                
        except Exception as e:
            print(f"⚠️  EEG initialization failed: {e}")
            print("💡 No EEG device connected - will use mock data")
            self.detector = None
    
    async def register_client(self, websocket):
        """Register new client"""
        # Limit connections to prevent spam
        if len(self.clients) >= 10:
            print(f"⚠️  Too many clients ({len(self.clients)}), rejecting connection")
            await websocket.close()
            return
            
        self.clients.add(websocket)
        print(f"Client connected. Total clients: {len(self.clients)}")
    
    async def unregister_client(self, websocket):
        """Unregister client"""
        self.clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(self.clients)}")
    
    async def get_eeg_data(self):
        """Get latest EEG data"""
        if not self.detector or not self.detector.available:
            # Generate mock data when no EEG device is connected
            return self.generate_mock_data()
            
        try:
            # Get focus classification
            label, probs = self.detector.infer_latest(verbose=False)
            
            # Get raw EEG data
            eeg_sample = None
            with self.detector._lock:
                if self.detector.buf:
                    eeg_sample = self.detector.buf[-1].tolist()
            
            # Get heart rate
            hr = None
            if self.ppg_inlet:
                chunk, _ = self.ppg_inlet.pull_chunk(timeout=0.1, max_samples=1)
                if chunk:
                    for sample in chunk:
                        self.ppg_buffer.append(sample[0])

                    if len(self.ppg_buffer) == self.ppg_buffer.maxlen:
                        try:
                            wd, metrics = hp_process(
                                list(self.ppg_buffer),
                                sample_rate=self.ppg_fs
                            )
                            hr = metrics['bpm']
                        except Exception:
                            hr = None
            
            return {
                "timestamp": int(time.time() * 1000),
                "focus": {
                    "label": label,
                    "probabilities": probs
                },
                "eeg": eeg_sample,
                "heart_rate": hr
            }
        except Exception as e:
            print(f"Error getting EEG data: {e}")
            return self.generate_mock_data()
    
    def generate_mock_data(self):
        """Generate realistic mock EEG data when no device is connected"""
        import random
        
        # Simulate focus state changes
        current_time = time.time()
        focus_cycle = (current_time % 60) / 60  # 1-minute cycle
        is_focused = focus_cycle < 0.7  # 70% focused, 30% unfocused
        
        # Add some randomness
        if random.random() < 0.1:  # 10% chance to flip
            is_focused = not is_focused
        
        # Generate realistic EEG data (5 channels)
        eeg_sample = [
            random.uniform(-0.1, 0.1) for _ in range(5)
        ]
        
        # Generate heart rate (60-80 BPM)
        hr = random.uniform(60, 80)
        
        return {
            "timestamp": int(current_time * 1000),
            "focus": {
                "label": "focused" if is_focused else "unfocused",
                "probabilities": {
                    "focused": 0.85 if is_focused else 0.15,
                    "unfocused": 0.15 if is_focused else 0.85
                }
            },
            "eeg": eeg_sample,
            "heart_rate": hr
        }
    
    async def broadcast_data(self):
        """Broadcast EEG data to all connected clients"""
        while True:
            if self.clients:
                data = await self.get_eeg_data()
                if data:
                    message = json.dumps(data)
                    # Send to all connected clients
                    disconnected = set()
                    for client in self.clients:
                        try:
                            await client.send(message)
                        except Exception:
                            disconnected.add(client)
                    
                    # Remove disconnected clients
                    for client in disconnected:
                        await self.unregister_client(client)
            
            await asyncio.sleep(1.0)  # Update every second
    
    async def handle_client(self, websocket, path):
        """Handle individual client connection"""
        await self.register_client(websocket)
        try:
            # Keep connection alive
            async for message in websocket:
                # Echo back any message (for ping/pong)
                await websocket.send(f"Echo: {message}")
        except Exception:
            pass
        finally:
            await self.unregister_client(websocket)
    
    async def start_server(self, host="localhost", port=8001):
        """Start the WebSocket server"""
        print(f"Starting EEG WebSocket server on {host}:{port}")
        
        # Initialize EEG system
        await self.initialize_eeg()
        
        # Start broadcasting task
        broadcast_task = asyncio.create_task(self.broadcast_data())
        
        # Start WebSocket server
        async def handler(websocket):
            await self.handle_client(websocket, "/")
        
        async with websockets.serve(handler, host, port):
            print(f"EEG WebSocket server running on ws://{host}:{port}")
            print("Clients can connect to receive real-time EEG data")
            
            try:
                await broadcast_task
            except KeyboardInterrupt:
                print("Shutting down...")
                broadcast_task.cancel()
                if self.detector:
                    self.detector.stop()

def main():
    server = EEGWebSocketServer()
    asyncio.run(server.start_server())

if __name__ == "__main__":
    main()
