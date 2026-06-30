import { useState } from 'react';
import Badge, { getStatusVariant } from '../ui/Badge';
import {
  XMarkIcon,
  PhoneIcon,
  MapPinIcon,
  StarIcon,
  GlobeAltIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface LeadDetailDrawerProps {
  lead: {
    _id: string;
    businessName: string;
    category: string;
    city: string;
    phone: string;
    email?: string;
    address: string;
    rating?: number;
    reviewCount?: number;
    aiScore: number;
    aiQualified: boolean;
    aiReason: string;
    status: string;
    googleMapsUrl: string;
    website?: string;
    followUpCount: number;
    notes?: string;
    createdAt: string;
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
  };
  onClose: () => void;
  onContact: (channel: string, instant?: boolean) => void;
  isContacting?: boolean;
}

const channelIcon = (channel?: string) => {
  switch (channel) {
    case 'email': return '📧';
    case 'instagram': return '📸';
    default: return '📱';
  }
};

const channelLabel = (channel?: string) => {
  switch (channel) {
    case 'email': return 'Email';
    case 'instagram': return 'Instagram';
    default: return 'WhatsApp';
  }
};

export default function LeadDetailDrawer({ lead, onClose, onContact, isContacting }: LeadDetailDrawerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!lead) return null;

  const isChannelDisabled = (channel: string) => {
    if (channel === 'email' && !lead.email) return true;
    if (channel === 'instagram') {
      return lead.messageHistory?.some((m) => m.channel === 'instagram') ?? false;
    }
    return ['CONTACTED', 'MESSAGE_SENT', 'DELIVERED', 'READ', 'REPLIED'].includes(lead.status);
  };

  const handleCopy = async (text: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      toast.success('Message copied! Paste it in Instagram DMs');
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-lg bg-surface-900 border-l border-surface-700/30 overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-surface-900/95 backdrop-blur-sm border-b border-surface-700/30 p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white truncate">{lead.businessName}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-800 text-surface-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Status & Score */}
          <div className="flex items-center gap-3">
            <Badge label={lead.status} variant={getStatusVariant(lead.status)} />
            <div className={`badge border ${lead.aiScore >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : lead.aiScore >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              Score: {lead.aiScore}
            </div>
            {lead.aiQualified && (
              <span className="badge bg-brand-500/10 text-brand-400 border border-brand-500/20">Qualified</span>
            )}
          </div>

          {/* AI Reason */}
          <div className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
            <p className="text-xs font-medium text-surface-300 mb-1">AI Assessment</p>
            <p className="text-sm text-surface-200">{lead.aiReason}</p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <PhoneIcon className="w-4 h-4 text-surface-300" />
              <span className="text-surface-200">{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-surface-300">📧</span>
                <span className="text-surface-200">{lead.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <MapPinIcon className="w-4 h-4 text-surface-300" />
              <span className="text-surface-200">{lead.address}</span>
            </div>
            {lead.rating && (
              <div className="flex items-center gap-3 text-sm">
                <StarIcon className="w-4 h-4 text-amber-400" />
                <span className="text-surface-200">{lead.rating}/5 ({lead.reviewCount} reviews)</span>
              </div>
            )}
            {lead.googleMapsUrl && (
              <div className="flex items-center gap-3 text-sm">
                <GlobeAltIcon className="w-4 h-4 text-surface-300" />
                <a href={lead.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">
                  View on Google Maps
                </a>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-surface-300 mb-2">Contact via</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => onContact('whatsapp')}
                disabled={isContacting || isChannelDisabled('whatsapp')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="text-lg">📱</span>
                <span className="text-xs font-medium text-center">WhatsApp<br/>(Queue)</span>
              </button>
              <button
                onClick={() => onContact('whatsapp', true)}
                disabled={isContacting || isChannelDisabled('whatsapp')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="text-lg">⚡</span>
                <span className="text-xs font-medium text-center">WhatsApp<br/>(Instant)</span>
              </button>
              <button
                onClick={() => onContact('email')}
                disabled={isContacting || isChannelDisabled('email')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="text-lg">📧</span>
                <span className="text-xs font-medium">Email</span>
              </button>
              <button
                onClick={() => onContact('instagram')}
                disabled={isContacting || isChannelDisabled('instagram')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="text-lg">📸</span>
                <span className="text-xs font-medium">Instagram</span>
              </button>
            </div>
          </div>

          {/* Message History */}
          {lead.messageHistory && lead.messageHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Message History</h3>
              <div className="space-y-3">
                {lead.messageHistory.map((msg) => (
                  <div key={msg._id} className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{channelIcon(msg.channel)}</span>
                        <Badge label={channelLabel(msg.channel)} variant="info" />
                        <Badge label={msg.type.replace('_', ' ')} variant="info" />
                      </div>
                      <Badge label={msg.status} variant={getStatusVariant(msg.status)} />
                    </div>

                    {/* Email subject */}
                    {msg.channel === 'email' && msg.subject && (
                      <p className="text-xs text-surface-300 mb-1">Subject: <span className="text-surface-200">{msg.subject}</span></p>
                    )}

                    <p className="text-sm text-surface-200 line-clamp-3">{msg.content}</p>

                    {/* Instagram: Copy button */}
                    {msg.channel === 'instagram' && (
                      <button
                        onClick={() => handleCopy(msg.content, msg._id)}
                        className="mt-2 flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                      >
                        {copiedId === msg._id ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                            Copy for Instagram DM
                          </>
                        )}
                      </button>
                    )}

                    {msg.status === 'FAILED' && msg.errorMessage && (
                      <p className="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                        Error: {msg.errorMessage}
                      </p>
                    )}
                    <p className="text-xs text-surface-300 mt-2">
                      {new Date(msg.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Status */}
          <div className="p-3 rounded-xl bg-surface-800/50">
            <p className="text-xs text-surface-300">
              Follow-ups sent: {lead.followUpCount}/2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
