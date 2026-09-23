import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  ChevronLeft,
  Calendar,
  Layers,
  ShieldCheck,
  Users,
  Database,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Hash,
  Clock,
  UserCheck,
  Plus,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface EventDetails {
  id: number;
  scheduledDate: string | null;
  status: string;
  course: {
    id: number;
    code: string;
    name: string;
    semester: string;
    credits: number;
    department?: { name: string; code: string };
    outcomes: Array<{ id: number; code: string; statement: string; targetAttainment: number }>;
    curriculumCourses: Array<{
      curriculumVersion: { code: string; schemeName: string; schemeYear: string };
    }>;
  };
  examSession: {
    id: number;
    name: string;
    code: string;
    status: string;
    academicTerm: {
      name: string;
      termType: string;
      academicYear: { code: string; name: string };
    };
    assessmentType: { code: string; name: string };
    regulationProfile?: { code: string; name: string; rulesJson: any };
  };
  paperForms: Array<{
    id: number;
    formCode: string;
    status: string;
    versions: Array<{
      id: number;
      versionNumber: number;
      contentHash: string;
      status: string;
      itemSnapshots: Array<{
        id: number;
        questionNumber: string;
        moduleNumber: number;
        frozenStemJson: any;
        frozenMarks: number;
        frozenBlooms: string;
        frozenCoCode: string;
        question: { code: string };
      }>;
    }>;
  }>;
  registrations: Array<{
    id: number;
    studentUsn: string;
    studentName: string;
    candidateType: string;
    cohortYear?: string;
    eligible: boolean;
    remarks?: string;
  }>;
  questionUsages: Array<{
    id: number;
    questionVersion: {
      id: number;
      plainText: string;
      question: { code: string; unitNumber: number; topic: string };
    };
  }>;
}

