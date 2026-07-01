import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import client from '../api/client';
import toast from 'react-hot-toast';

export interface Campaign {
  _id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  state?: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  isSearching?: boolean;
  schedule?: { enabled: boolean; cronExpression: string };
  filters: { minRating: number; minReviews: number; excludeWithWebsite: boolean };
  stats: { totalSearched: number; totalLeads: number; totalContacted: number; totalWithWebsite?: number; totalWithoutWebsite?: number };
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function useCampaigns(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['campaigns', page, limit],
    queryFn: async () => {
      const { data } = await client.get('/campaigns', { params: { page, limit } });
      return data;
    },
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data } = await client.get(`/campaigns/${id}`);
      return data.data as Campaign;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Campaign>) => {
      const res = await client.post('/campaigns', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: () => toast.error('Failed to create campaign'),
  });
}

export function useCampaignAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'pause' | 'stop' }) => {
      const res = await client.post(`/campaigns/${id}/${action}`);
      return res.data;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Campaign ${action}ed successfully`);
    },
    onError: (_, { action }) => toast.error(`Failed to ${action} campaign`),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.delete(`/campaigns/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: () => toast.error('Failed to delete campaign'),
  });
}
