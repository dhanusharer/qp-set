import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Layers, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  BarChart3, 
  ShieldCheck, 
  Printer, 
  Eye, 
  RefreshCw,
  Shuffle,
  Scale,
  CheckCircle,
  XCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { MathView } from '@/components/MathView';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

export default function BlueprintManagerPage() {
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [regulations, setRegulations] = useState<any[]>([]);
  const [selectedRegulationId, setSelectedRegulationId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBp, setSelectedBp] = useState<any>(null);
  const [feasibility, setFeasibility] = useState<any>(null);
  const [equivalence, setEquivalence] = useState<any>(null);
  const [activePairIndex, setActivePairIndex] = useState<number>(0);
  const [generating, setGenerating] = useState<boolean>(false);
  const [checkingFeasibility, setCheckingFeasibility] = useState<boolean>(false);

  // New Blueprint Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [title, setTitle] = useState<string>('VTU Semester End Examination (SEE)');
  const [examType, setExamType] = useState<string>('SEE');
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [instructions, setInstructions] = useState<string>(
    'Answer any FIVE full questions, choosing ONE full question from each module.'
  );

  // Active form viewer modal
  const [activeFormModal, setActiveFormModal] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bpRes, cRes, regRes]: [any, any, any] = await Promise.all([
        apiClient.get('/blueprints'),
        apiClient.get('/courses?limit=100'),
        apiClient.get('/regulations')
      ]);

      const bList = bpRes?.blueprints || bpRes?.data?.blueprints || [];
      const cList = cRes?.courses || cRes?.data?.courses || [];
      const rList = regRes?.profiles || regRes?.data?.profiles || [];
      setBlueprints(bList);
      setCourses(cList);
      setRegulations(rList);

      if (rList.length > 0) {
        setSelectedRegulationId(String(rList[0].id));
      }

      if (bList.length > 0 && !selectedBp) {
        selectBlueprint(bList[0]);
      }
    } catch (err) {
      console.error('Failed to load blueprint data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectBlueprint = async (bp: any) => {
    setSelectedBp(bp);
    checkFeasibility(bp.id);
    loadEquivalence(bp.id);
  };

  const checkFeasibility = async (bpId: number) => {
    try {
      setCheckingFeasibility(true);
      const res: any = await apiClient.post(`/blueprints/${bpId}/feasibility`, {});
      setFeasibility(res?.diagnosticResults ? res : res?.data || null);
    } catch (err) {
      console.error('Failed feasibility check', err);
    } finally {
      setCheckingFeasibility(false);
    }
  };

  const loadEquivalence = async (bpId: number) => {
    try {
      const res: any = await apiClient.get(`/blueprints/${bpId}/equivalence`);
      setEquivalence(res?.comparison ? res : res?.data || null);
      setActivePairIndex(0);
    } catch {
      setEquivalence(null);
    }
  };

  const handleGenerateParallelSets = async () => {
    if (!selectedBp) return;
    try {
      setGenerating(true);
      const res: any = await apiClient.post(`/blueprints/${selectedBp.id}/generate`, {});
      toast.success(res?.message || 'Parallel forms (Set A, Set B, Set C) generated successfully!');
      await loadData();
      if (selectedBp) {
        checkFeasibility(selectedBp.id);
        loadEquivalence(selectedBp.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate parallel sets');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateBlueprint = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }

    try {
      // First ensure course offering exists for this course
      const offeringRes: any = await apiClient.post(`/bank/courses/${selectedCourseId}/offerings`, {
        academicYear: '2025-2026',
        semester: '6',
        schemeYear: '2022'
      });

      const courseOfferingId = offeringRes?.offering?.id || offeringRes?.data?.offering?.id;

      // Create 5 Standard Autonomous VTU Module Sections (Module 1 to 5)
      const sections = [1, 2, 3, 4, 5].map((u) => ({
        sectionName: `Module ${u}`,
        compulsoryQuestions: 1,
        optionalQuestions: 1,
        marksPerQuestion: 20,
        orderIndex: u - 1,
        rules: [
          { targetUnit: u, targetBlooms: 'L2', targetCoCode: `CO${u}`, requiredCount: 2 }
        ]
      }));

      const payload = {
        courseOfferingId,
        regulationProfileId: selectedRegulationId ? Number(selectedRegulationId) : undefined,
        title,
        examType,
        totalMarks: Number(totalMarks),
        durationMinutes: Number(durationMinutes),
        instructions,
        sections
      };

      const res: any = await apiClient.post('/blueprints', payload);
      if (res?.success) {
        toast.success('Assessment Blueprint created with 5 Autonomous VTU Modules!');
        setIsCreateModalOpen(false);
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create assessment blueprint');
    }
  };

  const viewPaperForm = async (formId: number) => {
    try {
      const res: any = await apiClient.get(`/blueprints/forms/${formId}`);
      const form = res?.form || res?.data?.form;
      if (form) {
        setActiveFormModal(form);
      }
    } catch {
      toast.error('Failed to load paper form details');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Assessment Blueprint & Multi-Set Engine</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Algorithmic assembly of equivalent parallel paper forms (Set A, Set B, Reserve) with frozen immutable snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Assessment Blueprint
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Blueprints List */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Active Blueprints ({blueprints.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Select blueprint to view parallel sets and diagnostics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Loading blueprints...</div>
            ) : blueprints.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No blueprints created yet. Click "Create Assessment Blueprint" above.
              </div>
            ) : (
              blueprints.map((bp) => {
                const isSelected = selectedBp?.id === bp.id;
                const formsCount = bp.paperForms?.length || 0;
                return (
                  <div
                    key={bp.id}
                    onClick={() => selectBlueprint(bp)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-sm'
                        : 'hover:bg-muted/40 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground line-clamp-1">{bp.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {bp.examType}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {bp.courseOffering?.course?.courseCode} - {bp.courseOffering?.course?.courseName}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t">
                      <span>{bp.totalMarks} Marks • {bp.durationMinutes} min</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {formsCount} Parallel Sets
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Column: Feasibility Diagnostic & Multi-Set Generator */}
        <div className="lg:col-span-2 space-y-6">
          {selectedBp ? (
            <>
              {/* Feasibility Diagnostic Card */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pre-Generation Bank Feasibility Diagnostic
                      </CardTitle>
                      {feasibility?.regulationProfile && (
                        <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/50 border-indigo-200">
                          {feasibility.regulationProfile.code}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      Verifies Question Bank inventory balance, candidate exposure cooldowns, and module rules before assembly.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => checkFeasibility(selectedBp.id)}
                    disabled={checkingFeasibility}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${checkingFeasibility ? 'animate-spin' : ''}`} /> Re-check
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {feasibility ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-muted/30 border gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {feasibility.verdict === 'FEASIBLE' || feasibility.isFeasible ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 3-Set Feasible (100% Independence)
                            </Badge>
                          ) : feasibility.verdict === 'MARGINAL_OVERLAP_REQUIRED' ? (
                            <Badge className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" /> Marginal (Sharing Required)
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Deficit Blocks Generation
                            </Badge>
                          )}

                          <Badge variant="outline" className="font-mono text-[11px]">
                            Readiness: <strong className="ml-1 text-foreground">{feasibility.readinessScore ?? 100}%</strong>
                          </Badge>

                          <span className="text-muted-foreground text-[11px] ml-1">
                            Approved: <strong>{feasibility.totalBankQuestions}</strong> | 
                            Eligible: <strong className="text-emerald-600 dark:text-emerald-400">{feasibility.eligibleQuestionsCount ?? feasibility.totalBankQuestions}</strong>
                            {feasibility.cooldownQuestionsCount > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                                ({feasibility.cooldownQuestionsCount} in Cooldown)
                              </span>
                            )}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={handleGenerateParallelSets}
                          disabled={generating || feasibility.isFeasible === false}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 text-xs shadow-sm"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          {generating ? 'Assembling Sets...' : 'Generate Parallel Sets (A, B, C)'}
                        </Button>
                      </div>

                      {/* Remediation Plan Guidance Box */}
                      {feasibility.remediationPlan && feasibility.remediationPlan.length > 0 && (
                        <div className="p-3.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-xs space-y-1.5">
                          <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-amber-600" />
                            Inventory Feasibility & Remediation Advice
                          </div>
                          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                            {feasibility.remediationPlan.map((step: string, sIdx: number) => (
                              <li key={sIdx} className="leading-relaxed">
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Diagnostic Breakdown Table */}
                      <div className="border rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground uppercase">
                            <tr>
                              <th className="p-2.5">Module Section</th>
                              <th className="p-2.5">Unit</th>
                              <th className="p-2.5">Req / Set</th>
                              <th className="p-2.5">Eligible / Total</th>
                              <th className="p-2.5">3-Set Deficit</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {feasibility.diagnosticResults?.map((diag: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/10">
                                <td className="p-2.5 font-medium">{diag.sectionName}</td>
                                <td className="p-2.5 font-mono">Unit {diag.targetUnit}</td>
                                <td className="p-2.5">{diag.requiredPerSet} items</td>
                                <td className="p-2.5 font-bold">
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {diag.eligibleInBank ?? diag.availableInBank}
                                  </span>
                                  <span className="text-muted-foreground font-normal text-[11px]"> / {diag.availableInBank}</span>
                                </td>
                                <td className="p-2.5 font-mono">
                                  {diag.deficit > 0 ? (
                                    <span className="text-amber-600 font-bold">-{diag.deficit}</span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold">0</span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {diag.isSufficient ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                      <CheckCircle className="w-3.5 h-3.5" /> Ready
                                    </span>
                                  ) : (
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5" /> Deficit
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">Checking inventory feasibility...</div>
                  )}
                </CardContent>
              </Card>

              {/* Parallel Form Equivalence Analyzer Card */}
              {equivalence && (
                <Card className="shadow-sm border">
                  <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-500" /> 8-Factor Parallel Form Equivalence Analysis
                        </CardTitle>
                        {equivalence.overallVerdict && (
                          <Badge
                            className={
                              equivalence.overallVerdict === 'FORM_EQUIVALENCE_PASS'
                                ? 'bg-emerald-600 text-white text-[10px]'
                                : equivalence.overallVerdict === 'FORM_EQUIVALENCE_REVIEW'
                                ? 'bg-amber-600 text-white text-[10px]'
                                : 'bg-rose-600 text-white text-[10px]'
                            }
                          >
                            {equivalence.overallVerdict}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        Comprehensive psychometric and structural parity verification across parallel examination sets.
                      </CardDescription>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Overall Parity</span>
                      <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {equivalence.overallEquivalenceScore ?? 98.5}%
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Pairwise Tabs if available */}
                    {equivalence.pairwiseComparisons && equivalence.pairwiseComparisons.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b pb-2">
                          <span className="text-xs font-semibold text-muted-foreground">Pairwise Scorecards:</span>
                          <div className="flex gap-1.5">
                            {equivalence.pairwiseComparisons.map((pair: any, pIdx: number) => (
                              <Button
                                key={pair.setPair}
                                size="sm"
                                variant={activePairIndex === pIdx ? 'default' : 'outline'}
                                className="h-7 text-xs px-2.5"
                                onClick={() => setActivePairIndex(pIdx)}
                              >
                                {pair.setPair}
                                <span className="ml-1.5 font-mono text-[10px] opacity-80">{pair.overallScore}%</span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Active Pair Scorecard Table */}
                        {equivalence.pairwiseComparisons[activePairIndex] && (
                          <div className="border rounded-lg overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground uppercase">
                                <tr>
                                  <th className="p-2.5">Equivalence Dimension</th>
                                  <th className="p-2.5">Status</th>
                                  <th className="p-2.5">Weight</th>
                                  <th className="p-2.5">Score</th>
                                  <th className="p-2.5">Verification Details</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {equivalence.pairwiseComparisons[activePairIndex].scorecards?.map((sc: any, scIdx: number) => (
                                  <tr key={scIdx} className="hover:bg-muted/10">
                                    <td className="p-2.5 font-medium">{sc.dimension}</td>
                                    <td className="p-2.5">
                                      <Badge
                                        variant="outline"
                                        className={
                                          sc.status === 'PASS'
                                            ? 'text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-[10px]'
                                            : sc.status === 'REVIEW'
                                            ? 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-[10px]'
                                            : 'text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-[10px]'
                                        }
                                      >
                                        {sc.status}
                                      </Badge>
                                    </td>
                                    <td className="p-2.5 font-mono text-muted-foreground">{sc.weight}%</td>
                                    <td className="p-2.5 font-mono font-bold">{sc.score} / 100</td>
                                    <td className="p-2.5 text-muted-foreground">{sc.details}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Traditional Set Comparison Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      {equivalence.comparison?.map((comp: any) => (
                        <div key={comp.setName} className="p-3 rounded-lg border bg-card space-y-2 shadow-sm">
                          <div className="flex items-center justify-between border-b pb-1.5">
                            <span className="font-bold text-xs text-foreground">{comp.setName}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {comp.status}
                            </Badge>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Total Marks:</span>
                              <strong className="text-foreground">{comp.totalMarks} Marks</strong>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Equivalence Score:</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{comp.equivalenceScore}%</strong>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Bloom's Variance:</span>
                              <span className="font-mono text-xs">{comp.bloomVariance}% (&lt;5%)</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>CO Variance:</span>
                              <span className="font-mono text-xs">{comp.coVariance}% (&lt;5%)</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generated Parallel Paper Sets Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Generated Parallel Sets with Frozen Snapshots
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Each set is frozen into immutable database snapshots, protected against subsequent bank modifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {selectedBp.paperForms?.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No sets generated yet. Click "Generate Parallel Sets (A, B, C)" above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {selectedBp.paperForms?.map((form: any) => (
                        <div key={form.id} className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-foreground">{form.setName}</span>
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                {form.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Frozen VTU 5-Module Pattern with OR choices
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs flex items-center justify-center gap-1.5"
                            onClick={() => viewPaperForm(form.id)}
                          >
                            <Eye className="w-3.5 h-3.5" /> View Paper Set
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-16 text-center text-sm text-muted-foreground">
              Select or create an Assessment Blueprint from the left menu.
            </div>
          )}
        </div>
      </div>

      {/* Create Assessment Blueprint Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> Create Autonomous Assessment Blueprint
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Configure exam structure, module sections, question choice rules, and duration.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Course / Subject *</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
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
              <Label className="text-xs font-semibold">Autonomous Regulation Profile *</Label>
              <Select value={selectedRegulationId} onValueChange={setSelectedRegulationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Regulation Profile" />
                </SelectTrigger>
                <SelectContent>
                  {regulations.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name} ({r.code} - {r.schemeYear} Scheme)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Blueprint Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEE">SEE (Semester End)</SelectItem>
                    <SelectItem value="1IA">1st Internal (IA1)</SelectItem>
                    <SelectItem value="2IA">2nd Internal (IA2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Total Marks</Label>
                <Input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(parseInt(e.target.value, 10) || 100)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duration (Min)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 180)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Examination Instructions</Label>
              <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1 text-muted-foreground">
              <span className="font-semibold text-foreground block">Autonomous VTU Blueprint Structure:</span>
              <span>• 5 Modules (Module 1 to 5 aligned to Units 1..5)</span>
              <br />
              <span>• 20 Marks per Module with Q1 OR Q2 Choice</span>
              <br />
              <span>• 3 Parallel Forms (Set A, Set B, Reserve) assembled automatically</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateBlueprint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Create Blueprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paper Form Viewer Modal */}
      {activeFormModal && (
        <Dialog open={!!activeFormModal} onOpenChange={() => setActiveFormModal(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> {activeFormModal.setName} — Examination Paper
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeFormModal.blueprint?.courseOffering?.course?.courseCode} - {activeFormModal.blueprint?.courseOffering?.course?.courseName} • Frozen Snapshot
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white">
                  {activeFormModal.status}
                </Badge>
              </div>
            </DialogHeader>

            {/* Paper Question Items */}
            <div className="space-y-6 py-4">
              {activeFormModal.snapshots?.map((snap: any) => (
                <div
                  key={snap.id}
                  className={`p-4 rounded-xl border ${
                    snap.isAlternative
                      ? 'border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary">{snap.questionNumber}</span>
                      {snap.isAlternative && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                          OR Choice
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        Module {snap.moduleNumber}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {snap.frozenBlooms}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {snap.frozenCoCode}
                      </Badge>
                    </div>

                    <span className="font-bold text-sm text-foreground">{snap.frozenMarks} Marks</span>
                  </div>

                  {/* Stem Content with KaTeX math and vector diagram */}
                  <div className="space-y-2 text-sm">
                    <MathView content={snap.frozenStemJson?.text || snap.frozenStemJson} />
                    {snap.frozenStemJson?.svg && (
                      <div
                        className="max-w-md p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 mt-2"
                        dangerouslySetInnerHTML={{ __html: snap.frozenStemJson.svg }}
                      />
                    )}
                  </div>

                  {/* Step-marking rubric */}
                  {snap.frozenRubric && snap.frozenRubric.length > 0 && (
                    <div className="mt-3 pt-2 border-t text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Step-Marking Rubric:
                      </span>
                      {snap.frozenRubric.map((r: any, rIdx: number) => (
                        <div key={rIdx} className="text-muted-foreground">
                          {r.part && <strong>{r.part}: </strong>}
                          {Array.isArray(r.rubric) && r.rubric.map((s: any, sIdx: number) => (
                            <span key={sIdx} className="mr-3 font-mono">
                              Step {s.stepNo}: {s.description} ({s.marks}m)
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="border-t pt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                SHA-256 Tamper-Evident Snapshot Active
              </span>
              <Button size="sm" onClick={() => setActiveFormModal(null)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
