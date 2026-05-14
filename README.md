# 🌐 System Design Simulator

An interactive, real-time platform to design, simulate, and analyze complex system architectures. Build distributed systems on a canvas, simulate traffic flows, and use AI to generate optimized designs.

![System Design Simulator](https://img.shields.io/badge/System_Design-Simulator-blue?style=for-the-badge)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)

## 🚀 Key Features

- **Interactive Canvas**: Drag-and-drop system components (Load Balancers, Databases, Microservices, Caches) using `@xyflow/react`.
- **Real-time Simulation**: A high-performance Go-based engine that simulates traffic patterns, latency, and system load via WebSockets.
- **AI Design Architect**: Generate complex system architectures from natural language prompts using integrated AI models (Llama 3.3).
- **Dynamic Analytics**: Visualize system performance metrics (request throughput, error rates, resource utilization) with real-time charts.
- **Containerized Architecture**: Fully Dockerized for seamless deployment and development.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **UI Components**: [Tailwind CSS 4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Graph Engine**: [@xyflow/react](https://reactflow.dev/) (React Flow)
- **Visualization**: [Recharts](https://recharts.org/)

### Backend
- **Language**: [Go (Golang)](https://golang.org/)
- **Web Framework**: [Gin Gonic](https://gin-gonic.com/)
- **Real-time Communication**: [Gorilla WebSockets](https://github.com/gorilla/websocket)
- **AI Integration**: Custom handlers for Llama 3.3 model integration via Grok API.
- **Environment**: [Godotenv](https://github.com/joho/godotenv)

## 🚦 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/get-started) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Go](https://golang.org/doc/install) (for local development)
- [Node.js](https://nodejs.org/) (for local development)

### Quick Start with Docker
The easiest way to run the entire stack is using Docker Compose:

```bash
docker-compose up --build
```
- **Frontend**: [http://localhost:80](http://localhost:80)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

### Local Development

#### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file (see `.env.example` if available).
3. Run the server:
   ```bash
   go run main.go
   ```

#### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

```text
├── backend/            # Go Simulation Engine & API
│   ├── engine/         # Simulation logic
│   ├── handlers/       # HTTP and WebSocket handlers
│   ├── models/         # Data structures
│   └── main.go         # Entry point
├── frontend/           # React + Vite Application
│   ├── src/            # Source code
│   │   ├── components/ # UI Components
│   │   ├── store/      # Zustand state management
│   │   └── types/      # TypeScript definitions
│   └── index.html      # Entry point
└── docker-compose.yml  # Multi-container orchestration
```

## 🧪 Simulation Engine
The simulation engine runs in the background, calculating:
- **Node Load**: Current request processing density.
- **Connection Health**: Packet loss and latency simulation.
- **Flow Control**: How data moves through load balancers and queues.

## 🤖 AI Architect
The AI Architect allows you to type:
> "Design a highly available e-commerce system with a Redis cache and PostgreSQL replicas."

It will automatically generate the nodes and edges on your canvas.

## 📄 License
This project is licensed under the MIT License.
