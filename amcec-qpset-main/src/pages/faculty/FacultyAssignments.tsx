import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { AssessmentBadge, getDueDateColor, getDueDateLabel } from '@/components/AssessmentBadge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, BookOpen, Calendar } from 'lucide-react';
import controllerPhoto from '@/assets/controller-photo.jpg';

export default function FacultyAssignments() {
  const { currentUser } = useAuth();
  const { getAssignmentsForFaculty } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;
  const assignments = getAssignmentsForFaculty(currentUser.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">My Assignments</h1>
        <p className="text-sm text-muted-foreground mt-1">{assignments.length} assignment(s) found</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Assessment ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Subject</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Exam Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Assigned By</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Due Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Materials</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => {
              const dueColor = getDueDateColor(a.dueDate);
              return (
                <tr key={a.id} className="border-b last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-3"><AssessmentBadge id={a.assessmentCode} /></td>
                  <td className="p-3 font-medium text-xs">{a.course?.courseName}</td>
                  <td className="p-3 text-xs text-muted-foreground">{a.examType}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img src={controllerPhoto} alt="" className="h-6 w-6 rounded-md object-cover" />
                      <span className="text-xs text-muted-foreground">{a.assignedBy?.name || 'Controller'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    <span style={{ color: dueColor, fontWeight: 600 }}>{getDueDateLabel(a.dueDate)}</span>
                    <p className="text-[10px] text-muted-foreground">{a.dueDate}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {a.syllabusFileName && (
                        <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded flex items-center gap-1">
                          <BookOpen className="h-2.5 w-2.5" /> Syllabus
                        </span>
                      )}
                      {a.prevPaperFileName && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5" /> Prev Paper
                        </span>
                      )}
                      {a.timetableFileName && (
                        <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" /> Timetable
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3"><StatusBadge status={a.status} description={a.description} role="qpsetter" /></td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate(`/faculty/create-paper?id=${a.id}`)}>
                      {a.status === 'Pending' || a.status === 'Revision Required' ? 'Set Paper' : 'View'}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {assignments.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-sm">No assignments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
