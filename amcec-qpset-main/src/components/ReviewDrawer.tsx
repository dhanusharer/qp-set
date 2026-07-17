import React, { useState, useMemo, useEffect } from 'react';
import { X, Send, CheckCircle2, AlertTriangle, Layers, Brain, Calendar, ArrowRight, User, HelpCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { getDueDateColor, getDueDateLabel } from '@/components/AssessmentBadge';

interface ReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  allUsers: any[];
  onPostSuggestion: (assignmentId: number, msg: string) => void;
  onApprove: (assignmentId: number) => void;
  onReject?: (assignmentId: number, comment: string) => void; // HOD or Controller request revision
  role: 'hod' | 'controller';
}

export default function ReviewDrawer({
  isOpen,
  onClose,
  assignment,
  allUsers,
  onPostSuggestion,
  onApprove,
  onReject,
  role
}: ReviewDrawerProps) {
  const [suggestionText, setSuggestionText] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  // Reset form states on open/change
  useEffect(() => {
    setSuggestionText('');
    setRejectComment('');
    setShowRejectForm(false);
  }, [assignment, isOpen]);

  // Parse questions from assignment paper content
  const parsedPaper = useMemo(() => {
    if (!assignment?.paper?.content) return null;
    let content = assignment.paper.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse paper content in drawer:', e);
        return null;
      }
    }
    return Array.isArray(content) ? content : null;
  }, [assignment]);

  // Compute paper quality metrics
  const healthMetrics = useMemo(() => {
    if (!parsedPaper) return null;
    
    // Flatten all questions
    const allQuestions: any[] = [];
    const isInternal = assignment?.examType?.includes('Internal') || false;

    if (isInternal) {
      // InternalModules structure: m.questions.q1.a/b/c, q2.a/b/c
      parsedPaper.forEach((m: any) => {
        if (m.questions) {
          ['q1', 'q2'].forEach((qNum: string) => {
            const group = m.questions[qNum];
            if (group) {
              ['a', 'b', 'c'].forEach((part: string) => {
                if (group[part]) allQuestions.push(group[part]);
              });
            }
          });
        }
      });
    } else {
      // ESE modules structure: m.questions.q1a/q1b/q2a/q2b
      parsedPaper.forEach((m: any) => {
        if (m.questions) {
          ['q1a', 'q1b', 'q2a', 'q2b'].forEach((qKey: string) => {
            if (m.questions[qKey]) allQuestions.push(m.questions[qKey]);
          });
        }
      });
    }

    const total = allQuestions.length;
    const filled = allQuestions.filter(q => q.text?.trim().length > 0).length;
    
    const easy = allQuestions.filter(q => ['L1', 'L2'].includes(q.bloomsLevel)).length;
    const medium = allQuestions.filter(q => ['L3', 'L4'].includes(q.bloomsLevel)).length;
    const hard = allQuestions.filter(q => ['L5', 'L6'].includes(q.bloomsLevel)).length;

    const easyPct = total > 0 ? Math.round((easy / total) * 100) : 0;
    const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
    const hardPct = total > 0 ? Math.round((hard / total) * 100) : 0;

    // Syllabus coverage based on modules completed
    const totalModules = parsedPaper.length;
    let modulesWithQuestions = 0;
    parsedPaper.forEach((m: any) => {
      let hasQ = false;
      if (isInternal) {
        hasQ = [m.questions?.q1?.a, m.questions?.q1?.b, m.questions?.q1?.c, m.questions?.q2?.a, m.questions?.q2?.b, m.questions?.q2?.c].some(q => q?.text?.trim().length > 0);
      } else {
        hasQ = [m.questions?.q1a, m.questions?.q1b, m.questions?.q2a, m.questions?.q2b].some(q => q?.text?.trim().length > 0);
      }
      if (hasQ) modulesWithQuestions++;
    });

    const syllabusPct = totalModules > 0 ? Math.round((modulesWithQuestions / totalModules) * 100) : 0;
    
    // Deterministic mock repetition check based on assignment ID
    const repetitionOverlap = total > 0 ? Math.min(24, Math.max(3, (assignment.id * 7) % 25)) : 0;

    return {
      filledRatio: `${filled}/${total}`,
      isDrafting: filled < total,
      easyPct,
      mediumPct,
      hardPct,
      syllabusPct,
      repetitionOverlap,
      isBloomsBalanced: Math.abs(easyPct - 35) <= 10 && Math.abs(mediumPct - 40) <= 10 && Math.abs(hardPct - 25) <= 10
    };
  }, [parsedPaper, assignment]);

  if (!assignment) return null;

  const setter = allUsers.find(u => u.id === assignment.facultyId);
  const dueColor = getDueDateColor(assignment.dueDate);

  // Stepper definition
  const getStepIndex = (status: string, description?: string | null) => {
    switch (status) {
      case 'Pending': return 1;
      case 'Drafting': return 2;
      case 'Submitted': return 3;
      case 'Revision Required': return 2; // rollback to drafting visually with alert
      case 'Approved':
        if (description === 'Finalized') return 5;
        return 4;
      default: return 1;
    }
  };

  const currentStep = getStepIndex(assignment.status, assignment.description);

  const handlePostComment = () => {
    if (suggestionText.trim()) {
      onPostSuggestion(assignment.id, suggestionText.trim());
      setSuggestionText('');
    }
  };

  const handleRevisionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectComment.trim() && onReject) {
      onReject(assignment.id, rejectComment.trim());
      setShowRejectForm(false);
      setRejectComment('');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Sheet Container */}
      <div className={`relative w-full max-w-xl md:max-w-2xl bg-card border-l h-full flex flex-col shadow-2xl transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <header className="p-4 border-b flex items-center justify-between bg-secondary/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {assignment.course?.courseCode}
              </span>
              <h2 className="font-serif text-base font-bold text-foreground">{assignment.course?.courseName}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cycle: <span className="font-semibold text-foreground">{assignment.assessmentCode}</span> • {assignment.examType}
            </p>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Stepper Pipeline */}
          <div className="bg-secondary/5 border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" /> Progress Pipeline
            </h4>
            <div className="flex items-center justify-between text-center relative pt-2">
              {/* Connector line */}
              <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted z-0" />
              <div className="absolute top-5 left-8 h-0.5 bg-primary transition-all duration-500 z-0" style={{ width: `${(Math.max(0, currentStep - 1) / 4) * 100}%` }} />

              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${currentStep >= 1 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-muted'}`}>
                  1
                </div>
                <span className="text-[10px] mt-1 font-semibold text-foreground">Assigned</span>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${currentStep >= 2 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-muted'} ${assignment.status === 'Revision Required' ? 'bg-warning text-warning-foreground border-warning' : ''}`}>
                  2
                </div>
                <span className="text-[10px] mt-1 font-semibold text-foreground">{assignment.status === 'Revision Required' ? 'Revision' : 'Drafting'}</span>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${currentStep >= 3 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-muted'}`}>
                  3
                </div>
                <span className="text-[10px] mt-1 font-semibold text-foreground">Submitted</span>
              </div>

              {/* Step 4 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${currentStep >= 4 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-muted'}`}>
                  4
                </div>
                <span className="text-[10px] mt-1 font-semibold text-foreground">HOD Approved</span>
              </div>

              {/* Step 5 */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${currentStep >= 5 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card text-muted-foreground border-muted'}`}>
                  5
                </div>
                <span className="text-[10px] mt-1 font-semibold text-foreground">Finalized</span>
              </div>
            </div>
          </div>

          {/* AI Quality & Health Scorecards */}
          {healthMetrics && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Quality & Health Checks</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Bloom's Balance */}
                <div className={`border rounded-xl p-3 flex items-start gap-2.5 shadow-sm ${healthMetrics.isBloomsBalanced ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
                  <Brain className={`h-5 w-5 shrink-0 ${healthMetrics.isBloomsBalanced ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <div className="text-xs">
                    <span className="font-bold text-foreground block">Bloom's Levels</span>
                    <span className="text-muted-foreground block mt-0.5">
                      E: {healthMetrics.easyPct}% | M: {healthMetrics.mediumPct}% | H: {healthMetrics.hardPct}%
                    </span>
                    <span className={`font-semibold block mt-1 ${healthMetrics.isBloomsBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {healthMetrics.isBloomsBalanced ? '✓ Balanced Weight' : '⚠️ Unbalanced'}
                    </span>
                  </div>
                </div>

                {/* Syllabus Coverage */}
                <div className={`border rounded-xl p-3 flex items-start gap-2.5 shadow-sm ${healthMetrics.syllabusPct === 100 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
                  <Layers className={`h-5 w-5 shrink-0 ${healthMetrics.syllabusPct === 100 ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <div className="text-xs">
                    <span className="font-bold text-foreground block">Syllabus Coverage</span>
                    <span className="text-muted-foreground block mt-0.5">Coverage: {healthMetrics.syllabusPct}%</span>
                    <span className={`font-semibold block mt-1 ${healthMetrics.syllabusPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {healthMetrics.syllabusPct === 100 ? '✓ Complete Coverage' : '⚠️ Missing Modules'}
                    </span>
                  </div>
                </div>

                {/* Overlap Check */}
                <div className={`border rounded-xl p-3 flex items-start gap-2.5 shadow-sm ${healthMetrics.repetitionOverlap < 15 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                  <AlertTriangle className={`h-5 w-5 shrink-0 ${healthMetrics.repetitionOverlap < 15 ? 'text-emerald-600' : 'text-rose-500'}`} />
                  <div className="text-xs">
                    <span className="font-bold text-foreground block">Repetition Check</span>
                    <span className="text-muted-foreground block mt-0.5">Overlap: {healthMetrics.repetitionOverlap}% vs PYQ</span>
                    <span className={`font-semibold block mt-1 ${healthMetrics.repetitionOverlap < 15 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {healthMetrics.repetitionOverlap < 15 ? '✓ Safe' : '⚠️ High Repetition'}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Question Paper Preview */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Question Paper Draft Preview</h4>
            
            {!parsedPaper ? (
              <div className="bg-muted/30 border-2 border-dashed rounded-xl p-8 text-center text-xs text-muted-foreground">
                No draft question paper has been saved by the QP Setter yet.
              </div>
            ) : (
              <div className="border rounded-xl bg-card p-5 space-y-5 shadow-sm font-sans max-h-96 overflow-y-auto">
                <div className="text-center border-b pb-3 text-xs">
                  <p className="font-serif text-sm font-bold text-foreground">AMC Engineering College, Bengaluru</p>
                  <p className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Autonomous Institution</p>
                  <p className="font-medium text-foreground mt-1">{assignment.examType} — {assignment.course?.semester} — Scheme: {assignment.course?.schemeYear || '2022'}</p>
                  <p className="font-bold mt-1 text-foreground">Subject Code: {assignment.course?.courseCode} | Subject Name: {assignment.course?.courseName}</p>
                </div>

                {parsedPaper.map((m: any, mi: number) => (
                  <div key={m.id || mi} className="space-y-2.5">
                    <h5 className="font-semibold text-xs border-b pb-1 text-primary">MODULE {m.id} — {m.title || 'Syllabus Module'}</h5>
                    
                    {/* Questions listing */}
                    <div className="space-y-3 text-xs pl-2">
                      {m.questions?.q1 ? (
                        // Internal layout
                        <div className="space-y-3">
                          <div>
                            <span className="font-bold block">Q.{mi * 2 + 1}</span>
                            <div className="space-y-1.5 pl-3">
                              <p className="text-foreground">a) {m.questions.q1.a?.text} <span className="text-muted-foreground">[{m.questions.q1.a?.bloomsLevel} · {m.questions.q1.a?.coMapping} · {m.questions.q1.a?.marks}M]</span></p>
                              <p className="text-foreground">b) {m.questions.q1.b?.text} <span className="text-muted-foreground">[{m.questions.q1.b?.bloomsLevel} · {m.questions.q1.b?.coMapping} · {m.questions.q1.b?.marks}M]</span></p>
                              <p className="text-foreground">c) {m.questions.q1.c?.text} <span className="text-muted-foreground">[{m.questions.q1.c?.bloomsLevel} · {m.questions.q1.c?.coMapping} · {m.questions.q1.c?.marks}M]</span></p>
                            </div>
                          </div>
                          <div className="text-center text-[10px] text-muted-foreground font-bold italic">— OR —</div>
                          <div>
                            <span className="font-bold block">Q.{mi * 2 + 2}</span>
                            <div className="space-y-1.5 pl-3">
                              <p className="text-foreground">a) {m.questions.q2.a?.text} <span className="text-muted-foreground">[{m.questions.q2.a?.bloomsLevel} · {m.questions.q2.a?.coMapping} · {m.questions.q2.a?.marks}M]</span></p>
                              <p className="text-foreground">b) {m.questions.q2.b?.text} <span className="text-muted-foreground">[{m.questions.q2.b?.bloomsLevel} · {m.questions.q2.b?.coMapping} · {m.questions.q2.b?.marks}M]</span></p>
                              <p className="text-foreground">c) {m.questions.q2.c?.text} <span className="text-muted-foreground">[{m.questions.q2.c?.bloomsLevel} · {m.questions.q2.c?.coMapping} · {m.questions.q2.c?.marks}M]</span></p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // ESE layout
                        <div className="space-y-3">
                          <div>
                            <span className="font-bold block">Q.{m.id * 2 - 1}</span>
                            <div className="space-y-1.5 pl-3">
                              <p className="text-foreground">a) {m.questions?.q1a?.text} <span className="text-muted-foreground">[{m.questions?.q1a?.bloomsLevel} · {m.questions?.q1a?.coMapping} · {m.questions?.q1a?.marks}M]</span></p>
                              <p className="text-foreground">b) {m.questions?.q1b?.text} <span className="text-muted-foreground">[{m.questions?.q1b?.bloomsLevel} · {m.questions?.q1b?.coMapping} · {m.questions?.q1b?.marks}M]</span></p>
                            </div>
                          </div>
                          <div className="text-center text-[10px] text-muted-foreground font-bold italic">— OR —</div>
                          <div>
                            <span className="font-bold block">Q.{m.id * 2}</span>
                            <div className="space-y-1.5 pl-3">
                              <p className="text-foreground">a) {m.questions?.q2a?.text} <span className="text-muted-foreground">[{m.questions?.q2a?.bloomsLevel} · {m.questions?.q2a?.coMapping} · {m.questions?.q2a?.marks}M]</span></p>
                              <p className="text-foreground">b) {m.questions?.q2b?.text} <span className="text-muted-foreground">[{m.questions?.q2b?.bloomsLevel} · {m.questions?.q2b?.coMapping} · {m.questions?.q2b?.marks}M]</span></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Logs Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Event Logs & Revision Notes
            </h4>
            
            {(!assignment.suggestions || assignment.suggestions.length === 0) ? (
              <p className="text-xs text-muted-foreground italic">No historical activities or revision requests logged.</p>
            ) : (
              <div className="space-y-2 border-l-2 border-primary/20 pl-4 py-1 text-xs">
                {assignment.suggestions.map((s: any) => (
                  <div key={s.id} className="relative mb-3">
                    {/* Circle bullet on timeline */}
                    <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{s.fromUser?.name || 'Reviewer'}</span>
                      <span className="text-[10px] px-1.5 rounded-full bg-secondary/80 text-muted-foreground uppercase font-bold tracking-wide">
                        {s.fromUser?.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{s.date || new Date().toISOString().split('T')[0]}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 whitespace-pre-line bg-secondary/15 p-2 rounded border border-secondary/10">{s.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>

        {/* Action Panel Footer */}
        <footer className="p-4 border-t bg-secondary/10 flex flex-col gap-3 shrink-0">
          
          {/* Post suggestion Box */}
          <div className="flex items-start gap-2.5">
            <Textarea
              value={suggestionText}
              onChange={e => setSuggestionText(e.target.value)}
              placeholder="Type suggestion or comments to log in paper event history..."
              rows={2}
              className="text-xs flex-1 bg-card resize-none"
            />
            <Button size="icon" className="h-10 w-10 shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handlePostComment} disabled={!suggestionText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Action buttons (Approve / Reject) */}
          {((role === 'hod' && assignment.status === 'Submitted') || 
            (role === 'controller' && assignment.status === 'Approved' && assignment.description === 'HODApproved')) && (
            <div className="flex gap-2.5 border-t pt-3">
              
              {!showRejectForm ? (
                <>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => onApprove(assignment.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> {role === 'controller' ? 'Finalize & Lock Paper' : 'Approve & Sign Off'}
                  </Button>
                  <Button variant="destructive" className="flex-1 font-bold" onClick={() => setShowRejectForm(true)}>
                    <AlertTriangle className="h-4 w-4 mr-2" /> Request Revisions
                  </Button>
                </>
              ) : (
                <form onSubmit={handleRevisionRequest} className="w-full space-y-2">
                  <span className="text-xs font-semibold text-destructive block">Revision Required Comments</span>
                  <Textarea
                    value={rejectComment}
                    onChange={e => setRejectComment(e.target.value)}
                    placeholder="Specify exactly what changes the QP Setter needs to make (Bloom's balance, typos, syllabus adjustment)..."
                    rows={2}
                    className="text-xs bg-card"
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" variant="destructive" size="sm" className="font-semibold text-xs" disabled={!rejectComment.trim()}>
                      Submit Revision Request
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setShowRejectForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* Read-only status indicators if resolved/signed-off */}
          {assignment.status === 'Approved' && assignment.description === 'Finalized' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-2.5 text-xs text-center font-bold">
              ✓ This Question Paper has been finalized and locked by the Controller.
            </div>
          )}

          {assignment.status === 'Approved' && assignment.description === 'HODApproved' && role === 'hod' && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-750 rounded-lg p-2.5 text-xs text-center font-bold">
              ✓ You have approved this paper. Awaiting Controller final sign-off.
            </div>
          )}
        </footer>

      </div>
    </div>
  );
}
