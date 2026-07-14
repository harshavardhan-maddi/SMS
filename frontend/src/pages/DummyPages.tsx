import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, User, ShieldAlert, Key } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

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
  const { user, updateUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error('Name and Email are required.');
      return;
    }

    if (newPassword && !currentPassword) {
      toast.error('Current password is required to change password.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/users/profile', {
        name,
        email,
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword ? newPassword : undefined
      });

      const { token, user: updatedUser } = response.data;

      if (token) {
        localStorage.setItem('sms_token', token);
        if (sessionStorage.getItem('sms_token') !== null) {
          sessionStorage.setItem('sms_token', token);
        }
      }

      updateUser({
        name: updatedUser.name,
        email: updatedUser.email
      });

      toast.success('Your profile has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto text-left">
      <div className="admin-card p-8 bg-white space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-2xl"><User className="w-6 h-6" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">User Profile Details</h2>
            <p className="text-xs text-brand-textMuted font-medium">Manage your personal credentials and view assigned privileges</p>
          </div>
        </div>
        <div className="space-y-4 text-xs font-semibold text-slate-700">
          <div><span className="text-slate-400 block mb-0.5">Full Name:</span> <span className="text-slate-800 text-sm font-bold">{user?.name}</span></div>
          <div><span className="text-slate-400 block mb-0.5">Email Address / Login ID:</span> <span className="text-slate-800 font-mono text-xs">{user?.email}</span></div>
          <div><span className="text-slate-400 block mb-0.5">Portal Role:</span> <span className="text-slate-800">{user?.role}</span></div>
          {user?.departmentCode && <div><span className="text-slate-400 block mb-0.5">Assigned Department:</span> <span className="text-slate-800">{user?.departmentCode}</span></div>}
        </div>
      </div>

      {/* Edit Profile Form Card */}
      <div className="admin-card p-8 bg-white space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Key className="w-6 h-6" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Edit Profile & Password</h2>
            <p className="text-xs text-brand-textMuted font-medium">Update your account details or password securely</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Email Address (Username)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="border-t border-slate-100 my-4 pt-4">
            <span className="text-[11px] font-bold text-slate-400 block mb-3 uppercase tracking-wider">Change Password (Optional)</span>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password to verify identity"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-purple hover:bg-brand-purpleHover text-white font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Updating Profile...' : 'Save Profile Changes'}
          </button>
        </form>
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
