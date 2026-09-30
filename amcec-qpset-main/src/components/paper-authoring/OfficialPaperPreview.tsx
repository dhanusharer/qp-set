import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MathView } from '@/components/MathView';
import { QuestionPaperContent } from './types';
import { Printer, Download, Eye, ShieldCheck, CheckCircle2 } from 'lucide-react';
import amcecLogo from '@/assets/amcec-logo.png';

interface OfficialPaperPreviewProps {
  paper: QuestionPaperContent;
  onPrint?: () => void;
}

export const OfficialPaperPreview: React.FC<OfficialPaperPreviewProps> = ({
  paper,
  onPrint = () => window.print(),
}) => {
  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-card p-3 rounded-xl border no-print shadow-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
            Official VTU Autonomous Layout
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Print-ready format with KaTeX formulas, vector diagrams, and USN grid.
          </span>
        </div>

        <Button size="sm" onClick={onPrint} className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground">
          <Printer className="h-3.5 w-3.5" />
          Print / Export PDF
        </Button>
      </div>

      {/* Official Examination Paper Canvas (A4 Standard) */}
      <div className="bg-white text-slate-900 border shadow-md rounded-lg p-8 max-w-4xl mx-auto space-y-6 print:p-0 print:border-none print:shadow-none font-serif">
        {/* USN Grid */}
        <div className="flex items-center justify-end gap-2 text-xs font-sans pb-2">
          <span className="font-bold text-[11px] tracking-wider uppercase">USN:</span>
          <div className="flex border border-slate-900">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-7 border-r border-slate-900 last:border-r-0 flex items-center justify-center font-mono text-xs font-bold text-slate-400"
              >
                {i === 0 ? '1' : i === 1 ? 'A' : i === 2 ? 'M' : ''}
              </div>
            ))}
          </div>
        </div>

        {/* College Header */}
        <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src={amcecLogo} alt="AMCEC" className="h-14 w-14 object-contain" />
            <div>
              <h1 className="text-xl font-black tracking-wide text-slate-900 uppercase">
                AMC ENGINEERING COLLEGE
              </h1>
              <p className="text-[11px] font-sans font-medium text-slate-600">
                (An Autonomous Institution Affiliated to VTU, Belagavi • Accredited by NAAC & NBA)
              </p>
              <p className="text-[10px] font-sans text-slate-500">
                18th K.M., Bannerghatta Main Road, Bengaluru – 560 083
              </p>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-bold tracking-wider font-sans uppercase underline">
              {paper.examType === 'SEE'
                ? 'Semester End Examination (SEE) — Autonomous Degree'
                : 'Continuous Internal Evaluation (CIE)'}
            </h2>
          </div>
        </div>

        {/* Paper Metadata Strip */}
        <div className="grid grid-cols-2 text-xs font-sans border-b border-slate-300 pb-3 gap-y-1">
          <div>
            <span className="font-semibold text-slate-600">Course Title: </span>
            <strong className="text-slate-900 font-bold">{paper.courseName}</strong>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-600">Course Code: </span>
            <strong className="text-slate-900 font-mono font-bold">{paper.courseCode}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Duration: </span>
            <strong className="text-slate-900">{paper.durationMinutes / 60} Hours</strong>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-600">Max. Marks: </span>
            <strong className="text-slate-900 font-bold">{paper.maxMarks}</strong>
          </div>
        </div>

        {/* Instructions to Candidates */}
        <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] font-sans text-slate-700 space-y-1">
          <span className="font-bold underline uppercase">Instructions to Candidates:</span>
          <p className="whitespace-pre-line leading-relaxed">{paper.instructions}</p>
        </div>

        {/* Modules & Questions Table */}
        <div className="border border-slate-900 divide-y divide-slate-900 text-xs">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-slate-100 font-sans font-bold text-slate-900 text-[11px] py-1.5 px-3 text-center border-b border-slate-900">
            <div className="col-span-1 border-r border-slate-900 pr-1">Q.No.</div>
            <div className="col-span-8 text-left pl-3 pr-2 border-r border-slate-900">
              Questions (Answer Five Full Questions, choosing ONE from each module)
            </div>
            <div className="col-span-1 border-r border-slate-900">Marks</div>
            <div className="col-span-1 border-r border-slate-900">CO</div>
            <div className="col-span-1">RBT</div>
          </div>

          {/* Module Loops */}
          {paper.modules.map((mod) => (
            <div key={mod.id} className="divide-y divide-slate-300">
              {/* Module Header Bar */}
              <div className="bg-slate-200 font-sans font-bold text-slate-900 text-center py-1 text-xs tracking-wider uppercase">
                MODULE {mod.moduleNumber}
              </div>

              {/* Question A (e.g. Q1) */}
              <div className="divide-y divide-slate-200">
                {mod.questionA.subparts.map((sp, idx) => (
                  <div key={sp.id} className="grid grid-cols-12 items-start py-2.5 px-3 text-slate-900">
                    <div className="col-span-1 font-bold text-center border-r border-slate-300 pr-1 pt-0.5">
                      {idx === 0 ? `Q${mod.questionA.questionNumber}` : ''} {sp.partLabel}
                    </div>

                    <div className="col-span-8 pl-3 pr-3 border-r border-slate-300 space-y-2">
                      <MathView content={sp.text} className="text-slate-900 leading-relaxed" />

                      {sp.svgDiagram && (
                        <div
                          className="w-full max-h-40 overflow-hidden flex items-center justify-center p-2 bg-slate-50 border rounded"
                          dangerouslySetInnerHTML={{ __html: sp.svgDiagram }}
                        />
                      )}

                      {sp.codeSnippet && (
                        <pre className="p-2 bg-slate-100 border rounded text-[10px] font-mono text-slate-800 overflow-x-auto">
                          <code>{sp.codeSnippet.code}</code>
                        </pre>
                      )}
                    </div>

                    <div className="col-span-1 text-center font-bold font-mono border-r border-slate-300 pt-0.5">
                      {sp.marks}
                    </div>

                    <div className="col-span-1 text-center font-mono border-r border-slate-300 pt-0.5">
                      {sp.coMapping}
                    </div>

                    <div className="col-span-1 text-center font-mono font-bold pt-0.5">
                      {sp.bloomsLevel}
                    </div>
                  </div>
                ))}
              </div>

              {/* OR Separator */}
              <div className="bg-slate-100 font-sans font-bold text-slate-800 text-center py-0.5 text-[11px] tracking-widest uppercase border-y border-slate-400">
                — OR —
              </div>

              {/* Question B (e.g. Q2) */}
              <div className="divide-y divide-slate-200">
                {mod.questionB.subparts.map((sp, idx) => (
                  <div key={sp.id} className="grid grid-cols-12 items-start py-2.5 px-3 text-slate-900">
                    <div className="col-span-1 font-bold text-center border-r border-slate-300 pr-1 pt-0.5">
                      {idx === 0 ? `Q${mod.questionB.questionNumber}` : ''} {sp.partLabel}
                    </div>

                    <div className="col-span-8 pl-3 pr-3 border-r border-slate-300 space-y-2">
                      <MathView content={sp.text} className="text-slate-900 leading-relaxed" />

                      {sp.svgDiagram && (
                        <div
                          className="w-full max-h-40 overflow-hidden flex items-center justify-center p-2 bg-slate-50 border rounded"
                          dangerouslySetInnerHTML={{ __html: sp.svgDiagram }}
                        />
                      )}

                      {sp.codeSnippet && (
                        <pre className="p-2 bg-slate-100 border rounded text-[10px] font-mono text-slate-800 overflow-x-auto">
                          <code>{sp.codeSnippet.code}</code>
                        </pre>
                      )}
                    </div>

                    <div className="col-span-1 text-center font-bold font-mono border-r border-slate-300 pt-0.5">
                      {sp.marks}
                    </div>

                    <div className="col-span-1 text-center font-mono border-r border-slate-300 pt-0.5">
                      {sp.coMapping}
                    </div>

                    <div className="col-span-1 text-center font-mono font-bold pt-0.5">
                      {sp.bloomsLevel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Paper End Mark */}
        <div className="text-center font-sans text-xs font-bold text-slate-500 pt-4 border-t border-slate-300">
          * * * END OF QUESTION PAPER * * *
        </div>
      </div>
    </div>
  );
};
