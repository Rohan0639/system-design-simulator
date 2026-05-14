#Systems  Design Simulator

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

## 🛠️ How It Works & What It Does

### 1. The Simulation Lifecycle
The platform operates on a **Decoupled Event-Driven Architecture**:
1.  **Graph Mapping**: The UI serializes your visual architecture into a JSON-based Directed Acyclic Graph (DAG).
2.  **Traffic Injection**: When you hit "Simulate," the **Go backend** initializes a traffic generator. This generator models requests as concurrent packets traversing the graph.
3.  **Probabilistic modeling**: Each node (API Server, DB, etc.) has an internal state machine. If the incoming traffic exceeds the node's **Capacity**, the backend introduces **Latency Penalties** and marks the node as `overloaded`.
4.  **Real-Time Feedback Loop**: Metrics are aggregated on the backend every 100ms and streamed via **WebSockets** to the React frontend, updating charts and node statuses instantly.

### 2. AI Architecture Synthesis 
Instead of starting from a blank canvas, you can use the **Grok AI Architect**:
- **Prompt**: *"Design a global video streaming service with CDN caching and a redundant database."*
- **Synthesis**: The LLM parses your performance and availability requirements.
- **Auto-Provisioning**: The system automatically provisions the nodes, connects them with optimal paths, and sets realistic baseline capacities for each component.

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

## 📂 Project Structure

```text
├── backend/
│   ├── engine/         # Core simulation logic (Goroutines & Graph Traversal)
│   ├── handlers/       # WebSocket & AI API endpoints
│   ├── models/         # Type definitions for Graphs and Metrics
│   └── main.go         # Entry point & Router configuration
├── frontend/
│   ├── src/
│   │   ├── components/ # Atomic UI components (Header, Sidebar, Metrics)
│   │   ├── nodes/      # Custom React Flow node implementations
│   │   ├── store/      # Zustand global state & telemetry aggregation
│   │   └── App.tsx     # Main 3-zone layout orchestration
└── docker-compose.yml  # Orchestration for full-stack local deployment
```

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
