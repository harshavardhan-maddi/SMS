import React from 'react';
import {
  HardDrive,
  CalendarCheck2,
  Boxes,
  Car,
  Hotel
} from 'lucide-react';

export type HODModuleFlow = 'sms' | 'shr' | 'str' | 'tr' | 'ra';

interface HODTopModuleCardsProps {
  activeModule: HODModuleFlow;
  onSelectModule: (module: HODModuleFlow) => void;
}

interface ModuleCardDef {
  id: HODModuleFlow;
  code: string;
  name: string;
  icon: React.ElementType;
  colorTheme: {
    activeBorder: string;
    activeBg: string;
    activeText: string;
    iconBgActive: string;
    iconTextActive: string;
    iconBgInactive: string;
    iconTextInactive: string;
    glow: string;
  };
}

const MODULES: ModuleCardDef[] = [
  {
    id: 'sms',
    code: 'SMS',
    name: 'Systems Management System',
    icon: HardDrive,
    colorTheme: {
      activeBorder: 'border-indigo-400 ring-2 ring-indigo-500/30',
      activeBg: 'bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900',
      activeText: 'text-indigo-300',
      iconBgActive: 'bg-indigo-500/25 border-indigo-400/40',
      iconTextActive: 'text-indigo-300',
      iconBgInactive: 'bg-slate-800/80 border-slate-700/60',
      iconTextInactive: 'text-slate-400',
      glow: 'shadow-[0_4px_20px_-4px_rgba(99,102,241,0.35)]'
    }
  },
  {
    id: 'shr',
    code: 'SHR',
    name: 'Seminar Hall Request',
    icon: CalendarCheck2,
    colorTheme: {
      activeBorder: 'border-blue-400 ring-2 ring-blue-500/30',
      activeBg: 'bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-slate-900',
      activeText: 'text-blue-300',
      iconBgActive: 'bg-blue-500/25 border-blue-400/40',
      iconTextActive: 'text-blue-300',
      iconBgInactive: 'bg-slate-800/80 border-slate-700/60',
      iconTextInactive: 'text-slate-400',
      glow: 'shadow-[0_4px_20px_-4px_rgba(59,130,246,0.35)]'
    }
  },
  {
    id: 'str',
    code: 'STR',
    name: 'Stationary Request',
    icon: Boxes,
    colorTheme: {
      activeBorder: 'border-amber-400 ring-2 ring-amber-500/30',
      activeBg: 'bg-gradient-to-r from-amber-950/80 via-yellow-950/50 to-slate-900',
      activeText: 'text-amber-300',
      iconBgActive: 'bg-amber-500/25 border-amber-400/40',
      iconTextActive: 'text-amber-300',
      iconBgInactive: 'bg-slate-800/80 border-slate-700/60',
      iconTextInactive: 'text-slate-400',
      glow: 'shadow-[0_4px_20px_-4px_rgba(245,158,11,0.35)]'
    }
  },
  {
    id: 'tr',
    code: 'TR',
    name: 'Transport Request',
    icon: Car,
    colorTheme: {
      activeBorder: 'border-emerald-400 ring-2 ring-emerald-500/30',
      activeBg: 'bg-gradient-to-r from-emerald-950/80 via-teal-950/50 to-slate-900',
      activeText: 'text-emerald-300',
      iconBgActive: 'bg-emerald-500/25 border-emerald-400/40',
      iconTextActive: 'text-emerald-300',
      iconBgInactive: 'bg-slate-800/80 border-slate-700/60',
      iconTextInactive: 'text-slate-400',
      glow: 'shadow-[0_4px_20px_-4px_rgba(16,185,129,0.35)]'
    }
  },
  {
    id: 'ra',
    code: 'R&A',
    name: 'Refreshments & Accommodations',
    icon: Hotel,
    colorTheme: {
      activeBorder: 'border-rose-400 ring-2 ring-rose-500/30',
      activeBg: 'bg-gradient-to-r from-rose-950/80 via-pink-950/50 to-slate-900',
      activeText: 'text-rose-300',
      iconBgActive: 'bg-rose-500/25 border-rose-400/40',
      iconTextActive: 'text-rose-300',
      iconBgInactive: 'bg-slate-800/80 border-slate-700/60',
      iconTextInactive: 'text-slate-400',
      glow: 'shadow-[0_4px_20px_-4px_rgba(244,63,94,0.35)]'
    }
  }
];

export const HODTopModuleCards: React.FC<HODTopModuleCardsProps> = ({
  activeModule,
  onSelectModule
}) => {
  return (
    <div className="w-full">
      {/* 5 Equal-Size Compact Cards Side-By-Side at the Top */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
        {MODULES.map((mod) => {
          const isActive = activeModule === mod.id;
          const { colorTheme } = mod;
          const IconComponent = mod.icon;

          return (
            <div
              key={mod.id}
              id={`hod-card-${mod.id}`}
              onClick={() => onSelectModule(mod.id)}
              className={`h-[72px] p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 relative overflow-hidden group select-none ${
                isActive
                  ? `${colorTheme.activeBorder} ${colorTheme.activeBg} ${colorTheme.glow}`
                  : 'bg-[#1e293b]/70 hover:bg-[#1e293b]/95 border-[#334155]/60 hover:border-slate-500/60'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-inner ${
                  isActive
                    ? `${colorTheme.iconBgActive} ${colorTheme.iconTextActive}`
                    : `${colorTheme.iconBgInactive} ${colorTheme.iconTextInactive} group-hover:text-white group-hover:border-slate-600`
                }`}
              >
                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              {/* Code & Name (No bulky descriptions or bullet points) */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-sm sm:text-base font-black tracking-tight leading-none ${
                      isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {mod.code}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold truncate block mt-1 leading-tight ${
                    isActive ? colorTheme.activeText : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                  title={mod.name}
                >
                  {mod.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
