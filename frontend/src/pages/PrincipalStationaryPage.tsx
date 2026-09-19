import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Trash2,
  Boxes,
  Plus,
  Mail,
  Key,
  User,
  Shield,
  Clock,
  CheckCircle,
  Truck,
  CheckCheck,
  XCircle,
  ClipboardList
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { toast } from 'react-hot-toast';

interface AccountUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId: number;
  active: boolean;
  createdAt: string;
}

export const PrincipalStationaryPage: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'accounts' | 'requests'>('accounts');
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Account Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ROLE_AO' | 'ROLE_STATIONARY'>('ROLE_AO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Account Delete Confirmation
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AccountUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAccountsAndRequests = async () => {
    setLoading(true);
    try {
      const [accRes, reqRes] = await Promise.all([
        api.get('/stationary/accounts'),
        api.get('/stationary/requests'),
      ]);
      setAccounts(accRes.data || []);
      setRequests(reqRes.data || []);
    } catch (err) {
      console.error('Failed to load stationary management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndRequests();
  }, [dashboardTick]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('All fields are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/stationary/accounts', {
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
      });

      toast.success(
        `Created ${newRole === 'ROLE_AO' ? 'Administrative Officer (AO)' : 'Stationary Store Incharge'} account!`
      );
      setModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      fetchAccountsAndRequests();
    } catch (err: any) {
      console.error('Failed to create account:', err);
      toast.error(err.response?.data || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    try {
      await api.delete(`/stationary/accounts/${deleteConfirmUser.id}`);
      toast.success(`Account "${deleteConfirmUser.name}" deleted successfully.`);
      setDeleteConfirmUser(null);
      fetchAccountsAndRequests();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      toast.error(err.response?.data || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1e293b]/90 via-[#0f172a]/95 to-[#1e293b]/90 border border-[#334155]/60 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Principal Administrative Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Stationary Logins &amp; Multi-Tier Workflow
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted">
            Manage Administrative Officer (AO) and Stationary Store login credentials and monitor college-wide indents.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create AO / Stationary Login</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-[#1e293b]/60 border border-[#334155]/60 rounded-2xl p-2 backdrop-blur-md w-fit">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Login Accounts ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>College-Wide Requests ({requests.length})</span>
        </button>
      </div>

      {/* Tab 1: Accounts List */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-xs">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-20 bg-[#1e293b]/40 rounded-2xl border border-[#334155]/40 text-slate-400 text-xs space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p className="font-bold text-white">No AO or Stationary accounts created yet.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Create Account Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => {
                const isAO = acc.role === 'ROLE_AO';

                return (
                  <div
                    key={acc.id}
                    className="p-5 rounded-2xl bg-[#1e293b]/70 border border-[#334155]/60 backdrop-blur-md flex flex-col justify-between gap-4 hover:border-slate-500 transition-all shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            isAO
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {isAO ? 'Administrative Officer (AO)' : 'Stationary Store Incharge'}
                        </span>

                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white">{acc.name}</h3>
                      <p className="text-xs text-brand-textMuted flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{acc.email}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#334155]/40 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Created {new Date(acc.createdAt).toLocaleDateString()}
                      </span>

                      <button
                        onClick={() => setDeleteConfirmUser(acc)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Account</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Requests Overview */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#334155]/60 bg-[#1e293b]/70 backdrop-blur-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b1329] text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Department / Requester</th>
                  <th className="py-3 px-4">Items / Total Units</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/5">
                    <td className="py-3 px-4 font-black text-white">{req.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">{req.department?.name || 'Department'}</div>
                      <div className="text-[11px] text-slate-400">{req.requester?.name}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-amber-300">
                      {req.totalItems} items ({req.totalQuantity} units)
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{req.purpose || '---'}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold">{req.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create New Login Credentials</h3>
                <p className="text-xs text-brand-textMuted">Create an AO or Stationary Incharge login</p>
              </div>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Role for Login:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                >
                  <option value="ROLE_AO">Administrative Officer (AO) - Approval Authority</option>
                  <option value="ROLE_STATIONARY">Stationary Incharge - Store &amp; Dispatch Authority</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Administrative Officer Srikanth"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Email Address (Login ID):</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ao.office@sms.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Password:</label>
                <input
                  type="password"
                  required
                  placeholder="Enter strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Login Account</h3>
                <p className="text-xs text-brand-textMuted">This will permanently remove access</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete the account for <strong>{deleteConfirmUser.name}</strong> (
              {deleteConfirmUser.email})?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PrincipalStationaryPage;
