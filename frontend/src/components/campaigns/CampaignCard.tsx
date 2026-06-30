import Badge, { getStatusVariant } from '../ui/Badge';
import type { Campaign } from '../../hooks/useCampaigns';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  TrashIcon,
  MapPinIcon,
  TagIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

interface CampaignCardProps {
  campaign: Campaign;
  onAction: (id: string, action: 'start' | 'pause' | 'stop') => void;
  onDelete: (id: string) => void;
}

export default function CampaignCard({ campaign, onAction, onDelete }: CampaignCardProps) {
  const { _id, name, category, city, country, status, stats, lastRunAt } = campaign;

  return (
    <div className="glass-card-hover p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate">{name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-surface-300">
              <TagIcon className="w-3.5 h-3.5" />
              {category}
            </span>
            <span className="flex items-center gap-1 text-xs text-surface-300">
              <MapPinIcon className="w-3.5 h-3.5" />
              {city}, {country}
            </span>
          </div>
        </div>
        <Badge label={status} variant={getStatusVariant(status)} />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-surface-800/50">
          <p className="text-lg font-bold text-white">{stats.totalLeads}</p>
          <p className="text-[10px] text-surface-300 uppercase tracking-wider font-semibold">Leads</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface-800/50">
          <p className="text-lg font-bold text-white">{stats.totalContacted}</p>
          <p className="text-[10px] text-surface-300 uppercase tracking-wider font-semibold">Contacted</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface-800/50">
          <p className="text-lg font-bold text-brand-400">{stats.totalWithWebsite || 0}</p>
          <p className="text-[10px] text-surface-300 uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
            <GlobeAltIcon className="w-3 h-3" /> Website
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface-800/50">
          <p className="text-lg font-bold text-white">{stats.totalSearched}</p>
          <p className="text-[10px] text-surface-300 uppercase tracking-wider font-semibold">Searched</p>
        </div>
      </div>

      {/* Last Run & Status */}
      <div className="flex items-center justify-between mb-3">
        {campaign.isSearching ? (
          <div className="flex items-center gap-2 text-xs font-medium text-brand-400">
            <div className="w-3.5 h-3.5 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin"></div>
            <span className="animate-pulse">Searching for leads right now...</span>
          </div>
        ) : lastRunAt ? (
          <p className="text-xs text-surface-300">
            Last run: {new Date(lastRunAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : (
          <p className="text-xs text-surface-500 italic">Never run</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {status !== 'ACTIVE' && status !== 'COMPLETED' && (
          <button
            onClick={() => onAction(_id, 'start')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            Start
          </button>
        )}
        {status === 'ACTIVE' && (
          <button
            onClick={() => onAction(_id, 'pause')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
          >
            <PauseIcon className="w-4 h-4" />
            Pause
          </button>
        )}
        {status !== 'COMPLETED' && (
          <button
            onClick={() => onAction(_id, 'stop')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-800 text-surface-200 text-sm font-medium hover:bg-surface-700 transition-colors"
          >
            <StopIcon className="w-4 h-4" />
            Stop
          </button>
        )}
        <button
          onClick={() => onDelete(_id)}
          className="p-2 rounded-lg text-surface-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
