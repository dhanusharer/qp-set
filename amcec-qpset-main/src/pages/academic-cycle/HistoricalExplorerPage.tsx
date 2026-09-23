import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  Calendar,
  Layers,
  Users,
  Database,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CourseOption {
  id: number;
  code: string;
  name: string;
  semester: string;
  department?: { name: string; code: string };
}

interface HistoricalMatrix {
  courseId: number;
  courseCode: string;
  courseName: string;
  department: string;
  totalEvents: number;
  curriculumSchemes: string[];
  timeline: Array<{
    eventId: number;
    academicYear: string;
    term: string;
    sessionName: string;
    assessmentType: string;
    scheduledDate: string | null;
    status: string;
    paperFormsCount: number;
    totalCandidates: number;
    regularCount: number;
    backlogCount: number;
    uniqueQuestionsUsed: number;
  }>;
}

export const HistoricalExplorerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    searchParams.get('courseId') ? parseInt(searchParams.get('courseId')!) : null
  );
  const [matrix, setMatrix] = useState<HistoricalMatrix | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  useEffect(() => {
    setLoadingCourses(true);
    apiClient.get<any>('/courses?limit=100')
      .then((res) => {
        const rawItems = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const normalized: CourseOption[] = rawItems.map((c: any) => ({
          id: c.id,
          code: c.courseCode || c.code,
          name: c.courseName || c.name,
          semester: c.semester,
          department: c.department || { name: 'Computer Science', code: 'CSE' },
        }));
        setCourses(normalized);
        if (!selectedCourseId && normalized.length > 0) {
          setSelectedCourseId(normalized[0].id);
        }
      })
      .catch((err) => console.error('Failed to load courses:', err))
      .finally(() => setLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      setSearchParams({ courseId: selectedCourseId.toString() });
      setLoadingMatrix(true);
      apiClient.get<{ success: boolean; data: HistoricalMatrix }>(
        `/academic-cycles/historical/courses/${selectedCourseId}`
      )
        .then((res) => {
          setMatrix(res.data);
        })
        .catch((err) => {
          console.error('Failed to load historical matrix:', err);
          setMatrix(null);
        })
        .finally(() => setLoadingMatrix(false));
    }
  }, [selectedCourseId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Multi-Year Historical Course Explorer
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Analyze canonical courses across multiple academic years, cohorts, exam sessions, and question reuse rotations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-foreground whitespace-nowrap">
            Select Course:
          </label>
          <select
            value={selectedCourseId || ''}
            onChange={(e) => setSelectedCourseId(parseInt(e.target.value))}
            className="bg-card border rounded-md px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[260px]"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name} (Sem {c.semester})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingMatrix ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Loading multi-year historical course data...
        </div>
      ) : matrix ? (
        <div className="space-y-6">
          {/* Course Summary Banner */}
          <div className="bg-card border rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-bold text-foreground">{matrix.courseCode}</span>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {matrix.department}
                </Badge>
              </div>
              <h2 className="text-base font-semibold text-foreground mt-0.5">{matrix.courseName}</h2>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Governing Schemes:</span>
                {matrix.curriculumSchemes?.map((scheme, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px]">
                    {scheme}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-6">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Exam Sessions
                </span>
                <p className="text-2xl font-bold text-foreground mt-0.5">{matrix.totalEvents}</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Total Candidates
                </span>
                <p className="text-2xl font-bold text-primary mt-0.5">
                  {matrix.timeline.reduce((acc, t) => acc + t.totalCandidates, 0)}
                </p>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Paper Sets Generated
                </span>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {matrix.timeline.reduce((acc, t) => acc + t.paperFormsCount, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline of Offerings & Exam Sessions */}
          <div className="bg-card border rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Chronological Academic Cycle Timeline
              </h3>
              <span className="text-xs text-muted-foreground">
                Immutable operational records per exam session
              </span>
            </div>

            {matrix.timeline.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10 text-xs text-muted-foreground">
                No exam sessions recorded for this course yet. Use the Cycle Setup Wizard in Exam Sessions Hub to schedule it.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
                {matrix.timeline.map((evt, idx) => (
                  <div key={evt.eventId} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-2 top-2 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background" />

                    <div className="flex-1 bg-muted/30 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{evt.sessionName}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {evt.assessmentType}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                              AY {evt.academicYear} ({evt.term})
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Status: <strong className="text-foreground">{evt.status}</strong>
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/controller/assessment-events/${evt.eventId}`)}
                          className="text-xs gap-1.5 h-7"
                        >
                          Inspect Workspace
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Total Candidates
                          </span>
                          <p className="font-bold text-foreground">
                            {evt.totalCandidates} ({evt.regularCount} Reg / {evt.backlogCount} Backlog)
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Parallel Sets
                          </span>
                          <p className="font-bold text-foreground">{evt.paperFormsCount} Sets</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Bank Questions Used
                          </span>
                          <p className="font-bold text-foreground">{evt.uniqueQuestionsUsed} Questions</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Data Architecture
                          </span>
                          <p className="font-bold text-emerald-500">Zero Duplication</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
