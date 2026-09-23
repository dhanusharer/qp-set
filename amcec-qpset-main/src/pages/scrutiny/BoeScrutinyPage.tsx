import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  FileText, 
  Check, 
  X, 
  Edit3, 
  Printer, 
  BookOpen,
  UserX,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { MathView } from '@/components/MathView';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function BoeScrutinyPage() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [activeStage, setActiveStage] = useState<'PEDAGOGICAL' | 'LINGUISTIC' | 'COE_APPROVAL'>('PEDAGOGICAL');
  const [reviewComments, setReviewComments] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Scrutiny checklist
  const [checklist, setChecklist] = useState({
    syllabusCovered: true,
    bloomsValid: true,
    noAmbiguity: true,
    marksSumValid: true
  });

  // Minor typo correction state
  const [editingSnapshotId, setEditingSnapshotId] = useState<number | null>(null);
  const [editedStemText, setEditedStemText] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  const loadPapers = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/scrutiny/papers');
      const list = res?.forms || res?.data?.forms || [];
      setPapers(list);
    } catch (err) {
      console.error('Failed to load scrutiny papers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers();
  }, []);

  const openScrutinyModal = async (formId: number) => {
    try {
      const res: any = await apiClient.get(`/scrutiny/papers/${formId}`);
      const form = res?.form || res?.data?.form;
      if (form) {
        setSelectedPaper(form);
        setReviewComments('');
      }
    } catch {
      toast.error('Failed to load paper details for scrutiny');
    }
  };

  const submitReview = async (verdict: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED') => {
    if (!selectedPaper) return;
    if (!reviewComments.trim()) {
      toast.error('Please enter review remarks / scrutiny comments');
      return;
    }

    try {
      setSubmittingReview(true);
      const payload = {
        stage: activeStage,
        verdict,
        comments: reviewComments,
        checklist
      };

      const res: any = await apiClient.post(`/scrutiny/papers/${selectedPaper.id}/review`, payload);
      if (res?.success) {
        toast.success(`Scrutiny verdict recorded: ${verdict}`);
        setSelectedPaper(null);
        await loadPapers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit scrutiny review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const saveCorrection = async (snapshotId: number) => {
    if (!editedStemText.trim()) return;
    try {
      const res: any = await apiClient.patch(`/scrutiny/snapshots/${snapshotId}`, {
        frozenStemText: editedStemText,
        reason: editReason || 'Typographical / phrasing refinement by BoE'
      });
      if (res?.success) {
        toast.success('Linguistic correction saved');
        setEditingSnapshotId(null);
        // Refresh active paper
        openScrutinyModal(selectedPaper.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save correction');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <UserX className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Anonymous BoE Scrutiny Portal</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Board of Examiners blind quality evaluation: Setter identities are cryptographically masked to eliminate bias.
          </p>
        </div>

        <Badge variant="outline" className="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30 flex items-center gap-2 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" /> Double-Blind Scrutiny Protocol
        </Badge>
      </div>

      {/* Papers Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Parallel Paper Forms Under Governance</h3>
          <span className="text-xs text-muted-foreground">{papers.length} forms in review pipeline</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading examination forms...</div>
        ) : papers.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold">No Papers Awaiting Scrutiny</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Generate parallel sets in the Assessment Blueprint engine first to submit them for BoE scrutiny.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map((paper) => (
              <Card key={paper.id} className="shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-foreground">{paper.setName}</span>
                    <Badge
                      className={
                        paper.status === 'BOE_APPROVED' || paper.status === 'APPROVED'
                          ? 'bg-emerald-600 text-white'
                          : paper.status === 'LINGUISTIC_SCRUTINY'
                          ? 'bg-blue-600 text-white'
                          : paper.status === 'REVISION_REQUIRED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }
                    >
                      {paper.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-1">
                    {paper.courseCode} - {paper.courseName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {paper.blueprintTitle} • {paper.totalMarks} Marks
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department:</span>
                      <strong className="text-foreground">{paper.department}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions Frozen:</span>
                      <strong className="text-foreground">{paper.totalQuestions} items</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center justify-center gap-1"
                      onClick={() => navigate(`/controller/scheme-evaluation/${paper.id}`)}
                    >
                      <Printer className="w-3.5 h-3.5" /> Scheme
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1"
                      onClick={() => openScrutinyModal(paper.id)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Scrutinize
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Scrutiny Modal */}
      {selectedPaper && (
        <Dialog open={!!selectedPaper} onOpenChange={() => setSelectedPaper(null)}>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6">
            <DialogHeader className="border-b pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-indigo-500" />
                    <DialogTitle className="text-lg font-bold">
                      {selectedPaper.setName} — Anonymous BoE Scrutiny
                    </DialogTitle>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedPaper.blueprint?.courseCode} - {selectedPaper.blueprint?.courseName} • Total {selectedPaper.blueprint?.totalMarks} Marks
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono bg-indigo-50/50 text-indigo-700 dark:text-indigo-400">
                  Double-Blind Anonymity Guaranteed
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Stage Switcher */}
              <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-lg text-xs">
                <span className="font-semibold px-2 text-muted-foreground">Scrutiny Stage:</span>
                <Button
                  size="sm"
                  variant={activeStage === 'PEDAGOGICAL' ? 'default' : 'ghost'}
                  className="h-7 text-xs"
                  onClick={() => setActiveStage('PEDAGOGICAL')}
                >
                  1. Pedagogical & Bloom's
                </Button>
                <Button
                  size="sm"
                  variant={activeStage === 'LINGUISTIC' ? 'default' : 'ghost'}
                  className="h-7 text-xs"
                  onClick={() => setActiveStage('LINGUISTIC')}
                >
                  2. Linguistic & Structural
                </Button>
                <Button
                  size="sm"
                  variant={activeStage === 'COE_APPROVAL' ? 'default' : 'ghost'}
                  className="h-7 text-xs"
                  onClick={() => setActiveStage('COE_APPROVAL')}
                >
                  3. CoE Approval
                </Button>
              </div>

              {/* Question Items Listing with Masked Setters */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Frozen Question Items ({selectedPaper.snapshots?.length}):
                </h4>

                {selectedPaper.snapshots?.map((snap: any) => (
                  <div
                    key={snap.id}
                    className={`p-4 rounded-xl border ${
                      snap.isAlternative
                        ? 'border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-primary">{snap.questionNumber}</span>
                        {snap.isAlternative && (
                          <Badge variant="outline" className="text-[10px] text-amber-600">
                            OR Alternative
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
                        {/* Masked Setter Badge - No identity revealed */}
                        <Badge variant="secondary" className="text-[10px] font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {snap.anonymousSetter}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{snap.frozenMarks} Marks</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingSnapshotId(snap.id);
                            setEditedStemText(snap.frozenStemJson?.text || snap.frozenStemJson);
                            setEditReason('');
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Typo Fix
                        </Button>
                      </div>
                    </div>

                    {/* Stem & Rendering */}
                    {editingSnapshotId === snap.id ? (
                      <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                        <Label className="text-xs font-semibold">BoE Typographical Refinement:</Label>
                        <Textarea
                          value={editedStemText}
                          onChange={(e) => setEditedStemText(e.target.value)}
                          rows={3}
                          className="text-xs font-sans"
                        />
                        <Input
                          placeholder="Reason for editorial correction (e.g. fixed grammatical typo in formula)"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingSnapshotId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-7 text-xs bg-indigo-600 text-white" onClick={() => saveCorrection(snap.id)}>
                            Apply Correction
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <MathView content={snap.frozenStemJson?.text || snap.frozenStemJson} />
                        {snap.frozenStemJson?.svg && (
                          <div
                            className="max-w-md p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 mt-2"
                            dangerouslySetInnerHTML={{ __html: snap.frozenStemJson.svg }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Scrutiny Decision Panel */}
              <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-sm font-bold text-foreground">Scrutiny Verification Checklist & Decision</h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 border rounded-lg bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.syllabusCovered}
                      onChange={(e) => setChecklist({ ...checklist, syllabusCovered: e.target.checked })}
                    />
                    <span>Syllabus Covered</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-lg bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.bloomsValid}
                      onChange={(e) => setChecklist({ ...checklist, bloomsValid: e.target.checked })}
                    />
                    <span>Bloom's Valid</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-lg bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.noAmbiguity}
                      onChange={(e) => setChecklist({ ...checklist, noAmbiguity: e.target.checked })}
                    />
                    <span>No Phrasing Ambiguity</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-lg bg-card cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.marksSumValid}
                      onChange={(e) => setChecklist({ ...checklist, marksSumValid: e.target.checked })}
                    />
                    <span>100M Sum Valid</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">BoE Scrutiny Commentary / Remarks *</Label>
                  <Textarea
                    placeholder="Enter official scrutiny observations (e.g. Questions in Module 3 are well-formulated, approved for SEE)..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                    disabled={submittingReview}
                    onClick={() => submitReview('REJECTED')}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Reject Paper
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs"
                    disabled={submittingReview}
                    onClick={() => submitReview('CHANGES_REQUESTED')}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Request Revision
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    disabled={submittingReview}
                    onClick={() => submitReview('APPROVED')}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve Scrutiny Stage
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
