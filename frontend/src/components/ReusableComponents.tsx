import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// 1. StatCard Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean; // true = up, false = down
  };
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconTextColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  trend,
  icon: Icon,
  iconBgColor = 'bg-brand-purple/10',
  iconTextColor = 'text-brand-purple',
}) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="admin-card p-6 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">{title}</span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</div>
        </div>
        <div className={`p-3 rounded-2xl ${iconBgColor} ${iconTextColor} shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-4 text-xs font-medium border-t border-slate-100 pt-3">
          {trend && (
            <span className={`flex items-center gap-0.5 font-bold ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {trend.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {trend.value}
            </span>
          )}
          <span className="text-brand-textMuted">{subtext}</span>
        </div>
      )}
    </motion.div>
  );
};

// 2. LoadingSkeleton Component
export const LoadingSkeleton: React.FC<{ type?: 'grid' | 'table' | 'chart' }> = ({ type = 'grid' }) => {
  if (type === 'table') {
    return (
      <div className="space-y-4 w-full animate-pulse-subtle">
        <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
        <div className="h-8 bg-slate-200/60 rounded-md w-full"></div>
        <div className="h-8 bg-slate-200/60 rounded-md w-full"></div>
        <div className="h-8 bg-slate-200/60 rounded-md w-full"></div>
        <div className="h-8 bg-slate-200/60 rounded-md w-full"></div>
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="h-[300px] w-full bg-slate-200/50 rounded-2xl animate-pulse-subtle flex items-center justify-center text-xs text-brand-textMuted">
        Loading analytics charts...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse-subtle">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-3 bg-slate-300 rounded w-24"></div>
              <div className="h-7 bg-slate-300 rounded w-16"></div>
            </div>
            <div className="w-10 h-10 bg-slate-300 rounded-xl"></div>
          </div>
          <div className="h-3 bg-slate-300 rounded w-36 mt-2"></div>
        </div>
      ))}
    </div>
  );
};

// 3. Modal Overlay Dialog Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white rounded-3xl border border-[#e2e8f0] shadow-premium overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
