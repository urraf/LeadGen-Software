import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import StatCard from '../components/ui/StatCard';
import Badge, { getStatusVariant } from '../components/ui/Badge';
import {
  UserGroupIcon,
  CheckBadgeIcon,
  PaperAirplaneIcon,
  EnvelopeOpenIcon,
  EyeIcon,
  ChatBubbleOvalLeftIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await client.get('/analytics/overview');
      return res.data.data;
    },
  });

  const { data: daily, isLoading: isDailyLoading } = useQuery({
    queryKey: ['analytics-daily'],
    queryFn: async () => {
      const res = await client.get('/analytics/daily?days=14');
      return res.data.data;
    },
  });

  const { data: campaignsData, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['campaigns', 1, 5],
    queryFn: async () => {
      const res = await client.get('/campaigns?limit=5');
      return res.data;
    },
  });

  const isLoading = isOverviewLoading || isDailyLoading || isCampaignsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in duration-300">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-surface-300 font-medium animate-pulse">Loading dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Leads"
          value={overview?.totalLeads ?? 0}
          icon={<UserGroupIcon className="w-6 h-6" />}
          color="brand"
        />
        <StatCard
          label="Qualified"
          value={overview?.qualifiedLeads ?? 0}
          icon={<CheckBadgeIcon className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          label="Messages Sent"
          value={overview?.messagesSent ?? 0}
          icon={<PaperAirplaneIcon className="w-6 h-6" />}
          color="cyan"
        />
        <StatCard
          label="Delivered"
          value={overview?.messagesDelivered ?? 0}
          icon={<EnvelopeOpenIcon className="w-6 h-6" />}
          color="violet"
        />
        <StatCard
          label="Read"
          value={overview?.messagesRead ?? 0}
          icon={<EyeIcon className="w-6 h-6" />}
          color="amber"
        />
        <StatCard
          label="Replies"
          value={overview?.replies ?? 0}
          icon={<ChatBubbleOvalLeftIcon className="w-6 h-6" />}
          trend={`${overview?.conversionRate ?? 0}% conversion`}
          color="rose"
        />
      </div>

      {/* Chart + Recent Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Leads Generated (Last 14 Days)</h3>
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
              <Line type="monotone" dataKey="leads" stroke="#5c7cfa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="messages" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Campaigns */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Campaigns</h3>
          <div className="space-y-3">
            {campaignsData?.data?.length > 0 ? (
              campaignsData.data.map((c: {
                _id: string;
                name: string;
                status: string;
                stats: { totalLeads: number; totalContacted: number };
                category: string;
                city: string;
              }) => (
                <div key={c._id} className="p-3 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <Badge label={c.status} variant={getStatusVariant(c.status)} />
                  </div>
                  <p className="text-xs text-surface-300">{c.category} · {c.city}</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs text-surface-300">{c.stats.totalLeads} leads</span>
                    <span className="text-xs text-surface-300">{c.stats.totalContacted} contacted</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-300 text-center py-8">No campaigns yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
