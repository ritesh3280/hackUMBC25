import argparse
import os
import json
import numpy as np
import matplotlib.pyplot as plt
from scipy.signal import welch, butter, lfilter, iirnotch
from sklearn.decomposition import PCA
from signal_processing import design_bandpass, filter_eeg_signal, extract_band_powers

def load_and_filter(emotion_list, sampling_rate):
    results = {}
    for emo in emotion_list:
        path = f"{emo}.npz"
        if not os.path.exists(path):
            print(f"[WARN] Missing file: {path}, skipping.")
            continue
        with np.load(path) as npz:
            raw = npz.get('eeg', None)
        if raw is None or raw.ndim != 2 or raw.shape[0] == 0:
            print(f"[WARN] Invalid data for {emo}, skipping.")
            continue
        print(f"[INFO] {emo}: loaded {raw.shape}")
        results[emo] = filter_eeg_signal(raw, sampling_rate)
    if not results:
        raise FileNotFoundError("No valid EEG data found.")
    return results

def create_feature_dataset(filtered_map, window_dur, step_dur, sampling_rate):
    window_samples = int(window_dur * sampling_rate)
    step_samples = int(step_dur * sampling_rate)
    labels = {emo: idx for idx, emo in enumerate(filtered_map)}
    X_list, y_list = [], []
    for emo, sig in filtered_map.items():
        count = 0
        for start in range(0, sig.shape[0] - window_samples + 1, step_samples):
            segment = sig[start:start+window_samples]
            if not np.all(np.isfinite(segment)):
                continue
            powers = extract_band_powers(segment, sampling_rate)
            flat = np.nan_to_num(powers, nan=0.0, neginf=-12.0, posinf=12.0).flatten()
            X_list.append(flat)
            y_list.append(labels[emo])
            count += 1
        print(f"[INFO] {emo}: {count} windows, label={labels[emo]}")
    X_arr = np.array(X_list)
    y_arr = np.array(y_list)
    return X_arr, y_arr, labels

def save_outputs(X, y, labels, window_dur, step_dur, sampling_rate):
    np.save('X.npy', X)
    np.save('y.npy', y)
    with open('feature_params.json', 'w') as fp:
        json.dump({'window_sec': window_dur, 'step_sec': step_dur, 'fs': sampling_rate}, fp)
    inv_map = {v: k for k, v in labels.items()}
    with open('label_map.json', 'w') as fp:
        json.dump(inv_map, fp)
    print(f"[INFO] Data saved: X.npy ({X.shape}), y.npy ({y.shape})")

def main():
    parser = argparse.ArgumentParser(description="Clean and extract EEG features.")
    parser.add_argument('--skip', nargs='*', default=['sleeping'], help='Emotions to skip')
    parser.add_argument('--window', type=float, default=8.0, help='Window length in sec')
    parser.add_argument('--step', type=float, default=1.0, help='Step length in sec')
    parser.add_argument('--fs', type=int, default=256, help='Sampling rate')
    args = parser.parse_args()
    all_emotions = ['focused', 'unfocused']
    selected = [e for e in all_emotions if e not in args.skip]
    filtered = load_and_filter(selected, args.fs)
    X, y, label_map = create_feature_dataset(filtered, args.window, args.step, args.fs)
    print(f"[INFO] Dataset shapes: X={X.shape}, y={y.shape}, labels={label_map}")
    save_outputs(X, y, label_map, args.window, args.step, args.fs)
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X)
    plt.figure()
    for emo, idx in label_map.items():
        pts = X_pca[y == idx]
        plt.scatter(pts[:, 0], pts[:, 1], label=emo, alpha=0.7)
    plt.legend()
    plt.title('PCA of EEG features')
    plt.xlabel('PC1')
    plt.ylabel('PC2')
    plt.savefig('pca_plot.png')
    print("[INFO] PCA plot saved to pca_plot.png")

if __name__ == '__main__':
    main()