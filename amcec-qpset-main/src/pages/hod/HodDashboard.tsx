import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { BookOpen, Users, ClipboardList, Clock, CheckCircle } from 'lucide-react';

export default function HodDashboard() {
  const { currentUser } = useAuth();
  const { assignments, courses, allUsers } = useApp();

  if (!currentUser) return null;

  const myCourses = courses.filter(c => c.hodId === currentUser.id);
  const mySetters = allUsers.filter(u => u.role === 'qpsetter' && u.hodId === currentUser.id);
  const myAssignments = assignments.filter(a => a.hodId === currentUser.id);

  const stats = {
    courses: myCourses.length,
    setters: mySetters.length,
    assigned: myAssignments.length,
    pending: myAssignments.filter(a => a.status === 'Pending' || a.status === 'Submitted').length,
    approved: myAssignments.filter(a => a.status === 'Approved').length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
        <p className="text-primary-foreground/60 text-sm">Welcome back,</p>
        <h1 className="font-serif text-2xl font-bold">{currentUser.name}</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">HOD, {currentUser.dept}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Courses Registered" value={stats.courses} icon={BookOpen} />
        <StatCard title="QP Setters" value={stats.setters} icon={Users} />
        <StatCard title="Papers Assigned" value={stats.assigned} icon={ClipboardList} />
        <StatCard title="Pending Review" value={stats.pending} icon={Clock} color="text-warning" />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle} color="text-success" />
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-serif text-base font-semibold text-foreground">Recent Assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">QP Setter</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Subject</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Exam Type</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Due Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {myAssignments.map(a => {
                const setter = allUsers.find(u => u.id === a.facultyId);
                return (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 text-xs font-medium">{setter?.name || 'Unassigned'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{a.course?.courseName}</td>
                    <td className="p-3 text-xs text-muted-foreground">{a.examType}</td>
                    <td className="p-3 text-xs text-muted-foreground">{a.dueDate}</td>
                    <td className="p-3"><StatusBadge status={a.status} description={a.description} role="hod" /></td>
                  </tr>
                );
              })}
              {myAssignments.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">No assignments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
