import { create } from 'zustand';
import axios from 'axios';
import { 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react';

// ─── Backend Connection Status ────────────────────────────────────────────────
// Tracks the lifecycle of the backend connection so the UI can show meaningful
// feedback instead of silently failing when Render's free tier is cold-starting.
type BackendStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SimulatorState {
  nodes: Node[];
  edges: Edge[];
  rps: number;
  isSimulating: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setRPS: (rps: number) => void;
  setSimulating: (isSimulating: boolean) => void;
  addNode: (type: string, position?: { x: number; y: number }) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  socket: WebSocket | null;
  metricsHistory: any[];
  clearMetrics: () => void;
  clearGraph: () => void;
  simulationReport: any | null;
  clearReport: () => void;
  generateAIDesign: (prompt: string) => Promise<void>;

  // Backend connection state (Fix 2)
  backendStatus: BackendStatus;
  backendMessage: string;
  wakeUpBackend: () => Promise<boolean>;
}

const initialNodes: Node[] = [
  { 
    id: '1', 
    type: 'client', 
    data: { label: 'US Traffic', capacity: 10000, latency: 10 }, 
    position: { x: 100, y: 100 } 
  },
  { 
    id: '2', 
    type: 'load_balancer', 
    data: { label: 'Global LB', capacity: 50000, latency: 5 }, 
    position: { x: 400, y: 100 } 
  },
  { 
    id: '3', 
    type: 'api_server', 
    data: { label: 'Auth Service', capacity: 5000, latency: 50 }, 
    position: { x: 700, y: 100 } 
  },
  { 
    id: '4', 
    type: 'database', 
    data: { label: 'Users DB', capacity: 2000, latency: 100 }, 
    position: { x: 1000, y: 100 } 
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4' },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// ─── Wake-up / Health-check config ────────────────────────────────────────────
const HEALTH_MAX_RETRIES = 8;           // Max attempts before giving up
const HEALTH_INITIAL_DELAY_MS = 1500;   // First retry delay
const HEALTH_MAX_DELAY_MS = 8000;       // Cap on exponential backoff
const WS_RETRY_MAX = 3;                 // WebSocket connection retries
const WS_RETRY_DELAY_MS = 2000;         // Delay between WS retries

/**
 * Pings the backend /health endpoint with exponential backoff.
 * Returns true if the backend responded with 200, false if all retries exhausted.
 */
async function pingHealthWithRetry(
  onStatus: (msg: string) => void
): Promise<boolean> {
  let delay = HEALTH_INITIAL_DELAY_MS;

  for (let attempt = 1; attempt <= HEALTH_MAX_RETRIES; attempt++) {
    try {
      onStatus(
        attempt === 1
          ? 'Connecting to backend...'
          : `Waking up backend... (attempt ${attempt}/${HEALTH_MAX_RETRIES})`
      );
      const res = await axios.get(`${API_BASE_URL}/health`, { timeout: 10000 });
      if (res.status === 200) {
        onStatus('Backend is live!');
        return true;
      }
    } catch {
      // Expected — Render cold start can take 30-50s on free tier
      console.log(`Health ping attempt ${attempt} failed, retrying in ${delay}ms...`);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, HEALTH_MAX_DELAY_MS);
  }

  onStatus('Backend unreachable — check Render deployment');
  return false;
}

/**
 * Opens a WebSocket with retry logic. Returns the connected socket or null.
 */
function connectWebSocketWithRetry(
  url: string,
  onStatus: (msg: string) => void
): Promise<WebSocket | null> {
  let attempt = 0;

  const tryConnect = (): Promise<WebSocket | null> =>
    new Promise((resolve) => {
      attempt++;
      onStatus(attempt > 1 ? `Reconnecting WebSocket (${attempt}/${WS_RETRY_MAX})...` : 'Opening WebSocket...');

      const ws = new WebSocket(url);
      let settled = false;

      ws.onopen = () => {
        if (!settled) {
          settled = true;
          resolve(ws);
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          ws.close();
          if (attempt < WS_RETRY_MAX) {
            setTimeout(() => resolve(tryConnect()), WS_RETRY_DELAY_MS);
          } else {
            resolve(null);
          }
        }
      };

      // Failsafe timeout — if neither open nor error fires in 10s
      setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          if (attempt < WS_RETRY_MAX) {
            setTimeout(() => resolve(tryConnect()), WS_RETRY_DELAY_MS);
          } else {
            resolve(null);
          }
        }
      }, 10000);
    });

  return tryConnect();
}

