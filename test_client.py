"""
Simple SSE client to connect to the EEG mood stream and print incoming data.

Usage:
    pip install requests
    python test_client.py
"""
import json
import requests

def main():
    url = "http://localhost:8000/stream"
    print(f"Connecting to {url}...")
    # Establish HTTP stream
    response = requests.get(url, stream=True)
    print("Connected. Listening for events...\n")
    # Read the SPS events from the response
    for line in response.iter_lines(decode_unicode=True):
        if not line:
            continue
        if line.startswith("data:"):
            json_str = line[len("data:"):].strip()
            try:
                data = json.loads(json_str)
                label = data.get("label")
                probs = data.get("probs")
                print(f"Received -> Label: {label}, Probs: {probs}")
            except json.JSONDecodeError:
                continue

if __name__ == '__main__':
    main()