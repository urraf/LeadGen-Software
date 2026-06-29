import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import toast from 'react-hot-toast';
import {
  HomeIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  BoltIcon,
  ArrowPathIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HomeIcon },
  { path: '/campaigns', label: 'Campaigns', icon: RocketLaunchIcon },
  { path: '/leads', label: 'Leads', icon: UserGroupIcon },
  { path: '/messages', label: 'Messages', icon: ChatBubbleLeftRightIcon },
  { path: '/analytics', label: 'Analytics', icon: ChartBarIcon },
  { path: '/profile', label: 'Profile', icon: UserIcon },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();

  const queryClient = useQueryClient();

  const { data: waStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await client.get('/webhooks/whatsapp/status');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await client.post('/webhooks/whatsapp/reset');
    },
    onSuccess: () => {
      toast.success('WhatsApp connection reset initiated');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
    onError: () => {
      toast.error('Failed to reset WhatsApp connection');
    },
  });

  return (
    <aside className="w-64 bg-surface-900/80 backdrop-blur-xl border-r border-surface-700/30 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-surface-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <BoltIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">LeadGen</h1>
            <p className="text-xs text-surface-300">AI-Powered</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* WhatsApp Status */}
      <div className="p-4 border-t border-surface-700/30">
        {!waStatus?.ready && waStatus?.qr && (
          <div className="mb-4 bg-white p-2 rounded-xl">
            <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-full h-auto rounded-lg" />
            <p className="text-center text-xs text-surface-900 mt-2 font-medium">Scan to link</p>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-800/50">
          <div className={`w-2.5 h-2.5 rounded-full ${
            waStatus?.ready ? 'bg-emerald-400 animate-pulse-soft' : 'bg-amber-400 animate-pulse'
          }`} />
          <div>
            <p className="text-xs font-medium text-surface-200">WhatsApp</p>
            <p className="text-xs text-surface-300">
              {waStatus?.ready ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
          {resetMutation.isPending ? 'Resetting...' : 'Reset Connection'}
        </button>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-surface-700/30">
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
