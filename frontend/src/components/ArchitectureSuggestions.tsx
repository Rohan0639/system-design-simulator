import { Lightbulb, AlertTriangle, CheckCircle, ArrowRight, Activity, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface Suggestion {
  id: string;
  type: 'optimization' | 'warning' | 'info';
  title: string;
  shortDescription: string;
  detailedAdvice: string[];
  impact: 'High' | 'Medium' | 'Low';
  reason?: string;
}

interface SuggestionsProps {
  nodes: any[];
  isSimulating?: boolean;
}

export const ArchitectureSuggestions = ({ nodes, isSimulating }: SuggestionsProps) => {
  const suggestions: Suggestion[] = [];

  nodes.forEach(node => {
    if (node.data.status === 'overloaded' || node.data.status === 'warning') {
      const isCritical = node.data.status === 'overloaded';
      const currentRps = node.data.rps || 0;
      const capacity = node.data.capacity || 1000;
      
      const reason = isCritical 
        ? `Node is severely overloaded: Current throughput (${currentRps.toLocaleString()} RPS) has exceeded the physical capacity limit (${capacity.toLocaleString()} RPS).`
        : `Node is nearing capacity: Current load (${currentRps.toLocaleString()} RPS) is consuming over 50% of available resources (${capacity.toLocaleString()} RPS).`;

      if (node.type === 'database') {
        suggestions.push({
          id: `db-${node.id}`,
          type: isCritical ? 'warning' : 'optimization',
          title: isCritical ? 'Critical Database Congestion' : 'Database Performance Warning',
          shortDescription: `Node "${node.data.label}" is exceeding its I/O capacity.`,
          reason,
          impact: 'High',
          detailedAdvice: [
            "Immediate: Implement a Cache-Aside pattern using the 'Cache' component to offload frequent read queries.",
            "Scaling: Introduce Read Replicas to distribute query load away from the primary instance.",
            "Infrastructure: Consider upgrading to a Provisioned IOPS (PIOPS) storage tier to handle higher burst loads."
          ]
        });
      }
      
      if (node.type === 'api_server') {
        suggestions.push({
          id: `api-${node.id}`,
          type: isCritical ? 'warning' : 'optimization',
          title: 'API Tier Exhaustion',
          shortDescription: `Service "${node.data.label}" is struggling with request concurrency.`,
          reason,
          impact: 'Medium',
          detailedAdvice: [
            "Scale-Out: Deploy additional instances of this service behind a Load Balancer to distribute the load.",
            "Resilience: Implement a Circuit Breaker pattern to prevent the service from being overwhelmed.",
            "Optimization: Check for memory leaks or CPU-intensive tasks that could be offloaded to a Queue."
          ]
        });
      }

      if (node.type === 'load_balancer') {
        suggestions.push({
          id: `lb-${node.id}`,
          type: 'warning',
          title: 'Load Balancer Saturation',
          shortDescription: `Global entry point "${node.data.label}" is hitting throughput limits.`,
          reason,
          impact: 'High',
          detailedAdvice: [
            "DNS: Use Geolocation-based DNS to split traffic across multiple regional Load Balancers.",
            "Offloading: Move SSL/TLS termination to the edge to reduce the computational load on the LB.",
            "WAF: Ensure a Web Application Firewall is blocking malicious bot traffic."
          ]
        });
      }
    }
  });

  if (suggestions.length === 0) {
    return (
      <div className="glass p-6 rounded-2xl flex flex-col items-center text-center gap-4 border-success/20 bg-success/5">
        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center text-success">
          {isSimulating ? <Zap size={28} className="animate-pulse" /> : <CheckCircle size={28} />}
        </div>
        <div>
          <p className="text-lg font-bold">{isSimulating ? 'System Running Smoothly' : 'Architecture Optimized'}</p>
          <p className="text-sm opacity-60 max-w-[200px]">
            {isSimulating 
              ? `Real-time simulation shows all ${nodes.length} nodes are operating within healthy parameters.`
              : `Your current design is efficiently handling the ${nodes.length} simulated nodes.`}
          </p>
        </div>
        {isSimulating && (
          <div className="flex gap-2 mt-2">
            <div className="px-3 py-1 bg-success/10 rounded-full text-[10px] font-bold text-success flex items-center gap-1">
              <Activity size={10} /> LATENCY STABLE
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map(s => (
        <div key={s.id} className={clsx(
          "glass p-5 rounded-2xl border-l-4 transition-all hover:translate-x-1 shadow-lg shadow-black/5",
          s.type === 'warning' ? 'border-l-error bg-error/5' : 'border-l-accent bg-accent/5'
        )}>
          <div className="flex items-start gap-3 mb-4">
            <div className={clsx(
              "p-2 rounded-lg",
              s.type === 'warning' ? "bg-error/20 text-error" : "bg-accent/20 text-accent"
            )}>
              {s.type === 'warning' ? <AlertTriangle size={20} /> : <Lightbulb size={20} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-bold leading-tight">{s.title}</p>
                <span className={clsx(
                  "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0",
                  s.impact === 'High' ? "bg-error text-white" : "bg-warning text-black"
                )}>
                  {s.impact} Impact
                </span>
              </div>
              <p className="text-xs opacity-70 mt-1 font-medium">{s.shortDescription}</p>
            </div>
          </div>

          {s.reason && (
            <div className="mb-4 p-3 rounded-xl bg-foreground/5 border border-foreground/5">
              <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-1">Diagnosis</p>
              <p className="text-[11px] leading-relaxed text-foreground/80">{s.reason}</p>
            </div>
          )}

          <div className="space-y-3 pl-1">
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest pl-1">Architect's Recommendation</p>
            {s.detailedAdvice.map((advice, idx) => (
              <div key={idx} className="flex gap-3 group">
                <ArrowRight className="text-primary shrink-0 opacity-40 group-hover:opacity-100 transition-opacity mt-1" size={14} />
                <p className="text-[11px] leading-relaxed text-foreground/80">{advice}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
