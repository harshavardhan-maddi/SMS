import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSkeleton, Modal, StatCard } from '../components/ReusableComponents';
import {
  FileText,
  Wrench,
  CheckCircle,
  Trash2,
  Clock,
  Play,
  Check,
  ChevronDown,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ComputerDeanDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [reportStats, setReportStats] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Modals state
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [deadModalOpen, setDeadModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineHistory, setTimelineHistory] = useState<any[]>([]);

  // Action Form States
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [repairDescription, setRepairDescription] = useState('');
  const [expectedDays, setExpectedDays] = useState(3);
  const [requiredParts, setRequiredParts] = useState('');

  const [problemFound, setProblemFound] = useState('');
  const [solution, setSolution] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [remarks, setRemarks] = useState('');

  const [deadReason, setDeadReason] = useState('');
  const [deadDesc, setDeadDesc] = useState('');

  // Dropdown states for each row index
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);

  const fetchDeanData = async () => {
    try {
      // 1. Fetch repairs
      const repairsRes = await api.get('/repairs');
      setRequests(repairsRes.data);

      // 2. Fetch performance stats
      const statsRes = await api.get('/reports/dean');
      setReportStats(statsRes.data);

      // 3. Fetch technicians
      const techsRes = await api.get('/users/technicians');
      const techs = techsRes.data;
      setTechnicians(techs);
      if (techs.length > 0) {
        setSelectedTechId(techs[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load Dean data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeanData();
  }, [dashboardTick]);

  const handleAcceptAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !selectedTechId) return;

    try {
      await api.post(`/repairs/${selectedReq.id}/accept`, {
        technicianId: parseInt(selectedTechId)
      });
      toast.success(`Request accepted and assigned successfully!`);
      setStartModalOpen(false);
      fetchDeanData();
    } catch (err) {
      toast.error('Failed to accept and assign request.');
    }
  };

  const handleStartRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      await api.post(`/repairs/${selectedReq.id}/start`, {
        deanId: user?.userId,
        repairDescription,
        expectedCompletionDays: expectedDays,
        requiredParts
      });
      toast.success(`Repair process started for ${selectedReq.id}`);
      setStartModalOpen(false);
      
      // Clear forms
      setRepairDescription('');
      setRequiredParts('');
    } catch (err) {
      toast.error('Failed to start repair.');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      await api.post(`/repairs/${selectedReq.id}/resolve`, {
        deanId: user?.userId,
        problemFound,
        solution,
        reasonForDelay: delayReason,
        partsReplaced,
        remarks
      });
      toast.success(`Repair request ${selectedReq.id} marked as resolved!`);
      setResolveModalOpen(false);
      fetchDeanData();

      // Clear forms
      setProblemFound('');
      setSolution('');
      setDelayReason('');
      setPartsReplaced('');
      setRemarks('');
    } catch (err) {
      toast.error('Failed to resolve repair.');
    }
  };

  const handleDeadStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      await api.post(`/repairs/${selectedReq.id}/dead-stock`, {
        deanId: user?.userId,
        reason: deadReason,
        description: deadDesc
      });
      toast.success(`Asset marked as Dead Stock.`);
      setDeadModalOpen(false);
      fetchDeanData();

      // Clear forms
      setDeadReason('');
      setDeadDesc('');
    } catch (err) {
      toast.error('Failed to update dead stock.');
    }
  };

  const handleViewTimeline = async (req: any) => {
    try {
      setSelectedReq(req);
      const res = await api.get(`/repairs/${req.id}/history`);
      setTimelineHistory(res.data);
      setTimelineModalOpen(true);
    } catch (err) {
      toast.error('Failed to load request timeline.');
    }
  };

  if (loading || !reportStats) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="grid" />
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  // Dashboard Metrics Counts matching mock image
  const totalCount = requests.length;
  const inProgressCount = requests.filter(r => ['In Progress', 'Accepted', 'Parts Requested'].includes(r.status)).length;
  const resolvedCount = requests.filter(r => r.status === 'Resolved').length;
  const deadCount = requests.filter(r => r.status === 'Dead Stock').length;
  const pendingCount = requests.filter(r => r.status === 'Initiated').length;

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated': return 'bg-amber-100 text-amber-700';
      case 'accepted': return 'bg-purple-100 text-purple-700';
      case 'parts requested': return 'bg-indigo-100 text-indigo-700';
      case 'in progress': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      case 'dead stock': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Statistics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Total Requests"
          value={totalCount}
          subtext="12% from last month"
          trend={{ value: '↑ 12%', isPositive: true }}
          icon={FileText}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtext="8% from last month"
          trend={{ value: '↑ 8%', isPositive: true }}
          icon={Wrench}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          subtext="20% from last month"
          trend={{ value: '↑ 20%', isPositive: true }}
          icon={CheckCircle}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <StatCard
          title="Dead Stock"
          value={deadCount}
          subtext="5% from last month"
          trend={{ value: '↓ 5%', isPositive: false }}
          icon={Trash2}
          iconBgColor="bg-red-50"
          iconTextColor="text-red-600"
        />
        <StatCard
          title="Avg. Repair Time"
          value={`${reportStats.avgRepairTimeDays ?? 0} Days`}
          subtext="10% from last month"
          trend={{ value: '↓ 10%', isPositive: true }}
          icon={Clock}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
        />
      </div>

      {/* 2. Repair Summary Row */}
      <div className="admin-card p-6 bg-white">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Repair Summary (This Month)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Total Requests</span>
            </div>
            <span className="font-bold text-slate-800">{totalCount}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Completed</span>
            </div>
            <span className="font-bold text-slate-800">{resolvedCount}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span>In Progress</span>
            </div>
            <span className="font-bold text-slate-800">{inProgressCount}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>Dead Stock</span>
            </div>
            <span className="font-bold text-slate-800">{deadCount}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>Pending (Initiated)</span>
            </div>
            <span className="font-bold text-slate-800">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Large Repair Requests Table */}
      <div className="admin-card bg-white p-6">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Repair Requests</h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Item Type</th>
                <th className="py-3 px-4">Issue</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4">Initiated On</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-slate-700">{req.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">
                    {req.inventory?.department?.code || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{req.inventory?.type || 'Hardware'}</td>
                  <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]">{req.title}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getStatusBadgeClass(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {req.assignedTo?.name ? (
                      <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[11px] font-bold">
                        {req.assignedTo.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {new Date(req.initiatedDate).toLocaleDateString()} {req.initiatedTime ? req.initiatedTime.substring(0, 5) : ''}
                  </td>
                  <td className="py-3.5 px-4 text-center relative">
                    <div className="inline-flex items-center gap-1">
                      
                      {/* Action buttons depending on state */}
                      {req.status === 'Initiated' && (
                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            if (req.assignedTo?.id) {
                              setSelectedTechId(req.assignedTo.id.toString());
                            } else if (technicians.length > 0) {
                              setSelectedTechId(technicians[0].id.toString());
                            }
                            setStartModalOpen(true);
                          }}
                          className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 rounded-lg border border-blue-200 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Accept & Assign</span>
                        </button>
                      )}

                      {['In Progress', 'Accepted', 'Parts Requested'].includes(req.status) && (
                        <div className="relative">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              // Toggle dropdown
                              setActiveDropdownRow(activeDropdownRow === req.id ? null : req.id);
                            }}
                            className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-600 rounded-lg border border-amber-200 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Continue Repair</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {/* Quick Action dropdown */}
                          {activeDropdownRow === req.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-[#e2e8f0] shadow-premium z-50 overflow-hidden text-left">
                              <button
                                onClick={() => {
                                  setResolveModalOpen(true);
                                  setActiveDropdownRow(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                Resolve Issue
                              </button>
                              <button
                                onClick={() => {
                                  setDeadModalOpen(true);
                                  setActiveDropdownRow(null);
                                }}
                                className="w-full text-left px-3 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                              >
                                Mark Dead Stock
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {(req.status === 'Resolved' || req.status === 'Dead Stock') && (
                        <button
                          onClick={() => handleViewTimeline(req)}
                          className="px-3 py-1 bg-slate-50 hover:bg-brand-purple hover:text-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                        >
                          View Details
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View All Requests Button */}
        <div className="flex justify-center mt-6">
          <button className="px-6 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all">
            View All Requests
          </button>
        </div>
      </div>

      {/* POPUP 1: Accept & Assign Modal */}
      <Modal isOpen={startModalOpen} onClose={() => setStartModalOpen(false)} title={`Accept & Assign Request: ${selectedReq?.id}`}>
        <form onSubmit={handleAcceptAssignSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Assign to Hardware Technician</label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
            >
              {technicians.length === 0 ? (
                <option value="">No technicians available. Register one first.</option>
              ) : (
                technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.email})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={!selectedTechId}
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Play className="w-4 h-4" />
            <span>Accept and Delegate</span>
          </button>
        </form>
      </Modal>

      {/* POPUP 2: Resolve Modal */}
      <Modal isOpen={resolveModalOpen} onClose={() => setResolveModalOpen(false)} title={`Mark Request as Resolved: ${selectedReq?.id}`}>
        <form onSubmit={handleResolveSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Problem Found</label>
              <input
                type="text"
                required
                placeholder="e.g. Defective RAM connector"
                value={problemFound}
                onChange={(e) => setProblemFound(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Solution Applied</label>
              <input
                type="text"
                required
                placeholder="e.g. Replaced RAM sticks"
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Parts Replaced</label>
              <input
                type="text"
                required
                placeholder="e.g. 8GB DDR4 RAM stick"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Reason for Delay (optional)</label>
              <input
                type="text"
                placeholder="e.g. Out of stock, part imported"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Closing Remarks</label>
            <input
              type="text"
              placeholder="e.g. System tested and benchmarked, working stable."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Check className="w-4 h-4" />
            <span>Mark Resolved & Close Work Order</span>
          </button>
        </form>
      </Modal>

      {/* POPUP 3: Mark Dead Stock Modal */}
      <Modal isOpen={deadModalOpen} onClose={() => setDeadModalOpen(false)} title={`Decommission Asset to Dead Stock - Request: ${selectedReq?.id}`}>
        <form onSubmit={handleDeadStockSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Primary Reason for Decommissioning</label>
            <input
              type="text"
              required
              placeholder="e.g. Burned motherboard, unrepairable display panel"
              value={deadReason}
              onChange={(e) => setDeadReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Justification & Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide a detailed explanation of why the asset is beyond economic repair."
              value={deadDesc}
              onChange={(e) => setDeadDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[10px] text-red-600 font-semibold flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>WARNING: This action is irreversible. The asset status will change to Dead Stock, and overall inventories will update immediately.</span>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Trash2 className="w-4 h-4" />
            <span>Mark Dead Stock & Archive</span>
          </button>
        </form>
      </Modal>

      {/* TIMELINE MODAL */}
      <Modal isOpen={timelineModalOpen} onClose={() => setTimelineModalOpen(false)} title={`Request Status Timeline: ${selectedReq?.id}`}>
        {selectedReq && (
          <div className="space-y-6 text-left">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-2 text-xs">
              <div><span className="font-bold text-slate-500">Asset:</span> <span className="font-semibold text-slate-700">{selectedReq.inventory.id} ({selectedReq.inventory.type})</span></div>
              <div><span className="font-bold text-slate-500">Fault:</span> <span className="font-semibold text-slate-700">{selectedReq.title}</span></div>
              <div><span className="font-bold text-slate-500">Current Status:</span> <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ml-1.5 ${getStatusBadgeClass(selectedReq.status)}`}>{selectedReq.status}</span></div>
            </div>

            <div className="relative pl-6 border-l border-slate-200 space-y-6 ml-3">
              {timelineHistory.map((stage) => (
                <div key={stage.id} className="relative">
                  <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-brand-purple">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-purple"></span>
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{stage.status}</span>
                      <span className="text-[10px] text-brand-textMuted font-semibold">
                        {stage.statusDate} {stage.statusTime.substring(0, 5)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">{stage.description}</p>
                    {stage.updatedBy && (
                      <div className="text-[10px] text-slate-400 font-medium">Updated by: {stage.updatedBy.name}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default ComputerDeanDashboard;
