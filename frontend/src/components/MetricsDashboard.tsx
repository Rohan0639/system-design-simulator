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
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis 
                stroke="#4b5563" 
                fontSize={10} 
                tickFormatter={(val) => `${val/1000}k`} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111114', border: '1px solid #1f1f23', borderRadius: '8px' }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Line 
                type="monotone" 
                dataKey="totalRps" 
                stroke="#6366f1" 
                strokeWidth={2} 
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#4b5563" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111114', border: '1px solid #1f1f23', borderRadius: '8px' }}
                itemStyle={{ color: '#c084fc' }}
              />
              <Line 
                type="monotone" 
                dataKey="avgLatency" 
                stroke="#c084fc" 
                strokeWidth={2} 
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
