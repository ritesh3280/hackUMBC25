from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json
import time

# For PPG inlet
from pylsl import StreamInlet, resolve_byprop

from eeg.inference import EEGMoodDetector

app = FastAPI()
detector = EEGMoodDetector(window_sec=6.0)
detector.run()

# Setup PPG inlet for heart rate streaming
try:
    ppg_streams = resolve_byprop('type', 'PPG', timeout=5)
    ppg_inlet = StreamInlet(ppg_streams[0], max_chunklen=256) if ppg_streams else None
except Exception:
    ppg_inlet = None

async def event_generator():
    while not detector.available:
        await asyncio.sleep(0.5)
    while True:
        label, probs = detector.infer_latest(verbose=False)
        if label is None:
            await asyncio.sleep(1.0)
            continue
        payload = {"label": label, "probs": probs}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(1.0)

@app.get("/stream")
async def stream():
    return StreamingResponse(event_generator(),
                             media_type="text/event-stream")

@app.get("/unified_stream")
async def unified_stream():
    async def unified_generator():
        while not detector.available:
            await asyncio.sleep(0.1)
        
        while True:
            # Get focus classification
            label, probs = detector.infer_latest(verbose=False)
            
            # Get raw EEG data
            eeg_sample = None
            with detector._lock:
                if detector.buf:
                    eeg_sample = detector.buf[-1].tolist()
            
            # Get heart rate
            hr = None
            if ppg_inlet:
                chunk, _ = ppg_inlet.pull_chunk(timeout=0.1, max_samples=1)
                if chunk:
                    hr = float(chunk[0][0])
            
            # Combined payload
            payload = {
                "timestamp": int(time.time() * 1000),
                "focus": {
                    "label": label,
                    "probabilities": probs
                },
                "eeg": eeg_sample,
                "heart_rate": hr
            }
            
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(1.0)
    
    return StreamingResponse(unified_generator(), media_type="text/event-stream")

@app.get("/raw_eeg")
async def raw_eeg():
    async def raw_eeg_generator():
        while not detector.available:
            await asyncio.sleep(0.1)
        while True:
            with detector._lock:
                if detector.buf:
                    sample = detector.buf[-1].tolist()
                    yield f"data: {json.dumps({'eeg': sample})}\n\n"
            await asyncio.sleep(0)
    return StreamingResponse(raw_eeg_generator(), media_type="text/event-stream")

@app.get("/heart_rate")
async def heart_rate():
    async def heart_rate_generator():
        while ppg_inlet is None:
            await asyncio.sleep(0.1)
        while True:
            chunk, _ = ppg_inlet.pull_chunk(timeout=1.0, max_samples=1)
            if chunk:
                hr = float(chunk[0][0])
                yield f"data: {json.dumps({'hr': hr})}\n\n"
            await asyncio.sleep(0)
    return StreamingResponse(heart_rate_generator(), media_type="text/event-stream")

@app.on_event("shutdown")
def shutdown():
    detector.stop()