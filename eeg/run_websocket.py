#!/usr/bin/env python3
"""
Simple runner for the EEG WebSocket server
Run this from the eeg/ directory
"""

import sys
import os

# Ensure we're in the eeg directory
if not os.path.exists('inference.py'):
    print("❌ Please run this from the eeg/ directory")
    print("   cd eeg")
    print("   python run_websocket.py")
    sys.exit(1)

try:
    from eeg_websocket import main
    print("🧠 Starting EEG WebSocket Server...")
    print("📡 Server: ws://localhost:8001")
    print("🔗 Frontend: http://localhost:3000")
    print("💡 No EEG device? No problem - will use mock data!")
    print("💡 Press Ctrl+C to stop")
    print("-" * 50)
    main()
except KeyboardInterrupt:
    print("\n👋 EEG WebSocket server stopped")
except Exception as e:
    print(f"❌ Error: {e}")
    print("💡 Install dependencies: pip install websockets pylsl torch numpy scipy scikit-learn joblib")
