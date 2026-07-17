import { useState, useMemo } from 'react';
import { 
  FileText, Clock, CheckCircle, AlertTriangle, ArrowRight, Users, 
  Eye, MessageSquare, Download, Search, CheckCircle2, RefreshCw, 
  Activity, BookOpen, Layers, BarChart3, ChevronRight, ChevronDown, ChevronUp 
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { AssessmentBadge, getDueDateColor, getDueDateLabel } from '@/components/AssessmentBadge';
import { SuggestionBox } from '@/components/SuggestionBox';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { downloadPaperDocx } from '@/lib/downloadPaper';
import controllerPhoto from '@/assets/controller-photo.jpg';

import ReviewDrawer from '@/components/ReviewDrawer';

const DEPARTMENTS = [
  'CSE (AI & ML)',
  'CSE',
  'ISE',
  'ECE',
  'MECH',
  'CIVIL'
];

export default function ControllerDashboard() {
  const { assignments, addNotification, addSuggestion, allUsers, assessments, courses, updateAssignment } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [openSuggestion, setOpenSuggestion] = useState<number | null>(null);
  const [selectedDrawerAssignmentId, setSelectedDrawerAssignmentId] = useState<number | null>(null);
  const [collapsedCycles, setCollapsedCycles] = useState<Record<string, boolean>>({});

  const activeDrawerAssignment = useMemo(() => {
    return assignments.find(a => a.id === selectedDrawerAssignmentId) || null;
  }, [assignments, selectedDrawerAssignmentId]);

  const handleApprovePaper = async (id: number) => {
    try {
      await updateAssignment(id, { status: 'Approved', description: 'Finalized' });
      toast({ title: 'Paper Approved!', description: 'The question paper has been signed off and locked by the Controller.' });
    } catch (err: any) {
      toast({ title: 'Approval Failed', description: err.message || 'Could not approve paper.', variant: 'destructive' });
    }
  };

  const handleRequestRevision = async (id: number, comment: string) => {
    try {
      await updateAssignment(id, { status: 'Revision Required', revisionComment: comment });
      addSuggestion(id, 1, `[Controller Revision Requested]: ${comment}`);
      
      const targetSetterId = assignments.find(x => x.id === id)?.facultyId;
      if (targetSetterId) {
        addNotification({
          userId: targetSetterId,
          message: `Controller requested revision on paper: ${comment}`,
          date: new Date().toISOString().split('T')[0],
          read: false,
          type: 'warning',
          assignmentId: id,
          kind: 'suggestion',
          fromUserId: 1, // Controller
        });
      }
      toast({ title: 'Revision Request Sent', description: 'Feedback has been sent to the QP Setter.' });
    } catch (err: any) {
      toast({ title: 'Failed to request revision', description: err.message || 'Could not request revision.', variant: 'destructive' });
    }
  };

  const handlePostDrawerComment = async (id: number, msg: string) => {
    try {
      addSuggestion(id, 1, msg);
      const targetSetterId = assignments.find(x => x.id === id)?.facultyId;
      if (targetSetterId) {
        addNotification({
          userId: targetSetterId,
          message: msg,
          date: new Date().toISOString().split('T')[0],
          read: false,
          type: 'info',
          assignmentId: id,
          kind: 'suggestion',
          fromUserId: 1, // Controller
        });
      }
      toast({ title: 'Comment Posted', description: 'Your suggestion was logged in the paper timeline.' });
    } catch (err: any) {
      toast({ title: 'Failed to post comment', description: err.message || 'Could not post suggestion.', variant: 'destructive' });
    }
  };

  const stats = useMemo(() => {
    const total = assignments.length;
    const pending = assignments.filter(a => a.status === 'Pending').length;
    const approved = assignments.filter(a => a.status === 'Approved').length;
    const revision = assignments.filter(a => a.status === 'Revision Required').length;
    const submitted = assignments.filter(a => a.status === 'Submitted').length;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, pending, approved, revision, submitted, rate };
  }, [assignments]);

  const handlePost = (assignmentId: number, facultyId: number, facultyName: string, msg: string) => {
    addSuggestion(assignmentId, 1, msg);
    addNotification({
      userId: facultyId,
      message: msg,
      date: new Date().toISOString().split('T')[0],
      read: false,
      type: 'warning',
      assignmentId,
      kind: 'suggestion',
      fromUserId: 1,
    });
    toast({ title: 'Suggestion sent', description: `Suggestion sent to ${facultyName} for ${assignmentId}` });
    setOpenSuggestion(null);
  };

  // 1. Department-wise Performance stats
  const deptProgress = useMemo(() => {
    return DEPARTMENTS.map(dept => {
      const deptAssignments = assignments.filter(a => {
        const hod = allUsers.find(u => u.id === a.hodId);
        return hod?.dept === dept;
      });
      const total = deptAssignments.length;
      const approved = deptAssignments.filter(a => a.status === 'Approved').length;
      const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
      return { dept, total, approved, progress };
    });
  }, [assignments, allUsers]);

  // 2. Active Assessment Cycle progress
  const cycleProgress = useMemo(() => {
    return assessments.map(a => {
      const cycleAssignments = assignments.filter(asg => asg.assessmentId === a.id);
      const total = cycleAssignments.length;
      const approved = cycleAssignments.filter(asg => asg.status === 'Approved').length;
      const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
      return {
        ...a,
        total,
        approved,
        progress
      };
    }).slice(0, 3); // Top 3 active cycles
  }, [assessments, assignments]);

  // 3. Simulated Live Feed based on current assignment updates
  const recentActivities = useMemo(() => {
    const list: { id: string; user: string; text: string; time: string; type: 'success' | 'info' | 'warning' | 'error' }[] = [];
    assignments.forEach((a, idx) => {
      const setter = allUsers.find(u => u.id === a.facultyId);
      const courseCode = a.course?.courseCode || 'Course';
      if (a.status === 'Approved') {
        list.push({
          id: `act-app-${idx}`,
          user: 'Dr. Nandishwar',
          text: `Approved question paper for ${courseCode}`,
          time: '2 hours ago',
          type: 'success'
        });
      } else if (a.status === 'Submitted') {
        list.push({
          id: `act-sub-${idx}`,
          user: setter?.name || 'Faculty Member',
          text: `Submitted question paper for review of ${courseCode}`,
          time: '4 hours ago',
          type: 'info'
        });
      } else if (a.status === 'Revision Required') {
        list.push({
          id: `act-rev-${idx}`,
          user: 'Dr. Nandishwar',
          text: `Requested revision for ${courseCode}`,
          time: '1 day ago',
          type: 'warning'
        });
      } else {
        list.push({
          id: `act-pen-${idx}`,
          user: 'System Core',
          text: `Drafted paper assignment for ${courseCode} (${setter?.name || 'Pending'})`,
          time: '2 days ago',
          type: 'info'
        });
      }
    });
    return list.slice(0, 5); // top 5
  }, [assignments, allUsers]);

  // 4. Search and filter logic
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const setter = allUsers.find(u => u.id === a.facultyId);
      const matchQuery = 
        a.assessmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.course?.courseName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.course?.courseCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (setter?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === 'ALL') return matchQuery;
      return matchQuery && a.status === statusFilter;
    });
  }, [assignments, allUsers, searchQuery, statusFilter]);

  const groupedByAssessment = useMemo(() => {
    const groups: Record<string, typeof filteredAssignments> = {};
    filteredAssignments.forEach(a => {
      const code = a.assessmentCode || 'General';
      if (!groups[code]) groups[code] = [];
      groups[code].push(a);
    });
    return groups;
  }, [filteredAssignments]);

  const toggleCycle = (code: string) => {
    setCollapsedCycles(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Executive Welcome Banner with dynamic statistics */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl border border-white/5">
        <div className="absolute right-0 top-0 h-48 w-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="relative">
              <img 
                src={controllerPhoto} 
                alt="Dr. Nandishwar" 
                className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-2 border-accent/80 shadow-md" 
              />
              <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-indigo-200 text-xs md:text-sm font-semibold tracking-wide uppercase">University Dashboard</p>
              <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">Dr. Nandishwar</h1>
              <p className="text-white/60 text-xs md:text-sm font-medium mt-0.5">Controller of Examinations • AMC Engineering College</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-xl px-5 py-4 w-full md:w-auto backdrop-blur-sm">
            <div className="text-left">
              <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Total Progress</p>
              <p className="text-3xl font-extrabold text-accent mt-0.5">{stats.rate}%</p>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="flex-1 md:flex-none">
              <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Approved vs Total</p>
              <p className="text-sm font-semibold text-white mt-1">
                <span className="text-emerald-400 font-bold">{stats.approved}</span> / {stats.total} Papers
              </p>
              <div className="w-28 bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-accent h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.rate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Cycles', val: assessments.length, sub: 'Active Schemes', icon: Layers, border: 'border-l-indigo-500' },
          { label: 'Assigned Papers', val: stats.total, sub: 'Sent to HODs', icon: FileText, border: 'border-l-blue-500' },
          { label: 'Under Review', val: stats.pending + stats.submitted, sub: 'Needs action', icon: Clock, color: 'text-warning', border: 'border-l-warning' },
          { label: 'Approved Papers', val: stats.approved, sub: 'Completed', icon: CheckCircle2, color: 'text-success', border: 'border-l-success' },
          { label: 'Revisions', val: stats.revision, sub: 'Feedback sent', icon: AlertTriangle, color: 'text-destructive', border: 'border-l-destructive' }
        ].map((k, i) => (
          <div key={i} className={`bg-card border border-border/80 border-l-4 ${k.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}>
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color || 'text-primary'}`} />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground tracking-tight">{k.val}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Executive Insights & Cycle Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Assessment Cycles Tracker */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Active Assessment Cycles Tracker
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate('/controller/create-assessment')}>
              Manage Cycles <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cycleProgress.length === 0 ? (
              <p className="col-span-3 text-sm text-muted-foreground italic text-center py-4">No active cycles defined. Create one in the sidebar.</p>
            ) : (
              cycleProgress.map(c => (
                <div key={c.id} className="border rounded-xl p-3 bg-secondary/5 flex flex-col justify-between hover:bg-secondary/10 transition-colors">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{c.examType}</span>
                    <h3 className="font-bold text-sm text-foreground mt-1 tracking-tight">{c.assessmentCode}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Semester {c.semester} • {c.schemeYear}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-muted-foreground">Papers: {c.approved}/{c.total}</span>
                      <span className="text-primary">{c.progress}%</span>
                    </div>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${c.progress === 100 ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Commands & Navigation */}
        <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="border-b pb-3">
            <h2 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" /> Controller Commands
            </h2>
          </div>
          <div className="space-y-3 py-3">
            <Button className="w-full justify-between bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={() => navigate('/controller/create-assessment')}>
              <span>Create Assessment Cycle</span>
              <Layers className="h-4 w-4 opacity-80" />
            </Button>
            <Button variant="outline" className="w-full justify-between hover:bg-accent/10" onClick={() => navigate('/controller/assign')}>
              <span>Assign HOD Paper Target</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between hover:bg-accent/10" onClick={() => navigate('/controller/review')}>
              <span>Review & Approve Papers</span>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center italic mt-2 border-t pt-2">AMCEC QPSet System v1.0 • Live Session Scoped</p>
        </div>
      </div>

      {/* Department Progress & Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department-wise progress */}
        <div className="bg-card border rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Department Setting Performance
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deptProgress.map(d => (
              <div key={d.dept} className="border rounded-xl p-3 space-y-2 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">{d.dept} Department</span>
                  <span className="text-xs font-semibold text-muted-foreground">{d.approved}/{d.total} Approved</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${d.progress === 100 ? 'bg-success' : d.progress > 40 ? 'bg-primary' : 'bg-warning'}`}
                      style={{ width: `${d.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progress: {d.progress}%</span>
                    {d.total > 0 && d.approved === d.total && <span className="text-success font-bold">Done</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Activity Logs Feed */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Live Academic Audit Feed
            </h2>
          </div>
          
          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[220px] pr-1 py-1">
            {recentActivities.map(act => (
              <div key={act.id} className="flex gap-3 text-xs leading-relaxed">
                <div className="mt-0.5">
                  <div className={`h-2 w-2 rounded-full ${
                    act.type === 'success' ? 'bg-success' :
                    act.type === 'warning' ? 'bg-warning' : 'bg-primary'
                  }`} />
                </div>
                <div>
                  <p className="font-bold text-foreground">{act.user}</p>
                  <p className="text-muted-foreground text-[11px]">{act.text}</p>
                  <span className="text-[10px] text-muted-foreground/60">{act.time}</span>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-4">No recent academic activities logged.</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full text-xs text-primary mt-2 border-t pt-2 hover:bg-secondary/20" onClick={() => navigate('/controller/reports')}>
            View Full Audit logs
          </Button>
        </div>
      </div>
    </div>
  );
}
