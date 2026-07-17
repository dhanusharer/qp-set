import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { AssessmentBadge, getDueDateColor, getDueDateLabel } from '@/components/AssessmentBadge';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, AlertTriangle, BookOpen, CheckCircle, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import controllerPhoto from '@/assets/controller-photo.jpg';

export default function FacultyDashboard() {
  const { currentUser } = useAuth();
  const { getAssignmentsForFaculty } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;
  const myAssignments = getAssignmentsForFaculty(currentUser.id);

  const getDaysLeft = (dueDate: string) => {
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const stats = {
    total: myAssignments.length,
    pending: myAssignments.filter(a => a.status === 'Pending' || a.status === 'Revision Required').length,
    submitted: myAssignments.filter(a => a.status === 'Submitted').length,
    approved: myAssignments.filter(a => a.status === 'Approved').length,
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/60 text-sm">Welcome back,</p>
            <h1 className="font-serif text-2xl font-bold">{currentUser.name}</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">{currentUser.designation || 'Faculty'} • {currentUser.dept || 'CSE'}</p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-primary-foreground/10 rounded-xl p-3">
            <TrendingUp className="h-5 w-5 text-accent" />
            <div>
              <p className="text-xs text-primary-foreground/60">Progress</p>
              <p className="text-lg font-bold">{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
          <div>
            <p className="text-xl font-bold font-serif">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10"><BookOpen className="h-5 w-5 text-accent" /></div>
          <div>
            <p className="text-xl font-bold font-serif">{stats.submitted}</p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10"><CheckCircle className="h-5 w-5 text-success" /></div>
          <div>
            <p className="text-xl font-bold font-serif">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
        </div>
      </div>

      <h2 className="font-serif text-lg font-semibold">Your Assignments</h2>

      {myAssignments.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No assignments yet. Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myAssignments.map(a => {
            const dueColor = getDueDateColor(a.dueDate);
            return (
              <div key={a.id} className="bg-card border rounded-xl p-5 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                  <AssessmentBadge id={a.assessmentCode} />
                  <StatusBadge status={a.status} description={a.description} role="qpsetter" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{a.course?.courseName}</h3>
                <p className="text-xs text-muted-foreground mb-2">{a.examType}</p>
                <div className="flex items-center gap-2 text-xs mb-3">
                  <Clock className="h-3 w-3" style={{ color: dueColor }} />
                  <span style={{ color: dueColor, fontWeight: 600 }}>{getDueDateLabel(a.dueDate)}</span>
                  <span className="text-muted-foreground">• Due: {a.dueDate}</span>
                </div>

                {a.assignedBy && (
                  <div className="flex items-center gap-2 mb-3 bg-secondary/30 rounded-lg p-2">
                    <img src={controllerPhoto} alt="Controller" className="h-6 w-6 rounded-md object-cover" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Assigned by</p>
                      <p className="text-xs font-medium">{a.assignedBy?.name || 'Controller'}</p>
                    </div>
                  </div>
                )}

                {(a.syllabusFileName || a.prevPaperFileName || a.timetableFileName) && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {a.syllabusFileName && (
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {a.syllabusFileName}
                      </span>
                    )}
                    {a.prevPaperFileName && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {a.prevPaperFileName}
                      </span>
                    )}
                    {a.timetableFileName && (
                      <span className="text-[10px] bg-success/10 text-success px-2 py-1 rounded flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {a.timetableFileName}
                      </span>
                    )}
                  </div>
                )}

                {a.suggestions && a.suggestions.length > 0 && (
                  <div className="rounded-lg p-2 mb-3" style={{ background: '#FFFBEB', borderLeft: '4px solid #E8A020' }}>
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquare className="h-3 w-3 text-accent" />
                      <span className="text-[10px] font-semibold text-foreground">{a.suggestions.length} suggestion(s)</span>
                    </div>
                    <p className="text-[11px] text-foreground italic">"{a.suggestions[a.suggestions.length - 1].message}"</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">— {a.suggestions[a.suggestions.length - 1].fromUser?.name || 'HOD'}</p>
                  </div>
                )}

                {a.revisionComment && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 mb-3">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span className="text-[10px] font-medium text-destructive">Revision Required</span>
                    </div>
                    <p className="text-xs text-foreground">{a.revisionComment}</p>
                  </div>
                )}

                {a.instructions && (
                  <p className="text-[10px] text-muted-foreground mb-3 italic">📋 {a.instructions}</p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {a.timetableFileName && (
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      <Calendar className="h-3 w-3 mr-1" /> View Timetable
                    </Button>
                  )}
                  {a.syllabusFileName && (
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      <BookOpen className="h-3 w-3 mr-1" /> View Syllabus
                    </Button>
                  )}
                  <Button size="sm" className="text-xs h-8 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => navigate(`/faculty/create-paper?id=${a.id}`)}>
                    {a.status === 'Revision Required' ? 'Revise Paper' : 'Start Setting Paper'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
