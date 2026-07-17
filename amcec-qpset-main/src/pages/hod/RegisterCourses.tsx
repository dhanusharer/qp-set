import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Course } from '@/lib/types';

export default function RegisterCourses() {
  const { currentUser } = useAuth();
  const { courses, addCourse, updateCourse, deleteCourse } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [schemeYear, setSchemeYear] = useState('');
  const [credits, setCredits] = useState('3');
  const [bos, setBos] = useState(currentUser?.dept || '');

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editSemester, setEditSemester] = useState('');
  const [editSchemeYear, setEditSchemeYear] = useState('');
  const [editCredits, setEditCredits] = useState('3');
  const [editBos, setEditBos] = useState('');

  // Toggled list states (collapsible sections)
  // By default, sections are collapsed (not expanded)
  const [expandedSchemes, setExpandedSchemes] = useState<Record<string, boolean>>({});
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

  const toggleScheme = (scheme: string) => {
    setExpandedSchemes(prev => ({ ...prev, [scheme]: !prev[scheme] }));
  };

  const toggleSemester = (semKey: string) => {
    setExpandedSemesters(prev => ({ ...prev, [semKey]: !prev[semKey] }));
  };

  if (!currentUser) return null;

  const myCourses = useMemo(() => {
    return courses.filter(c => c.hodId === currentUser.id);
  }, [courses, currentUser]);

  const uniqueSchemes = useMemo(() => {
    return Array.from(new Set(myCourses.map(c => c.schemeYear))).sort();
  }, [myCourses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCourse({
        courseName, courseCode, semester, schemeYear,
        credits: parseInt(credits), examTypes: ['Internal Assessment (40M)', 'End Semester (100M)'], bos,
        hodId: currentUser.id,
      });
      toast({ title: 'Course Registered', description: `${courseName} (${courseCode}) added successfully.` });
      setCourseName(''); setCourseCode(''); setSemester(''); setSchemeYear(''); setCredits('3');
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err.message || 'Failed to register course.', variant: 'destructive' });
    }
  };

  const startEdit = (c: Course) => {
    setEditingId(c.id);
    setEditName(c.courseName);
    setEditCode(c.courseCode);
    setEditSemester(c.semester);
    setEditSchemeYear(c.schemeYear);
    setEditCredits(String(c.credits));
    setEditBos(c.bos);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    try {
      await updateCourse(editingId, {
        courseName: editName,
        courseCode: editCode,
        semester: editSemester,
        schemeYear: editSchemeYear,
        credits: parseInt(editCredits),
        examTypes: ['Internal Assessment (40M)', 'End Semester (100M)'],
        bos: editBos,
      });
      toast({ title: 'Course Updated', description: `${editName} updated successfully.` });
      setEditOpen(false);
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message || 'Failed to update course.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteCourse(id);
      toast({ title: 'Course Deleted', description: `${name} has been removed.` });
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message || 'Failed to delete course.', variant: 'destructive' });
    }
  };

  const handleViewScheme = (c: Course) => {
    navigate('/hod/scheme', { state: { courseId: c.id, courseName: c.courseName, courseCode: c.courseCode } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Register Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage courses under your BOS</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-1" /> Add Course
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-serif text-base font-semibold mb-4">New Course Registration</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Scheme Details */}
            <div className="space-y-3 pb-3 border-b border-border/60">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">1. Scheme Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Scheme Year</Label>
                  <Select value={schemeYear} onValueChange={setSchemeYear}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2021 Scheme">2021 Scheme</SelectItem>
                      <SelectItem value="2022 Scheme">2022 Scheme</SelectItem>
                      <SelectItem value="2025 Scheme">2025 Scheme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <SelectItem key={s} value={`${s}${['st','nd','rd'][s-1]||'th'} Semester`}>{s}{['st','nd','rd'][s-1]||'th'} Semester</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Credits</Label>
                  <Select value={credits} onValueChange={setCredits}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(c => <SelectItem key={c} value={String(c)}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. Department Details */}
            <div className="space-y-3 pb-3 border-b border-border/60">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">2. Department Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">BOS (Board of Studies / Department)</Label>
                  <Input value={bos} onChange={e => setBos(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Syllabus (PDF)</Label>
                  <Input type="file" accept=".pdf" className="mt-1 cursor-pointer" />
                </div>
              </div>
            </div>

            {/* 3. Course Details */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">3. Course Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Course Name</Label>
                  <Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. Data Structures" className="mt-1" required />
                </div>
                <div>
                  <Label className="text-xs">Course Code</Label>
                  <Input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="e.g. 21CS32" className="mt-1" required />
                </div>
              </div>
            </div>

            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={!courseName || !courseCode || !semester || !schemeYear}>
              Register Course
            </Button>
          </form>
        </div>
      )}

      {/* Structured Courses Collapsible Accordion Listing */}
      {myCourses.length === 0 ? (
        <div className="bg-card border rounded-xl p-6 text-center text-muted-foreground text-sm">
          No courses registered yet. Click "Add Course" to begin.
        </div>
      ) : (
        <div className="space-y-8">
          {uniqueSchemes.map(scheme => {
            const schemeCourses = myCourses.filter(c => c.schemeYear === scheme);
            const uniqueSemesters = Array.from(new Set(schemeCourses.map(c => c.semester))).sort((a, b) => {
              const numA = parseInt(a.replace(/\D/g, '')) || 0;
              const numB = parseInt(b.replace(/\D/g, '')) || 0;
              return numA - numB;
            });
            const isSchemeExpanded = expandedSchemes[scheme] || false;

            return (
              <div key={scheme} className="bg-card border rounded-xl p-4 space-y-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleScheme(scheme)}
                  className="w-full flex items-center justify-between font-serif text-lg font-bold text-primary border-b-2 border-primary/20 pb-2 hover:text-primary/80 transition-colors text-left select-none"
                >
                  <span>{scheme || 'Unspecified Scheme'}</span>
                  {isSchemeExpanded ? (
                    <ChevronUp className="h-5 w-5 text-primary transition-transform" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                  )}
                </button>

                {isSchemeExpanded && (
                  <div className="space-y-6 pl-2 sm:pl-4">
                    {uniqueSemesters.map(sem => {
                      const semCourses = schemeCourses.filter(c => c.semester === sem);
                      const semKey = `${scheme}-${sem}`;
                      const isSemExpanded = expandedSemesters[semKey] || false;

                      return (
                        <div key={sem} className="space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleSemester(semKey)}
                            className="w-full flex items-center justify-between font-serif text-sm font-semibold text-muted-foreground uppercase tracking-wide py-2 px-3 bg-secondary/10 rounded-lg hover:bg-secondary/15 transition-all text-left select-none"
                          >
                            <span>{sem || 'Unspecified Semester'}</span>
                            {isSemExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>

                          {isSemExpanded && (
                            <div className="bg-card border rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-secondary/5 text-left text-xs font-semibold text-muted-foreground uppercase">
                                    <th className="p-3 w-1/4">Code</th>
                                    <th className="p-3 w-1/2">Course Name</th>
                                    <th className="p-3 w-1/8 text-center">Credits</th>
                                    <th className="p-3 w-1/8 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {semCourses.map(c => (
                                    <tr key={c.id} className="hover:bg-secondary/5 transition-colors">
                                      <td className="p-3 font-mono font-bold text-primary">{c.courseCode}</td>
                                      <td className="p-3 font-medium text-foreground">{c.courseName}</td>
                                      <td className="p-3 text-center text-foreground">{c.credits}</td>
                                      <td className="p-3 text-center">
                                        <div className="flex justify-center gap-1">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-accent" title="Edit course" onClick={() => startEdit(c)}>
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Delete course" onClick={() => handleDelete(c.id, c.courseName)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-primary" title="View scheme" onClick={() => handleViewScheme(c)}>
                                            <BookOpen className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Course Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Course Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Scheme Year</Label>
                <Select value={editSchemeYear} onValueChange={setEditSchemeYear}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2021 Scheme">2021 Scheme</SelectItem>
                    <SelectItem value="2022 Scheme">2022 Scheme</SelectItem>
                    <SelectItem value="2025 Scheme">2025 Scheme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Semester</Label>
                <Select value={editSemester} onValueChange={setEditSemester}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <SelectItem key={s} value={`${s}${['st','nd','rd'][s-1]||'th'} Semester`}>{s}{['st','nd','rd'][s-1]||'th'} Semester</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Course Code</Label>
                <Input value={editCode} onChange={e => setEditCode(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Credits</Label>
                <Select value={editCredits} onValueChange={setEditCredits}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4].map(cr => <SelectItem key={cr} value={String(cr)}>{cr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Course Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs">BOS (Board of Studies)</Label>
              <Input value={editBos} onChange={e => setEditBos(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
