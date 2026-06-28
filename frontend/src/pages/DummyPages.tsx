import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, User, ShieldAlert } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="admin-card p-8 bg-white max-w-xl mx-auto space-y-6 text-left">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-2xl"><SettingsIcon className="w-6 h-6" /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">System Settings</h2>
          <p className="text-xs text-brand-textMuted font-medium">Configure application parameters and notification preferences</p>
        </div>
      </div>
      <div className="space-y-4 text-xs">
        <div>
          <span className="font-bold text-slate-700 block mb-1">Theme selection</span>
          <span className="text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-lg">Light Theme (Default)</span>
        </div>
        <div>
          <span className="font-bold text-slate-700 block mb-1">WebSocket Syncing Status</span>
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg">Connected & Active</span>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="admin-card p-8 bg-white max-w-xl mx-auto space-y-6 text-left">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-2xl"><User className="w-6 h-6" /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">User Profile Details</h2>
          <p className="text-xs text-brand-textMuted font-medium">Manage your personal credentials and view assigned privileges</p>
        </div>
      </div>
      <div className="space-y-4 text-xs font-semibold text-slate-700">
        <div><span className="text-slate-400 block mb-0.5">Full Name:</span> <span className="text-slate-800 text-sm font-bold">{user?.name}</span></div>
        <div><span className="text-slate-400 block mb-0.5">Email Address:</span> <span className="text-slate-800">{user?.email}</span></div>
        <div><span className="text-slate-400 block mb-0.5">Portal Role:</span> <span className="text-slate-800">{user?.role}</span></div>
        {user?.departmentCode && <div><span className="text-slate-400 block mb-0.5">Assigned Department:</span> <span className="text-slate-800">{user?.departmentCode}</span></div>}
      </div>
    </div>
  );
};

export const SparePartsPage: React.FC = () => {
  return (
    <div className="admin-card p-8 bg-white max-w-xl mx-auto space-y-6 text-left">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-2xl"><ShieldAlert className="w-6 h-6" /></div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Spare Parts Directory</h2>
          <p className="text-xs text-brand-textMuted font-medium">Technician spare parts log and component inventory tracking</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 font-semibold bg-slate-50 p-4 rounded-xl leading-relaxed">
        Spare parts log is currently linked to repair action forms (including board ICs, network cables, display capacitors, RAM sticks, and peripheral replacement units). Keep track of resolved repair logs to audit parts consumed.
      </p>
    </div>
  );
};
