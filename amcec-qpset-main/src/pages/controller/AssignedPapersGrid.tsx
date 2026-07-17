import { useState, useMemo } from 'react';
import { 
  Eye, MessageSquare, Download, Search, CheckCircle2, 
  Layers, ChevronDown, ChevronUp, Landmark
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { getDueDateColor, getDueDateLabel } from '@/components/AssessmentBadge';
import { SuggestionBox } from '@/components/SuggestionBox';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { downloadPaperDocx } from '@/lib/downloadPaper';
import ReviewDrawer from '@/components/ReviewDrawer';

export default function AssignedPapersGrid() {
  const { assignments, addNotification, addSuggestion, allUsers, assessments, updateAssignment } = useApp();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [openSuggestion, setOpenSuggestion] = useState<number | null>(null);
  const [selectedDrawerAssignmentId, setSelectedDrawerAssignmentId] = useState<number | null>(null);
  const [collapsedCycles, setCollapsedCycles] = useState<Record<string, boolean>>({});
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

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
          fromUserId: 1,
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
          fromUserId: 1,
        });
      }
      toast({ title: 'Comment Posted', description: 'Your suggestion was logged in the paper timeline.' });
    } catch (err: any) {
      toast({ title: 'Failed to post comment', description: err.message || 'Could not post suggestion.', variant: 'destructive' });
    }
  };

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

  // Helper to get short department code
  const getDeptCode = (dept: string) => {
    if (dept.includes('AI & ML') || dept.includes('AIML')) return 'AIML';
    if (dept.includes('CSE')) return 'CSE';
    if (dept.includes('ISE')) return 'ISE';
    if (dept.includes('ECE')) return 'ECE';
    if (dept.includes('MECH')) return 'MECH';
    if (dept.includes('CIVIL')) return 'CIVIL';
    return dept.substring(0, 3).toUpperCase();
  };

  // Helper to extract/resolve the base cycle code (e.g. 1IA_4Sem_2021_Jul2026)
  const getAssessmentBaseCode = (a: any) => {
    if (a.assessmentId) {
      const parent = assessments.find((x: any) => x.id === a.assessmentId);
      if (parent) return parent.assessmentCode;
    }
    const parts = a.assessmentCode.split('_');
    // If it's the new format (e.g. 1IA_4Sem_2021_Jul2026_CSE_BCS301), parts length is 6.
    // The first 4 parts correspond to: 1IA (0), 4Sem (1), 2021 (2), Jul2026 (3)
    if (parts.length >= 4) {
      // Check if parts[2] is a year or looks like scheme. If parts has 6 items, it is the new format.
      if (parts.length === 6) {
        return parts.slice(0, 4).join('_');
      }
    }
    // Fallback split for older format (e.g. 3IA_6Sem_Jul2026_BCS602)
    if (parts.length >= 3) {
      return parts.slice(0, 3).join('_');
    }
    return a.assessmentCode;
  };

  // 1. Search and filter logic
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

  // 2. Group by Base Assessment ID (main cycle code)
  const groupedByAssessment = useMemo(() => {
    const groups: Record<string, typeof filteredAssignments> = {};
    filteredAssignments.forEach(a => {
      const baseCode = getAssessmentBaseCode(a);
      if (!groups[baseCode]) groups[baseCode] = [];
      groups[baseCode].push(a);
    });
    return groups;
  }, [filteredAssignments, assessments]);

  const toggleCycle = (code: string) => {
    setCollapsedCycles(prev => ({ ...prev, [code]: prev[code] === undefined ? false : !prev[code] }));
  };

  const toggleDept = (deptKey: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptKey]: prev[deptKey] === undefined ? false : !prev[deptKey] }));
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Assigned Question Papers Grid</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor exam cycles, track department allocations, and audit setting progress.
        </p>
      </div>

      {/* Main interactive data grid */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/10">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Question Paper Allocations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Filter, review, and export assigned question papers</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search code, course, faculty..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2 border-b bg-muted/5 flex items-center gap-1 overflow-x-auto">
          {[
            { label: 'All Assignments', status: 'ALL' },
            { label: 'Pending Review', status: 'Pending' },
            { label: 'Submitted', status: 'Submitted' },
            { label: 'Approved', status: 'Approved' },
            { label: 'Revisions', status: 'Revision Required' }
          ].map(tab => (
            <button
              key={tab.status}
              onClick={() => setStatusFilter(tab.status)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.status 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-secondary/15 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-4">
          {Object.entries(groupedByAssessment).map(([baseAssessmentCode, list]) => {
            const isCollapsed = collapsedCycles[baseAssessmentCode] !== false;

            // Group assignments under this base assessment code by department
            const deptsMap: Record<string, typeof list> = {};
            list.forEach(a => {
              const setter = allUsers.find(u => u.id === a.facultyId);
              const hod = allUsers.find(u => u.id === a.hodId);
              const deptName = setter?.dept || hod?.dept || 'General / Unspecified';
              if (!deptsMap[deptName]) deptsMap[deptName] = [];
              deptsMap[deptName].push(a);
            });

            return (
              <div key={baseAssessmentCode} className="border rounded-xl overflow-hidden shadow-sm bg-card">
                {/* Level 1: Assessment ID (Bold) */}
                <button
                  type="button"
                  onClick={() => toggleCycle(baseAssessmentCode)}
                  className="w-full flex items-center justify-between bg-muted/20 border-b p-4 hover:bg-muted/30 transition-colors text-left select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4.5 w-4.5 text-primary" />
                    <span className="font-serif text-sm font-bold text-foreground">
                      Assessment ID: <span className="font-extrabold text-foreground">{baseAssessmentCode}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {Object.keys(deptsMap).length} departments
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-primary" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="p-4 space-y-4 bg-muted/5">
                    {Object.entries(deptsMap).map(([deptName, deptList]) => {
                      const deptKey = `${baseAssessmentCode}-${deptName}`;
                      const isDeptCollapsed = collapsedDepts[deptKey] !== false;

                      return (
                        <div key={deptName} className="border rounded-xl bg-card overflow-hidden">
                          {/* Level 2: Department (Clickable sub-header) */}
                          <button
                            type="button"
                            onClick={() => toggleDept(deptKey)}
                            className="w-full flex items-center justify-between bg-secondary/10 border-b px-4 py-3 hover:bg-secondary/15 transition-colors text-left select-none"
                          >
                            <div className="flex items-center gap-2">
                              <Landmark className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-bold text-foreground">{deptName} Department</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                                {deptList.length} papers
                              </span>
                            </div>
                            {isDeptCollapsed ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>

                          {/* Level 3: Table of papers under this department */}
                          {!isDeptCollapsed && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm min-w-[800px]">
                                <thead>
                                  <tr className="border-b bg-muted/10 text-xs font-semibold text-muted-foreground uppercase text-left">
                                    <th className="p-3">Paper Code (Generated ID)</th>
                                    <th className="p-3">QP Setter</th>
                                    <th className="p-3">Course / Subject</th>
                                    <th className="p-3">Due Date</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {deptList.map(a => {
                                    const setter = allUsers.find(u => u.id === a.facultyId);
                                    const deptCode = getDeptCode(deptName);
                                    const dueColor = getDueDateColor(a.dueDate);
                                    
                                    // Construct/show the full code format: [BaseCode]_[Dept]_[CourseCode]
                                    const fullCode = a.assessmentCode.includes(deptCode) 
                                      ? a.assessmentCode 
                                      : `${baseAssessmentCode}_${deptCode}_${a.course?.courseCode || ''}`;

                                    return (
                                      <tr key={a.id} className="border-b hover:bg-muted/5 transition-colors relative">
                                        <td className="p-3 text-xs font-mono font-bold text-primary">
                                          {fullCode}
                                        </td>
                                        <td className="p-3 text-xs font-medium text-foreground">
                                          {setter?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                                        </td>
                                        <td className="p-3 text-xs">
                                          <p className="font-semibold text-foreground">{a.course?.courseName}</p>
                                          <p className="text-[10px] text-muted-foreground font-medium">Credits: {a.course?.credits || 3}</p>
                                        </td>
                                        <td className="p-3 text-xs">
                                          <span style={{ color: dueColor, fontWeight: 700 }}>{getDueDateLabel(a.dueDate)}</span>
                                          <p className="text-[10px] text-muted-foreground">{a.dueDate}</p>
                                        </td>
                                        <td className="p-3 text-center">
                                          <StatusBadge status={a.status} description={a.description} role="controller" />
                                        </td>
                                        <td className="p-3">
                                          <div className="flex items-center justify-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary" title="Preview Paper" onClick={() => setSelectedDrawerAssignmentId(a.id)}>
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-warning" title="Post Review Comment" onClick={() => setOpenSuggestion(openSuggestion === a.id ? null : a.id)}>
                                              <MessageSquare className="h-4 w-4 text-accent" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-success" title="Download Word Format" onClick={() => downloadPaperDocx(a, setter?.name || 'Unassigned')}>
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          {openSuggestion === a.id && setter && (
                                            <div className="absolute right-4 mt-2 z-50 bg-card border rounded-xl p-4 shadow-xl max-w-sm" onClick={e => e.stopPropagation()}>
                                              <SuggestionBox
                                                onSend={msg => handlePost(a.id, setter.id, setter.name, msg)}
                                                onCancel={() => setOpenSuggestion(null)}
                                                placeholder="Provide revision suggestions..."
                                              />
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {filteredAssignments.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm italic bg-card border rounded-xl">
              No assignments found matching the active filters.
            </div>
          )}
        </div>
      </div>

      <ReviewDrawer
        isOpen={selectedDrawerAssignmentId !== null}
        onClose={() => setSelectedDrawerAssignmentId(null)}
        assignment={activeDrawerAssignment}
        allUsers={allUsers}
        onPostSuggestion={handlePostDrawerComment}
        onApprove={handleApprovePaper}
        onReject={handleRequestRevision}
        role="controller"
      />
    </div>
  );
}
