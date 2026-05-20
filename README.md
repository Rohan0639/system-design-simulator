# ⚡ System Design Simulator

**A high-performance observability and simulation engine for architecting scalable distributed systems with AI-assisted design.**

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel&logoColor=white)](https://system-design-simulator1-git-main-rohan0639s-projects.vercel.app/)
[![Backend Engine](https://img.shields.io/badge/Backend-Go%20(Gin)-blue?logo=go&logoColor=white)](https://sys-design-sim-backend.onrender.com/health)
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

### ⚡ 2. High-Performance Go Simulation Engine
*   **Concurrency via Goroutines**: Built in **Go**, the backend models synthetic traffic as a series of probabilistic events across graph nodes, executing traversals and concurrency bottlenecks using lightweight goroutines.
*   **Real-Time WebSocket Telemetry**: streams sub-100ms updates regarding component health, RPS, and individual traversal latencies.

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
| **Backend** | Go (Gin Framework), WebSockets | Probabilistic traffic modeling and high-efficiency event processing |
| **AI Engine** | Groq API (Llama 3.3) | Prompt parsing, graph generation, and parameter optimization |
| **Infrastructure** | Docker, Docker-Compose | Containerized deployment configurations |

---

## 📂 Project Structure

```text
├── backend/
│   ├── engine/         # Core simulation logic (Goroutines & Graph Traversal)
│   ├── handlers/       # WebSocket & AI API endpoints
│   ├── models/         # Type definitions for Graphs and Metrics
│   └── main.go         # Entry point & Router configuration
├── frontend/
│   ├── src/
│   │   ├── components/ # Custom visual components (Header, Metrics, Verdict Panels)
│   │   ├── nodes/      # React Flow custom node renders
│   │   ├── store/      # Zustand state, health polling, and retry logic
│   │   └── App.tsx     # Main dashboard orchestration layout
│   ├── index.html      # Main HTML entry with custom title settings
│   └── .env            # Environment configurations & Vercel notes
└── docker-compose.yml  # Local multi-container development configuration
```

---

## 🏗️ Getting Started (Local Development)

Both servers must be running locally to fully experience the real-time simulation and AI generation features.

### Step 1: Run the Backend (Go)
```bash
cd backend
go mod download
go run main.go
```
*The server will start listening on port **`:8080`***.

### Step 2: Run the Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
*The local development server will start, typically on **`http://localhost:5174`** or **`http://localhost:5173`***.

### Environment Variable Setup
Ensure you configure your `frontend/.env` file:
```env
# For local development pointing to local Go server
VITE_API_URL=http://localhost:8080
```

---

## 🚀 Production Deployment

This project utilizes a dual-provider split deployment strategy:

1.   **Frontend**: Deployed on **Vercel** ([Vercel Production Link](https://system-design-simulator1-git-main-rohan0639s-projects.vercel.app/)).
     *   *Environment Variable*: Set `VITE_API_URL` to your backend URL in the Vercel project dashboard.
     *   *Deployment Protection*: Turn off "Standard Protection" under Project Settings → Deployment Protection to allow public access.
2.   **Backend**: Deployed on **Render** (as a Docker container web service).
     *   *Dockerfile*: Auto-configured with `golang:1.25-alpine` to build the compiled Go execution binary.
     *   *Environment Variables*: Add `PORT=8080`, `XAI_ENDPOINT`, and `GROK_API_KEY` (secure as a secret).

---

## 👨‍💻 Key Engineering Accomplishments

*   **Real-Time Aggregation at Scale**: Designed a Zustand-based state store that processes high-frequency (100ms interval) WebSocket telemetry without causing UI thread lockups.
*   **Stateful Connection Resilience**: Built a reliable connection lifecycle that shields users from Render free-tier cold starts via exponential backoff health checks.
*   **Dynamic Graph Audit Engine**: Built an in-memory graph analyzer that evaluates active topological patterns, orphan nodes, and failures to generate diagnostic verdicts.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
