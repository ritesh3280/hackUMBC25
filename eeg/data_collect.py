#!/usr/bin/env python3

import argparse
import asyncio
import threading
import time
import numpy as np
from muselsl import stream as muse_stream, list_muses
from pylsl import StreamInlet, resolve_byprop

DEFAULT_DURATION = 600
PPG_MAX_SAMPLES = 64
EEG_MAX_SAMPLES = 256
STREAM_TIMEOUT = 20
    
def ensure_stream():
    """Ensure an EEG LSL stream exists. If not, start muselsl in a background thread."""
    streams = resolve_byprop("type", "EEG", timeout=3)
    if streams:
        print("[INFO] Existing EEG LSL stream detected.")
        return None
    print("[INFO] No EEG stream found. Searching for Muse device")
    muses = list_muses()
    if not muses:
        raise RuntimeError("No MUSE found.")
    addr = muses[0]["address"]
    print(f"[INFO] Launching muselsl stream for {addr}")
    def run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        muse_stream(addr, ppg_enabled=True, acc_enabled=True, gyro_enabled=True)
    t = threading.Thread(target=run, daemon=True)
    t.start()
    for _ in range(int(STREAM_TIMEOUT * 2)):
        streams = resolve_byprop("type", "EEG", timeout=0.5)
        if streams:
            print("[INFO] EEG LSL stream is active.")
            return t
        time.sleep(0.5)
    raise RuntimeError("Failed to start EEG stream.")

def parse_arguments():
    parser = argparse.ArgumentParser(description="Record EEG and PPG data from MUSE device.")
    parser.add_argument("emotion", type=str, help="Emotion label for the recording.")
    parser.add_argument(
        "--duration", "-d", type=int, default=DEFAULT_DURATION,
        help=f"Recording duration in seconds (default: {DEFAULT_DURATION})."
    )
    parser.add_argument(
        "--output", "-o", type=str,
        help="Output filename (default: <emotion>.npz)."
    )
    return parser.parse_args()

def get_muse_address():
    muses = list_muses()
    if not muses:
        raise RuntimeError("No MUSE device.")
    return muses[0]["address"]

def stream_worker(addr):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    muse_stream(addr, ppg_enabled=True, acc_enabled=True, gyro_enabled=True)

def launch_muse_stream(address):
    thread = threading.Thread(target=stream_worker, args=(address,), daemon=True)
    thread.start()
    print(f"Started MUSE stream for {address}.")

def open_inlets():
    eeg_streams = resolve_byprop("type", "EEG", timeout=STREAM_TIMEOUT)
    ppg_streams = resolve_byprop("type", "PPG", timeout=STREAM_TIMEOUT)
    if not eeg_streams:
        raise RuntimeError("No EEG stream found.")
    if not ppg_streams:
        raise RuntimeError("No PPG stream found.")
    eeg_inlet = StreamInlet(eeg_streams[0], max_chunklen=EEG_MAX_SAMPLES)
    ppg_inlet = StreamInlet(ppg_streams[0], max_chunklen=PPG_MAX_SAMPLES)
    eeg_fs = int(eeg_inlet.info().nominal_srate())
    ppg_fs = int(ppg_inlet.info().nominal_srate())
    print(f"Connected to EEG (fs={eeg_fs}Hz) and PPG (fs={ppg_fs}Hz) inlets.")
    return eeg_inlet, ppg_inlet

def collect_data(eeg_inlet, ppg_inlet, duration):
    eeg_chunks, ppg_chunks = [], []
    start = time.time()
    while time.time() - start < duration:
        eeg_chunk, _ = eeg_inlet.pull_chunk(timeout=1.0, max_samples=EEG_MAX_SAMPLES)
        if eeg_chunk:
            eeg_chunks.append(np.array(eeg_chunk))
        ppg_chunk, _ = ppg_inlet.pull_chunk(timeout=0.0, max_samples=PPG_MAX_SAMPLES)
        if ppg_chunk:
            ppg_chunks.append(np.array(ppg_chunk))
        elapsed = time.time() - start
        print(f"\r{int(elapsed)}/{duration} seconds", end="", flush=True)
    print()
    eeg_data = np.concatenate(eeg_chunks, axis=0) if eeg_chunks else np.array([])
    ppg_data = np.concatenate(ppg_chunks, axis=0) if ppg_chunks else np.array([])
    return eeg_data, ppg_data

def save_data(filename, eeg_data, ppg_data):
    np.savez_compressed(filename, eeg=eeg_data, ppg=ppg_data)
    print(f"Saved data to {filename}")
    print(f"  EEG shape: {eeg_data.shape}")
    print(f"  PPG shape: {ppg_data.shape}")

def record(duration, emotion_label, output_file=None):
    output_file = output_file or f"{emotion_label}.npz"
    # ensure EEG stream is available before opening inlets
    stream_thread = ensure_stream()
    eeg_inlet, ppg_inlet = open_inlets()
    eeg_data, ppg_data = collect_data(eeg_inlet, ppg_inlet, duration)
    save_data(output_file, eeg_data, ppg_data)

def main():
    args = parse_arguments()
    record(duration=args.duration, emotion_label=args.emotion, output_file=args.output)


if __name__ == "__main__":
    main()