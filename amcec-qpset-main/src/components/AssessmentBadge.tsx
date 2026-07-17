import { ClipboardList } from 'lucide-react';

export const AssessmentBadge = ({ id, size = 'sm' }: { id: string | number; size?: 'sm' | 'md' }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full font-mono font-bold tracking-tight"
    style={{
      background: '#E8A020',
      color: '#1A2B4A',
      fontSize: size === 'md' ? 13 : 11,
      padding: size === 'md' ? '5px 12px' : '3px 9px',
    }}
  >
    <ClipboardList className="h-3 w-3" /> {id}
  </span>
);

export function getDueDateColor(dueDate: string): string {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '#EF4444';
  if (diff <= 3) return '#F59E0B';
  return '#22C55E';
}

export function getDueDateLabel(dueDate: string): string {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`;
  if (diff === 0) return 'Due today';
  return `${diff}d left`;
}

export function generateAssessmentId(examType: string, semester: string, startDate: string, subjectCode: string): string {
  const typeMap: Record<string, string> = {
    '1st Internal Assessment (40 Marks)': '1IA',
    '2nd Internal Assessment (40 Marks)': '2IA',
    '3rd Internal Assessment (40 Marks)': '3IA',
    'CIE Test (20 Marks)': 'CIE',
    'End Semester Exam (100 Marks)': 'SRK',
  };
  const t = typeMap[examType] || 'EXM';
  const semNum = semester.match(/\d+/)?.[0] || 'X';
  const d = startDate ? new Date(startDate) : new Date();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const codeSuffix = subjectCode.replace(/\s+/g, '').toUpperCase();
  return `${t}_${semNum}Sem_${month}${year}_${codeSuffix}`;
}
