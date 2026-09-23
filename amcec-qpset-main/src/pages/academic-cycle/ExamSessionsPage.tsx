import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarRange,
  Plus,
  Sparkles,
  Layers,
  FileCheck2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Users,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAcademicCycle, ExamSession } from '@/contexts/AcademicCycleContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CycleCreationWizardModal } from '@/components/CycleCreationWizardModal';

interface SessionEvent {
  id: number;
  scheduledDate: string | null;
  status: string;
  course: {
    id: number;
    code: string;
    name: string;
    semester: string;
    department?: { name: string; code: string };
  };
  paperForms: Array<{
    id: number;
    formCode: string;
    status: string;
    versions: Array<{
      id: number;
      versionNumber: number;
      status: string;
      contentHash: string;
    }>;
  }>;
  _count?: {
    registrations: number;
    questionUsages: number;
  };
}

export const ExamSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    years,
    terms,
    sessions,
    selectedSession,
    setSelectedSession,
    updateSessionStatus,
    refreshCycles,
  } = useAcademicCycle();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    if (selectedSession) {
      setLoadingEvents(true);
      apiClient.get<{ success: boolean; data: { assessmentEvents: SessionEvent[] } }>(
        `/academic-cycles/sessions/${selectedSession.id}`
      )
        .then((res) => {
          setSessionEvents(res.data?.assessmentEvents || []);
        })
        .catch((err) => console.error('Failed to load session events:', err))
        .finally(() => setLoadingEvents(false));
    }
  }, [selectedSession]);

  const handleStatusChange = async (sessionId: number, newStatus: string) => {
    try {
      await updateSessionStatus(sessionId, newStatus);
    } catch (err: any) {
      alert(err.message || 'Failed to update session status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">PLANNING</Badge>;
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">ACTIVE</Badge>;
      case 'SCRUTINY':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">SCRUTINY</Badge>;
      case 'SEALED':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">VAULT SEALED</Badge>;
      case 'CONCLUDED':
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">CONCLUDED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Exam Sessions & Academic Cycles
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Autonomous multi-year cycle governance, exam sessions, candidate cohorts, and parallel paper generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/controller/historical-explorer')}
            className="text-xs gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            Multi-Year Explorer
          </Button>
          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Cycle Setup Wizard
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Academic Years
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{years.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Active: {years.find((y) => y.isCurrent)?.code || 'None'}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Exam Sessions
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{sessions.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {sessions.filter((s) => s.status === 'ACTIVE').length} in active status
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Active Session Courses
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {selectedSession?._count?.assessmentEvents ?? sessionEvents.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Across {new Set(sessionEvents.map((e) => e.course?.department?.code).filter(Boolean)).size || 1} Departments
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Parallel Paper Forms
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {sessionEvents.reduce((acc, e) => acc + (e.paperForms?.length || 0), 0)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Set A, Set B & Reserve sets</p>
        </div>
      </div>

      {/* Sessions Browser & Active Selector */}
      <div className="bg-card border rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Configured Exam Sessions
          </h2>
          <span className="text-xs text-muted-foreground">
            Select a session to inspect scheduled course events
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sessions.map((s) => {
            const isSelected = selectedSession?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                    : 'border-border bg-card/50 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground line-clamp-1">
                    {s.name}
                  </span>
                  {getStatusBadge(s.status)}
                </div>

                <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                  <p>Code: <code className="text-foreground">{s.code}</code></p>
                  <p>Term: {s.academicTerm?.name || 'N/A'}</p>
                  <p>Type: {s.assessmentType?.name || 'SEE'}</p>
                </div>

                <div className="mt-3 pt-2 border-t flex items-center justify-between text-[11px]">
                  <span className="font-medium text-muted-foreground">
                    {s._count?.assessmentEvents || 0} Scheduled Courses
                  </span>
                  {s.status === 'PLANNING' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(s.id, 'ACTIVE');
                      }}
                      className="text-emerald-500 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" /> Activate
                    </button>
                  )}
                  {s.status === 'ACTIVE' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(s.id, 'SCRUTINY');
                      }}
                      className="text-purple-500 font-semibold hover:underline flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Advance Scrutiny
                    </button>
                  )}
                  {s.status === 'SCRUTINY' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(s.id, 'SEALED');
                      }}
                      className="text-blue-500 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Lock className="h-3 w-3" /> Seal in Vault
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduled Assessment Events for Selected Session */}
      <div className="bg-card border rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Scheduled Courses & Parallel Sets: {selectedSession?.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Autonomous Assessment Events bound to this session. Click any event to enter its full operational workspace.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setWizardOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Courses to Session
          </Button>
        </div>

        {loadingEvents ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading assessment events...
          </div>
        ) : sessionEvents.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-lg bg-muted/10 space-y-3">
            <CalendarRange className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-foreground">No Courses Scheduled in this Session Yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use the Cycle Setup Wizard to batch-bind courses and generate parallel Set A/Set B paper forms.
              </p>
            </div>
            <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Launch Setup Wizard
            </Button>
          </div>
        ) : (
          <div className="border rounded-md divide-y overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/40 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4">Course & Department</div>
              <div className="col-span-3">Parallel Paper Forms</div>
              <div className="col-span-2">Candidates (USNs)</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Operational Action</div>
            </div>

            {sessionEvents.map((evt) => (
              <div
                key={evt.id}
                className="grid grid-cols-12 items-center px-4 py-3 text-xs hover:bg-muted/20 transition-colors"
              >
                <div className="col-span-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{evt.course?.code}</span>
                    {evt.course?.department && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        {evt.course.department.code}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">Sem {evt.course?.semester}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{evt.course?.name}</p>
                </div>

                <div className="col-span-3">
                  <div className="flex flex-wrap gap-1.5">
                    {evt.paperForms?.map((pf) => {
                      const latestVer = pf.versions?.[0];
                      return (
                        <div
                          key={pf.id}
                          className="px-2 py-1 rounded bg-muted/60 border text-[10px] font-mono flex items-center gap-1"
                        >
                          <span className="font-bold text-foreground">{pf.formCode}</span>
                          <span className="text-muted-foreground">v{latestVer?.versionNumber || 1}</span>
                          {latestVer?.status === 'SEALED' && (
                            <ShieldCheck className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground">
                      {evt._count?.registrations || 0}
                    </span>
                    <span>Registered</span>
                  </div>
                </div>

                <div className="col-span-1">
                  <Badge variant="outline" className="text-[10px]">
                    {evt.status}
                  </Badge>
                </div>

                <div className="col-span-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/controller/assessment-events/${evt.id}`)}
                    className="h-7 text-xs gap-1 hover:border-primary hover:text-primary"
                  >
                    Open Workspace
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cycle Creation Wizard Modal */}
      <CycleCreationWizardModal
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => {
          if (selectedSession) {
            apiClient.get<{ success: boolean; data: { assessmentEvents: SessionEvent[] } }>(
              `/academic-cycles/sessions/${selectedSession.id}`
            ).then((res) => setSessionEvents(res.data?.assessmentEvents || []));
          }
        }}
      />
    </div>
  );
};
