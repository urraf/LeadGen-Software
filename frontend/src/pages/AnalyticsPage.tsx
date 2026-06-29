import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = ['#5c7cfa', '#a78bfa', '#22d3ee', '#f59e0b', '#10b981'];

export default function AnalyticsPage() {
  const { data: topData } = useQuery({
    queryKey: ['analytics-top'],
    queryFn: async () => {
      const res = await client.get('/analytics/top');
      return res.data.data;
    },
  });

  const { data: daily } = useQuery({
    queryKey: ['analytics-daily-30'],
    queryFn: async () => {
      const res = await client.get('/analytics/daily?days=30');
      return res.data.data;
    },
  });

  const categories = topData?.categories || [];
  const cities = topData?.cities || [];
  const funnel = topData?.funnel || {};

  // Build funnel data
  const funnelStages = [
    { name: 'Total Leads', value: funnel.total || 0, color: '#5c7cfa' },
    { name: 'Qualified', value: funnel.qualified || 0, color: '#a78bfa' },
    { name: 'Contacted', value: funnel.contacted || 0, color: '#22d3ee' },
    { name: 'Replied', value: funnel.replied || 0, color: '#f59e0b' },
    { name: 'Interested', value: funnel.interested || 0, color: '#10b981' },
    { name: 'Converted', value: funnel.converted || 0, color: '#34d399' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>

      {/* Top Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Categories</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(55, 65, 81, 0.5)',
                  borderRadius: '12px',
                  color: '#e8ecf4',
                }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {categories.map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Cities */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Cities</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cities} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(55, 65, 81, 0.5)',
                  borderRadius: '12px',
                  color: '#e8ecf4',
                }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {cities.map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Messages Line Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Messages vs Leads (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={daily || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { day: '2-digit', month: 'short' })}
            />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                borderRadius: '12px',
                color: '#e8ecf4',
              }}
            />
            <Line type="monotone" dataKey="leads" stroke="#5c7cfa" strokeWidth={2} dot={false} name="Leads" />
            <Line type="monotone" dataKey="messages" stroke="#a78bfa" strokeWidth={2} dot={false} name="Messages" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {funnelStages.map((stage, i) => {
            const maxValue = funnelStages[0].value || 1;
            const widthPercent = Math.max(5, (stage.value / maxValue) * 100);
            return (
              <div key={stage.name} className="flex items-center gap-4">
                <div className="w-28 text-right">
                  <p className="text-sm text-surface-300">{stage.name}</p>
                </div>
                <div className="flex-1 bg-surface-800/50 rounded-full h-8 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center px-3 transition-all duration-700"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color,
                      transitionDelay: `${i * 100}ms`,
                    }}
                  >
                    <span className="text-xs font-bold text-white">{stage.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
