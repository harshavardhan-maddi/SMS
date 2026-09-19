import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Boxes,
  FileText,
  User,
  ArrowRight,
  Send,
  Truck,
  CheckCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { StationaryRequest } from '../types';
import { toast } from 'react-hot-toast';

export const AODashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [requests, setRequests] = useState<StationaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modal State
  const [selectedReq, setSelectedReq] = useState<StationaryRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/stationary/requests');
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load AO requests:', err);
      toast.error('Failed to load stationary requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [dashboardTick]);

  const handleOpenActionModal = (req: StationaryRequest, type: 'APPROVE' | 'REJECT') => {
    setSelectedReq(req);
    setActionType(type);
    setActionRemarks(
      type === 'APPROVE'
        ? 'Approved and forwarded to Stationary Store for fulfillment'
        : 'Budget/Quota limit exceeded or non-essential'
    );
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !actionType) return;

    setIsProcessing(true);
    try {
      await api.patch(`/api/stationary/requests/${selectedReq.id}/ao-action`, {
        action: actionType,
        remarks: actionRemarks.trim(),
      });

      toast.success(
        actionType === 'APPROVE'
          ? `Request ${selectedReq.id} approved & forwarded to Stationary Store!`
          : `Request ${selectedReq.id} declined.`
      );

      setSelectedReq(null);
      setActionType(null);
      fetchRequests();
    } catch (err: any) {
      console.error('Failed to process AO action:', err);
      toast.error(err.response?.data || 'Failed to update request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING_AO');
  const otherRequests = requests.filter((r) => r.status !== 'PENDING_AO');

  const displayedRequests = (activeTab === 'pending' ? pendingRequests : requests).filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.requester?.name?.toLowerCase().includes(q) ||
      r.department?.name?.toLowerCase().includes(q) ||
      r.department?.code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1e293b]/90 via-[#0f172a]/95 to-[#1e293b]/90 border border-[#334155]/60 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrative Officer Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Stationary Approval &amp; Allocation Desk
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted">
            Review department stationary indents. Accepted requests automatically route to the Stationary Store for dispatch.
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-[#0b1329] border border-amber-500/30 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Awaiting AO</span>
            <span className="text-xl font-black text-amber-400">{pendingRequests.length}</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-[#0b1329] border border-[#334155] text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Managed</span>
            <span className="text-xl font-black text-white">{requests.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e293b]/60 border border-[#334155]/60 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Review ({pendingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>All Requests ({requests.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticket, HOD or Dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0f172a]/90 border border-[#334155] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Requests Feed */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-xs">Loading requests...</div>
      ) : displayedRequests.length === 0 ? (
        <div className="text-center py-20 bg-[#1e293b]/40 rounded-2xl border border-[#334155]/40 text-slate-400 text-xs space-y-2">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-400" />
          <p className="text-sm font-bold text-white">All caught up!</p>
          <p>No stationary requests awaiting review under this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRequests.map((req) => (
            <div
              key={req.id}
              className="bg-[#1e293b]/70 border border-[#334155]/60 rounded-2xl p-6 backdrop-blur-md space-y-4 hover:border-slate-500 transition-all shadow-md"
            >
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-white">{req.id}</span>
                    {req.status === 'PENDING_AO' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Awaiting AO Decision
                      </span>
                    )}
                    {req.status === 'FORWARDED_TO_STATIONARY' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Forwarded to Store
                      </span>
                    )}
                    {req.status === 'FULFILLED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5" /> Fulfilled
                      </span>
                    )}
                    {req.status.startsWith('REJECTED') && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Declined
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-brand-textMuted flex items-center gap-3">
                    <span>
                      Requester: <strong className="text-white">{req.requester?.name}</strong> (
                      {req.department?.name || 'Academic Dept'})
                    </span>
                    <span>•</span>
                    <span>Submitted: {new Date(req.createdAt).toLocaleString()}</span>
                  </p>
                </div>

                {/* Action Buttons for Pending */}
                {req.status === 'PENDING_AO' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenActionModal(req, 'REJECT')}
                      className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline</span>
                    </button>

                    <button
                      onClick={() => handleOpenActionModal(req, 'APPROVE')}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Accept &amp; Forward to Store</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Purpose */}
              <div className="p-3 rounded-xl bg-[#0f172a]/70 border border-[#334155]/40 text-xs text-slate-300">
                <span className="font-bold text-slate-400">Purpose / Indent Justification: </span>
                {req.purpose || 'Department Academic & Laboratory Requirements'}
              </div>

              {/* Item Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b1329] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Requested Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {req.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-white">{item.name}</td>
                        <td className="py-2 px-3 text-slate-400">{item.category || 'General'}</td>
                        <td className="py-2 px-3 text-slate-400">{item.unit || 'Nos'}</td>
                        <td className="py-2 px-3 text-right font-black text-amber-300">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#0b1329]/90 font-bold border-t border-slate-800 text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-400">
                        Total Items: {req.totalItems} | Total Cumulative Units:
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400 font-black">{req.totalQuantity}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Existing Remarks if already processed */}
              {req.aoRemarks && (
                <div className="text-xs text-slate-400 pt-1">
                  <strong>AO Remarks:</strong> &quot;{req.aoRemarks}&quot;
                  {req.aoActionAt && <span> (Actioned: {new Date(req.aoActionAt).toLocaleString()})</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation / Decision Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e293b] border border-[#334155] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  actionType === 'APPROVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {actionType === 'APPROVE' ? <Truck className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {actionType === 'APPROVE'
                    ? 'Accept & Forward to Stationary Store'
                    : 'Decline Stationary Request'}
                </h3>
                <p className="text-xs text-brand-textMuted">
                  Ticket: <strong>{selectedReq.id}</strong> • Requester:{' '}
                  <strong>{selectedReq.requester?.name}</strong> ({selectedReq.department?.name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {actionType === 'APPROVE'
                ? `You are approving ${selectedReq.totalItems} items (${selectedReq.totalQuantity} total units). This request will be instantly dispatched to the Stationary Store login.`
                : `Are you sure you want to decline this request? The HOD will be notified with your remarks.`}
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Approval / Decision Remarks:</label>
                <textarea
                  required
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Enter remarks or approval notes..."
                  className="w-full p-3 rounded-xl bg-[#0f172a] border border-[#334155] text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReq(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-slate-950 transition-all cursor-pointer ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20'
                  }`}
                >
                  {isProcessing
                    ? 'Processing...'
                    : actionType === 'APPROVE'
                    ? 'Confirm & Forward to Store'
                    : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AODashboard;
