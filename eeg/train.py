import argparse
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torch import optim
from model import HemiAttentionLSTM
from sklearn.preprocessing import StandardScaler
import json
from joblib import dump
import torch.nn as nn

class FocalLoss(nn.Module):
    def __init__(self, alpha=None, gamma=2.0, reduction='mean'):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction
        self.ce = nn.CrossEntropyLoss(weight=alpha, reduction='none')
    def forward(self, logits, target):
        ce = self.ce(logits, target)
        pt = torch.exp(-ce).clamp_min(1e-8)
        loss = ((1 - pt) ** self.gamma) * ce
        if self.reduction == 'mean':
            return loss.mean()
        if self.reduction == 'sum':
            return loss.sum()
        return loss

class EEGFeatureDataset(Dataset):
    def __init__(self, X, y):
        self.X = X.reshape(-1, 5, 5).transpose(0, 2, 1).astype(np.float32)
        self.y = y.astype(np.int64)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, i):
        return self.X[i], self.y[i]

def run_training():
    X = np.load('X.npy')
    y = np.load('y.npy')

    feat_params = {'window_sec': 8.0, 'step_sec': 1.0, 'fs': 256}
    try:
        with open('feature_params.json', 'r') as f:
            feat_params.update(json.load(f))
    except Exception:
        pass

    try:
        with open('label_map.json', 'r') as f:
            emotion_map = {int(k): v for k, v in json.load(f).items()}
    except Exception:
        classes = sorted(set(y.tolist()))
        emotion_map = {i: f"class_{i}" for i in classes}

    num_classes = len(emotion_map)
    
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42)

    X_train = np.nan_to_num(X_train, nan=0.0, neginf=-12.0, posinf=12.0)
    X_val = np.nan_to_num(X_val, nan=0.0, neginf=-12.0, posinf=12.0)
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_val = scaler.transform(X_val)

    train_ds = EEGFeatureDataset(X_train, y_train)
    val_ds   = EEGFeatureDataset(X_val, y_val)

    class_counts   = np.bincount(y_train, minlength=num_classes)
    class_weights  = 1. / np.clip(class_counts, 1, None)
    sample_weights = np.array([class_weights[t] for t in y_train])
        
    sampler = WeightedRandomSampler(
        weights=torch.from_numpy(sample_weights),
        num_samples=len(sample_weights),
        replacement=True)
    train_loader = DataLoader(train_ds, batch_size=128, sampler=sampler)
    val_loader   = DataLoader(val_ds, batch_size=128)

    device = torch.device('cuda')
    model = HemiAttentionLSTM(input_size=5, num_classes=num_classes).to(device)
    optimizer = optim.Adam(model.parameters(), lr=5e-4, weight_decay=1e-5)

    ce_weights = torch.ones(num_classes, dtype=torch.float32)

    criterion = nn.CrossEntropyLoss(weight=ce_weights.to(device))

    best_acc = 0.0
    for epoch in range(1, 150):
        model.train()
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            preds = model(xb)
            loss = criterion(preds, yb)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        model.eval()
        correct, total = 0, 0
        all_preds, all_labels = [], []
        with torch.no_grad():
            for xb, yb in val_loader:
                xb, yb = xb.to(device), yb.to(device)
                preds = model(xb)
                pred_labels = preds.argmax(dim=1)
                correct += (pred_labels == yb).sum().item()
                total += yb.size(0)
                all_preds.extend(pred_labels.cpu().numpy())
                all_labels.extend(yb.cpu().numpy())

        acc = correct / total
        print(f"[INFO] Epoch {epoch:02d} | Val Acc: {acc:.4f}")
        if acc > best_acc:
            best_acc = acc
            print("[INFO] New best accuracy! Saving model to best_eeg_model.pth")
            torch.save(model.state_dict(), 'best_eeg_model.pth')
            dump(scaler, 'scaler.joblib')
            with open('label_map.json', 'w') as f:
                json.dump({int(k): v for k, v in emotion_map.items()}, f)
            with open('inference_config.json', 'w') as f:
                json.dump({
                    'window_sec': feat_params.get('window_sec', 8.0),
                    'step_sec': feat_params.get('step_sec', 1.0),
                    'fs': feat_params.get('fs', 256)
                }, f)
            target_names = [emotion_map[i] for i in sorted(emotion_map.keys())]
            print(classification_report(all_labels, all_preds, target_names=target_names, zero_division=0))

    print(f"[INFO] Finished training. Best validation accuracy: {best_acc:.4f}")

if __name__ == '__main__':
    run_training()