import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, FileText, CheckCircle2, CalendarDays } from 'lucide-react';
import controllerPhoto from '@/assets/controller-photo.jpg';
import { AssessmentBadge, generateAssessmentId } from '@/components/AssessmentBadge';

const EXAM_TYPES = [
  '1st Internal Assessment (40 Marks)',
  '2nd Internal Assessment (40 Marks)',
  '3rd Internal Assessment (40 Marks)',
  'CIE Test (20 Marks)',
  'End Semester Exam (100 Marks)',
];

const getDeptCode = (deptName?: string | null) => {
  if (!deptName) return 'GEN';
  const name = deptName.toUpperCase();
  if (name.includes('AI & ML') || name.includes('AIML')) return 'CSE-AIML';
  if (name.includes('CSE') || name.includes('COMPUTER SCIENCE')) return 'CSE';
  if (name.includes('ISE') || name.includes('INFORMATION SCIENCE')) return 'ISE';
  if (name.includes('ECE') || name.includes('ELECTRONICS')) return 'ECE';
  if (name.includes('MECH') || name.includes('MECHANICAL')) return 'MECH';
  if (name.includes('CIVIL')) return 'CIVIL';
  return name.replace(/[^A-Z]/g, '').slice(0, 5) || 'GEN';
};

export default function AssignPaper() {
  const { currentUser } = useAuth();
  const { addAssignment, addNotification, courses, assignments, allUsers, assessments } = useApp();
  const [selectedHod, setSelectedHod] = useState<number | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [examType, setExamType] = useState('');
  const [semester, setSemester] = useState('');
  const [scheme, setScheme] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [syllabusFile, setSyllabusFile] = useState('');
  const [prevPaperFile, setPrevPaperFile] = useState('');
  const [timetableFile, setTimetableFile] = useState('');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const { toast } = useToast();

  const hods = useMemo(() => allUsers.filter(u => u.role === 'hod'), [allUsers]);
  const selected = hods.find(h => h.id === selectedHod);
  
  const targetCourses = useMemo(() => {
    if (showAllCourses) return courses;
    return courses.filter(c => c.hodId === selectedHod);
  }, [courses, selectedHod, showAllCourses]);

  const filteredCourses = useMemo(() => {
    return targetCourses.filter(c => 
      (c.semester === semester || c.semester === semester?.replace(/\D/g, '')) &&
      (!scheme || c.schemeYear === scheme)
    );
  }, [targetCourses, semester, scheme]);

  useEffect(() => {
    if (selectedAssessmentId) {
      const assessmentObj = assessments.find(a => a.id === selectedAssessmentId);
      if (assessmentObj) {
        setExamType(assessmentObj.examType);
        const s = assessmentObj.semester;
        const formattedSem = `${s}${['st','nd','rd'][Number(s)-1]||'th'} Semester`;
        setSemester(formattedSem);
        setScheme(assessmentObj.schemeYear || '2021 Scheme');
        setStartDate(assessmentObj.startDate.split('T')[0]);
      }
    }
  }, [selectedAssessmentId, assessments]);

  const handleToggleCourse = (id: number) => {
    setSelectedCourseIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const generatedIds = useMemo(() => {
    if (!selectedAssessmentId) return [];
    const assessmentObj = assessments.find(a => a.id === selectedAssessmentId);
    if (!assessmentObj) return [];
    return selectedCourseIds.map(id => {
      const course = courses.find(c => c.id === id);
      if (!course) return '';
      const courseOwnerHod = allUsers.find(u => u.id === course.hodId);
      const deptCode = getDeptCode(courseOwnerHod?.dept);
      return `${assessmentObj.assessmentCode}_${deptCode}_${course.courseCode}`;
    }).filter(Boolean);
  }, [selectedAssessmentId, selectedCourseIds, courses, assessments, allUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || selectedCourseIds.length === 0 || !selectedAssessmentId) return;
    try {
      const assessmentObj = assessments.find(a => a.id === selectedAssessmentId);
      if (!assessmentObj) return;

      for (const courseId of selectedCourseIds) {
        const courseObj = courses.find(c => c.id === courseId);
        if (!courseObj) continue;
        
        const courseOwnerHod = allUsers.find(u => u.id === courseObj.hodId);
        const deptCode = getDeptCode(courseOwnerHod?.dept);
        const id = `${assessmentObj.assessmentCode}_${deptCode}_${courseObj.courseCode}`;
        
        await addAssignment({
          assessmentCode: id,
          assessmentId: selectedAssessmentId,
          description,
          facultyId: null,
          hodId: selected.id,
          courseId: courseObj.id,
          examType,
          startDate: startDate || undefined,
          dueDate,
          status: 'Pending',
          assignedDate: new Date().toISOString().split('T')[0],
          instructions,
          syllabusFileName: syllabusFile || undefined,
          prevPaperFileName: prevPaperFile || undefined,
          timetableFileName: timetableFile || undefined,
          assignedById: currentUser?.id,
        });
        await addNotification({
          userId: selected.id,
          message: `Controller assigned paper [${id}]: ${courseObj.courseName} (${examType}) — Due: ${dueDate}`,
          date: new Date().toISOString().split('T')[0],
          read: false,
          type: 'info',
          fromUserId: currentUser?.id,
          kind: 'assignment',
        });
      }
      toast({ title: 'Assignments Sent!', description: `Successfully created ${selectedCourseIds.length} paper assignments.` });
      setSelectedHod(null);
      setSelectedAssessmentId(null);
      setDescription('');
      setSelectedCourseIds([]);
      setExamType('');
      setSemester('');
      setScheme('');
      setStartDate('');
      setDueDate('');
      setInstructions('');
      setSyllabusFile('');
      setPrevPaperFile('');
      setTimetableFile('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create assignments.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Assign Exam to HOD</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new exam assignment with a unique Assessment ID</p>
      </div>

      {!selectedHod ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hods.map(h => {
            const setterCount = allUsers.filter(u => u.role === 'qpsetter' && u.hodId === h.id).length;
            const courseCount = courses.filter(c => c.hodId === h.id).length;
            return (
              <button
                key={h.id}
                onClick={() => setSelectedHod(h.id)}
                className="bg-card border rounded-xl p-5 text-left hover:border-accent hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-sm">
                    {h.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-accent transition-colors text-sm">{h.name}</p>
                    <p className="text-[10px] text-muted-foreground">{h.title}</p>
                  </div>
                </div>
                <p className="text-sm text-accent font-medium">{h.dept}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{setterCount} QP Setters • {courseCount} Courses</span>
                  <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="max-w-3xl">
          <button onClick={() => setSelectedHod(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to HOD list
          </button>

          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-5 border-b">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {selected?.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{selected?.name}</p>
                    <p className="text-sm text-muted-foreground">{selected?.dept} • {selected?.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Assigned by</p>
                    <p className="text-xs font-medium text-foreground">Dr. Nandishwar</p>
                  </div>
                  <img src={controllerPhoto} alt="Controller" className="h-9 w-9 rounded-lg object-cover" />
                </div>
              </div>

              {generatedIds.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Generated Assessment Exam IDs:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedIds.map(id => (
                      <AssessmentBadge key={id} id={id} size="sm" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs font-semibold">Select Courses / Subjects *</Label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-primary hover:text-primary/80 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={showAllCourses}
                        onChange={e => {
                          setShowAllCourses(e.target.checked);
                          setSelectedCourseIds([]); // Clear selection when switching department scope to avoid errors
                        }}
                        className="rounded border-gray-300 text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Show all departments' courses</span>
                    </label>
                  </div>
                  {!semester ? (
                    <p className="text-xs text-muted-foreground italic bg-secondary/20 p-3 rounded-lg border border-dashed">Please select a Semester first to view courses.</p>
                  ) : filteredCourses.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic bg-secondary/20 p-3 rounded-lg border border-dashed">No courses found for the selected HOD and Semester.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-secondary/10 p-3 rounded-lg border max-h-48 overflow-y-auto">
                      {filteredCourses.map(c => {
                        const isChecked = selectedCourseIds.includes(c.id);
                        const courseOwnerHod = allUsers.find(u => u.id === c.hodId);
                        const courseDept = courseOwnerHod?.dept || '';
                        const isCrossDept = selected && courseOwnerHod && courseOwnerHod.id !== selected.id;
                        return (
                          <label key={c.id} className="flex items-center justify-between gap-2 text-xs font-medium cursor-pointer p-1.5 hover:bg-secondary/35 rounded transition-colors select-none">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCourse(c.id)}
                                className="rounded border-gray-300 text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                              />
                              <span>{c.courseName} ({c.courseCode})</span>
                            </div>
                            {courseDept && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                isCrossDept 
                                  ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30' 
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {getDeptCode(courseDept)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Select Assessment Cycle *</Label>
                  <Select value={selectedAssessmentId?.toString() || ''} onValueChange={val => setSelectedAssessmentId(Number(val))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select active assessment cycle" /></SelectTrigger>
                    <SelectContent>
                      {assessments.map((a: any) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.assessmentCode} — {a.examType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><CalendarDays className="h-3 w-3" /> End / Due Date *</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" required />
                </div>
              </div>

              {selectedAssessmentId && (
                <div className="bg-secondary/10 border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Exam Type:</span>
                    <span className="font-semibold text-foreground">{examType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Semester:</span>
                    <span className="font-semibold text-foreground">{semester}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Scheme Year:</span>
                    <span className="font-semibold text-foreground">{scheme}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Start Date:</span>
                    <span className="font-semibold text-foreground">{startDate}</span>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Instructions</Label>
                <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Add instructions..." className="mt-1" rows={2} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Syllabus (PDF)</Label>
                  <Input type="file" accept=".pdf" onChange={e => setSyllabusFile(e.target.files?.[0]?.name || '')} className="mt-1" />
                  {syllabusFile && <p className="text-xs text-success mt-1 flex items-center gap-1"><FileText className="h-3 w-3" /> {syllabusFile}</p>}
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Previous Paper (PDF)</Label>
                  <Input type="file" accept=".pdf" onChange={e => setPrevPaperFile(e.target.files?.[0]?.name || '')} className="mt-1" />
                  {prevPaperFile && <p className="text-xs text-success mt-1 flex items-center gap-1"><FileText className="h-3 w-3" /> {prevPaperFile}</p>}
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Approved Timetable</Label>
                  <Input type="file" accept=".pdf,image/*" onChange={e => setTimetableFile(e.target.files?.[0]?.name || '')} className="mt-1" />
                  {timetableFile && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {timetableFile}</p>}
                </div>
              </div>

              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., 1st Internal Assessment for 5th Sem CSE AI&ML" className="mt-1" rows={2} />
              </div>

              <Button type="submit" className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={selectedCourseIds.length === 0 || !selectedAssessmentId || !dueDate}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Assign to HOD {generatedIds.length > 0 && `(${generatedIds.length} Papers)`}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
