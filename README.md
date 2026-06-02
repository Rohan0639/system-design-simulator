# ⚡ System Design Simulator

**Live Link**
*  https://system-design-simulator1-eta.vercel.app/

---

## 🛑 Problem Statement
System design is usually done on static whiteboards. When you draw an architecture, you can't easily answer: *"Will this database crash under 10k requests?"* or *"Does adding a cache here actually reduce latency?"*

**System Design Simulator** solves this by turning static architecture diagrams into living, breathing systems. You can drag and drop components, apply real-time simulated traffic, and immediately see where the bottlenecks, failures, and latency spikes occur in your design.

---

## ✨ Key Features
*   **Drag-and-Drop Canvas**: Intuitively build architectures with Databases, Load Balancers, API Gateways, and more.
*   **AI Design Assistant**: Type a prompt (e.g., "Build a scalable e-commerce backend") and let Llama 3.3 generate the architecture for you.
*   **Live Traffic Simulation**: Blast synthetic traffic (e.g., 10k RPS) through your graph and watch components react in real-time.
*   **Intelligent Diagnostics**: Get graded (A to F) on your architecture with precise insights into bottlenecks and failure points.
*   **Scalable Distributed Engine**: A high-performance Go simulation engine decoupled via Redis for massive concurrency.

---

## 🛠️ Tech Stack
*   **Frontend**: React 19, TypeScript, Zustand, React Flow (for visuals)
*   **Backend**: Go (Gin Framework), WebSockets, Redis (for distributed worker architecture)
*   **AI Engine**: Groq API (Llama 3.3) for AI-assisted architecture design
*   **Infrastructure**: Docker, Docker-Compose

---

## ⚙️ How It Works
1.  **Design**: Drag and drop nodes (Databases, Load Balancers, API Gateways) on the canvas to build your architecture. You can also type a prompt and let AI generate the architecture for you.
2.  **Simulate**: Click "Start Simulation" to blast synthetic traffic (e.g., 10,000 requests per second) through your graph.
3.  **Analyze**: The Go backend distributes the traffic probabilistically across your nodes using highly concurrent goroutines. It streams live telemetry (health, RPS, latency) back to the UI via WebSockets.
4.  **Verdict**: The system grades your design (A to F) and tells you exactly what failed and how to fix it (e.g., "Database Starvation - Add a Redis Cache").

---

## 📂 Project Structure
```text
├── backend/
│   ├── engine/         # Core Go simulation logic
│   ├── handlers/       # WebSocket & AI API endpoints
│   ├── main.go         # API Gateway & Redis Worker setup
├── frontend/
│   ├── src/
│   │   ├── components/ # Custom visual components
│   │   ├── nodes/      # React Flow custom node renders
│   │   ├── store/      # Zustand state management
│   │   └── App.tsx     # Main dashboard
└── docker-compose.yml  # Local multi-container setup (API + Redis)
```

---

## 🏗️ Local Deployment

The easiest way to run the entire project locally (including Redis and the Go backend) is using Docker Compose.

**Step 1: Start the Backend and Redis**
```bash
docker-compose up --build
```
*The backend API will start on `http://localhost:8080`.*

**Step 2: Start the Frontend**
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will start on `http://localhost:5173` (or 5174).*

*(Note: Ensure you have a `.env` file in the `frontend` folder with `VITE_API_URL=http://localhost:8080`)*
