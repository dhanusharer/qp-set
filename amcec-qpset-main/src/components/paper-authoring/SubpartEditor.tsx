import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MathView } from '@/components/MathView';
import { SvgDiagramCanvas } from '@/components/SvgDiagramCanvas';
import { LatexMathModal } from './LatexMathModal';
import { SchemeOfEvaluationDrawer } from './SchemeOfEvaluationDrawer';
import { QuestionFramerDrawer } from './QuestionFramerDrawer';
import { QuestionSubpart, BLOOMS_LABELS, CO_OPTIONS, RubricStep } from './types';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import {
  Sigma,
  Image as ImageIcon,
  Code,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Wand2,
  Share2,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SubpartEditorProps {
  subpart: QuestionSubpart;
  onChange: (updated: QuestionSubpart) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  moduleNumber?: number;
  courseCode?: string;
  courseName?: string;
  courseId?: number;
}

export const SubpartEditor: React.FC<SubpartEditorProps> = ({
  subpart,
  onChange,
  onDelete,
  canDelete = true,
  moduleNumber = 1,
  courseCode = '21CS32',
  courseName = 'Data Structures & Applications',
  courseId,
}) => {
  const { toast } = useToast();
  const [mathModalOpen, setMathModalOpen] = useState(false);
  const [schemeDrawerOpen, setSchemeDrawerOpen] = useState(false);
  const [framerOpen, setFramerOpen] = useState(false);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Push to Department Question Bank state
  const [pushBankModalOpen, setPushBankModalOpen] = useState(false);
  const [pushingToBank, setPushingToBank] = useState(false);
  const [bankTopic, setBankTopic] = useState(`Module ${moduleNumber} Core Concepts`);
  const [bankSubtopic, setBankSubtopic] = useState('');

  const bloomsConfig = BLOOMS_LABELS[subpart.bloomsLevel] || BLOOMS_LABELS.L3;

  const rubricTotal = subpart.markingRubric.reduce((sum, r) => sum + (Number(r.marks) || 0), 0);
  const isRubricBalanced = rubricTotal === subpart.marks;

  const handleInsertLatex = (latexText: string) => {
    const updated = subpart.text ? `${subpart.text} ${latexText}` : latexText;
    onChange({ ...subpart, text: updated });
  };

  const handleSaveDiagram = (svgString: string) => {
    onChange({ ...subpart, svgDiagram: svgString });
    setDiagramModalOpen(false);
  };

  const handleSaveRubric = (rubric: RubricStep[], modelAnswer: string) => {
    onChange({ ...subpart, markingRubric: rubric, modelAnswer });
  };

  // Push question to Department Question Bank
  const handlePushToBank = async () => {
    if (!subpart.text || subpart.text.trim().length < 3) return;
    setPushingToBank(true);
    try {
      const payload = {
        courseId: courseId || 1,
        unitNumber: moduleNumber,
        topic: bankTopic.trim() || `Module ${moduleNumber} Core Concepts`,
        subtopic: bankSubtopic.trim() || undefined,
        plainText: subpart.text,
        stemRichJson: {
          text: subpart.text,
          latexEquation: subpart.latexEquation,
          svgDiagram: subpart.svgDiagram,
          codeSnippet: subpart.codeSnippet,
        },
        parts: [
          {
            partLabel: subpart.partLabel,
            marks: Number(subpart.marks) || 10,
            bloomsLevel: subpart.bloomsLevel,
            coCode: subpart.coMapping,
            markingRubric: subpart.markingRubric,
            modelAnswerJson: subpart.modelAnswer ? { answer: subpart.modelAnswer } : undefined,
          },
        ],
        status: 'DRAFT',
      };

      const res: any = await apiClient.post('/bank/questions', payload);
      const newQuestionId = res?.data?.questionId || res?.questionId;
      const questionCode = res?.data?.code || res?.code;

      onChange({
        ...subpart,
        bankQuestionId: newQuestionId,
      });

      toast({
        title: 'Question Contributed to Bank! 🏦',
        description: `Successfully added to Department Bank with Code: ${questionCode || `#${newQuestionId}`}`,
      });

      setPushBankModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Contribution Failed',
        description: err.message || 'Could not contribute question to department bank.',
        variant: 'destructive',
      });
    } finally {
      setPushingToBank(false);
    }
  };

  return (
    <div className="p-3.5 rounded-lg border bg-card/60 hover:border-border transition-all space-y-3">
      {/* Subpart Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
            Part {subpart.partLabel}
          </span>

          {/* Bloom's Level Selector */}
          <select
            value={subpart.bloomsLevel}
            onChange={(e) => {
              const b = e.target.value as any;
              const diff = ['L1', 'L2'].includes(b) ? 'Easy' : ['L3', 'L4'].includes(b) ? 'Medium' : 'Hard';
              onChange({ ...subpart, bloomsLevel: b, difficulty: diff });
            }}
            className="text-xs bg-background border rounded px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {Object.entries(BLOOMS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {k}: {v.name} ({v.category})
              </option>
            ))}
          </select>

          {/* CO Selector */}
          <select
            value={subpart.coMapping}
            onChange={(e) => onChange({ ...subpart, coMapping: e.target.value })}
            className="text-xs bg-background border rounded px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CO_OPTIONS.map((co) => (
              <option key={co} value={co}>
                {co}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Marks Input */}
          <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded border">
            <span className="text-[11px] font-semibold text-muted-foreground">Marks:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={subpart.marks}
              onChange={(e) => onChange({ ...subpart, marks: Math.max(1, Number(e.target.value)) })}
              className="w-12 text-xs font-bold text-center bg-background border rounded h-6"
            />
          </div>

          {/* Delete Subpart */}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-muted-foreground hover:text-rose-500 p-1 rounded transition-colors"
              title="Delete this subpart"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Text Area */}
      <div className="space-y-1.5">
        <textarea
          value={subpart.text}
          onChange={(e) => onChange({ ...subpart, text: e.target.value })}
          rows={3}
          placeholder="Enter question text here... You can embed LaTeX math ($E=mc^2$) and diagrams."
          className="w-full text-xs p-2.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground leading-relaxed"
        />
        {(!subpart.text || subpart.text.length < 20) && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" />
              Need inspiration? Use AI Framer & PYQ Radar to browse historical questions and cognitive stems.
            </span>
            <button
              type="button"
              onClick={() => setFramerOpen(true)}
              className="text-[10px] font-semibold text-accent hover:underline flex items-center gap-0.5"
            >
              Open Framer <Wand2 className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Embedded Diagram Preview if Present */}
      {subpart.svgDiagram && (
        <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              Attached Technical Diagram
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiagramModalOpen(true)}
                className="text-primary hover:underline text-[11px]"
              >
                Edit Diagram
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...subpart, svgDiagram: undefined })}
                className="text-rose-500 hover:underline text-[11px]"
              >
                Remove
              </button>
            </div>
          </div>
          <div
            className="w-full max-h-48 overflow-hidden flex items-center justify-center p-2 bg-card rounded border"
            dangerouslySetInnerHTML={{ __html: subpart.svgDiagram }}
          />
        </div>
      )}

      {/* Code Snippet Input if Present */}
      {subpart.codeSnippet && (
        <div className="p-3 border rounded-lg bg-slate-950 text-slate-100 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Code Block ({subpart.codeSnippet.language})</span>
            <button
              type="button"
              onClick={() => onChange({ ...subpart, codeSnippet: undefined })}
              className="text-rose-400 hover:underline"
            >
              Remove
            </button>
          </div>
          <textarea
            value={subpart.codeSnippet.code}
            onChange={(e) =>
              onChange({
                ...subpart,
                codeSnippet: { ...subpart.codeSnippet!, code: e.target.value },
              })
            }
            rows={3}
            className="w-full bg-slate-900 p-2 rounded border border-slate-800 text-xs text-emerald-400 font-mono focus:outline-none"
            placeholder="// Paste C, Java, or Python code here..."
          />
        </div>
      )}

      {/* Live KaTeX Render Preview Toggle */}
      {subpart.text && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{showPreview ? 'Hide Render Preview' : 'Show LaTeX Render Preview'}</span>
          </button>
          {showPreview && (
            <div className="mt-2 p-2.5 rounded border bg-muted/10 text-xs text-foreground">
              <MathView content={subpart.text} />
            </div>
          )}
        </div>
      )}

      {/* Action Toolbar */}
      <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMathModalOpen(true)}
            className="h-7 text-[11px] gap-1 px-2.5"
          >
            <Sigma className="h-3.5 w-3.5 text-primary" />
            Math Equation
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDiagramModalOpen(true)}
            className="h-7 text-[11px] gap-1 px-2.5"
          >
            <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
            {subpart.svgDiagram ? 'Edit Diagram' : 'Attach Diagram'}
          </Button>

          {!subpart.codeSnippet && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  ...subpart,
                  codeSnippet: { language: 'c', code: 'void display() {\n    // Code here\n}' },
                })
              }
              className="h-7 text-[11px] gap-1 px-2.5"
            >
              <Code className="h-3.5 w-3.5 text-sky-500" />
              Code Block
            </Button>
          )}

          {/* AI Question Framer & PYQ Radar Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFramerOpen(true)}
            className="h-7 text-[11px] gap-1 px-2.5 bg-accent/10 text-accent border-accent/30 hover:bg-accent hover:text-accent-foreground font-semibold"
            title="Intelligent Question Framer & Historical VTU PYQs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Framer & PYQs
          </Button>

          {/* Push Question to Department Bank */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPushBankModalOpen(true)}
            disabled={!subpart.text || subpart.text.trim().length < 5}
            className="h-7 text-[11px] gap-1 px-2.5 font-medium hover:border-primary hover:text-primary"
            title="Contribute this authored question and scheme to the Department Question Bank"
          >
            <Share2 className="h-3.5 w-3.5 text-blue-500" />
            {subpart.bankQuestionId ? (
              <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Bank #{subpart.bankQuestionId}
              </span>
            ) : (
              <span>Push to Bank</span>
            )}
          </Button>
        </div>

        {/* Scheme of Evaluation Drawer Trigger */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSchemeDrawerOpen(true)}
          className={`h-7 text-[11px] gap-1.5 px-2.5 font-medium ${
            isRubricBalanced
              ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10'
              : 'border-rose-500/30 text-rose-600 bg-rose-500/5 hover:bg-rose-500/10'
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Scheme of Evaluation ({subpart.markingRubric.length} Steps)</span>
          {isRubricBalanced ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-rose-500" />
          )}
        </Button>
      </div>

      {/* KaTeX Math Editor Modal */}
      <LatexMathModal
        open={mathModalOpen}
        onOpenChange={setMathModalOpen}
        onInsert={handleInsertLatex}
      />

      {/* Scheme of Evaluation Rubric Drawer */}
      <SchemeOfEvaluationDrawer
        open={schemeDrawerOpen}
        onOpenChange={setSchemeDrawerOpen}
        subpartLabel={subpart.partLabel}
        subpartMarks={subpart.marks}
        questionText={subpart.text}
        rubric={subpart.markingRubric}
        modelAnswer={subpart.modelAnswer || ''}
        onSave={handleSaveRubric}
      />

      {/* Cognitive Question Framer & Historical PYQ Drawer */}
      <QuestionFramerDrawer
        isOpen={framerOpen}
        onClose={() => setFramerOpen(false)}
        initialPrompt={subpart.text}
        targetMarks={subpart.marks}
        targetBlooms={subpart.bloomsLevel}
        moduleNumber={moduleNumber}
        courseCode={courseCode}
        courseName={courseName}
        onAdoptQuestion={(adopted) => {
          onChange({
            ...subpart,
            text: adopted.text,
            marks: adopted.marks,
            bloomsLevel: adopted.bloomsLevel,
            coMapping: adopted.coMapping,
            markingRubric: adopted.rubricSteps,
          });
        }}
      />

      {/* SVG Diagram Canvas Modal */}
      <Dialog open={diagramModalOpen} onOpenChange={setDiagramModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Technical Diagram & Circuit Designer</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-[420px]">
            <SvgDiagramCanvas
              initialSvg={subpart.svgDiagram}
              onSave={handleSaveDiagram}
              onCancel={() => setDiagramModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Push to Department Question Bank Dialog */}
      <Dialog open={pushBankModalOpen} onOpenChange={setPushBankModalOpen}>
        <DialogContent className="max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Contribute to Department Question Bank
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Contribute this authored question, Bloom's categorization, and Scheme of Evaluation to the AMCEC Department Question Bank for faculty reuse and peer review.
          </p>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Syllabus Topic / Unit:</label>
              <Input
                value={bankTopic}
                onChange={(e) => setBankTopic(e.target.value)}
                placeholder="e.g. Binary Search Trees & AVL Rotations"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Subtopic / Specialized Area (Optional):</label>
              <Input
                value={bankSubtopic}
                onChange={(e) => setBankSubtopic(e.target.value)}
                placeholder="e.g. Deletion and Tree Balancing"
                className="h-8 text-xs"
              />
            </div>

            {/* Snapshot Metadata Pill */}
            <div className="bg-muted/40 p-3 rounded-xl border space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Module:</span>
                <span className="font-semibold">Module {moduleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marks & Bloom's:</span>
                <span className="font-semibold">{subpart.marks}M • {subpart.bloomsLevel} ({bloomsConfig.name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outcome (CO):</span>
                <span className="font-semibold">{subpart.coMapping}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheme of Evaluation:</span>
                <span className="font-semibold">{subpart.markingRubric.length} Rubric Steps Defined</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPushBankModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePushToBank}
              disabled={pushingToBank || !bankTopic.trim()}
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              {pushingToBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              Confirm Contribution
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
