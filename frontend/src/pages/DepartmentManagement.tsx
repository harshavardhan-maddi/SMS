import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Modal } from '../components/ReusableComponents';
import {
  Building2,
  Plus,
  UserCheck,
  Trash2,
  Edit,
  ChevronRight,
  Cpu,
  Monitor,
  Keyboard,
  Mouse,
  Wifi,
  Laptop,
  Layers,
  Activity,
  X,
  Server,
  Sparkles,
  Wrench,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
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

  // Modals state for Edit/Add
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hodId, setHodId] = useState<string>('');

  // Department Deep-Dive & Lab Hardware Explorer State
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptCounts, setDeptCounts] = useState<Record<string, Record<string, number>> | null>(null);
  const [deptLabs, setDeptLabs] = useState<any[]>([]);
  const [loadingDeptDetail, setLoadingDeptDetail] = useState(false);

  // Specific Lab Selection & System Counts State
  const [selectedLab, setSelectedLab] = useState<any | null>(null);
  const [labCounts, setLabCounts] = useState<Record<string, Record<string, number>> | null>(null);
  const [loadingLabDetail, setLoadingLabDetail] = useState(false);

  const fetchData = async () => {
    try {
      const [deptsRes, usersRes] = await Promise.all([
        api.get('/departments'),
        api.get('/users')
      ]);
      setDepartments(deptsRes.data);
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

  const handleOpenAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDept(null);
    setName('');
    setCode('');
    setHodId('');
    setModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setHodId(dept.hod ? dept.hod.id.toString() : '');
    setModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted successfully.');
      if (selectedDept?.id === id) {
        setSelectedDept(null);
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to delete department.');
    }
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

  // High-Speed Parallel Deep-Dive on Department Click
  const handleOpenDepartmentDetail = async (dept: Department) => {
    setSelectedDept(dept);
    setSelectedLab(null);
    setLabCounts(null);
    setLoadingDeptDetail(true);
    try {
      const [countsRes, labsRes] = await Promise.all([
        api.get(`/inventory/counts/department/${dept.id}`),
        api.get(`/departments/${dept.id}/labs`)
      ]);
      setDeptCounts(countsRes.data);
      setDeptLabs(labsRes.data);
    } catch (err) {
      console.error('Error loading department metrics', err);
      toast.error('Failed to load department hardware metrics.');
    } finally {
      setLoadingDeptDetail(false);
    }
  };

  // High-Speed Parallel Fetch on Specific Lab Click
  const handleSelectLab = async (lab: any) => {
    setSelectedLab(lab);
    setLoadingLabDetail(true);
    try {
      const countsRes = await api.get(`/inventory/counts/lab/${lab.id}`);
      setLabCounts(countsRes.data);
    } catch (err) {
      console.error('Error loading lab metrics', err);
      toast.error('Failed to load lab system counts.');
    } finally {
      setLoadingLabDetail(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CPU': return <Cpu className="w-4 h-4 text-indigo-600" />;
      case 'MONITOR': return <Monitor className="w-4 h-4 text-blue-600" />;
      case 'KEYBOARD': return <Keyboard className="w-4 h-4 text-emerald-600" />;
      case 'MOUSE': return <Mouse className="w-4 h-4 text-purple-600" />;
      case 'HOTSPOT': return <Wifi className="w-4 h-4 text-amber-600" />;
      default: return <Laptop className="w-4 h-4 text-slate-600" />;
    }
  };

  const availableHods = eligibleHods.filter((h: any) => {
    if (!h.department) return true;
    if (editingDept && editingDept.hod && h.id === editingDept.hod.id) return true;
    return false;
  });

  const isPrincipal = user?.role === 'ROLE_PRINCIPAL' || user?.role === 'Principal' || user?.role?.toUpperCase()?.includes('PRINCIPAL');

  if (loading) return <div className="p-12 text-center text-xs text-brand-textMuted font-bold">Loading department registry...</div>;

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Department Management & System Explorer</h2>
          <p className="text-xs text-brand-textMuted font-medium">
            Select any department to inspect assigned labs and hardware system counts by device
          </p>
        </div>
        
        {isPrincipal && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Departments Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => {
          const isSelected = selectedDept?.id === dept.id;
          return (
            <div
              key={dept.id}
              onClick={() => handleOpenDepartmentDetail(dept)}
              className={`admin-card p-6 bg-white flex flex-col justify-between cursor-pointer transition-all duration-200 border-2 ${
                isSelected ? 'border-brand-purple ring-4 ring-brand-purple/10 shadow-lg' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-brand-purple text-white' : 'bg-purple-50 text-brand-purple'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight">{dept.name}</h3>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-bold tracking-wider">{dept.code}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-brand-purple' : ''}`} />
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

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                <span className="text-[10px] font-bold text-brand-purple flex items-center gap-1">
                  Click to inspect labs & device counts <ChevronRight className="w-3 h-3" />
                </span>

                {isPrincipal && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenEdit(e, dept)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit Department"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, dept.id)}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DEPARTMENT DEEP-DIVE & LAB SYSTEM COUNTS PANEL */}
      {selectedDept && (
        <div className="admin-card bg-white p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 border-2 border-brand-purple/20 shadow-xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-brand-purple rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-800">{selectedDept.name} ({selectedDept.code})</h3>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-brand-purple uppercase">
                    HOD: {selectedDept.hod ? selectedDept.hod.name : 'Unassigned'}
                  </span>
                </div>
                <p className="text-xs text-brand-textMuted font-medium mt-0.5">
                  Assigned Labs & Hardware System Counts by Device Type
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedDept(null)}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loadingDeptDetail ? (
            <div className="p-12 text-center text-xs text-brand-textMuted font-bold animate-pulse">
              Loading department hardware system metrics & lab configuration...
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Department Device System Counts */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-brand-purple" />
                  <span>Department Systems Count by Device ({selectedDept.code})</span>
                </h4>

                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3 px-4">Device Type</th>
                        <th className="py-3 px-4 text-center">Total Systems</th>
                        <th className="py-3 px-4 text-center">Working</th>
                        <th className="py-3 px-4 text-center">Repairing</th>
                        <th className="py-3 px-4 text-center">Dead Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                      {['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot'].map((device) => {
                        const devData = deptCounts?.[device] || { Total: 0, Working: 0, Repairing: 0, Dead: 0 };
                        return (
                          <tr key={device} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 flex items-center gap-2.5 font-bold text-slate-700">
                              <div className="p-1.5 bg-slate-100 rounded-lg">
                                {getDeviceIcon(device)}
                              </div>
                              <span>{device}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-black text-blue-600">{devData.Total}</td>
                            <td className="py-3 px-4 text-center text-emerald-600 font-bold">{devData.Working}</td>
                            <td className="py-3 px-4 text-center text-amber-600 font-bold">{devData.Repairing}</td>
                            <td className="py-3 px-4 text-center text-red-600 font-bold">{devData.Dead}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Assigned Labs List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-purple" />
                  <span>Labs Configured by HOD ({deptLabs.length})</span>
                </h4>

                {deptLabs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-brand-textMuted font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No labs configured for this department yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {deptLabs.map((lab) => {
                      const isLabSelected = selectedLab?.id === lab.id;
                      return (
                        <div
                          key={lab.id}
                          onClick={() => handleSelectLab(lab)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isLabSelected
                              ? 'bg-purple-50/50 border-brand-purple shadow-md'
                              : 'bg-white border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isLabSelected ? 'bg-brand-purple text-white' : 'bg-purple-50 text-brand-purple'}`}>
                              <Laptop className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-800">{lab.name}</h5>
                              <span className="text-[10px] text-slate-500 font-semibold">{lab.labNumber}</span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isLabSelected ? 'rotate-90 text-brand-purple' : 'text-slate-300'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Specific Selected Lab System Counts Breakdown */}
              {selectedLab && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-purple-100 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-brand-purple text-white rounded-xl">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-800">
                          {selectedLab.name} ({selectedLab.labNumber}) Systems Breakdown
                        </h5>
                        <p className="text-[10px] text-brand-textMuted font-medium">System device counts assigned to this specific lab</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLab(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Close Lab View
                    </button>
                  </div>

                  {loadingLabDetail ? (
                    <div className="p-6 text-center text-xs text-brand-textMuted font-bold animate-pulse">
                      Loading hardware counts for {selectedLab.name}...
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-4">Device Type</th>
                            <th className="py-2.5 px-4 text-center">Total</th>
                            <th className="py-2.5 px-4 text-center">Working</th>
                            <th className="py-2.5 px-4 text-center">Repairing</th>
                            <th className="py-2.5 px-4 text-center">Dead Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                          {['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot'].map((device) => {
                            const devData = labCounts?.[device] || { Total: 0, Working: 0, Repairing: 0, Dead: 0 };
                            return (
                              <tr key={device} className="hover:bg-slate-50">
                                <td className="py-2.5 px-4 flex items-center gap-2 font-bold text-slate-700">
                                  {getDeviceIcon(device)}
                                  <span>{device}</span>
                                </td>
                                <td className="py-2.5 px-4 text-center font-black text-blue-600">{devData.Total}</td>
                                <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">{devData.Working}</td>
                                <td className="py-2.5 px-4 text-center text-amber-600 font-bold">{devData.Repairing}</td>
                                <td className="py-2.5 px-4 text-center text-red-600 font-bold">{devData.Dead}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
