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
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

load_dotenv()
app = FastAPI()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

EVENTS = deque(maxlen=500)
IP_CACHE = {}


@app.get("/")
def main():
    print("Hello from server!")
    return {"msg": "Hello from server!"}


def safe_json(response):
    if response.status_code != 200:
        raise ValueError(f"HTTP {response.status_code}")
    try:
        return response.json()
    except ValueError:
        raise ValueError("Response is not valid JSON")


def polling():
    headers = {"Content-Type": "application/json", "Auth-Key": os.getenv("AUTH_KEY")}
    while True:
        try:
            resp = requests.get(
                "https://urlhaus-api.abuse.ch/v1/urls/recent",
                headers=headers,
                timeout=10,
            )
            data = safe_json(resp)
            for entry in data.get("urls", [])[:50]:
                ip = entry.get("host")
                tags = entry.get("tags", [])
                logger.info(f"ip and tags - {ip} {tags}")

                if ip in IP_CACHE:
                    hostData = IP_CACHE[ip]
                else:
                    resp = requests.get(f"http://ip-api.com/json/{ip}")
                    hostData = safe_json(resp)
                    IP_CACHE[ip] = hostData
                    time.sleep(1.5)
                severity = ["medium", "high", "low"]
                logger.info("severity - %s", severity)

                event = {
                    "lat": hostData.get("lat"),
                    "lng": hostData.get("lon"),  # longitude
                    "attack_format": tags if tags else [],
                    "severity": random.choice(severity),
                    "source": "urlhaus",
                    "timestamp": int(time.time()),
                }

                # preventing duplicate coords
                if not any(
                    e["lat"] == event["lat"] and e["lng"] == event["lng"]
                    for e in EVENTS
                ):
                    EVENTS.append(event)

        except Exception as e:
            logger.exception("Polling Error")
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
    attack_formats = Counter(
        tag
        for e in EVENTS
        for tag in (
            e["attack_format"]
            if isinstance(e["attack_format"], list)
            else [e["attack_format"]]
        )
    )
    return {
        "total_events": len(EVENTS),
        "top_attack_formats": attack_formats.most_common(5),
    }


@app.get("/ai/analyze")
def ai_analyze():
    if not EVENTS:
        return {"analysis": "Insufficient data for analysis. System initializing..."}

    recent_events = list(EVENTS)[-30:]  # last 30 items
    formats = Counter(
        tag
        for e in recent_events
        for tag in (
            e["attack_format"]
            if isinstance(e["attack_format"], list)
            else [e["attack_format"]]
        )
    )
    countries = Counter(e.get("country", "Unknown") for e in recent_events)

    prompt = f"""
    You are a Cyber Defense AI. Analyze this live threat feed summary:
    - Top Attack Vectors: {formats.most_common(3)}
    - Top Source Countries: {countries.most_common(3)}
    - Total Active Threats: {len(recent_events)}
    
    Output a strictly professional, military-style Situation Report (SITREP).
    Format:
    [THREAT LEVEL]: (Low/Medium/Critical)
    [PRIMARY VECTOR]: (Name of top attack)
    [ANALYSIS]: (1-2 sentences explaining the likely intent, e.g., 'Botnet recruitment' or 'Data exfiltration')
    [ACTION]: (1 actionable recommendation)
    
    Keep it under 60 words. Be dramatic but realistic.
    """

    try:
        completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
        )
        return {"analysis": completion.choices[0].message.content}
    except Exception as e:
        logger.error(f"Groq Error: {e}")
        return {"analysis": "AI CONNECTION OFFLINE. MANUAL ANALYSIS REQUIRED."}


if __name__ == "__main__":
    main()
