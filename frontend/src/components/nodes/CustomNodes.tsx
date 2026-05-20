import { Handle, Position, type NodeProps } from '@xyflow/react';
import { 
  Users, 
  Server, 
  Database, 
  Zap, 
  Globe, 
  MessageSquare,
  Cloud,
  Box
} from 'lucide-react';
import { clsx } from 'clsx';

const NodeWrapper = ({ label, icon: Icon, type, selected, status, currentRps }: any) => {
  const baseColors: Record<string, string> = {
    client: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    load_balancer: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
    api_server: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    database: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    cache: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    cdn: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    queue: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    storage: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
  };

  const statusColors: Record<string, string> = {
    ok: 'border-success/40 bg-success/10 text-success',
    warning: 'border-warning/40 bg-warning/10 text-warning',
    overloaded: 'border-error bg-error/10 text-error animate-pulse',
  };

  return (
    <div className={clsx(
      'px-4 py-3 rounded-xl border-2 glass min-w-[180px] flex items-center gap-3 transition-all',
      selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : '',
      status ? statusColors[status] : baseColors[type] || 'border-border'
    )}>
      <div className={clsx('p-2 rounded-lg border', baseColors[type])}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-[9px] uppercase tracking-widest text-foreground/45 font-bold">{type.replace('_', ' ')}</p>
        <p className="text-sm font-bold text-foreground leading-tight truncate max-w-[100px]">{label}</p>
        {currentRps !== undefined && (
          <p className={clsx(
            "text-[10px] font-mono mt-1 font-bold",
            status === 'overloaded' ? 'text-error' : 'text-primary'
          )}>
            {currentRps.toLocaleString()} RPS
          </p>
        )}
      </div>
      {status === 'overloaded' && (
        <div className="w-2 h-2 rounded-full bg-error animate-ping" />
      )}
    </div>
  );
};

export const ClientNode = ({ data, selected }: NodeProps) => (
  <>
    <NodeWrapper label={data.label} icon={Users} type="client" selected={selected} status={data.status} currentRps={data.rps} />
    <Handle type="source" position={Position.Right} />
  </>
);

export const LoadBalancerNode = ({ data, selected }: NodeProps) => (
  <>
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Globe} type="load_balancer" selected={selected} status={data.status} currentRps={data.rps} />
    <Handle type="source" position={Position.Right} />
  </>
);

export const APIServerNode = ({ data, selected }: NodeProps) => (
  <>
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Server} type="api_server" selected={selected} status={data.status} currentRps={data.rps} />
    <Handle type="source" position={Position.Right} />
  </>
);

export const DatabaseNode = ({ data, selected }: NodeProps) => (
  <>
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Database} type="database" selected={selected} status={data.status} currentRps={data.rps} />
  </>
);

export const CacheNode = ({ data, selected }: NodeProps) => (
  <>
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Zap} type="cache" selected={selected} status={data.status} currentRps={data.rps} />
    <Handle type="source" position={Position.Right} />
  </>
);

export const CDNNode = ({ data, selected }: NodeProps) => (
  <>
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Cloud} type="cdn" selected={selected} status={data.status} currentRps={data.rps} />
    <Handle type="source" position={Position.Right} />
  </>
);

export const QueueNode = ({ data, selected }: NodeProps) => (
  <>
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={MessageSquare} type="queue" selected={selected} status={data.status} currentRps={data.rps} />
    <Handle type="source" position={Position.Right} />
  </>
);

export const StorageNode = ({ data, selected }: NodeProps) => (
  <>
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Box} type="storage" selected={selected} status={data.status} currentRps={data.rps} />
  </>
);

export const nodeTypes = {
  client: ClientNode,
  load_balancer: LoadBalancerNode,
  api_server: APIServerNode,
  database: DatabaseNode,
  cache: CacheNode,
  cdn: CDNNode,
  queue: QueueNode,
  storage: StorageNode,
};
