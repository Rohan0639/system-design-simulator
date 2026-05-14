# SysSim Pro | AI-Powered Distributed Systems Simulator

**A high-performance observability and simulation engine for architecting scalable distributed systems.**

---

## 🎯 Project Overview

SysSim Pro is an engineering-first simulation platform designed to bridge the gap between static architecture diagrams and live system behavior. Built with a focus on **concurrency**, **real-time telemetry**, and **AI-assisted design**, it enables developers to visualize bottlenecks, optimize latency, and validate system designs under synthetic load before writing a single line of production code.

### 💡 Why I Built This
Most system design tools are static drawing boards. SysSim Pro transforms design into a **dynamic diagnostic process**. It answers the critical question: *"Will my architecture survive 100k RPS?"* by simulating traffic flow, resource contention, and cascading failures in real-time.

---

## 🚀 Core Engineering Features

### 🧠 1. AI-Driven System Synthesis
*   **LLM Integration**: Leverages the **Groq (Llama 3.3)** API to generate production-ready architecture patterns from natural language prompts.
*   **Pattern Recognition**: Automatically suggests optimal placement for Load Balancers, CDNs, and Caches based on the user's performance requirements.

### ⚡ 2. High-Performance Simulation Engine
*   **Concurrency with Goroutines**: Built in **Go**, the backend engine handles complex graph traversals and traffic distribution using lightweight goroutines.
*   **WebSocket Telemetry**: Real-time bidirectional communication provides sub-100ms updates on node health, RPS, and latency metrics.

### 📊 3. Observability & Diagnostics
*   **Real-time Dashboards**: Integrated **Recharts** visualization for monitoring throughput and latency trends.
*   **Dynamic Bottleneck Detection**: Visual indicators (red-pulse alerts) identify overloaded nodes based on configurable capacity thresholds.
*   **Post-Mortem Reporting**: Generates exportable JSON diagnostic reports including Health Scores, Peak Load analysis, and Failure Root Causes.

---

## 🛠️ Technical Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | React 19 (Hooks, Context), TypeScript, Zustand (State Mgmt) |
| **Visuals** | React Flow (Graph UI), Tailwind CSS 4, Lucide |
| **Backend** | Go (Gin Framework), WebSockets |
| **AI/LLM** | Groq API (Llama 3.3), Prompt Engineering |
| **Infrastructure** | Docker, Docker-Compose |

---

## 🏗️ Technical Architecture & Workflow

1.  **Orchestration**: The UI (React) captures user intent and sends it to the AI Handler (Go).
2.  **Simulation**: The Simulation Engine (Go) models traffic as a series of probabilistic events across the graph nodes.
3.  **Visualization**: React Flow renders the graph while Zustand manages the global telemetry state for millisecond-accurate chart updates.

---

## 🏁 Installation & Deployment

### Backend (Go)
```bash
cd backend
go mod download
go run main.go
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

---

## 👨‍💻 Engineering Impact (Recruiter Focus)
*   **Solved Complex State Management**: Managed real-time data synchronization between high-frequency WebSocket streams and a dynamic graph UI.
*   **Optimized Performance**: Implemented efficient backend logic in Go to ensure low-latency simulation even with large architectural graphs.
*   **UX/UI for Complexity**: Designed a 3-zone diagnostic dashboard to present high-density data without overwhelming the user.

---

## 📄 License
This project is licensed under the MIT License.
