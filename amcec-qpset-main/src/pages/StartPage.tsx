import { useNavigate } from 'react-router-dom';
import amcecLogo from '@/assets/amcec-logo.png';

const StartPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background subtle elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 border border-white/[0.03] rounded-full" />
        <div className="absolute bottom-[15%] right-[8%] w-96 h-96 border border-white/[0.03] rounded-full" />
        <div className="absolute top-[40%] right-[20%] w-40 h-40 border border-accent/[0.06] rotate-45" />
        <div className="absolute bottom-[30%] left-[15%] w-56 h-56 border border-accent/[0.04] rounded-full" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-lg">
        <img
          src={amcecLogo}
          alt="AMC Engineering College"
          className="h-28 w-28 object-contain mx-auto mb-8 drop-shadow-lg"
        />

        <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
          QP<span className="text-accent">Set</span>
        </h1>

        <p className="text-white/70 text-lg mb-1">Question Paper Management System</p>

        <div className="w-12 h-0.5 bg-accent mx-auto my-5" />

        <p className="text-white/50 text-sm mb-1">AMC Engineering College, Bengaluru</p>
        <p className="text-white/35 text-xs mb-2">Department of CSE (AI & ML)</p>
        <p className="text-white/25 text-[11px]">Affiliated to VTU | Autonomous Institution</p>

        <button
          onClick={() => navigate('/login')}
          className="mt-10 px-12 py-3.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg text-base transition-all hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]"
        >
          Get Started
        </button>

        <p className="mt-6 text-white/20 text-[10px]">
          © 2025 AMCEC | QPSet v1.0
        </p>
      </div>
    </div>
  );
};

export default StartPage;
