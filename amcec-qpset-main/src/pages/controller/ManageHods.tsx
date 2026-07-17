import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, Phone, Award, Eye, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ManageHods() {
  const { assignments, allUsers } = useApp();
  const [search, setSearch] = useState('');
  const [selectedHod, setSelectedHod] = useState<number | null>(null);

  const hods = allUsers.filter(u => u.role === 'hod');

  const filtered = hods.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.dept?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = hods.find(h => h.id === selectedHod);
  const selectedSetters = selected ? allUsers.filter(u => u.role === 'qpsetter' && u.hodId === selected.id) : [];
  const selectedAssignments = selected ? assignments.filter(a => a.hodId === selected.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Manage HODs</h1>
          <p className="text-sm text-muted-foreground mt-1">{hods.length} HOD/QP Coordinators registered</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HODs..." className="pl-9 w-64" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground font-serif">{hods.length}</p>
          <p className="text-xs text-muted-foreground">Total HODs</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent font-serif">{allUsers.filter(u => u.role === 'qpsetter').length}</p>
          <p className="text-xs text-muted-foreground">Total QP Setters</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success font-serif">{assignments.filter(a => a.status === 'Approved').length}</p>
          <p className="text-xs text-muted-foreground">Papers Approved</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning font-serif">{assignments.filter(a => a.status === 'Pending').length}</p>
          <p className="text-xs text-muted-foreground">Papers Pending</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Department</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">QP Setters</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Papers</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => {
              const setterCount = allUsers.filter(u => u.role === 'qpsetter' && u.hodId === h.id).length;
              const paperCount = assignments.filter(a => a.hodId === h.id).length;
              return (
                <tr key={h.id} className="border-b last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {h.name.split(' ').slice(-1)[0][0]}
                      </div>
                      <div>
                        <span className="font-medium text-xs">{h.name}</span>
                        <p className="text-[10px] text-muted-foreground">{h.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs font-medium text-accent">{h.dept}</td>
                  <td className="p-3 text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {setterCount}</td>
                  <td className="p-3 text-xs font-medium">{paperCount}</td>
                  <td className="p-3"><span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">Active</span></td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedHod(h.id)}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedHod} onOpenChange={() => setSelectedHod(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">HOD Profile</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-xl">
                  {selected.name.split(' ').slice(-1)[0][0]}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selected.name}</h3>
                  <p className="text-sm text-accent font-medium">{selected.dept}</p>
                  <p className="text-xs text-muted-foreground">{selected.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                  <p className="text-xs font-medium">{selected.email}</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                  <p className="text-xs font-medium">{selected.phone}</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Experience</p>
                  <p className="text-xs font-medium">{selected.experience}</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> QP Setters</p>
                  <p className="text-xs font-medium">{selectedSetters.length}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">QP Setters Under This HOD</h4>
                <div className="space-y-2">
                  {selectedSetters.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-secondary/20 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">{s.name.split(' ').slice(-1)[0][0]}</div>
                        <div>
                          <p className="text-xs font-medium">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full">Active</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Assignment History</h4>
                {selectedAssignments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAssignments.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-secondary/20 rounded-lg p-2">
                        <div>
                          <p className="text-xs font-medium">{a.course?.courseName}</p>
                          <p className="text-[10px] text-muted-foreground">{a.examType}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center p-4">No assignments yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
