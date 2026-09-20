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
      const res = await api.get('/stationary/requests');
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
      await api.patch(`/stationary/requests/${selectedReq.id}/ao-action`, {
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
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Administrative Officer Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Stationary Approval &amp; Allocation Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Review department stationary indents. Accepted requests automatically route to the Stationary Store for dispatch.
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Awaiting AO</span>
            <span className="text-xl font-black text-amber-600">{pendingRequests.length}</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Managed</span>
            <span className="text-xl font-black text-slate-800">{requests.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Review ({pendingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
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
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Requests Feed */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 text-xs">Loading requests...</div>
      ) : displayedRequests.length === 0 ? (
        <div className="admin-card text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
          <p className="text-sm font-bold text-slate-800">All caught up!</p>
          <p>No stationary requests awaiting review under this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRequests.map((req) => (
            <div
              key={req.id}
              className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-xs space-y-4 transition-all"
            >
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-slate-800">{req.id}</span>
                    {req.status === 'PENDING_AO' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Awaiting AO Decision
                      </span>
                    )}
                    {req.status === 'FORWARDED_TO_STATIONARY' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Forwarded to Store
                      </span>
                    )}
                    {req.status === 'FULFILLED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5" /> Fulfilled
                      </span>
                    )}
                    {req.status.startsWith('REJECTED') && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Declined
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-3">
                    <span>
                      Requester: <strong className="text-slate-800">{req.requester?.name}</strong> (
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
                      className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline</span>
                    </button>

                    <button
                      onClick={() => handleOpenActionModal(req, 'APPROVE')}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Accept &amp; Forward to Store</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Purpose */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="font-bold text-slate-800">Purpose / Indent Justification: </span>
                {req.purpose || 'Department Academic & Laboratory Requirements'}
              </div>

              {/* Item Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Requested Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {req.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{item.name}</td>
                        <td className="py-2 px-3 text-slate-600">{item.category || 'General'}</td>
                        <td className="py-2 px-3 text-slate-600">{item.unit || 'Nos'}</td>
                        <td className="py-2 px-3 text-right font-black text-amber-700">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">
                        Total Items: {req.totalItems} | Total Cumulative Units:
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-700 font-black">{req.totalQuantity}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Existing Remarks if already processed */}
              {req.aoRemarks && (
                <div className="text-xs text-slate-500 pt-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  actionType === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {actionType === 'APPROVE' ? <Truck className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {actionType === 'APPROVE'
                    ? 'Accept & Forward to Stationary Store'
                    : 'Decline Stationary Request'}
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket: <strong className="text-slate-800">{selectedReq.id}</strong> • Requester:{' '}
                  <strong className="text-slate-800">{selectedReq.requester?.name}</strong> ({selectedReq.department?.name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {actionType === 'APPROVE'
                ? `You are approving ${selectedReq.totalItems} items (${selectedReq.totalQuantity} total units). This request will be instantly dispatched to the Stationary Store login.`
                : `Are you sure you want to decline this request? The HOD will be notified with your remarks.`}
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Approval / Decision Remarks:</label>
                <textarea
                  required
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Enter remarks or approval notes..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReq(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                      : 'bg-red-600 hover:bg-red-700 shadow-xs'
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
