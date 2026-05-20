import { 
  Lightbulb, 
  CheckCircle, 
  ArrowRight, 
  Zap, 
  ShieldAlert,
  BookOpen,
  Award
} from 'lucide-react';
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

interface Pattern {
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  benefits: string[];
}

interface SuggestionsProps {
  nodes: any[];
  isSimulating?: boolean;
}

export const ArchitectureSuggestions = ({ nodes, isSimulating }: SuggestionsProps) => {
  const suggestions: Suggestion[] = [];
  const patterns: Pattern[] = [];

  // 1. Gather topological properties
  const hasLB = nodes.some(n => n.type === 'load_balancer');
  const hasCache = nodes.some(n => n.type === 'cache');
  const hasCDN = nodes.some(n => n.type === 'cdn');
  const hasQueue = nodes.some(n => n.type === 'queue');
  const hasDB = nodes.some(n => n.type === 'database');
  const apiServers = nodes.filter(n => n.type === 'api_server');
  const apiCount = apiServers.length;

  // 2. Identify System Design Patterns
  if (hasCDN && hasLB) {
    patterns.push({
      name: "Edge-Accelerated Ingress",
      badge: "Enterprise",
      badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      description: "Combines CDN edge static delivery with Load Balancer regional routing. Excellent protection against ingress hotspots and high static bandwidth costs.",
      benefits: ["Reduces TLS termination overhead", "Guards origin servers against DDoS", "Improves global client load speeds"]
    });
  }

  if (hasCache && hasDB) {
    patterns.push({
      name: "Cache-Aside Pattern",
      badge: "Distributed Caching",
      badgeColor: "text-success bg-success/10 border-success/20",
      description: "High-frequency SELECT queries are intercepted by the in-memory cache tier before querying the transactional primary database.",
      benefits: ["Lowers DB CPU usage by 60-80%", "Average latency drops from 40ms to <5ms", "Safeguards against query spikes"]
    });
  }

  if (hasQueue && hasDB) {
    patterns.push({
      name: "Queue-Based Load Leveling",
      badge: "Asynchronous",
      badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      description: "Write-heavy requests are queued and processed asynchronously by background worker threads rather than blocking synchronous HTTP threads.",
      benefits: ["Guarantees ingestion stability under pressure", "Decouples write rates from database disk limits", "Ensures immediate client response times"]
    });
  }

  if (apiCount > 1 && hasLB) {
    patterns.push({
      name: "Horizontally Scalable Compute",
      badge: "High Availability",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      description: "Workloads are dynamically distributed across multiple API application server nodes. Zero single points of failure at the computational tier.",
      benefits: ["Seamless zero-downtime rolling updates", "Dynamic capacity autoscaling potential", "High resilience to VM host failures"]
    });
  }

  if (patterns.length === 0 && nodes.length > 2) {
    patterns.push({
      name: "Monolithic Data Path",
      badge: "Baseline Tier",
      badgeColor: "text-foreground/50 bg-foreground/5 border-border",
      description: "A standard tight-coupling pattern where requests transition directly from client to API server to primary database without buffering or edge cache layers.",
      benefits: ["Low architectural complexity", "Straightforward debugging", "Zero operational synchronization latency"]
    });
  }

  // 3. Process Live Warnings and Overloads
  nodes.forEach(node => {
    if (node.data.status === 'overloaded' || node.data.status === 'warning') {
      const isCritical = node.data.status === 'overloaded';
      const currentRps = node.data.rps || 0;
      const capacity = node.data.capacity || 1000;
      
      const reason = isCritical 
        ? `Physical Capacity Exhausted: Throughput (${currentRps.toLocaleString()} RPS) is exceeding physical node processing thresholds (${capacity.toLocaleString()} RPS).`
        : `High Headroom Consumption: Component load (${currentRps.toLocaleString()} RPS) has crossed 50% of nominal limit, leaving limited capacity for traffic spikes.`;

      if (node.type === 'database') {
        suggestions.push({
          id: `db-${node.id}`,
          type: isCritical ? 'warning' : 'optimization',
          title: isCritical ? 'Critical Database IOPS Depletion' : 'Database Headroom Alert',
          shortDescription: `Primary instance "${node.data.label}" is suffering from thread locks or disk I/O depletion.`,
          reason,
          impact: 'High',
          detailedAdvice: [
            "Cache Strategy: Introduce an in-memory Redis or Memcached node right before the database layer.",
            "Write Buffering: Introduce an ingestion queue node to level write bursts and process them asynchronously.",
            "Horizontal Scaling: Configure primary/replica replication and route heavy SELECT queries to read replicas."
          ]
        });
      }
      
      if (node.type === 'api_server') {
        suggestions.push({
          id: `api-${node.id}`,
          type: isCritical ? 'warning' : 'optimization',
          title: isCritical ? 'API Compute Thread Saturation' : 'API Node Capacity Warning',
          shortDescription: `Application server "${node.data.label}" is exhausting its execution context context thread pool.`,
          reason,
          impact: 'Medium',
          detailedAdvice: [
            "Compute Scale: Duplicate this node and deploy a Load Balancer at the front ingress layer.",
            "Offload Tasks: Delegate background operations, image compression, or third-party requests to a Message Queue.",
            "Execution Audit: Optimize handlers, database query indexing, and JSON processing pools inside the engine."
          ]
        });
      }

      if (node.type === 'load_balancer') {
        suggestions.push({
          id: `lb-${node.id}`,
          type: 'warning',
          title: 'Load Balancer Port Saturation',
          shortDescription: `Gateway ingress point "${node.data.label}" is saturating network socket handshakes.`,
          reason,
          impact: 'High',
          detailedAdvice: [
            "Edge Routing: Utilize Anycast Geo-DNS to resolve traffic requests to distinct global gateways.",
            "Static CDN Offload: Serve images, CSS, and dynamic assets via CDN cache nodes, lowering raw ingress rates.",
            "TLS Termination: Offload expensive SSL handshake processing directly onto dedicated hardware at the cloud edge."
          ]
        });
      }

      if (node.type === 'queue') {
        suggestions.push({
          id: `q-${node.id}`,
          type: 'warning',
          title: 'Message Queue Memory Saturation',
          shortDescription: `Asynchronous buffer queue "${node.data.label}" is experiencing worker drainage backlogs.`,
          reason,
          impact: 'High',
          detailedAdvice: [
            "Worker Expansion: Increase consumer workers or duplicate downstream worker nodes to accelerate drainage.",
            "Rate Limiting: Impose throttle constraints on upstream API ingest points during extreme burst periods.",
            "Partitioning: Distribute high-volume message channels across distinct partition shards (Kafka-style topic partitions)."
          ]
        });
      }
    }
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* SECTION 1: ARCHITECT'S STRUCTURAL AUDIT (PROACTIVE PATTERNS) */}
      <div className="glass p-5 rounded-2xl border border-border/40 bg-card/5 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-primary" />
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground/75">Architect's Advice — Design Patterns</h4>
        </div>

        {/* Pattern List */}
        <div className="space-y-3.5">
          {patterns.map((p, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-background/30 border border-border/20 hover:border-border transition-all">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <span className="text-xs font-black tracking-tight text-foreground/90 flex items-center gap-1.5">
                  <Award size={14} className="text-primary" /> {p.name}
                </span>
                <span className={clsx(
                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wide",
                  p.badgeColor
                )}>
                  {p.badge}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-foreground/70 mb-3 font-medium">
                {p.description}
              </p>
              
              <div className="space-y-1.5 pl-1.5 border-l border-primary/20">
                <p className="text-[8px] font-bold uppercase tracking-widest text-primary opacity-60 mb-1">Top Engineering Benefits</p>
                {p.benefits.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-1.5 text-[9px] font-medium text-foreground/80">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: ARCHITECTURAL ANOMALIES & CAPACITY REMEDIATION */}
      <div className="space-y-3">
        {suggestions.length === 0 ? (
          /* Healthy system suggestions box */
          <div className="glass p-5 rounded-2xl flex items-center gap-4 border border-success/20 bg-success/[0.02]">
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center text-success shrink-0 shadow-lg shadow-success/5">
              {isSimulating ? <Zap size={20} className="animate-pulse" /> : <CheckCircle size={20} />}
            </div>
            <div>
              <p className="text-xs font-black tracking-tight text-foreground/90">
                {isSimulating ? 'Operational Headroom Stable' : 'Static Schema Optimized'}
              </p>
              <p className="text-[10px] leading-relaxed opacity-60 mt-0.5 font-medium max-w-[280px]">
                {isSimulating 
                  ? `Real-time metric telemetry indicates all ${nodes.length} nodes are operating efficiently within standard threshold envelopes.`
                  : `Your system architecture graph design is mathematically capable of handling baseline client requests.`}
              </p>
            </div>
          </div>
        ) : (
          /* Warning details */
          suggestions.map(s => (
            <div key={s.id} className={clsx(
              "glass p-5 rounded-2xl border-l-4 transition-all hover:translate-x-0.5 shadow-lg",
              s.type === 'warning' ? 'border-l-error bg-error/[0.01] border-border/20' : 'border-l-accent bg-accent/[0.01] border-border/20'
            )}>
              <div className="flex items-start gap-3 mb-3.5">
                <div className={clsx(
                  "p-2 rounded-xl border shrink-0",
                  s.type === 'warning' ? "bg-error/15 border-error/20 text-error" : "bg-accent/15 border-accent/20 text-accent"
                )}>
                  {s.type === 'warning' ? <ShieldAlert size={16} /> : <Lightbulb size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black tracking-tight leading-tight truncate">{s.title}</p>
                    <span className={clsx(
                      "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide shrink-0 border",
                      s.impact === 'High' ? "bg-error/10 border-error/20 text-error" : "bg-warning/10 border-warning/20 text-warning"
                    )}>
                      {s.impact} Impact
                    </span>
                  </div>
                  <p className="text-[10px] opacity-75 mt-1 font-medium leading-relaxed">{s.shortDescription}</p>
                </div>
              </div>

              {s.reason && (
                <div className="mb-4 p-3 rounded-xl bg-foreground/[0.03] border border-border/10">
                  <p className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-1.5">Diagnostic Signal</p>
                  <p className="text-[10px] leading-relaxed text-foreground/80 font-medium">{s.reason}</p>
                </div>
              )}

              <div className="space-y-2.5 pl-1">
                <p className="text-[8px] font-black opacity-45 uppercase tracking-widest mb-1">Prescribed Action Steps</p>
                {s.detailedAdvice.map((advice, idx) => (
                  <div key={idx} className="flex gap-2.5 group">
                    <ArrowRight className="text-primary shrink-0 opacity-40 group-hover:opacity-100 transition-opacity mt-0.5" size={13} />
                    <div>
                      <span className="text-[10px] font-bold text-foreground/90">{advice.split(":")[0]}:</span>
                      <span className="text-[10px] leading-relaxed text-foreground/75 font-medium ml-1">{advice.split(":")[1]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
