import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Layers, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CreateAssessment() {
  const { assessments, addAssessment, assessmentsLoading } = useApp();
  const { toast } = useToast();
  const [examType, setExamType] = useState('');
  const [semester, setSemester] = useState('');
  const [startDate, setStartDate] = useState('');
  const [schemeYear, setSchemeYear] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examType || !semester || !startDate || !schemeYear) {
      toast({ title: 'Incomplete Fields', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    try {
      await addAssessment({
        examType,
        semester,
        startDate: new Date(startDate).toISOString(),
        schemeYear
      });
      toast({ title: 'Success', description: 'Assessment cycle created successfully!' });
      // Reset form
      setExamType('');
      setSemester('');
      setStartDate('');
      setSchemeYear('');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Creation Failed', description: err.message || 'Failed to create assessment.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Create Assessment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Define master examination assessment cycles for paper setting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form */}
        <div className="bg-card border rounded-xl p-5 h-fit space-y-4">
          <h2 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New Assessment Cycle
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="exam-type">Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger id="exam-type">
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Internal Assessment (40 Marks)">1st Internal Assessment (40 Marks)</SelectItem>
                  <SelectItem value="2nd Internal Assessment (40 Marks)">2nd Internal Assessment (40 Marks)</SelectItem>
                  <SelectItem value="3rd Internal Assessment (40 Marks)">3rd Internal Assessment (40 Marks)</SelectItem>
                  <SelectItem value="End Semester Exam (100 Marks)">End Semester Exam (100 Marks)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="semester">Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => (
                    <SelectItem key={s} value={s}>{s}rd Semester</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <div className="relative">
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="pl-9"
                />
                <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scheme-year">Scheme Year</Label>
              <Select value={schemeYear} onValueChange={setSchemeYear}>
                <SelectTrigger id="scheme-year">
                  <SelectValue placeholder="Select scheme year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2018 Scheme">2018 Scheme</SelectItem>
                  <SelectItem value="2021 Scheme">2021 Scheme</SelectItem>
                  <SelectItem value="2022 Scheme">2022 Scheme</SelectItem>
                  <SelectItem value="2025 Scheme">2025 Scheme</SelectItem>
                  <SelectItem value="2026 Scheme">2026 Scheme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={assessmentsLoading} className="w-full">
              Generate Assessment ID
            </Button>
          </form>
        </div>

        {/* Existing Cycles Table */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-5">
          <h2 className="font-serif text-base font-bold text-foreground flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-primary" /> Active Assessment Cycles
          </h2>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                <tr>
                  <th className="p-3">Assessment ID</th>
                  <th className="p-3">Exam Type</th>
                  <th className="p-3">Semester</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Scheme</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assessments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No assessment cycles defined. Use the form to generate one.
                    </td>
                  </tr>
                ) : (
                  assessments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{a.assessmentCode}</td>
                      <td className="p-3 text-foreground">{a.examType}</td>
                      <td className="p-3 text-foreground">{a.semester} Sem</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(a.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                          {a.schemeYear || '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
