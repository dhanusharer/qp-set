import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, ShieldAlert, BookOpen, Printer, Download, CheckCircle2, FileText } from 'lucide-react';
import { OfficialPaperPreview } from '@/components/paper-authoring/OfficialPaperPreview';
import { parseOrConvertPaperContent } from '@/components/paper-authoring/types';

export default function PreviewPaper() {
  const { currentUser } = useAuth();
  const { getAssignmentsForFaculty, getAssignmentsForHod } = useApp();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  const isHod = currentUser.role === 'hod';
  const myAssignments = isHod
    ? getAssignmentsForHod(currentUser.id)
    : getAssignmentsForFaculty(currentUser.id);

  // Only include assignments that have drafted/submitted papers
  const previewableAssignments = myAssignments.filter((a) => a.paper !== null);

  const currentAssignment = useMemo(() => {
    if (selectedAssignmentId) {
      return previewableAssignments.find((a) => String(a.id) === String(selectedAssignmentId)) || null;
    }
    return previewableAssignments[0] || null;
  }, [previewableAssignments, selectedAssignmentId]);

  const courseCode = currentAssignment?.course?.courseCode || 'BCS303';
  const courseName = currentAssignment?.course?.courseName || 'Data Structures & Applications';
  const semester = currentAssignment?.semester || '3rd Semester';
  const isInternal = currentAssignment?.examType?.includes('40 Marks') || false;
  const maxMarks = isInternal ? 40 : 100;

  const parsedPaper = useMemo(() => {
    if (!currentAssignment?.paper) return null;
    let rawContent = currentAssignment.paper.content;
    if (typeof rawContent === 'string') {
      try {
        rawContent = JSON.parse(rawContent);
      } catch (e) {
        console.error('Failed to parse paper content JSON', e);
      }
    }
    return parseOrConvertPaperContent(rawContent, courseCode, courseName, semester, maxMarks);
  }, [currentAssignment, courseCode, courseName, semester, maxMarks]);

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  if (previewableAssignments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Secure Paper Preview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHod
              ? 'Preview drafts and submissions from setters in your department.'
              : 'Review your drafted and submitted question papers in a secure workspace.'}
          </p>
        </div>
        <div className="bg-card border rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Eye className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-base font-bold text-foreground">No Question Papers Available</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isHod
                ? 'There are currently no drafted or submitted question papers in your department to preview.'
                : 'You have not created or saved drafts for any question papers yet.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Secure Paper Preview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHod
              ? 'Preview drafts and submissions from setters in your department.'
              : 'Review your drafted and submitted question papers in an authentic VTU Autonomous format.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
            <ShieldAlert className="h-3 w-3 mr-1" /> Watermarked & Scrutiny Locked
          </Badge>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-xs max-w-2xl mx-auto space-y-5 text-center">
        {/* Paper selector dropdown */}
        <div className="text-left space-y-1.5 max-w-md mx-auto">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-primary" /> Select Assessment Paper
          </label>
          <Select
            value={currentAssignment?.id?.toString() || ''}
            onValueChange={(v) => setSelectedAssignmentId(Number(v))}
          >
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select a paper to preview" />
            </SelectTrigger>
            <SelectContent>
              {previewableAssignments.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                  {a.assessmentCode} — {a.course?.courseName} ({a.course?.courseCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full border-t border-dashed my-2" />

        <div className="space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-xl font-bold text-foreground">
            {currentAssignment?.course?.courseName}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {currentAssignment?.course?.courseCode}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {currentAssignment?.examType}
            </Badge>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
              {maxMarks} Marks
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto pt-1">
            Rendered with authentic AMCEC Autonomous typography, 4-column layout, candidate instructions, and KaTeX mathematical notation.
          </p>
        </div>

        <div className="pt-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-10 gap-2">
                <Eye className="h-4 w-4" />
                Open Fullscreen VTU Paper Preview
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-5xl max-h-[92vh] overflow-y-auto"
              onContextMenu={handleContextMenu}
            >
              <DialogHeader>
                <DialogTitle className="font-serif flex items-center justify-between text-base">
                  <span>Official Examination Paper Preview</span>
                  <Badge variant="outline" className="text-[11px] text-destructive border-destructive/20 bg-destructive/5 mr-6">
                    CONFIDENTIAL — AMCEC EXAMINATION OS
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Security Warning Notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  This examination document is protected under AMCEC Academic Regulations. Unauthorised reproduction, photography, or sharing is strictly prohibited.
                </span>
              </div>

              {/* Watermarked Paper Canvas */}
              <div className="relative select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <p className="text-5xl font-black text-slate-900/[0.04] rotate-[-45deg] whitespace-nowrap tracking-widest font-mono">
                    AMCEC CONFIDENTIAL — {currentUser.name?.toUpperCase()}
                  </p>
                </div>

                {parsedPaper && <OfficialPaperPreview paper={parsedPaper} />}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Embedded inline preview directly on page for quick reference */}
      {parsedPaper && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Live Document Canvas
            </h3>
            <span className="text-xs text-muted-foreground">Read-only preview</span>
          </div>
          <div className="border rounded-2xl bg-card p-4 overflow-hidden">
            <OfficialPaperPreview paper={parsedPaper} />
          </div>
        </div>
      )}
    </div>
  );
}
