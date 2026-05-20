import { 
  Play, 
  Square, 
  Activity, 
  Zap, 
  Loader2, 
  Download,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';

export const Header = () => {
  const { 
    isSimulating, 
    startSimulation, 
    stopSimulation, 
    rps, 
    setRPS, 
    generateAIDesign,
    simulationReport,
    backendStatus,
  } = useStore();
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const isConnecting = backendStatus === 'connecting';

  const handleAIDesign = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      await generateAIDesign(prompt);
      setPrompt('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const metricsHistory = useStore.getState().metricsHistory;
    const logData = {
      summary: simulationReport,
      history: metricsHistory,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system_design_report_${Date.now()}.json`;
    link.click();
  };

  return (
    <header className="h-20 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-8 z-50 gap-6">
      {/* Left Side: Brand + Big Grok Input */}
      <div className="flex items-center gap-8 flex-1 max-w-3xl">
        {/* Brand */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/30">
            <Activity className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none uppercase">System Design Simulator</h1>
          </div>
        </div>

        {/* Big Grok AI Input */}
        <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 group-focus-within:text-primary transition-colors">
            <Zap size={18} />
          </div>
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIDesign()}
            placeholder="Ask Grok to architect a system..." 
            className="w-full bg-background/50 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:opacity-30 hover:border-border/80 text-foreground font-medium"
          />
          {isGenerating && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin">
              <Loader2 size={18} />
            </div>
          )}
        </div>
      </div>

      {/* Center Group: Input Load Slider */}
      <div className="w-72 flex flex-col gap-1.5 shrink-0 mx-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Input Load</span>
          <span className="text-xs font-black text-primary">{rps.toLocaleString()} RPS</span>
        </div>
        <input 
          type="range" 
          min="100" 
          max="20000" 
          step="100"
          value={rps}
          onChange={(e) => setRPS(parseInt(e.target.value))}
          className="w-full accent-primary bg-border rounded-full h-1.5 cursor-pointer"
        />
      </div>

      {/* Right Group: Global Actions */}
      <div className="flex items-center gap-4 shrink-0 justify-end min-w-[180px]">
        {simulationReport && (
          <button 
            onClick={handleDownload}
            className="p-3 glass rounded-xl text-foreground/60 hover:text-primary transition-all hover:scale-105 active:scale-95"
            title="Download Report"
          >
            <Download size={20} />
          </button>
        )}
        
        <button
          onClick={isSimulating ? stopSimulation : startSimulation}
          disabled={isConnecting}
          className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 ${
            isConnecting
              ? 'bg-amber-500 text-white shadow-amber-500/20'
              : isSimulating 
                ? 'bg-error text-white' 
                : 'bg-success text-white shadow-success/20'
          }`}
        >
          {isConnecting ? (
            <><Loader2 size={18} className="animate-spin" /> CONNECTING...</>
          ) : isSimulating ? (
            <><Square size={18} fill="currentColor" /> STOP</>
          ) : (
            <><Play size={18} fill="currentColor" /> SIMULATE</>
          )}
        </button>
      </div>
    </header>
  );
};

