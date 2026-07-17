import { Database, Lock, Eye, Download, Archive } from 'lucide-react';

export default function IntellectualRepository() {
  const archives = [
    { cycle: '1IA_3Sem_May2026', subject: 'Data Structures & Algorithms', code: '21CS32', date: '2026-05-15', files: ['21CS32_QP.pdf', '21CS32_Scheme.pdf'] },
    { cycle: '2IA_3Sem_Jun22026', subject: 'Analog and Digital Electronics', code: '21CS33', date: '2026-06-20', files: ['21CS33_QP.pdf'] },
    { cycle: 'SEE_3Sem_Jul2025', subject: 'Computer Organization & Architecture', code: '21CS34', date: '2025-07-10', files: ['21CS34_QP.pdf', '21CS34_Scheme.pdf'] }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Intellectual Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Secure, encrypted archive of all finalized exam cycles, approved question paper drafts, and marking scheme keys.
        </p>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">Secure Paper Vault</h3>
            <p className="text-xs text-muted-foreground">All stored contents are encrypted using AES-256 and locked under CoE signing keys.</p>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden divide-y">
          {archives.map((item) => (
            <div key={item.code} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{item.subject}</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground font-semibold px-2 py-0.5 rounded">
                    {item.code}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Cycle: {item.cycle} • Archived Date: {item.date}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {item.files.map(file => (
                  <div key={file} className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1 bg-background text-[11px] font-medium text-foreground hover:bg-secondary/40 transition-all select-none">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span>{file}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
