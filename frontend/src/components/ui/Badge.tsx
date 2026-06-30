interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
}

const variantStyles = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  neutral: 'bg-surface-700/30 text-surface-300 border-surface-600/30',
  primary: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
};

export default function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={`badge border ${variantStyles[variant]}`}>
      {label}
    </span>
  );
}

// Helper to map status strings to badge variants
export function getStatusVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    STOPPED: 'danger',
    COMPLETED: 'info',
    NEW: 'neutral',
    QUALIFIED: 'primary',
    CONTACTED: 'info',
    MESSAGE_SENT: 'info',
    DELIVERED: 'success',
    READ: 'success',
    REPLIED: 'success',
    INTERESTED: 'success',
    NOT_INTERESTED: 'danger',
    MEETING_BOOKED: 'primary',
    PROPOSAL_SENT: 'primary',
    CONVERTED: 'success',
    LOST: 'danger',
    COLD: 'neutral',
    QUEUED: 'warning',
    SENT: 'info',
    FAILED: 'danger',
  };
  return map[status] || 'neutral';
}
