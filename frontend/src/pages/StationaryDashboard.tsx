import React, { useState, useEffect } from 'react';
import {
  PackageCheck,
  Truck,
  CheckCheck,
  Clock,
  XCircle,
  Building2,
  Boxes,
  FileText,
  User,
  Search,
  CheckCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { StationaryRequest } from '../types';
import { toast } from 'react-hot-toast';

export const StationaryDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [requests, setRequests] = useState<StationaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'fulfilled'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modal State
  const [selectedReq, setSelectedReq] = useState<StationaryRequest | null>(null);
  const [actionType, setActionType] = useState<'FULFILL' | 'REJECT' | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [editableItems, setEditableItems] = useState<{ name: string; count: number; allottedCount: number; category?: string; unit?: string }[]>([]);
  const [decreaseRemarks, setDecreaseRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stationary/requests');
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load stationary store requests:', err);
      toast.error('Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [dashboardTick]);

  const handleOpenActionModal = (req: StationaryRequest, type: 'FULFILL' | 'REJECT') => {
    setSelectedReq(req);
    setActionType(type);
    setActionRemarks(
      type === 'FULFILL'
        ? 'All items issued and packed. Ready for department collection from central store.'
        : 'Requested items currently out of stock.'
    );
    setEditableItems(
      req.items?.map((it) => ({
        name: it.name,
        count: it.count,
        allottedCount: it.allottedCount !== undefined ? it.allottedCount : it.count,
        category: it.category,
        unit: it.unit,
      })) || []
    );
    setDecreaseRemarks(req.decreaseRemarks || '');
  };

  const hasDecreasedItems = editableItems.some((it) => it.allottedCount < it.count);

  const handleAllottedCountChange = (index: number, val: number) => {
    setEditableItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], allottedCount: Math.max(0, val) };
      return updated;
    });
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !actionType) return;

    if (actionType === 'FULFILL' && hasDecreasedItems && !decreaseRemarks.trim()) {
      toast.error('Please enter remarks explaining why item allotments were decreased.');
      return;
    }

    setIsProcessing(true);
    try {
      await api.patch(`/stationary/requests/${selectedReq.id}/stationary-action`, {
        action: actionType,
        remarks: actionRemarks.trim(),
        items: actionType === 'FULFILL' ? editableItems : undefined,
        decreaseRemarks: actionType === 'FULFILL' && hasDecreasedItems ? decreaseRemarks.trim() : undefined,
      });

      toast.success(
        actionType === 'FULFILL'
          ? `Request ${selectedReq.id} marked as FULFILLED! Requester notified.`
          : `Request ${selectedReq.id} declined.`
      );

      setSelectedReq(null);
      setActionType(null);
      fetchRequests();
    } catch (err: any) {
      console.error('Failed to process store action:', err);
      toast.error(err.response?.data || 'Failed to update request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingDispatch = requests.filter((r) => r.status === 'FORWARDED_TO_STATIONARY');
  const fulfilledRequests = requests.filter((r) => r.status === 'FULFILLED');

  const displayedRequests = (activeTab === 'pending' ? pendingDispatch : fulfilledRequests).filter((r) => {
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
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-1">
            <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
            Stationary Store &amp; Dispatch Incharge
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Stationary Inventory &amp; Order Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Review AO-approved department requests, prepare stock items, and issue delivery receipts.
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">To Dispatch</span>
            <span className="text-xl font-black text-blue-700">{pendingDispatch.length}</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Fulfilled</span>
            <span className="text-xl font-black text-emerald-700">{fulfilledRequests.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Ready for Fulfillment ({pendingDispatch.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fulfilled')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'fulfilled'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Fulfilled Log ({fulfilledRequests.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ticket, department or HOD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 text-xs">Loading orders...</div>
      ) : displayedRequests.length === 0 ? (
        <div className="admin-card text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
          <p className="text-sm font-bold text-slate-800">No pending orders!</p>
          <p>All approved stationary requests have been dispatched and fulfilled.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRequests.map((req) => (
            <div
              key={req.id}
              className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-xs space-y-4 transition-all"
            >
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-slate-800">{req.id}</span>
                    {req.status === 'FORWARDED_TO_STATIONARY' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> AO Approved • Ready to Issue
                      </span>
                    )}
                    {req.status === 'FULFILLED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5" /> Fulfilled &amp; Issued
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-3">
                    <span>
                      Dept: <strong className="text-slate-800">{req.department?.name || 'Department'}</strong> (
                      {req.requester?.name})
                    </span>
                    <span>•</span>
                    <span>Approved by AO: {req.aoActionBy?.name || 'Administrative Officer'}</span>
                  </p>
                </div>

                {/* Fulfill Action Button */}
                {req.status === 'FORWARDED_TO_STATIONARY' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenActionModal(req, 'REJECT')}
                      className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline</span>
                    </button>

                    <button
                      onClick={() => handleOpenActionModal(req, 'FULFILL')}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Fulfill &amp; Issue Items</span>
                    </button>
                  </div>
                )}
              </div>

              {/* AO Approval Note */}
              {req.aoRemarks && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold text-amber-800">AO Approval Note: </span>
                  &quot;{req.aoRemarks}&quot;
                </div>
              )}

              {/* Items Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Requested</th>
                      <th className="py-2.5 px-3 text-right">Allotted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {req.items?.map((item, idx) => {
                      const isDecreased = item.allottedCount !== undefined && item.allottedCount < item.count;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{item.name}</td>
                          <td className="py-2 px-3 text-slate-600">{item.category || 'General'}</td>
                          <td className="py-2 px-3 text-slate-600">{item.unit || 'Nos'}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-800">{item.count}</td>
                          <td className="py-2 px-3 text-right">
                            {req.status === 'FULFILLED' ? (
                              <span className={`font-black ${isDecreased ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {item.allottedCount ?? item.count}
                                {isDecreased && (
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                    (-{item.count - (item.allottedCount ?? item.count)})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending Issue</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">
                        Total {req.totalItems} distinct items:
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800 font-bold">
                        {req.totalQuantity} Req
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-black">
                        {req.status === 'FULFILLED'
                          ? req.items?.reduce((sum, it) => sum + (it.allottedCount ?? it.count), 0) ?? req.totalQuantity
                          : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Allotment Decrease Remarks Note */}
              {req.decreaseRemarks && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-800">Reason for Allotment Reduction: </span>
                    &quot;{req.decreaseRemarks}&quot;
                  </div>
                </div>
              )}

              {/* Dispatch Remarks if Fulfilled */}
              {req.stationaryRemarks && (
                <div className="text-xs text-emerald-700 pt-1">
                  <strong>Store Dispatch Note:</strong> &quot;{req.stationaryRemarks}&quot;
                  {req.stationaryActionAt && (
                    <span className="text-slate-500"> ({new Date(req.stationaryActionAt).toLocaleString()})</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fulfill / Decline Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  actionType === 'FULFILL' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {actionType === 'FULFILL' ? <PackageCheck className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {actionType === 'FULFILL' ? 'Issue & Allot Stationary Items' : 'Decline Stationary Order'}
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket: <strong className="text-slate-800">{selectedReq.id}</strong> • Dept: <strong className="text-slate-800">{selectedReq.department?.name}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {actionType === 'FULFILL'
                ? `Review the requested quantities below. You can modify the allotted quantity per item if stocks are constrained. If any item is decreased, please specify the reason in the remarks box.`
                : `Enter the reason why this order cannot be fulfilled.`}
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              {actionType === 'FULFILL' && (
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-3">Unit</th>
                          <th className="py-2 px-3 text-center">Requested</th>
                          <th className="py-2 px-3 text-center">Allotted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {editableItems.map((item, idx) => {
                          const isDecreased = item.allottedCount < item.count;
                          return (
                            <tr key={idx} className={isDecreased ? 'bg-amber-50/50' : 'hover:bg-slate-50/60'}>
                              <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {item.name}
                                {isDecreased && (
                                  <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                    Reduced
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-600">{item.unit || 'Nos'}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">{item.count}</td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={item.allottedCount}
                                  onChange={(e) => handleAllottedCountChange(idx, parseInt(e.target.value) || 0)}
                                  className={`w-20 px-2 py-1 text-center font-black rounded-lg border text-xs focus:outline-none ${
                                    isDecreased
                                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                                      : 'border-slate-300 bg-white text-emerald-700 focus:border-emerald-500'
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Decrease Remarks Box */}
                  {hasDecreasedItems && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 border border-amber-300 animate-fade-in">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Reason for Reducing Quantity Allotted (Required):</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={decreaseRemarks}
                        onChange={(e) => setDecreaseRemarks(e.target.value)}
                        placeholder="e.g. Partial stock currently in store, remaining quantity will be supplied in next procurement cycle."
                        className="w-full p-2.5 rounded-lg bg-white border border-amber-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {actionType === 'FULFILL' ? 'Store Dispatch Remarks / Gate Pass Ref:' : 'Decline Reason:'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder={
                    actionType === 'FULFILL'
                      ? 'e.g. Items packed and issued against Voucher #402. Ready for pickup.'
                      : 'e.g. Out of stock.'
                  }
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
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
                    actionType === 'FULFILL'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                      : 'bg-red-600 hover:bg-red-700 shadow-xs'
                  }`}
                >
                  {isProcessing
                    ? 'Processing...'
                    : actionType === 'FULFILL'
                    ? 'Confirm & Issue Stock'
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
export default StationaryDashboard;
