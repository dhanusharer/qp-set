import { BookOpen, Award, CheckCircle } from 'lucide-react';

export default function CourseDatabase() {
  const courses = [
    { code: '21CS32', name: 'Data Structures & Algorithms', sem: '3rd Semester', credits: 4, bos: 'CSE, AI & ML' },
    { code: '21CS33', name: 'Analog and Digital Electronics', sem: '3rd Semester', credits: 3, bos: 'CSE, ISE' },
    { code: '21CS34', name: 'Computer Organization & Architecture', sem: '3rd Semester', credits: 3, bos: 'CSE' },
    { code: '21CS42', name: 'Design and Analysis of Algorithms', sem: '4th Semester', credits: 4, bos: 'CSE, AI & ML' },
    { code: '21CS43', name: 'Microcontroller and Embedded Systems', sem: '4th Semester', credits: 3, bos: 'CSE' },
    { code: 'BCS602', name: 'Machine Learning', sem: '6th Semester', credits: 4, bos: 'CSE, AI & ML' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Syllabus & Course Database</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Central academic database storing approved syllabus records, scheme codes, and Board of Studies mapping.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div key={course.code} className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 hover:border-primary/40 transition-colors">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                  {course.code}
                </span>
                <h3 className="font-serif text-base font-bold text-foreground">{course.name}</h3>
              </div>
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t pt-3">
              <div>
                <span className="text-muted-foreground text-[10px] block">Credits</span>
                <span className="font-semibold text-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Award className="h-3.5 w-3.5 text-accent" /> {course.credits}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Semester</span>
                <span className="font-semibold text-foreground block mt-0.5">{course.sem}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">BOS Board</span>
                <span className="font-semibold text-foreground block mt-0.5 truncate" title={course.bos}>
                  {course.bos}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-emerald-700">
              <span>Syllabus Version: 2021 Scheme (v2.0)</span>
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle className="h-3.5 w-3.5" /> Verified
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
