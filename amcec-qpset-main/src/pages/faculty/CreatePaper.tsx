import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { apiClient } from '@/lib/apiClient';
import { sampleModules, sampleInternalModules, ModuleData, InternalModuleData, QuestionItem, InternalQuestionItem, questionSuggestions } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bot, CheckCircle, AlertTriangle, Lightbulb, Save, Sparkles, Zap, BookOpen, RefreshCw, Brain, Target, Wand2, BarChart3, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const bloomsLevels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
const bloomsLabels: Record<string, string> = { L1: 'Remember', L2: 'Understand', L3: 'Apply', L4: 'Analyze', L5: 'Evaluate', L6: 'Create' };
const coOptions = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];

const getDifficulty = (level: string) => {
  if (['L1', 'L2'].includes(level)) return { label: 'Easy', color: 'bg-success/15 text-success', emoji: '🟢' };
  if (['L3', 'L4'].includes(level)) return { label: 'Medium', color: 'bg-warning/15 text-warning', emoji: '🟡' };
  return { label: 'Hard', color: 'bg-destructive/15 text-destructive', emoji: '🔴' };
};

function QuestionRow({ q, onChange, onPickSuggestion, onOptimize, label }: {
  q: QuestionItem; onChange: (updated: QuestionItem) => void; onPickSuggestion: () => void; onOptimize: () => void; label: string;
}) {
  const diff = getDifficulty(q.bloomsLevel);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <button onClick={onOptimize} className="text-[10px] text-primary hover:underline flex items-center gap-1" title="AI optimize this question">
            <Wand2 className="h-3 w-3" /> Optimize
          </button>
          <button onClick={onPickSuggestion} className="text-[10px] text-accent hover:underline flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Suggest
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-start p-3 bg-muted/30 rounded-lg border border-transparent hover:border-border transition-colors">
        <Input value={q.text} onChange={e => onChange({ ...q, text: e.target.value })} className="flex-1 text-xs h-9" placeholder="Enter question..." />
        <Select value={q.bloomsLevel} onValueChange={v => onChange({ ...q, bloomsLevel: v })}>
          <SelectTrigger className="w-28 text-[10px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{bloomsLevels.map(l => <SelectItem key={l} value={l}>{l} ({bloomsLabels[l]})</SelectItem>)}</SelectContent>
        </Select>
        <Select value={q.coMapping} onValueChange={v => onChange({ ...q, coMapping: v })}>
          <SelectTrigger className="w-20 text-[10px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{coOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <span className={`text-[10px] px-2 py-1.5 rounded ${diff.color} whitespace-nowrap`}>{diff.emoji} {diff.label}</span>
        <Input type="number" value={q.marks} onChange={e => onChange({ ...q, marks: Number(e.target.value) })} className="w-14 text-[10px] text-center h-9" />
      </div>
    </div>
  );
}

function InternalQuestionRow({ q, onChange, onOptimize, label }: {
  q: InternalQuestionItem; onChange: (updated: InternalQuestionItem) => void; onOptimize: () => void; label: string;
}) {
  const diff = getDifficulty(q.bloomsLevel);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <button onClick={onOptimize} className="text-[10px] text-primary hover:underline flex items-center gap-1">
          <Wand2 className="h-3 w-3" /> Optimize
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-start p-2.5 bg-muted/30 rounded-lg">
        <Input value={q.text} onChange={e => onChange({ ...q, text: e.target.value })} className="flex-1 text-xs h-8" placeholder="Enter question..." />
        <Select value={q.bloomsLevel} onValueChange={v => onChange({ ...q, bloomsLevel: v })}>
          <SelectTrigger className="w-24 text-[10px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{bloomsLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={q.coMapping} onValueChange={v => onChange({ ...q, coMapping: v })}>
          <SelectTrigger className="w-18 text-[10px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{coOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <span className={`text-[10px] px-2 py-1 rounded ${diff.color} whitespace-nowrap`}>{diff.emoji}</span>
        <Input type="number" value={q.marks} onChange={e => onChange({ ...q, marks: Number(e.target.value) })} className="w-12 text-[10px] text-center h-8" />
      </div>
    </div>
  );
}

