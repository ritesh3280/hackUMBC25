import torch
import torch.nn as nn
import torch.nn.functional as F

class CrossAttention(nn.Module):

    def __init__(self, hidden_size):
        super().__init__()
        self.hidden_size = hidden_size
        self.query = nn.Linear(hidden_size, hidden_size)
        self.key = nn.Linear(hidden_size, hidden_size)
        self.value = nn.Linear(hidden_size, hidden_size)

    def forward(self, query_seq, key_val_seq):
        q = self.query(query_seq)
        k = self.key(key_val_seq)
        v = self.value(key_val_seq)

        attention_scores = torch.matmul(q, k.transpose(-2, -1)) / (self.hidden_size ** 0.5) # (batch, seq_len_q, hidden_size) @ (batch, hidden_size, seq_len_kv) -> (batch, seq_len_q, seq_len_kv)
        attention_weights = F.softmax(attention_scores, dim=-1)
        attended_values = torch.matmul(attention_weights, v) # (batch, seq_len_q, seq_len_kv) @ (batch, seq_len_kv, hidden_size) -> (batch, seq_len_q, hidden_size)
        return attended_values.mean(dim=1)

class HemiAttentionLSTM(nn.Module):
    def __init__(self, input_size=5, hidden_size=128, num_layers=2, num_classes=4, dropout=0.5):
        super().__init__()
        
        self.left_lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True,
                                 bidirectional=True, dropout=dropout)
        self.right_lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True,
                                  bidirectional=True, dropout=dropout)
        lstm_out_size = hidden_size * 2  # *2 because bidirectional
        self.left_attends_right = CrossAttention(lstm_out_size)
        self.right_attends_left = CrossAttention(lstm_out_size)
        self.classifier = nn.Sequential(
            nn.Linear(lstm_out_size * 2, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, num_classes)
        )

    def forward(self, x):
        x_left = x[:, 0:2, :]  # (batch, 2, 5)
        x_right = x[:, 2:5, :] # (batch, 3, 5)
        left_out, _ = self.left_lstm(x_left)   # (batch, 2, hidden_size*2)
        right_out, _ = self.right_lstm(x_right) # (batch, 3, hidden_size*2)
        attended_left = self.left_attends_right(left_out, right_out)   # (batch, hidden_size*2)
        attended_right = self.right_attends_left(right_out, left_out) # (batch, hidden_size*2)
        combined = torch.cat((attended_left, attended_right), dim=1) # (batch, hidden_size*4)
        return self.classifier(combined)
    