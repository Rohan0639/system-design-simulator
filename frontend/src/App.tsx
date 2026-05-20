import { ReactFlow, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './components/nodes/CustomNodes';
import { useStore } from './store/useStore';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ArchitectureSuggestions } from './components/ArchitectureSuggestions';
import { SimulationSummaryBlock } from './components/SimulationSummaryBlock';
import { Header } from './components/Header';
import { ComponentLibrary } from './components/ComponentLibrary';
import { 
  BarChart3,
  Info,
  Activity,
  Loader2,
  WifiOff,
} from 'lucide-react';

function App() {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    rps,
    isSimulating,
    metricsHistory,
    simulationReport,
    clearReport,
    addNode,
    backendStatus,
    backendMessage,
  } = useStore();

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    // Get position relative to canvas
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    addNode(type, position);
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Components */}
        <ComponentLibrary />

        {/* Main Canvas Area */}
        <main className="flex-1 relative bg-background">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: isSimulating,
              style: { stroke: isSimulating ? '#6366f1' : '#3f3f46', strokeWidth: 2 },
            }}
          >
            <Background color="#27272a" gap={20} size={1} />
            <Controls className="custom-controls" />
            
            <Panel position="top-right" className="pointer-events-none">
              <div className="flex flex-col items-end gap-2 p-4">
                {/* Connecting state — amber pulse with spinner */}
                {backendStatus === 'connecting' && (
                  <div className="px-4 py-2 rounded-full border flex items-center gap-2 backdrop-blur-md shadow-2xl bg-amber-500/10 border-amber-500/30 text-amber-400 transition-all">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {backendMessage || 'Connecting...'}
                    </span>
                  </div>
                )}

                {/* Error state — red with WifiOff icon */}
                {backendStatus === 'error' && (
                  <div className="px-4 py-2 rounded-full border flex items-center gap-2 backdrop-blur-md shadow-2xl bg-red-500/10 border-red-500/30 text-red-400 transition-all">
                    <WifiOff size={14} />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {backendMessage || 'Connection Failed'}
                    </span>
                  </div>
                )}

                {/* Normal idle / active state */}
                {backendStatus !== 'connecting' && backendStatus !== 'error' && (
                  <div className={`px-4 py-2 rounded-full border flex items-center gap-2 backdrop-blur-md shadow-2xl transition-all ${
                    isSimulating ? 'bg-success/10 border-success/30 text-success' : 'bg-card/50 border-border text-foreground/40'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-success animate-pulse' : 'bg-foreground/20'}`} />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {isSimulating ? 'Simulation Active' : 'System Idle'}
                    </span>
                  </div>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </main>

        {/* Right Sidebar: Analysis & Metrics */}
        <aside className="w-[400px] border-l border-border bg-card/10 backdrop-blur-sm flex flex-col overflow-hidden z-10">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {/* Live Metrics - Always visible if history exists */}
            <section className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground/60">
                  <BarChart3 size={16} className="text-primary" /> Telemetry Data
                </h3>
                {isSimulating && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </div>
              <MetricsDashboard data={metricsHistory} />
            </section>

            {/* Smart Insights / Report */}
            <section className="animate-in slide-in-from-bottom-6 duration-700 delay-150">
              {simulationReport ? (
                <SimulationSummaryBlock report={simulationReport} onClear={clearReport} />
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground/60 mb-6">
                    <Info size={16} className="text-accent" /> Architect's Advice
                  </h3>
                  <ArchitectureSuggestions nodes={nodes} isSimulating={isSimulating} />
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Footer Context */}
          <div className="p-6 border-t border-border bg-background/20 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-xs font-bold opacity-40 uppercase tracking-tighter">Current Load</p>
                <p className="text-lg font-black">{rps.toLocaleString()} <span className="text-[10px] opacity-40">RPS</span></p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