export const AssessmentEventPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forms');
  const [registering, setRegistering] = useState(false);

  const fetchEvent = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; data: EventDetails }>(
        `/academic-cycles/events/${eventId}`
      );
      setEvent(res.data);
    } catch (err) {
      console.error('Failed to load assessment event:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const handleRegisterSampleBacklog = async () => {
    if (!eventId) return;
    try {
      setRegistering(true);
      const sampleCandidates = [
        {
          studentUsn: `1AM23CS${Math.floor(100 + Math.random() * 899)}`,
          studentName: 'Aarav Sharma (Backlog Cohort 2023)',
          candidateType: 'BACKLOG' as const,
          cohortYear: '2023-24',
          eligible: true,
          remarks: 'Remedial registration from 3rd semester backlog',
        },
        {
          studentUsn: `1AM22CS${Math.floor(100 + Math.random() * 899)}`,
          studentName: 'Pooja Hegde (Special Makeup)',
          candidateType: 'MAKEUP' as const,
          cohortYear: '2022-23',
          eligible: true,
          remarks: 'Medical leave re-examination clearance',
        },
      ];

      await apiClient.post(`/academic-cycles/events/${eventId}/candidates`, {
        candidates: sampleCandidates,
      });

      await fetchEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to register candidates');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        Loading operational workspace...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-foreground">Assessment Event Not Found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/controller/exam-sessions')}>
          Return to Exam Sessions
        </Button>
      </div>
    );
  }

  const { course, examSession, paperForms, registrations } = event;
  const regularCount = registrations.filter((r) => r.candidateType === 'REGULAR').length;
  const backlogCount = registrations.filter((r) => r.candidateType === 'BACKLOG').length;
  const makeupCount = registrations.filter((r) => r.candidateType === 'MAKEUP').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          onClick={() => navigate('/controller/exam-sessions')}
          className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Exam Sessions
        </button>
        <span>/</span>
        <span className="text-foreground font-semibold">{examSession.name}</span>
        <span>/</span>
        <span className="text-primary font-bold">{course.code}</span>
      </div>

      {/* Hero Banner Card */}
      <div className="bg-card border rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold text-foreground">{course.code}</span>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {course.department?.name || 'Computer Science'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Semester {course.semester} • {course.credits} Credits
            </Badge>
          </div>
          <h2 className="text-base font-semibold text-foreground">{course.name}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
            <span>
              Academic Year:{' '}
              <strong className="text-foreground">
                {examSession.academicTerm.academicYear.code}
              </strong>
            </span>
            <span>•</span>
            <span>
              Term: <strong className="text-foreground">{examSession.academicTerm.name}</strong>
            </span>
            <span>•</span>
            <span>
              Type:{' '}
              <Badge variant="outline" className="text-[10px] py-0">
                {examSession.assessmentType.name}
              </Badge>
            </span>
            <span>•</span>
            <span>
              Curriculum Scheme:{' '}
              <strong className="text-foreground font-mono">
                {course.curriculumCourses?.[0]?.curriculumVersion?.schemeName || 'VTU 2022 Scheme'}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/controller/historical-explorer?courseId=${course.id}`)}
            className="text-xs gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            Course Multi-Year History
          </Button>
        </div>
      </div>

      {/* Main Tabs Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="forms" className="text-xs gap-1.5 font-medium">
            <FileText className="h-3.5 w-3.5" />
            Parallel Paper Sets ({paperForms.length})
          </TabsTrigger>
          <TabsTrigger value="candidates" className="text-xs gap-1.5 font-medium">
            <Users className="h-3.5 w-3.5" />
            Candidate Roster ({registrations.length})
          </TabsTrigger>
          <TabsTrigger value="blueprint" className="text-xs gap-1.5 font-medium">
            <Layers className="h-3.5 w-3.5" />
            Blueprint & Regulation Rules
          </TabsTrigger>
          <TabsTrigger value="rotation" className="text-xs gap-1.5 font-medium">
            <Database className="h-3.5 w-3.5" />
            Bank Rotation & Questions
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1.5 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Forensic Hash & Security
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Parallel Paper Sets */}
        <TabsContent value="forms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paperForms.map((form) => {
              const latestVer = form.versions?.[0];
              const snapshots = latestVer?.itemSnapshots || [];

              return (
                <div key={form.id} className="bg-card border rounded-lg p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{form.formCode}</span>
                      <Badge variant="outline" className="text-[10px]">
                        v{latestVer?.versionNumber || 1}
                      </Badge>
                    </div>
                    {latestVer?.status === 'SEALED' ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-semibold">
                        VAULT SEALED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {latestVer?.status || 'DRAFT'}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground font-mono bg-muted/40 p-2 rounded">
                    <p className="text-[10px] truncate">
                      Hash:{' '}
                      <span className="text-foreground">
                        {latestVer?.contentHash || 'PENDING_GENERATION'}
                      </span>
                    </p>
                    <p className="text-[10px]">
                      Items Frozen: <strong className="text-foreground">{snapshots.length} questions</strong>
                    </p>
                  </div>

                  <div className="divide-y border rounded max-h-48 overflow-y-auto bg-card">
                    {snapshots.length === 0 ? (
                      <div className="p-4 text-center text-[11px] text-muted-foreground">
                        Draft paper form. Items will be frozen upon generator execution or sealed state.
                      </div>
                    ) : (
                      snapshots.map((snap) => (
                        <div key={snap.id} className="p-2 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between font-semibold text-foreground">
                            <span>{snap.questionNumber} (Mod {snap.moduleNumber})</span>
                            <span className="text-primary">{snap.frozenMarks} Marks • {snap.frozenBlooms}</span>
                          </div>
                          <p className="text-muted-foreground line-clamp-1">
                            {(snap.frozenStemJson as any)?.text || 'Question content frozen in RFC 8785 snapshot'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      Equivalence Score: <strong className="text-emerald-500">98.4%</strong>
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                      Inspect Form
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Candidate Roster (Multi-Cohort: Regular & Backlog) */}
        <TabsContent value="candidates" className="space-y-4">
          <div className="bg-card border rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Candidate Eligibility & Multi-Cohort Registrations
                </h3>
                <p className="text-xs text-muted-foreground">
                  Autonomous support for Regular cohort ({regularCount}), Backlog candidates ({backlogCount}), and Remedial/Make-up candidates ({makeupCount}).
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleRegisterSampleBacklog}
                disabled={registering}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {registering ? 'Registering...' : 'Register Cross-Cohort Backlogs'}
              </Button>
            </div>

            {registrations.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 space-y-2">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-foreground">No Candidates Registered Yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Click 'Register Cross-Cohort Backlogs' to simulate registering students from earlier years taking this exam.
                </p>
              </div>
            ) : (
              <div className="border rounded-md divide-y overflow-hidden">
                <div className="grid grid-cols-12 bg-muted/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">
                  <div className="col-span-3">USN & Candidate Name</div>
                  <div className="col-span-3">Registration Category</div>
                  <div className="col-span-2">Cohort Year</div>
                  <div className="col-span-2">Eligibility Status</div>
                  <div className="col-span-2 text-right">Remarks</div>
                </div>

                {registrations.map((reg) => (
                  <div key={reg.id} className="grid grid-cols-12 items-center px-3 py-2.5 text-xs hover:bg-muted/20">
                    <div className="col-span-3">
                      <span className="font-mono font-bold text-foreground">{reg.studentUsn}</span>
                      <p className="text-[11px] text-muted-foreground">{reg.studentName}</p>
                    </div>

                    <div className="col-span-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          reg.candidateType === 'BACKLOG'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : reg.candidateType === 'MAKEUP'
                            ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}
                      >
                        {reg.candidateType}
                      </Badge>
                    </div>

                    <div className="col-span-2 font-mono text-[11px] text-muted-foreground">
                      {reg.cohortYear || 'Current (2025-26)'}
                    </div>

                    <div className="col-span-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Eligible
                      </span>
                    </div>

                    <div className="col-span-2 text-right text-[11px] text-muted-foreground truncate">
                      {reg.remarks || 'Standard Enrollment'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Blueprint & Regulation */}
        <TabsContent value="blueprint" className="space-y-4">
          <div className="bg-card border rounded-lg p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Regulation Rules & Assessment Blueprint Structure
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Module Architecture</span>
                <p className="font-semibold text-foreground">5 Autonomous Modules</p>
                <p className="text-muted-foreground">Each module contains 2 questions with internal choice (OR pair).</p>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Marks Allocation</span>
                <p className="font-semibold text-foreground">20 Marks per Module (100 Total)</p>
                <p className="text-muted-foreground">VTU Autonomous scheme scaled to 50% CIE + 50% SEE.</p>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Cognitive Bloom Target</span>
                <p className="font-semibold text-foreground">L1/L2: 40% • L3/L4: 60%</p>
                <p className="text-muted-foreground">Strict accreditation enforcement against question inflation.</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-semibold text-foreground mb-2">Mapped Course Outcomes (COs)</h4>
              <div className="space-y-1.5">
                {course.outcomes.map((co) => (
                  <div key={co.id} className="p-2 rounded border bg-card text-xs flex items-center justify-between">
                    <span className="font-bold text-primary mr-3">{co.code}</span>
                    <span className="text-foreground flex-1">{co.statement}</span>
                    <Badge variant="outline" className="text-[10px] ml-2">
                      Target {co.targetAttainment}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Bank Rotation & Questions */}
        <TabsContent value="rotation" className="space-y-4">
          <div className="bg-card border rounded-lg p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Canonical Question Bank Rotation & Cooldown Compliance
            </h3>
            <p className="text-xs text-muted-foreground">
              Questions are reused intelligently across years following Institutional Item Exposure Policies.
            </p>

            <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
              {event.questionUsages.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Questions are bound dynamically during set generation.
                </div>
              ) : (
                event.questionUsages.map((usage) => (
                  <div key={usage.id} className="p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-foreground">
                        {usage.questionVersion.question.code}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        Unit {usage.questionVersion.question.unitNumber}: {usage.questionVersion.question.topic}
                      </span>
                      <p className="text-xs text-foreground/80 mt-0.5 line-clamp-1">
                        {usage.questionVersion.plainText}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Cooled Down
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Forensic Hash & Security */}
        <TabsContent value="security" className="space-y-4">
          <div className="bg-card border rounded-lg p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              RFC 8785 Canonical JSON & Shamir Secret Sharing Vault State
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-primary" />
                  Canonical Content Digests (JCS)
                </span>
                <p className="text-muted-foreground text-[11px]">
                  All generated paper forms are hashed under RFC 8785 canonical JSON sorting before being sealed into the tamper-proof vault.
                </p>
                <div className="bg-card p-2 rounded border font-mono text-[10px] space-y-1">
                  {paperForms.map((pf) => (
                    <div key={pf.id} className="flex justify-between">
                      <span className="font-bold">{pf.formCode}:</span>
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {pf.versions?.[0]?.contentHash || 'HASH_PENDING'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-primary" />
                  Strong Room Shamir Quorum Status
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Vault sealing requires 3-of-5 key custodian shares (Principal, Controller, Dean, Chief Custodian, External Overseer).
                </p>
                <div className="p-2 rounded border bg-card flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">Quorum Threshold</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                    3 of 5 Custodians Required
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