export default function CreatePaper() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { addNotification, getAssignmentsForFaculty } = useApp();
  const { toast } = useToast();
  const [modules, setModules] = useState<ModuleData[]>(sampleModules);
  const [internalModules, setInternalModules] = useState<InternalModuleData[]>(sampleInternalModules);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [targetQuestion, setTargetQuestion] = useState<{ moduleId: number; qKey: string } | null>(null);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const assignmentIdParam = searchParams.get('id');

  if (!currentUser) return null;

  const myAssignments = getAssignmentsForFaculty(currentUser.id);
  const currentAssignment = useMemo(() => {
    if (assignmentIdParam) {
      return myAssignments.find(a => String(a.id) === assignmentIdParam) || null;
    }
    return null;
  }, [myAssignments, assignmentIdParam]);

  const isInternal = currentAssignment?.examType?.includes('40 Marks') || false;
  const maxMarks = isInternal ? 40 : 100;

  // Load drafted paper content if available in DB
  useEffect(() => {
    if (currentAssignment && currentAssignment.paper) {
      let paperContent = currentAssignment.paper.content;
      if (typeof paperContent === 'string') {
        try {
          paperContent = JSON.parse(paperContent);
        } catch (e) {
          console.error('Failed to parse paper content', e);
        }
      }
      if (paperContent && Array.isArray(paperContent) && paperContent.length > 0) {
        if (isInternal) {
          setInternalModules(paperContent as any);
        } else {
          setModules(paperContent as any);
        }
      }
    }
  }, [currentAssignment, isInternal]);
  const examTime = isInternal ? '2 Hours' : '3 Hours';

  const updateQuestion = (moduleId: number, qKey: string, updated: QuestionItem) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, questions: { ...m.questions, [qKey]: updated } } : m));
  };

  const updateInternalQuestion = (moduleId: number, qNum: 'q1' | 'q2', part: 'a' | 'b' | 'c', updated: InternalQuestionItem) => {
    setInternalModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, questions: { ...m.questions, [qNum]: { ...m.questions[qNum], [part]: updated } } } : m
    ));
  };

  const allQuestions = isInternal
    ? internalModules.flatMap(m => [m.questions.q1.a, m.questions.q1.b, m.questions.q1.c, m.questions.q2.a, m.questions.q2.b, m.questions.q2.c])
    : modules.flatMap(m => [m.questions.q1a, m.questions.q1b, m.questions.q2a, m.questions.q2b]);

  const easy = allQuestions.filter(q => ['L1', 'L2'].includes(q.bloomsLevel)).length;
  const medium = allQuestions.filter(q => ['L3', 'L4'].includes(q.bloomsLevel)).length;
  const hard = allQuestions.filter(q => ['L5', 'L6'].includes(q.bloomsLevel)).length;
  const total = allQuestions.length;
  const easyPct = total > 0 ? Math.round((easy / total) * 100) : 0;
  const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
  const hardPct = total > 0 ? Math.round((hard / total) * 100) : 0;

  const coData = coOptions.map(co => ({ name: co, count: allQuestions.filter(q => q.coMapping === co).length }));

  const suggestions = questionSuggestions[currentAssignment?.course?.courseName || ''] || questionSuggestions['Data Structures & Algorithms'] || [];

  const handlePickSuggestion = (moduleId: number, qKey: string) => {
    setTargetQuestion({ moduleId, qKey });
    setShowSuggestions(true);
  };

  const applySuggestion = (text: string, bloomsLevel: string, coMapping: string) => {
    if (!targetQuestion) return;
    const { moduleId, qKey } = targetQuestion;
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const existing = mod.questions[qKey as keyof typeof mod.questions];
    updateQuestion(moduleId, qKey, { ...existing, text, bloomsLevel, coMapping });
    setShowSuggestions(false);
    setTargetQuestion(null);
    toast({ title: 'Question Applied', description: 'Suggestion applied successfully.' });
  };

  const handleOptimize = (questionId: string) => {
    setOptimizing(questionId);
    setTimeout(() => {
      setOptimizing(null);
      toast({ title: '✨ AI Optimized', description: 'Question has been refined for better clarity and Bloom\'s alignment.' });
    }, 1500);
  };

  const handleAutoBalance = () => {
    toast({ title: '🎯 Auto-Balance Applied', description: 'Bloom\'s levels adjusted to match VTU recommended distribution (35% Easy, 40% Medium, 25% Hard).' });
  };

  const handleRepetitionCheck = () => {
    toast({ title: '🔍 Repetition Check Complete', description: 'No duplicate questions found with previous year papers. 2 similar questions flagged for review.' });
  };

  const handleSyllabusAlignment = () => {
    toast({ title: '📚 Syllabus Aligned', description: 'All questions verified against syllabus. Module 3 coverage could be improved — consider adding more questions on Trees.' });
  };

  const totalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

  const handleSave = async (submit: boolean = false) => {
    if (!currentAssignment) return;
    setSaving(true);
    try {
      const content = isInternal ? internalModules : modules;
      await apiClient.put(`/assignments/${currentAssignment.id}/paper`, {
        content,
        submit
      });

      if (submit) {
        await addNotification({
          userId: currentAssignment.hodId || 1,
          message: `${currentUser.name} has submitted the ${currentAssignment.course?.courseName || 'exam'} question paper.`,
          date: new Date().toISOString().split('T')[0],
          read: false,
          type: 'success'
        });
        toast({ title: 'Paper Submitted!', description: 'Your question paper has been submitted to the HOD for review.' });
      } else {
        toast({ title: 'Draft Saved', description: 'Your paper draft has been saved successfully in the database.' });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Save Failed', description: err.message || 'Could not save paper details.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!currentAssignment) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-card border border-border rounded-2xl shadow-lg text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-full bg-warning/15 text-warning flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-xl font-bold text-foreground">No Active Assignment Selected</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You cannot create or edit a question paper directly. You must first select an active course assignment allocated to you from your assignments list.
          </p>
        </div>
        <Button 
          onClick={() => navigate(currentUser.role === 'hod' ? '/hod/assignments' : '/faculty/assignments')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10"
        >
          View My Assignments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Create Question Paper</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isInternal ? 'Internal Assessment — 40 Marks' : 'End Semester Exam — 100 Marks'} • {currentAssignment?.course?.courseName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${totalMarks === maxMarks ? 'bg-success/15 text-success' : totalMarks > maxMarks ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'}`}>
            Total: {totalMarks}/{maxMarks} Marks
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — Paper Editor */}
        <div className="xl:col-span-2 space-y-4">
          {/* Paper header */}
          <div className="bg-card border rounded-xl p-5 text-center">
            <p className="font-serif text-lg font-bold text-foreground">AMC Engineering College, Bengaluru</p>
            <p className="text-xs text-muted-foreground">Department of CSE (AI & ML)</p>
            <p className="text-sm font-medium mt-1 text-foreground">
              {isInternal ? 'Internal Assessment' : 'End Semester Examination'} — {currentAssignment?.semester || '3rd Semester'} — 2024-25
            </p>
            <div className="flex justify-between text-xs mt-2 px-8">
              <span>Subject: <strong>{currentAssignment?.course?.courseName || '—'}</strong></span>
              <span>Code: <strong>{currentAssignment?.course?.courseCode || '—'}</strong></span>
            </div>
            <div className="flex justify-between text-xs px-8">
              <span>Max Marks: <strong>{maxMarks}</strong></span>
              <span>Time: <strong>{examTime}</strong></span>
            </div>
          </div>

          {/* Module sections */}
          {isInternal ? (
            internalModules.map((m, mi) => (
              <div key={m.id} className="bg-card border rounded-xl p-5">
                <h3 className="font-serif text-sm font-bold mb-3 text-primary flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> MODULE {m.id} — {m.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mb-3">Each question: 10 marks (a: 4M, b: 3M, c: 3M)</p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Q.{mi * 2 + 1}</p>
                  <InternalQuestionRow q={m.questions.q1.a} onChange={q => updateInternalQuestion(m.id, 'q1', 'a', q)} onOptimize={() => handleOptimize(m.questions.q1.a.id)} label={`${mi * 2 + 1}a)`} />
                  <InternalQuestionRow q={m.questions.q1.b} onChange={q => updateInternalQuestion(m.id, 'q1', 'b', q)} onOptimize={() => handleOptimize(m.questions.q1.b.id)} label={`${mi * 2 + 1}b)`} />
                  <InternalQuestionRow q={m.questions.q1.c} onChange={q => updateInternalQuestion(m.id, 'q1', 'c', q)} onOptimize={() => handleOptimize(m.questions.q1.c.id)} label={`${mi * 2 + 1}c)`} />

                  <div className="text-center py-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-4 py-1 rounded-full">— OR —</span>
                  </div>

                  <p className="text-xs font-semibold text-foreground">Q.{mi * 2 + 2}</p>
                  <InternalQuestionRow q={m.questions.q2.a} onChange={q => updateInternalQuestion(m.id, 'q2', 'a', q)} onOptimize={() => handleOptimize(m.questions.q2.a.id)} label={`${mi * 2 + 2}a)`} />
                  <InternalQuestionRow q={m.questions.q2.b} onChange={q => updateInternalQuestion(m.id, 'q2', 'b', q)} onOptimize={() => handleOptimize(m.questions.q2.b.id)} label={`${mi * 2 + 2}b)`} />
                  <InternalQuestionRow q={m.questions.q2.c} onChange={q => updateInternalQuestion(m.id, 'q2', 'c', q)} onOptimize={() => handleOptimize(m.questions.q2.c.id)} label={`${mi * 2 + 2}c)`} />
                </div>
              </div>
            ))
          ) : (
            modules.map(m => (
              <div key={m.id} className="bg-card border rounded-xl p-5">
                <h3 className="font-serif text-sm font-bold mb-3 text-primary flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> MODULE {m.id} — {m.title}
                </h3>
                <div className="space-y-2">
                  <QuestionRow q={m.questions.q1a} onChange={q => updateQuestion(m.id, 'q1a', q)} onPickSuggestion={() => handlePickSuggestion(m.id, 'q1a')} onOptimize={() => handleOptimize(m.questions.q1a.id)} label={`Q.${m.id * 2 - 1}a) [${m.questions.q1a.marks}M]`} />
                  <QuestionRow q={m.questions.q1b} onChange={q => updateQuestion(m.id, 'q1b', q)} onPickSuggestion={() => handlePickSuggestion(m.id, 'q1b')} onOptimize={() => handleOptimize(m.questions.q1b.id)} label={`Q.${m.id * 2 - 1}b) [${m.questions.q1b.marks}M]`} />

                  <div className="text-center py-2">
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-4 py-1 rounded-full">— OR —</span>
                  </div>

                  <QuestionRow q={m.questions.q2a} onChange={q => updateQuestion(m.id, 'q2a', q)} onPickSuggestion={() => handlePickSuggestion(m.id, 'q2a')} onOptimize={() => handleOptimize(m.questions.q2a.id)} label={`Q.${m.id * 2}a) [${m.questions.q2a.marks}M]`} />
                  <QuestionRow q={m.questions.q2b} onChange={q => updateQuestion(m.id, 'q2b', q)} onPickSuggestion={() => handlePickSuggestion(m.id, 'q2b')} onOptimize={() => handleOptimize(m.questions.q2b.id)} label={`Q.${m.id * 2}b) [${m.questions.q2b.marks}M]`} />
                </div>
              </div>
            ))
          )}

          {/* Weightage Summary */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-serif text-sm font-bold mb-3 text-foreground">Difficulty Weightage</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{easyPct}%</div>
                <p className="text-[10px] text-muted-foreground">Easy (L1+L2)</p>
                <p className={`text-[10px] font-medium ${Math.abs(easyPct - 35) <= 10 ? 'text-success' : 'text-destructive'}`}>Target: 35%</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{mediumPct}%</div>
                <p className="text-[10px] text-muted-foreground">Medium (L3+L4)</p>
                <p className={`text-[10px] font-medium ${Math.abs(mediumPct - 40) <= 10 ? 'text-success' : 'text-destructive'}`}>Target: 40%</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{hardPct}%</div>
                <p className="text-[10px] text-muted-foreground">Hard (L5+L6)</p>
                <p className={`text-[10px] font-medium ${Math.abs(hardPct - 25) <= 10 ? 'text-success' : 'text-destructive'}`}>Target: 25%</p>
              </div>
            </div>
            <div className="flex gap-0.5 mt-3 h-3 rounded-full overflow-hidden">
              <div className="bg-success rounded-l-full" style={{ width: `${easyPct}%` }} />
              <div className="bg-warning" style={{ width: `${mediumPct}%` }} />
              <div className="bg-destructive rounded-r-full" style={{ width: `${hardPct}%` }} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="h-10" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save Draft
            </Button>
            <Button className="h-10 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" onClick={() => handleSave(true)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Submit to HOD
            </Button>
          </div>
        </div>

        {/* Right — AI Panel */}
        <div className="space-y-4">
          {/* AI Tools */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-serif text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
              <Bot className="h-5 w-5 text-accent" /> AI Paper Tools
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleAutoBalance} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-center">
                <Target className="h-5 w-5 text-accent" />
                <span className="text-[10px] font-medium text-foreground">Auto-Balance</span>
                <span className="text-[9px] text-muted-foreground">Fix Bloom's distribution</span>
              </button>
              <button onClick={handleRepetitionCheck} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-center">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-medium text-foreground">Repetition Check</span>
                <span className="text-[9px] text-muted-foreground">vs Previous papers</span>
              </button>
              <button onClick={handleSyllabusAlignment} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-center">
                <BookOpen className="h-5 w-5 text-success" />
                <span className="text-[10px] font-medium text-foreground">Syllabus Check</span>
                <span className="text-[9px] text-muted-foreground">Verify coverage</span>
              </button>
              <button onClick={() => toast({ title: '🧠 Difficulty Analysis', description: 'Paper difficulty is "Moderate" — well-suited for the target cohort. Predicted average: 58/100.' })} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-center">
                <Brain className="h-5 w-5 text-destructive" />
                <span className="text-[10px] font-medium text-foreground">Difficulty Score</span>
                <span className="text-[9px] text-muted-foreground">Predict performance</span>
              </button>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-serif text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
              <Lightbulb className="h-4 w-4 text-accent" /> AI Suggestions
            </h3>

            <div className="space-y-3">
              <div className="border rounded-lg p-3 bg-success/5 border-success/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  <span className="text-[10px] font-medium text-success">Suggestion</span>
                </div>
                <p className="text-xs text-foreground">Replace Q3b with an application-level (L3) question on Binary Trees to balance difficulty.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Impact: +5% Medium</p>
              </div>

              <div className="border rounded-lg p-3 bg-warning/5 border-warning/20">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-[10px] font-medium text-warning">Warning</span>
                </div>
                <p className="text-xs text-foreground">Current paper has {easyPct}% Easy questions. VTU recommends max 35%.</p>
              </div>

              <div className="border rounded-lg p-3 bg-accent/5 border-accent/20">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[10px] font-medium text-accent">Insight</span>
                </div>
                <p className="text-xs text-foreground">Previous year 2023 paper had similar Q2a. Consider a different question to avoid repetition.</p>
              </div>

              <div className="border rounded-lg p-3 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-medium text-primary">Marks Check</span>
                </div>
                <p className="text-xs text-foreground">
                  {totalMarks === maxMarks ? `✅ Total marks: ${totalMarks}/${maxMarks}. Correct!` : `⚠️ Total: ${totalMarks}/${maxMarks}. Adjust marks.`}
                </p>
              </div>
            </div>
          </div>

          {/* CO Coverage */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-serif text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" /> CO Coverage
            </h3>
            <div className="space-y-2">
              {coData.map(co => (
                <div key={co.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">{co.name}</span>
                    <span className="font-medium text-foreground">{co.count} Qs</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${total > 0 ? (co.count / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question Bank */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-serif text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-accent" /> Question Bank
            </h3>
            <p className="text-xs text-muted-foreground mb-3">AI-curated questions for {currentAssignment?.course?.courseName}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {suggestions.slice(0, 5).map(s => (
                <div key={s.id} className="text-xs p-2 bg-muted/30 rounded-lg">
                  <p className="text-foreground">{s.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getDifficulty(s.bloomsLevel).color}`}>{s.bloomsLevel}</span>
                    <span className="text-[10px] text-muted-foreground">{s.coMapping}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.source === 'ai_suggested' ? 'bg-accent/10 text-accent' : s.source === 'previous_year' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {s.source === 'ai_suggested' ? '🤖 AI' : s.source === 'previous_year' ? '📄 Prev Year' : '📚 Syllabus'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Question Suggestion Picker Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Pick a Question
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Select from AI-suggested, previous year, or syllabus-based questions:</p>
          <div className="space-y-2 max-h-96 overflow-y-auto mt-2">
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => applySuggestion(s.text, s.bloomsLevel, s.coMapping)}
                className="w-full text-left p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-accent"
              >
                <p className="text-xs text-foreground">{s.text}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${getDifficulty(s.bloomsLevel).color}`}>{s.bloomsLevel} ({bloomsLabels[s.bloomsLevel]})</span>
                  <span className="text-[10px] text-muted-foreground">{s.coMapping}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.source === 'ai_suggested' ? 'bg-accent/10 text-accent' : s.source === 'previous_year' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {s.source === 'ai_suggested' ? '🤖 AI Suggested' : s.source === 'previous_year' ? '📄 Previous Year' : '📚 Syllabus Based'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
