import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MathView } from '@/components/MathView';
import { RubricStep } from './types';
import { Plus, Trash2, CheckCircle2, AlertTriangle, FileSpreadsheet, Sparkles, BookOpen } from 'lucide-react';

interface SchemeOfEvaluationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subpartLabel: string;
  subpartMarks: number;
  questionText: string;
  rubric: RubricStep[];
  modelAnswer: string;
  onSave: (rubric: RubricStep[], modelAnswer: string) => void;
}

export const SchemeOfEvaluationDrawer: React.FC<SchemeOfEvaluationDrawerProps> = ({
  open,
  onOpenChange,
  subpartLabel,
  subpartMarks,
  questionText,
  rubric: initialRubric,
  modelAnswer: initialModelAnswer,
  onSave,
}) => {
  const [steps, setSteps] = React.useState<RubricStep[]>(initialRubric);
  const [modelAnswer, setModelAnswer] = React.useState<string>(initialModelAnswer);

  React.useEffect(() => {
    setSteps(initialRubric);
    setModelAnswer(initialModelAnswer);
  }, [initialRubric, initialModelAnswer, open]);

  const allocatedMarks = steps.reduce((sum, s) => sum + (Number(s.marks) || 0), 0);
  const isMarksBalanced = allocatedMarks === subpartMarks;

  const addStep = () => {
    const nextStepNo = steps.length + 1;
    const remaining = Math.max(0, subpartMarks - allocatedMarks);
    setSteps([
      ...steps,
      {
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        stepNo: nextStepNo,
        description: '',
        marks: remaining > 0 ? remaining : 1,
      },
    ]);
  };

  const updateStep = (id: string, field: 'description' | 'marks', value: any) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const deleteStep = (id: string) => {
    const filtered = steps.filter((s) => s.id !== id);
    setSteps(filtered.map((s, idx) => ({ ...s, stepNo: idx + 1 })));
  };

  const handleSave = () => {
    onSave(steps, modelAnswer);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Granular Scheme of Evaluation & Rubric</span>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Part {subpartLabel} • {subpartMarks} Marks
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Define step-by-step marking rubrics and model solutions for valuation camp examiners.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rubric Sum:</span>
              <Badge
                variant="outline"
                className={`text-xs font-mono font-bold ${
                  isMarksBalanced
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                }`}
              >
                {allocatedMarks} / {subpartMarks} Marks
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          {/* Question Stem Quote */}
          {questionText && (
            <div className="p-3 rounded-lg border bg-muted/20 text-xs">
              <span className="font-semibold text-muted-foreground block mb-0.5">Question Stem:</span>
              <MathView content={questionText} className="line-clamp-2" />
            </div>
          )}

          {/* Granular Step Marking Rubrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                Step-Wise Mark Distribution
              </span>
              <Button size="sm" variant="outline" onClick={addStep} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Add Rubric Step
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden divide-y bg-card">
              <div className="grid grid-cols-12 bg-muted/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">
                <div className="col-span-1">Step</div>
                <div className="col-span-9">Evaluator Expectation / Description</div>
                <div className="col-span-2 text-right">Marks</div>
              </div>

              {steps.map((step) => (
                <div key={step.id} className="grid grid-cols-12 items-center gap-2 p-2.5 hover:bg-muted/20 text-xs">
                  <div className="col-span-1 font-mono font-bold text-center text-muted-foreground">
                    #{step.stepNo}
                  </div>
                  <div className="col-span-9">
                    <Input
                      value={step.description}
                      onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                      placeholder="e.g. Definition of Stack and LIFO concept (2M)"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <Input
                      type="number"
                      value={step.marks}
                      onChange={(e) => updateStep(step.id, 'marks', Number(e.target.value))}
                      className="text-xs h-8 w-14 text-center font-bold font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => deleteStep(step.id)}
                      className="text-muted-foreground hover:text-rose-500 p-1 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!isMarksBalanced && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Rubric marks total <strong>{allocatedMarks}</strong>, but question total is{' '}
                  <strong>{subpartMarks}</strong>. Please adjust step marks to balance.
                </span>
              </div>
            )}
          </div>

          {/* Model Answer / Solution */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Model Solution / Answer Key / Derivation Steps
            </label>
            <textarea
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              rows={4}
              className="w-full text-xs p-2.5 rounded-lg border bg-card focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-mono"
              placeholder="Provide solution, key formulas, expected diagrams, or algorithm code for evaluators..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 bg-primary text-primary-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Attach Scheme to Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
