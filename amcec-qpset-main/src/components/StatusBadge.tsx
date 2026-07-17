import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  description?: string | null;
  role?: 'hod' | 'controller' | 'qpsetter';
}

export const StatusBadge = ({ status, description, role }: StatusBadgeProps) => {
  let displayLabel = status;
  let styleClass = 'bg-muted text-muted-foreground';

  if (status === 'Pending' || status === 'Drafting') {
    displayLabel = 'Pending';
    styleClass = 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  } else if (status === 'Submitted') {
    if (role === 'hod') {
      displayLabel = 'Needs HOD Review';
    } else if (role === 'controller') {
      displayLabel = 'Needs HOD Review';
    } else {
      displayLabel = 'Submitted (Awaiting HOD)';
    }
    styleClass = 'bg-blue-500/15 text-blue-600 border-blue-500/30';
  } else if (status === 'Approved') {
    if (description === 'Finalized') {
      displayLabel = 'Finalized';
      styleClass = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    } else {
      displayLabel = 'Approved by HOD';
      styleClass = 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30';
    }
  } else if (status === 'Revision Required' || status === 'RevisionRequired') {
    displayLabel = 'Revision Required';
    styleClass = 'bg-rose-500/15 text-rose-600 border-rose-500/30';
  }

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors', styleClass)}>
      {displayLabel}
    </span>
  );
};
