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

export const useStore = create<SimulatorState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  rps: 5000,
  isSimulating: false,
  socket: null,
  metricsHistory: [],
  simulationReport: null,
  clearReport: () => set({ simulationReport: null }),
  generateAIDesign: async (prompt: string) => {
    console.log('Generating AI design for:', prompt);
    try {
      const response = await axios.post('http://localhost:8080/api/ai/generate', { prompt });
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

  startSimulation: () => {
    const socket = new WebSocket('ws://localhost:8080/ws');
    
    socket.onopen = () => {
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
      set({ isSimulating: true, socket });
    };

    socket.onmessage = (event) => {
      const frame = JSON.parse(event.data);
      
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

    socket.onclose = () => {
      // Generate final report before closing
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
  },

  stopSimulation: () => {
    get().socket?.close();
    set({ isSimulating: false, socket: null });
  }
}));
