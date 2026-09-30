import React from 'react';
import { FullQuestionCard } from './FullQuestionCard';
import { ExamModule, FullQuestion } from './types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ModuleAccordionProps {
  module: ExamModule;
  courseId: number;
  expectedQuestionMarks?: number; // default: 20
  onChange: (updated: ExamModule) => void;
}

export const ModuleAccordion: React.FC<ModuleAccordionProps> = ({
  module,
  courseId,
  expectedQuestionMarks = 20,
  onChange,
}) => {
  const marksA = module.questionA.subparts.reduce((sum, sp) => sum + (Number(sp.marks) || 0), 0);
  const marksB = module.questionB.subparts.reduce((sum, sp) => sum + (Number(sp.marks) || 0), 0);

  const isModuleBalanced = marksA === expectedQuestionMarks && marksB === expectedQuestionMarks;

  const handleUpdateQuestionA = (qA: FullQuestion) => {
    onChange({ ...module, questionA: qA });
  };

  const handleUpdateQuestionB = (qB: FullQuestion) => {
    onChange({ ...module, questionB: qB });
  };

  return (
    <div className="border rounded-2xl bg-card overflow-hidden shadow-xs space-y-4 p-5">
      {/* Module Title & Overall Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold font-serif text-base shrink-0">
            M{module.moduleNumber}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                Module {module.moduleNumber}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  isModuleBalanced
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}
              >
                {isModuleBalanced ? 'Balanced (20M Choice)' : 'Marks Adjustment Required'}
              </Badge>
            </div>
            <Input
              value={module.moduleTitle}
              onChange={(e) => onChange({ ...module, moduleTitle: e.target.value })}
              className="text-xs h-7 mt-1 w-full max-w-lg bg-transparent border-transparent hover:border-border focus:border-primary px-1"
              placeholder="Module syllabus topic / title..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground self-end md:self-auto font-mono">
          <span>Q{module.questionA.questionNumber}: <strong>{marksA}M</strong></span>
          <span>•</span>
          <span>Q{module.questionB.questionNumber}: <strong>{marksB}M</strong></span>
        </div>
      </div>

      {/* Question A (e.g. Q1) */}
      <FullQuestionCard
        question={module.questionA}
        moduleNumber={module.moduleNumber}
        courseId={courseId}
        expectedMarks={expectedQuestionMarks}
        onChange={handleUpdateQuestionA}
      />

      {/* Internal Choice OR Divider */}
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative px-4 py-1 rounded-full bg-background border border-border shadow-xs text-xs font-bold font-mono tracking-widest text-primary uppercase">
          OR
        </div>
      </div>

      {/* Question B (e.g. Q2) */}
      <FullQuestionCard
        question={module.questionB}
        moduleNumber={module.moduleNumber}
        courseId={courseId}
        expectedMarks={expectedQuestionMarks}
        onChange={handleUpdateQuestionB}
      />
    </div>
  );
};
