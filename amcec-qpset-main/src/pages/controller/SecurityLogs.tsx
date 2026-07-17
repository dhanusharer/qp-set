import { ShieldAlert, Clock, User, CheckCircle2 } from 'lucide-react';

export default function SecurityLogs() {
  const logs = [
    { id: 1, action: 'User Sign In', user: 'Dr. Nandishwar (Controller)', ip: '192.168.1.10', time: '2026-07-17 09:51:32', status: 'Success' },
    { id: 2, action: 'User Sign In', user: 'Dr. Meena Sharma (HOD)', ip: '192.168.1.15', time: '2026-07-17 09:35:10', status: 'Success' },
    { id: 3, action: 'Paper Approval', user: 'Dr. Meena Sharma (HOD)', ip: '192.168.1.15', time: '2026-07-17 09:12:44', status: 'Success', detail: 'Approved paper for 21CS32 - DSA' },
    { id: 4, action: 'Paper Submission', user: 'Prof. Swati (Faculty)', ip: '192.168.1.24', time: '2026-07-17 09:05:12', status: 'Success', detail: 'Submitted 1IA for 21CS32' },
    { id: 5, action: 'Syllabus Alignment Check', user: 'Prof. Swati (Faculty)', ip: '192.168.1.24', time: '2026-07-17 08:58:30', status: 'Success', detail: 'Ran AI alignment on 21CS32' },
    { id: 6, action: 'Exam Cycle Initialized', user: 'Dr. Nandishwar (Controller)', ip: '192.168.1.10', time: '2026-07-17 08:30:00', status: 'Success', detail: 'Created cycle 1IA_3Sem_May2026' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Security & Access Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Immutable audit trail of all actions, uploads, approvals, and credentials activity in the system.
        </p>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-warning bg-warning/5 border border-warning/20 p-4 rounded-xl">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">
            <strong>Security Protocol:</strong> All logs are cryptographically hashed and immutable. Any tampering attempts will auto-lock the platform.
          </p>
        </div>

        <div className="border rounded-xl overflow-hidden divide-y">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{log.action}</span>
                  {log.detail && (
                    <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                      {log.detail}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {log.user} • <Clock className="h-3.5 w-3.5" /> {log.time}
                </p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">IP Address</p>
                  <p className="text-xs text-foreground font-mono">{log.ip}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
