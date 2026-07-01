import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import client from '../api/client';
import Badge, { getStatusVariant } from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface MessageItem {
  _id: string;
  type: string;
  channel?: string;
  content: string;
  subject?: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  errorMessage?: string;
  leadId: {
    _id: string;
    businessName: string;
    phone: string;
    city: string;
  } | null;
}

export default function MessagesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['messages', page, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await client.get('/messages', { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const messages: MessageItem[] = data?.data || [];
  const pagination = data?.pagination;

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      INITIAL: 'Initial',
      FOLLOW_UP_1: 'Follow-up 1',
      FOLLOW_UP_2: 'Follow-up 2',
    };
    return map[type] || type;
  };

  const channelBadge = (channel?: string) => {
    switch (channel) {
      case 'email': return { icon: '📧', label: 'Email', color: 'text-blue-400' };
      case 'instagram': return { icon: '📸', label: 'Instagram', color: 'text-pink-400' };
      default: return { icon: '📱', label: 'WhatsApp', color: 'text-emerald-400' };
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-sm text-surface-300 mt-1">{pagination?.total ?? 0} total messages</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field w-40"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="QUEUED">Queued</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="READ">Read</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg._id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {msg.leadId?.businessName || 'Unknown Business'}
                  </p>
                  <p className="text-xs text-surface-300 mt-0.5">
                    {msg.leadId?.phone} · {msg.leadId?.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${channelBadge(msg.channel).color}`}>{channelBadge(msg.channel).icon} {channelBadge(msg.channel).label}</span>
                  <Badge label={typeLabel(msg.type)} variant="info" />
                  <Badge label={msg.status} variant={getStatusVariant(msg.status)} />
                </div>
              </div>
              <p className="text-sm text-surface-200 bg-surface-800/50 rounded-xl p-3 line-clamp-3">
                {msg.content}
              </p>
              {msg.status === 'FAILED' && msg.errorMessage && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-xs text-red-400 font-medium">Error: {msg.errorMessage}</p>
                </div>
              )}
              <div className="flex gap-4 mt-3 text-xs text-surface-300">
                {msg.sentAt && <span>Sent: {new Date(msg.sentAt).toLocaleString('en-IN')}</span>}
                {msg.deliveredAt && <span>Delivered: {new Date(msg.deliveredAt).toLocaleString('en-IN')}</span>}
                {msg.readAt && <span>Read: {new Date(msg.readAt).toLocaleString('en-IN')}</span>}
                {!msg.sentAt && <span>Created: {new Date(msg.createdAt).toLocaleString('en-IN')}</span>}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-3">
              <p className="text-xs text-surface-300">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
          title="No messages yet"
          description="Messages will appear here once you start contacting leads."
        />
      )}
    </div>
  );
}
