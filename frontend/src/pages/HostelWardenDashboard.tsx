import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Building2,
  DoorClosed,
  DoorOpen,
  Hotel,
  Coffee,
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  Search,
  Calendar,
  CheckCheck,
  ShieldCheck,
  Info,
  LogOut,
  BedDouble,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RefreshmentAccommodationRequest, RAStatus } from '../types';

export const HostelWardenDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const isBoysWarden = user?.role === 'ROLE_BOYS_HOSTEL_WARDEN';
  const hostelTitle = isBoysWarden ? 'Boys Hostel' : 'Girls Hostel';

  const [requests, setRequests] = useState<RefreshmentAccommodationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign Rooms Modal State
  const [assignModalReq, setAssignModalReq] = useState<RefreshmentAccommodationRequest | null>(null);
  const [assignedRooms, setAssignedRooms] = useState('');
  const [wardenRemarks, setWardenRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Checkout Modal State
  const [checkoutModalReq, setCheckoutModalReq] = useState<RefreshmentAccommodationRequest | null>(null);
  const [checkoutInputCount, setCheckoutInputCount] = useState<number | string>(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fetch Requests
  const fetchWardenRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ra/requests');
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load hostel requests:', err);
      toast.error('Failed to load hostel requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardenRequests();
    const poll = setInterval(fetchWardenRequests, 3000);
    return () => clearInterval(poll);
  }, [dashboardTick]);

  // Handlers: Assign Rooms
  const handleOpenAssignModal = (req: RefreshmentAccommodationRequest) => {
    setAssignModalReq(req);
    setAssignedRooms(req.wardenAssignedRooms || (isBoysWarden ? 'Block A - Rooms 101, 102' : 'Block G - Rooms 201, 202'));
    setWardenRemarks(req.wardenRemarks || 'Room keys ready at warden reception desk.');
  };

  const handleConfirmAssignRooms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalReq) return;

    if (assignModalReq.hasAccommodation && !assignedRooms.trim()) {
      toast.error('Please specify the assigned room numbers / block.');
      return;
    }

    setIsAssigning(true);
    try {
      await api.patch(`/ra/requests/${assignModalReq.id}/warden-assign`, {
        assignedRooms: assignedRooms.trim(),
        remarks: wardenRemarks.trim(),
      });
      toast.success(`Request ${assignModalReq.id} rooms assigned! Guests may now occupy rooms.`);
      setAssignModalReq(null);
      fetchWardenRequests();
    } catch (err: any) {
      console.error('Failed to assign rooms:', err);
      toast.error(err.response?.data || 'Failed to assign rooms.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handlers: Checkout
  const handleOpenCheckoutModal = (req: RefreshmentAccommodationRequest) => {
    setCheckoutModalReq(req);
    setCheckoutInputCount(0);
  };

  const handleConfirmCheckout = async (checkoutAll: boolean) => {
    if (!checkoutModalReq) return;

    const countNum = Number(checkoutInputCount) || 0;
    if (!checkoutAll && countNum <= 0) {
      toast.error('Please enter a valid number of candidates checking out (at least 1).');
      return;
    }

    setIsCheckingOut(true);
    try {
      const res = await api.patch(`/ra/requests/${checkoutModalReq.id}/warden-checkout`, {
        checkoutCount: countNum,
        checkoutAll,
      });

      const updatedReq = res.data;
      if (updatedReq.status === 'COMPLETED') {
        toast.success(`All ${updatedReq.totalGuests} guests have checked out of ${hostelTitle}! Request completed.`);
      } else {
        toast.success(`Checkout recorded! ${updatedReq.stillInHostel} still in that hostel.`);
      }

      setCheckoutModalReq(null);
      fetchWardenRequests();
    } catch (err: any) {
      console.error('Failed to update checkout:', err);
      toast.error(err.response?.data || 'Failed to update checkout.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Filtered requests
  const pendingRequests = requests.filter((r) => r.status === 'FORWARDED_WARDEN');
  const activeRequests = requests.filter((r) => r.status === 'WARDEN_ASSIGNED' || r.status === 'PARTIALLY_CHECKED_OUT');
  const completedRequests = requests.filter((r) => r.status === 'COMPLETED');

  const displayedRequests = useMemo(() => {
    let list = requests;
    if (activeTab === 'pending') list = pendingRequests;
    else if (activeTab === 'active') list = activeRequests;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        (r.requester?.name || '').toLowerCase().includes(q) ||
        (r.department?.name || '').toLowerCase().includes(q) ||
        (r.accommodationPurpose || '').toLowerCase().includes(q) ||
        (r.hostelFoodPurpose || '').toLowerCase().includes(q) ||
        (r.wardenAssignedRooms || '').toLowerCase().includes(q)
    );
  }, [requests, activeTab, searchQuery, pendingRequests, activeRequests]);

  // Helper Badge
  const getStatusBadge = (status: RAStatus) => {
    switch (status) {
      case 'FORWARDED_WARDEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 border border-purple-200 text-purple-800 animate-pulse">
            <DoorClosed className="w-3.5 h-3.5" /> Awaiting Room Allotment
          </span>
        );
      case 'WARDEN_ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-800">
            <Building2 className="w-3.5 h-3.5" /> Rooms Assigned &amp; Occupied
          </span>
        );
      case 'PARTIALLY_CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-300 text-amber-800">
            <DoorOpen className="w-3.5 h-3.5" /> Partial Checkout Ongoing
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Fully Checked Out
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in text-slate-800">
      {/* 1. Top Banner */}
      <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            {hostelTitle} Warden Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {hostelTitle} Accommodation &amp; Guest Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Accept forwarded guest indents from AO, assign rooms, coordinate mess dining, and track live candidate checkout numbers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Warden Desk: <strong>{user?.name}</strong> ({user?.email})</span>
        </div>
      </div>

      {/* 2. Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="admin-card p-5 bg-white border-l-4 border-purple-500">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Awaiting Allotment</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{pendingRequests.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Forwarded by AO</div>
        </div>

        <div className="admin-card p-5 bg-white border-l-4 border-indigo-500">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Currently Occupied</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{activeRequests.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active in {hostelTitle}</div>
        </div>

        <div className="admin-card p-5 bg-white border-l-4 border-emerald-500">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{completedRequests.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All guests departed</div>
        </div>

        <div className="admin-card p-5 bg-white border-l-4 border-slate-700">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hosted</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{requests.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Hospitality records</div>
        </div>
      </div>

      {/* 3. Subtabs and Search Bar */}
      <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting Allotment ({pendingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Active Occupancy &amp; Checkouts ({activeRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Requests ({requests.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket, dept, rooms, guests..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 4. Requests List */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 text-xs">Loading {hostelTitle} requests...</div>
      ) : displayedRequests.length === 0 ? (
        <div className="admin-card text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-indigo-500" />
          <p className="text-sm font-bold text-slate-800">No requests in this queue</p>
          <p>All guest accommodations for {hostelTitle} are up to date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRequests.map((req) => (
            <div
              key={req.id}
              className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-xs space-y-4 transition-all"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {hostelTitle}
                    </span>
                    <span className="text-lg font-black text-slate-900">{req.id}</span>
                    {getStatusBadge(req.status)}

                    {/* Prominent Live Remaining in Hostel Counter */}
                    {req.totalGuests > 0 && req.status === 'PARTIALLY_CHECKED_OUT' && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300 animate-pulse flex items-center gap-1.5">
                        <DoorClosed className="w-3.5 h-3.5 text-amber-700" />
                        <span>{req.stillInHostel} still in that hostel</span>
                      </span>
                    )}

                    {req.totalGuests > 0 && req.status === 'COMPLETED' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>All {req.totalGuests} candidates checked out</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-bold text-slate-800">
                      Dept: {req.department?.name || req.department?.code || 'Department'}
                    </span>
                    <span>•</span>
                    <span>Requested by {req.requester?.name}</span>
                    <span>•</span>
                    <span>Approved by AO ({req.aoActionBy?.name || 'AO'})</span>
                    <span>•</span>
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  {req.status === 'FORWARDED_WARDEN' && (
                    <button
                      onClick={() => handleOpenAssignModal(req)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <BedDouble className="w-4 h-4" />
                      <span>Assign Rooms &amp; Accept</span>
                    </button>
                  )}

                  {(req.status === 'WARDEN_ASSIGNED' || req.status === 'PARTIALLY_CHECKED_OUT') && (
                    <button
                      onClick={() => handleOpenCheckoutModal(req)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <DoorOpen className="w-4 h-4" />
                      <span>Record Candidate Checkout</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Service Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {req.hasAccommodation && (
                  <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1">
                    <div className="font-bold text-rose-800 flex items-center gap-1.5">
                      <Hotel className="w-3.5 h-3.5" />
                      <span>Overnight Accommodation</span>
                    </div>
                    <div className="text-slate-700 font-semibold">{req.accommodationPersonsCount} Guests</div>
                    <div className="text-slate-500 text-[11px]">{req.accommodationFromDate} to {req.accommodationToDate}</div>
                    <div className="text-slate-600 italic truncate mt-1">"{req.accommodationPurpose}"</div>
                  </div>
                )}

                {req.hasTeaSnacks && (
                  <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1">
                    <div className="font-bold text-purple-800 flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Tea &amp; Snacks ({req.targetHostel || hostelTitle})</span>
                    </div>
                    <div className="text-slate-700 font-semibold">{req.teaCount} Teas • {req.snacksCount} Snacks</div>
                    <div className="text-slate-500 text-[11px]">{req.teaSnacksFromDate} to {req.teaSnacksToDate}</div>
                    <div className="text-slate-600 italic truncate mt-1">"{req.teaSnacksPurpose}"</div>
                  </div>
                )}

                {req.hasHostelFood && (
                  <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-800 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Hostel Mess Dining</span>
                    </div>
                    <div className="text-slate-700 font-semibold">{req.hostelFoodPersonsCount} Persons • {req.hostelFoodRoomsCount} Rooms</div>
                    <div className="text-slate-500 text-[11px]">{req.hostelFoodFromDate} to {req.hostelFoodToDate}</div>
                    <div className="text-slate-600 italic truncate mt-1">"{req.hostelFoodPurpose}"</div>
                  </div>
                )}
              </div>

              {/* Assigned Rooms & Occupancy Progress Bar */}
              {req.wardenAssignedRooms && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-900">
                        Assigned Hostel Rooms: <span className="text-indigo-700">{req.wardenAssignedRooms}</span>
                      </span>
                    </div>
                    {req.totalGuests > 0 && (
                      <div className="text-slate-600 text-xs">
                        Occupancy: <strong>{req.checkedOutCount}</strong> of <strong>{req.totalGuests}</strong> checked out (<strong>{req.stillInHostel}</strong> remaining)
                      </div>
                    )}
                  </div>

                  {req.totalGuests > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((req.checkedOutCount / req.totalGuests) * 100))}%` }}
                      />
                    </div>
                  )}

                  {req.wardenRemarks && (
                    <div className="text-[11px] text-slate-500 italic">
                      Warden Remarks: "{req.wardenRemarks}"
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: ASSIGN ROOMS */}
      {assignModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Assign Rooms &amp; Accept Request
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket #{assignModalReq.id} • {assignModalReq.accommodationPersonsCount || assignModalReq.totalGuests} Guests
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmAssignRooms} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Assigned Room Numbers &amp; Block Details <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assignedRooms}
                  onChange={(e) => setAssignedRooms(e.target.value)}
                  placeholder="e.g. Block A - Rooms 101, 102, 103"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Warden Instructions / Notes:</label>
                <textarea
                  rows={2}
                  value={wardenRemarks}
                  onChange={(e) => setWardenRemarks(e.target.value)}
                  placeholder="e.g. Clean bed linen provided, keys ready at reception..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalReq(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Room Allotment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD CHECKOUT */}
      {checkoutModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Record Candidate Checkout
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket #{checkoutModalReq.id} • {checkoutModalReq.department?.name || 'Department'}
                </p>
              </div>
            </div>

            {/* Occupancy Status Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Guests Hosted:</span>
                <strong className="text-slate-900">{checkoutModalReq.totalGuests} Guests</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Checked Out:</span>
                <strong className="text-emerald-700">{checkoutModalReq.checkedOutCount} Guests</strong>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Currently Still in Hostel:</span>
                <strong className="text-amber-700 font-black">{checkoutModalReq.stillInHostel} Candidates</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Number of Candidates Checking Out Now (Default: 0)
                </label>
                <input
                  type="number"
                  min={0}
                  max={checkoutModalReq.stillInHostel}
                  value={checkoutInputCount}
                  onChange={(e) => setCheckoutInputCount(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500">
                  Enter how many guests are departing right now (e.g. 7). The remaining {Math.max(0, checkoutModalReq.stillInHostel - (Number(checkoutInputCount) || 0))} will show as still in hostel.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCheckingOut}
                  onClick={() => handleConfirmCheckout(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Checkout All ({checkoutModalReq.stillInHostel} Remaining)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutModalReq(null)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isCheckingOut || Number(checkoutInputCount) <= 0}
                    onClick={() => handleConfirmCheckout(false)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCheckingOut ? 'Saving...' : `Checkout (${checkoutInputCount})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
