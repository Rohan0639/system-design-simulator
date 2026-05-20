import { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Zap,
  RotateCcw,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Server,
  ArrowRight,
  Download
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore';

interface BottleneckDetail {
  id: string;
  type: string;
  label: string;
  rps: number;
  capacity: number;
}

interface SummaryProps {
  report: {
    peakRps: number;
    avgLatency: number;
    bottlenecks: number;
    bottleneckDetails?: BottleneckDetail[];
    totalTime: number;
    healthScore: number;
  };
  onClear: () => void;
}

export const SimulationSummaryBlock = ({ report, onClear }: SummaryProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { metricsHistory } = useStore();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDownloadLogs = () => {
    const logData = {
      summary: report,
      history: metricsHistory,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation_logs_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/60">
          <BarChart2 size={16} /> Last Run Analysis
        </h3>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadLogs}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            title="Download JSON Logs"
          >
            <Download size={10} /> Export
          </button>
          <button 
            onClick={onClear}
            className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 hover:text-foreground/60 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl border-primary/20 shadow-xl shadow-black/20">
        {/* Health Score Header */}
        <div className={clsx(
          "p-4 flex items-center justify-between border-b border-white/5",
          report.healthScore > 80 ? "bg-success/20" : report.healthScore > 50 ? "bg-warning/20" : "bg-error/20"
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
              report.healthScore > 80 ? "bg-success text-white" : report.healthScore > 50 ? "bg-warning text-black" : "bg-error text-white"
            )}>
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-xs font-bold opacity-60 uppercase tracking-tighter">System Health</p>
              <p className="text-lg font-black">{report.healthScore}%</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-foreground/5 border border-foreground/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={12} className="text-success" />
              <p className="text-[10px] font-bold opacity-40 uppercase">Peak Load</p>
            </div>
            <p className="text-sm font-black">{report.peakRps.toLocaleString()} <span className="text-[10px] opacity-40">RPS</span></p>
          </div>
          
          <div className="p-3 rounded-xl bg-foreground/5 border border-foreground/5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={12} className="text-accent" />
              <p className="text-[10px] font-bold opacity-40 uppercase">Latency</p>
            </div>
            <p className="text-sm font-black">{report.avgLatency} <span className="text-[10px] opacity-40">ms</span></p>
          </div>
        </div>

        {/* Bottleneck List */}
        {report.bottleneckDetails && report.bottleneckDetails.length > 0 && (
          <div className="px-4 pb-2 space-y-2">
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest pl-1 mb-2">Detailed Bottlenecks</p>
            {report.bottleneckDetails.map((node) => (
              <div 
                key={node.id} 
                className="rounded-xl overflow-hidden border border-error/20 bg-error/5 transition-all"
              >
                <button 
                  onClick={() => toggleExpand(node.id)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-error/5"
                >
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-error" />
                    <span className="text-xs font-bold">{node.label}</span>
                  </div>
                  {expandedId === node.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {expandedId === node.id && (
                  <div className="px-3 pb-3 pt-1 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-foreground/5 border border-foreground/5">
                        <p className="text-[9px] uppercase font-bold opacity-50">Peak Load</p>
                        <p className="text-xs font-black text-error">{node.rps.toLocaleString()} RPS</p>
                      </div>
                      <div className="p-2 rounded-lg bg-foreground/5 border border-foreground/5">
                        <p className="text-[9px] uppercase font-bold opacity-50">Limit</p>
                        <p className="text-xs font-black">{node.capacity.toLocaleString()} RPS</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-foreground/5 border border-foreground/5">
                      <p className="text-[9px] uppercase font-bold opacity-50 mb-1">Root Cause</p>
                      <p className="text-[11px] leading-relaxed opacity-80">
                        The {node.type.replace('_', ' ')} is physically unable to process the incoming request volume. 
                        Load is <span className="text-error font-bold">{Math.round((node.rps / node.capacity) * 100)}%</span> of total capacity.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold opacity-40 mb-1">Recommendation</p>
                      <div className="flex gap-2 items-start">
                        <ArrowRight size={10} className="text-primary mt-1 shrink-0" />
                        <p className="text-[10px] leading-tight opacity-70">
                          {node.type === 'database' ? "Add a Redis cache or implement read replicas." : 
                           node.type === 'api_server' ? "Scale out by adding more instances behind a load balancer." :
                           "Check for connection pooling limits or upgrade resource tier."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Verdict */}
        <div className="px-4 pb-4 mt-2">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Architect's Verdict</p>
            <p className="text-[11px] leading-relaxed opacity-80">
              {report.healthScore > 80 
                ? "This architecture is highly resilient. It handled peak load with minimal performance degradation." 
                : report.bottlenecks > 0 
                  ? `Critical failures detected in ${report.bottlenecks} components. Expand the items above to see specific fixes.`
                  : "Performance was suboptimal despite no hard failures. Consider optimizing data paths or using a CDN."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
