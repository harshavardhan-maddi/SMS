import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Modal } from '../components/ReusableComponents';
import { Building2, Plus, UserCheck, Trash2, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: { name: string };
}

interface Department {
  id: number;
  name: string;
  code: string;
  hod?: User;
}

export const DepartmentManagement: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibleHods, setEligibleHods] = useState<User[]>([]);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hodId, setHodId] = useState<string>('');

  const fetchData = async () => {
    try {
      const deptsRes = await api.get('/departments');
      setDepartments(deptsRes.data);

      // Load eligible HOD users to assign
      const usersRes = await api.get('/users');
      const hods = usersRes.data.filter((u: any) => u.role.name === 'ROLE_HOD');
      setEligibleHods(hods);
    } catch (err) {
      toast.error('Failed to load department details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dashboardTick]);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setHodId('');
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setHodId(dept.hod ? dept.hod.id.toString() : '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      const payload: any = {
        name,
        code,
        hod: hodId ? { id: parseInt(hodId) } : null
      };

      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        toast.success('Department updated successfully.');
      } else {
        await api.post('/departments', payload);
        toast.success('Department created successfully.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to save department.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department? This will decouple HOD assignments.')) {
      return;
    }

    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted successfully.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete department.');
    }
  };

  // Filter HODs: hide HODs already assigned to other departments
  const availableHods = eligibleHods.filter((h: any) => {
    // If HOD is unassigned (no department), they are available
    if (!h.department) return true;
    // If editing an existing department, allow the current HOD assigned to this department
    if (editingDept && editingDept.hod && h.id === editingDept.hod.id) return true;
    return false;
  });

  if (loading) return <div className="p-12 text-center text-xs text-brand-textMuted">Loading department registry...</div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Department Management</h2>
          <p className="text-xs text-brand-textMuted font-medium">Add, update, and manage college departments and HOD allocations</p>
        </div>
        
        {user?.role === 'ROLE_PRINCIPAL' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className="admin-card p-6 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-50 text-brand-purple">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">{dept.name}</h3>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-bold tracking-wider">{dept.code}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="font-semibold text-slate-400">Department Head:</span>
                  <span className="font-bold text-slate-800">
                    {dept.hod ? dept.hod.name : <span className="text-red-500 font-normal italic">Unassigned</span>}
                  </span>
                </div>
                {dept.hod && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold text-slate-400">HOD Email:</span>
                    <span className="text-slate-600 truncate max-w-[150px]" title={dept.hod.email}>{dept.hod.email}</span>
                  </div>
                )}
              </div>
            </div>

            {user?.role === 'ROLE_PRINCIPAL' && (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                <button
                  onClick={() => handleOpenEdit(dept)}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Edit Department"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Delete Department"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL: Create/Edit Department */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? 'Edit Department details' : 'Add New College Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Department Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Computer Science Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Department Code</label>
            <input
              type="text"
              required
              placeholder="e.g. CSE"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Assign Head of Department (HOD)</label>
            <select
              value={hodId}
              onChange={(e) => setHodId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
            >
              <option value="">-- Select HOD --</option>
              {availableHods.map((hod) => (
                <option key={hod.id} value={hod.id}>
                  {hod.name} ({hod.email})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <UserCheck className="w-4 h-4" />
            <span>Save Department details</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default DepartmentManagement;
