import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuestionPaperContent, ExamModule, QuestionSubpart, BLOOMS_LABELS } from './types';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ListOrdered,
  Scale,
  Brain,
  BookOpen,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';

interface AuditItemResult {
  id: string;
  name: string;
  category: 'Mark Parity' | 'Scheme of Evaluation' | 'Cognitive Balance' | 'Outcome Coverage' | 'Question Content';
  status: 'PASS' | 'WARNING' | 'FAIL';
  summary: string;
  details?: string[];
  jumpModuleNumber?: number;
}

interface ComplianceAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: QuestionPaperContent;
  onConfirmSubmit: () => void;
  submitting: boolean;
  onJumpToModule?: (moduleNumber: number) => void;
}

export const ComplianceAuditorModal: React.FC<ComplianceAuditorModalProps> = ({
  isOpen,
  onClose,
  paper,
  onConfirmSubmit,
  submitting,
  onJumpToModule,
}) => {
  // Extract all subparts across all questions
  const allSubparts = paper.modules.flatMap((m) => [
    ...m.questionA.subparts,
    ...m.questionB.subparts,
  ]);

  const auditResults: AuditItemResult[] = [];

  // 1. Audit: Module Marks Parity (20M each choice for SEE)
  const expectedMarksPerChoice = paper.maxMarks === 40 ? 10 : 20;
  const parityIssues: string[] = [];
  let firstParityModuleJump: number | undefined;

  paper.modules.forEach((mod) => {
    const marksA = mod.questionA.subparts.reduce((s, sp) => s + (Number(sp.marks) || 0), 0);
    const marksB = mod.questionB.subparts.reduce((s, sp) => s + (Number(sp.marks) || 0), 0);

    if (marksA !== expectedMarksPerChoice || marksB !== expectedMarksPerChoice) {
      parityIssues.push(
        `Module ${mod.moduleNumber}: Question A has ${marksA}M, Question B has ${marksB}M (Expected ${expectedMarksPerChoice}M each)`
      );
      if (!firstParityModuleJump) firstParityModuleJump = mod.moduleNumber;
    }
  });

  auditResults.push({
    id: 'mark_parity',
    name: 'Module Choice Marks Parity',
    category: 'Mark Parity',
    status: parityIssues.length === 0 ? 'PASS' : 'FAIL',
    summary:
      parityIssues.length === 0
        ? `All ${paper.modules.length} modules satisfy ${expectedMarksPerChoice}M internal choice parity.`
        : `${parityIssues.length} module(s) have mark discrepancies.`,
    details: parityIssues,
    jumpModuleNumber: firstParityModuleJump,
  });

  // 2. Audit: Scheme of Evaluation Completeness
  const rubricIssues: string[] = [];
  let firstRubricModuleJump: number | undefined;

  paper.modules.forEach((mod) => {
    const checkSubpart = (sp: QuestionSubpart, qLabel: string) => {
      const stepTotal = sp.markingRubric?.reduce((s, r) => s + (Number(r.marks) || 0), 0) || 0;
      if (!sp.markingRubric || sp.markingRubric.length === 0) {
        rubricIssues.push(`Module ${mod.moduleNumber} Q${qLabel} (${sp.partLabel}): No Scheme of Evaluation steps attached.`);
        if (!firstRubricModuleJump) firstRubricModuleJump = mod.moduleNumber;
      } else if (stepTotal !== Number(sp.marks)) {
        rubricIssues.push(
          `Module ${mod.moduleNumber} Q${qLabel} (${sp.partLabel}): Rubric steps sum to ${stepTotal}M, but question is ${sp.marks}M.`
        );
        if (!firstRubricModuleJump) firstRubricModuleJump = mod.moduleNumber;
      }
    };

    mod.questionA.subparts.forEach((sp) => checkSubpart(sp, `${mod.questionA.questionNumber}`));
    mod.questionB.subparts.forEach((sp) => checkSubpart(sp, `${mod.questionB.questionNumber}`));
  });

  auditResults.push({
    id: 'scheme_completeness',
    name: 'Scheme of Evaluation & Step Rubrics',
    category: 'Scheme of Evaluation',
    status: rubricIssues.length === 0 ? 'PASS' : 'FAIL',
    summary:
      rubricIssues.length === 0
        ? `100% of subparts (${allSubparts.length}) have verified marking rubrics with balanced sums.`
        : `${rubricIssues.length} subpart(s) lack balanced marking rubrics.`,
    details: rubricIssues,
    jumpModuleNumber: firstRubricModuleJump,
  });

  // 3. Audit: Cognitive Taxonomy (Bloom's HOTS >= 50%)
  const lotsMarks = allSubparts
    .filter((sp) => ['L1', 'L2'].includes(sp.bloomsLevel))
    .reduce((s, sp) => s + (Number(sp.marks) || 0), 0);
  const hotsMarks = allSubparts
    .filter((sp) => ['L3', 'L4', 'L5', 'L6'].includes(sp.bloomsLevel))
    .reduce((s, sp) => s + (Number(sp.marks) || 0), 0);
  const totalMarksCount = lotsMarks + hotsMarks;
  const hotsPercent = totalMarksCount > 0 ? Math.round((hotsMarks / totalMarksCount) * 100) : 0;

  const cognitiveStatus = hotsPercent >= 50 ? 'PASS' : hotsPercent >= 40 ? 'WARNING' : 'FAIL';
  auditResults.push({
    id: 'cognitive_balance',
    name: "Bloom's Higher Order Thinking (HOTS)",
    category: 'Cognitive Balance',
    status: cognitiveStatus,
    summary: `Higher-Order Thinking Skills (L3–L6) represent ${hotsPercent}% of question marks (Target: ≥ 50%).`,
    details:
      cognitiveStatus !== 'PASS'
        ? [`Current distribution: ${100 - hotsPercent}% LOTS (L1-L2), ${hotsPercent}% HOTS. Consider adjusting some subparts to L3/L4.`]
        : undefined,
  });

  // 4. Audit: Course Outcome Coverage
  const coveredCOs = new Set(allSubparts.map((sp) => sp.coMapping).filter(Boolean));
  const expectedCOs = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];
  const missingCOs = expectedCOs.filter((co) => !coveredCOs.has(co));

  auditResults.push({
    id: 'outcome_coverage',
    name: 'Course Outcome (CO1–CO5) Mapping',
    category: 'Outcome Coverage',
    status: missingCOs.length === 0 ? 'PASS' : missingCOs.length <= 1 ? 'WARNING' : 'FAIL',
    summary:
      missingCOs.length === 0
        ? `All standard outcomes (CO1 to CO5) are covered across the assessment.`
        : `Missing Course Outcomes: ${missingCOs.join(', ')}.`,
    details: missingCOs.length > 0 ? [`Add questions mapped to ${missingCOs.join(', ')} to ensure NBA accreditation compliance.`] : undefined,
  });

  // 5. Audit: Question Stem Substance
  const emptyQuestions: string[] = [];
  let firstEmptyModuleJump: number | undefined;

  paper.modules.forEach((mod) => {
    const checkText = (sp: QuestionSubpart, qNum: number) => {
      if (!sp.text || sp.text.trim().length < 15) {
        emptyQuestions.push(`Module ${mod.moduleNumber} Q${qNum}${sp.partLabel}: Question text is empty or too short.`);
        if (!firstEmptyModuleJump) firstEmptyModuleJump = mod.moduleNumber;
      }
    };
    mod.questionA.subparts.forEach((sp) => checkText(sp, mod.questionA.questionNumber));
    mod.questionB.subparts.forEach((sp) => checkText(sp, mod.questionB.questionNumber));
  });

  auditResults.push({
    id: 'question_substance',
    name: 'Question Text Substance & Completeness',
    category: 'Question Content',
    status: emptyQuestions.length === 0 ? 'PASS' : 'FAIL',
    summary:
      emptyQuestions.length === 0
        ? `All ${allSubparts.length} subparts have complete question text.`
        : `${emptyQuestions.length} subpart(s) have incomplete or missing text.`,
    details: emptyQuestions,
    jumpModuleNumber: firstEmptyModuleJump,
  });

  const criticalFailures = auditResults.filter((r) => r.status === 'FAIL');
  const warnings = auditResults.filter((r) => r.status === 'WARNING');
  const isSubmissionAllowed = criticalFailures.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 text-foreground">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                isSubmissionAllowed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {isSubmissionAllowed ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div>
              <DialogTitle className="font-serif text-lg font-bold">
                Pre-Submission Autonomous Compliance Audit
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated regulatory audit against VTU Autonomous Examination Blueprint & NBA Outcome Criteria
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Audit Status Banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            isSubmissionAllowed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {isSubmissionAllowed ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-destructive" />
            )}
            <span className="font-semibold">
              {isSubmissionAllowed
                ? 'All mandatory regulatory criteria passed. Ready for HOD submission.'
                : `${criticalFailures.length} critical compliance issue(s) must be resolved before submission.`}
            </span>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold ${
              isSubmissionAllowed
                ? 'border-emerald-500/40 text-emerald-700 bg-emerald-500/10'
                : 'border-destructive/40 text-destructive bg-destructive/10'
            }`}
          >
            {isSubmissionAllowed ? 'COMPLIANT' : 'ACTION REQUIRED'}
          </Badge>
        </div>

        {/* Audit Checklist Items */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
          {auditResults.map((audit) => (
            <div
              key={audit.id}
              className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                audit.status === 'PASS'
                  ? 'bg-card border-border/60'
                  : audit.status === 'WARNING'
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-destructive/5 border-destructive/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  {audit.status === 'PASS' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : audit.status === 'WARNING' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-foreground">{audit.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono font-bold ${
                      audit.status === 'PASS'
                        ? 'border-emerald-500/30 text-emerald-600'
                        : audit.status === 'WARNING'
                        ? 'border-amber-500/30 text-amber-600'
                        : 'border-destructive/30 text-destructive'
                    }`}
                  >
                    {audit.status}
                  </Badge>

                  {audit.jumpModuleNumber && onJumpToModule && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onJumpToModule(audit.jumpModuleNumber!);
                        onClose();
                      }}
                      className="h-6 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1"
                    >
                      <span>Fix in Mod {audit.jumpModuleNumber}</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-muted-foreground pl-6 text-[11px] leading-relaxed">
                {audit.summary}
              </p>

              {audit.details && audit.details.length > 0 && (
                <div className="ml-6 p-2 rounded-lg bg-background/80 border text-[10px] space-y-1 text-muted-foreground font-mono">
                  {audit.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-destructive font-bold">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            {isSubmissionAllowed ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <Lock className="h-3.5 w-3.5" />
                Paper will be sealed and forwarded to HOD for BoE Scrutiny.
              </span>
            ) : (
              <span className="text-destructive font-medium">
                Resolve the critical issues above to enable official submission.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Return to Editor
            </Button>

            <Button
              size="sm"
              disabled={!isSubmissionAllowed || submitting}
              onClick={onConfirmSubmit}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Confirm & Submit to HOD
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
