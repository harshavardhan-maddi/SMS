import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Modal } from '../components/ReusableComponents';
import { Users, Plus, Key, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  lab?: { id: number; labNumber: string; name: string };
}

export const ProgrammersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [programmers, setProgrammers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [labs, setLabs] = useState<any[]>([]);
  const [labId, setLabId] = useState('');

  // Password Form states
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProgrammers = async () => {
    if (!currentUser || currentUser.role !== 'ROLE_HOD') {
      setLoading(false);
      return;
    }
    try {
      const deptId = currentUser.departmentId || 0;
      const [progRes, labsRes] = await Promise.all([
        api.get(`/users/department/${deptId}/programmers`),
        api.get(`/departments/${deptId}/labs`)
      ]);
      setProgrammers(progRes.data);
      setLabs(labsRes.data);
    } catch (err) {
      toast.error('Failed to load department programmers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammers();
  }, [currentUser, dashboardTick]);

  const handleCreateProgrammer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !labId) {
      toast.error('All fields including Lab assignment are required.');
      return;
    }

    if (!window.confirm('Are you sure you want to register this programmer?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/users', {
        name,
        email,
        password,
        roleName: 'ROLE_PROGRAMMER',
        departmentId: currentUser?.departmentId,
        labId: parseInt(labId)
      });
      toast.success('Programmer created successfully.');
      setCreateModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setLabId('');
      fetchProgrammers();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to create programmer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const targetState = !user.active;
      await api.put(`/users/${user.id}/active?active=${targetState}`);
      toast.success(`User account ${targetState ? 'activated' : 'deactivated'} successfully.`);
      fetchProgrammers();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to change user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    if (!window.confirm(`Are you sure you want to reset the password for ${selectedUser.name}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/users/${selectedUser.id}/reset-password`, { newPassword });
      toast.success(`Password for ${selectedUser.name} reset successfully.`);
      setPasswordModalOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this programmer? This will unassign them from their lab.')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Programmer deleted successfully.');
      fetchProgrammers();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to delete programmer.');
    }
  };

  if (!currentUser || currentUser.role !== 'ROLE_HOD') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full p-8 bg-white border border-slate-200/60 rounded-3xl shadow-premium text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Access Denied</h3>
          <p className="text-xs text-brand-textMuted mb-6 leading-relaxed">
            Only Department HODs are permitted to access this programmer management view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Department Programmers</h1>
          <p className="text-xs text-brand-textMuted mt-1">Manage programmer credentials, assignments, and account statuses.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Register Programmer</span>
        </button>
      </div>

      <div className="admin-card bg-white p-6">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium animate-pulse">Loading directory...</div>
        ) : programmers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium italic text-xs">
            No programmers registered for your department yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Lab</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {programmers.map((prog) => (
                  <tr key={prog.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{prog.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{prog.email}</td>
                    <td className="py-3.5 px-4">
                      {prog.lab ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                          Lab {prog.lab.labNumber} ({prog.lab.name})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(prog)}
                        className={`inline-flex items-center gap-1 transition-colors ${
                          prog.active ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-500'
                        }`}
                      >
                        {prog.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        <span className="font-bold text-[10px] uppercase tracking-wider">
                          {prog.active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(prog);
                            setPasswordModalOpen(true);
                          }}
                          className="p-2 bg-slate-50 hover:bg-brand-purple/10 text-slate-600 hover:text-brand-purple rounded-xl border border-slate-200 transition-all cursor-pointer"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(prog.id)}
                          className="p-2 bg-red-50/50 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-xl border border-red-100 transition-all cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Register Department Programmer">
        <form onSubmit={handleCreateProgrammer} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              placeholder="Enter programmer full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              placeholder="e.g. programmer@sms.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Assign Lab Room (Single assignment)</label>
            <select
              required
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              value={labId}
              onChange={(e) => setLabId(e.target.value)}
            >
              <option value="">Select laboratory</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id} disabled={Boolean(lab.programmerId)}>
                  {lab.labNumber} - {lab.name} {lab.programmerName ? `(Assigned to ${lab.programmerName})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-purple/10 mt-6 disabled:opacity-50"
          >
            {isSubmitting ? 'Registering Programmer...' : 'Create Programmer Account'}
          </button>
        </form>
      </Modal>

      {/* PASSWORD RESET MODAL */}
      <Modal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Reset Programmer Password">
        {selectedUser && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-left">
            <p className="text-xs text-slate-500">
              Resetting credentials for <span className="font-bold text-slate-800">{selectedUser.name}</span> ({selectedUser.email}).
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
              <input
                type="password"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-purple/10 mt-6 disabled:opacity-50"
            >
              {isSubmitting ? 'Resetting Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};
