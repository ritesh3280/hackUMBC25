#!/usr/bin/env python3
"""
Simple startup script for the EEG WebSocket server
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from eeg_websocket import main
    print("🚀 Starting EEG WebSocket Server...")
    print("📡 Server will run on ws://localhost:8001")
    print("🧠 Connecting to EEG system...")
    print("💡 Press Ctrl+C to stop")
    print("-" * 50)
    main()
except KeyboardInterrupt:
    print("\n👋 EEG WebSocket server stopped")
except Exception as e:
    print(f"❌ Error starting server: {e}")
    print("💡 Make sure you have the required dependencies installed:")
    print("   pip install websockets pylsl torch numpy scipy scikit-learn joblib")
