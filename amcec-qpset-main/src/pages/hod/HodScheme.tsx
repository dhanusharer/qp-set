import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Download, Eye, Pencil, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function HodScheme() {
  const { currentUser } = useAuth();
  const { courses, schemes, addScheme, updateScheme } = useApp();
  const { toast } = useToast();

  const [selectedCourse, setSelectedCourse] = useState('');
  const [examType, setExamType] = useState('');
  const [semester, setSemester] = useState('');
  const [schemeYear, setSchemeYear] = useState('');
  const [rows, setRows] = useState([
    { questionNo: 'Q1', part: 'a', maxMarks: 4, expectedPoints: '', co: 'CO1', bloomsLevel: 'L1' },
    { questionNo: 'Q1', part: 'b', maxMarks: 3, expectedPoints: '', co: 'CO1', bloomsLevel: 'L2' },
    { questionNo: 'Q1', part: 'c', maxMarks: 3, expectedPoints: '', co: 'CO1', bloomsLevel: 'L3' },
  ]);

  if (!currentUser) return null;
  const myCourses = courses.filter(c => c.hodId === currentUser.id);
  const mySchemes = schemes.filter(s => s.hodId === currentUser.id);

  const addRow = () => {
    const lastQ = rows[rows.length - 1];
    const nextPart = lastQ.part === 'a' ? 'b' : lastQ.part === 'b' ? 'c' : 'a';
    const nextQ = nextPart === 'a' ? `Q${parseInt(lastQ.questionNo.replace('Q', '')) + 1}` : lastQ.questionNo;
    setRows([...rows, { questionNo: nextQ, part: nextPart, maxMarks: nextPart === 'a' ? 4 : 3, expectedPoints: '', co: 'CO1', bloomsLevel: 'L1' }]);
  };

  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: string, value: string | number) => {
    setRows(rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleCourseChange = (courseName: string) => {
    setSelectedCourse(courseName);
    const courseObj = myCourses.find(c => c.courseName === courseName);
    if (courseObj) {
      setSemester(courseObj.semester);
      setSchemeYear(courseObj.schemeYear);
    }
  };

  const handleSave = async (status: 'Draft' | 'Finalized') => {
    const course = myCourses.find(c => c.courseName === selectedCourse);
    if (!course) return;
    try {
      await addScheme({
        courseId: course.id,
        examType,
        rows,
        status,
        hodId: currentUser.id,
      });
      toast({ title: status === 'Draft' ? 'Saved as Draft' : 'Scheme Finalized', description: `Scheme for ${selectedCourse} saved.` });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message || 'Could not save scheme.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Marking Scheme</h1>
        <p className="text-sm text-muted-foreground mt-1">Create and manage marking schemes for your courses</p>
      </div>

      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create / Edit</TabsTrigger>
          <TabsTrigger value="view">View / Download</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4 mt-4">
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Subject</Label>
                <Select value={selectedCourse} onValueChange={handleCourseChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {myCourses.map(c => <SelectItem key={c.id} value={c.courseName}>{c.courseName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Internal Assessment (40M)">Internal (40M)</SelectItem>
                    <SelectItem value="End Semester (100M)">End Sem (100M)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Semester</Label>
                <Input value={semester} disabled className="mt-1 bg-secondary/30" placeholder="Auto-filled" />
              </div>
              <div>
                <Label className="text-xs">Scheme Year</Label>
                <Input value={schemeYear} disabled className="mt-1 bg-secondary/30" placeholder="Auto-filled" />
              </div>
            </div>

            {/* Scheme table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-secondary/30">
                    <th className="p-2 text-left text-xs font-medium border">Q. No.</th>
                    <th className="p-2 text-left text-xs font-medium border">Part</th>
                    <th className="p-2 text-left text-xs font-medium border">Max Marks</th>
                    <th className="p-2 text-left text-xs font-medium border">Expected Answer Points</th>
                    <th className="p-2 text-left text-xs font-medium border">CO</th>
                    <th className="p-2 text-left text-xs font-medium border">Bloom's</th>
                    <th className="p-2 text-center text-xs font-medium border w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-secondary/10">
                      <td className="p-1 border"><Input value={r.questionNo} onChange={e => updateRow(i, 'questionNo', e.target.value)} className="h-8 text-xs" /></td>
                      <td className="p-1 border"><Input value={r.part} onChange={e => updateRow(i, 'part', e.target.value)} className="h-8 text-xs w-12" /></td>
                      <td className="p-1 border"><Input type="number" value={r.maxMarks} onChange={e => updateRow(i, 'maxMarks', parseInt(e.target.value))} className="h-8 text-xs w-16" /></td>
                      <td className="p-1 border"><Input value={r.expectedPoints} onChange={e => updateRow(i, 'expectedPoints', e.target.value)} placeholder="Key points..." className="h-8 text-xs" /></td>
                      <td className="p-1 border">
                        <Select value={r.co} onValueChange={v => updateRow(i, 'co', v)}>
                          <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>{['CO1','CO2','CO3','CO4','CO5'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="p-1 border">
                        <Select value={r.bloomsLevel} onValueChange={v => updateRow(i, 'bloomsLevel', v)}>
                          <SelectTrigger className="h-8 text-xs w-16"><SelectValue /></SelectTrigger>
                          <SelectContent>{['L1','L2','L3','L4','L5','L6'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="p-1 border text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeRow(i)}><Trash2 className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSave('Draft')}>Save as Draft</Button>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleSave('Finalized')}>Finalize Scheme</Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Total Marks: <span className="font-bold text-foreground">{rows.reduce((s, r) => s + r.maxMarks, 0)}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="view" className="mt-4">
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/30">
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Subject</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Exam Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Semester</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Created</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mySchemes.map(s => {
                  const course = myCourses.find(c => c.id === s.courseId);
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/20">
                      <td className="p-3 text-xs font-medium">{course?.courseName || '—'}</td>
                      <td className="p-3 text-xs text-muted-foreground">{s.examType}</td>
                      <td className="p-3 text-xs text-muted-foreground">{course?.semester || '—'}</td>
                      <td className="p-3 text-xs text-muted-foreground">{s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '—'}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'Finalized' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast({ title: 'Scheme PDF downloaded' })}><Download className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Pencil className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {mySchemes.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">No schemes created yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
