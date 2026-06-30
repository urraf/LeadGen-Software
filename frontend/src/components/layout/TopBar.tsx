import { useLocation } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/leads': 'Leads',
  '/messages': 'Messages',
  '/analytics': 'Analytics',
};

export default function TopBar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <header className="h-16 bg-surface-900/60 backdrop-blur-xl border-b border-surface-700/30 flex items-center justify-between px-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-surface-300 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors border border-surface-700/50"
          title="Refresh Data"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
        <div className="text-xs text-surface-300">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </header>
  );
}
