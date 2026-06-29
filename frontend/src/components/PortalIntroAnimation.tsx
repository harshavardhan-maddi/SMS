import React, { useState, useEffect } from 'react';
import { Monitor, Cpu, Keyboard, Mouse, Wifi, Shield, CheckCircle2, Wrench, Sparkles } from 'lucide-react';

interface PortalIntroAnimationProps {
  onComplete?: () => void;
}

export const PortalIntroAnimation: React.FC<PortalIntroAnimationProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Sequence micro-steps during the 3-second intro
    const stepTimer1 = setTimeout(() => setActiveStep(1), 800);
    const stepTimer2 = setTimeout(() => setActiveStep(2), 1800);

    // 3-second total timer
    const completeTimer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 3000);

    return () => {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ease-in-out">
      
      {/* Dynamic Background Glowing Spheres */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-purple/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-lg mx-auto space-y-8">
        
        {/* Portal Name Branding (SMS) */}
        <div className="space-y-2 animate-in zoom-in duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl mb-2">
            <Shield className="w-10 h-10 text-brand-purple animate-bounce" />
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-indigo-300 tracking-widest uppercase">
            SMS
          </h1>
          <p className="text-xs font-black text-brand-purple uppercase tracking-[0.3em]">
            Systems Management System
          </p>
        </div>

        {/* Hardware Devices & Device Status Animation Display */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full max-w-md">
          
          {/* Device 1: Monitor (Perfect / Operational State) */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-500 flex flex-col items-center gap-2 ${
            activeStep >= 0 ? 'bg-white/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10 translate-y-0 opacity-100' : 'opacity-0 translate-y-4'
          }`}>
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Monitor className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-white">Monitors</span>
            <span className="text-[9px] font-black bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Perfect
            </span>
          </div>

          {/* Device 2: CPU (In Repair State) */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-500 flex flex-col items-center gap-2 ${
            activeStep >= 1 ? 'bg-white/10 border-amber-500/40 shadow-lg shadow-amber-500/10 translate-y-0 opacity-100' : 'opacity-0 translate-y-4'
          }`}>
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <Cpu className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <span className="text-[11px] font-extrabold text-white">CPUs</span>
            <span className="text-[9px] font-black bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider flex items-center gap-1">
              <Wrench className="w-2.5 h-2.5" /> In Repair
            </span>
          </div>

          {/* Device 3: Keyboard / Accessories (Allocated Design & Inventory) */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-500 flex flex-col items-center gap-2 ${
            activeStep >= 2 ? 'bg-white/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10 translate-y-0 opacity-100' : 'opacity-0 translate-y-4'
          }`}>
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Keyboard className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-white">Keyboards</span>
            <span className="text-[9px] font-black bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Allocated
            </span>
          </div>

        </div>

        {/* 3-Second Loading Bar Progress */}
        <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
          <div className="h-full bg-gradient-to-r from-brand-purple via-indigo-400 to-emerald-400 rounded-full animate-in slide-in-from-left duration-3000 fill-mode-forwards w-full"></div>
        </div>

      </div>
    </div>
  );
};
