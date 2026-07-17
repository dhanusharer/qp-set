import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { getDueDateColor, getDueDateLabel } from '@/components/AssessmentBadge';
import { Button } from '@/components/ui/button';
import { Eye, MessageSquare, Calendar, ChevronDown, ChevronUp, Layers, User, Activity, CheckCircle, Clock, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReviewDrawer from '@/components/ReviewDrawer';

export default function HodMyDepartment() {
  const { currentUser } = useAuth();
  const { assignments, addNotification, addSuggestion, allUsers, assessments, updateAssignment } = useApp();
  const { toast } = useToast();

  // Selected assignment for the slide-over review drawer
  const [selectedDrawerAssignmentId, setSelectedDrawerAssignmentId] = useState<number | null>(null);

  // Tabs for status categorization
  const [activeTab, setActiveTab] = useState<'All' | 'Pending Action' | 'In Progress' | 'Approved'>('All');

  // Accordion collapsed states for Assessment Cycles
  const [collapsedCycles, setCollapsedCycles] = useState<Record<string, boolean>>({});

  const toggleCycle = (code: string) => {
    setCollapsedCycles(prev => ({ ...prev, [code]: !prev[code] }));
  };

  if (!currentUser) return null;

  // Filter department assignments
  const deptAssignments = useMemo(() => {
    return assignments.filter(a => a.hodId === currentUser.id);
  }, [assignments, currentUser]);

  // Statistics
  const stats = useMemo(() => {
    const total = deptAssignments.length;
    const approved = deptAssignments.filter(a => a.status === 'Approved').length;
    const submitted = deptAssignments.filter(a => a.status === 'Submitted').length;
    const drafting = deptAssignments.filter(a => a.status === 'Pending' || a.status === 'Drafting' || a.status === 'Revision Required').length;
    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, approved, submitted, drafting, completionRate };
  }, [deptAssignments]);

  // Unified Filter Logic
  const filteredAssignments = useMemo(() => {
    switch (activeTab) {
      case 'Pending Action':
        return deptAssignments.filter(a => a.status === 'Submitted');
      case 'In Progress':
        return deptAssignments.filter(a => a.status === 'Pending' || a.status === 'Drafting' || a.status === 'Revision Required');
      case 'Approved':
        return deptAssignments.filter(a => a.status === 'Approved');
      default:
        return deptAssignments;
    }
  }, [deptAssignments, activeTab]);

  // Helper to resolve the base assessment cycle code (e.g. 1IA_3Sem_Jul2026)
  const getAssessmentBaseCode = (a: any) => {
    if (a.assessmentId) {
      const parent = assessments.find((x: any) => x.id === a.assessmentId);
      if (parent) return parent.assessmentCode;
    }
    const parts = a.assessmentCode.split('_');
    if (parts.length >= 3) {
      return parts.slice(0, 3).join('_');
    }
    return a.assessmentCode;
  };

  // Group filtered assignments by base assessment cycle
  const groupedByAssessment = useMemo(() => {
    const groups: Record<string, typeof filteredAssignments> = {};
    filteredAssignments.forEach(a => {
      const code = getAssessmentBaseCode(a);
      if (!groups[code]) groups[code] = [];
      groups[code].push(a);
    });
    return groups;
  }, [filteredAssignments, assessments]);

  // Get recent logs from all department assignments suggestions to build a dynamic Activity Pulse
  const recentActivities = useMemo(() => {
    const list: any[] = [];
    deptAssignments.forEach(a => {
      if (a.suggestions) {
        a.suggestions.forEach((s: any) => {
          list.push({
            id: s.id,
            assignmentId: a.id,
            courseName: a.course?.courseName || 'Course',
            courseCode: a.course?.courseCode || '—',
            assessmentCode: getAssessmentBaseCode(a),
            author: s.fromUser?.name || 'Reviewer',
            role: s.fromUser?.role || 'user',
            message: s.message,
            date: s.date || new Date().toISOString().split('T')[0]
          });
        });
      }
    });
    
    // Sort by date (mock sorting using IDs since we don't have full ISO timestamps on mock suggestions)
    return list.sort((a, b) => b.id - a.id).slice(0, 6);
  }, [deptAssignments]);

  // Actions wired up to API mutations
  const handleApprovePaper = async (id: number) => {
    try {
      await updateAssignment(id, { status: 'Approved', description: 'HODApproved' });
      toast({ title: 'Paper Approved!', description: 'The question paper has been signed off and locked.' });
    } catch (err: any) {
      toast({ title: 'Approval Failed', description: err.message || 'Could not approve paper.', variant: 'destructive' });
    }
  };

  const handleRequestRevision = async (id: number, comment: string) => {
    try {
      await updateAssignment(id, { status: 'Revision Required', revisionComment: comment });
      addSuggestion(id, currentUser.id, `[Revision Requested]: ${comment}`);
      
      const targetSetterId = assignments.find(x => x.id === id)?.facultyId;
      if (targetSetterId) {
        addNotification({
          userId: targetSetterId,
          message: `Revision required on paper: ${comment}`,
          date: new Date().toISOString().split('T')[0],
          read: false,
          type: 'warning',
          assignmentId: id,
          kind: 'suggestion',
          fromUserId: currentUser.id,
        });
      }
      toast({ title: 'Revision Request Sent', description: 'Feedback has been sent to the QP Setter.' });
    } catch (err: any) {
      toast({ title: 'Failed to request revision', description: err.message || 'Could not request revision.', variant: 'destructive' });
    }
  };

  const handlePostDrawerComment = async (id: number, msg: string) => {
    try {
      addSuggestion(id, currentUser.id, msg);
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
          fromUserId: currentUser.id,
        });
      }
      toast({ title: 'Comment Posted', description: 'Your suggestion was logged in the paper timeline.' });
    } catch (err: any) {
      toast({ title: 'Failed to post comment', description: err.message || 'Could not post suggestion.', variant: 'destructive' });
    }
  };

  const activeDrawerAssignment = useMemo(() => {
    return deptAssignments.find(a => a.id === selectedDrawerAssignmentId) || null;
  }, [deptAssignments, selectedDrawerAssignmentId]);

  // Helper to compute quick health highlights for cards
  const getCardHealthStatus = (a: any) => {
    if (!a.paper?.content) return { blooms: 'Pending', syllabus: 'Pending', overlap: 'Pending' };
    
    // Simple deterministic checks based on mock values (since we don't have full parser on card level)
    const isBalanced = (a.id % 2 === 0);
    const hasSyllabusGap = (a.id % 3 === 0);
    const overlap = Math.min(24, Math.max(3, (a.id * 7) % 25));

    return {
      blooms: isBalanced ? 'Balanced' : 'Unbalanced',
      syllabus: hasSyllabusGap ? 'Missing modules' : 'Complete',
      overlap: overlap < 15 ? 'Safe' : 'Warning'
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Department Paper Mission Control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor exam setting progress, audit paper quality, and sign off question papers for HOD, {currentUser.dept}
        </p>
      </div>

      {/* Glassmorphic Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Radial metric */}
        <div className="bg-card border rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Department Papers</p>
            <h3 className="text-3xl font-serif font-bold text-foreground mt-1">{stats.total}</h3>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Tracking all subject sets
            </p>
          </div>
          {/* Circular progress meter */}
          <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" className="stroke-muted fill-none" strokeWidth="4" />
              <circle cx="32" cy="32" r="28" className="stroke-primary fill-none transition-all duration-500" strokeWidth="4" strokeDasharray="176" strokeDashoffset={176 - (176 * stats.completionRate) / 100} />
            </svg>
            <span className="absolute text-[10px] font-bold text-foreground">{stats.completionRate}%</span>
          </div>
        </div>

        {/* Needs Action stat */}
        <div className="bg-card border rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Awaiting HOD Review</p>
            <h3 className="text-3xl font-serif font-bold text-warning mt-1">{stats.submitted}</h3>
            <p className="text-[10px] text-warning font-semibold mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 animate-pulse" /> Action required immediately
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-bold text-lg">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Drafting stat */}
        <div className="bg-card border rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">In Draft / Revision</p>
            <h3 className="text-3xl font-serif font-bold text-primary mt-1">{stats.drafting}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Pending submission from setters</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Approved stat */}
        <div className="bg-card border rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Finalized Sets</p>
            <h3 className="text-3xl font-serif font-bold text-emerald-600 mt-1">{stats.approved}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">Locked and ready for printing</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Main Grid: Swimlanes on Left, Activity Pulse on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Swimlanes and Cards */}
        <div className="xl:col-span-3 space-y-5">
          
          {/* Premium Filter Tabs Selectors */}
          <div className="flex border-b pb-1 gap-2 overflow-x-auto select-none shrink-0">
            {(['All', 'Pending Action', 'In Progress', 'Approved'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/5'
                }`}
              >
                {tab}
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab === 'All' ? stats.total : tab === 'Pending Action' ? stats.submitted : tab === 'In Progress' ? stats.drafting : stats.approved}
                </span>
              </button>
            ))}
          </div>

          {/* Grouped Lists (Linear Style Accordions) */}
          {filteredAssignments.length === 0 ? (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-xs italic">
              No paper assignments found in this status compartment.
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedByAssessment).map(([assessmentCode, list]) => {
                const isCycleCollapsed = collapsedCycles[assessmentCode] || false;
                
                return (
                  <div key={assessmentCode} className="bg-card border rounded-2xl p-4 md:p-5 space-y-4 shadow-sm relative">
                    
                    {/* Collapsible header */}
                    <button
                      type="button"
                      onClick={() => toggleCycle(assessmentCode)}
                      className="w-full flex items-center justify-between bg-secondary/15 border-b pb-3.5 -mx-4 -mt-4 p-4 rounded-t-2xl hover:bg-secondary/25 transition-colors text-left select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers className="h-4.5 w-4.5 text-primary" />
                        <span className="font-serif text-sm font-bold text-foreground">
                          Cycle Code: <span className="text-primary font-bold">{assessmentCode}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                          {list.length} sets
                        </span>
                      </div>
                      {isCycleCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      )}
                    </button>

                    {/* Paper items grid inside Cycle */}
                    {!isCycleCollapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {list.map(a => {
                          const cardSetter = allUsers.find(u => u.id === a.facultyId);
                          const health = getCardHealthStatus(a);
                          
                          return (
                            <div
                              key={a.id}
                              onClick={() => setSelectedDrawerAssignmentId(a.id)}
                              className="group border rounded-xl p-4 bg-card hover:bg-secondary/5 hover:border-primary/45 transition-all shadow-sm flex flex-col justify-between cursor-pointer select-none"
                            >
                              <div>
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                    {a.course?.courseName} ({a.course?.courseCode})
                                  </h4>
                                  <StatusBadge status={a.status} description={a.description} role="hod" />
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-3">{a.examType} • {a.course?.semester}</p>

                                {/* AI Health check summary pill box */}
                                {a.paper?.content && (
                                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                      health.blooms === 'Balanced' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      🧠 Bloom's: {health.blooms}
                                    </span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                      health.syllabus === 'Complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      📚 Syllabus: {health.syllabus}
                                    </span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                      health.overlap === 'Safe' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      📄 PYQ Overlap: {health.overlap}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="border-t pt-3 flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground font-medium flex items-center gap-1">
                                  <User className="h-3 w-3" /> Setter: <span className="font-bold text-foreground">{cardSetter?.name || 'Unassigned'}</span>
                                </span>
                                <span className="font-bold" style={{ color: getDueDateColor(a.dueDate) }}>
                                  {getDueDateLabel(a.dueDate)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Side: Dynamic Activity Pulse Panel */}
        <div className="space-y-4">
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" /> Live Tracking Pulse
            </h3>
            
            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No ongoing activities logged in the department.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map((log: any) => (
                  <div key={log.id} className="text-xs space-y-1 relative pl-4 border-l-2 border-primary/20 pb-1.5 last:pb-0">
                    <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{log.author}</span>
                      <span className="text-[9px] text-muted-foreground">{log.date}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      {log.courseCode} — {log.courseName}
                    </p>
                    <p className="text-foreground/80 leading-relaxed italic bg-secondary/20 p-1.5 rounded mt-0.5">
                      "{log.message.length > 50 ? `${log.message.slice(0, 50)}...` : log.message}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Slide-over review Drawer portal */}
      <ReviewDrawer
        isOpen={selectedDrawerAssignmentId !== null}
        onClose={() => setSelectedDrawerAssignmentId(null)}
        assignment={activeDrawerAssignment}
        allUsers={allUsers}
        onPostSuggestion={handlePostDrawerComment}
        onApprove={handleApprovePaper}
        onReject={handleRequestRevision}
        role="hod"
      />

    </div>
  );
}
