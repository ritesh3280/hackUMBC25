# EEG WebSocket Server

Minimal WebSocket server that connects the EEG system directly to the frontend.

## 🚀 Quick Start

### 1. Start the EEG WebSocket Server
```bash
cd eeg
python run_websocket.py
```

### 2. Start the Frontend (in another terminal)
```bash
cd ../frontend
npm run dev
```

### 3. Open Browser
Visit `http://localhost:3000` to see real-time EEG graphs!

## 🔧 How It Works

```
Muse Headband → EEG System → WebSocket Server → Frontend
```

1. **EEG System** (this directory) processes brain signals
2. **WebSocket Server** (`eeg_websocket.py`) streams data to frontend
3. **Frontend** (`../frontend/` directory) displays real-time graphs

## 📡 WebSocket Connection

- **Server**: `ws://localhost:8001`
- **Data Format**: JSON with focus classification, raw EEG, and heart rate
- **Update Rate**: 1 second intervals

## 🧠 EEG Data Flow

1. **Muse Headband** streams EEG data via Bluetooth
2. **muselsl** converts to LSL stream
3. **EEGMoodDetector** processes 6-second windows
4. **Neural Network** classifies focus state
5. **WebSocket** broadcasts to frontend
6. **Graphs** display real-time brain activity

## 🔄 Fallback System

If no Muse headband is connected:
- Server falls back to mock data generation
- Frontend automatically switches to mock mode
- Graphs still work with simulated EEG data

## 🛠️ Dependencies

```bash
pip install websockets pylsl torch numpy scipy scikit-learn joblib
```

## 🎯 Features

- ✅ **Real-time EEG streaming**
- ✅ **Focus state classification**
- ✅ **Heart rate monitoring**
- ✅ **Automatic reconnection**
- ✅ **Mock data fallback**
- ✅ **Multiple client support**

## 🚨 Troubleshooting

**"No EEG stream found"**
- Make sure Muse headband is connected
- Check Bluetooth connection
- Install muselsl: `pip install muselsl`
- **No problem!** System will use mock data automatically

**"WebSocket connection failed"**
- Check if server is running on port 8001
- Verify firewall settings
- Try refreshing the browser
- **Auto-reconnection** - Frontend will retry automatically

**"EEG initialization failed"**
- Check if all dependencies are installed
- Verify EEG model files exist
- Check console for error messages
- **Fallback available** - Mock data will be used

**"TypeError: missing 1 required positional argument: 'path'"**
- ✅ **FIXED** - WebSocket handler now properly handles single argument calls
- ✅ **FIXED** - Exception handling updated for websockets library compatibility
