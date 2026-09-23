import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Layers, ShieldCheck, Sparkles, Clock } from 'lucide-react';
import { useAcademicCycle } from '@/contexts/AcademicCycleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const AcademicCycleBar: React.FC = () => {
  const { selectedYear, selectedTerm, selectedSession, sessions, setSelectedSession, loading } = useAcademicCycle();
  const navigate = useNavigate();

  if (loading && !selectedYear) {
    return null;
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PLANNING':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-semibold">PLANNING</Badge>;
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-semibold">ACTIVE</Badge>;
      case 'SCRUTINY':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] font-semibold">SCRUTINY</Badge>;
      case 'SEALED':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-semibold">VAULT SEALED</Badge>;
      case 'CONCLUDED':
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px] font-semibold">CONCLUDED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">INACTIVE</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-card/60 backdrop-blur-md border rounded-lg text-xs gap-3 shadow-xs">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 font-medium">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="text-foreground font-semibold">
            {selectedYear ? `AY ${selectedYear.code || (selectedYear as any).yearCode || '2025-26'}` : 'AY 2025-26'}
          </span>
          {selectedYear?.isCurrent && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary font-bold tracking-wider">
              CURRENT
            </span>
          )}
        </div>

        <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />

        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          <Layers className="h-3.5 w-3.5 text-sky-500" />
          <span>{selectedTerm?.name || (selectedTerm as any)?.displayName || 'Even Semester'}</span>
        </div>

        <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-muted-foreground">Session:</span>
          {sessions.length > 0 ? (
            <select
              value={selectedSession?.id || ''}
              onChange={(e) => {
                const s = sessions.find((x) => x.id === parseInt(e.target.value));
                if (s) setSelectedSession(s);
              }}
              className="bg-background/80 border rounded px-2 py-0.5 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          ) : (
            <span className="italic text-muted-foreground text-[11px]">No active session</span>
          )}
          {getStatusBadge(selectedSession?.status)}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/controller/exam-sessions')}
          className="h-7 text-[11px] px-2.5 font-medium gap-1 text-primary hover:text-primary hover:bg-primary/10"
        >
          <Sparkles className="h-3 w-3" />
          Exam Sessions Hub
        </Button>
      </div>
    </div>
  );
};
