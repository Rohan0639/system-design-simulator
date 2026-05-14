import { 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Trophy,
  X
} from 'lucide-react';
import { clsx } from 'clsx';

interface ReportProps {
  report: {
    peakRps: number;
    avgLatency: number;
    bottlenecks: number;
    totalTime: number;
    healthScore: number;
  };
  onClose: () => void;
}

export const SimulationReport = ({ report, onClose }: ReportProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass w-full max-w-lg rounded-3xl p-8 relative shadow-2xl border-primary/20 animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-foreground/5 rounded-full transition-colors"
        >
          <X size={20} className="opacity-40" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Trophy size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Simulation Complete</h2>
            <p className="text-sm opacity-50">Post-execution analysis report</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass p-5 rounded-2xl">
            <TrendingUp size={18} className="text-success mb-3" />
            <p className="text-2xl font-black">{report.peakRps.toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold opacity-40">Peak RPS</p>
          </div>
          <div className="glass p-5 rounded-2xl">
            <Clock size={18} className="text-accent mb-3" />
            <p className="text-2xl font-black">{report.avgLatency}ms</p>
            <p className="text-[10px] uppercase font-bold opacity-40">Avg Latency</p>
          </div>
          <div className="glass p-5 rounded-2xl">
            <AlertCircle size={18} className="text-error mb-3" />
            <p className="text-2xl font-black">{report.bottlenecks}</p>
            <p className="text-[10px] uppercase font-bold opacity-40">Bottlenecks</p>
          </div>
          <div className="glass p-5 rounded-2xl flex flex-col justify-center items-center text-center">
            <div className={clsx(
              "text-3xl font-black mb-1",
              report.healthScore > 80 ? "text-success" : report.healthScore > 50 ? "text-warning" : "text-error"
            )}>
              {report.healthScore}%
            </div>
            <p className="text-[10px] uppercase font-bold opacity-40">Health Score</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold opacity-80">Executive Summary</h3>
          <div className="text-xs leading-relaxed opacity-70 space-y-2">
            <p>
              The simulation ran for <span className="text-foreground font-bold">{Math.round(report.totalTime / 1000)}s</span> of simulated time. 
              {report.bottlenecks > 0 
                ? ` System stability was compromised by ${report.bottlenecks} critical bottlenecks.`
                : " The architecture maintained high stability throughout the load test."}
            </p>
            <p>
              {report.healthScore > 80 
                ? "Your design is production-ready and highly resilient. Good job!" 
                : "We noticed significant performance degradation under peak load. Check the 'Architect Advice' tab for specific optimization steps."}
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
