import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Modal } from '../components/ReusableComponents';
import { Building2, Plus, Trash2, Laptop } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Lab {
  id: number;
  name: string;
  labNumber: string;
  departmentId: number;
  deptName?: string;
  deptCode?: string;
}

export const LabsPage: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [labNumber, setLabNumber] = useState('');
  const [targetDeptId, setTargetDeptId] = useState<string>('');

  const fetchData = async () => {
    try {
      const deptsRes = await api.get('/departments');
      setDepartments(deptsRes.data);

      let url = '/departments/labs/all';
      if (user?.role === 'ROLE_HOD' && user.departmentId) {
        url = `/departments/${user.departmentId}/labs`;
      }
      const labsRes = await api.get(url);
      setLabs(labsRes.data);
    } catch (err) {
      toast.error('Failed to load labs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, dashboardTick]);

  const handleOpenAdd = () => {
    setName('');
    setLabNumber('');
    setTargetDeptId(user?.departmentId?.toString() || (departments[0]?.id?.toString() || ''));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !labNumber || !targetDeptId) {
      toast.error('Please enter lab name, lab number, and select department.');
      return;
    }

    try {
      await api.post(`/departments/${targetDeptId}/labs`, { name, labNumber });
      toast.success('Lab created successfully.');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to create lab.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this lab?')) return;
    try {
      await api.delete(`/departments/labs/${id}`);
      toast.success('Lab deleted.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete lab.');
    }
  };

  if (loading) return <div className="p-12 text-center text-xs text-brand-textMuted font-bold">Loading department labs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Department Labs</h2>
          <p className="text-xs text-brand-textMuted font-medium">Manage and view labs assigned across college departments</p>
        </div>
        
        {user?.role !== 'ROLE_TECHNICIAN' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lab</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {labs.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-brand-textMuted font-medium border border-dashed border-slate-200 rounded-2xl bg-white">
            No labs configured yet. Click "Add Lab" to add one.
          </div>
        ) : (
          labs.map((lab) => (
            <div key={lab.id} className="admin-card p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-50 text-brand-purple">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight">{lab.name}</h3>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-bold tracking-wider">{lab.labNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-semibold text-slate-400">Department:</span>
                    <span className="font-bold text-slate-800">{lab.deptCode ? `${lab.deptCode} - ${lab.deptName}` : 'Department'}</span>
                  </div>
                </div>
              </div>

              {user?.role !== 'ROLE_TECHNICIAN' && (
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                  <button
                    onClick={() => handleDelete(lab.id)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="Delete Lab"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register Department Lab">
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Department</label>
            <select
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
              disabled={user?.role === 'ROLE_HOD'}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Lab Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Programming Lab 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Lab Number / Code</label>
            <input
              type="text"
              required
              placeholder="e.g. LAB-101"
              value={labNumber}
              onChange={(e) => setLabNumber(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <Building2 className="w-4 h-4" />
            <span>Save Lab Details</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default LabsPage;
