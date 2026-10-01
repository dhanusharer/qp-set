import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MathView } from '@/components/MathView';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  BookOpen,
  History,
  Target,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  Search,
  Loader2,
  ChevronRight,
  ListOrdered,
  Cpu,
  Layers,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { BLOOMS_LABELS, RubricStep } from './types';

interface HistoricalPYQ {
  id: string;
  courseCode: string;
  courseName: string;
  examSession: string;
  schemeYear: string;
  moduleNumber: number;
  topic: string;
  questionText: string;
  marks: number;
  bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  coMapping: string;
  repetitionFrequency: number;
  similarityScore?: number;
  modelSolutionSnippet: string;
  stepRubric: Array<{ stepNo: number; description: string; marks: number }>;
}

interface FramedVariation {
  id: string;
  tier: 'tier_a_pyq' | 'tier_b_cognitive' | 'tier_c_scenario';
  title: string;
  questionText: string;
  marks: number;
  bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  coMapping: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rationale: string;
  actionVerbUsed: string;
  stepRubric: Array<{ stepNo: number; description: string; marks: number }>;
  modelAnswerSnippet: string;
  latexIncluded: boolean;
  diagramRecommended: boolean;
}

interface QuestionFramerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  targetMarks: number;
  targetBlooms: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  moduleNumber: number;
  courseCode?: string;
  courseName?: string;
  onAdoptQuestion: (adopted: {
    text: string;
    marks: number;
    bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
    coMapping: string;
    rubricSteps: RubricStep[];
  }) => void;
}

