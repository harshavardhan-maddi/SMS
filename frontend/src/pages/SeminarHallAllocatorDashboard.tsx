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
      <div className="admin-card p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Hall Allocator Command Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            {hallName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <span className="text-slate-800 font-semibold">{user?.name}</span> ({user?.email}) • Responsible for hall allocation &amp; slot confirmations
          </p>
        </div>

        {/* Live Pending Counter Badge */}
        <div className="flex items-center gap-4 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs">
            {stats.pending}
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">Pending Requests</span>
            <span className="text-[11px] text-slate-500">Require your review &amp; action</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500 block mb-2">Total Requests</span>
          <div className="text-3xl font-black text-slate-800">{stats.total}</div>
          <span className="text-[11px] text-slate-500">For {hallName}</span>
        </div>

        <div className="admin-card p-5 bg-white rounded-2xl border border-amber-200/80 shadow-xs bg-amber-50/20">
          <span className="text-xs font-bold uppercase text-amber-700 block mb-2">Awaiting Allocation</span>
          <div className="text-3xl font-black text-amber-600">{stats.pending}</div>
          <span className="text-[11px] text-amber-700">Action required</span>
        </div>

        <div className="admin-card p-5 bg-white rounded-2xl border border-emerald-200/80 shadow-xs bg-emerald-50/20">
          <span className="text-xs font-bold uppercase text-emerald-700 block mb-2">Allocated / Confirmed</span>
          <div className="text-3xl font-black text-emerald-600">{stats.approved}</div>
          <span className="text-[11px] text-emerald-700">Slot reserved</span>
        </div>

        <div className="admin-card p-5 bg-white rounded-2xl border border-red-200/80 shadow-xs bg-red-50/20">
          <span className="text-xs font-bold uppercase text-red-700 block mb-2">Declined / Rejected</span>
          <div className="text-3xl font-black text-red-600">{stats.rejected}</div>
          <span className="text-[11px] text-red-700">Slots unavailable</span>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
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
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, HOD, event..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Ticket List */}
      {filteredRequests.length === 0 ? (
        <div className="admin-card py-16 bg-white rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
          No seminar hall requests found in "{activeTab}" view.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredRequests.map(req => (
            <div
              key={req.id}
              className={`admin-card p-6 bg-white rounded-2xl border shadow-xs transition-all ${
                req.status === 'Pending'
                  ? 'border-amber-300'
                  : req.status === 'Approved'
                  ? 'border-emerald-200'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Top Row: Ticket ID, Requester, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                    {req.id}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Requested by {req.requester?.name}
                    </h3>
                    <span className="text-xs text-slate-500">
                      Department: <strong className="text-indigo-700">{req.department?.name || 'Academic Dept'}</strong> ({req.department?.code})
                    </span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  req.status === 'Approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : req.status === 'Rejected'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {req.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {req.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                  {req.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                  {req.status}
                </span>
              </div>

              {/* Event Key Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Resource Person</span>
                  <strong className="text-slate-800 text-sm block">{req.resourcePersonName}</strong>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Participants Count</span>
                  <strong className="text-indigo-700 text-sm block">{req.participantsCount} Attendees</strong>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Duration &amp; Slot</span>
                  {req.noOfDays === 1 ? (
                    <div>
                      <strong className="text-slate-800 text-sm block">{req.eventDate}</strong>
                      <span className="text-amber-700 font-bold uppercase">{req.timeSlot}</span>
                    </div>
                  ) : (
                    <div>
                      <strong className="text-slate-800 text-sm block">{req.noOfDays} Days Event</strong>
                      <span className="text-slate-500">{req.startDate} to {req.endDate}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Assigned Hall</span>
                  <strong className="text-slate-800 text-sm block">{req.seminarHall?.name}</strong>
                  <span className="text-indigo-700 font-semibold">{req.seminarHall?.block}</span>
                </div>
              </div>

              {/* Event Description & Requirements */}
              {req.eventTitle && (
                <div className="text-xs text-slate-600 mb-2">
                  <strong className="text-slate-800">Event Title:</strong> {req.eventTitle}
                </div>
              )}

              {req.eventDescription && (
                <div className="text-xs text-slate-700 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <strong className="text-slate-800">AV &amp; Special Facility Requirements:</strong>
                  <p className="mt-1 text-slate-600">{req.eventDescription}</p>
                </div>
              )}

              {/* Allocator Existing Remarks if any */}
              {req.allocatorRemarks && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 mb-4 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Your Previous Remarks:</strong> {req.allocatorRemarks}
                  </div>
                </div>
              )}

              {/* Action Buttons for Allocator */}
              {req.status === 'Pending' && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setActionType('Rejected');
                      setActionRemarks('');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Approve &amp; Allocate Hall
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Approve / Reject Action */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {actionType === 'Approved' ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                    <XCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {actionType === 'Approved' ? 'Confirm Seminar Hall Allocation' : 'Decline Booking Request'}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Ticket {selectedRequest.id}</span>
                </div>
              </div>

              <button
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 mb-5">
              <div className="text-slate-800 font-semibold">
                Event: {selectedRequest.eventTitle || selectedRequest.resourcePersonName}
              </div>
              <div className="text-slate-500">
                Requester: {selectedRequest.requester?.name} ({selectedRequest.department?.code})
              </div>
              <div className="text-amber-700 font-bold">
                Timing: {selectedRequest.noOfDays === 1
                  ? `${selectedRequest.eventDate} (${selectedRequest.timeSlot})`
                  : `${selectedRequest.startDate} to ${selectedRequest.endDate} (${selectedRequest.noOfDays} Days)`}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {actionType === 'Approved' ? 'Allocation Remarks &amp; Instructions (Optional)' : 'Reason for Declining (Required)'}
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
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleStatusUpdate}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs ${
                  actionType === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
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
export default SeminarHallAllocatorDashboard;
