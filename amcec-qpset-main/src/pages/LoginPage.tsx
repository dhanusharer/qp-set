import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, GraduationCap, Lock, User, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import amcecLogo from '@/assets/amcec-logo.png';
import controllerPhoto from '@/assets/controller-photo.jpg';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'controller' | 'hod' | 'qpsetter'>('qpsetter');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const roleRedirect = (r: string) => {
    if (r === 'controller') return '/controller/dashboard';
    if (r === 'hod') return '/hod/dashboard';
    return '/faculty/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await login(username, password, role);
      if (success) {
        toast({ title: 'Login Successful', description: `Welcome to QPSet!` });
        navigate(roleRedirect(role));
      }
    } catch (err: any) {
      toast({ title: 'Login Failed', description: err.message || 'Invalid credentials or role mismatch.', variant: 'destructive' });
    }
  };

  const roles = [
    { key: 'controller' as const, label: 'Controller', icon: Shield },
    { key: 'hod' as const, label: 'HOD / Coordinator', icon: BookOpen },
    { key: 'qpsetter' as const, label: 'QP Setter', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 border border-white/[0.03] rounded-full" />
          <div className="absolute bottom-20 right-10 w-96 h-96 border border-white/[0.03] rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <img src={amcecLogo} alt="AMCEC Logo" className="h-20 w-20 object-contain mx-auto mb-5" />
          <h1 className="font-serif text-3xl font-bold text-white mb-1">QPSet</h1>
          <p className="text-white/70 text-base mb-1">Question Paper Management System</p>
          <div className="w-10 h-0.5 bg-accent mx-auto my-4" />
          <p className="text-white/50 text-sm">AMC Engineering College, Bengaluru</p>
          <p className="text-white/35 text-xs mt-0.5">Department of CSE (AI & ML)</p>
          <p className="text-white/25 text-[10px] mt-0.5">Affiliated to VTU | Autonomous Institution</p>

          <div className="mt-8 bg-white/[0.06] backdrop-blur rounded-xl p-5 border border-white/[0.08]">
            <img src={controllerPhoto} alt="Dr. Nandishwar" className="h-20 w-20 rounded-full object-cover mx-auto mb-3 border-2 border-accent" />
            <p className="text-white font-semibold text-sm">Dr. Nandishwar</p>
            <p className="text-white/50 text-xs">Controller of Examinations</p>
            <p className="text-white/30 text-[10px] mt-0.5">AMC Engineering College</p>
          </div>
        </div>
        <p className="absolute bottom-4 text-white/20 text-[10px]">© 2025 AMCEC | QPSet v1.0</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={amcecLogo} alt="AMCEC Logo" className="h-14 w-14 object-contain mx-auto mb-2" />
            <h1 className="font-serif text-2xl font-bold text-foreground">QPSet</h1>
            <p className="text-sm text-muted-foreground">Question Paper Management System</p>
          </div>

          <div className="mb-6">
            <h2 className="font-serif text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* Role toggle — 3 tabs */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {roles.map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  role === r.key
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <r.icon className={`w-5 h-5 ${role === r.key ? 'text-accent' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium leading-tight ${role === r.key ? 'text-foreground' : 'text-muted-foreground'}`}>{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-sm font-medium">Employee ID / Username</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" className="pl-10 h-11" required />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="pl-10 h-11" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-sm">
              Sign In
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2025 AMCEC | CSE (AI & ML) Department | QPSet v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
