
import argparse
import json
import time
from collections import deque

import numpy as np
from joblib import dump, load
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

from pylsl import StreamInlet, resolve_byprop
import asyncio
import threading
from muselsl import stream as muse_stream, list_muses

from signal_processing import filter_eeg_signal, extract_band_powers


# -----------------------
# Streaming utilities
# -----------------------
def ensure_stream():
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


# -----------------------
# Training
# -----------------------
def train_rf(x_path='X.npy', y_path='y.npy', out_model='rf_eeg_model.joblib'):
    X = np.load(x_path)
    y = np.load(y_path)

    # Clean NaNs/Infs just in case
    X = np.nan_to_num(X, nan=0.0, neginf=-12.0, posinf=12.0)

    # If label_map.json exists, respect its class order, else create it
    try:
        with open('label_map.json', 'r') as f:
            label_map = {int(k): v for k, v in json.load(f).items()}
    except Exception:
        classes = sorted(np.unique(y).tolist())
        label_map = {i: f"class_{i}" for i in classes}
        with open('label_map.json', 'w') as f:
            json.dump({int(k): v for k, v in label_map.items()}, f)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Class weights (balanced) help with imbalance
    classes = np.unique(y_train)
    cw = compute_class_weight(class_weight='balanced', classes=classes, y=y_train)
    class_weight = {int(c): float(w) for c, w in zip(classes, cw)}

    rf = RandomForestClassifier(
        n_estimators=600,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features='sqrt',
        n_jobs=-1,
        class_weight=class_weight,
        random_state=42,
        oob_score=True
    )

    print("[INFO] Training RandomForest...")
    rf.fit(X_train, y_train)

    y_pred = rf.predict(X_val)
    acc = accuracy_score(y_val, y_pred)
    print(f"[INFO] Val Accuracy: {acc:.4f}")
    print(classification_report(y_val, y_pred, target_names=[label_map[i] for i in sorted(label_map.keys())], zero_division=0))

    dump(rf, out_model)
    print(f"[INFO] Saved model -> {out_model}")

    # Mirror inference config to match your feature extraction windowing
    try:
        with open('feature_params.json', 'r') as f:
            feat = json.load(f)
    except Exception:
        feat = {'window_sec': 8.0, 'step_sec': 1.0, 'fs': 256}
    with open('inference_config.json', 'w') as f:
        json.dump({
            'window_sec': float(feat.get('window_sec', 8.0)),
            'step_sec'  : float(feat.get('step_sec', 1.0)),
            'fs'        : int(feat.get('fs', 256))
        }, f)
    print("[INFO] Wrote inference_config.json")


# -----------------------
# Live inference
# -----------------------
def infer_live(model_path='rf_eeg_model.joblib'):
    # Labels
    try:
        with open('label_map.json', 'r') as f:
            label_map = {int(k): v for k, v in json.load(f).items()}
    except Exception:
        label_map = {}

    # Model
    rf = load(model_path)
    print(f"[INFO] Loaded {model_path}")

    # Config
    window_sec, step_sec = 8.0, 1.0
    try:
        with open('inference_config.json', 'r') as f:
            cfg = json.load(f)
            window_sec = float(cfg.get('window_sec', window_sec))
            step_sec = float(cfg.get('step_sec', step_sec))
    except Exception:
        pass

    # Stream
    ensure_stream()
    streams = resolve_byprop('type', 'EEG', timeout=20)
    if not streams:
        raise RuntimeError("No EEG stream found.")
    inlet = StreamInlet(streams[0], max_chunklen=256)
    fs = int(inlet.info().nominal_srate()) or 256
    win_samps = int(window_sec * fs)
    step_samps = int(step_sec * fs)

    print(f"[INFO] Connected (fs={fs}Hz). window={window_sec}s, hop={step_sec}s")
    buf = deque(maxlen=win_samps)
    pred_hist = deque(maxlen=5)

    # Prime buffer
    print("[INFO] Filling buffer...")
    while len(buf) < win_samps:
        chunk, _ = inlet.pull_chunk(timeout=1.0, max_samples=256)
        if chunk:
            for s in chunk:
                buf.append(np.array(s[:5], dtype=np.float32))  # use first 5 EEG channels (Muse)

    print("[INFO] Streaming... Ctrl+C to stop.")
    pending = 0
    last_pred = time.time()
    try:
        while True:
            chunk, _ = inlet.pull_chunk(timeout=1.0, max_samples=256)
            if chunk:
                for s in chunk:
                    buf.append(np.array(s[:5], dtype=np.float32))
                pending += len(chunk)

            now = time.time()
            if pending >= step_samps or (now - last_pred) >= step_sec:
                eeg_win = np.vstack(buf)[-win_samps:, :]
                eeg_filt = filter_eeg_signal(eeg_win, fs)
                band_powers = extract_band_powers(eeg_filt, fs)  # shape (5 channels, 5 bands)
                feat = np.nan_to_num(band_powers, nan=0.0, neginf=-12.0, posinf=12.0).flatten()[None, :]

                probs = rf.predict_proba(feat)[0]
                pred_idx = int(np.argmax(probs))
                pred_hist.append(pred_idx)
                # smooth
                counts = np.bincount(pred_hist, minlength=len(probs))
                smooth_idx = int(np.argmax(counts))
                label = label_map.get(smooth_idx, str(smooth_idx))
                conf = float(probs[smooth_idx])

                prob_text = " ".join([f"{label_map.get(i, i)}:{probs[i]:.2f}" for i in range(len(probs))])
                ts = time.strftime("%H:%M:%S")
                print(f"[{ts}] pred={label} ({conf:.2f}) | {prob_text}")

                last_pred = now
                pending = 0
    except KeyboardInterrupt:
        print("\n[INFO] Inference loop terminated.")


# -----------------------
# CLI
# -----------------------
def main():
    parser = argparse.ArgumentParser(description="Random Forest EEG pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)

    tr = sub.add_parser("train", help="Train Random Forest on X.npy/y.npy")
    tr.add_argument("--x", default="X.npy")
    tr.add_argument("--y", default="y.npy")
    tr.add_argument("--out", default="rf_eeg_model.joblib")

    inf = sub.add_parser("infer", help="Run live inference with RF model")
    inf.add_argument("--model", default="rf_eeg_model.joblib")

    args = parser.parse_args()
    if args.cmd == "train":
        train_rf(args.x, args.y, args.out)
    elif args.cmd == "infer":
        infer_live(args.model)


if __name__ == "__main__":
    main()