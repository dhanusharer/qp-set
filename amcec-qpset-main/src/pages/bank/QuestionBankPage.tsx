import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Lock, 
  Layers, 
  BarChart3, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Eye,
  RefreshCw
} from 'lucide-react';
import { MathView } from '@/components/MathView';
import { QuestionAuthoringModal } from '@/components/QuestionAuthoringModal';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function QuestionBankPage() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState<boolean>(false);

  // Filters
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedBloom, setSelectedBloom] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch courses
  useEffect(() => {
    async function loadCourses() {
      try {
        const res: any = await apiClient.get('/courses?limit=100');
        const courseList = res?.courses || res?.data?.courses || [];
        if (courseList.length > 0) {
          setCourses(courseList);
          if (!selectedCourseId) {
            setSelectedCourseId(courseList[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to load courses', err);
      }
    }
    loadCourses();
  }, []);

  // Fetch questions & analytics when course or filters change
  const loadBankData = async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const params: any = { courseId: selectedCourseId, limit: 50 };
      if (selectedUnit !== 'all') params.unitNumber = selectedUnit;
      if (selectedBloom !== 'all') params.bloomsLevel = selectedBloom;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [questionsRes, analyticsRes]: [any, any] = await Promise.all([
        apiClient.get('/bank/questions', { params }),
        apiClient.get(`/bank/courses/${selectedCourseId}/analytics`).catch(() => null)
      ]);

      const qList = questionsRes?.questions || questionsRes?.data?.questions || [];
      setQuestions(qList);

      const aData = analyticsRes?.data || analyticsRes || null;
      if (aData) {
        setAnalytics(aData);
      }
    } catch (err) {
      console.error('Failed to load question bank data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankData();
  }, [selectedCourseId, selectedUnit, selectedBloom, selectedStatus]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      loadBankData();
    }
  };

  const handleStatusTransition = async (questionId: number, nextStatus: string) => {
    try {
      await apiClient.patch(`/bank/questions/${questionId}/status`, { status: nextStatus });
      toast.success(`Question status updated to ${nextStatus}`);
      loadBankData();
    } catch (err) {
      toast.error('Failed to update question status');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Autonomous Question Bank</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Item repository with Bloom's Taxonomy classification, Course Outcome mapping, and AES-256-GCM vault security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1.5 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Cryptographic Vault Active
          </Badge>
          <Button
            onClick={() => setIsAuthorModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Author New Question
          </Button>
        </div>
      </div>

      {/* Course Selection & Quick Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Selector Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Active Course
            </CardTitle>
            <CardDescription className="text-xs">
              Select curriculum course to view and author bank questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.courseCode} - {c.courseName} (Sem {c.semester})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {analytics && (
              <div className="pt-2 border-t grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground block text-[11px]">Total Bank Items</span>
                  <span className="text-lg font-bold text-foreground">{analytics.totalQuestions} Questions</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground block text-[11px]">Total Marks Capacity</span>
                  <span className="text-lg font-bold text-primary">{analytics.totalMarksCapacity} Marks</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* OBE Coverage Diagnostic Matrix */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> OBE Syllabus & Bloom's Balance Matrix
              </CardTitle>
              <span className="text-xs text-muted-foreground">VTU Autonomous Criterion 3</span>
            </div>
            <CardDescription className="text-xs">
              Real-time distribution of questions across syllabus Units (1..5) and Bloom's cognitive levels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <div className="space-y-4">
                {/* Unit Breakdown */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block mb-2">Unit Distribution:</span>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {[1, 2, 3, 4, 5].map((u) => {
                      const count = analytics.unitDistribution?.[u] || 0;
                      return (
                        <div key={u} className={`p-2 rounded-lg border ${count > 0 ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200' : 'bg-muted/20 border-dashed'}`}>
                          <div className="font-bold text-foreground">Unit {u}</div>
                          <div className={`text-xs mt-0.5 ${count > 0 ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-muted-foreground'}`}>
                            {count} items
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bloom's Breakdown */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block mb-2">Bloom's Cognitive Levels (Marks):</span>
                  <div className="grid grid-cols-6 gap-2 text-center text-xs">
                    {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((lvl) => {
                      const marks = analytics.bloomsDistribution?.[lvl] || 0;
                      return (
                        <div key={lvl} className="p-1.5 rounded-md bg-muted/40">
                          <span className="font-mono font-bold text-xs text-foreground">{lvl}</span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5">{marks}m</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                Select a course to view OBE analytics
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search by topic, question code, or content (blind-indexed)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units (1-5)</SelectItem>
                <SelectItem value="1">Unit 1</SelectItem>
                <SelectItem value="2">Unit 2</SelectItem>
                <SelectItem value="3">Unit 3</SelectItem>
                <SelectItem value="4">Unit 4</SelectItem>
                <SelectItem value="5">Unit 5</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedBloom} onValueChange={setSelectedBloom}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="All Bloom's" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bloom's</SelectItem>
                <SelectItem value="L1">L1 - Remember</SelectItem>
                <SelectItem value="L2">L2 - Understand</SelectItem>
                <SelectItem value="L3">L3 - Apply</SelectItem>
                <SelectItem value="L4">L4 - Analyze</SelectItem>
                <SelectItem value="L5">L5 - Evaluate</SelectItem>
                <SelectItem value="L6">L6 - Create</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REVISION_REQUESTED">Revision Req.</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={loadBankData} className="h-9 px-3 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions Listing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Found {questions.length} questions matching criteria</span>
          <span className="flex items-center gap-1 font-mono">
            <Lock className="w-3 h-3 text-indigo-500" /> At-rest payload encryption active
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Decrypting and loading Question Bank items...
          </div>
        ) : questions.length === 0 ? (
          <Card className="p-12 text-center">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-foreground">No Questions Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              The Question Bank for this course and filter combination is currently empty. Author your first item with LaTeX formulas and sub-parts.
            </p>
            <Button onClick={() => setIsAuthorModalOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Author New Question
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {questions.map((q) => {
              const latest = q.latestVersion;
              const stemText = latest?.stemRichJson?.text || q.topic;
              const svgData = latest?.stemRichJson?.svg;
              const parts = latest?.parts || [];

              return (
                <Card key={q.id} className="shadow-sm hover:border-primary/50 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted">
                          {q.code}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Unit {q.unitNumber}
                        </Badge>
                        <span className="font-semibold text-sm text-foreground">{q.topic}</span>
                        {q.subtopic && (
                          <span className="text-xs text-muted-foreground">({q.subtopic})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            q.status === 'APPROVED'
                              ? 'bg-emerald-500 text-white'
                              : q.status === 'PENDING_REVIEW'
                              ? 'bg-amber-500 text-white'
                              : q.status === 'REVISION_REQUESTED'
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-500 text-white'
                          }
                        >
                          {q.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          v{q.currentVersionNo}
                        </Badge>
                      </div>
                    </div>

                    {/* Question Stem with KaTeX Render */}
                    <div className="space-y-2">
                      <MathView content={stemText} className="text-sm" />
                      {svgData && (
                        <div
                          className="max-w-md p-2 border rounded-lg bg-slate-50 dark:bg-slate-900 mt-2"
                          dangerouslySetInnerHTML={{ __html: svgData }}
                        />
                      )}
                    </div>

                    {/* Sub-parts Grid */}
                    {parts.length > 0 && (
                      <div className="pt-2 border-t space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Sub-Parts & OBE Alignment:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {parts.map((p: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary">{p.partLabel}</span>
                                <Badge variant="secondary" className="text-[10px] font-mono">
                                  {p.bloomsLevel}
                                </Badge>
                                {p.coCode && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {p.coCode}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-bold text-foreground">{p.marks} Marks</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Row */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t">
                      <span>Authored by: <strong>{q.author?.name || 'Faculty'}</strong> ({q.author?.dept || 'Dept'})</span>

                      <div className="flex items-center gap-2">
                        {q.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleStatusTransition(q.id, 'PENDING_REVIEW')}
                          >
                            Submit for Review
                          </Button>
                        )}
                        {(currentUser?.role === 'hod' || currentUser?.role === 'controller') && q.status === 'PENDING_REVIEW' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleStatusTransition(q.id, 'APPROVED')}
                          >
                            Approve Item
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Authoring Modal */}
      <QuestionAuthoringModal
        open={isAuthorModalOpen}
        onOpenChange={setIsAuthorModalOpen}
        courses={courses}
        onQuestionCreated={loadBankData}
      />
    </div>
  );
}
