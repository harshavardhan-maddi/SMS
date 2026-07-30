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
  ChevronDown,
  Activity,
  UserCheck,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RequestDetailsModal } from '../components/RequestDetailsModal';

export const EEEAssetManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Modals state
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [viewDetailsReq, setViewDetailsReq] = useState<any>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [deadModalOpen, setDeadModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineHistory, setTimelineHistory] = useState<any[]>([]);

  // Action Form States
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [deadReason, setDeadReason] = useState('');
  const [deadDesc, setDeadDesc] = useState('');

  // Dropdown state for rows
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);

  const fetchEEEData = async () => {
    try {
      const [repairsRes, techsRes] = await Promise.all([
        api.get('/repairs'),
        api.get('/users/technicians')
      ]);

      // Filter repair requests belonging to EEE department
      const allRequests = repairsRes.data || [];
      const eeeRequests = allRequests.filter((r: any) => 
        r.inventory?.department?.code === 'EEE' || r.inventory?.department?.id === 3
      );

      setRequests(eeeRequests);

      const techs = techsRes.data || [];
      setTechnicians(techs);
      if (techs.length > 0) {
        setSelectedTechId(techs[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load EEE Asset Manager data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEEEData();
  }, [dashboardTick]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !selectedTechId) return;

    try {
      await api.post(`/repairs/${selectedReq.id}/accept`, {
        technicianId: parseInt(selectedTechId)
      });
      toast.success(`Request ${selectedReq.id} assigned to technician successfully!`);
      setAssignModalOpen(false);
      fetchEEEData();
    } catch (err) {
      toast.error('Failed to assign technician to request.');
    }
  };

  const handleDecommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !deadReason) {
      toast.error('Please enter a reason for decommissioning.');
      return;
    }

    try {
      await api.post(`/repairs/${selectedReq.id}/decommission`, {
        reason: deadReason,
        description: deadDesc
      });
      toast.success(`Asset marked as Dead Stock.`);
      setDeadModalOpen(false);
      setDeadReason('');
      setDeadDesc('');
      fetchEEEData();
    } catch (err) {
      toast.error('Failed to decommission asset.');
    }
  };

  const fetchTimeline = async (reqId: string) => {
    try {
      const res = await api.get(`/repairs/${reqId}/history`);
      setTimelineHistory(res.data);
      setTimelineModalOpen(true);
    } catch (err) {
      toast.error('Failed to fetch request timeline.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'initiated':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'accepted':
      case 'in progress':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'dead stock':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  if (loading) return <LoadingSkeleton />;

  const pendingRequests = requests.filter(r => r.status.toLowerCase() === 'initiated');
  const inProgressRequests = requests.filter(r => ['accepted', 'in progress', 'parts requested'].includes(r.status.toLowerCase()));
  const resolvedRequests = requests.filter(r => r.status.toLowerCase() === 'resolved');

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-200 fill-amber-200" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-100">EEE Department Portal</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Electrical & Electronics Asset Manager Dashboard</h2>
          <p className="text-xs text-amber-100 mt-1 max-w-xl">
            Exclusive manager portal for EEE department repair requests. Review incoming tickets from EEE HOD and Lab Assistants, assign department technicians, and oversee maintenance operations.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-right">
          <div className="text-xs text-amber-100 font-semibold">Active User</div>
          <div className="text-sm font-bold text-white">{user?.name}</div>
          <div className="text-[10px] text-amber-200 uppercase font-black tracking-wider mt-0.5">EEE Asset Manager</div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total EEE Tickets"
          value={requests.length.toString()}
          icon={FileText}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
          subtext="EEE Department Total"
        />
        <StatCard
          title="Pending Technician"
          value={pendingRequests.length.toString()}
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-500"
          subtext="Requires Technician Assignment"
        />
        <StatCard
          title="In Maintenance"
          value={inProgressRequests.length.toString()}
          icon={Wrench}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
          subtext="Active Technicians Working"
        />
        <StatCard
          title="Resolved Tickets"
          value={resolvedRequests.length.toString()}
          icon={CheckCircle}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
          subtext="Completed EEE Repairs"
        />
      </div>

      {/* REPAIR REQUESTS TABLE */}
      <div className="admin-card bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">EEE Department Repair Requests</h3>
            <p className="text-xs text-slate-500">Tickets initiated by EEE HOD and Lab Assistants requiring manager overview & technician assignment.</p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
            {requests.length} EEE Tickets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Location / Lab</th>
                <th className="py-3 px-4">Hardware Type</th>
                <th className="py-3 px-4">Issue Details</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    No repair requests logged for EEE Department yet.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isInitiated = req.status.toLowerCase() === 'initiated';
                  const isResolved = req.status.toLowerCase() === 'resolved';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{req.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {req.inventory?.lab ? `Lab ${req.inventory.lab.labNumber}` : 'EEE Dept'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">{req.inventory?.type || 'Hardware'}</td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-semibold text-slate-800 truncate" title={req.title}>{req.title}</div>
                        <div className="text-[10px] text-slate-400 truncate" title={req.description}>{req.description}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {req.requester?.name || 'EEE Faculty'}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {req.assignedTo ? (
                          <span className="text-slate-800 font-semibold">{req.assignedTo.name}</span>
                        ) : (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                          req.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-200' : req.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveDropdownRow(activeDropdownRow === req.id ? null : req.id)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Action</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {activeDropdownRow === req.id && (
                            <div className="origin-top-right absolute right-0 mt-1 w-48 rounded-2xl shadow-xl bg-white ring-1 ring-black/5 divide-y divide-slate-100 z-50 border border-slate-100 py-1 text-left">
                              {isInitiated && (
                                <button
                                  onClick={() => {
                                    setSelectedReq(req);
                                    setAssignModalOpen(true);
                                    setActiveDropdownRow(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Assign Technician</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setViewDetailsReq(req);
                                  setActiveDropdownRow(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Request Details</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedReq(req);
                                  fetchTimeline(req.id);
                                  setActiveDropdownRow(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Activity className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Railway Journey</span>
                              </button>

                              {!isResolved && (
                                <button
                                  onClick={() => {
                                    setSelectedReq(req);
                                    setDeadModalOpen(true);
                                    setActiveDropdownRow(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Mark as Dead Stock</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN TECHNICIAN MODAL */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title={`Assign Technician to EEE Request: ${selectedReq?.id}`}>
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-left">
          <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 font-medium">
            Select a hardware technician to take ownership and start maintenance on this EEE ticket.
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Available Technicians</label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden focus:border-amber-500 bg-white"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm Technician Assignment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DECOMMISSION TO DEAD STOCK MODAL */}
      <Modal isOpen={deadModalOpen} onClose={() => setDeadModalOpen(false)} title={`Decommission Asset to Dead Stock - Request: ${selectedReq?.id}`}>
        <form onSubmit={handleDecommissionSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Decommission Reason / Cause of Failure</label>
            <input
              type="text"
              required
              placeholder="e.g. PCB burnt out, irreparable motor fault"
              value={deadReason}
              onChange={(e) => setDeadReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Detailed Technical Assessment</label>
            <textarea
              rows={3}
              placeholder="Provide explanation of why the hardware asset is beyond economic repair."
              value={deadDesc}
              onChange={(e) => setDeadDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-red-500"
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
            WARNING: This action is irreversible. The asset status will update to Dead Stock immediately.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeadModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Dead Stock Decommission</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* TIMELINE MODAL */}
      <Modal isOpen={timelineModalOpen} onClose={() => setTimelineModalOpen(false)} title={`Request Status Timeline: ${selectedReq?.id}`}>
        {selectedReq && (
          <div className="space-y-6 text-left">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-2 text-xs">
              <div><span className="font-bold text-slate-500">Hardware Type:</span> <span className="font-semibold text-slate-700">{selectedReq.inventory?.type}</span></div>
              <div><span className="font-bold text-slate-500">Fault:</span> <span className="font-semibold text-slate-700">{selectedReq.title}</span></div>
              <div><span className="font-bold text-slate-500">Current Status:</span> <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ml-1.5 ${getStatusBadgeClass(selectedReq.status)}`}>{selectedReq.status}</span></div>
            </div>

            <div className="relative pl-6 border-l border-slate-200 space-y-6 ml-3">
              {timelineHistory.map((stage) => (
                <div key={stage.id} className="relative">
                  <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-amber-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{stage.status}</span>
                      <span className="text-[10px] text-slate-400">{stage.statusDate} {stage.statusTime}</span>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* REQUEST DETAILS MODAL */}
      <RequestDetailsModal
        isOpen={!!viewDetailsReq}
        onClose={() => setViewDetailsReq(null)}
        request={viewDetailsReq}
      />
    </div>
  );
};
