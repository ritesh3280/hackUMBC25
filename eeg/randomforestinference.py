import os
import sys
import time
import json
import threading
import subprocess
from collections import deque
import numpy as np
from joblib import load
from pylsl import StreamInlet, resolve_byprop
from signal_processing import filter_eeg_signal, extract_band_powers

class EEGMoodDetector:
    def __init__(self, window_sec=6.0, model_path='rf_eeg_model.joblib', scaler_path='scaler.joblib'):
        self.window_sec = float(window_sec)
        self.model_path = model_path
        self.scaler_path = scaler_path

        self.inlet = None
        self.fs = None
        self.win_samps = None
        self.buf = None
        self._collector_thread = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._muselsl_proc = None
        self.available = False

        # Labels
        try:
            with open('label_map.json', 'r') as f:
                lm = json.load(f)
            self.label_map = {int(k): v for k, v in lm.items()}
        except Exception:
            self.label_map = {0: 'focused', 1: 'unfocused'}

        # Scaler (optional)
        try:
            self.scaler = load(self.scaler_path)
            print("EEG(RF): Loaded scaler.joblib")
        except Exception:
            print("EEG(RF): scaler.joblib not found. Using identity scaler.")
            class IdentityScaler:
                def transform(self, X): return X
            self.scaler = IdentityScaler()

        # Model
        try:
            self.model = load(self.model_path)
            print(f"EEG(RF): Loaded model '{self.model_path}'")
        except Exception as e:
            print(f"EEG(RF): Failed to load model '{self.model_path}': {e}")
            self.model = None

        # LSL stream + buffer
        try:
            self._ensure_stream()
            self._prefill_buffer()
            self.available = (self.inlet is not None and self.model is not None)
        except Exception as e:
            print(f"EEG(RF): Initialization error: {e}")
            self.available = False

    # ---------- Stream setup ----------
    def _start_muselsl_if_needed(self):
        streams = resolve_byprop('type', 'EEG', timeout=3)
        if streams:
            return
        print("EEG(RF): No EEG stream found. Launching muselsl...")
        flags = 0
        if os.name == 'nt':
            flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        try:
            self._muselsl_proc = subprocess.Popen(
                [sys.executable, "-m", "muselsl", "stream", "--ppg", "--acc", "--gyro"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.STDOUT,
                creationflags=flags if os.name == 'nt' else 0
            )
        except Exception as e:
            raise RuntimeError(f"EEG(RF): Failed to launch muselsl: {e}")

        for _ in range(40):
            streams = resolve_byprop('type', 'EEG', timeout=0.5)
            if streams:
                print("EEG(RF): EEG stream is up.")
                return
            time.sleep(0.5)
        try:
            if self._muselsl_proc and self._muselsl_proc.poll() is None:
                self._muselsl_proc.terminate()
        except Exception:
            pass
        raise RuntimeError("EEG(RF): muselsl stream timeout.")

    def _ensure_stream(self):
        self._start_muselsl_if_needed()
        print("EEG(RF): Resolving EEG LSL stream...")
        streams = resolve_byprop('type', 'EEG', timeout=20)
        if not streams:
            raise RuntimeError("EEG(RF): No EEG stream found.")
        self.inlet = StreamInlet(streams[0], max_chunklen=256)
        self.fs = int(self.inlet.info().nominal_srate()) or 256
        self.win_samps = int(self.window_sec * self.fs)
        self.buf = deque(maxlen=self.win_samps)
        print(f"EEG(RF): Connected (fs={self.fs}Hz), window={self.window_sec}s")

    def _prefill_buffer(self):
        if not self.inlet:
            return
        print("EEG(RF): Prefilling buffer...")
        while len(self.buf) < self.win_samps:
            chunk, _ = self.inlet.pull_chunk(timeout=1.0, max_samples=256)
            if chunk:
                with self._lock:
                    for s in chunk:
                        self.buf.append(np.array(s[:5], dtype=np.float32))
        print("EEG(RF): Buffer ready.")

    # ---------- Background collector ----------
    def run(self):
        if not self.available:
            print("EEG(RF): Not available; run() skipped.")
            return
        if self._collector_thread and self._collector_thread.is_alive():
            return
        self._stop_event.clear()
        self._collector_thread = threading.Thread(target=self._collector_loop, daemon=True)
        self._collector_thread.start()
        print("EEG(RF): Collector started.")

    def stop(self):
        self._stop_event.set()
        if self._collector_thread and self._collector_thread.is_alive():
            self._collector_thread.join(timeout=2)
        try:
            if self._muselsl_proc and self._muselsl_proc.poll() is None:
                if os.name == 'nt':
                    self._muselsl_proc.terminate()
        except Exception:
            pass
        print("EEG(RF): Collector stopped.")

    def _collector_loop(self):
        try:
            while not self._stop_event.is_set():
                chunk, _ = self.inlet.pull_chunk(timeout=1.0, max_samples=256)
                if not chunk:
                    continue
                with self._lock:
                    for s in chunk:
                        self.buf.append(np.array(s[:5], dtype=np.float32))
        except Exception as e:
            print(f"EEG(RF): Collector error: {e}")

    # ---------- Inference ----------
    def infer_latest(self, verbose=True):
        if not self.available or self.model is None or self.buf is None:
            return None, None

        with self._lock:
            if len(self.buf) < self.win_samps:
                return None, None
            eeg_win = np.vstack(self.buf)[-self.win_samps:, :]

        fs_use = self.fs or 256
        eeg_filt = filter_eeg_signal(eeg_win, fs_use)
        bp = extract_band_powers(eeg_filt, fs_use)
        feat = bp.flatten()[None, :]
        feat = self.scaler.transform(feat)

        # RandomForest probabilities
        try:
            probs = self.model.predict_proba(feat)[0]
        except Exception:
            # Fallback: uniform if model cannot provide probabilities
            probs = np.ones(len(self.label_map), dtype=float) / max(1, len(self.label_map))

        pred_idx = int(np.argmax(probs))
        label = self.label_map.get(pred_idx, str(pred_idx))
        probs_dict = {self.label_map[i]: float(probs[i]) for i in range(len(probs))}

        if verbose:
            ts = time.strftime("%H:%M:%S")
            prob_text = " ".join([f"{k}:{probs_dict[k]:.2f}" for k in self.label_map.values()])
            print(f"[EEG(RF) {ts}] mood={label} | {prob_text}")
        return label, probs_dict


if __name__ == '__main__':
    det = EEGMoodDetector(window_sec=6.0)
    det.run()
    while True:
        label, probs = det.infer_latest(verbose=False)
        print(f"EEG(RF): {label} | {probs}")
        time.sleep(2)