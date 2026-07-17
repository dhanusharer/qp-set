import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { sampleModules, sampleInternalModules } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, RotateCcw, FileText, Clock } from 'lucide-react';

export default function ReviewPapers() {
  const { assignments, updateAssignment, addNotification, allUsers } = useApp();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showRevisionBox, setShowRevisionBox] = useState(false);

  const submitted = assignments.filter(a => 
    a.status === 'Submitted' || 
    a.status === 'Revision Required' ||
    (a.status === 'Approved' && a.description === 'HODApproved')
  );
  const selected = assignments.find(a => a.id === selectedId);
  const faculty = selected ? allUsers.find(u => u.id === selected.facultyId) : null;

  const handleApprove = (id: number) => {
    updateAssignment(id, { status: 'Approved', description: 'Finalized' });
    const a = assignments.find(x => x.id === id)!;
    addNotification({ userId: a.facultyId!, message: `Your ${a.course?.courseName} paper has been approved! ✅`, date: new Date().toISOString().split('T')[0], read: false, type: 'success', assignmentId: a.id, kind: 'approval' });
    toast({ title: 'Paper Approved', description: `${a.course?.courseName} paper approved successfully.` });
    setSelectedId(null);
  };

  const handleRevision = (id: number) => {
    if (!comment.trim()) return;
    updateAssignment(id, { status: 'Revision Required', revisionComment: comment });
    const a = assignments.find(x => x.id === id)!;
    addNotification({ userId: a.facultyId!, message: `Controller requested revision on your ${a.course?.courseName} paper: ${comment}`, date: new Date().toISOString().split('T')[0], read: false, type: 'warning', assignmentId: a.id, kind: 'revision' });
    toast({ title: 'Revision Requested', description: `Revision request sent for ${a.course?.courseName}.` });
    setComment('');
    setShowRevisionBox(false);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Review & Approve Papers</h1>
        <p className="text-sm text-muted-foreground mt-1">{submitted.length} paper(s) awaiting review</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Paper list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submissions</h3>
          {submitted.length === 0 ? (
            <div className="bg-card border rounded-xl p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No papers to review.</p>
            </div>
          ) : (
            submitted.map(a => (
              <button
                key={a.id}
                onClick={() => { setSelectedId(a.id); setShowRevisionBox(false); setComment(''); }}
                className={`w-full text-left bg-card border rounded-xl p-4 hover:border-accent transition-all ${selectedId === a.id ? 'border-accent shadow-md' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-xs">{a.course?.courseName}</p>
                  <StatusBadge status={a.status} description={a.description} role="controller" />
                </div>
                <p className="text-[10px] text-muted-foreground">{allUsers.find(u => u.id === a.facultyId)?.name} • {a.examType}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Due: {a.dueDate}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2">
          {selected && faculty ? (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-5 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-lg font-bold">{selected.course?.courseName}</h3>
                    <p className="text-xs text-muted-foreground">{faculty.name} • {selected.examType}</p>
                  </div>
                  <StatusBadge status={selected.status} description={selected.description} role="controller" />
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-secondary/20 rounded-lg p-2"><span className="text-muted-foreground">Semester:</span> <span className="font-medium">{selected.course?.semester}</span></div>
                  <div className="bg-secondary/20 rounded-lg p-2"><span className="text-muted-foreground">Scheme:</span> <span className="font-medium">{selected.course?.schemeYear}</span></div>
                  <div className="bg-secondary/20 rounded-lg p-2"><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{selected.assignedDate}</span></div>
                  <div className="bg-secondary/20 rounded-lg p-2"><span className="text-muted-foreground">Due:</span> <span className="font-medium">{selected.dueDate}</span></div>
                </div>

                {/* Real paper preview */}
                <div className="border rounded-xl p-4 bg-secondary/10 max-h-96 overflow-y-auto select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                  <p className="text-center text-xs text-muted-foreground mb-2 font-serif font-bold">AMC Engineering College, Bengaluru</p>
                  {(() => {
                    const isInternal = selected.examType?.includes('40 Marks') || false;
                    let paperContent = selected.paper?.content;
                    if (typeof paperContent === 'string') {
                      try {
                        paperContent = JSON.parse(paperContent);
                      } catch (e) {
                        console.error(e);
                      }
                    }
                    const activeModules = paperContent || (isInternal ? sampleInternalModules : sampleModules);
                    return activeModules.map((m: any, mi: number) => (
                      <div key={m.id} className="mb-4 text-xs">
                        <p className="font-bold mb-1 text-primary">MODULE {m.id} — {m.title}</p>
                        {isInternal ? (
                          <div className="space-y-1 pl-2">
                            <p>Q.{mi * 2 + 1} a) {m.questions.q1.a.text} [{m.questions.q1.a.marks}M]</p>
                            <p className="pl-4">b) {m.questions.q1.b.text} [{m.questions.q1.b.marks}M]</p>
                            <p className="pl-4">c) {m.questions.q1.c.text} [{m.questions.q1.c.marks}M]</p>
                            <p className="text-center text-[10px] font-bold text-muted-foreground">— OR —</p>
                            <p>Q.{mi * 2 + 2} a) {m.questions.q2.a.text} [{m.questions.q2.a.marks}M]</p>
                            <p className="pl-4">b) {m.questions.q2.b.text} [{m.questions.q2.b.marks}M]</p>
                            <p className="pl-4">c) {m.questions.q2.c.text} [{m.questions.q2.c.marks}M]</p>
                          </div>
                        ) : (
                          <div className="space-y-1 pl-2">
                            <p>Q.{m.id * 2 - 1} a) {m.questions.q1a.text} [{m.questions.q1a.marks}M]</p>
                            <p className="pl-4">b) {m.questions.q1b.text} [{m.questions.q1b.marks}M]</p>
                            <p className="text-center text-[10px] font-bold text-muted-foreground">— OR —</p>
                            <p>Q.{m.id * 2} a) {m.questions.q2a.text} [{m.questions.q2a.marks}M]</p>
                            <p className="pl-4">b) {m.questions.q2b.text} [{m.questions.q2b.marks}M]</p>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>

                {selected.revisionComment && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                    <p className="text-xs font-medium text-destructive">Previous Revision Comment:</p>
                    <p className="text-xs text-foreground mt-1">{selected.revisionComment}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={() => handleApprove(selected.id)} className="bg-success hover:bg-success/90 text-success-foreground">
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="outline" onClick={() => setShowRevisionBox(!showRevisionBox)} className="border-destructive text-destructive hover:bg-destructive/10">
                    <RotateCcw className="h-4 w-4 mr-1" /> Request Revision
                  </Button>
                </div>

                {showRevisionBox && (
                  <div className="space-y-2 mt-2">
                    <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Enter revision feedback..." rows={3} />
                    <Button onClick={() => handleRevision(selected.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={!comment.trim()}>
                      Send Revision Request
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-xl p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Select a paper from the left to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
