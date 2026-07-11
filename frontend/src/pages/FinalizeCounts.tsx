import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { ClipboardCheck, ShieldCheck, Laptop, Building2, Wifi } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface HardwareCounts {
  total: number;
  working: number;
  not_working: number;
}

interface Lab {
  id: number;
  name: string;
  labNumber: string;
}

export const FinalizeCounts: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  
  const [cpuCounts, setCpuCounts] = useState<HardwareCounts>({ total: 0, working: 0, not_working: 0 });
  const [monitorCounts, setMonitorCounts] = useState<HardwareCounts>({ total: 0, working: 0, not_working: 0 });
  const [keyboardCounts, setKeyboardCounts] = useState<HardwareCounts>({ total: 0, working: 0, not_working: 0 });
  const [mouseCounts, setMouseCounts] = useState<HardwareCounts>({ total: 0, working: 0, not_working: 0 });
  const [hotspotCounts, setHotspotCounts] = useState<HardwareCounts>({ total: 0, working: 0, not_working: 0 });

  const fetchLabs = async () => {
    const deptId = user?.departmentId || 0;
    try {
      const res = await api.get(`/departments/${deptId}/labs`);
      setLabs(res.data);
      if (res.data.length > 0 && !selectedLabId) {
        setSelectedLabId(res.data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load labs', err);
    }
  };

  const fetchCounts = async () => {
    const deptId = user?.departmentId || 0;
    try {
      const labParam = selectedLabId ? `?labId=${selectedLabId}` : '';
      const res = await api.get(`/inventory/finalized-counts/department/${deptId}${labParam}`);
      const data = res.data;

      setCpuCounts(data.CPU || { total: 0, working: 0, not_working: 0 });
      setMonitorCounts(data.Monitor || { total: 0, working: 0, not_working: 0 });
      setKeyboardCounts(data.Keyboard || { total: 0, working: 0, not_working: 0 });
      setMouseCounts(data.Mouse || { total: 0, working: 0, not_working: 0 });
      setHotspotCounts(data.Hotspot || { total: 0, working: 0, not_working: 0 });
    } catch (err) {
      toast.error('Failed to load hardware counts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [user, selectedLabId, dashboardTick]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabId) {
      toast.error('Please select a Lab first to finalize counts.');
      return;
    }

    try {
      const payload = {
        departmentId: user?.departmentId || 0,
        labId: parseInt(selectedLabId),
        counts: [
          { type: 'CPU', ...cpuCounts },
          { type: 'Monitor', ...monitorCounts },
          { type: 'Keyboard', ...keyboardCounts },
          { type: 'Mouse', ...mouseCounts },
          { type: 'Hotspot', ...hotspotCounts }
        ]
      };

      await api.post('/inventory/finalize-counts', payload);
      toast.success('Hardware counts finalized successfully for selected lab!');
      fetchCounts();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to finalize hardware counts.';
      toast.error(typeof msg === 'string' ? msg : 'Failed to finalize hardware counts.');
    }
  };

  const updateCountField = (
    type: 'CPU' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Hotspot',
    field: 'total' | 'working',
    val: number
  ) => {
    const setter = {
      CPU: [cpuCounts, setCpuCounts],
      Monitor: [monitorCounts, setMonitorCounts],
      Keyboard: [keyboardCounts, setKeyboardCounts],
      Mouse: [mouseCounts, setMouseCounts],
      Hotspot: [hotspotCounts, setHotspotCounts]
    }[type] as [HardwareCounts, React.Dispatch<React.SetStateAction<HardwareCounts>>];

    const [current, setVal] = setter;
    const nextVal = Math.max(0, val);

    let nextTotal = current.total;
    let nextWorking = current.working;

    if (field === 'total') {
      nextTotal = nextVal;
    } else {
      nextWorking = nextVal;
    }

    const nextNotWorking = Math.max(0, nextTotal - nextWorking);

    setVal({
      total: nextTotal,
      working: nextWorking,
      not_working: nextNotWorking
    });
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-brand-textMuted font-bold">Loading counts registry...</div>;
  }

  const isHOD = user?.role === 'ROLE_HOD';

  const renderRow = (type: 'CPU' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Hotspot', counts: HardwareCounts) => (
    <tr key={type} className="hover:bg-slate-50/50">
      <td className="py-4 px-4 font-bold text-slate-700 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-slate-50 text-brand-purple">
          {type === 'Hotspot' ? <Wifi className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
        </div>
        <span>{type}</span>
      </td>
      <td className="py-4 px-4">
        <input
          type="number"
          min={0}
          value={counts.total}
          onChange={(e) => updateCountField(type, 'total', parseInt(e.target.value) || 0)}
          disabled={!isHOD}
          className="w-28 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 disabled:opacity-75 disabled:bg-slate-50"
        />
      </td>
      <td className="py-4 px-4">
        <input
          type="number"
          min={0}
          max={counts.total}
          value={counts.working}
          onChange={(e) => updateCountField(type, 'working', parseInt(e.target.value) || 0)}
          disabled={!isHOD}
          className="w-28 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 disabled:opacity-75 disabled:bg-slate-50"
        />
      </td>
      <td className="py-4 px-4">
        <div className="w-24 py-2 px-3 bg-red-50 text-red-600 rounded-xl font-black text-xs text-center border border-red-100">
          {counts.not_working}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-left">
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Finalize Count</h2>
        <p className="text-xs text-brand-textMuted font-medium">Select a department lab and finalize hardware system counts (Monitor, CPU, Mouse, Keyboard, Hotspots)</p>
      </div>

      {/* Lab Selection Header */}
      <div className="admin-card bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-brand-purple rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Select Department Lab</h3>
            <p className="text-[11px] text-brand-textMuted">Finalize counts individually by lab allocation</p>
          </div>
        </div>

        <select
          value={selectedLabId}
          onChange={(e) => setSelectedLabId(e.target.value)}
          className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white cursor-pointer"
        >
          {labs.length === 0 && <option value="">-- No Labs Created --</option>}
          {labs.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.labNumber} - {lab.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="admin-card bg-white p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Hardware Type</th>
                  <th className="py-3 px-4">Total Count</th>
                  <th className="py-3 px-4">Working Count</th>
                  <th className="py-3 px-4">Not Working</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {renderRow('CPU', cpuCounts)}
                {renderRow('Monitor', monitorCounts)}
                {renderRow('Keyboard', keyboardCounts)}
                {renderRow('Mouse', mouseCounts)}
                {renderRow('Hotspot', hotspotCounts)}
              </tbody>
            </table>
          </div>
        </div>

        {isHOD ? (
          <button
            type="submit"
            className="px-6 py-3 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Finalize & Save counts</span>
          </button>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold max-w-lg">
            ⚠️ You are logged in as a Programmer. Only the department Head of Department (HOD) is authorized to finalize and modify laboratory hardware counts.
          </div>
        )}
      </form>
    </div>
  );
};
export default FinalizeCounts;
