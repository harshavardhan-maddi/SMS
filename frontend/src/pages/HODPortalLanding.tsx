import React from 'react';
import { Layers, CalendarCheck2, ArrowRight, ShieldCheck, Sparkles, Building2, HardDrive, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HODPortalLandingProps {
  onSelectFlow: (flow: 'sms' | 'shr') => void;
}

export const HODPortalLanding: React.FC<HODPortalLandingProps> = ({ onSelectFlow }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse delay-700" />

      {/* Header Banner */}
      <div className="text-center max-w-2xl mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          HOD Unified Portal Hub
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Welcome, <span className="bg-gradient-to-r from-brand-purple to-indigo-400 bg-clip-text text-transparent">{user?.name || 'Department HOD'}</span>
        </h1>
        <p className="text-sm sm:text-base text-brand-textMuted">
          Select the system module you wish to access. You can toggle between modules at any time from your portal header.
        </p>
      </div>

      {/* The 2 Primary Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2">
        {/* Card 1: SMS */}
        <div
          onClick={() => onSelectFlow('sms')}
          id="card-sms-module"
          className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-[#1e293b]/80 to-[#0f172a]/95 border border-[#334155]/60 hover:border-brand-purple/60 p-8 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.3)] backdrop-blur-xl flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-2xl group-hover:bg-brand-purple/15 transition-all duration-300" />
          
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-xl bg-brand-purple/20 border border-brand-purple/40 text-brand-purple flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <HardDrive className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Core System
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-purple transition-colors">
              SMS
            </h2>
            <p className="text-xs font-semibold text-brand-purple uppercase tracking-wider mb-3">
              Systems Management System
            </p>
            <p className="text-sm text-brand-textMuted leading-relaxed mb-6">
              Department Labs, Hardware & Electrical Issue Reporting, Inventory Counts, Finalization, and Dead Stock tracking.
            </p>

            <ul className="space-y-2 mb-6 text-xs text-brand-textMuted">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Department Lab Workstations & Peripherals</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Raise Hardware & Electrical Repair Tickets</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Department Programmers & Count Finalization</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#334155]/40 flex items-center justify-between text-sm font-semibold text-white group-hover:text-brand-purple">
            <span>Enter SMS Portal</span>
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: SHR - Seminar hall request */}
        <div
          onClick={() => onSelectFlow('shr')}
          id="card-shr-module"
          className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-[#1e293b]/80 to-[#0f172a]/95 border border-[#334155]/60 hover:border-indigo-400/60 p-8 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(129,140,248,0.35)] backdrop-blur-xl flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all duration-300" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <CalendarCheck2 className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                New Module
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
              SHR
            </h2>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
              Seminar Hall Request
            </p>
            <p className="text-sm text-brand-textMuted leading-relaxed mb-6">
              Request Block-3, Tech Hub, and Block-4 Seminar Halls for Guest Lectures, Workshops, Conferences, and Department Events.
            </p>

            <ul className="space-y-2 mb-6 text-xs text-brand-textMuted">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>Request Block-3, Tech Hub & Block-4 Halls</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>Single Day (FN / AN / Full Day) or Multi-Day Events</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>Direct Dispatch to Designated Hall Allocator</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#334155]/40 flex items-center justify-between text-sm font-semibold text-white group-hover:text-indigo-400">
            <span>Enter SHR Portal</span>
            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Footnote */}
      <div className="mt-10 flex items-center gap-2 text-xs text-brand-textMuted">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Connected as {user?.email} • Department: {user?.departmentCode || 'HOD'}</span>
      </div>
    </div>
  );
};
