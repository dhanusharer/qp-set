import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, UserX, Save, X } from 'lucide-react';
import { User } from '@/lib/types';

export default function RegisterQPSetters() {
  const { currentUser } = useAuth();
  const { courses, allUsers, addUser, updateUser, deleteUser } = useApp();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [designation, setDesignation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [uname, setUname] = useState('');
  const [pwd, setPwd] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  if (!currentUser) return null;
  const mySetters = allUsers.filter(u => u.role === 'qpsetter' && u.hodId === currentUser.id);
  const myCourses = courses.filter(c => c.hodId === currentUser.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addUser({
        username: uname,
        password: pwd,
        role: 'qpsetter',
        name,
        email,
        phone,
        designation,
        hodId: currentUser.id,
        dept: currentUser.dept,
        affiliation: 'internal',
        college: 'AMC Engineering College',
        registeredBy: currentUser.name,
        registeredOn: new Date().toISOString().split('T')[0]
      });
      toast({ title: 'QP Setter Registered', description: `${name} has been registered as QP Setter.` });
      setShowForm(false);
      setName(''); setEmpId(''); setDesignation(''); setEmail(''); setPhone(''); setUname(''); setPwd('');
    } catch (err: any) {
      toast({ title: 'Registration Failed', description: err.message || 'Failed to register QP Setter.', variant: 'destructive' });
    }
  };

  const startEdit = (s: User) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDesignation(s.designation || '');
    setEditEmail(s.email || '');
    setEditPhone(s.phone || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleEditSave = async (id: number) => {
    try {
      await updateUser(id, {
        name: editName,
        designation: editDesignation,
        email: editEmail,
        phone: editPhone,
      });
      toast({ title: 'QP Setter Updated', description: `${editName} updated successfully.` });
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message || 'Failed to update QP Setter.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteUser(id);
      toast({ title: 'QP Setter Removed', description: `${name} has been removed.` });
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message || 'Failed to remove QP Setter.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Register QP Setters</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage QP Setters under {currentUser.dept}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-1" /> Register QP Setter
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-serif text-base font-semibold mb-4">New QP Setter Registration</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="mt-1" required />
              </div>
              <div>
                <Label className="text-xs">Employee ID</Label>
                <Input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="Employee ID" className="mt-1" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Designation</Label>
                <Select value={designation} onValueChange={setDesignation}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                    <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                    <SelectItem value="Professor">Professor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <Input value={currentUser.dept || ''} disabled className="mt-1 bg-secondary/30" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Set Username</Label>
                <Input value={uname} onChange={e => setUname(e.target.value)} placeholder="Login username" className="mt-1" required />
              </div>
              <div>
                <Label className="text-xs">Set Password</Label>
                <Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Password (min 8 chars)" className="mt-1" required />
              </div>
            </div>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Register QP Setter
            </Button>
          </form>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Name</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Designation</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Username</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mySetters.map(s => (
              editingId === s.id ? (
                <tr key={s.id} className="border-b last:border-0 bg-accent/5">
                  <td className="p-2">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-xs" placeholder="Name" />
                  </td>
                  <td className="p-2">
                    <Select value={editDesignation} onValueChange={setEditDesignation}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assistant Professor">Asst. Prof</SelectItem>
                        <SelectItem value="Associate Professor">Assoc. Prof</SelectItem>
                        <SelectItem value="Professor">Professor</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-xs font-mono">{s.username}</td>
                  <td className="p-2"><span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">Active</span></td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" onClick={() => handleEditSave(s.id)} disabled={!editName}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={cancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                        {s.name.split(' ').slice(-1)[0][0]}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{s.designation || 'Assistant Professor'}</td>
                  <td className="p-3 text-xs font-mono">{s.username}</td>
                  <td className="p-3"><span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">Active</span></td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit QP Setter" onClick={() => startEdit(s)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" title="Remove QP Setter" onClick={() => handleDelete(s.id, s.name)}>
                        <UserX className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {mySetters.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">No QP Setters registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
