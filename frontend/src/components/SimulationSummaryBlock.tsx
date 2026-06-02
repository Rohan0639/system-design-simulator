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
  Download,
  ShieldCheck,
  Award,
  Network,
  Cpu,
  Database,
  Layers,
  Sparkles
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

interface ArchitecturalVerdict {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeColor: string;
  gradeBorder: string;
  gradeGlow: string;
  summaryTitle: string;
  summary: string;
  topologyInsights: string[];
  bottleneckAnalysis: string[];
  recommendations: string[];
}

/**
 * Perform a dynamic topological analysis of the current architecture diagram
 * to output a deeply detailed system design evaluation.
 */
const analyzeArchitecture = (report: any, nodes: any[], edges: any[]): ArchitecturalVerdict => {
  const bottlenecks = report.bottleneckDetails || [];
  const hasLB = nodes.some(n => n.type === 'load_balancer');
  const hasCache = nodes.some(n => n.type === 'cache');
  const hasCDN = nodes.some(n => n.type === 'cdn');
  const hasQueue = nodes.some(n => n.type === 'queue');
  const hasDB = nodes.some(n => n.type === 'database');
  const apiCount = nodes.filter(n => n.type === 'api_server').length;
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  let gradeColor = 'text-success bg-success/10';
  let gradeBorder = 'border-success/20';
  let gradeGlow = 'shadow-success/5';
  
  if (report.healthScore >= 90) {
    grade = 'A';
    gradeColor = 'text-success bg-success/10';
    gradeBorder = 'border-success/30';
    gradeGlow = 'shadow-success/10';
  } else if (report.healthScore >= 70) {
    grade = 'B';
    gradeColor = 'text-sky-400 bg-sky-500/10';
    gradeBorder = 'border-sky-500/30';
    gradeGlow = 'shadow-sky-500/10';
  } else if (report.healthScore >= 50) {
    grade = 'C';
    gradeColor = 'text-warning bg-warning/10';
    gradeBorder = 'border-warning/30';
    gradeGlow = 'shadow-warning/10';
  } else if (report.healthScore >= 30) {
    grade = 'D';
    gradeColor = 'text-orange-400 bg-orange-500/10';
    gradeBorder = 'border-orange-500/30';
    gradeGlow = 'shadow-orange-500/10';
  } else {
    grade = 'F';
    gradeColor = 'text-error bg-error/10';
    gradeBorder = 'border-error/30';
    gradeGlow = 'shadow-error/10';
  }

  const topologyInsights: string[] = [];
  const bottleneckAnalysis: string[] = [];
  const recommendations: string[] = [];

  // Audits orphan nodes (dead components)
  const connectedNodeIds = new Set(edges.flatMap(e => [e.source, e.target]));
  nodes.forEach(n => {
    if (!connectedNodeIds.has(n.id) && n.type !== 'client') {
      topologyInsights.push(`Dead Component (${n.data.label}): Unconnected ${n.type.replace('_', ' ')} detected. This component has no active input or output network edges, serving as an idle resource cost.`);
    }
  });

  // 1. Structural / Topological Auditing
  if (hasLB) {
    if (apiCount > 1) {
      topologyInsights.push("Decoupled Ingress: Your Load Balancer acts as an efficient gateway, distributing client requests evenly and eliminating individual CPU bottlenecks on the compute nodes.");
    } else if (apiCount === 1) {
      topologyInsights.push("Redundant Load Balancer: You deployed a Load Balancer, but it forwards all traffic to a single API Server node. Scaling this compute node out is essential to leverage horizontal balancing.");
    } else {
      topologyInsights.push("Load Balancer Orphaned: Balancer configured, but no healthy downstream API servers detected to process application logic.");
    }
  } else {
    if (apiCount > 0) {
      topologyInsights.push("Single Point of Failure (SPOF): Requests flow directly from client to API server without load balancing. A volumetric surge will immediately overwhelm compute thread limits.");
    }
  }

  if (hasDB) {
    if (hasCache || hasCDN) {
      topologyInsights.push("Data Tier Shielding: Database reads are protected by active memory caching (Cache/CDN). This offloads high-frequency queries and protects disk transactional I/O from saturating.");
    } else {
      topologyInsights.push("Uncached Storage coupling: API servers query the primary database directly for every incoming request. Under concurrent loads, this linear coupling results in quick database CPU/connection exhaustion.");
    }
  }

  if (hasQueue) {
    topologyInsights.push("Asynchronous Buffering: A Message Queue decouples write ingestion from background processing, enabling clients to receive quick HTTP 202 confirmations while consumers process packets stably.");
  }

  // 2. Component Failure Diagnosis (Granular explanation of failures)
  if (bottlenecks.length === 0) {
    bottleneckAnalysis.push("Perfect Performance: Every component operated well below physical thresholds. Memory heaps, connection limits, and buffer spaces maintained safe margins.");
  } else {
    bottlenecks.forEach((b: any) => {
      if (b.type === 'database') {
        bottleneckAnalysis.push(`Database Connection Exhaustion (${b.label}): Traffic hit ${b.rps.toLocaleString()} RPS, breaching the maximum pool limit of ${b.capacity} connections. This creates thread-starvation, lock contention, and subsequent gateway timeouts.`);
      } else if (b.type === 'api_server') {
        bottleneckAnalysis.push(`Compute Thread Saturation (${b.label}): Incoming rate of ${b.rps.toLocaleString()} RPS outpaced the server's thread capacity limit of ${b.capacity} RPS. Subsequent requests are backlogging in the OS TCP socket buffer.`);
      } else if (b.type === 'queue') {
        bottleneckAnalysis.push(`Queue Memory Overflow (${b.label}): Message ingest rate outstripped worker drain rate. The queue length exceeded the backlog threshold of ${b.capacity} packets, causing buffer overflow drops.`);
      } else if (b.type === 'load_balancer') {
        bottleneckAnalysis.push(`Ingress Chokepoint (${b.label}): Traffic rate of ${b.rps.toLocaleString()} RPS saturated the load balancer's physical capacity limit. The gateway has begun rejecting TLS/TCP handshakes.`);
      } else {
        bottleneckAnalysis.push(`Component Exhaustion (${b.label}): Active load exceeded node processing threshold of ${b.capacity} RPS, resulting in degraded execution latency and dropped connections.`);
      }
    });
  }

  // 3. Precise Engineering Recommendations (Prescriptions)
  if (bottlenecks.length > 0) {
    const hasDBFail = bottlenecks.some((b: any) => b.type === 'database');
    const hasAPIFail = bottlenecks.some((b: any) => b.type === 'api_server');
    const hasQueueFail = bottlenecks.some((b: any) => b.type === 'queue');
    const hasLBFail = bottlenecks.some((b: any) => b.type === 'load_balancer');

    if (hasDBFail) {
      if (!hasCache) {
        recommendations.push("Deploy a Redis 'Cache' component directly between the API Server and Database nodes to intercept up to 80% of common read queries.");
      } else {
        recommendations.push("Your DB is still saturated. Implement Read Replicas for horizontal read scaling, or increase the DB connection pool configuration in the data tier.");
      }
    }
    if (hasAPIFail) {
      if (!hasLB) {
        recommendations.push("Introduce a 'Load Balancer' component and duplicate your API Server nodes to horizontally split application compute workloads.");
      } else {
        recommendations.push("Increase API server instance capacities, optimize application handlers, or deploy additional API server nodes behind your balancer.");
      }
    }
    if (hasQueueFail) {
      recommendations.push("Your consumer processors are bottlenecked. Increase worker concurrency or scale worker service nodes to accelerate message drainage.");
    }
    if (hasLBFail) {
      recommendations.push("Upgrade your Load Balancer's capacity tier or use Geo-DNS routing to split traffic across multiple regional balancer ingress points.");
    }
  } else {
    if (report.avgLatency > 150) {
      recommendations.push("Although stable, average latency is slightly elevated. Deploy a CDN node at the edge to serve static assets and decrease origin traversal latency.");
    } else {
      recommendations.push("Excellent engineering. This architecture shows strong readiness for production load. Consider setting up a rate-limiting middleware to guard against volatile bots.");
    }
  }

  let summaryTitle = "";
  let summary = "";
  if (grade === 'A') {
    summaryTitle = "Resilient Architecture";
    summary = "Architectural Masterpiece. The topology exhibits exceptional balance, distributed workloads, and strong caching shields under heavy synthetic pressure.";
  } else if (grade === 'B') {
    summaryTitle = "Sub-Optimal Stability";
    summary = "Solid System Design. The system handled traffic well, with minor bottlenecks that can be easily resolved through standard horizontal scaling or caching updates.";
  } else if (grade === 'C') {
    summaryTitle = "Fragile Infrastructure";
    summary = "Degraded Performance. The system survived, but is highly sensitive to workload spikes. Key components are running hot, presenting an immediate risk of cascading failure.";
  } else if (grade === 'D') {
    summaryTitle = "Highly Vulnerable";
    summary = "High Risk Architecture. Major subsystems are heavily overloaded. Under sustained production load, this system will experience partial outages and severe performance drops.";
  } else {
    summaryTitle = "System Outage / Failure";
    summary = "Architectural Collapse. Critical single points of failure have collapsed under traffic, dropping connections and causing a systemic outage. Major architectural remediation required.";
  }

  return { grade, gradeColor, gradeBorder, gradeGlow, summaryTitle, summary, topologyInsights, bottleneckAnalysis, recommendations };
};

