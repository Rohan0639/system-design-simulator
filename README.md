# SysSim Pro: AI-Powered System Design Simulator

SysSim Pro is a high-fidelity, real-time system design simulation platform. It allows architects to build, stress-test, and observe complex distributed systems with an AI-driven design assistant and detailed telemetry analytics.



## 🚀 Features

- **AI Architect (Grok Integration)**: Architect complex systems using natural language prompts (e.g., "Build a high-availability e-commerce system").
- **3-Zone Professional UI**:
  - **Global Header**: Real-time RPS (Requests Per Second) control and AI hub.
  - **Component Library**: Labeled drag-and-drop toolkit for Clients, Load Balancers, API Servers, Databases, and more.
  - **Analysis Sidebar**: Persistent telemetry graphs (Throughput, Latency) and AI-driven architectural advice.
- **Stress Testing**: Real-time simulation of high-load scenarios with visual indicators for overloaded nodes and bottleneck detection.
- **Diagnostic Reports**: Exportable JSON logs detailing peak RPS, average latency, and specific node failures for offline analysis.
- **Live Load Animation**: Visual representation of traffic flow and congestion points.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, React Flow, Zustand, Recharts, Lucide Icons.
- **Backend**: Go (Golang), Gin Framework, Gorilla WebSockets.
- **AI**: Groq API (Llama 3.3) for intelligent architecture generation.

## 🏁 Getting Started

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- Groq API Key (for AI features)

### Backend Setup

1. Navigate to the `backend` directory.
2. Create a `.env` file:
   ```env
   GROK_API_KEY=your_key_here
   PORT=8080
   ```
3. Run the server:
   ```bash
   go run main.go
   ```

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📊 Using the Simulator

1. **Design**: Drag components from the left sidebar or use the AI input in the header to generate a starting architecture.
2. **Connect**: Link nodes using the handles to define traffic flow.
3. **Simulate**: Adjust the **Input Load** slider and click **SIMULATE**.
4. **Analyze**: Watch the right sidebar for real-time latency and throughput. If nodes turn red, they are bottlenecked.
5. **Export**: Click the download icon in the header after stopping a simulation to save your diagnostic report.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
