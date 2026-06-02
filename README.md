# ⚡ System Design Simulator

**A high-performance observability and simulation engine for architecting scalable distributed systems with AI-assisted design.**

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel&logoColor=white)](https://system-design-simulator1-git-main-rohan0639s-projects.vercel.app/)
[![Backend Engine](https://img.shields.io/badge/Backend-Python%20(FastAPI)-blue?logo=python&logoColor=white)](https://sys-design-sim-backend.onrender.com/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Project Overview

The **System Design Simulator** is an engineering-first simulation platform designed to bridge the gap between static architecture diagrams and live system behavior. Built with a focus on **concurrency**, **real-time telemetry**, and **AI-assisted design**, it transforms system design from a static drawing board into a **dynamic diagnostic process**.

It answers critical architectural questions: *“Will my database survive 10k RPS?”*, *“Where is the single point of failure in my ingress flow?”*, or *“How will introducing a Redis cache affect end-to-end user latency?”* under simulated synthetic load in real-time.

---

## 🚀 Core Engineering Features

### 🧠 1. Proactive AI-Driven Design Synthesis
*   **LLM Integration**: Leverages the **Groq (Llama 3.3)** API to generate production-ready architecture patterns directly from natural language prompts.
*   **Big Left-Aligned Input**: Prompt input is integrated directly on the left of the toolbar for direct system synthesis.
*   **Design Pattern Auditor**: Dynamically detects structural architectural patterns from your visual graphs, explaining the benefits and trade-offs of patterns like **Cache-Aside**, **Queue-Based Load Leveling**, **Edge-Accelerated Ingress**, and **Horizontal Compute Scaling**.

### ⚡ 2. High-Performance Python Simulation Engine
*   **Thread-Safe Event Loop**: Built in **Python (FastAPI)**, the backend models synthetic traffic as a series of probabilistic events using an optimized, thread-safe discrete-event simulation (DES) running in an isolated background thread, ensuring the main asyncio event loop remains fully non-blocking and highly responsive.
*   **Real-Time WebSocket Telemetry**: Streams sub-100ms updates regarding component health, RPS, and individual traversal latencies.

### 🛡️ 3. Backend Connection Resilience
*   **Exponential Backoff Health Check**: Automatically pings the `/health` endpoint upon starting a simulation to handle cold starts (especially useful for Render free-tier deployments) with visual *Connecting...* indicators.
*   **WebSocket Auto-Retry**: Automatically attempts reconnection up to 3 times on connection dropped events.
*   **Defensive UI State Machine**: Provides explicit, user-visible badge feedback for all connectivity phases (`disconnected` → `connecting` → `connected` → `error`).

### 📊 4. Advanced "Architect's Verdict"
*   **Letter-Grading (A to F)**: Automatically scores your design based on synthetic load handling and latency limits.
*   **Live Diagnostics**: Explains exact root causes for failures (e.g. *Database Connection Starvation, Compute Thread Saturation, Ingestion Buffer Overflow*).
*   **Actionable Remediation Prescription**: Suggests immediate, concrete engineering next steps (e.g., placing Redis caches or adding Load Balancers).
*   **Dead Component Detection**: Alerts the user of placed canvas nodes that have no active network edges connected.

---

## 🛠️ Technical Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Zustand | Global state & sub-100ms telemetry aggregation |
| **Visuals** | React Flow, Vanilla CSS | Beautiful custom glassmorphism, responsive components, and node layouts |
| **Backend** | Python (FastAPI Framework), WebSockets | Probabilistic traffic modeling and high-efficiency thread-safe event processing |
| **AI Engine** | Groq API (Llama 3.3) | Prompt parsing, graph generation, and parameter optimization |
| **Infrastructure** | Docker, Docker-Compose | Containerized deployment configurations |

---

## 📂 Project Structure

```text
├── backend-python/
│   ├── app/
│   │   ├── engine/       # Thread-safe discrete-event simulation core
│   │   ├── handlers/     # WebSocket router, ConnectionManager & AI API handler
│   │   ├── models/       # Graph schema validators & AI response schemas
│   │   ├── middleware.py # Observability tracing (X-Request-ID & timing)
│   │   └── main.py       # ASGI app lifespan & router container
│   ├── tests/            # Automated test suite (19 integration tests)
│   └── requirements.txt  # Python package dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # Custom visuals (Verdict Panels, Metrics Panels)
│   │   ├── nodes/        # React Flow custom node renders
│   │   ├── store/        # Zustand state store with health polling
│   │   └── App.tsx       # Main dashboard layout orchestration
│   ├── index.html        # Main HTML layout entry
│   └── .env              # Environment configurations & local ports
└── docker-compose.yml    # Containerized multi-service config
```

---

## 🏗️ Getting Started (Local Development)

Both servers must be running locally to fully experience the real-time simulation and AI generation features.

### Step 1: Run the Backend (Python)
```bash
cd backend-python
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```
*The server will start listening on port **`:8080`***.

### Step 2: Run the Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
*The local development server will start, typically on **`http://localhost:5173`***.

### Environment Variable Setup
Ensure you configure your `frontend/.env` file:
```env
# For local development pointing to local Python server
VITE_API_URL=http://localhost:8080
```

---

## 🚀 Production Deployment

This project utilizes a dual-provider split deployment strategy:

1.   **Frontend**: Deployed on **Vercel** ([Vercel Production Link](https://system-design-simulator1-git-main-rohan0639s-projects.vercel.app/)).
     *   *Environment Variable*: Set `VITE_API_URL` to your backend URL in the Vercel project dashboard.
     *   *Deployment Protection*: Turn off "Standard Protection" under Project Settings → Deployment Protection to allow public access.
2.   **Backend**: Deployed on **Render** (as a Docker container web service).
     *   *Dockerfile*: Multi-stage containerized build targeting `python:3.12-slim` to produce a fast, minimal runtime image.
     *   *Environment Variables*: Add `PORT=8080`, `XAI_ENDPOINT`, and `GROK_API_KEY` (secure as a secret).

---

## 👨‍💻 Key Engineering Accomplishments

*   **Real-Time Aggregation at Scale**: Designed a Zustand-based state store that processes high-frequency (100ms interval) WebSocket telemetry without causing UI thread lockups.
*   **Stateful Connection Resilience**: Built a reliable connection lifecycle that shields users from Render free-tier cold starts via exponential backoff health checks.
*   **Dynamic Graph Audit Engine**: Built an in-memory graph analyzer that evaluates active topological patterns, orphan nodes, and failures to generate diagnostic verdicts.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
