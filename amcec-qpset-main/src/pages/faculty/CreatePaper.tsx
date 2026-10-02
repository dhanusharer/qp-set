import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit3,
  Bot,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Loader2,
  Layers,
  Wand2,
  ShieldCheck,
  FileCheck,
  Download,
  Upload,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  QuestionPaperContent,
  ExamModule,
  parseOrConvertPaperContent,
  BLOOMS_LABELS,
} from '@/components/paper-authoring/types';
import { ModuleAccordion } from '@/components/paper-authoring/ModuleAccordion';
import { RegulatoryDiagnosticsRadar } from '@/components/paper-authoring/RegulatoryDiagnosticsRadar';
import { OfficialPaperPreview } from '@/components/paper-authoring/OfficialPaperPreview';
import { ComplianceAuditorModal } from '@/components/paper-authoring/ComplianceAuditorModal';
import { usePaperAutoSave } from '@/hooks/usePaperAutoSave';

export default function CreatePaper() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { addNotification, getAssignmentsForFaculty } = useApp();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const assignmentIdParam = searchParams.get('id');

  const [saving, setSaving] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'authoring' | 'preview'>('authoring');
  const [activeModuleFilter, setActiveModuleFilter] = useState<number | 'all'>('all');

  if (!currentUser) return null;

  const myAssignments = getAssignmentsForFaculty(currentUser.id);
  const currentAssignment = useMemo(() => {
    if (assignmentIdParam) {
      return myAssignments.find((a) => String(a.id) === assignmentIdParam) || null;
    }
    return null;
  }, [myAssignments, assignmentIdParam]);

  const isInternal = currentAssignment?.examType?.includes('40 Marks') || false;
  const maxMarks = isInternal ? 40 : 100;
  const courseCode = currentAssignment?.course?.courseCode || 'BCS303';
  const courseName = currentAssignment?.course?.courseName || 'Data Structures & Applications';
  const semester = currentAssignment?.semester || '3rd Semester';

  // Question Paper state
  const [paper, setPaper] = useState<QuestionPaperContent>(() =>
    parseOrConvertPaperContent(
      currentAssignment?.paper?.content,
      courseCode,
      courseName,
      semester,
      maxMarks
    )
  );

  // Sync when currentAssignment changes or loads
  useEffect(() => {
    if (currentAssignment && currentAssignment.paper) {
      let rawContent = currentAssignment.paper.content;
      if (typeof rawContent === 'string') {
        try {
          rawContent = JSON.parse(rawContent);
        } catch (e) {
          console.error('Failed to parse paper content JSON', e);
        }
      }
      setPaper(parseOrConvertPaperContent(rawContent, courseCode, courseName, semester, maxMarks));
    }
  }, [currentAssignment, courseCode, courseName, semester, maxMarks]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Continuous local auto-save & crash recovery engine
  const {
    saveStatus,
    lastSavedTime,
    hasRecoverableDraft,
    recoverableTimestamp,
    restoreDraft,
    discardDraft,
    clearDraft,
    exportBackup,
    importBackup,
  } = usePaperAutoSave({
    assignmentId: currentAssignment?.id,
    paper,
    serverUpdatedAt: currentAssignment?.paper?.updatedAt,
    onRestore: (restored) => setPaper(restored),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(file);
      toast({
        title: 'Offline Backup Imported',
        description: 'Question paper content successfully restored from backup file.',
      });
    } catch (err: any) {
      toast({
        title: 'Import Failed',
        description: err.message || 'Could not parse question paper backup file.',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Update a single module
  const handleUpdateModule = (updatedModule: ExamModule) => {
    setPaper((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => (m.id === updatedModule.id ? updatedModule : m)),
      metadata: {
        ...prev.metadata,
        lastSavedAt: new Date().toISOString(),
      },
    }));
  };

  // AI Auto-Balance Bloom's Levels (Target: 30-35% LOTS, 65-70% HOTS)
  const handleAutoBalanceBlooms = () => {
    setPaper((prev) => {
      const updatedModules = prev.modules.map((mod) => {
        // Question A: subpart 1 = L2 (LOTS), subpart 2 = L3/L4 (HOTS)
        const newSubpartsA = mod.questionA.subparts.map((sp, idx) => ({
          ...sp,
          bloomsLevel: idx === 0 ? ('L2' as const) : ('L3' as const),
          difficulty: idx === 0 ? ('Easy' as const) : ('Medium' as const),
        }));

        // Question B: subpart 1 = L3 (HOTS), subpart 2 = L4/L5 (HOTS)
        const newSubpartsB = mod.questionB.subparts.map((sp, idx) => ({
          ...sp,
          bloomsLevel: idx === 0 ? ('L3' as const) : ('L4' as const),
          difficulty: idx === 0 ? ('Medium' as const) : ('Hard' as const),
        }));

        return {
          ...mod,
          questionA: { ...mod.questionA, subparts: newSubpartsA },
          questionB: { ...mod.questionB, subparts: newSubpartsB },
        };
      });

      return { ...prev, modules: updatedModules };
    });

    toast({
      title: '🎯 Bloom’s Distribution Auto-Balanced',
      description: 'Adjusted subparts to optimal VTU Autonomous ratio (~30% LOTS / ~70% HOTS).',
    });
  };

  // AI Course Outcome Alignment
  const handleAlignOutcomes = () => {
    setPaper((prev) => {
      const updatedModules = prev.modules.map((mod) => {
        const assignedCO = `CO${Math.min(mod.moduleNumber, 5)}`;
        return {
          ...mod,
          questionA: {
            ...mod.questionA,
            subparts: mod.questionA.subparts.map((sp) => ({ ...sp, coMapping: assignedCO })),
          },
          questionB: {
            ...mod.questionB,
            subparts: mod.questionB.subparts.map((sp) => ({ ...sp, coMapping: assignedCO })),
          },
        };
      });

      return { ...prev, modules: updatedModules };
    });

    toast({
      title: '📚 Course Outcomes Aligned',
      description: 'Mapped Module 1 through 5 questions to CO1 through CO5 respectively.',
    });
  };

  // Save draft or submit
  const handleSave = async (submit: boolean = false) => {
    if (!currentAssignment) return;
    setSaving(true);
    try {
      await apiClient.put(`/assignments/${currentAssignment.id}/paper`, {
        content: paper,
        submit,
      });

      if (submit) {
        await addNotification({
          userId: currentAssignment.hodId || 1,
          message: `${currentUser.name} has submitted the ${currentAssignment.course?.courseName || 'exam'} question paper.`,
          date: new Date().toISOString().split('T')[0],
          read: false,
          type: 'success',
        });
        toast({
          title: 'Paper Submitted to HOD!',
          description: 'Your question paper has been submitted to the HOD for BoE scrutiny and review.',
        });
      } else {
        toast({
          title: 'Draft Saved',
          description: 'Your question paper draft with schemes of evaluation has been securely saved in PostgreSQL.',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save paper details.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSubmit = async () => {
    await handleSave(true);
    clearDraft();
    setAuditModalOpen(false);
  };

  if (!currentAssignment) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-card border border-border rounded-2xl shadow-lg text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-full bg-warning/15 text-warning flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-xl font-bold text-foreground">No Active Assignment Selected</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You cannot create or edit a question paper directly. You must first select an active course assignment allocated to you from your assignments list.
          </p>
        </div>
        <Button
          onClick={() => navigate(currentUser.role === 'hod' ? '/hod/assignments' : '/faculty/assignments')}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10"
        >
          View My Assignments
        </Button>
      </div>
    );
  }

  // Filter modules based on tab selection
  const displayedModules = activeModuleFilter === 'all'
    ? paper.modules
    : paper.modules.filter((m) => m.moduleNumber === activeModuleFilter);

  return (
    <div className="space-y-6">
      {/* Crash Recovery Notification Banner */}
      {hasRecoverableDraft && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 mt-0.5">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  Unsaved Local Draft Detected
                </h4>
                <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                  Crash Recovery
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                A newer local draft snapshot from {recoverableTimestamp ? new Date(recoverableTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'recently'} was preserved in browser memory. Would you like to restore it?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => {
                restoreDraft();
                toast({
                  title: 'Draft Restored',
                  description: 'Successfully restored all modules and evaluation schemes from your local snapshot.',
                });
              }}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Draft
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                discardDraft();
                toast({
                  title: 'Draft Cache Discarded',
                  description: 'Local recovery cache has been cleared.',
                });
              }}
              className="h-8 text-xs border-amber-500/30 hover:bg-muted text-muted-foreground"
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/faculty/assignments')}
              className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Assignments
            </Button>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-bold">
              {paper.examType} • {paper.maxMarks} Marks
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              {paper.courseCode}
            </Badge>

            {/* Autosave Status Badge */}
            {saveStatus === 'saving' && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Auto-saving locally...
              </Badge>
            )}
            {saveStatus === 'saved' && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 font-mono">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {lastSavedTime ? `Auto-saved ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Auto-saved locally'}
              </Badge>
            )}
            {saveStatus === 'unsaved' && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                Unsaved edits
              </Badge>
            )}
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground tracking-tight">
            {paper.courseName}
          </h1>
          <p className="text-xs text-muted-foreground">
            AMCEC Autonomous Paper Setting Suite • {paper.semester} • VTU Modular Format (5 Modules with Internal Choice)
          </p>
        </div>

        {/* Action Buttons & View Modes */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Offline JSON Backup & Recovery */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportBackup}
              title="Export paper snapshot as JSON backup file"
              className="h-8 text-xs px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              Backup .json
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import paper from JSON backup file"
              className="h-8 text-xs px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
          </div>

          <div className="bg-muted/60 p-1 rounded-xl flex items-center border">
            <Button
              size="sm"
              variant={activeTab === 'authoring' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('authoring')}
              className="h-8 text-xs gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Authoring Studio
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'preview' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('preview')}
              className="h-8 text-xs gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Official VTU Preview
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="h-8 text-xs gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => setAuditModalOpen(true)}
            disabled={saving}
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Submit to HOD
          </Button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        /* Official VTU Autonomous Question Paper Preview Mode */
        <OfficialPaperPreview paper={paper} />
      ) : (
        /* Authoring Studio Mode */
        <div className="space-y-6">
          {/* Real-Time Regulatory & Cognitive Diagnostics Radar */}
          <RegulatoryDiagnosticsRadar modules={paper.modules} expectedTotalMarks={paper.maxMarks} />

          {/* Module Selector & Quick Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-2xl p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground mr-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary" /> Modules:
              </span>
              <Button
                size="sm"
                variant={activeModuleFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveModuleFilter('all')}
                className="h-7 text-xs px-3"
              >
                All Modules (5)
              </Button>
              {paper.modules.map((m) => {
                const marksA = m.questionA.subparts.reduce((s, sp) => s + (Number(sp.marks) || 0), 0);
                const marksB = m.questionB.subparts.reduce((s, sp) => s + (Number(sp.marks) || 0), 0);
                const isBalanced = marksA === 20 && marksB === 20;

                return (
                  <Button
                    key={m.id}
                    size="sm"
                    variant={activeModuleFilter === m.moduleNumber ? 'default' : 'outline'}
                    onClick={() => setActiveModuleFilter(m.moduleNumber)}
                    className={`h-7 text-xs px-2.5 gap-1.5 ${
                      isBalanced
                        ? 'border-emerald-500/30 text-foreground'
                        : 'border-amber-500/40 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    <span>Mod {m.moduleNumber}</span>
                    <span
                      className={`text-[10px] px-1 rounded font-mono ${
                        isBalanced ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                      }`}
                    >
                      {marksA}M/{marksB}M
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Quick AI Refinement Shortcuts */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoBalanceBlooms}
                className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                title="Automatically set LOTS and HOTS levels according to VTU regulations"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                Auto-Balance Bloom’s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAlignOutcomes}
                className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                title="Map Module 1-5 to CO1-CO5"
              >
                <BookOpen className="h-3 w-3 text-blue-500" />
                Align CO1–CO5
              </Button>
            </div>
          </div>

          {/* Module Accordions List */}
          <div className="space-y-6">
            {displayedModules.map((module) => (
              <ModuleAccordion
                key={module.id}
                module={module}
                courseId={currentAssignment.course?.id || 1}
                expectedQuestionMarks={20}
                onChange={handleUpdateModule}
              />
            ))}
          </div>

          {/* Bottom Floating Save Action */}
          <div className="sticky bottom-4 z-20 flex items-center justify-between p-4 bg-card/95 backdrop-blur-md border rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>All changes cached locally and verified against VTU Autonomous Blueprint.</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="h-8 text-xs gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Draft
              </Button>

              <Button
                size="sm"
                onClick={() => setAuditModalOpen(true)}
                disabled={saving}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Submit to HOD
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Submission Autonomous Compliance Auditor Modal */}
      <ComplianceAuditorModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        paper={paper}
        onConfirmSubmit={handleConfirmSubmit}
        submitting={saving}
        onJumpToModule={(modNum) => {
          setActiveModuleFilter(modNum);
          setActiveTab('authoring');
        }}
      />
    </div>
  );
}
