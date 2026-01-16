from fastapi import FastAPI
from collections import deque
import threading
import logging
import requests
import os
from dotenv import load_dotenv
import time
import random
from collections import Counter

load_dotenv()
app = FastAPI()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging, format="%(asctime)s %(levelname)s %(message)s")

EVENTS = deque(maxlen=500)
IP_CACHE = {}


@app.get("/")
def main():
    print("Hello from server!")
    return {"msg": "Hello from server!"}


def polling():
    headers = {"Content-Type": "application/json", "Auth-Key": os.getenv("AUTH_KEY")}
    while True:
        try:
            data = requests.get(
                "https://urlhaus-api.abuse.ch/v1/urls/recent", headers=headers
            ).json()
            for entry in data.get("urls", [])[:20]:
                ip = entry.get("host")
                tags = entry.get("tags", [])

                if ip in IP_CACHE:
                    hostData = IP_CACHE[ip]
                else:
                    hostData = requests.get(f"https://ip-api.com/{ip}").json()
                    IP_CACHE[ip] = hostData
                severity = ["medium", "high", "low"]

                event = {
                    "lat": hostData.get("lat"),
                    "lon": hostData.get("lon"),
                    "attack_format": tags[0] if tags else "unknown",
                    "severity": random.choice(severity),
                    "source": "urlhaus",
                    "timestamp": int(time.time()),
                }

                EVENTS.append(event)
        except Exception as e:
            print("Poll Error: ", e)

        time.sleep(120)  # every 2 min


threading.Thread(target=polling, daemon=True).start()
# @app.on_event("startup")
# def start_poller():


# returns response info for lat/long
@app.get("/events/stream")
def events_info():
    return {"events": list(EVENTS)}


@app.get("/summary")
def summary():
    attack_formats = Counter(e["attack_format"] for e in EVENTS)
    return {
        "total_events": len(EVENTS),
        "top_attack_formats": attack_formats.most_common(5),
    }


if __name__ == "__main__":
    main()
