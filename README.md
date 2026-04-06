## 🌐 Global Cyber Threat Visualisation Platform
#### A streamed cyber threat monitoring and visualisation platform that aggregates malicious activity from open threat intelligence sources and renders it on an interactive 3D globe.
This project is built under Open Innovation – IT Services, focusing on security observability, threat intelligence aggregation, and real-time visual analytics.


## Data Sources
* **URLHause (abuse.ch)**
    * Updates every few minutes
    * Includes malware tags & classfication
* **SPAMHAUS**
* **ip-api**
    * Geo-location enrichment
    * Local Caching of IPs

## Server (FastAPI)
### Features
* Background polling daemon
* Event buffering using `deque`
* Geo-IP caching to minimize repeated lookups

### Sample Event Structure
```json
{
  "lat": 37.77,
  "lng": -122.41,
  "attack_format": "malware_download",
  "severity": "high",
  "source": "urlhaus",
  "timestamp": 1700000000
}
```

### System Architecture
The following Mermaid diagram illustrates an overview of system architecture and data flow: 
```mermaid
graph LR
    %% --- Styles ---
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef server fill:#f0fdf4,stroke:#16a34a,stroke-width:2px;
    classDef worker fill:#fff7ed,stroke:#ea580c,stroke-width:2px;
    classDef ext fill:#f1f5f9,stroke:#64748b,stroke-width:1px,stroke-dasharray:5 5;
    classDef storage fill:#fef08a,stroke:#eab308,stroke-width:2px;

    %% ---------- Vertical lanes (anchors) ----------
    ClientLane[" "]:::client
    ServerLane[" "]:::server
    ExternalLane[" "]:::ext

    %% ---------- Client (TOP) ----------
    subgraph Client_Side [Next.js Client]
        direction TB
        Globe["3D Globe Component<br>Visualization"]:::client
        HUD["Dashboard & Stats<br>UI Layer"]:::client
        AIModal["AI Report Modal"]:::client
    end

    %% ---------- Backend (MIDDLE / WIDE) ----------
    subgraph Backend_Server [FastAPI Server Host]
        direction LR

        subgraph Daemon [Daemon Thread]
            direction TB
            Poller["Polling Worker"]:::worker
        end

        subgraph Routes [FastAPI Routes]
            direction TB
            RouteStream["GET /events/stream"]:::server
            RouteStats["GET /summary"]:::server
            RouteAI["GET /ai/analyze"]:::server
        end

        subgraph Memory [Shared Memory]
            direction TB
            EventDeque[("EVENTS Deque<br>Rolling Buffer")]:::storage
            IPCache[("IP Cache<br>Dict")]:::storage
        end
    end

    %% ---------- External (BOTTOM) ----------
    subgraph External_World [External Data & AI Services]
        direction TB
        URLHaus["URLHaus API<br>Threat Feeds"]:::ext
        IPAPI["IP-API.com<br>Geo-Location"]:::ext
        Groq["Groq Cloud<br>GPT OSS Inference"]:::ext
    end

    %% ---------- Vertical positioning ----------
    ClientLane --> Client_Side
    Client_Side --> ServerLane
    ServerLane --> Backend_Server
    Backend_Server --> ExternalLane
    ExternalLane --> External_World

    %% ---------- Data Flow ----------
    Globe --> RouteStream
    HUD --> RouteStats
    AIModal --> RouteAI

    RouteStream --> EventDeque
    RouteStats --> EventDeque
    RouteAI --> EventDeque

    Poller --> URLHaus
    Poller --> IPAPI
    Poller --> IPCache
    Poller --> EventDeque

    RouteAI --> Groq
    Groq --> RouteAI
```
<img width="948" height="1024" alt="image" src="https://github.com/user-attachments/assets/758a51ab-3ca1-4cb2-9977-24e7c046cf19" />

### Setup
#### Server (Using UV)
* Run the commands 
```bash
cd $server
uv sync
uv run fastapi dev --port 5000
```
#### Client (Nextjs)
* Run the commands
```bash
bun install 
bun dev
```

### Application Screenshot
<img width="3056" height="1410" alt="image" src="https://github.com/user-attachments/assets/5aa6f7e2-2643-44a4-a7a2-3cd83eb979de" />
