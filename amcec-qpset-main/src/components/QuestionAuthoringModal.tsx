import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ShieldCheck, Sparkles, Sigma, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { MathView } from './MathView';
import { SvgDiagramCanvas } from './SvgDiagramCanvas';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

export interface QuestionPartForm {
  partLabel: string;
  marks: number;
  bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  coCode: string;
  markingRubric: { stepNo: number; description: string; marks: number }[];
  modelAnswer: string;
}

interface QuestionAuthoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Array<{ id: number; courseCode: string; courseName: string; semester: string }>;
  onQuestionCreated?: () => void;
}

export const QuestionAuthoringModal: React.FC<QuestionAuthoringModalProps> = ({
  open,
  onOpenChange,
  courses,
  onQuestionCreated
}) => {
  const [courseId, setCourseId] = useState<string>(courses[0]?.id?.toString() || '');
  const [unitNumber, setUnitNumber] = useState<string>('1');
  const [topic, setTopic] = useState<string>('');
  const [subtopic, setSubtopic] = useState<string>('');
  const [stemText, setStemText] = useState<string>('');
  const [embeddedSvg, setEmbeddedSvg] = useState<string>('');
  const [showSvgCanvas, setShowSvgCanvas] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [parts, setParts] = useState<QuestionPartForm[]>([
    {
      partLabel: '(a)',
      marks: 10,
      bloomsLevel: 'L2',
      coCode: 'CO1',
      markingRubric: [
        { stepNo: 1, description: 'Core architectural definition', marks: 4 },
        { stepNo: 2, description: 'Working principle & mathematical formula', marks: 4 },
        { stepNo: 3, description: 'Diagrammatic clarity & neatness', marks: 2 }
      ],
      modelAnswer: ''
    }
  ]);

  // Insert math LaTeX symbol
  const insertLatex = (symbol: string) => {
    setStemText((prev) => prev + ` ${symbol} `);
  };

  const handleAddPart = () => {
    const nextChar = String.fromCharCode(97 + parts.length); // a, b, c, d
    setParts((prev) => [
      ...prev,
      {
        partLabel: `(${nextChar})`,
        marks: 10,
        bloomsLevel: 'L3',
        coCode: 'CO1',
        markingRubric: [{ stepNo: 1, description: 'Step description', marks: 5 }],
        modelAnswer: ''
      }
    ]);
  };

  const handleRemovePart = (index: number) => {
    if (parts.length <= 1) {
      toast.error('Question must have at least one sub-part');
      return;
    }
    setParts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePartChange = <K extends keyof QuestionPartForm>(index: number, key: K, value: QuestionPartForm[K]) => {
    setParts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleAddRubricStep = (partIndex: number) => {
    setParts((prev) => {
      const copy = [...prev];
      const target = copy[partIndex];
      const nextStepNo = target.markingRubric.length + 1;
      target.markingRubric = [...target.markingRubric, { stepNo: nextStepNo, description: '', marks: 2 }];
      return copy;
    });
  };

  const handleRemoveRubricStep = (partIndex: number, stepIndex: number) => {
    setParts((prev) => {
      const copy = [...prev];
      const target = copy[partIndex];
      target.markingRubric = target.markingRubric.filter((_, idx) => idx !== stepIndex);
      return copy;
    });
  };

  const totalMarks = parts.reduce((acc, p) => acc + (Number(p.marks) || 0), 0);

  const handleSubmit = async () => {
    if (!courseId) {
      toast.error('Please select a course');
      return;
    }
    if (!topic.trim()) {
      toast.error('Please specify the syllabus topic');
      return;
    }
    if (!stemText.trim()) {
      toast.error('Please enter the question stem text');
      return;
    }

    try {
      setSubmitting(true);
      const combinedRichContent = {
        text: stemText,
        svg: embeddedSvg || null
      };

      const payload = {
        courseId: parseInt(courseId, 10),
        unitNumber: parseInt(unitNumber, 10),
        topic,
        subtopic: subtopic || undefined,
        stemRichJson: combinedRichContent,
        plainText: `${stemText} ${parts.map(p => `${p.partLabel} ${p.bloomsLevel} ${p.coCode}`).join(' ')}`,
        parts: parts.map((p, idx) => ({
          partLabel: p.partLabel,
          marks: Number(p.marks),
          bloomsLevel: p.bloomsLevel,
          coCode: p.coCode,
          markingRubric: p.markingRubric,
          modelAnswerJson: p.modelAnswer ? { text: p.modelAnswer } : null
        }))
      };

      const res: any = await apiClient.post('/bank/questions', payload);
      if (res?.success) {
        toast.success(`Question ${res.code} authoring completed & vault-encrypted!`);
        onOpenChange(false);
        if (onQuestionCreated) onQuestionCreated();
      }
    } catch (err: any) {
      toast.error(err.message || err.response?.data?.error || 'Failed to author question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <DialogTitle className="text-xl font-bold">Autonomous Question Bank Authoring</DialogTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> AES-256-GCM Vault Protected
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Author high-validity examination items with LaTeX math symbols, vector diagrams, Bloom's Taxonomy, and Granular Step-Marking rubrics.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {/* Row 1: Course & Unit */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Course / Subject *</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.courseCode} - {c.courseName} (Sem {c.semester})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">VTU Unit / Module *</Label>
              <Select value={unitNumber} onValueChange={setUnitNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Unit 1 (Module 1)</SelectItem>
                  <SelectItem value="2">Unit 2 (Module 2)</SelectItem>
                  <SelectItem value="3">Unit 3 (Module 3)</SelectItem>
                  <SelectItem value="4">Unit 4 (Module 4)</SelectItem>
                  <SelectItem value="5">Unit 5 (Module 5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cumulative Marks</Label>
              <div className="h-10 flex items-center px-3 border rounded-md bg-muted/30 font-bold text-sm text-primary">
                {totalMarks} Marks
              </div>
            </div>
          </div>

          {/* Row 2: Topic & Subtopic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Syllabus Topic *</Label>
              <Input
                placeholder="e.g. Distributed Consensus & Raft Protocol"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subtopic / Context</Label>
              <Input
                placeholder="e.g. Leader Election & Heartbeat Mechanisms"
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Question Stem with LaTeX Math Palette */}
          <div className="space-y-2 border rounded-xl p-4 bg-muted/10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sigma className="w-4 h-4 text-primary" /> Question Stem / Problem Statement *
              </Label>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-muted-foreground mr-1">LaTeX Symbols:</span>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\frac{a}{b}$')}>a/b</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\sqrt{x}$')}>√x</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\sum_{i=1}^{n}$')}>∑</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\int_{a}^{b}$')}>∫</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\le$')}>≤</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\ge$')}>≥</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\neq$')}>≠</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\alpha$')}>α</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\beta$')}>β</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-xs font-mono" onClick={() => insertLatex('$\\lambda$')}>λ</Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400"
                  onClick={() => setShowSvgCanvas(!showSvgCanvas)}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> {showSvgCanvas ? 'Hide Diagram Canvas' : 'Add Vector Diagram'}
                </Button>
              </div>
            </div>

            <Textarea
              placeholder="Enter question text with LaTeX formulas ($x^2 + y^2 = r^2$) and instructions..."
              value={stemText}
              onChange={(e) => setStemText(e.target.value)}
              rows={4}
              className="font-sans text-sm"
            />

            {/* Live KaTeX Preview */}
            {stemText && (
              <div className="p-3 border rounded-lg bg-card text-card-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Live Mathematical Rendering Preview:
                </span>
                <MathView content={stemText} />
              </div>
            )}

            {/* Embedded SVG Canvas */}
            {showSvgCanvas && (
              <div className="pt-2">
                <SvgDiagramCanvas
                  initialSvg={embeddedSvg}
                  onSave={(svg) => {
                    setEmbeddedSvg(svg);
                    setShowSvgCanvas(false);
                    toast.success('Vector diagram embedded into question!');
                  }}
                  onCancel={() => setShowSvgCanvas(false)}
                />
              </div>
            )}

            {embeddedSvg && !showSvgCanvas && (
              <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium">Vector diagram embedded successfully</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-rose-500 hover:text-rose-600"
                  onClick={() => setEmbeddedSvg('')}
                >
                  Remove Diagram
                </Button>
              </div>
            )}
          </div>

          {/* Row 4: Sub-parts Manager with Step-Marking Rubrics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Question Sub-Parts & Granular Step-Marking</h4>
                <p className="text-xs text-muted-foreground">Define sub-divisions (a, b, c) with Bloom's Taxonomy, CO mapping, and marking rubrics.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddPart} className="text-xs flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Sub-Part
              </Button>
            </div>

            {parts.map((part, partIdx) => (
              <div key={partIdx} className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-primary">{part.partLabel}</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Marks:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={part.marks}
                        onChange={(e) => handlePartChange(partIdx, 'marks', parseInt(e.target.value, 10) || 0)}
                        className="w-20 h-8 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Bloom's:</Label>
                      <Select
                        value={part.bloomsLevel}
                        onValueChange={(val: any) => handlePartChange(partIdx, 'bloomsLevel', val)}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L1">L1 - Remember</SelectItem>
                          <SelectItem value="L2">L2 - Understand</SelectItem>
                          <SelectItem value="L3">L3 - Apply</SelectItem>
                          <SelectItem value="L4">L4 - Analyze</SelectItem>
                          <SelectItem value="L5">L5 - Evaluate</SelectItem>
                          <SelectItem value="L6">L6 - Create</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">CO:</Label>
                      <Select
                        value={part.coCode}
                        onValueChange={(val) => handlePartChange(partIdx, 'coCode', val)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CO1">CO1</SelectItem>
                          <SelectItem value="CO2">CO2</SelectItem>
                          <SelectItem value="CO3">CO3</SelectItem>
                          <SelectItem value="CO4">CO4</SelectItem>
                          <SelectItem value="CO5">CO5</SelectItem>
                          <SelectItem value="CO6">CO6</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {parts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePart(partIdx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step-Marking Scheme Rubric Table */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Scheme of Evaluation (Step-Marking Breakdown)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddRubricStep(partIdx)}
                      className="h-6 text-xs text-primary hover:underline px-1"
                    >
                      + Add Step
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {part.markingRubric.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-12">Step {step.stepNo}:</span>
                        <Input
                          placeholder="e.g. Derivation of equation (2 marks) or Block diagram"
                          value={step.description}
                          onChange={(e) => {
                            const updated = [...part.markingRubric];
                            updated[stepIdx].description = e.target.value;
                            handlePartChange(partIdx, 'markingRubric', updated);
                          }}
                          className="h-7 text-xs flex-1"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="1"
                            value={step.marks}
                            onChange={(e) => {
                              const updated = [...part.markingRubric];
                              updated[stepIdx].marks = parseInt(e.target.value, 10) || 0;
                              handlePartChange(partIdx, 'markingRubric', updated);
                            }}
                            className="w-16 h-7 text-xs font-bold"
                          />
                          <span className="text-xs text-muted-foreground">marks</span>
                        </div>
                        {part.markingRubric.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRubricStep(partIdx, stepIdx)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Total marks: <strong>{totalMarks}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Encrypting & Storing...' : 'Save to Vault'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
