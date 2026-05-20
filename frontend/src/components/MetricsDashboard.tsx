import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface MetricsPanelProps {
  data: any[];
}

export const MetricsDashboard = ({ data }: MetricsPanelProps) => {
  return (
    <div className="space-y-6">
      <div className="glass p-4 rounded-xl">
        <h4 className="text-[10px] uppercase font-bold opacity-40 mb-4">Throughput (RPS)</h4>
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickFormatter={(val) => `${val/1000}k`} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)' }}
                itemStyle={{ color: 'var(--color-primary)' }}
                labelStyle={{ color: 'var(--color-foreground)' }}
              />
              <Line 
                type="monotone" 
                dataKey="totalRps" 
                stroke="var(--color-primary)" 
                strokeWidth={2.5} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass p-4 rounded-xl">
        <h4 className="text-[10px] uppercase font-bold opacity-40 mb-4">Avg Latency (ms)</h4>
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)' }}
                itemStyle={{ color: 'var(--color-accent)' }}
                labelStyle={{ color: 'var(--color-foreground)' }}
              />
              <Line 
                type="monotone" 
                dataKey="avgLatency" 
                stroke="var(--color-accent)" 
                strokeWidth={2.5} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
