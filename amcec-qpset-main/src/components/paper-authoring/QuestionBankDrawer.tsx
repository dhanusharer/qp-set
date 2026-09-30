import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MathView } from '@/components/MathView';
import { apiClient } from '@/lib/apiClient';
import { QuestionSubpart } from './types';
import { Database, Search, Filter, Plus, ArrowDownRight, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

interface BankQuestion {
  id: number;
  code: string;
  unitNumber: number;
  topic: string;
  subtopic?: string;
  plainText: string;
  stemRichJson?: any;
  status: string;
  currentVersion?: {
    parts: Array<{
      partLabel: string;
      marks: number;
      bloomsLevel: string;
      coCode: string;
      markingRubric?: any;
      modelAnswerJson?: any;
    }>;
  };
}

interface QuestionBankDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  moduleNumber: number;
  onSelectQuestion: (parts: QuestionSubpart[], stemText: string) => void;
}

export const QuestionBankDrawer: React.FC<QuestionBankDrawerProps> = ({
  open,
  onOpenChange,
  courseId,
  moduleNumber,
  onSelectQuestion,
}) => {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlooms, setSelectedBlooms] = useState<string>('ALL');

  useEffect(() => {
    if (open && courseId) {
      setLoading(true);
      apiClient.get<any>(`/bank/courses/${courseId}/questions`)
        .then((res) => {
          const raw = Array.isArray(res.data) ? res.data : res.data?.questions || [];
          setQuestions(raw);
        })
        .catch((err) => {
          console.error('Failed to load bank questions:', err);
          setQuestions([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open, courseId]);

  const filteredQuestions = questions.filter((q) => {
    // Filter by module / unit
    const matchesUnit = q.unitNumber === moduleNumber || moduleNumber === 0;
    // Filter by search query
    const matchesSearch =
      !searchQuery ||
      q.plainText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.code?.toLowerCase().includes(searchQuery.toLowerCase());
    // Filter by Blooms
    const matchesBlooms =
      selectedBlooms === 'ALL' ||
      q.currentVersion?.parts?.some((p) => p.bloomsLevel === selectedBlooms);

    return matchesUnit && matchesSearch && matchesBlooms;
  });

  const handleImport = (q: BankQuestion) => {
    const rawParts = q.currentVersion?.parts || [];
    let convertedParts: QuestionSubpart[];

    if (rawParts.length > 0) {
      convertedParts = rawParts.map((p, idx) => ({
        id: `sub_bank_${Date.now()}_${idx}`,
        partLabel: p.partLabel || (idx === 0 ? '(a)' : idx === 1 ? '(b)' : '(c)'),
        text: q.plainText,
        marks: p.marks || 10,
        bloomsLevel: (p.bloomsLevel as any) || 'L3',
        coMapping: p.coCode || `CO${moduleNumber}`,
        difficulty: ['L1', 'L2'].includes(p.bloomsLevel) ? 'Easy' : 'Medium',
        bankQuestionId: q.id,
        markingRubric: Array.isArray(p.markingRubric)
          ? p.markingRubric.map((r: any, rIdx: number) => ({
              id: `r_${rIdx}`,
              stepNo: r.stepNo || rIdx + 1,
              description: r.description || 'Derivation / computation step',
              marks: r.marks || 2,
            }))
          : [
              { id: 'r1', stepNo: 1, description: 'Core principle and formula', marks: Math.ceil(p.marks * 0.3) },
              { id: 'r2', stepNo: 2, description: 'Working solution / diagram', marks: Math.floor(p.marks * 0.7) },
            ],
        modelAnswer: typeof p.modelAnswerJson === 'string' ? p.modelAnswerJson : '',
      }));
    } else {
      convertedParts = [
        {
          id: `sub_bank_${Date.now()}_0`,
          partLabel: '(a)',
          text: q.plainText,
          marks: 10,
          bloomsLevel: 'L3',
          coMapping: `CO${moduleNumber}`,
          difficulty: 'Medium',
          bankQuestionId: q.id,
          markingRubric: [
            { id: 'r1', stepNo: 1, description: 'Basic definition', marks: 3 },
            { id: 'r2', stepNo: 2, description: 'Explanation with diagrams', marks: 7 },
          ],
          modelAnswer: '',
        },
      ];
    }

    onSelectQuestion(convertedParts, q.plainText);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Department Question Bank Browser
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Import vetted questions with pre-configured Bloom's levels, COs, and step marking rubrics into Module {moduleNumber}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 py-2 border-b">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, keyword, or question code..."
              className="text-xs pl-8 h-8"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <span>Blooms:</span>
            <select
              value={selectedBlooms}
              onChange={(e) => setSelectedBlooms(e.target.value)}
              className="bg-card border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Levels</option>
              <option value="L1">L1 Remember</option>
              <option value="L2">L2 Understand</option>
              <option value="L3">L3 Apply</option>
              <option value="L4">L4 Analyze</option>
              <option value="L5">L5 Evaluate</option>
              <option value="L6">L6 Create</option>
            </select>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3 py-2 overflow-y-auto flex-1 pr-1">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading vetted questions from bank...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 space-y-2">
              <Database className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-semibold text-foreground">No Bank Questions Found</p>
              <p className="text-[11px] text-muted-foreground">
                Try broadening your search query or check if questions exist for Unit {moduleNumber}.
              </p>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const totalParts = q.currentVersion?.parts?.length || 1;
              const totalMarks = q.currentVersion?.parts?.reduce((sum, p) => sum + (p.marks || 0), 0) || 10;
              const firstBlooms = q.currentVersion?.parts?.[0]?.bloomsLevel || 'L3';

              return (
                <div
                  key={q.id}
                  className="p-3.5 rounded-lg border bg-card/60 hover:border-primary/50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{q.code}</span>
                      <Badge variant="outline" className="text-[10px]">
                        Unit {q.unitNumber} • {q.topic}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                        {totalParts} Part(s) • {totalMarks}M
                      </Badge>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleImport(q)}
                      className="h-7 text-xs gap-1 bg-primary text-primary-foreground"
                    >
                      <ArrowDownRight className="h-3 w-3" />
                      Insert into Paper
                    </Button>
                  </div>

                  <div className="text-xs text-foreground bg-muted/20 p-2.5 rounded border">
                    <MathView content={q.plainText} />
                  </div>

                  {q.currentVersion?.parts && q.currentVersion.parts.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
                      {q.currentVersion.parts.map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-muted/50 border font-mono">
                          {p.partLabel} [{p.marks}M • {p.bloomsLevel} • {p.coCode}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
