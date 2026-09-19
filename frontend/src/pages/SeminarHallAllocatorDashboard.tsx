import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Calendar,
  CalendarCheck2,
  Clock,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  Layers,
  Sparkles,
  HelpCircle,
  FileText,
  ChevronRight,
  Info,
  ShieldCheck,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeminarHallRequest } from '../types';

export const SeminarHallAllocatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [requests, setRequests] = useState<SeminarHallRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Action Modals State
  const [selectedRequest, setSelectedRequest] = useState<SeminarHallRequest | null>(null);
  const [actionType, setActionType] = useState<'Approved' | 'Rejected' | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAllocatorData = async () => {
    try {
      const [reqsRes, statsRes] = await Promise.all([
        api.get('/seminar-requests'),
        api.get('/seminar-requests/stats')
      ]);
      setRequests(reqsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load allocator data:', err);
      toast.error('Failed to refresh seminar hall requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocatorData();
  }, [dashboardTick]);

  const handleStatusUpdate = async () => {
    if (!selectedRequest || !actionType) return;
    if (actionType === 'Rejected' && !actionRemarks.trim()) {
      toast.error('Please provide a reason for rejecting this request');
      return;
    }

    setIsProcessing(true);
    try {
      await api.patch(`/seminar-requests/${selectedRequest.id}/status`, {
        status: actionType,
        remarks: actionRemarks.trim()
      });
      toast.success(`Request ${selectedRequest.id} marked as ${actionType}!`);
      setSelectedRequest(null);
      setActionType(null);
      setActionRemarks('');
      fetchAllocatorData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to update request status';
      toast.error(typeof msg === 'string' ? msg : 'Error processing request');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesTab = activeTab === 'All' || r.status === activeTab;
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.resourcePersonName && r.resourcePersonName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.eventTitle && r.eventTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.requester?.name && r.requester.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.department?.name && r.department.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const hallName = user?.seminarHallName || 'Assigned Seminar Hall';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-[#0f172a]/95 to-indigo-950/80 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-extrabold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            Hall Allocator Command Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {hallName}
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Logged in as <span className="text-white font-semibold">{user?.name}</span> ({user?.email}) • Responsible for hall allocation & slot confirmations
          </p>
        </div>

        {/* Live Pending Counter Badge */}
        <div className="flex items-center gap-4 bg-[#0f172a]/70 p-4 rounded-2xl border border-[#334155]/60">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl border border-amber-500/30">
            {stats.pending}
          </div>
          <div>
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">Pending Requests</span>
            <span className="text-[11px] text-brand-textMuted">Require your review & action</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-[#334155]/60 shadow-md">
          <span className="text-xs font-semibold uppercase text-brand-textMuted block mb-2">Total Requests</span>
          <div className="text-3xl font-black text-white">{stats.total}</div>
          <span className="text-[11px] text-brand-textMuted">For {hallName}</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-amber-500/40 shadow-md">
          <span className="text-xs font-semibold uppercase text-amber-400 block mb-2">Awaiting Allocation</span>
          <div className="text-3xl font-black text-amber-400">{stats.pending}</div>
          <span className="text-[11px] text-amber-300/70">Action required</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-emerald-500/40 shadow-md">
          <span className="text-xs font-semibold uppercase text-emerald-400 block mb-2">Allocated / Confirmed</span>
          <div className="text-3xl font-black text-emerald-400">{stats.approved}</div>
          <span className="text-[11px] text-emerald-300/70">Slot reserved</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-red-500/40 shadow-md">
          <span className="text-xs font-semibold uppercase text-red-400 block mb-2">Declined / Rejected</span>
          <div className="text-3xl font-black text-red-400">{stats.rejected}</div>
          <span className="text-[11px] text-red-300/70">Slots unavailable</span>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1e293b]/80 border border-[#334155]/60 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-[#0f172a]/60 text-brand-textMuted hover:text-white border border-[#334155]/40'
              }`}
            >
              {tab === 'Pending' && `Pending (${stats.pending})`}
              {tab === 'Approved' && `Approved (${stats.approved})`}
              {tab === 'Rejected' && `Rejected (${stats.rejected})`}
              {tab === 'All' && `All (${stats.total})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted" />
          <input
            type="text"
            placeholder="Search tickets, HOD, event..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white text-xs placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Ticket List */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl bg-[#1e293b]/50 border border-[#334155]/60 py-16 text-center text-xs text-brand-textMuted">
          No seminar hall requests found in "{activeTab}" view.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredRequests.map(req => (
            <div
              key={req.id}
              className={`rounded-2xl bg-gradient-to-r from-[#1e293b]/90 to-[#0f172a]/95 border p-6 backdrop-blur-xl shadow-lg transition-all ${
                req.status === 'Pending'
                  ? 'border-amber-500/50 shadow-amber-500/5'
                  : req.status === 'Approved'
                  ? 'border-emerald-500/40'
                  : 'border-[#334155]/60'
              }`}
            >
              {/* Top Row: Ticket ID, Requester, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#334155]/40 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-indigo-400 bg-indigo-500/15 px-3 py-1 rounded-lg border border-indigo-500/30">
                    {req.id}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Requested by {req.requester?.name}
                    </h3>
                    <span className="text-xs text-brand-textMuted">
                      Department: <strong className="text-indigo-300">{req.department?.name || 'Academic Dept'}</strong> ({req.department?.code})
                    </span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  req.status === 'Approved'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : req.status === 'Rejected'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {req.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {req.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                  {req.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                  {req.status}
                </span>
              </div>

              {/* Event Key Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                <div className="bg-[#0f172a]/60 p-3.5 rounded-xl border border-[#334155]/40">
                  <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Resource Person</span>
                  <strong className="text-white text-sm block">{req.resourcePersonName}</strong>
                </div>

                <div className="bg-[#0f172a]/60 p-3.5 rounded-xl border border-[#334155]/40">
                  <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Participants Count</span>
                  <strong className="text-indigo-300 text-sm block">{req.participantsCount} Attendees</strong>
                </div>

                <div className="bg-[#0f172a]/60 p-3.5 rounded-xl border border-[#334155]/40">
                  <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Duration & Slot</span>
                  {req.noOfDays === 1 ? (
                    <div>
                      <strong className="text-white text-sm block">{req.eventDate}</strong>
                      <span className="text-amber-400 font-bold uppercase">{req.timeSlot}</span>
                    </div>
                  ) : (
                    <div>
                      <strong className="text-white text-sm block">{req.noOfDays} Days Event</strong>
                      <span className="text-brand-textMuted">{req.startDate} to {req.endDate}</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#0f172a]/60 p-3.5 rounded-xl border border-[#334155]/40">
                  <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Assigned Hall</span>
                  <strong className="text-white text-sm block">{req.seminarHall?.name}</strong>
                  <span className="text-indigo-400 font-semibold">{req.seminarHall?.block}</span>
                </div>
              </div>

              {/* Event Description & Requirements */}
              {req.eventTitle && (
                <div className="text-xs text-brand-textMuted mb-2">
                  <strong className="text-white">Event Title:</strong> {req.eventTitle}
                </div>
              )}

              {req.eventDescription && (
                <div className="text-xs text-brand-textMuted mb-4 bg-[#0f172a]/50 p-3 rounded-xl border border-[#334155]/30">
                  <strong className="text-white">AV & Special Facility Requirements:</strong>
                  <p className="mt-1 text-white/90">{req.eventDescription}</p>
                </div>
              )}

              {/* Allocator Existing Remarks if any */}
              {req.allocatorRemarks && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 mb-4 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Your Previous Remarks:</strong> {req.allocatorRemarks}
                  </div>
                </div>
              )}

              {/* Action Buttons for Allocator */}
              {req.status === 'Pending' && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]/40">
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setActionType('Rejected');
                      setActionRemarks('');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    Decline Request
                  </button>

                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setActionType('Approved');
                      setActionRemarks('Hall reserved and confirmed. AV facilities arranged.');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Allocate Hall
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Approve / Reject Action */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e293b] border border-[#334155] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {actionType === 'Approved' ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                    <XCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {actionType === 'Approved' ? 'Confirm Seminar Hall Allocation' : 'Decline Booking Request'}
                  </h3>
                  <span className="text-xs text-brand-textMuted font-mono">Ticket {selectedRequest.id}</span>
                </div>
              </div>

              <button
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                className="text-brand-textMuted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0f172a]/70 border border-[#334155]/40 text-xs space-y-1.5 mb-5">
              <div className="text-white font-semibold">
                Event: {selectedRequest.eventTitle || selectedRequest.resourcePersonName}
              </div>
              <div className="text-brand-textMuted">
                Requester: {selectedRequest.requester?.name} ({selectedRequest.department?.code})
              </div>
              <div className="text-amber-400 font-bold">
                Timing: {selectedRequest.noOfDays === 1
                  ? `${selectedRequest.eventDate} (${selectedRequest.timeSlot})`
                  : `${selectedRequest.startDate} to ${selectedRequest.endDate} (${selectedRequest.noOfDays} Days)`}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-white mb-2">
                {actionType === 'Approved' ? 'Allocation Remarks & Instructions (Optional)' : 'Reason for Declining (Required)'}
              </label>
              <textarea
                rows={3}
                required={actionType === 'Rejected'}
                placeholder={
                  actionType === 'Approved'
                    ? 'e.g. Hall keys available with Block supervisor. Audio technician assigned.'
                    : 'e.g. Hall is already booked for College Annual Technical Symposium on this date.'
                }
                value={actionRemarks}
                onChange={e => setActionRemarks(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white text-xs placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                className="px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#334155] text-brand-textMuted hover:text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleStatusUpdate}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg ${
                  actionType === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                }`}
              >
                {isProcessing
                  ? 'Processing...'
                  : actionType === 'Approved'
                  ? 'Confirm Allocation'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
