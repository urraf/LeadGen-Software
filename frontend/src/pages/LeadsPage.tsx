import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import client from '../api/client';
import Badge, { getStatusVariant } from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import LeadDetailDrawer from '../components/leads/LeadDetailDrawer';
import {
  UserGroupIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Lead {
  _id: string;
  businessName: string;
  category: string;
  city: string;
  phone: string;
  email?: string;
  rating?: number;
  reviewCount?: number;
  aiScore: number;
  aiQualified: boolean;
  aiReason: string;
  status: string;
  createdAt: string;
  googleMapsUrl: string;
  address: string;
  website?: string;
  websiteQualityScore?: number;
  websiteQualityIssues?: string;
  followUpCount: number;
  notes?: string;
  messageHistory: Array<{
    _id: string;
    type: string;
    channel?: string;
    content: string;
    subject?: string;
    status: string;
    createdAt: string;
    errorMessage?: string;
  }>;
}

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== debouncedSearch) {
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leads', page, debouncedSearch, statusFilter, minScore, hasWebsiteFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (minScore > 0) params.minScore = minScore;
      if (hasWebsiteFilter !== 'all') params.hasWebsite = hasWebsiteFilter;
      const res = await client.get('/leads', { params });
      return res.data;
    },
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  });

  const contactMutation = useMutation({
    mutationFn: async ({ leadId, channel, instant }: { leadId: string; channel: string; instant?: boolean }) => {
      const res = await client.post(`/leads/${leadId}/contact`, { channel, instant });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(data.message || 'Message queued');
      setOpenDropdownId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to contact lead';
      toast.error(msg);
      setOpenDropdownId(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const res = await client.patch(`/leads/${leadId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead status updated');
      setOpenStatusDropdownId(null);
    },
    onError: (err: any) => {
      toast.error('Failed to update status');
      setOpenStatusDropdownId(null);
    },
  });

  const leads: Lead[] = data?.data || [];
  const pagination = data?.pagination;

  const handleExportCSV = async () => {
    if (!pagination?.total || pagination.total === 0) return;
    
    const toastId = toast.loading('Fetching all data for export...');
    try {
      // Fetch all matching leads ignoring current page limit
      const res = await client.get('/leads', {
        params: {
          page: 1,
          limit: 100000,
          status: statusFilter || undefined,
          minScore: minScore > 0 ? minScore : undefined,
          search: search || undefined,
        },
      });
      
      const allLeads: Lead[] = res.data.data;
      
      const headers = ['Business Name', 'Category', 'City', 'Phone', 'Email', 'Rating', 'Reviews', 'AI Score', 'Status'];
      const rows = allLeads.map((l) => [
        `"${String(l.businessName || '').replace(/"/g, '""')}"`, 
        String(l.category || ''), 
        `"${String(l.city || '').replace(/"/g, '""')}"`, 
        String(l.phone || ''), 
        String(l.email ?? ''), 
        String(l.rating ?? ''), 
        String(l.reviewCount ?? ''), 
        String(l.aiScore ?? ''), 
        String(l.status || '')
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully', { id: toastId });
    } catch (error: any) {
      console.error('CSV Export Error:', error);
      alert(`Export error: ${error?.message || String(error)}`);
      toast.error('Failed to export CSV', { id: toastId });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const isChannelDisabled = (lead: Lead, channel: string) => {
    if (channel === 'email' && !lead.email) return true;
    if (channel === 'instagram') {
      return lead.messageHistory?.some((m) => m.channel === 'instagram') ?? false;
    }
    return ['CONTACTED', 'MESSAGE_SENT', 'DELIVERED', 'READ', 'REPLIED'].includes(lead.status);
  };

  const isAllContactDisabled = (lead: Lead) => {
    // If successfully contacted via WhatsApp or Email, disable the whole button
    if (['CONTACTED', 'MESSAGE_SENT', 'DELIVERED', 'READ', 'REPLIED'].includes(lead.status)) {
      return true;
    }
    return (
      isChannelDisabled(lead, 'whatsapp') &&
      isChannelDisabled(lead, 'email') &&
      isChannelDisabled(lead, 'instagram')
    );
  };

  const channelOptions = [
    { key: 'whatsapp', label: 'WhatsApp (Queue)', icon: '📱', color: 'text-emerald-400' },
    { key: 'whatsapp_instant', label: 'WhatsApp (Instant)', icon: '⚡', color: 'text-amber-400' },
    { key: 'email', label: 'Email', icon: '📧', color: 'text-blue-400' },
    { key: 'instagram', label: 'Instagram', icon: '📸', color: 'text-pink-400' },
  ];

  const statusOptions = [
    { key: 'CONTACTED', label: 'Mark Contacted', color: 'text-info-400' },
    { key: 'INTERESTED', label: 'Mark Interested', color: 'text-emerald-400' },
    { key: 'NOT_INTERESTED', label: 'Mark Not Interested', color: 'text-red-400' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in duration-300">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-surface-300 font-medium animate-pulse">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-surface-300 mt-1">{pagination?.total ?? 0} total leads</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2">
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-300" />
              <input
                className="input-field pl-10 pr-8"
                placeholder="Search business, phone, city, address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {isFetching && !isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              )}
            </div>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Status</label>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="NEW">New</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONTACTED">Contacted</option>
              <option value="MESSAGE_SENT">Message Sent</option>
              <option value="REPLIED">Replied</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CONVERTED">Converted</option>
              <option value="COLD">Cold</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Website</label>
            <select
              className="input-field"
              value={hasWebsiteFilter}
              onChange={(e) => { setHasWebsiteFilter(e.target.value); setPage(1); }}
            >
              <option value="all">Any</option>
              <option value="true">Has Website</option>
              <option value="false">No Website</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Min Score: {minScore}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => { setMinScore(Number(e.target.value)); setPage(1); }}
              className="w-full accent-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {leads.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700/30">
                  <th className="text-left text-xs font-semibold text-surface-300 uppercase tracking-wider px-5 py-3">Business</th>
                  <th className="text-left text-xs font-semibold text-surface-300 uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-surface-300 uppercase tracking-wider px-5 py-3">City</th>
                  <th className="text-center text-xs font-semibold text-surface-300 uppercase tracking-wider px-5 py-3">Rating</th>
                  <th className="text-center text-xs font-semibold text-surface-300 uppercase tracking-wider px-5 py-3">Score</th>
                  <th className="text-center text-xs font-semibold text-surface-300 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-surface-300 uppercase tracking-wider px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead._id}
                    onClick={() => setSelectedLeadId(lead._id)}
                    className="border-b border-surface-700/20 hover:bg-surface-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-white">{lead.businessName}</p>
                      <a 
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          lead.website 
                            ? `Hey ${lead.businessName}, I checked out your website and noticed some areas that could be improved. I'm a web developer — would you be open to a quick chat?`
                            : `Hey ${lead.businessName}, I noticed you have great reviews but no website. I'm a web developer — would you be interested in getting one set up for your business?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-400 hover:text-brand-300 hover:underline transition-colors block mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                        title="Click to message manually on WhatsApp"
                      >
                        {lead.phone}
                      </a>
                    </td>
                    <td className="px-5 py-4 text-sm text-surface-200 capitalize">{lead.category}</td>
                    <td className="px-5 py-4 text-sm text-surface-200">{lead.city}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-surface-200">
                        {lead.rating ? `${lead.rating}★` : '—'} <span className="text-xs text-surface-300">({lead.reviewCount ?? 0})</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${getScoreColor(lead.aiScore)}`}>
                          {lead.aiScore}
                        </span>
                        {lead.websiteQualityScore !== undefined && (
                          <span className="text-[10px] bg-surface-700 text-surface-200 px-1.5 py-0.5 rounded" title="Website Quality Score">
                            Web: {lead.websiteQualityScore}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge label={lead.status} variant={getStatusVariant(lead.status)} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAllContactDisabled(lead)) return;
                            setOpenDropdownId(openDropdownId === lead._id ? null : lead._id);
                          }}
                          disabled={isAllContactDisabled(lead)}
                          className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Contact
                          <ChevronDownIcon className="w-3 h-3" />
                        </button>

                        {openDropdownId === lead._id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-40 bg-surface-800 border border-surface-700/50 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {channelOptions.map((ch) => (
                              <button
                                key={ch.key}
                                onClick={() => {
                                  const isInstant = ch.key === 'whatsapp_instant';
                                  const actualChannel = ch.key.startsWith('whatsapp') ? 'whatsapp' : ch.key;
                                  contactMutation.mutate({ leadId: lead._id, channel: actualChannel, instant: isInstant });
                                  if (ch.key === 'instagram') {
                                    window.open(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(lead.businessName)}`, '_blank');
                                  }
                                }}
                                disabled={contactMutation.isPending || isChannelDisabled(lead, ch.key.startsWith('whatsapp') ? 'whatsapp' : ch.key)}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                              >
                                <span>{ch.icon}</span>
                                <span className={ch.color}>{ch.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Status Action Dropdown */}
                      <div className="relative inline-block ml-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStatusDropdownId(openStatusDropdownId === lead._id ? null : lead._id);
                            setOpenDropdownId(null);
                          }}
                          className="flex items-center justify-center w-6 h-6 rounded hover:bg-surface-700 text-surface-400 transition-colors"
                          title="Mark Status"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>
                        {openStatusDropdownId === lead._id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-44 bg-surface-800 border border-surface-700/50 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {statusOptions.map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => {
                                  updateStatusMutation.mutate({ leadId: lead._id, status: opt.key });
                                }}
                                disabled={updateStatusMutation.isPending}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${opt.color}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-surface-700/30">
              <p className="text-xs text-surface-300">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<UserGroupIcon className="w-8 h-8" />}
          title="No leads found"
          description="Start a campaign to discover and qualify leads automatically."
        />
      )}

      {/* Detail Drawer */}
      {selectedLeadId && leads.find((l) => l._id === selectedLeadId) && (
        <LeadDetailDrawer
          lead={leads.find((l) => l._id === selectedLeadId)!}
          onClose={() => setSelectedLeadId(null)}
          onUpdateStatus={(status) => updateStatusMutation.mutate({ leadId: selectedLeadId, status })}
          isUpdatingStatus={updateStatusMutation.isPending}
          onContact={(channel, instant) => {
            contactMutation.mutate({ leadId: selectedLeadId, channel, instant });
            if (channel === 'instagram') {
              const lead = leads.find((l) => l._id === selectedLeadId);
              if (lead) {
                window.open(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(lead.businessName)}`, '_blank');
              }
            }
          }}
          isContacting={contactMutation.isPending}
        />
      )}
    </div>
  );
}
