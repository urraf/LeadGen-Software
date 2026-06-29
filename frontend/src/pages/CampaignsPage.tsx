import { useState } from 'react';
import { useCampaigns, useCampaignAction, useDeleteCampaign } from '../hooks/useCampaigns';
import type { Campaign } from '../hooks/useCampaigns';
import CreateCampaignModal from '../components/campaigns/CreateCampaignModal';
import CampaignCard from '../components/campaigns/CampaignCard';
import EmptyState from '../components/ui/EmptyState';
import { PlusIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';

export default function CampaignsPage() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading } = useCampaigns();
  const campaignAction = useCampaignAction();
  const deleteCampaign = useDeleteCampaign();

  const campaigns: Campaign[] = data?.data || [];

  const handleAction = (id: string, action: 'start' | 'pause' | 'stop') => {
    campaignAction.mutate({ id, action });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in duration-300">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-surface-300 font-medium animate-pulse">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-sm text-surface-300 mt-1">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Campaign
        </button>
      </div>

      {/* Campaign Grid */}
      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign._id}
              campaign={campaign}
              onAction={handleAction}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<RocketLaunchIcon className="w-8 h-8" />}
          title="No campaigns yet"
          description="Create your first campaign to start discovering and contacting leads automatically."
          action={{ label: 'Create Campaign', onClick: () => setShowModal(true) }}
        />
      )}

      {/* Create Modal */}
      {showModal && <CreateCampaignModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
