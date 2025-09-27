from scipy.signal import welch, butter, lfilter, iirnotch
import numpy as np

def design_bandpass(lowcut_hz, highcut_hz, sampling_rate, order=4):
    nyquist = 0.5 * sampling_rate
    low = lowcut_hz / nyquist
    high = highcut_hz / nyquist
    b, a = butter(order, [low, high], btype='band')
    return b, a

def filter_eeg_signal(signal, sampling_rate):
    b_notch, a_notch = iirnotch(60.0, 30.0, sampling_rate)
    cleaned = lfilter(b_notch, a_notch, signal, axis=0)
    b_bp, a_bp = design_bandpass(1.0, 50.0, sampling_rate)
    filtered = lfilter(b_bp, a_bp, cleaned, axis=0)
    return filtered

def extract_band_powers(window, sampling_rate):
    band_limits = {
        'delta': (1, 4),
        'theta': (4, 8),
        'alpha': (8, 13),
        'beta': (13, 30),
        'gamma': (30, 50)
    }
    max_seg = min(int(sampling_rate * 2), window.shape[0])
    freqs, psd = welch(window, sampling_rate, nperseg=max_seg, axis=0)
    log_psd = np.log10(psd + 1e-12)
    powers = []
    for low_hz, high_hz in band_limits.values():
        mask = np.logical_and(freqs >= low_hz, freqs < high_hz)
        powers.append(np.mean(log_psd[mask, :], axis=0))
    return np.vstack(powers)