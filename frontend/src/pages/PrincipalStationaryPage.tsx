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
      console.error('Failed to load stationary accounts:', err);
      toast.error('Failed to load accounts & requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndRequests();
  }, [dashboardTick]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/stationary/accounts', {
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        roleName: newRole,
      });

      toast.success(
        `Account created for ${newName} (${newRole === 'ROLE_AO' ? 'AO' : 'Stationary Store'})!`
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
      toast.success(`Account ${deleteConfirmUser.name} deleted successfully.`);
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
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Top Header */}
      <div className="admin-card p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Principal Administrative Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Stationary Logins &amp; Multi-Tier Workflow
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage Administrative Officer (AO) and Stationary Store login credentials and monitor college-wide indents.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create AO / Stationary Login</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Login Accounts ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>College-Wide Requests ({requests.length})</span>
        </button>
      </div>

      {/* Tab 1: Accounts List */}
      {activeTab === 'accounts' && (
        <div className="space-y-4 animate-fade-in">
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-xs">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="admin-card text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-800">No AO or Stationary accounts created yet.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
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
                    className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 flex flex-col justify-between gap-4 hover:border-amber-300 transition-all shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isAO
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isAO ? 'Administrative Officer (AO)' : 'Stationary Store Incharge'}
                        </span>

                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800">{acc.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{acc.email}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Created {new Date(acc.createdAt).toLocaleDateString()}
                      </span>

                      <button
                        onClick={() => setDeleteConfirmUser(acc)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 transition-all cursor-pointer flex items-center gap-1.5"
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
        <div className="admin-card bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Department / Requester</th>
                  <th className="py-3 px-4">Items / Total Units</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-800">{req.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{req.department?.name || 'Department'}</div>
                      <div className="text-[11px] text-slate-500">{req.requester?.name}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-amber-700">
                      {req.totalItems} items ({req.totalQuantity} units)
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{req.purpose || '---'}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-700">{req.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Create New Login Credentials</h3>
                <p className="text-xs text-slate-500">Create an AO or Stationary Incharge login</p>
              </div>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Role for Login:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="ROLE_AO">Administrative Officer (AO) - Approval Authority</option>
                  <option value="ROLE_STATIONARY">Stationary Incharge - Store &amp; Dispatch Authority</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Administrative Officer Srikanth"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address (Login ID):</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ao.office@sms.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password:</label>
                <input
                  type="password"
                  required
                  placeholder="Enter strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete Login Account</h3>
                <p className="text-xs text-slate-500">This will permanently remove access</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete the account for <strong className="text-slate-800">{deleteConfirmUser.name}</strong> (
              {deleteConfirmUser.email})?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
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
