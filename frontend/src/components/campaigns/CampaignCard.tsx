import Badge, { getStatusVariant } from '../ui/Badge';
import type { Campaign } from '../../hooks/useCampaigns';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  TrashIcon,
  MapPinIcon,
  TagIcon,
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-surface-800/50">
          <p className="text-lg font-bold text-white">{stats.totalLeads}</p>
          <p className="text-xs text-surface-300">Leads</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface-800/50">
          <p className="text-lg font-bold text-white">{stats.totalContacted}</p>
          <p className="text-xs text-surface-300">Contacted</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface-800/50">
          <p className="text-lg font-bold text-white">{stats.totalSearched}</p>
          <p className="text-xs text-surface-300">Searched</p>
        </div>
      </div>

      {/* Last Run */}
      {lastRunAt && (
        <p className="text-xs text-surface-300 mb-3">
          Last run: {new Date(lastRunAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

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