export const SimulationSummaryBlock = ({ report, onClear }: SummaryProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'verdict' | 'topology' | 'prescription'>('verdict');
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const { metricsHistory, nodes, edges, generateAIDesign } = useStore();

  // Run our advanced architectural compiler
  const verdict = analyzeArchitecture(report, nodes, edges);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAIOptimize = async () => {
    setIsOptimizing(true);
    try {
      const currentNodes = nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.data?.label || n.type,
        capacity: n.data?.capacity || 1000,
        latency: n.data?.latency || 50
      }));
      const currentEdges = edges.map(e => ({
        source: e.source,
        target: e.target
      }));

      const recommendationsStr = verdict.recommendations.join('\n- ');
      const bottleneckStr = report.bottleneckDetails?.map(b => `${b.label} (${b.type}): failed at ${b.rps} RPS (limit: ${b.capacity} RPS)`).join('\n') || 'None';

      const optimizePrompt = `OPTIMIZE THIS CURRENT ARCHITECTURE DIAGRAM.
Current Nodes: ${JSON.stringify(currentNodes)}
Current Edges: ${JSON.stringify(currentEdges)}

Simulation Results:
- Health Score: ${report.healthScore}%
- Peak Throughput: ${report.peakRps} RPS
- Average Latency: ${report.avgLatency}ms
- Bottlenecks Count: ${report.bottlenecks}
- Critical Bottlenecks details:
${bottleneckStr}

Prescribed Actions:
- ${recommendationsStr}

Please redesign and optimize this architecture layout. Adjust node capabilities, add replication (such as adding multiple API servers behind a Load Balancer, cache nodes in front of databases), and resolve any bottlenecks completely. Return the updated design object following the absolute placement coordinates system.`;

      await generateAIDesign(optimizePrompt);
    } catch (err) {
      console.error("AI Optimization failed:", err);
    } finally {
      setIsOptimizing(false);
    }
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

  // Verdict is compiled at the top of the component

  return (
    <div className="space-y-4 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground/60">
          <BarChart2 size={16} className="text-primary" /> Last Run Analysis
        </h3>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadLogs}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            title="Download JSON Logs"
          >
            <Download size={10} /> Export
          </button>
          <button 
            onClick={onClear}
            className="text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground/60 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl border border-border bg-card/10 shadow-2xl">
        {/* Health Score Header */}
        <div className={clsx(
          "p-5 flex items-center justify-between border-b border-border/40",
          report.healthScore >= 80 ? "bg-success/5" : report.healthScore >= 50 ? "bg-warning/5" : "bg-error/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105",
              report.healthScore >= 80 ? "bg-success text-white shadow-success/20" : 
              report.healthScore >= 50 ? "bg-warning text-black shadow-warning/20" : 
              "bg-error text-white shadow-error/20"
            )}>
              <Zap size={22} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">System Health Score</p>
              <p className="text-xl font-black tracking-tight">{report.healthScore}%</p>
            </div>
          </div>
          
          <div className={clsx(
            "px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider",
            report.healthScore >= 80 ? "border-success/20 text-success bg-success/5" : 
            report.healthScore >= 50 ? "border-warning/20 text-warning bg-warning/5" : 
            "border-error/20 text-error bg-error/5"
          )}>
            {report.healthScore >= 80 ? "Optimized" : report.healthScore >= 50 ? "Warning" : "Critical Outage"}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-4 grid grid-cols-2 gap-3 border-b border-border/20">
          <div className="p-3.5 rounded-xl bg-background/40 border border-border/30 hover:border-border transition-all group">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp size={14} className="text-success group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold opacity-45 uppercase tracking-wide">Peak Throughput</p>
            </div>
            <p className="text-base font-black tracking-tight">{report.peakRps.toLocaleString()} <span className="text-[10px] opacity-40 font-bold">RPS</span></p>
          </div>
          
          <div className="p-3.5 rounded-xl bg-background/40 border border-border/30 hover:border-border transition-all group">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock size={14} className="text-accent group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold opacity-45 uppercase tracking-wide">Average Latency</p>
            </div>
            <p className="text-base font-black tracking-tight">{report.avgLatency} <span className="text-[10px] opacity-40 font-bold">ms</span></p>
          </div>
        </div>

        {/* Dynamic Architectural Tab Selector */}
        <div className="px-4 pt-3 flex border-b border-border/20 gap-1 bg-background/10">
          <button 
            onClick={() => setActiveTab('verdict')}
            className={clsx(
              "flex-1 pb-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
              activeTab === 'verdict' 
                ? "border-primary text-primary opacity-100" 
                : "border-transparent text-foreground/45 hover:text-foreground/70"
            )}
          >
            <Award size={12} /> Verdict
          </button>
          <button 
            onClick={() => setActiveTab('topology')}
            className={clsx(
              "flex-1 pb-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
              activeTab === 'topology' 
                ? "border-primary text-primary opacity-100" 
                : "border-transparent text-foreground/45 hover:text-foreground/70"
            )}
          >
            <Layers size={12} /> Topology
          </button>
          <button 
            onClick={() => setActiveTab('prescription')}
            className={clsx(
              "flex-1 pb-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
              activeTab === 'prescription' 
                ? "border-primary text-primary opacity-100" 
                : "border-transparent text-foreground/45 hover:text-foreground/70"
            )}
          >
            <ShieldCheck size={12} /> Prescription
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-4 min-h-[190px]">
          {/* TAB 1: ARCHITECT'S VERDICT & GRADING */}
          {activeTab === 'verdict' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Premium Grading Card */}
              <div className={clsx(
                "p-4 rounded-xl border flex items-center gap-4 transition-all shadow-md",
                verdict.gradeColor,
                verdict.gradeBorder,
                verdict.gradeGlow
              )}>
                <div className="w-14 h-14 rounded-2xl bg-background/50 flex flex-col items-center justify-center border border-current shrink-0 shadow-inner">
                  <span className="text-[10px] font-bold opacity-50 leading-none">GRADE</span>
                  <span className="text-3xl font-black leading-none mt-1">{verdict.grade}</span>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest">{verdict.summaryTitle}</h4>
                  <p className="text-[11px] opacity-75 mt-1 leading-relaxed font-medium">{verdict.summary}</p>
                </div>
              </div>

              {/* Dynamic Failure Explanations */}
              <div className="space-y-2.5">
                <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest pl-1">Live Diagnostics</p>
                {verdict.bottleneckAnalysis.map((analysis, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-background/40 border border-border/30 flex items-start gap-2.5 hover:border-border transition-all">
                    {report.bottlenecks > 0 ? (
                      <Cpu size={14} className="text-error shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck size={14} className="text-success shrink-0 mt-0.5" />
                    )}
                    <p className="text-[11px] leading-relaxed text-foreground/80 font-medium">{analysis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TOPOLOGY AUDIT */}
          {activeTab === 'topology' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-3">
                <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest pl-1">Topology Assessment</p>
                {verdict.topologyInsights.length === 0 ? (
                  <p className="text-[11px] opacity-50 italic pl-1">No major topological configurations detected.</p>
                ) : (
                  verdict.topologyInsights.map((insight, idx) => {
                    const isSPOF = insight.includes("SPOF") || insight.includes("Uncached");
                    return (
                      <div key={idx} className={clsx(
                        "p-3.5 rounded-xl border flex items-start gap-3 transition-all",
                        isSPOF ? "border-error/15 bg-error/[0.02]" : "border-border/30 bg-background/40"
                      )}>
                        <Network size={14} className={clsx("shrink-0 mt-0.5", isSPOF ? "text-error" : "text-primary")} />
                        <div>
                          <p className="text-[11px] leading-relaxed text-foreground/80 font-semibold">
                            {insight.split(":")[0]}
                          </p>
                          <p className="text-[10px] leading-relaxed opacity-60 mt-0.5">
                            {insight.split(":")[1]}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REMEDIATION ROADMAP / PRESCRIPTION */}
          {activeTab === 'prescription' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-3">
                <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest pl-1">Prescribed Action Plan</p>
                {verdict.recommendations.map((recommendation, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex gap-3 group hover:bg-primary/[0.08] transition-all duration-200">
                    <ArrowRight className="text-primary shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-0.5" size={14} />
                    <p className="text-[11px] leading-relaxed text-foreground/80 font-medium">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Bottlenecks Drilldown (Retained for diagnostic completeness) */}
        {report.bottleneckDetails && report.bottleneckDetails.length > 0 && (
          <div className="px-4 pb-4 space-y-2 border-t border-border/20 pt-4">
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest pl-1 mb-2">Component Drilldown</p>
            {report.bottleneckDetails.map((node) => (
              <div 
                key={node.id} 
                className="rounded-xl overflow-hidden border border-error/20 bg-error/5 transition-all hover:border-error/35"
              >
                <button 
                  onClick={() => toggleExpand(node.id)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-error/5"
                >
                  <div className="flex items-center gap-2">
                    {node.type === 'database' ? (
                      <Database size={14} className="text-error" />
                    ) : (
                      <Server size={14} className="text-error" />
                    )}
                    <span className="text-xs font-bold text-error/90">{node.label}</span>
                  </div>
                  {expandedId === node.id ? <ChevronUp size={14} className="text-error/60" /> : <ChevronDown size={14} className="text-error/60" />}
                </button>
                
                {expandedId === node.id && (
                  <div className="px-3 pb-3 pt-1 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-background/50 border border-border/20">
                        <p className="text-[9px] uppercase font-bold opacity-50">Peak Load</p>
                        <p className="text-xs font-black text-error">{node.rps.toLocaleString()} RPS</p>
                      </div>
                      <div className="p-2 rounded-lg bg-background/50 border border-border/20">
                        <p className="text-[9px] uppercase font-bold opacity-50">Limit</p>
                        <p className="text-xs font-black">{node.capacity.toLocaleString()} RPS</p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                      <p className="text-[9px] uppercase font-bold opacity-50 mb-1">Root Cause Diagnosis</p>
                      <p className="text-[11px] leading-relaxed opacity-80">
                        The {node.type.replace('_', ' ')} tier is physically unable to handle incoming request volumes. 
                        Target saturation is <span className="text-error font-bold">{Math.round((node.rps / node.capacity) * 100)}%</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Optimize Design Button */}
        <div className="p-4 border-t border-border/20 bg-primary/5 hover:bg-primary/[0.08] transition-all">
          <button
            onClick={handleAIOptimize}
            disabled={isOptimizing}
            className={clsx(
              "w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg outline-none",
              isOptimizing
                ? "bg-amber-500 text-white cursor-not-allowed animate-pulse"
                : "bg-primary text-white hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] shadow-primary/20"
            )}
          >
            {isOptimizing ? (
              <>
                <Zap size={14} className="animate-spin text-white" />
                OPTIMIZING ARCHITECTURE...
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-white" />
                OPTIMIZE DESIGN WITH AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
