import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AssessmentBadge } from '@/components/AssessmentBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { Building2, GraduationCap, KeyRound, Plus, Send, Copy, Upload, FileText, CheckCircle2, ClipboardList, User as UserIcon, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

const DEPARTMENTS = [
  'CSE (AI & ML)',
  'CSE',
  'ISE',
  'ECE',
  'MECH',
  'CIVIL'
];

function genUsername(name: string, affiliation: 'internal' | 'external') {
  const base = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) || 'faculty';
  return affiliation === 'external' ? `ext_${base}` : base;
}

function genPassword() {
  return 'qpset@' + Math.floor(1000 + Math.random() * 9000);
}

export default function FacultyRegistry() {
  const { currentUser } = useAuth();
  const { allUsers, addUser, addAssignment, addNotification, assignments, courses, assessments } = useApp();
  const { toast } = useToast();

  // Register dialog state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [qualification, setQualification] = useState('');
  const [credentials, setCredentials] = useState<{ username: string; password: string; name: string } | null>(null);

  // Scoped Registration info
  const [regDept, setRegDept] = useState('');
  const [regAffiliation, setRegAffiliation] = useState<'internal' | 'external'>('internal');

  // Expanded faculty toggle state per department
  const [expandedDeptFaculty, setExpandedDeptFaculty] = useState<Record<string, boolean>>({});

  const toggleDeptFaculty = (dept: string) => {
    setExpandedDeptFaculty(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const openRegister = (dept: string, affiliation: 'internal' | 'external') => {
    setRegDept(dept);
    setRegAffiliation(affiliation);
    setName('');
    setEmail('');
    setPhone('');
    setCollege('');
    setQualification('');
    setCredentials(null);
    setOpen(true);
  };

  const handleRegister = async () => {
    if (!name) return;
    const username = genUsername(name, regAffiliation);
    const password = genPassword();
    try {
      const matchedHod = allUsers.find(u => u.role === 'hod' && u.dept === regDept);
      const hodId = matchedHod ? matchedHod.id : 8;

      const u = await addUser({
        username, password, role: 'qpsetter',
        name, email, phone, qualification,
        affiliation: regAffiliation,
        college: regAffiliation === 'external' ? (college || 'External College') : 'AMC Engineering College',
        hodId,
        registeredBy: 'Dr. Nandishwar',
        registeredOn: new Date().toISOString().split('T')[0],
        designation: regAffiliation === 'external' ? 'Visiting Paper Setter' : 'Assistant Professor',
        dept: regDept
      });
      setCredentials({ username: u.username, password: u.password || password, name: u.name });
      setName(''); setEmail(''); setPhone(''); setCollege(''); setQualification('');
      toast({ title: 'Faculty registered', description: `${u.name} added with login ID ${u.username}` });
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err.message || 'Could not register faculty member.', variant: 'destructive' });
    }
  };

  // Assign Paper dialog state
  const [assignFor, setAssignFor] = useState<number | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [aDescription, setADescription] = useState('');
  const [aExamType, setAExamType] = useState('');
  const [aSemester, setASemester] = useState('');
  const [aScheme, setAScheme] = useState('');
  const [aStartDate, setAStartDate] = useState('');
  const [aDueDate, setADueDate] = useState('');
  const [aSyllabus, setASyllabus] = useState('');
  const [aTimetable, setATimetable] = useState('');
  const [aPrev, setAPrev] = useState('');
  const [aInstructions, setAInstructions] = useState('');
  const [aSubject, setASubject] = useState('');
  const [aSubjectCode, setASubjectCode] = useState('');
  const [aSchemeNo, setASchemeNo] = useState('');

  useEffect(() => {
    if (selectedAssessmentId) {
      const assessmentObj = assessments.find(a => a.id === selectedAssessmentId);
      if (assessmentObj) {
        setAExamType(assessmentObj.examType);
        const s = assessmentObj.semester;
        setASemester(`${s}${['st','nd','rd'][Number(s)-1]||'th'} Semester`);
        setAScheme(assessmentObj.schemeYear || '2021 Scheme');
        setAStartDate(assessmentObj.startDate.split('T')[0]);
      }
    }
  }, [selectedAssessmentId, assessments]);

  const generatedId = selectedAssessmentId && aSubjectCode ? (() => {
    const assessmentObj = assessments.find(a => a.id === selectedAssessmentId);
    return assessmentObj ? `${assessmentObj.assessmentCode}_${aSubjectCode}` : '';
  })() : '';

  const openAssign = (facId: number) => {
    setAssignFor(facId);
    setSelectedAssessmentId(null);
    setASubject('');
    setASubjectCode('');
    setAExamType('');
    setASemester('');
    setAScheme('');
    setAStartDate('');
    setADueDate('');
  };

  const submitAssign = async () => {
    const f = faculty.find(x => x.id === assignFor);
    if (!f || !generatedId || !selectedAssessmentId) return;
    const courseObj = courses.find(c => c.courseName === aSubject);
    if (!courseObj) return;

    try {
      await addAssignment({
        assessmentCode: generatedId,
        assessmentId: selectedAssessmentId,
        description: aDescription,
        facultyId: f.id,
        hodId: f.hodId || 8,
        courseId: courseObj.id,
        examType: aExamType,
        startDate: aStartDate || undefined,
        dueDate: aDueDate,
        status: 'Pending',
        assignedDate: new Date().toISOString().split('T')[0],
        instructions: aInstructions ? `${aInstructions}${aSchemeNo ? `\nScheme Ref: ${aSchemeNo}` : ''}` : (aSchemeNo ? `Scheme Ref: ${aSchemeNo}` : undefined),
        syllabusFileName: aSyllabus || undefined,
        prevPaperFileName: aPrev || undefined,
        timetableFileName: aTimetable || undefined,
        assignedById: currentUser?.id,
      });

      await addNotification({
        userId: f.id,
        message: `New paper assigned [${generatedId}]: ${aSubject} — Due ${aDueDate}`,
        date: new Date().toISOString().split('T')[0],
        read: false,
        type: 'info',
        kind: 'assignment',
        fromUserId: currentUser?.id,
      });

      toast({ title: 'Paper assigned', description: `${generatedId} → ${f.name}. Login ID: ${f.username}` });
      setAssignFor(null);
      setADescription('');
      setSelectedAssessmentId(null);
      setASyllabus('');
      setATimetable('');
      setAPrev('');
      setAInstructions('');
      setASchemeNo('');
    } catch (err: any) {
      toast({ title: 'Assignment Failed', description: err.message || 'Could not assign paper.', variant: 'destructive' });
    }
  };

  const copyCreds = () => {
    if (!credentials) return;
    const text = `QPSet Login\nName: ${credentials.name}\nUsername: ${credentials.username}\nPassword: ${credentials.password}\nPortal: https://qpset.amcec.edu.in`;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Login details copied — share with faculty' });
  };

  const faculty = useMemo(() => allUsers.filter(u => u.role === 'qpsetter'), [allUsers]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Faculty Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Structured registry of in-college and external visiting paper setting faculty</p>
        </div>
      </div>

      {/* Internal Faculty Compartments */}
      <div className="space-y-6">
        <h2 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 border-b pb-2">
          <GraduationCap className="h-5 w-5 text-primary" /> In-College Faculty Compartments (AMCEC)
        </h2>

        <div className="grid grid-cols-1 gap-6">
          {DEPARTMENTS.map(dept => {
            const deptHods = allUsers.filter(u => u.role === 'hod' && u.dept === dept);
            const deptFaculty = allUsers.filter(u => {
              if (u.role !== 'qpsetter' || u.affiliation !== 'internal') return false;
              if (u.dept === dept) return true;
              if (!u.dept && u.hodId) {
                const parentHod = allUsers.find(h => h.id === u.hodId);
                return parentHod?.dept === dept;
              }
              return false;
            });
            const combinedCount = deptHods.length + deptFaculty.length;

            return (
              <div key={dept} className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 border-b flex items-center justify-between bg-secondary/10">
                  <h3 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                    {dept} Department <span className="text-xs font-normal text-muted-foreground">({combinedCount} staff)</span>
                  </h3>
                  <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => openRegister(dept, 'internal')}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Faculty
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/10 text-xs font-semibold text-muted-foreground uppercase text-left">
                        <th className="p-3">Staff Member</th>
                        <th className="p-3">Designation / Role</th>
                        <th className="p-3">Login ID</th>
                        <th className="p-3">Assigned Papers</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {combinedCount === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground italic">No staff registered under this department.</td>
                        </tr>
                      ) : (
                        <>
                          {/* 1. HOD Display (Always Visible) */}
                          {deptHods.map(u => (
                            <tr key={`hod-${u.id}`} className="bg-primary/5 font-semibold">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                                    {u.name.split(' ').slice(-1)[0][0]}
                                  </div>
                                  <div>
                                    <p className="text-sm text-foreground font-bold">{u.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{u.email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-xs">
                                <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                                  Head of Department
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded inline-flex items-center gap-1 text-muted-foreground">
                                  <UserIcon className="h-3 w-3" /> {u.username}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-xs text-muted-foreground/60 italic">Department Coordinator</span>
                              </td>
                              <td className="p-3">—</td>
                            </tr>
                          ))}

                          {/* 2. Faculty Toggle row (if faculty exists) */}
                          {deptFaculty.length > 0 && (
                            <tr className="bg-secondary/5 border-t">
                              <td colSpan={5} className="p-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 mx-auto"
                                  onClick={() => toggleDeptFaculty(dept)}
                                >
                                  {expandedDeptFaculty[dept] ? (
                                    <>Hide Staff Members ({deptFaculty.length}) <ChevronUp className="h-3.5 w-3.5" /></>
                                  ) : (
                                    <>Show Staff Members ({deptFaculty.length}) <ChevronDown className="h-3.5 w-3.5" /></>
                                  )}
                                </Button>
                              </td>
                            </tr>
                          )}

                          {/* 3. Faculty Display (Toggled list) */}
                          {expandedDeptFaculty[dept] && deptFaculty.map(u => {
                            const fa = assignments.filter(a => a.facultyId === u.id);
                            return (
                              <tr key={`fac-${u.id}`} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">
                                      {u.name.split(' ').slice(-1)[0][0]}
                                    </div>
                                    <div>
                                      <p className="text-sm text-foreground font-medium">{u.name}</p>
                                      <p className="text-[10px] text-muted-foreground">{u.email || '—'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-xs">
                                  <span className="text-muted-foreground">{u.designation || 'Assistant Professor'}</span>
                                </td>
                                <td className="p-3">
                                  <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded inline-flex items-center gap-1 text-muted-foreground">
                                    <UserIcon className="h-3 w-3" /> {u.username}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {fa.length === 0 ? (
                                    <span className="text-xs text-muted-foreground italic">No papers yet</span>
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      {fa.slice(0, 2).map(a => (
                                        <div key={a.id} className="flex items-center gap-1.5">
                                          <AssessmentBadge id={a.assessmentCode} />
                                          <StatusBadge status={a.status} />
                                        </div>
                                      ))}
                                      {fa.length > 2 && <span className="text-[10px] text-muted-foreground">+{fa.length - 2} more</span>}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <Button size="sm" variant="outline" className="h-8 text-xs hover:border-accent hover:text-accent transition-colors" onClick={() => openAssign(u.id)}>
                                    <ClipboardList className="h-3.5 w-3.5 mr-1" /> Assign Paper
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* External Faculty Compartment */}
      <div className="space-y-4 pt-4 border-t">
        <h2 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-warning" /> External Faculty Compartment
        </h2>

        {(() => {
          const extFaculty = allUsers.filter(u => u.role === 'qpsetter' && u.affiliation === 'external');
          return (
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 border-b flex items-center justify-between bg-warning/10">
                <h3 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                  External Faculty <span className="text-xs font-normal text-muted-foreground">({extFaculty.length} paper setters)</span>
                </h3>
                <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-warning hover:text-warning-foreground transition-colors" onClick={() => openRegister('External Faculty', 'external')}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add External Faculty
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10 text-xs font-semibold text-muted-foreground uppercase text-left">
                      <th className="p-3">Staff Member</th>
                      <th className="p-3">College / Affiliation</th>
                      <th className="p-3">Login ID</th>
                      <th className="p-3">Assigned Papers</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {extFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground italic">No external visiting faculty registered.</td>
                      </tr>
                    ) : (
                      extFaculty.map(u => {
                        const fa = assignments.filter(a => a.facultyId === u.id);
                        return (
                          <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-warning/10 text-warning flex items-center justify-center font-bold text-xs">
                                  {u.name.split(' ').slice(-1)[0][0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{u.email || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-xs">
                              <p className="font-semibold text-foreground">{u.college || 'External Institution'}</p>
                              <p className="text-[10px] text-muted-foreground">{u.qualification || '—'}</p>
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded inline-flex items-center gap-1 text-muted-foreground">
                                <UserIcon className="h-3 w-3" /> {u.username}
                              </span>
                            </td>
                            <td className="p-3">
                              {fa.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">No papers yet</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {fa.slice(0, 2).map(a => (
                                    <div key={a.id} className="flex items-center gap-1.5">
                                      <AssessmentBadge id={a.assessmentCode} />
                                      <StatusBadge status={a.status} />
                                    </div>
                                  ))}
                                  {fa.length > 2 && <span className="text-[10px] text-muted-foreground">+{fa.length - 2} more</span>}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <Button size="sm" variant="outline" className="h-8 text-xs hover:border-warning hover:text-warning transition-colors" onClick={() => openAssign(u.id)}>
                                <ClipboardList className="h-3.5 w-3.5 mr-1" /> Assign Paper
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Registration dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Faculty under Compartment: <span className="text-primary font-serif font-bold">{regDept}</span></DialogTitle>
          </DialogHeader>
          {!credentials ? (
            <div className="space-y-3">
              <div><Label className="text-xs">Full Name *</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" required /></div>
              {regAffiliation === 'external' && (
                <div><Label className="text-xs">College / Institute *</Label><Input value={college} onChange={e => setCollege(e.target.value)} placeholder="e.g., RV College of Engineering" className="mt-1" required /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" /></div>
              </div>
              <div><Label className="text-xs">Qualification</Label><Input value={qualification} onChange={e => setQualification(e.target.value)} className="mt-1" /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleRegister} className="bg-primary text-primary-foreground"><KeyRound className="h-4 w-4 mr-1" /> Create Login</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-success/40 bg-success/5 p-4">
                <div className="flex items-center gap-2 mb-3 text-success font-semibold text-sm"><CheckCircle2 className="h-4 w-4" /> Login created — share with faculty</div>
                <div className="font-mono text-sm space-y-1 bg-card p-3 rounded">
                  <div><span className="text-muted-foreground">Name:</span> {credentials.name}</div>
                  <div><span className="text-muted-foreground">Username:</span> <span className="font-bold">{credentials.username}</span></div>
                  <div><span className="text-muted-foreground">Password:</span> <span className="font-bold">{credentials.password}</span></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={copyCreds}><Copy className="h-4 w-4 mr-1" /> Copy Details</Button>
                <Button onClick={() => { setCredentials(null); setOpen(false); }}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign paper dialog */}
      <Dialog open={assignFor !== null} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Question Paper · {faculty.find(f => f.id === assignFor)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Assessment cycle generated ID:</span>
              {generatedId ? <AssessmentBadge id={generatedId} size="md" /> : <span className="text-xs italic text-muted-foreground">Select an active assessment cycle and subject</span>}
            </div>
            <div><Label className="text-xs">Description</Label><Textarea value={aDescription} onChange={e => setADescription(e.target.value)} rows={2} className="mt-1" /></div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Select Assessment Cycle *</Label>
                <Select value={selectedAssessmentId?.toString() || ''} onValueChange={val => setSelectedAssessmentId(Number(val))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select cycle" /></SelectTrigger>
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
                <Label className="text-xs">Course / Subject *</Label>
                <Select value={aSubject} onValueChange={(v) => {
                  setASubject(v);
                  const c = courses.find(course => course.courseName === v);
                  if (c) setASubjectCode(c.courseCode);
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.courseName}>{c.courseName} ({c.courseCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedAssessmentId && (
              <div className="bg-secondary/10 border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block">Exam Type:</span>
                  <span className="font-semibold text-foreground">{aExamType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Semester:</span>
                  <span className="font-semibold text-foreground">{aSemester}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Scheme Year:</span>
                  <span className="font-semibold text-foreground">{aScheme}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Start Date:</span>
                  <span className="font-semibold text-foreground">{aStartDate}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Scheme No.</Label><Input value={aSchemeNo} onChange={e => setASchemeNo(e.target.value)} placeholder="e.g., SCH-2026-12" className="mt-1" /></div>
              <div><Label className="text-xs">Due Date *</Label><Input type="date" value={aDueDate} onChange={e => setADueDate(e.target.value)} className="mt-1" required /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Syllabus</Label>
                <Input type="file" accept=".pdf" onChange={e => setASyllabus(e.target.files?.[0]?.name || '')} className="mt-1" />
                {aSyllabus && <p className="text-xs text-success mt-1 flex items-center gap-1"><FileText className="h-3 w-3" /> {aSyllabus}</p>}
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Previous Paper</Label>
                <Input type="file" accept=".pdf" onChange={e => setAPrev(e.target.files?.[0]?.name || '')} className="mt-1" />
                {aPrev && <p className="text-xs text-success mt-1 flex items-center gap-1"><FileText className="h-3 w-3" /> {aPrev}</p>}
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Timetable</Label>
                <Input type="file" accept=".pdf,image/*" onChange={e => setATimetable(e.target.files?.[0]?.name || '')} className="mt-1" />
                {aTimetable && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {aTimetable}</p>}
              </div>
            </div>
            <div><Label className="text-xs">Instructions</Label><Textarea value={aInstructions} onChange={e => setAInstructions(e.target.value)} rows={2} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button onClick={submitAssign} disabled={!generatedId || !aDueDate} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Send className="h-4 w-4 mr-1" /> Assign & Notify Faculty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
