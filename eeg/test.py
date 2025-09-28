import time
import json
import numpy as np
import torch
import torch.nn.functional as F
from collections import deque
from pylsl import StreamInlet, resolve_byprop
from joblib import load
from model import HemiAttentionLSTM
import asyncio
import threading
from muselsl import stream as muse_stream, list_muses
from signal_processing import design_bandpass, filter_eeg_signal, extract_band_powers

def ensure_stream():
    """Ensure an EEG LSL stream exists. If not, start muselsl in a background thread."""
    streams = resolve_byprop('type', 'EEG', timeout=3)
    if streams:
        print("[INFO] Existing EEG LSL stream detected.")
        return None

    print("[INFO] No EEG stream found. Searching for Muse device")
    muses = list_muses()
    if not muses:
        raise RuntimeError("No MUSE found.")

    addr = muses[0]['address']
    print(f"[INFO] Launching muselsl stream for {addr}")

    def run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        muse_stream(addr, ppg_enabled=True, acc_enabled=True, gyro_enabled=True)

    t = threading.Thread(target=run, daemon=True)
    t.start()

    for _ in range(40):
        streams = resolve_byprop('type', 'EEG', timeout=0.5)
        if streams:
            print("[INFO] EEG LSL stream is active.")
            return t
        time.sleep(0.5)

    raise RuntimeError("Failed to start EEG stream.")

def run_inference():
    try:
        with open('label_map.json', 'r') as f:
            label_map = json.load(f)
        label_map = {int(k): v for k, v in label_map.items()}
    except Exception:
        label_map = {0: 'focused', 1: 'unfocused'}

    try:
        scaler = load('scaler.joblib')
        print("Loaded scaler.joblib")
    except Exception:
        print("Warning: scaler.joblib not found. Using identity scaler (no standardization).")
        class IdentityScaler:
            def transform(self, X): return X
        scaler = IdentityScaler()
        
    stream_thread = ensure_stream()

    window_sec, step_sec = 8.0, 1.0
    try:
        with open('inference_config.json', 'r') as f:
            cfg = json.load(f)
            window_sec = float(cfg.get('window_sec', window_sec))
            step_sec = float(cfg.get('step_sec', step_sec))
    except Exception:
        pass
    streams = resolve_byprop('type', 'EEG', timeout=20)
    if not streams:
        raise RuntimeError("No EEG stream found.")
    inlet = StreamInlet(streams[0], max_chunklen=256)
    fs = int(inlet.info().nominal_srate()) or 256
    win_samps = int(window_sec * fs)
    step_samps = int(step_sec * fs)

    print(f"Connected to EEG stream (fs={fs}Hz). Using window={window_sec}s, hop={step_sec}s")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = HemiAttentionLSTM(input_size=5, num_classes=len(label_map)).to(device)
    state = torch.load('best_eeg_model.pth', map_location=device)
    model.load_state_dict(state)
    model.eval()

    buf = deque(maxlen=win_samps)
    last_pred_time = time.time()
    pred_hist = deque(maxlen=5)

    print("Filling buffer...")
    while len(buf) < win_samps:
        chunk, _ = inlet.pull_chunk(timeout=1.0, max_samples=256)
        if chunk:
            for s in chunk:
                buf.append(np.array(s[:5], dtype=np.float32))

    print("Streaming... Press Ctrl+C to stop.")
    pending = 0
    try:
        while True:
            chunk, _ = inlet.pull_chunk(timeout=1.0, max_samples=256)
            if chunk:
                for s in chunk:
                    buf.append(np.array(s[:5], dtype=np.float32))
                pending += len(chunk)

            now = time.time()
            if pending >= step_samps or (now - last_pred_time) >= step_sec:
                eeg_win = np.vstack(buf)[-win_samps:, :]
                eeg_filt = filter_eeg_signal(eeg_win, fs)
                bp = extract_band_powers(eeg_filt, fs)
                feat = bp.flatten()[None, :]
                feat = scaler.transform(feat)

                x = feat.reshape(1, 5, 5).transpose(0, 2, 1)
                x_t = torch.from_numpy(x.astype(np.float32)).to(device)

                with torch.no_grad():
                    logits = model(x_t)
                    probs = F.softmax(logits, dim=1).cpu().numpy()[0]
                    pred_idx = int(probs.argmax())
                    pred_hist.append(pred_idx)
                    counts = np.bincount(pred_hist, minlength=len(label_map))
                    smooth_idx = int(np.argmax(counts))
                    pred_label = label_map.get(smooth_idx, str(smooth_idx))
                    conf = float(probs[smooth_idx])

                prob_text = " ".join([f"{label_map[i]}:{probs[i]:.2f}" for i in range(len(probs))])
                ts = time.strftime("%H:%M:%S")
                print(f"[{ts}] pred={pred_label} ({conf:.2f}) | {prob_text}")

                last_pred_time = now
                pending = 0
    except KeyboardInterrupt:
        print("[INFO] Inference loop terminated by user.")

if __name__ == "__main__":
    run_inference()