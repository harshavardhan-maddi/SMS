import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Modal } from '../components/ReusableComponents';
import { Users, Plus, Key, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Role {
  name: string;
}

interface Department {
  id: number;
  code: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department?: Department;
  lab?: { id: number; labNumber: string; name: string };
  active: boolean;
  createdAt: string;
}

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('ROLE_HOD');
  const [departmentId, setDepartmentId] = useState('');
  const [labs, setLabs] = useState<any[]>([]);
  const [labId, setLabId] = useState('');

  // Password Form states
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    if (!currentUser || (currentUser.role !== 'ROLE_PRINCIPAL' && currentUser.role !== 'ROLE_DEAN')) {
      setLoading(false);
      return;
    }
    try {
      const usersRes = await api.get('/users');
      setUsers(usersRes.data);

      const deptsRes = await api.get('/departments');
      setDepartments(deptsRes.data);
    } catch (err) {
      toast.error('Failed to load user directories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dashboardTick]);

  useEffect(() => {
    const fetchLabsForDept = async () => {
      if (!departmentId) {
        setLabs([]);
        setLabId('');
        return;
      }
      try {
        const res = await api.get(`/departments/${departmentId}/labs`);
        setLabs(res.data);
      } catch (err) {
        console.error('Failed to fetch labs for department', err);
      }
    };
    fetchLabsForDept();
  }, [departmentId]);

  if (!currentUser || (currentUser.role !== 'ROLE_PRINCIPAL' && currentUser.role !== 'ROLE_DEAN')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md w-full p-8 bg-white border border-slate-200/60 rounded-3xl shadow-premium text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Access Denied</h3>
          <p className="text-xs text-brand-textMuted mb-6 leading-relaxed">
            Only authorized administrators (Principal & Dean) are allowed to view and manage system users.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2.5 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all cursor-pointer"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRoleName(currentUser?.role === 'ROLE_DEAN' ? 'ROLE_TECHNICIAN' : 'ROLE_HOD');
    setDepartmentId('');
    setLabs([]);
    setLabId('');
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    if (!window.confirm(`Are you sure you want to register a new user: ${name}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/users', {
        name,
        email,
        password,
        roleName,
        departmentId: ['ROLE_HOD', 'ROLE_PROGRAMMER'].includes(roleName) && departmentId ? parseInt(departmentId) : null,
        labId: roleName === 'ROLE_PROGRAMMER' && labId ? parseInt(labId) : null
      });
      toast.success('User account registered successfully.');
      setCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to register user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setPasswordModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    if (!window.confirm(`Are you sure you want to reset the password for ${selectedUser.name}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/users/${selectedUser.id}/reset-password`, { newPassword });
      toast.success(`Password successfully updated for ${selectedUser.name}.`);
      setPasswordModalOpen(false);
    } catch (err) {
      toast.error('Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const targetState = !user.active;
      await api.put(`/users/${user.id}/active?active=${targetState}`);
      toast.success(`User state toggled successfully.`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update active state.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user? This will remove allocations and is irreversible.')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted successfully.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete user.');
    }
  };

  const getDisplayRoleName = (role: string) => {
    if (role === 'ROLE_PRINCIPAL') return 'Principal';
    if (role === 'ROLE_DEAN') return 'Computer Dean';
    if (role === 'ROLE_HOD') return 'HOD';
    if (role === 'ROLE_TECHNICIAN') return 'Hardware Technician';
    if (role === 'ROLE_PROGRAMMER') return 'Programmer';
    return role;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-brand-textMuted font-bold">Loading user directories...</div>
    );
  }

  const showActionsHeader = currentUser?.role === 'ROLE_PRINCIPAL' || currentUser?.role === 'ROLE_DEAN';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">User Management</h2>
          <p className="text-xs text-brand-textMuted font-medium">Create and manage access accounts for Department HODs, Computer Dean, and Hardware Technicians</p>
        </div>

        {(currentUser?.role === 'ROLE_PRINCIPAL' || currentUser?.role === 'ROLE_DEAN') && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        )}
      </div>

      {/* User Directory Table */}
      <div className="admin-card bg-white p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created On</th>
                {showActionsHeader && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map((u) => {
                const canManageUser = currentUser?.role === 'ROLE_PRINCIPAL' || (currentUser?.role === 'ROLE_DEAN' && u.role.name === 'ROLE_TECHNICIAN');
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-700">{u.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        u.role.name === 'ROLE_PRINCIPAL' ? 'bg-purple-100 text-purple-700' : u.role.name === 'ROLE_DEAN' ? 'bg-blue-100 text-blue-700' : u.role.name === 'ROLE_TECHNICIAN' ? 'bg-amber-100 text-amber-700' : u.role.name === 'ROLE_PROGRAMMER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getDisplayRoleName(u.role.name)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {u.department ? (
                        <div>
                          <span>{u.department.code}</span>
                          {u.lab && <span className="text-[10px] text-slate-400 font-normal block">Lab: {u.lab.labNumber}</span>}
                        </div>
                      ) : <span className="text-slate-400 font-normal italic">-</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    
                    {showActionsHeader && (
                      <td className="py-3.5 px-4 text-right">
                        {canManageUser ? (
                          <div className="flex items-center justify-end gap-1">
                            
                            {/* Toggle active state */}
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={u.active ? 'Deactivate user' : 'Activate user'}
                              disabled={u.id === currentUser?.userId}
                            >
                              {u.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>

                            {/* Reset password */}
                            <button
                              onClick={() => handleOpenResetPassword(u)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            {/* Delete user */}
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
                              disabled={u.id === currentUser?.userId}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal italic">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create User */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Access User">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-left">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. tech@sms.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Password</label>
            <input
              type="password"
              required
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">System Role</label>
            <select
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
            >
              {currentUser?.role === 'ROLE_PRINCIPAL' ? (
                <>
                  <option value="ROLE_HOD">HOD (Department Head)</option>
                  <option value="ROLE_DEAN">Computer Dean</option>
                  <option value="ROLE_TECHNICIAN">Hardware Technician</option>
                  <option value="ROLE_PROGRAMMER">Programmer</option>
                </>
              ) : (
                <option value="ROLE_TECHNICIAN">Hardware Technician</option>
              )}
            </select>
          </div>

          {['ROLE_HOD', 'ROLE_PROGRAMMER'].includes(roleName) && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Department</label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {roleName === 'ROLE_PROGRAMMER' && departmentId && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Assigned Lab Room</label>
              <select
                required
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
              >
                <option value="">Select Lab Room</option>
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id} disabled={Boolean(lab.programmerId)}>
                    Lab {lab.labNumber} ({lab.name}){lab.programmerName ? ` - Assigned to ${lab.programmerName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Registering User...' : 'Register User Account'}</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 2: Reset Password */}
      <Modal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title={`Reset Password: ${selectedUser?.name}`}>
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">New Password</label>
            <input
              type="password"
              required
              placeholder="Enter new strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4 disabled:opacity-50"
          >
            <Key className="w-4 h-4" />
            <span>{isSubmitting ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default UserManagement;
