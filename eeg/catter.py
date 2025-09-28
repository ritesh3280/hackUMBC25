#!/usr/bin/env python3
import argparse
import numpy as np
from typing import List
import os
import sys

def load_npz(path: str):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    with np.load(path, allow_pickle=True) as z:
        eeg = z["eeg"] if "eeg" in z else np.array([])
        ppg = z["ppg"] if "ppg" in z else np.array([])
        meta = {k: z[k] for k in z.files if k not in ("eeg", "ppg")}
    return eeg, ppg, meta

def concatenate_arrays(arrs: List[np.ndarray]):
    non_empty = [a for a in arrs if a.size != 0]
    if not non_empty:
        return np.array([])
    # All arrays must match on non-time dims
    ref_shape = non_empty[0].shape[1:] if non_empty[0].ndim >= 2 else ()
    for a in non_empty:
        if a.shape[1:] != ref_shape:
            raise ValueError(f"Incompatible shapes for concatenation: {a.shape} vs reference (*,{','.join(map(str,ref_shape))})")
    return np.concatenate(non_empty, axis=0)

def concat_files(paths: List[str], out_path: str):
    eeg_list, ppg_list = [], []
    sources = []
    metas = []
    for p in paths:
        eeg, ppg, meta = load_npz(p)
        eeg_list.append(eeg)
        ppg_list.append(ppg)
        sources.append(os.path.abspath(p))
        metas.append(meta)
    eeg_all = concatenate_arrays(eeg_list)
    ppg_all = concatenate_arrays(ppg_list)
    # Save metadata: sources and store list of per-file metadata (if any) as object arrays
    np.savez_compressed(out_path,
                        eeg=eeg_all,
                        ppg=ppg_all,
                        sources=np.array(sources, dtype=object),
                        file_meta=np.array(metas, dtype=object))
    print(f"Saved concatenated file: {out_path}")
    print(f"  EEG shape: {eeg_all.shape}")
    print(f"  PPG shape: {ppg_all.shape}")
    print(f"  Source files: {len(sources)}")

def parse_args():
    p = argparse.ArgumentParser(description="Concatenate multiple .npz EEG/PPG recordings into one file.")
    p.add_argument("inputs", nargs="+", help="Input .npz files to concatenate (order preserved).")
    p.add_argument("-o", "--output", required=True, help="Output .npz filename.")
    return p.parse_args()

def main():
    args = parse_args()
    try:
        concat_files(args.inputs, args.output)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()