import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSkeleton, Modal, StatCard } from '../components/ReusableComponents';
import {
  Wrench,
  CheckCircle,
  Clock,
  Play,
  Check,
  ChevronDown,
  AlertTriangle,
  FolderOpen,
  ShoppingBag,
  History
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const HardwareTechnicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  // Modals state
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [deadModalOpen, setDeadModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineHistory, setTimelineHistory] = useState<any[]>([]);

  // Action Form States
  const [requiredParts, setRequiredParts] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(1);
  const [problemFound, setProblemFound] = useState('');
  const [solution, setSolution] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [remarks, setRemarks] = useState('');
  const [deadReason, setDeadReason] = useState('');
  const [deadDesc, setDeadDesc] = useState('');

  // Dropdown states for each row index
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);

  const fetchTechData = async () => {
    try {
      const repairsRes = await api.get('/repairs');
      setRequests(repairsRes.data);
    } catch (err) {
      console.error('Failed to load technician repairs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechData();
  }, [dashboardTick]);

  const myRequests = requests.filter(r => r.assignedTo?.id === user?.userId);

  const handleStartRepair = async (req: any) => {
    try {
      await api.post(`/repairs/${req.id}/start-technician`, {});
      toast.success(`Repair started for request ${req.id}`);
      fetchTechData();
    } catch (err) {
      toast.error('Failed to start repair.');
    }
  };

  const handleRequestPartsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !requiredParts) return;

    try {
      await api.post(`/repairs/${selectedReq.id}/partial-progress`, {
        completedCount,
        remainingCount,
        requiredParts,
        problemFound,
        solution,
        remarks
      });
      toast.success(`Progress updated & spare parts requested for request ${selectedReq.id}`);
      setPartsModalOpen(false);
      setRequiredParts('');
      setCompletedCount(0);
      setRemainingCount(1);
      fetchTechData();
    } catch (err) {
      toast.error('Failed to request parts.');
    }
  };


  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !problemFound || !solution) return;

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
      fetchTechData();

      // Clear forms
      setProblemFound('');
      setSolution('');
      setDelayReason('');
      setPartsReplaced('');
      setRemarks('');
    } catch (err) {
      toast.error('Failed to resolve request.');
    }
  };

  const handleDeadStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !deadReason) return;

    try {
      await api.post(`/repairs/${selectedReq.id}/dead-stock`, {
        deanId: user?.userId,
        reason: deadReason,
        description: deadDesc
      });
      toast.success(`Asset marked as Dead Stock.`);
      setDeadModalOpen(false);
      fetchTechData();

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

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="grid" />
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  // Metric calculation for assigned requests
  const assignedCount = myRequests.length;
  const inProgressCount = 0;
  const partsRequestedCount = myRequests.filter(r => r.status === 'Parts Requested').length;
  const resolvedCount = myRequests.filter(r => r.status === 'Resolved').length;

  return (
    <div className="space-y-6">
      {/* 1. Statistics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Assigned Requests"
          value={assignedCount}
          subtext="Total repairs delegated to you"
          icon={FolderOpen}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtext="Repairs currently under diagnostic"
          icon={Wrench}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <StatCard
          title="Parts Requested"
          value={partsRequestedCount}
          subtext="Awaiting supply components"
          icon={ShoppingBag}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          subtext="Repairs successfully closed"
          icon={CheckCircle}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
      </div>

      {/* 2. Large Assigned Repairs Table */}
      <div className="admin-card bg-white p-6">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">My Assigned Repair Requests</h4>
        
        {myRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-textMuted font-medium border border-dashed border-slate-200 rounded-2xl">
            You do not have any repair tasks assigned at this moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Item Type</th>
                  <th className="py-3 px-4">Issue Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Initiated</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {myRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold">{req.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {req.inventory.department?.code || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{req.inventory.type}</td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]" title={req.title}>{req.title}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getStatusBadgeClass(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(req.initiatedDate).toLocaleDateString()} {req.initiatedTime.substring(0, 5)}
                    </td>
                    <td className="py-3.5 px-4 text-center relative">
                      <div className="inline-flex items-center gap-1">
                        
                        {req.status === 'Accepted' && (
                          <button
                            onClick={() => handleStartRepair(req)}
                            className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 rounded-lg border border-blue-200 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Start Repair</span>
                          </button>
                        )}

                        {['In Progress', 'Parts Requested'].includes(req.status) && (
                          <div className="relative">
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setActiveDropdownRow(activeDropdownRow === req.id ? null : req.id);
                              }}
                              className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-600 rounded-lg border border-amber-200 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>Update Progress</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {activeDropdownRow === req.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-[#e2e8f0] shadow-premium z-50 overflow-hidden text-left">
                                <button
                                  onClick={() => {
                                    setPartsModalOpen(true);
                                    setActiveDropdownRow(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                  Request Parts
                                </button>
                                <button
                                  onClick={() => {
                                    setResolveModalOpen(true);
                                    setActiveDropdownRow(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors border-t border-slate-100"
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

                        {['Resolved', 'Dead Stock'].includes(req.status) && (
                          <button
                            onClick={() => handleViewTimeline(req)}
                            className="px-3 py-1 bg-slate-50 hover:bg-brand-purple hover:text-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <History className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POPUP 1: Request Parts Modal */}
      <Modal isOpen={partsModalOpen} onClose={() => setPartsModalOpen(false)} title={`Update Device Progress & Request Spare Parts - Request: ${selectedReq?.id}`}>
        <form onSubmit={handleRequestPartsSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Devices Completed</label>
              <input
                type="number"
                min={0}
                value={completedCount}
                onChange={(e) => setCompletedCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Remaining Needing Parts</label>
              <input
                type="number"
                min={1}
                value={remainingCount}
                onChange={(e) => setRemainingCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Required Spare Parts for Remaining Devices</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. CPU Heat Sink, thermal paste, 8GB RAM Module..."
              value={requiredParts}
              onChange={(e) => setRequiredParts(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <span>Save Progress & Submit Parts Request</span>
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
                placeholder="e.g. Faulty power transistor"
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
                placeholder="e.g. Solder new transistor to motherboard"
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
                placeholder="e.g. Transistor Model ABC"
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
              placeholder="e.g. Tested system benchmarks, hardware running stably."
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
            <span>Mark Resolved & Close Request</span>
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
              placeholder="e.g. Burned processor core, obsolete specs"
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
              placeholder="Provide a detailed explanation of why this asset is unrepairable."
              value={deadDesc}
              onChange={(e) => setDeadDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[10px] text-red-600 font-semibold flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>WARNING: This action is irreversible. The asset status will change to Dead Stock immediately.</span>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <span>Mark Dead Stock & Archive</span>
          </button>
        </form>
      </Modal>

      {/* TIMELINE MODAL */}
      <Modal isOpen={timelineModalOpen} onClose={() => setTimelineModalOpen(false)} title={`Request Status Timeline: ${selectedReq?.id}`}>
        {selectedReq && (
          <div className="space-y-6 text-left">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-2 text-xs">
              <div><span className="font-bold text-slate-500">Asset:</span> <span className="font-semibold text-slate-700">{selectedReq.inventory?.id} ({selectedReq.inventory?.type})</span></div>
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
                        {stage.statusDate} {stage.statusTime?.substring(0, 5)}
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
export default HardwareTechnicianDashboard;
