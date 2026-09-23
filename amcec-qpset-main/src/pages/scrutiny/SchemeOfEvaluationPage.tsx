import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, ArrowLeft, ShieldCheck, Download, Award } from 'lucide-react';
import { MathView } from '@/components/MathView';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

export default function SchemeOfEvaluationPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadScheme() {
      if (!formId) return;
      try {
        setLoading(true);
        const res: any = await apiClient.get(`/scrutiny/papers/${formId}/scheme-of-evaluation`);
        const data = res?.schemeRows ? res : res?.data;
        setScheme(data);
      } catch {
        toast.error('Failed to load Scheme of Evaluation');
      } finally {
        setLoading(false);
      }
    }
    loadScheme();
  }, [formId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-muted-foreground">
        Compiling granular Step-Marking Scheme of Evaluation...
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="p-16 text-center text-sm text-muted-foreground">
        Scheme of Evaluation not found.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Action Bar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden border-b pb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Scrutiny
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Autonomous Valuation Scheme
          </Badge>
          <Button onClick={handlePrint} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 text-xs">
            <Printer className="w-4 h-4" /> Print / Export Scheme
          </Button>
        </div>
      </div>

      {/* Official Printable Scheme Paper */}
      <div className="p-8 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border rounded-2xl shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="text-center border-b pb-4 space-y-1">
          <h2 className="text-lg font-bold uppercase tracking-wider">
            AMC ENGINEERING COLLEGE, BENGALURU
          </h2>
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
            (An Autonomous Institution Affiliated to VTU, Belagavi • Accredited by NAAC & NBA)
          </p>
          <h3 className="text-base font-extrabold uppercase pt-2 text-indigo-700 dark:text-indigo-400">
            SCHEME OF EVALUATION & STEP-MARKING RUBRIC
          </h3>
          <p className="text-xs font-medium text-slate-500">
            Parallel Examination Set: <strong>{scheme.setName}</strong> • Max Marks: <strong>{scheme.totalMarks}</strong>
          </p>
        </div>

        {/* Course Details Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 text-xs">
          <div>
            <span className="text-slate-500 block">Course Code:</span>
            <strong className="font-mono">{scheme.courseCode}</strong>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500 block">Course Title:</span>
            <strong>{scheme.courseName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Valuation Mode:</span>
            <strong className="text-indigo-600">Double Blind Autonomous</strong>
          </div>
        </div>

        {/* Scheme Table */}
        <div className="border rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase border-b">
              <tr>
                <th className="p-3 w-16 border-r">Q.No</th>
                <th className="p-3 border-r">Valuation Guidelines & Step-by-Step Breakdown</th>
                <th className="p-3 w-28 text-center border-r">Step Marks</th>
                <th className="p-3 w-20 text-center border-r">Sub-Total</th>
                <th className="p-3 w-20 text-center border-r">Bloom's</th>
                <th className="p-3 w-16 text-center">CO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {scheme.schemeRows?.map((row: any, rIdx: number) => {
                const rubrics = row.rubricSteps || [];
                return (
                  <tr key={rIdx} className={row.isAlternative ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}>
                    <td className="p-3 font-bold font-mono align-top border-r">
                      {row.questionNumber}
                      {row.isAlternative && (
                        <span className="block text-[10px] text-amber-600 font-normal">OR Choice</span>
                      )}
                    </td>

                    <td className="p-3 space-y-2 align-top border-r">
                      <MathView content={row.questionText} className="text-xs font-medium" />

                      {rubrics.length > 0 && (
                        <div className="pt-2 border-t space-y-1.5 text-[11px]">
                          <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                            Evaluator Marking Steps:
                          </span>
                          {rubrics.map((stepGroup: any, gIdx: number) => (
                            <div key={gIdx} className="space-y-1">
                              {stepGroup.part && <strong>{stepGroup.part}: </strong>}
                              {Array.isArray(stepGroup.rubric) && stepGroup.rubric.map((s: any, sIdx: number) => (
                                <div key={sIdx} className="flex justify-between pl-2 text-slate-600 dark:text-slate-300">
                                  <span>• Step {s.stepNo}: {s.description}</span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{s.marks}M</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center align-top border-r font-mono">
                      {rubrics.length > 0 ? (
                        rubrics.map((g: any, i: number) => (
                          <div key={i}>
                            {Array.isArray(g.rubric) && g.rubric.map((s: any, j: number) => (
                              <div key={j} className="text-slate-600 dark:text-slate-400">{s.marks}</div>
                            ))}
                          </div>
                        ))
                      ) : (
                        row.totalMarks
                      )}
                    </td>

                    <td className="p-3 text-center align-top border-r font-bold font-mono">
                      {row.totalMarks}M
                    </td>

                    <td className="p-3 text-center align-top border-r font-mono">
                      <Badge variant="outline" className="text-[10px]">
                        {row.bloomsLevel}
                      </Badge>
                    </td>

                    <td className="p-3 text-center align-top font-mono">
                      <Badge variant="secondary" className="text-[10px]">
                        {row.coCode}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Sign-off (for valuation centers) */}
        <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs text-slate-600 dark:text-slate-400">
          <div className="border-t pt-2">
            <strong>Subject Expert / Setter</strong>
            <p className="text-[10px] text-slate-400">Masked for Autonomous Scrutiny</p>
          </div>
          <div className="border-t pt-2">
            <strong>BoE Scrutiny Committee</strong>
            <p className="text-[10px] text-slate-400">Approved Pedagogical & Linguistic</p>
          </div>
          <div className="border-t pt-2">
            <strong>Controller of Examinations (CoE)</strong>
            <p className="text-[10px] text-slate-400">AMC Engineering College</p>
          </div>
        </div>
      </div>
    </div>
  );
}
