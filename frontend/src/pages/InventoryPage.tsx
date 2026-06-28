import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Modal } from '../components/ReusableComponents';
import { HardDrive, Plus, Filter, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Inventory {
  id: string;
  department: { id: number; name: string; code: string };
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyMonths: number;
  status: string;
}

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);

  // Form states
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState('CPU');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [status, setStatus] = useState('Working');
  const [targetDeptId, setTargetDeptId] = useState('');

  const fetchData = async () => {
    try {
      const url = user?.role === 'ROLE_HOD' ? `/inventory?departmentId=${user.departmentId}` : '/inventory';
      const res = await api.get(url);
      setInventory(res.data);

      const deptsRes = await api.get('/departments');
      setDepartments(deptsRes.data);
    } catch (err) {
      toast.error('Failed to load inventory logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, dashboardTick]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setAssetId('');
    setType('CPU');
    setBrand('');
    setModel('');
    setSerialNumber('');
    setPurchaseDate(new Date().toISOString().substring(0, 10));
    setWarrantyMonths(12);
    setStatus(user?.role === 'ROLE_HOD' ? 'New Stock' : 'Working');
    setTargetDeptId(user?.departmentId?.toString() || '');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Inventory) => {
    setEditingItem(item);
    setAssetId(item.id);
    setType(item.type);
    setBrand(item.brand);
    setModel(item.model);
    setSerialNumber(item.serialNumber);
    setPurchaseDate(item.purchaseDate);
    setWarrantyMonths(item.warrantyMonths);
    setStatus(item.status);
    setTargetDeptId(item.department.id.toString());
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !brand || !model || !serialNumber || !targetDeptId) {
      toast.error('Please complete all form fields.');
      return;
    }

    try {
      const payload: any = {
        id: assetId || null,
        type,
        brand,
        model,
        serialNumber,
        purchaseDate,
        warrantyMonths,
        status
      };

      if (editingItem) {
        await api.put(`/inventory/${editingItem.id}?departmentId=${targetDeptId}`, payload);
        toast.success('Asset details updated successfully.');
      } else {
        await api.post(`/inventory?departmentId=${targetDeptId}`, payload);
        toast.success('New hardware asset logged.');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to save inventory item.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete asset ${id}?`)) {
      return;
    }

    try {
      await api.delete(`/inventory/${id}`);
      toast.success('Asset deleted successfully.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete asset.');
    }
  };

  // Filter logic
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === '' || item.status === statusFilter;
    const matchesType = typeFilter === '' || item.type === typeFilter;
    const matchesDept = deptFilter === '' || item.department.id.toString() === deptFilter;

    return matchesSearch && matchesStatus && matchesType && matchesDept;
  });

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'working': return 'bg-emerald-100 text-emerald-700';
      case 'new stock': return 'bg-blue-100 text-blue-700';
      case 'repairing': return 'bg-amber-100 text-amber-700';
      case 'dead stock': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) return <div className="p-12 text-center text-xs text-brand-textMuted">Loading inventories...</div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Inventory overview</h2>
          <p className="text-xs text-brand-textMuted font-medium">
            {user?.role === 'ROLE_HOD' ? `Manage hardware assets allocated to the ${user.departmentCode} Department` : 'Track and audit hardware assets across all departments'}
          </p>
        </div>

        {user?.role !== 'ROLE_PRINCIPAL' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        )}
      </div>

      {/* Search and Filters panel */}
      <div className="admin-card bg-white p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="Search by Asset ID, Serial, Brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 outline-hidden bg-white cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Working">Working</option>
            <option value="New Stock">New Stock</option>
            <option value="Repairing">Repairing</option>
            <option value="Dead Stock">Dead Stock</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 outline-hidden bg-white cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="CPU">CPU</option>
            <option value="Monitor">Monitor</option>
            <option value="Keyboard">Keyboard</option>
            <option value="Mouse">Mouse</option>
          </select>

          {/* Department filter (Principal/Dean only) */}
          {user?.role !== 'ROLE_HOD' && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 outline-hidden bg-white cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Inventory Table Grid */}
      <div className="admin-card bg-white p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Brand / Model</th>
                <th className="py-3 px-4">Serial Number</th>
                <th className="py-3 px-4">Purchase Date</th>
                <th className="py-3 px-4 text-center">Warranty</th>
                <th className="py-3 px-4">Status</th>
                {user?.role !== 'ROLE_PRINCIPAL' && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-slate-700">{item.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">
                    {item.department.code}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{item.type}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {item.brand} {item.model}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{item.serialNumber}</td>
                  <td className="py-3.5 px-4 text-slate-500">{item.purchaseDate}</td>
                  <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">{item.warrantyMonths} M</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getStatusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>

                  {user?.role !== 'ROLE_PRINCIPAL' && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Details"
                          disabled={item.status === 'Repairing'}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {user?.role === 'ROLE_DEAN' && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Log/Edit Asset */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Asset details' : 'Register New Hardware Asset'}>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          
          {!editingItem && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Asset ID (e.g. CPU-045)</label>
              <input
                type="text"
                placeholder="Leave blank for auto-generation"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Hardware Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
              >
                <option value="CPU">CPU</option>
                <option value="Monitor">Monitor</option>
                <option value="Keyboard">Keyboard</option>
                <option value="Mouse">Mouse</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Allocation Department</label>
              <select
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                disabled={user?.role === 'ROLE_HOD'}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
              >
                <option value="">-- Choose Dept --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Brand</label>
              <input
                type="text"
                required
                placeholder="e.g. Dell, Logitech"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Model</label>
              <input
                type="text"
                required
                placeholder="e.g. Optiplex 7090, MX Master"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Serial Number</label>
            <input
              type="text"
              required
              placeholder="e.g. SN-DELL-CPU-837482"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Purchase Date</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Warranty (Months)</label>
              <input
                type="number"
                required
                min={0}
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Inventory Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
            >
              <option value="Working">Working</option>
              <option value="New Stock">New Stock</option>
              <option value="Dead Stock">Dead Stock</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <HardDrive className="w-4 h-4" />
            <span>Save Asset details</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default InventoryPage;