export const useStore = create<SimulatorState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  rps: 5000,
  isSimulating: false,
  socket: null,
  metricsHistory: [],
  simulationReport: null,

  // Backend connection state
  backendStatus: 'disconnected' as BackendStatus,
  backendMessage: '',

  clearReport: () => set({ simulationReport: null }),

  generateAIDesign: async (prompt: string) => {
    console.log('Generating AI design for:', prompt);

    // Wake up backend first if needed
    const status = get().backendStatus;
    if (status !== 'connected') {
      set({ backendStatus: 'connecting' });
      const alive = await pingHealthWithRetry((msg) =>
        set({ backendMessage: msg })
      );
      if (alive) {
        set({ backendStatus: 'connected', backendMessage: '' });
      } else {
        set({ backendStatus: 'error', backendMessage: 'Backend unreachable' });
        alert('Backend is not responding. It may be cold-starting — try again in 30 seconds.');
        return;
      }
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/generate`, { prompt });
      const { nodes: aiNodes, edges: aiEdges } = response.data;

      if (!aiNodes || aiNodes.length === 0) {
        console.warn('AI returned no nodes');
        return;
      }

      console.log(`AI returned ${aiNodes.length} nodes and ${aiEdges.length} edges`);

      // Transform AI nodes to React Flow format with absolute positioning safety
      const formattedNodes: Node[] = aiNodes.map((n: any, index: number) => ({
        id: n.id || `node-${index}`,
        type: n.type || 'api_server',
        position: { 
          x: n.position?.x || (index * 250), 
          y: n.position?.y || 100 
        },
        data: { 
          label: n.data?.label || n.type,
          capacity: n.data?.capacity || 1000,
          latency: n.data?.latency || 50,
          status: 'idle' 
        }
      }));

      const formattedEdges: Edge[] = aiEdges.map((e: any, index: number) => ({
        id: e.id || `edge-${index}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 }
      }));

      // Clear then set to force fresh render
      set({ nodes: [], edges: [] });
      setTimeout(() => {
        set({ nodes: formattedNodes, edges: formattedEdges });
        console.log('Graph state updated successfully');
      }, 50);
      
    } catch (error) {
      console.error('Error generating AI design:', error);
      alert('Architect failed to generate design. Check console for details.');
    }
  },

  clearMetrics: () => set({ metricsHistory: [] }),
  clearGraph: () => set({ nodes: [], edges: [], isSimulating: false }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setRPS: (rps) => set({ rps }),
  setSimulating: (isSimulating) => set({ isSimulating }),
  addNode: (type, position) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      data: { 
        label: `${type.replace('_', ' ').toUpperCase()}`,
        capacity: 5000,
        latency: 50
      },
      position: position || { x: Math.random() * 400, y: Math.random() * 400 },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // ─── Wake-up Backend ──────────────────────────────────────────────────────
  wakeUpBackend: async () => {
    set({ backendStatus: 'connecting', backendMessage: 'Connecting to backend...' });
    const alive = await pingHealthWithRetry((msg) =>
      set({ backendMessage: msg })
    );
    if (alive) {
      set({ backendStatus: 'connected', backendMessage: '' });
      return true;
    } else {
      set({ backendStatus: 'error', backendMessage: 'Backend unreachable — check Render deployment' });
      return false;
    }
  },

  // ─── Start Simulation (with wake-up + WS retry) ──────────────────────────
  startSimulation: async () => {
    // Step 1: Ensure backend is alive
    set({ backendStatus: 'connecting', backendMessage: 'Connecting to backend...' });
    const alive = await pingHealthWithRetry((msg) =>
      set({ backendMessage: msg })
    );

    if (!alive) {
      set({
        backendStatus: 'error',
        backendMessage: 'Backend unreachable — simulation cannot start',
        isSimulating: false,
      });
      return;
    }

    set({ backendStatus: 'connected', backendMessage: '' });

    // Step 2: Open WebSocket with retry
    const socket = await connectWebSocketWithRetry(
      `${WS_BASE_URL}/ws`,
      (msg) => set({ backendMessage: msg })
    );

    if (!socket) {
      set({
        backendStatus: 'error',
        backendMessage: 'WebSocket connection failed after retries',
        isSimulating: false,
      });
      return;
    }

    // Step 3: Send graph payload
    const graph = {
      nodes: get().nodes.map(n => ({
        id: n.id,
        type: n.type,
        capacity: n.data.capacity || 5000,
        latency: n.data.latency || 50,
      })),
      edges: get().edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };

    socket.send(JSON.stringify({
      graph,
      config: { rps: get().rps, duration: 60 }
    }));
    set({ isSimulating: true, socket, backendMessage: '' });

    // Step 4: Handle incoming telemetry frames
    socket.onmessage = (event) => {
      const frame = JSON.parse(event.data);

      // Guard against non-telemetry messages (e.g. "simulation_complete")
      if (!frame.nodes) {
        return;
      }
      
      // Calculate aggregate metrics for this frame
      const totalRps = frame.nodes.reduce((acc: number, n: any) => acc + n.current_rps, 0);
      const avgLatency = frame.nodes.reduce((acc: number, n: any) => acc + n.avg_latency, 0) / (frame.nodes.length || 1);

      set((state) => ({
        metricsHistory: [...state.metricsHistory.slice(-50), {
          time: frame.time,
          totalRps,
          avgLatency
        }],
        nodes: state.nodes.map(node => {
          const status = frame.nodes.find((s: any) => s.id === node.id);
          if (status) {
            return {
              ...node,
              data: { ...node.data, status: status.status, rps: status.current_rps }
            };
          }
          return node;
        })
      }));
    };

    // Step 5: Handle close — generate final report
    socket.onclose = () => {
      const history = get().metricsHistory;
      if (history.length > 0) {
        const peakRps = Math.max(...history.map(h => h.totalRps));
        const avgLat = history.reduce((acc, h) => acc + h.avgLatency, 0) / history.length;
        const bottleneckDetails = get().nodes
          .filter(n => n.data.status === 'overloaded')
          .map(n => ({
            id: n.id,
            type: n.type,
            label: n.data.label,
            rps: n.data.rps,
            capacity: n.data.capacity
          }));
        
        set({
          simulationReport: {
            peakRps,
            avgLatency: Math.round(avgLat),
            bottlenecks: bottleneckDetails.length,
            bottleneckDetails,
            totalTime: history[history.length - 1].time,
            healthScore: Math.max(0, 100 - (bottleneckDetails.length * 25) - (avgLat > 200 ? 20 : 0))
          }
        });
      }
      set({ isSimulating: false, socket: null });
    };

    // Step 6: Handle unexpected errors during the session
    socket.onerror = () => {
      set({
        backendStatus: 'error',
        backendMessage: 'WebSocket error — connection lost',
        isSimulating: false,
        socket: null,
      });
    };
  },

  stopSimulation: () => {
    get().socket?.close();
    set({ isSimulating: false, socket: null });
  }
}));
