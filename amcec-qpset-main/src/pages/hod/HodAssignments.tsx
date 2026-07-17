import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, CheckCircle2, UserCheck, ShieldAlert } from 'lucide-react';
import controllerPhoto from '@/assets/controller-photo.jpg';

export default function HodAssignments() {
  const { currentUser } = useAuth();
  const { assignments, updateAssignment, addNotification, allUsers } = useApp();
  const { toast } = useToast();

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedSetter, setSelectedSetter] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  
  // Scoped read-only form state
  const [subject, setSubject] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [examType, setExamType] = useState('');
  const [semester, setSemester] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');

  if (!currentUser) return null;

  const receivedFromController = assignments.filter(a => a.hodId === currentUser.id && !a.facultyId);
  const assignedToSetters = assignments.filter(a => a.hodId === currentUser.id && a.facultyId);
  const mySetters = [
    { id: currentUser.id, name: `${currentUser.name} (HOD)` },
    ...allUsers.filter(u => u.role === 'qpsetter' && u.hodId === currentUser.id)
  ];

  // Auto-fill assignment details when selectedAssignmentId changes
  useEffect(() => {
    if (selectedAssignmentId) {
      const a = assignments.find(x => x.id === selectedAssignmentId);
      if (a) {
        setSubject(a.course?.courseName || '');
        setSubjectCode(a.course?.courseCode || '');
        setExamType(a.examType || '');
        setSemester(a.course?.semester || '');
        setDueDate(a.dueDate?.split('T')[0] || '');
        setInstructions(a.instructions || '');
      }
    } else {
      setSubject('');
      setSubjectCode('');
      setExamType('');
      setSemester('');
      setDueDate('');
      setInstructions('');
    }
  }, [selectedAssignmentId, assignments]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSetter || !selectedAssignmentId) return;
    const a = assignments.find(x => x.id === selectedAssignmentId);
    if (!a) return;
    const setter = mySetters.find(s => s.id === selectedSetter);

    try {
      await updateAssignment(selectedAssignmentId, {
        facultyId: selectedSetter,
        dueDate,
        instructions: instructions || undefined,
        status: 'Pending'
      });

      addNotification({
        userId: selectedSetter,
        message: `New paper assigned by HOD [${a.assessmentCode}]: ${a.course?.courseName} — Due: ${dueDate}`,
        date: new Date().toISOString().split('T')[0],
        read: false,
        type: 'info',
        kind: 'assignment',
        fromUserId: currentUser.id,
      });

      toast({ title: 'Delegation Successful!', description: `${a.assessmentCode} assigned to ${setter?.name}` });
      setShowAssignForm(false);
      setSelectedSetter(null);
      setSelectedAssignmentId(null);
    } catch (err: any) {
      toast({ title: 'Delegation Failed', description: err.message || 'Could not delegate assignment.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">My Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">Delegate received paper-setting requirements to your department QP Setters</p>
        </div>
        <Button onClick={() => setShowAssignForm(!showAssignForm)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-1" /> Assign to QP Setter
        </Button>
      </div>

      {showAssignForm && (
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-serif text-base font-semibold mb-4">Delegate Paper Assignment</h3>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Select Target Assessment (Received from Controller) *</Label>
                <Select value={selectedAssignmentId?.toString() || ''} onValueChange={v => setSelectedAssignmentId(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select target paper" /></SelectTrigger>
                  <SelectContent>
                    {receivedFromController.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>{a.assessmentCode} — {a.course?.courseName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs font-semibold">Select QP Setter (Faculty) *</Label>
                <Select value={selectedSetter ? String(selectedSetter) : ''} onValueChange={v => setSelectedSetter(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select QP Setter" /></SelectTrigger>
                  <SelectContent>
                    {mySetters.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedAssignmentId && (
              <div className="bg-secondary/10 border rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Subject / Code:</span>
                  <span className="font-semibold text-foreground">{subject} ({subjectCode})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Exam Type:</span>
                  <span className="font-semibold text-foreground">{examType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Semester:</span>
                  <span className="font-semibold text-foreground">{semester}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Current Target Due Date:</span>
                  <span className="font-semibold text-foreground">{dueDate}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Adjust Due Date (Defaults to Controller Deadline)</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" required disabled={!selectedAssignmentId} />
              </div>
              <div>
                <Label className="text-xs">Additional Instructions for Setter</Label>
                <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g. Include module 1 numericals..." className="mt-1" rows={2} disabled={!selectedAssignmentId} />
              </div>
            </div>
            
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={!selectedSetter || !selectedAssignmentId || !dueDate}>
              <UserCheck className="h-4 w-4 mr-2" /> Delegate & Notify Setter
            </Button>
          </form>
        </div>
      )}

      {/* Received from Controller */}
      <div>
        <h2 className="font-serif text-lg font-semibold mb-3">Received from Controller</h2>
        {receivedFromController.length === 0 ? (
          <div className="bg-card border rounded-xl p-6 text-center text-sm text-muted-foreground">No pending paper targets from the Controller.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receivedFromController.map(a => (
              <div key={a.id} className="bg-card border rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{a.course?.courseName} ({a.course?.courseCode})</h3>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{a.examType} • {a.course?.semester}</p>
                  
                  <div className="flex items-center gap-2 bg-secondary/35 rounded-lg p-2.5 mb-3 border border-secondary/20">
                    <img src={controllerPhoto} alt="Controller" className="h-7 w-7 rounded-full object-cover" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Assigned by</p>
                      <p className="text-xs font-semibold text-foreground">{a.assignedBy?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-semibold">Due: {a.dueDate?.split('T')[0]}</p>
                  <Button size="sm" variant="outline" className="text-xs h-8 hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => {
                    setSelectedAssignmentId(a.id);
                    setShowAssignForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    Assign to Setter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned to QP Setters */}
      <div>
        <h2 className="font-serif text-lg font-semibold mb-3">Assigned to QP Setters</h2>
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/15 text-xs font-semibold text-muted-foreground uppercase text-left">
                <th className="p-3">QP Setter</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Exam Type</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assignedToSetters.map(a => {
                const setter = allUsers.find(u => u.id === a.facultyId);
                return (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-secondary/5 transition-colors">
                    <td className="p-3 text-xs font-semibold text-foreground">{setter?.name || 'Unknown'}</td>
                    <td className="p-3 text-xs">
                      <p className="font-medium text-foreground">{a.course?.courseName}</p>
                      <p className="text-[10px] text-muted-foreground">{a.course?.courseCode}</p>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{a.examType}</td>
                    <td className="p-3 text-xs text-muted-foreground">{a.dueDate?.split('T')[0]}</td>
                    <td className="p-3 text-center"><StatusBadge status={a.status} /></td>
                  </tr>
                );
              })}
              {assignedToSetters.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm italic">No papers assigned to setters yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
