import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubpartEditor } from './SubpartEditor';
import { QuestionBankDrawer } from './QuestionBankDrawer';
import { FullQuestion, QuestionSubpart, createDefaultSubpart } from './types';
import { Plus, Database, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface FullQuestionCardProps {
  question: FullQuestion;
  moduleNumber: number;
  courseId: number;
  expectedMarks?: number; // default: 20
  onChange: (updated: FullQuestion) => void;
}

export const FullQuestionCard: React.FC<FullQuestionCardProps> = ({
  question,
  moduleNumber,
  courseId,
  expectedMarks = 20,
  onChange,
}) => {
  const [bankDrawerOpen, setBankDrawerOpen] = useState(false);

  const totalMarks = question.subparts.reduce((sum, sp) => sum + (Number(sp.marks) || 0), 0);
  const isBalanced = totalMarks === expectedMarks;
  const difference = expectedMarks - totalMarks;

  const handleUpdateSubpart = (index: number, updated: QuestionSubpart) => {
    const newSubparts = [...question.subparts];
    newSubparts[index] = updated;
    onChange({ ...question, subparts: newSubparts });
  };

  const handleAddSubpart = () => {
    const letters = ['(a)', '(b)', '(c)', '(d)', '(e)'];
    const nextLabel = letters[question.subparts.length] || `(${String.fromCharCode(97 + question.subparts.length)})`;
    const remainingMarks = Math.max(1, difference > 0 ? difference : 5);

    const newSubpart = createDefaultSubpart(nextLabel, remainingMarks, 'L3', `CO${moduleNumber}`);
    onChange({ ...question, subparts: [...question.subparts, newSubpart] });
  };

  const handleDeleteSubpart = (index: number) => {
    const filtered = question.subparts.filter((_, i) => i !== index);
    // Relabel remaining subparts (a), (b), (c)
    const letters = ['(a)', '(b)', '(c)', '(d)', '(e)'];
    const reLabeled = filtered.map((sp, idx) => ({ ...sp, partLabel: letters[idx] || sp.partLabel }));
    onChange({ ...question, subparts: reLabeled });
  };

  const handleImportFromBank = (importedParts: QuestionSubpart[]) => {
    onChange({ ...question, subparts: importedParts });
  };

  return (
    <div className="bg-card border rounded-xl p-4 shadow-xs space-y-4">
      {/* Question Header & Mark Balance Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-foreground font-serif">
            Question {question.questionNumber}
          </span>
          <span className="text-xs text-muted-foreground">
            ({question.subparts.length} Subpart{question.subparts.length > 1 ? 's' : ''})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mark Balance Pill */}
          <Badge
            variant="outline"
            className={`text-xs font-mono font-bold px-2.5 py-1 ${
              isBalanced
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : difference > 0
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            }`}
          >
            {isBalanced ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {totalMarks} / {expectedMarks} Marks (Balanced)
              </span>
            ) : difference > 0 ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {totalMarks} / {expectedMarks} Marks (Need {difference}M)
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {totalMarks} / {expectedMarks} Marks (+{Math.abs(difference)}M Surplus)
              </span>
            )}
          </Badge>

          {/* Import from Bank */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBankDrawerOpen(true)}
            className="h-8 text-xs gap-1.5 bg-muted/30 hover:bg-primary/5 hover:text-primary hover:border-primary"
          >
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Bank Import</span>
          </Button>
        </div>
      </div>

      {/* Subparts List */}
      <div className="space-y-3">
        {question.subparts.map((sp, idx) => (
          <SubpartEditor
            key={sp.id}
            subpart={sp}
            moduleNumber={moduleNumber}
            onChange={(updated) => handleUpdateSubpart(idx, updated)}
            onDelete={() => handleDeleteSubpart(idx)}
            canDelete={question.subparts.length > 1}
          />
        ))}
      </div>

      {/* Add Subpart Button */}
      <div className="pt-1 flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSubpart}
          disabled={question.subparts.length >= 4}
          className="h-8 text-xs gap-1.5 border-dashed hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Subpart ({['(a)', '(b)', '(c)', '(d)'][question.subparts.length] || '+'})
        </Button>
      </div>

      {/* Bank Import Drawer */}
      <QuestionBankDrawer
        open={bankDrawerOpen}
        onOpenChange={setBankDrawerOpen}
        courseId={courseId}
        moduleNumber={moduleNumber}
        onSelectQuestion={handleImportFromBank}
      />
    </div>
  );
};
