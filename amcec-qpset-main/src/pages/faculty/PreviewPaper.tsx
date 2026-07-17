import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { sampleModules, sampleInternalModules } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Eye, ShieldAlert, BookOpen } from 'lucide-react';

export default function PreviewPaper() {
  const { currentUser } = useAuth();
  const { getAssignmentsForFaculty, getAssignmentsForHod } = useApp();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  const isHod = currentUser.role === 'hod';
  const myAssignments = isHod
    ? getAssignmentsForHod(currentUser.id)
    : getAssignmentsForFaculty(currentUser.id);

  // Only include assignments that have drafted/submitted papers
  const previewableAssignments = myAssignments.filter(a => a.paper !== null);

  const currentAssignment = useMemo(() => {
    if (selectedAssignmentId) {
      return previewableAssignments.find(a => String(a.id) === String(selectedAssignmentId)) || null;
    }
    return previewableAssignments[0] || null;
  }, [previewableAssignments, selectedAssignmentId]);

  const isInternal = currentAssignment?.examType?.includes('40 Marks') || false;

  let paperContent: any = null;
  if (currentAssignment && currentAssignment.paper) {
    paperContent = currentAssignment.paper.content;
    if (typeof paperContent === 'string') {
      try {
        paperContent = JSON.parse(paperContent);
      } catch (e) {
        console.error(e);
      }
    }
  }

  const activeModules = paperContent || (isInternal ? sampleInternalModules : sampleModules);

  // Show 2 modules per page
  const pages: any[] = [];
  for (let i = 0; i < activeModules.length; i += 2) {
    pages.push(activeModules.slice(i, i + 2));
  }

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  if (previewableAssignments.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground mb-6">Secure Paper Preview</h1>
        <div className="bg-card border rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm">
          <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Eye className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-base font-bold text-foreground">No Question Papers Available</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isHod 
                ? "There are currently no drafted or submitted question papers in your department to preview."
                : "You have not created or saved drafts for any question papers yet."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Secure Paper Preview</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isHod 
            ? "Preview drafts and submissions from setters in your department."
            : "Review your drafted and submitted question papers in a secure workspace."}
        </p>
      </div>

      <div className="bg-card border rounded-2xl p-6 text-center max-w-lg mx-auto space-y-5 shadow-sm">
        
        {/* Paper selector dropdown */}
        <div className="text-left space-y-1.5 max-w-md mx-auto">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-accent" /> Select Assessment Paper
          </label>
          <Select 
            value={currentAssignment?.id?.toString() || ''} 
            onValueChange={v => setSelectedAssignmentId(Number(v))}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select a paper to preview" />
            </SelectTrigger>
            <SelectContent>
              {previewableAssignments.map(a => (
                <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                  {a.assessmentCode} — {a.course?.courseName} ({a.course?.courseCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full border-t border-dashed my-4" />

        <div className="space-y-2">
          <Eye className="h-12 w-12 text-accent mx-auto mb-1" />
          <h2 className="font-serif text-lg font-bold text-foreground">
            {currentAssignment?.course?.courseName}
          </h2>
          <p className="text-xs text-muted-foreground font-semibold">
            {currentAssignment?.examType} • {currentAssignment?.course?.courseCode}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            View this question paper in a secure, restricted preview mode. Screenshots, printouts, and distribution are strictly prohibited.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6">
              Open Secure Preview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden" onContextMenu={handleContextMenu}>
            <DialogHeader>
              <DialogTitle className="font-serif">Secure Paper Preview</DialogTitle>
            </DialogHeader>

            {/* Security warning */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-xs text-destructive font-medium">⚠️ Screenshot or distribution of this paper is strictly prohibited.</p>
            </div>

            {/* Paper preview with watermark */}
            <div className="relative border rounded-lg p-6 bg-white overflow-y-auto max-h-[55vh] select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <p className="text-4xl font-bold text-foreground/[0.06] rotate-[-45deg] whitespace-nowrap">
                  CONFIDENTIAL — AMCEC — {currentUser.name}
                </p>
              </div>

              {/* Paper header */}
              <div className="text-center mb-4 relative z-0">
                <p className="font-serif text-base font-bold">AMC Engineering College, Bengaluru</p>
                <p className="text-xs text-muted-foreground">Department of CSE (AI & ML)</p>
                <p className="text-xs font-medium mt-1">End Semester Examination — 3rd Semester — 2024-25</p>
                <div className="flex justify-between text-xs mt-2 px-4">
                  <span>Subject: <strong>{currentAssignment?.course?.courseName || '—'}</strong></span>
                  <span>Code: <strong>{currentAssignment?.course?.courseCode || '—'}</strong></span>
                </div>
                <div className="flex justify-between text-xs px-4">
                  <span>Max Marks: <strong>{isInternal ? '40' : '100'}</strong></span>
                  <span>Time: <strong>{isInternal ? '2 Hours' : '3 Hours'}</strong></span>
                </div>
                <hr className="mt-2" />
              </div>

              {/* Questions for current page */}
              {pages[page]?.map((m: any, mi: number) => {
                const actualIndex = page * 2 + mi;
                return (
                  <div key={m.id} className="mb-5 relative z-0">
                    <p className="text-sm font-bold mb-2 text-primary">MODULE {m.id} — {m.title}</p>
                    <div className="space-y-1.5 text-sm">
                      {isInternal ? (
                        <>
                          <div className="flex justify-between">
                            <p>Q.{actualIndex * 2 + 1} a) {m.questions.q1.a.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q1.a.marks}M]</span>
                          </div>
                          <div className="flex justify-between">
                            <p className="pl-6">b) {m.questions.q1.b.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q1.b.marks}M]</span>
                          </div>
                          <div className="flex justify-between">
                            <p className="pl-6">c) {m.questions.q1.c.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q1.c.marks}M]</span>
                          </div>
                          <p className="text-center text-xs font-bold text-muted-foreground py-1">OR</p>
                          <div className="flex justify-between">
                            <p>Q.{actualIndex * 2 + 2} a) {m.questions.q2.a.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q2.a.marks}M]</span>
                          </div>
                          <div className="flex justify-between">
                            <p className="pl-6">b) {m.questions.q2.b.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q2.b.marks}M]</span>
                          </div>
                          <div className="flex justify-between">
                            <p className="pl-6">c) {m.questions.q2.c.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q2.c.marks}M]</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <p>Q.{m.id * 2 - 1} a) {m.questions.q1a.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q1a.marks}M]</span>
                          </div>
                          <div className="flex justify-between">
                            <p className="pl-6">b) {m.questions.q1b.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q1b.marks}M]</span>
                          </div>
                          <p className="text-center text-xs font-bold text-muted-foreground py-1">OR</p>
                          <div className="flex justify-between">
                            <p>Q.{m.id * 2} a) {m.questions.q2a.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q2a.marks}M]</span>
                          </div>
                          <div className="flex justify-between">
                            <p className="pl-6">b) {m.questions.q2b.text}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">[{m.questions.q2b.marks}M]</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {pages.length}</span>
              <Button variant="outline" size="sm" disabled={page >= pages.length - 1} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
