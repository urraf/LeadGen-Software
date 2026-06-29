import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  color?: 'brand' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';
}

const colorMap = {
  brand: 'from-brand-500/20 to-brand-500/5 text-brand-400 border-brand-500/20',
  emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
  amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
  rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20',
  violet: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20',
  cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
};

const iconBgMap = {
  brand: 'bg-brand-500/10 text-brand-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  rose: 'bg-rose-500/10 text-rose-400',
  violet: 'bg-violet-500/10 text-violet-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
};

export default function StatCard({ label, value, icon, trend, color = 'brand' }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02] ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-300">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <p className="text-xs mt-2 text-surface-300">{trend}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgMap[color]}`}>
          {icon}
        </div>
      </div>
      {/* Decorative gradient orb */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/[0.02] blur-2xl" />
    </div>
  );
}
