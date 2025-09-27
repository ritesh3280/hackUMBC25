from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json

from eeg.inference import EEGMoodDetector

app = FastAPI()
detector = EEGMoodDetector(window_sec=6.0)
detector.run()

async def event_generator():
    while True:
        label, probs = detector.infer_latest(verbose=False)
        payload = {"label": label, "probs": probs}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(1.0)

@app.get("/stream")
async def stream():
    return StreamingResponse(event_generator(),
                             media_type="text/event-stream")

@app.on_event("shutdown")
def shutdown():
    detector.stop()