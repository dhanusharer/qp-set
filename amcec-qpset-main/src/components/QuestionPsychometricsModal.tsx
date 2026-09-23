import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  RefreshCw,
  Clock,
  ShieldCheck,
  Percent
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

interface QuestionPsychometricsModalProps {
  questionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuestionPsychometricsModal: React.FC<QuestionPsychometricsModalProps> = ({
  questionId,
  open,
  onOpenChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [recordingScores, setRecordingScores] = useState(false);

  useEffect(() => {
    if (questionId && open) {
      loadPsychometrics();
    }
  }, [questionId, open]);

  async function loadPsychometrics() {
    if (!questionId) return;
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/psychometrics/questions/${questionId}`);
      if (res?.success) {
        setData(res);
      }
    } catch (err: any) {
      toast.error('Failed to load question psychometrics');
    } finally {
      setLoading(false);
    }
  }

  // Simulate cohort exam response ingestion
  async function handleSimulateCohort() {
    if (!questionId) return;
    setRecordingScores(true);
    try {
      // 15 realistic student scores
      const responses = [
        { studentUsn: '1AM22CS001', itemScore: 9, totalScore: 92 },
        { studentUsn: '1AM22CS002', itemScore: 8, totalScore: 88 },
        { studentUsn: '1AM22CS003', itemScore: 8, totalScore: 84 },
        { studentUsn: '1AM22CS004', itemScore: 7, totalScore: 78 },
        { studentUsn: '1AM22CS005', itemScore: 6, totalScore: 74 },
        { studentUsn: '1AM22CS006', itemScore: 7, totalScore: 70 },
        { studentUsn: '1AM22CS007', itemScore: 5, totalScore: 66 },
        { studentUsn: '1AM22CS008', itemScore: 5, totalScore: 62 },
        { studentUsn: '1AM22CS009', itemScore: 4, totalScore: 56 },
        { studentUsn: '1AM22CS010', itemScore: 4, totalScore: 52 },
        { studentUsn: '1AM22CS011', itemScore: 3, totalScore: 48 },
        { studentUsn: '1AM22CS012', itemScore: 3, totalScore: 44 },
        { studentUsn: '1AM22CS013', itemScore: 2, totalScore: 38 },
        { studentUsn: '1AM22CS014', itemScore: 1, totalScore: 32 },
        { studentUsn: '1AM22CS015', itemScore: 1, totalScore: 26 },
      ];

      const res: any = await apiClient.post(`/psychometrics/questions/${questionId}/record-exam-performance`, {
        maxItemMarks: 10,
        academicYear: '2025-2026',
        semester: '6',
        assessmentType: 'SEE',
        responses,
      });

      if (res?.success) {
        toast.success('Simulated cohort scores recorded & psychometrics updated!');
        await loadPsychometrics();
      }
    } catch (err: any) {
      toast.error('Failed to record performance data');
    } finally {
      setRecordingScores(false);
    }
  }

  const health = data?.health;
  const psych = data?.psychometrics;

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Healthy</Badge>;
      case 'HIGH_EXPOSURE':
        return <Badge className="bg-amber-600 text-white gap-1"><Clock className="w-3 h-3" /> High Exposure</Badge>;
      case 'LOW_DISCRIMINATION':
        return <Badge className="bg-rose-600 text-white gap-1"><AlertTriangle className="w-3 h-3" /> Low Discrimination</Badge>;
      case 'REVIEW_REQUIRED':
        return <Badge className="bg-orange-600 text-white gap-1"><AlertTriangle className="w-3 h-3" /> Review Required</Badge>;
      case 'POSSIBLE_DUPLICATE':
        return <Badge className="bg-purple-600 text-white gap-1"><Layers className="w-3 h-3" /> Duplicate Risk</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><HelpCircle className="w-3 h-3" /> Insufficient Data</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold font-mono">
                  {data?.code || 'Question Intelligence'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Classical Test Theory (CTT) item statistics and exposure lifecycle management
                </DialogDescription>
              </div>
            </div>
            {health && getHealthBadge(health.status)}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
            Computing psychometric indexes and exposure history...
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                    Difficulty (p-value)
                  </span>
                  <div className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                    {psych ? psych.difficultyIndex.toFixed(2) : '0.50'}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {psych && psych.difficultyIndex < 0.3 ? 'Hard' : psych && psych.difficultyIndex > 0.7 ? 'Easy' : 'Balanced'}
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                    Discrimination (D)
                  </span>
                  <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {psych ? psych.discriminationIndex.toFixed(2) : '0.30'}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {psych && psych.discriminationIndex >= 0.3 ? 'Good' : 'Marginal'}
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                    Point-Biserial
                  </span>
                  <div className="text-xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                    {psych?.pointBiserial !== null && psych?.pointBiserial !== undefined ? psych.pointBiserial.toFixed(2) : 'N/A'}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Item-Total r
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                    Lifetime Uses
                  </span>
                  <div className="text-xl font-bold mt-1 text-foreground">
                    {data?.usages?.length || 0}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Exam cycles
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Health Explanation & Justification */}
            <Card className="border-indigo-100 dark:border-indigo-900/40">
              <CardContent className="p-4 space-y-2 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Deterministic Health Diagnosis
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {health?.explanation || 'No psychometric anomalies detected. Item conforms to standard assessment distributions.'}
                </p>

                {health?.recommendations?.length > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    <span className="font-semibold text-foreground block">Recommendations:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {health.recommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage History Ledger */}
            <div>
              <span className="text-xs font-semibold text-foreground block mb-1.5">
                Examination Exposure History:
              </span>
              {data?.usages?.length > 0 ? (
                <div className="border rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2">Academic Year</th>
                        <th className="p-2">Semester</th>
                        <th className="p-2">Assessment</th>
                        <th className="p-2">Used At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono">
                      {data.usages.map((u: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-2">{u.academicYear}</td>
                          <td className="p-2">Sem {u.semester}</td>
                          <td className="p-2 font-bold">{u.assessmentType}</td>
                          <td className="p-2 text-muted-foreground font-sans">
                            {new Date(u.usedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-3 border rounded-lg bg-muted/10">
                  Virgin Question: Never deployed in any previous exam cycle. Eligible for immediate assembly.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSimulateCohort}
            disabled={recordingScores || loading}
            className="gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {recordingScores ? 'Ingesting Responses...' : 'Ingest Student Cohort (15 Responses)'}
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
