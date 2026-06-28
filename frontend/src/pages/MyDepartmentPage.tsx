import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Laptop, AlertTriangle, CheckCircle, ArrowLeft, Wrench, Wifi, Monitor, Cpu, Keyboard, Mouse, HardDrive, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Lab {
  id: number;
  name: string;
  labNumber: string;
}

interface InventoryItem {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  workstationNumber: number;
  department: { id: number; name: string; code: string } | null;
  lab: { id: number; name: string; labNumber: string } | null;
}

interface FinalizedCountItem {
  total: number;
  working: number;
  not_working: number;
}

export const MyDepartmentPage: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [finalizedCounts, setFinalizedCounts] = useState<Record<string, FinalizedCountItem>>({});

  const fetchLabsAndInventory = async () => {
    if (!user || !user.departmentId) return;
    try {
      const labsRes = await api.get(`/departments/${user.departmentId}/labs`);
      setLabs(labsRes.data);

      const invRes = await api.get(`/inventory?departmentId=${user.departmentId}`);
      setInventory(invRes.data);
    } catch (err) {
      toast.error('Failed to load department hardware counts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLabFinalizedCounts = async (labId: number) => {
    if (!user || !user.departmentId) return;
    try {
      const res = await api.get(`/inventory/finalized-counts/department/${user.departmentId}?labId=${labId}`);
      setFinalizedCounts(res.data || {});
    } catch (err) {
      console.error('Failed to fetch lab finalized counts', err);
    }
  };

  useEffect(() => {
    fetchLabsAndInventory();
  }, [user, dashboardTick]);

  useEffect(() => {
    if (selectedLab) {
      fetchLabFinalizedCounts(selectedLab.id);
    }
  }, [selectedLab, dashboardTick]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-brand-textMuted font-bold">Loading department hardware device counts...</div>;
  }

  const labItems = selectedLab
    ? inventory.filter(item => item.lab?.id === selectedLab.id)
    : [];

  const deviceTypes = [
    { type: 'CPU', label: 'Central Processing Units', icon: Cpu, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
    { type: 'Monitor', label: 'Monitors & Displays', icon: Monitor, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { type: 'Keyboard', label: 'Keyboards', icon: Keyboard, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { type: 'Mouse', label: 'Mice & Pointers', icon: Mouse, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    { type: 'Hotspot', label: 'Wi-Fi Hotspots & Routers', icon: Wifi, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedLab && (
              <button
                onClick={() => setSelectedLab(null)}
                className="p-1.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-all cursor-pointer mr-1"
                title="Back to Labs List"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {selectedLab ? `${selectedLab.name} (${selectedLab.labNumber}) - Hardware Device Counts` : 'Department Labs Overview'}
            </h2>
          </div>
          <p className="text-xs text-brand-textMuted font-medium mt-0.5">
            {selectedLab
              ? `Displaying verified counts and operational specifications for all hardware devices in ${selectedLab.name}`
              : 'Select a laboratory to view device hardware breakdowns and device status counts'}
          </p>
        </div>

        {selectedLab && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/finalize-counts')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-brand-purple" />
              <span>Finalize Counts</span>
            </button>
            <button
              onClick={() => navigate('/report-issue')}
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Issue</span>
            </button>
          </div>
        )}
      </div>

      {/* STAGE 1: LAB SELECTION LIST */}
      {!selectedLab && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {labs.length === 0 ? (
            <div className="col-span-full p-12 text-center text-xs text-brand-textMuted font-medium border border-dashed border-slate-200 rounded-2xl bg-white">
              No labs found for your department. Create labs in the Department Labs module.
            </div>
          ) : (
            labs.map(lab => {
              const items = inventory.filter(i => i.lab?.id === lab.id);
              const workingCount = items.filter(i => i.status === 'Working' || i.status === 'New Stock').length;
              const faultyCount = items.filter(i => i.status === 'Repairing' || i.status === 'Dead Stock').length;

              return (
                <div
                  key={lab.id}
                  onClick={() => setSelectedLab(lab)}
                  className="admin-card p-6 bg-white hover:border-brand-purple transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-50 text-brand-purple group-hover:bg-brand-purple group-hover:text-white rounded-xl transition-all">
                          <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 group-hover:text-brand-purple transition-colors">{lab.name}</h3>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-mono font-bold text-slate-500 tracking-wider">{lab.labNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100/80">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block">Working Devices</span>
                        <span className="text-base font-black text-emerald-700">{workingCount}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-red-50/60 border border-red-100/80">
                        <span className="text-[10px] font-bold text-red-600 uppercase block">Faulty / Repair</span>
                        <span className="text-base font-black text-red-700">{faultyCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-brand-purple mt-5 pt-3 border-t border-slate-100">
                    <span>View Device Breakdown</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* STAGE 2: LAB DEVICE COUNTS & SPECIFICATIONS BREAKDOWN */}
      {selectedLab && (
        <div className="space-y-6">
          {/* Hardware Device Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {deviceTypes.map(dev => {
              const typeItems = labItems.filter(i => i.type === dev.type);
              const fin = finalizedCounts[dev.type];
              
              const totalCount = fin ? fin.total : typeItems.length;
              const workingCount = fin ? fin.working : typeItems.filter(i => i.status === 'Working' || i.status === 'New Stock').length;
              const faultyCount = fin ? fin.not_working : typeItems.filter(i => i.status === 'Repairing' || i.status === 'Dead Stock').length;

              const IconComp = dev.icon;

              return (
                <div key={dev.type} className={`admin-card p-5 bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${dev.bg} ${dev.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider">
                      Total: {totalCount}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700">{dev.type}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{dev.label}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 text-center">
                      <span className="text-[9px] text-emerald-600 block font-semibold">Working</span>
                      <span>{workingCount}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-red-50 text-red-700 text-center">
                      <span className="text-[9px] text-red-600 block font-semibold">Faulty</span>
                      <span>{faultyCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Inventory Assets List Table */}
          <div className="admin-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Allocated Hardware Assets ({selectedLab.name})</h3>
                <p className="text-[11px] text-slate-400 font-medium">Detailed list of individual hardware items and serial numbers in this lab</p>
              </div>
              <span className="text-xs font-bold bg-purple-50 text-brand-purple px-3 py-1 rounded-xl border border-purple-100">
                {labItems.length} Registered Items
              </span>
            </div>

            {labItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No individual inventory items registered for this lab yet. Finalize counts or add items to populate.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Asset ID</th>
                      <th className="py-3 px-4">Hardware Type</th>
                      <th className="py-3 px-4">Brand & Model</th>
                      <th className="py-3 px-4">Serial Number</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {labItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-brand-purple">{item.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{item.type}</td>
                        <td className="py-3 px-4 text-slate-600">{item.brand} {item.model}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{item.serialNumber}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                            item.status === 'Working' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            item.status === 'New Stock' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {item.status === 'Working' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                            {item.status === 'Repairing' && <AlertTriangle className="w-3 h-3 text-red-600" />}
                            <span>{item.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default MyDepartmentPage;
