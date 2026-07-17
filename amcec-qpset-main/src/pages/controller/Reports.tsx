import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Download, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Reports() {
  const { assignments, allUsers } = useApp();
  const [collapsedCycles, setCollapsedCycles] = useState<Record<string, boolean>>({});

  const groupedByAssessment = useMemo(() => {
    const groups: Record<string, typeof assignments> = {};
    assignments.forEach(a => {
      const code = a.assessmentCode || 'General';
      if (!groups[code]) groups[code] = [];
      groups[code].push(a);
    });
    return groups;
  }, [assignments]);

  const toggleCycle = (code: string) => {
    setCollapsedCycles(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const completionRate = assignments.length > 0
    ? Math.round((assignments.filter(a => a.status === 'Approved').length / assignments.length) * 100)
    : 0;

  const statusCounts = {
    pending: assignments.filter(a => a.status === 'Pending').length,
    submitted: assignments.filter(a => a.status === 'Submitted').length,
    approved: assignments.filter(a => a.status === 'Approved').length,
    revision: assignments.filter(a => a.status === 'Revision Required').length,
  };

  const hods = allUsers.filter(u => u.role === 'hod');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of paper management activity</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-foreground font-serif">{assignments.length}</p>
          <p className="text-xs text-muted-foreground">Total Papers</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-success font-serif">{completionRate}%</p>
          <p className="text-xs text-muted-foreground">Completion Rate</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-accent font-serif">{hods.length}</p>
          <p className="text-xs text-muted-foreground">Active HODs</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary font-serif">{allUsers.filter(u => u.role === 'qpsetter').length}</p>
          <p className="text-xs text-muted-foreground">QP Setters</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-serif text-base font-semibold mb-4 text-foreground">Status Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Pending', count: statusCounts.pending, color: 'bg-warning', total: assignments.length },
            { label: 'Submitted', count: statusCounts.submitted, color: 'bg-accent', total: assignments.length },
            { label: 'Approved', count: statusCounts.approved, color: 'bg-success', total: assignments.length },
            { label: 'Revision Required', count: statusCounts.revision, color: 'bg-destructive', total: assignments.length },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.count} ({item.total > 0 ? Math.round((item.count / item.total) * 100) : 0}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-serif text-base font-semibold mb-4 text-foreground">Papers by Department (HOD)</h3>
        <div className="space-y-3">
          {hods.map(h => {
            const count = assignments.filter(a => a.hodId === h.id).length;
            const setterCount = allUsers.filter(u => u.role === 'qpsetter' && u.hodId === h.id).length;
            return (
              <div key={h.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {h.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.dept} • {setterCount} setters</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">{count} papers</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedByAssessment).map(([assessmentCode, list]) => {
          const isCollapsed = collapsedCycles[assessmentCode] || false;
          return (
            <div key={assessmentCode} className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleCycle(assessmentCode)}
                className="w-full flex items-center justify-between bg-muted/20 border-b p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4.5 w-4.5 text-primary" />
                  <span className="font-serif text-sm font-bold text-foreground">
                    Assessment ID: <span className="text-primary font-bold">{assessmentCode}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {list.length} papers
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-primary" />
                )}
              </button>

              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">HOD</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">QP Setter</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Subject</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Exam Type</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Due Date</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(a => {
                        const hod = allUsers.find(u => u.id === a.hodId);
                        const setter = allUsers.find(u => u.id === a.facultyId);
                        return (
                          <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 font-medium text-xs">{hod?.name || '—'}</td>
                            <td className="p-3 text-xs text-muted-foreground">{setter?.name || 'Unassigned'}</td>
                            <td className="p-3 text-xs text-muted-foreground">{a.course?.courseName}</td>
                            <td className="p-3 text-xs text-muted-foreground">{a.examType}</td>
                            <td className="p-3 text-xs text-muted-foreground">{a.dueDate}</td>
                            <td className="p-3">
                              <StatusBadge status={a.status} description={a.description} role="controller" />
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
    </div>
  );
}
