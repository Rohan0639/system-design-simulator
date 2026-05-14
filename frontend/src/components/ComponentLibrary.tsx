import React from 'react';
import { 
  Trash2, 
  Users, 
  Cpu, 
  Database, 
  Box, 
  Layers, 
  Globe, 
  Zap,
  HardDrive
} from 'lucide-react';
import { useStore } from '../store/useStore';

const NODE_TYPES = [
  { id: 'client', label: 'Client', icon: Users, description: 'Traffic entry point' },
  { id: 'load_balancer', label: 'Load Balancer', icon: Layers, description: 'Distributes traffic' },
  { id: 'api_server', label: 'API Server', icon: Cpu, description: 'Application logic' },
  { id: 'database', label: 'Database', icon: Database, description: 'Persistent storage' },
  { id: 'cache', label: 'Cache', icon: Zap, description: 'In-memory performance' },
  { id: 'cdn', label: 'CDN', icon: Globe, description: 'Edge content delivery' },
  { id: 'queue', label: 'Queue', icon: Box, description: 'Async processing' },
  { id: 'storage', label: 'Object Storage', icon: HardDrive, description: 'Blob/File storage' },
];

export const ComponentLibrary = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-48 border-r border-border bg-card/30 flex flex-col py-8 px-4 gap-8 overflow-y-auto hide-scrollbar">
      <div 
        onClick={() => useStore.getState().clearGraph()}
        className="flex items-center gap-3 p-3 bg-foreground/5 rounded-2xl border border-foreground/10 text-foreground/40 hover:text-error hover:bg-error/10 transition-all cursor-pointer group"
      >
        <Trash2 size={18} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Clear All</span>
      </div>
      
      <div className="flex-1 flex flex-col gap-3">
        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mb-2 px-2">Components</p>
        {NODE_TYPES.map((type) => (
          <div
            key={type.id}
            onDragStart={(event) => onDragStart(event, type.id)}
            onClick={() => useStore.getState().addNode(type.id)}
            draggable
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-grab hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-primary/20 group"
          >
            <div className="shrink-0">
              <type.icon size={18} />
            </div>
            <span className="text-[11px] font-bold truncate">{type.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};
