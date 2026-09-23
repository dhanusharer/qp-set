import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import { useAcademicCycle } from '@/contexts/AcademicCycleContext';
import { Sparkles, CheckSquare, Square, Layers, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CourseOption {
  id: number;
  code: string;
  name: string;
  semester: string;
  department?: { name: string; code: string };
}

interface CycleCreationWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CycleCreationWizardModal: React.FC<CycleCreationWizardModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { sessions, selectedSession, refreshCycles } = useAcademicCycle();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [targetSessionId, setTargetSessionId] = useState<number>(selectedSession?.id || 0);
  const [setsToGenerate, setSetsToGenerate] = useState<string[]>(['SET_A', 'SET_B', 'RESERVE']);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (selectedSession) {
        setTargetSessionId(selectedSession.id);
      } else if (sessions.length > 0) {
        setTargetSessionId(sessions[0].id);
      }

      setLoading(true);
      apiClient.get<any>('/courses?limit=100')
        .then((res) => {
          const rawItems = Array.isArray(res.data) ? res.data : res.data?.items || [];
          const normalized: CourseOption[] = rawItems.map((c: any) => ({
            id: c.id,
            code: c.courseCode || c.code,
            name: c.courseName || c.name,
            semester: c.semester,
            department: c.department || { name: 'Computer Science', code: 'CSE' },
          }));
          setCourses(normalized);
          if (normalized.length > 0) {
            setSelectedCourseIds(normalized.slice(0, 3).map((c) => c.id));
          }
        })
        .catch((err) => console.error('Failed to load courses for wizard:', err))
        .finally(() => setLoading(false));
      
      setSuccessResult(null);
    }
  }, [open, selectedSession, sessions]);

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSet = (set: string) => {
    setSetsToGenerate((prev) =>
      prev.includes(set)
        ? prev.length > 1
          ? prev.filter((s) => s !== set)
          : prev
        : [...prev, set]
    );
  };

  const handleRunWizard = async () => {
    if (!targetSessionId || selectedCourseIds.length === 0) return;

    try {
      setSubmitting(true);
      const res = await apiClient.post<{ success: boolean; data: { message: string; eventsCount: number } }>(
        `/academic-cycles/sessions/${targetSessionId}/wizard`,
        {
          courseIds: selectedCourseIds,
          setsToGenerate,
        }
      );

      setSuccessResult(res.data.message || `Successfully created ${res.data.eventsCount} events`);
      await refreshCycles();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || 'Wizard failed to initialize cycle events');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Academic Cycle Setup Wizard</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Batch initialize Assessment Events and parallel Paper Forms without duplicating canonical Course records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {successResult ? (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Cycle Events Batch Initialized</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">{successResult}</p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="mt-2">
              Done & Return to Workspace
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            {/* Target Exam Session */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Target Exam Session
              </label>
              <select
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(parseInt(e.target.value))}
                className="w-full bg-card border rounded-md px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) — Status: {s.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Parallel Sets to Generate */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Parallel Paper Forms per Course
              </label>
              <div className="flex gap-2">
                {['SET_A', 'SET_B', 'RESERVE'].map((set) => {
                  const isChecked = setsToGenerate.includes(set);
                  return (
                    <button
                      key={set}
                      type="button"
                      onClick={() => toggleSet(set)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                        isChecked
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/40 border-border text-muted-foreground'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      <span>{set.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Courses */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Select Department Courses ({selectedCourseIds.length} of {courses.length} selected)
                </label>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCourseIds(courses.map((c) => c.id))}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCourseIds([])}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Loading courses...</div>
              ) : (
                <div className="border rounded-md divide-y max-h-52 overflow-y-auto bg-card">
                  {courses.map((course) => {
                    const isSelected = selectedCourseIds.includes(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => toggleCourse(course.id)}
                        className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-muted/40 transition-colors ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-foreground">{course.code}</span>
                            <span className="text-muted-foreground ml-2">{course.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {course.department && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              {course.department.code}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">Sem {course.semester}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-sky-500/10 border border-sky-500/20 rounded-md p-3 text-[11px] text-sky-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Architectural Integrity Rule:</strong> Courses remain permanent academic master records. This wizard creates operational <code className="font-mono">AssessmentEvent</code> bindings for the selected session and initial parallel forms (Set A, B, Reserve) without duplicating questions or subject records.
              </div>
            </div>
          </div>
        )}

        {!successResult && (
          <DialogFooter className="mt-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submitting || selectedCourseIds.length === 0 || !targetSessionId}
              onClick={handleRunWizard}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {submitting ? 'Generating...' : `Batch Initialize (${selectedCourseIds.length} Courses)`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
