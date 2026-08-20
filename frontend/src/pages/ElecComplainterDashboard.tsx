import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Zap, Building2, Laptop, AlertTriangle, Send, CheckCircle2, Clock, Wrench, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Lab {
  id: number;
  name: string;
  labNumber: string;
}

const PRESET_ISSUES = [
  { name: 'Ceiling / Wall Fan Fault', icon: '⚡', priority: 'Medium' },
  { name: 'Lighting & Tube Light Replacement', icon: '💡', priority: 'Low' },
  { name: 'Power Socket / Plug Point Outage', icon: '🔌', priority: 'High' },
  { name: 'Air Conditioner / MCB Switch Trip', icon: '❄️', priority: 'High' },
  { name: 'Electrical Wiring & DB Short Circuit', icon: '🔥', priority: 'High' },
  { name: 'UPS & Voltage Regulator Issue', icon: '🔋', priority: 'Medium' },
];

export const ElecComplainterDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  // Data sources
  const [departments, setDepartments] = useState<Department[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [issueName, setIssueName] = useState<string>('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [description, setDescription] = useState<string>('');

  // Fetch departments & complaints on load
  const fetchData = async () => {
    try {
      const [deptsRes, repairsRes] = await Promise.all([
        api.get('/departments'),
        api.get('/repairs')
      ]);
      setDepartments(deptsRes.data);
      if (deptsRes.data.length > 0 && !selectedDeptId) {
        setSelectedDeptId(deptsRes.data[0].id.toString());
      }
      
      // Show ONLY electrical tickets raised by current user
      const filtered = (repairsRes.data || []).filter((item: any) => {
        const isMine = item.requester?.id === user?.userId;
        const typeStr = (item.inventory?.type || '').toLowerCase();
        const titleStr = (item.title || '').toLowerCase();
        const descStr = (item.description || '').toLowerCase();
        const isElec = typeStr.includes('electrical') || titleStr.includes('electrical') || descStr.includes('electrical');
        return isMine && isElec;
      });
      setMyComplaints(filtered);
    } catch (err) {
      toast.error('Failed to load dashboard resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dashboardTick]);

  // Fetch labs whenever selected department changes
  useEffect(() => {
    const fetchLabs = async () => {
      if (!selectedDeptId) {
        setLabs([]);
        setSelectedLabId('');
        return;
      }
      try {
        const res = await api.get(`/departments/${selectedDeptId}/labs`);
        setLabs(res.data);
        setSelectedLabId(''); // Reset lab selection
      } catch (err) {
        console.error('Failed to fetch labs:', err);
      }
    };
    fetchLabs();
  }, [selectedDeptId]);

  const handleSelectPreset = (preset: typeof PRESET_ISSUES[0]) => {
    setIssueName(preset.name);
    setPriority(preset.priority as 'Low' | 'Medium' | 'High');
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDeptId) {
      toast.error('Please select a department');
      return;
    }
    if (!issueName.trim()) {
      toast.error('Please specify an electrical issue title');
      return;
    }

    const parsedQty = typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity;

    setSubmitting(true);
    try {
      const labInfo = labs.find(l => l.id.toString() === selectedLabId);
      const labTag = labInfo ? ` [Lab ${labInfo.labNumber}]` : ' [General Dept Area]';

      await api.post('/repairs/initiate-wizard', {
        requesterId: user?.userId,
        departmentId: parseInt(selectedDeptId),
        labId: selectedLabId ? parseInt(selectedLabId) : 0,
        priority: priority,
        title: `Electrical: ${issueName.trim()}${labTag}`,
        description: description.trim(),
        issues: [
          {
            type: 'Electrical Hardware',
            brand: issueName.trim(),
            count: parsedQty,
            description: description.trim()
          }
        ]
      });

      toast.success('Electrical complaint lodged successfully!');
      
      // Reset form fields for fast re-entry
      setIssueName('');
      setQuantity(1);
      setDescription('');
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data || 'Failed to submit complaint';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-brand-textMuted font-bold flex items-center justify-center gap-2">
        <Zap className="w-4 h-4 text-amber-500 animate-bounce" />
        <span>Loading Electrical Complaint Portal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
          <Zap className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5 fill-current text-amber-200" />
            <span>Elec Complainter Portal</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Raise Electrical Complaints Fast</h2>
          <p className="text-xs text-amber-100 mt-1 font-medium leading-relaxed">
            Report electrical hardware faults across <strong>any department and any lab</strong>. Requests are automatically assigned to campus electricians for rapid dispatch.
          </p>
        </div>
      </div>

      {/* Main Grid: Form + Active Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Complaint Submission Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">New Electrical Complaint</h3>
                  <p className="text-[11px] text-brand-textMuted font-medium">Select location & details</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              {/* Department Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Target Department *</span>
                </label>
                <select
                  required
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lab Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-amber-600" />
                  <span>Target Lab (Optional)</span>
                </label>
                <select
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">-- General Department Area --</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lab {l.labNumber} - {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Quick Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_ISSUES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        issueName === preset.name
                          ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-sm">{preset.icon}</span>
                      <span className="text-[11px] leading-tight line-clamp-1">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Issue Name Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Complaint Title / Issue *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceiling Fan Speed Regulator Broken"
                  value={issueName}
                  onChange={(e) => setIssueName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>

              {/* Quantity & Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Unit Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Location Details & Notes</label>
                <textarea
                  rows={3}
                  placeholder="Specify exact location (e.g. Near Workstation 14, Main DB Board)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>LODGING COMPLAINT...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>LODGE ELECTRICAL COMPLAINT</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Complaints History & Status (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Lodged Electrical Complaints</h3>
                <p className="text-[11px] text-brand-textMuted font-medium">Real-time status tracking across departments</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                {myComplaints.length} Total
              </span>
            </div>

            {myComplaints.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Zap className="w-10 h-10 text-amber-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No Complaints Lodged Yet</h4>
                <p className="text-[11px] text-slate-400">Use the form on the left to submit an electrical complaint.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {myComplaints.map((item) => {
                  const isResolved = item.status === 'Resolved';
                  const isInProgress = item.status === 'In Progress' || item.status === 'Accepted';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-amber-200 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                              {item.id}
                            </span>
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase flex items-center gap-1 shrink-0 ${
                            isResolved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isInProgress
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isResolved ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : isInProgress ? (
                            <Wrench className="w-3 h-3 text-amber-600 animate-spin-slow" />
                          ) : (
                            <Clock className="w-3 h-3 text-blue-600" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </div>

                      {/* Meta Footer */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100/80">
                        <div className="flex items-center gap-3">
                          {item.inventory?.department && (
                            <span>Dept: <strong>{item.inventory.department.code}</strong></span>
                          )}
                          {item.inventory?.lab && (
                            <span>Lab: <strong>{item.inventory.lab.labNumber}</strong></span>
                          )}
                          <span>Priority: <strong className={item.priority === 'High' ? 'text-red-500' : ''}>{item.priority}</strong></span>
                        </div>
                        <div>
                          <span>{item.initiatedDate} {item.initiatedTime}</span>
                        </div>
                      </div>

                      {/* Assigned Electrician note if available */}
                      {item.assignedElectricianName && (
                        <div className="text-[10px] bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-lg flex items-center justify-between">
                          <span>Assigned Electrician:</span>
                          <span>{item.assignedElectricianName}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ElecComplainterDashboard;