export const QuestionFramerDrawer: React.FC<QuestionFramerDrawerProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  targetMarks: initialTargetMarks,
  targetBlooms: initialTargetBlooms,
  moduleNumber,
  courseCode = '21CS32',
  courseName = 'Data Structures & Applications',
  onAdoptQuestion,
}) => {
  const { toast } = useToast();
  const [promptText, setPromptText] = useState(initialPrompt);
  const [targetMarks, setTargetMarks] = useState<number>(initialTargetMarks || 10);
  const [targetBlooms, setTargetBlooms] = useState<'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'>(initialTargetBlooms || 'L3');
  const [activeTab, setActiveTab] = useState<'cognitive' | 'pyq' | 'scenario'>('cognitive');

  const [loading, setLoading] = useState(false);
  const [historicalPYQs, setHistoricalPYQs] = useState<HistoricalPYQ[]>([]);
  const [framedVariations, setFramedVariations] = useState<FramedVariation[]>([]);
  const [repetitionData, setRepetitionData] = useState<{
    maxSimilarityPct: number;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    warningMessage?: string;
    mostSimilarPYQ?: any;
  }>({ maxSimilarityPct: 0, riskLevel: 'LOW' });

  // Sync initial prompt when opened
  useEffect(() => {
    if (isOpen) {
      setPromptText(initialPrompt || 'Stack, Queue or Tree operations');
      setTargetMarks(initialTargetMarks || 10);
      setTargetBlooms(initialTargetBlooms || 'L3');
    }
  }, [isOpen, initialPrompt, initialTargetMarks, initialTargetBlooms]);

  // Fetch recommendations from backend
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: {
          extractedTopic: string;
          matchedModule: number;
          targetMarks: number;
          targetBlooms: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
          repetitionCheck: any;
          historicalPYQs: HistoricalPYQ[];
          framedVariations: FramedVariation[];
        };
      }>('/bank/recommend-and-frame', {
        courseCode,
        courseName,
        moduleNumber,
        partialText: promptText || 'data structure algorithm',
        targetMarks,
        targetBlooms,
      });

      if (res.data) {
        setHistoricalPYQs(res.data.historicalPYQs || []);
        setFramedVariations(res.data.framedVariations || []);
        setRepetitionData(res.data.repetitionCheck || { maxSimilarityPct: 0, riskLevel: 'LOW' });
      }
    } catch (err: any) {
      console.error('Failed to fetch recommendations', err);
    } finally {
      setLoading(false);
    }
  }, [courseCode, courseName, moduleNumber, promptText, targetMarks, targetBlooms]);

  // Debounced auto-fetch
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchRecommendations();
    }, 400);
    return () => clearTimeout(timer);
  }, [isOpen, fetchRecommendations]);

  if (!isOpen) return null;

  const handleAdopt = (
    text: string,
    marks: number,
    bloomsLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6',
    coMapping: string,
    stepRubric: Array<{ stepNo: number; description: string; marks: number }>
  ) => {
    const formattedSteps: RubricStep[] = stepRubric.map((r) => ({
      id: `rub_${Date.now()}_${r.stepNo}`,
      stepNo: r.stepNo,
      description: r.description,
      marks: r.marks,
    }));

    onAdoptQuestion({
      text,
      marks,
      bloomsLevel,
      coMapping,
      rubricSteps: formattedSteps,
    });

    toast({
      title: '✨ Question & Rubric Adopted',
      description: `Populated subpart with text and pre-synthesized ${marks}M marking scheme.`,
    });
    onClose();
  };

  const cognitiveVariations = framedVariations.filter((v) => v.tier === 'tier_b_cognitive');
  const scenarioVariations = framedVariations.filter((v) => v.tier === 'tier_c_scenario');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in-0">
      <div className="w-full max-w-2xl bg-card border-l h-full flex flex-col shadow-2xl overflow-hidden text-card-foreground">
        {/* Drawer Header */}
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base text-foreground">
                  Cognitive Question Framer & PYQ Radar
                </h2>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary font-bold">
                  VTU Autonomous
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Module {moduleNumber} • {courseCode} • Historical Archive & Bloom’s Synthesizer
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Input Bar & Controls */}
        <div className="p-4 border-b bg-background space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Type keyword or concept (e.g., 'AVL rotations', 'Dijkstra', 'Infix to Postfix')..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Target Marks */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">Target Marks:</span>
              {[4, 6, 8, 10].map((m) => (
                <button
                  key={m}
                  onClick={() => setTargetMarks(m)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                    targetMarks === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>

            {/* Target Bloom's */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground">Bloom’s:</span>
              {(['L2', 'L3', 'L4', 'L5'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setTargetBlooms(lvl)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                    targetBlooms === lvl
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Repetition Radar Alert Banner */}
          <div
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              repetitionData.riskLevel === 'HIGH'
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : repetitionData.riskLevel === 'MODERATE'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {repetitionData.riskLevel === 'HIGH' ? (
                <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />
              ) : repetitionData.riskLevel === 'MODERATE' ? (
                <HelpCircle className="h-4 w-4 shrink-0 text-amber-600" />
              ) : (
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span className="font-medium">
                {repetitionData.riskLevel === 'HIGH'
                  ? 'High Repetition Risk Detected'
                  : repetitionData.riskLevel === 'MODERATE'
                  ? 'Moderate Similarity to Previous Cycles'
                  : 'Novel & Unique Question Concept (< 30% Similarity)'}
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                repetitionData.riskLevel === 'HIGH'
                  ? 'border-destructive/40 text-destructive'
                  : repetitionData.riskLevel === 'MODERATE'
                  ? 'border-amber-500/40 text-amber-700'
                  : 'border-emerald-500/40 text-emerald-700'
              }`}
            >
              {repetitionData.maxSimilarityPct}% Match
            </Badge>
          </div>
          {repetitionData.warningMessage && (
            <p className="text-[11px] text-muted-foreground px-1">{repetitionData.warningMessage}</p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b px-4 bg-muted/20 gap-2">
          <button
            onClick={() => setActiveTab('cognitive')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'cognitive'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            Fresh Bloom’s Stems ({cognitiveVariations.length})
          </button>
          <button
            onClick={() => setActiveTab('pyq')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pyq'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Historical VTU PYQs ({historicalPYQs.length})
          </button>
          <button
            onClick={() => setActiveTab('scenario')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'scenario'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Scenario / NEP 2020 ({scenarioVariations.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Analyzing syllabus ontology & matching past exams...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: COGNITIVE VARIATIONS */}
              {activeTab === 'cognitive' && (
                <div className="space-y-4">
                  {cognitiveVariations.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-2xl p-4 bg-card hover:border-primary/40 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary">
                            {item.actionVerbUsed}
                          </Badge>
                          <span className="font-semibold text-xs text-foreground">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[10px] ${BLOOMS_LABELS[item.bloomsLevel]?.color}`}>
                            {item.bloomsLevel} • {BLOOMS_LABELS[item.bloomsLevel]?.name}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {item.marks}M
                          </Badge>
                        </div>
                      </div>

                      {/* Question Text with KaTeX */}
                      <div className="p-3 bg-muted/30 rounded-xl text-xs leading-relaxed border border-border/50">
                        <MathView content={item.questionText} />
                      </div>

                      {/* Pedagogical Rationale */}
                      <p className="text-[11px] text-muted-foreground italic">
                        💡 {item.rationale}
                      </p>

                      {/* Pre-Synthesized Scheme of Evaluation Steps */}
                      <div className="bg-muted/20 p-2.5 rounded-xl border border-dashed text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                          <span className="flex items-center gap-1">
                            <ListOrdered className="h-3 w-3 text-primary" /> Pre-Synthesized Scheme of Evaluation ({item.marks}M)
                          </span>
                          <span className="text-emerald-600 font-mono text-[10px]">
                            Sum: {item.stepRubric.reduce((s, r) => s + r.marks, 0)}/{item.marks}M Verified
                          </span>
                        </div>
                        <div className="space-y-1">
                          {item.stepRubric.map((step) => (
                            <div key={step.stepNo} className="flex justify-between items-center text-[10px] text-muted-foreground">
                              <span>Step {step.stepNo}: {step.description}</span>
                              <span className="font-mono font-bold text-foreground ml-2">[{step.marks}M]</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleAdopt(item.questionText, item.marks, item.bloomsLevel, item.coMapping, item.stepRubric)}
                          className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Adopt Question & Rubric
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: HISTORICAL VTU PYQs */}
              {activeTab === 'pyq' && (
                <div className="space-y-4">
                  {historicalPYQs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                      No historical questions matching this specific keyword in Module {moduleNumber}.
                    </div>
                  ) : (
                    historicalPYQs.map((pyq) => (
                      <div
                        key={pyq.id}
                        className="border rounded-2xl p-4 bg-card hover:border-accent/40 transition-all shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent font-bold">
                              {pyq.examSession}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {pyq.schemeYear}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Repeated {pyq.repetitionFrequency}× in Autonomous/VTU exams
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={`text-[10px] ${BLOOMS_LABELS[pyq.bloomsLevel]?.color}`}>
                              {pyq.bloomsLevel}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {pyq.marks}M
                            </Badge>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="p-3 bg-muted/30 rounded-xl text-xs leading-relaxed border border-border/50">
                          <MathView content={pyq.questionText} />
                        </div>

                        {/* Model Solution Snippet */}
                        <div className="text-[11px] text-muted-foreground bg-muted/15 p-2 rounded-lg">
                          <span className="font-semibold text-foreground">Model Outline: </span>
                          {pyq.modelSolutionSnippet}
                        </div>

                        {/* Step Rubric */}
                        <div className="bg-muted/20 p-2.5 rounded-xl border border-dashed text-xs space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground">Standard Scheme of Evaluation:</span>
                          {pyq.stepRubric.map((step) => (
                            <div key={step.stepNo} className="flex justify-between items-center text-[10px] text-muted-foreground">
                              <span>Step {step.stepNo}: {step.description}</span>
                              <span className="font-mono font-bold text-foreground">[{step.marks}M]</span>
                            </div>
                          ))}
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdopt(pyq.questionText, pyq.marks, pyq.bloomsLevel, pyq.coMapping, pyq.stepRubric)}
                            className="h-8 text-xs gap-1.5 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Adopt Historical PYQ
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: SCENARIO / NEP 2020 */}
              {activeTab === 'scenario' && (
                <div className="space-y-4">
                  {scenarioVariations.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-2xl p-4 bg-card hover:border-emerald-500/40 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            NEP 2020 • HOTS
                          </Badge>
                          <span className="font-semibold text-xs text-foreground">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[10px] ${BLOOMS_LABELS[item.bloomsLevel]?.color}`}>
                            {item.bloomsLevel} • {BLOOMS_LABELS[item.bloomsLevel]?.name}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {item.marks}M
                          </Badge>
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="p-3 bg-muted/30 rounded-xl text-xs leading-relaxed border border-border/50">
                        <MathView content={item.questionText} />
                      </div>

                      <p className="text-[11px] text-muted-foreground italic">
                        💡 {item.rationale}
                      </p>

                      {/* Pre-Synthesized Scheme */}
                      <div className="bg-muted/20 p-2.5 rounded-xl border border-dashed text-xs space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground">Scenario Rubric Breakdown:</span>
                        {item.stepRubric.map((step) => (
                          <div key={step.stepNo} className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>Step {step.stepNo}: {step.description}</span>
                            <span className="font-mono font-bold text-foreground">[{step.marks}M]</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleAdopt(item.questionText, item.marks, item.bloomsLevel, item.coMapping, item.stepRubric)}
                          className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Adopt Scenario Problem
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
