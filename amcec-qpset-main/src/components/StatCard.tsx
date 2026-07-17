import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
}

export const StatCard = ({ title, value, icon: Icon, color = 'text-accent' }: StatCardProps) => (
  <div className="bg-card rounded-xl border p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
    <div className={`p-2.5 rounded-xl bg-accent/10 ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-xl font-bold text-foreground font-serif">{value}</p>
    </div>
  </div>
);
