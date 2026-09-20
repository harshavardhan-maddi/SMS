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
  Filter,
  Car,
  Bus,
  Bike,
  Users,
  Calendar,
  Navigation,
  CheckCircle2,
  Trash2,
  Hotel,
  Coffee,
  Utensils,
  UtensilsCrossed,
  DoorClosed,
  Info
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  StationaryRequest,
  TransportRequest,
  TransportType,
  TransportRequestStatus,
  RefreshmentAccommodationRequest,
  RAStatus
} from '../types';
import { toast } from 'react-hot-toast';

export const AODashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  // Top-Level Active Module: 'STR' (Stationary) or 'TR' (Transport) or 'RA' (Refreshments & Accommodations)
  const [activeModule, setActiveModule] = useState<'STR' | 'TR' | 'RA'>('STR');

  // STR State
  const [requests, setRequests] = useState<StationaryRequest[]>([]);
  const [loadingSTR, setLoadingSTR] = useState(true);
  const [activeTabSTR, setActiveTabSTR] = useState<'pending' | 'all'>('pending');
  const [searchQuerySTR, setSearchQuerySTR] = useState('');

  // STR Action Modal State
  const [selectedReq, setSelectedReq] = useState<StationaryRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [isProcessingSTR, setIsProcessingSTR] = useState(false);

  // TR State
  const [transportRequests, setTransportRequests] = useState<TransportRequest[]>([]);
  const [loadingTR, setLoadingTR] = useState(true);
  const [activeTabTR, setActiveTabTR] = useState<'pending' | 'all'>('pending');
  const [searchQueryTR, setSearchQueryTR] = useState('');

  // TR Action Modal State
  const [selectedTR, setSelectedTR] = useState<TransportRequest | null>(null);
  const [trActionType, setTrActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [allocatedVehicle, setAllocatedVehicle] = useState('');
  const [allocatedVehicleCount, setAllocatedVehicleCount] = useState<number>(0);
  const [trRemarks, setTrRemarks] = useState('');
  const [isProcessingTR, setIsProcessingTR] = useState(false);

  // RA State
  const [raRequests, setRaRequests] = useState<RefreshmentAccommodationRequest[]>([]);
  const [loadingRA, setLoadingRA] = useState(true);
  const [activeTabRA, setActiveTabRA] = useState<'pending' | 'all'>('pending');
  const [searchQueryRA, setSearchQueryRA] = useState('');

  // RA Action Modal State
  const [selectedRA, setSelectedRA] = useState<RefreshmentAccommodationRequest | null>(null);
  const [raActionType, setRaActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [assignedHotel, setAssignedHotel] = useState('');
  const [assignedRestaurant, setAssignedRestaurant] = useState('');
  const [raRemarks, setRaRemarks] = useState('');
  const [isProcessingRA, setIsProcessingRA] = useState(false);

  // Fetch STR Requests
  const fetchSTRRequests = async () => {
    setLoadingSTR(true);
    try {
      const res = await api.get('/stationary/requests');
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load AO stationary requests:', err);
      toast.error('Failed to load stationary requests.');
    } finally {
      setLoadingSTR(false);
    }
  };

  // Fetch TR Requests
  const fetchTRRequests = async () => {
    setLoadingTR(true);
    try {
      const res = await api.get('/transport/requests');
      setTransportRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load AO transport requests:', err);
      toast.error('Failed to load transport requests.');
    } finally {
      setLoadingTR(false);
    }
  };

  // Fetch RA Requests
  const fetchRARequests = async () => {
    setLoadingRA(true);
    try {
      const res = await api.get('/ra/requests');
      setRaRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load AO R&A requests:', err);
      toast.error('Failed to load Refreshments & Accommodations requests.');
    } finally {
      setLoadingRA(false);
    }
  };

  useEffect(() => {
    fetchSTRRequests();
    fetchTRRequests();
    fetchRARequests();
    const poll = setInterval(() => {
      fetchSTRRequests();
      fetchTRRequests();
      fetchRARequests();
    }, 3000);
    return () => clearInterval(poll);
  }, [dashboardTick]);

  // STR Action Handlers
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

    setIsProcessingSTR(true);
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
      fetchSTRRequests();
    } catch (err: any) {
      console.error('Failed to process AO action:', err);
      toast.error(err.response?.data || 'Failed to update request.');
    } finally {
      setIsProcessingSTR(false);
    }
  };

  // TR Action Handlers
  const handleOpenTRActionModal = (tr: TransportRequest, type: 'APPROVE' | 'REJECT') => {
    setSelectedTR(tr);
    setTrActionType(type);
    if (type === 'APPROVE') {
      const defaultVehicleName =
        tr.transportType === 'BUS'
          ? 'College Bus #03 (AP 29 TB 5678)'
          : tr.transportType === 'Car'
          ? 'Maruti Suzuki Ertiga White (TS 09 EQ 4321)'
          : 'Hero Splendor (TS 08 AB 1122)';
      setAllocatedVehicle(defaultVehicleName);
      setAllocatedVehicleCount(0);
      setTrRemarks('Vehicle allocated. Report at Main Gate porch 15 mins prior to departure.');
    } else {
      setAllocatedVehicle('');
      setAllocatedVehicleCount(0);
      setTrRemarks('Vehicle unavailable due to scheduled departmental fleet maintenance.');
    }
  };

  const handleConfirmTRAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTR || !trActionType) return;

    if (trActionType === 'APPROVE' && allocatedVehicleCount <= 0) {
      toast.error('Please enter the allocated vehicle count (must be at least 1).');
      return;
    }

    setIsProcessingTR(true);
    try {
      await api.patch(`/transport/requests/${selectedTR.id}/ao-action`, {
        action: trActionType,
        allocatedVehicle: allocatedVehicle.trim(),
        allocatedVehicleCount: allocatedVehicleCount,
        remarks: trRemarks.trim(),
      });

      toast.success(
        trActionType === 'APPROVE'
          ? `Transport Ticket ${selectedTR.id} approved! Vehicle ${allocatedVehicle} assigned.`
          : `Transport Ticket ${selectedTR.id} declined.`
      );

      setSelectedTR(null);
      setTrActionType(null);
      fetchTRRequests();
    } catch (err: any) {
      console.error('Failed to process AO transport action:', err);
      toast.error(err.response?.data || 'Failed to update transport request.');
    } finally {
      setIsProcessingTR(false);
    }
  };

  // RA Action Handlers
  const handleOpenRAActionModal = (ra: RefreshmentAccommodationRequest, type: 'APPROVE' | 'REJECT') => {
    setSelectedRA(ra);
    setRaActionType(type);
    if (type === 'APPROVE') {
      setAssignedHotel(ra.hasAccommodation && ra.accommodationType === 'Hotel' ? 'Hotel Grand Minerva (Deluxe Suite AC)' : '');
      setAssignedRestaurant(ra.hasRestaurantFood ? 'Sri Annapurna Catering / Dining Hall VIP' : '');
      setRaRemarks('Approved & coordinated. Necessary arrangements initiated.');
    } else {
      setAssignedHotel('');
      setAssignedRestaurant('');
      setRaRemarks('Arrangements could not be accommodated due to prior college guest commitments.');
    }
  };

  const handleConfirmRAAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRA || !raActionType) return;

    if (raActionType === 'APPROVE') {
      if (selectedRA.hasAccommodation && selectedRA.accommodationType === 'Hotel' && !assignedHotel.trim()) {
        toast.error('Please enter the assigned Hotel details.');
        return;
      }
      if (selectedRA.hasRestaurantFood && !assignedRestaurant.trim()) {
        toast.error('Please enter the assigned Restaurant / Caterer details.');
        return;
      }
    } else if (raActionType === 'REJECT') {
      if (!raRemarks.trim()) {
        toast.error('Please provide a mandatory reason for declining.');
        return;
      }
    }

    setIsProcessingRA(true);
    try {
      const res = await api.patch(`/ra/requests/${selectedRA.id}/ao-action`, {
        action: raActionType,
        assignedHotel: assignedHotel.trim(),
        assignedRestaurant: assignedRestaurant.trim(),
        remarks: raRemarks.trim(),
      });

      if (raActionType === 'APPROVE') {
        const isWarden = res.data.status === 'FORWARDED_WARDEN';
        toast.success(
          isWarden
            ? `Request ${selectedRA.id} approved! Forwarded to ${res.data.targetHostel || 'Hostel'} Warden desk.`
            : `Request ${selectedRA.id} approved and arrangements finalized!`
        );
      } else {
        toast.success(`Request ${selectedRA.id} declined.`);
      }

      setSelectedRA(null);
      setRaActionType(null);
      fetchRARequests();
    } catch (err: any) {
      console.error('Failed to process AO R&A action:', err);
      toast.error(err.response?.data || 'Failed to update request.');
    } finally {
      setIsProcessingRA(false);
    }
  };

  // Helpers
  const pendingSTRRequests = requests.filter((r) => r.status === 'PENDING_AO');
  const displayedSTRRequests = (activeTabSTR === 'pending' ? pendingSTRRequests : requests).filter((r) => {
    if (!searchQuerySTR.trim()) return true;
    const q = searchQuerySTR.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.requester?.name?.toLowerCase().includes(q) ||
      r.department?.name?.toLowerCase().includes(q) ||
      r.department?.code?.toLowerCase().includes(q)
    );
  });

  const pendingTRRequests = transportRequests.filter((r) => r.status === 'PENDING_AO');
  const displayedTRRequests = (activeTabTR === 'pending' ? pendingTRRequests : transportRequests).filter((r) => {
    if (!searchQueryTR.trim()) return true;
    const q = searchQueryTR.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q) ||
      r.transportType.toLowerCase().includes(q) ||
      r.requester?.name?.toLowerCase().includes(q) ||
      r.department?.name?.toLowerCase().includes(q) ||
      r.department?.code?.toLowerCase().includes(q) ||
      (r.allocatedVehicle && r.allocatedVehicle.toLowerCase().includes(q))
    );
  });

  const getVehicleIcon = (type: TransportType, className = 'w-4 h-4') => {
    switch (type) {
      case 'BUS':
        return <Bus className={className} />;
      case 'Bike':
        return <Bike className={className} />;
      case 'Car':
      default:
        return <Car className={className} />;
    }
  };

  const getTRStatusBadge = (status: TransportRequestStatus) => {
    switch (status) {
      case 'PENDING_AO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Awaiting Allocation
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Allocated / Confirmed
          </span>
        );
      case 'STARTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-800 animate-pulse">
            <Navigation className="w-3.5 h-3.5" /> Trip In Transit
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Completed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 border border-red-200 text-red-700">
            <XCircle className="w-3.5 h-3.5" /> Declined
          </span>
        );
      default:
        return null;
    }
  };

  const pendingRARequests = raRequests.filter((r) => r.status === 'PENDING_AO');
  const displayedRARequests = (activeTabRA === 'pending' ? pendingRARequests : raRequests).filter((r) => {
    if (!searchQueryRA.trim()) return true;
    const q = searchQueryRA.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      (r.accommodationPurpose || '').toLowerCase().includes(q) ||
      (r.hostelFoodPurpose || '').toLowerCase().includes(q) ||
      (r.teaSnacksPurpose || '').toLowerCase().includes(q) ||
      (r.restaurantFoodPurpose || '').toLowerCase().includes(q) ||
      (r.requester?.name || '').toLowerCase().includes(q) ||
      (r.department?.name || '').toLowerCase().includes(q) ||
      (r.department?.code || '').toLowerCase().includes(q)
    );
  });

  const getRAStatusBadge = (status: RAStatus) => {
    switch (status) {
      case 'PENDING_AO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Pending AO Review
          </span>
        );
      case 'APPROVED_AO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved by AO
          </span>
        );
      case 'FORWARDED_WARDEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 border border-purple-200 text-purple-800">
            <DoorClosed className="w-3.5 h-3.5" /> Forwarded to Warden
          </span>
        );
      case 'WARDEN_ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-800">
            <Building2 className="w-3.5 h-3.5" /> Rooms Assigned / Active
          </span>
        );
      case 'PARTIALLY_CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-300 text-amber-800">
            <DoorClosed className="w-3.5 h-3.5" /> Partial Checkout
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Completed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 border border-red-200 text-red-700">
            <XCircle className="w-3.5 h-3.5" /> Declined
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in text-slate-800">
      {/* Top Header Banner */}
      <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Administrative Officer (AO) Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Central Administrative Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Review college-wide Stationary Indents, Fleet Allocations, and Refreshments &amp; Accommodations.
          </p>
        </div>

        {/* Primary Module Switcher: STR vs TR vs RA */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setActiveModule('STR')}
            id="btn-ao-str-module"
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeModule === 'STR'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Stationary (STR)</span>
            {pendingSTRRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-amber-400 font-black">
                {pendingSTRRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveModule('TR')}
            id="btn-ao-tr-module"
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeModule === 'TR'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Transport (TR)</span>
            {pendingTRRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-emerald-800 font-black">
                {pendingTRRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveModule('RA')}
            id="btn-ao-ra-module"
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeModule === 'RA'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Hotel className="w-4 h-4" />
            <span>Hospitality (R&amp;A)</span>
            {pendingRARequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-rose-800 font-black">
                {pendingRARequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODULE 1: STATIONARY (STR) DESK */}
      {/* ========================================================================= */}
      {activeModule === 'STR' && (
        <div className="space-y-6">
          {/* Quick Metrics & Sub-Tabs */}
          <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTabSTR('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTabSTR === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pending Review ({pendingSTRRequests.length})</span>
              </button>

              <button
                onClick={() => setActiveTabSTR('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTabSTR === 'all'
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
                value={searchQuerySTR}
                onChange={(e) => setSearchQuerySTR(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Requests Feed */}
          {loadingSTR ? (
            <div className="text-center py-20 text-slate-500 text-xs">Loading stationary requests...</div>
          ) : displayedSTRRequests.length === 0 ? (
            <div className="admin-card text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-800">All caught up!</p>
              <p>No stationary requests awaiting review under this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedSTRRequests.map((req) => (
                <div
                  key={req.id}
                  className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-xs space-y-4 transition-all"
                >
                  {/* Header Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-900">{req.id}</span>
                        {req.status === 'PENDING_AO' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> Awaiting AO Decision
                          </span>
                        )}
                        {req.status === 'FORWARDED_TO_STATIONARY' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1.5">
                            <Truck className="w-3 h-3" /> Approved • At Stationary Store
                          </span>
                        )}
                        {req.status === 'FULFILLED' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5">
                            <CheckCheck className="w-3 h-3" /> Completed &amp; Dispatched
                          </span>
                        )}
                        {req.status.startsWith('REJECTED') && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 border border-red-200 text-red-700 flex items-center gap-1.5">
                            <XCircle className="w-3 h-3" /> Declined
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {req.department?.name || req.department?.code || 'Department'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {req.requester?.name} ({req.requester?.email})
                        </span>
                        <span>•</span>
                        <span>Submitted on {new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* AO Actions */}
                    {req.status === 'PENDING_AO' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenActionModal(req, 'REJECT')}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 border border-red-200 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleOpenActionModal(req, 'APPROVE')}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <span>Approve &amp; Forward to Store</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Purpose Box */}
                  {req.purpose && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <strong className="text-slate-500 block mb-0.5">Purpose / Subject:</strong>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                    </div>
                  )}

                  {/* Items Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Item Name</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-center">Unit</th>
                          <th className="py-2.5 px-4 text-center">Requested Qty</th>
                          <th className="py-2.5 px-4 text-center">Allotted Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {req.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-4 font-semibold text-slate-800">{it.name}</td>
                            <td className="py-2 px-4 text-slate-500">{it.category || 'General'}</td>
                            <td className="py-2 px-4 text-center text-slate-500">{it.unit || 'Nos'}</td>
                            <td className="py-2 px-4 text-center font-bold text-slate-900">{it.count}</td>
                            <td className="py-2 px-4 text-center font-bold text-emerald-700">
                              {it.allottedCount !== undefined ? it.allottedCount : it.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 2: TRANSPORT REQUESTS (TR) DESK */}
      {/* ========================================================================= */}
      {activeModule === 'TR' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Awaiting Vehicle Allotment</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{pendingTRRequests.length}</span>
            </div>
            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Allocated &amp; Ready</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {transportRequests.filter((r) => r.status === 'APPROVED').length}
              </span>
            </div>
            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Active In Transit</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {transportRequests.filter((r) => r.status === 'STARTED').length}
              </span>
            </div>
            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Transport Indents</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{transportRequests.length}</span>
            </div>
          </div>

          {/* Sub-Tabs & Search */}
          <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTabTR('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTabTR === 'pending'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pending Allotment ({pendingTRRequests.length})</span>
              </button>

              <button
                onClick={() => setActiveTabTR('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTabTR === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>All Transport ({transportRequests.length})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ticket, Dept, vehicle, purpose..."
                value={searchQueryTR}
                onChange={(e) => setSearchQueryTR(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Transport Requests Feed */}
          {loadingTR ? (
            <div className="text-center py-20 text-slate-500 text-xs">Loading transport requests...</div>
          ) : displayedTRRequests.length === 0 ? (
            <div className="admin-card text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-800">No transport requests found</p>
              <p>All transport requests have been reviewed or no entries match your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedTRRequests.map((tr) => (
                <div
                  key={tr.id}
                  className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-xs space-y-4 transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white flex items-center gap-1.5">
                          {getVehicleIcon(tr.transportType)}
                          {tr.transportType}
                        </span>
                        <span className="text-lg font-black text-slate-900">{tr.id}</span>
                        {getTRStatusBadge(tr.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {tr.department?.name || tr.department?.code || 'Department'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {tr.requester?.name} ({tr.requester?.email})
                        </span>
                        <span>•</span>
                        <span>Submitted {new Date(tr.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* AO Action Triggers */}
                    {tr.status === 'PENDING_AO' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenTRActionModal(tr, 'REJECT')}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 border border-red-200 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleOpenTRActionModal(tr, 'APPROVE')}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <span>Allocate Vehicle &amp; Accept</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Purpose */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <strong className="text-slate-500 block mb-0.5">Purpose of Journey:</strong>
                    <span className="text-slate-800 font-semibold">{tr.purpose}</span>
                  </div>

                  {/* Travel Parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Passengers</span>
                      <strong className="text-slate-900 text-sm">{tr.personCount} Persons</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Travel Date</span>
                      <strong className="text-slate-900 text-sm">{tr.startDate}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Start Timing</span>
                      <strong className="text-slate-900 text-sm">{tr.startTime}</strong>
                    </div>
                  </div>

                  {/* Allocated Vehicle Box */}
                  {tr.allocatedVehicle && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide block">
                          Allocated Vehicle
                        </span>
                        <strong className="text-slate-900 text-sm">{tr.allocatedVehicle}</strong>
                        {tr.aoRemarks && <p className="text-emerald-800 text-xs italic mt-0.5">"{tr.aoRemarks}"</p>}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 self-start sm:self-auto">
                        Count: {tr.allocatedVehicleCount || 1}
                      </span>
                    </div>
                  )}

                  {/* Decline Reason */}
                  {tr.status === 'REJECTED' && tr.aoRemarks && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs">
                      <span className="font-bold text-red-900 block mb-0.5">AO Decline Reason:</span>
                      <span className="text-red-800 italic">"{tr.aoRemarks}"</span>
                    </div>
                  )}

                  {/* Live Timings Timeline */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                    <span>Submitted: <strong>{new Date(tr.createdAt).toLocaleTimeString()}</strong></span>
                    {tr.aoActionAt && (
                      <span>Allocated: <strong className="text-emerald-700">{new Date(tr.aoActionAt).toLocaleTimeString()}</strong></span>
                    )}
                    {tr.tripStartedAt && (
                      <span>Departed: <strong className="text-blue-700">{new Date(tr.tripStartedAt).toLocaleTimeString()}</strong></span>
                    )}
                    {tr.tripEndedAt && (
                      <span>Completed: <strong className="text-slate-900">{new Date(tr.tripEndedAt).toLocaleTimeString()}</strong></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODULE 3: REFRESHMENTS & ACCOMMODATIONS (R&A) DESK */}
      {/* ========================================================================= */}
      {activeModule === 'RA' && (
        <div className="space-y-6">
          {/* Quick Metrics & Sub-Tabs */}
          <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTabRA('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTabRA === 'pending'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Action Required ({pendingRARequests.length})</span>
              </button>

              <button
                onClick={() => setActiveTabRA('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTabRA === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>All Hospitality Indents ({raRequests.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQueryRA}
                onChange={(e) => setSearchQueryRA(e.target.value)}
                placeholder="Search ticket, dept, requester..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* List of RA Cards */}
          {loadingRA ? (
            <div className="text-center py-20 text-slate-500 text-xs">Loading hospitality requests...</div>
          ) : displayedRARequests.length === 0 ? (
            <div className="admin-card text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <CheckCircle className="w-10 h-10 mx-auto text-rose-500" />
              <p className="text-sm font-bold text-slate-800">No hospitality requests found</p>
              <p>All hospitality requests have been reviewed or no entries match your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedRARequests.map((ra) => {
                const isBoysHostel = ra.accommodationType === 'Boys Hostel' || ra.targetHostel === 'Boys Hostel';
                const isGirlsHostel = ra.accommodationType === 'Girls Hostel' || ra.targetHostel === 'Girls Hostel';

                return (
                  <div
                    key={ra.id}
                    className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-rose-300 shadow-xs space-y-4 transition-all"
                  >
                    {/* Top Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white flex items-center gap-1.5">
                            <Hotel className="w-3.5 h-3.5" />
                            R&amp;A
                          </span>
                          <span className="text-lg font-black text-slate-900">{ra.id}</span>
                          {getRAStatusBadge(ra.status)}

                          {/* Live remaining badge */}
                          {ra.totalGuests > 0 && ra.status === 'PARTIALLY_CHECKED_OUT' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold border border-amber-300">
                              {ra.stillInHostel} still in that hostel ({ra.checkedOutCount}/{ra.totalGuests} checked out)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-bold text-slate-800">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {ra.department?.name || ra.department?.code || 'Department'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {ra.requester?.name} ({ra.requester?.email})
                          </span>
                          <span>•</span>
                          <span>Submitted {new Date(ra.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action Buttons (for Pending AO) */}
                      {ra.status === 'PENDING_AO' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenRAActionModal(ra, 'APPROVE')}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept Request</span>
                          </button>
                          <button
                            onClick={() => handleOpenRAActionModal(ra, 'REJECT')}
                            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-all border border-red-200 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Services Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Accommodation Item */}
                      {ra.hasAccommodation ? (
                        <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 text-xs space-y-1">
                          <div className="font-bold text-rose-800 flex items-center gap-1.5">
                            <Hotel className="w-4 h-4" />
                            <span>Stay: {ra.accommodationType}</span>
                          </div>
                          <div className="text-slate-700 font-semibold">{ra.accommodationPersonsCount} Persons</div>
                          <div className="text-slate-500 text-[11px]">{ra.accommodationFromDate} to {ra.accommodationToDate}</div>
                          <div className="text-slate-600 italic truncate mt-1">"{ra.accommodationPurpose}"</div>
                        </div>
                      ) : null}

                      {/* Tea & Snacks Item */}
                      {ra.hasTeaSnacks ? (
                        <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs space-y-1">
                          <div className="font-bold text-purple-800 flex items-center gap-1.5">
                            <Coffee className="w-4 h-4" />
                            <span>Tea &amp; Snacks</span>
                          </div>
                          <div className="text-slate-700 font-semibold">{ra.teaCount} Teas • {ra.snacksCount} Snacks</div>
                          <div className="text-slate-500 text-[11px]">{ra.teaSnacksFromDate} to {ra.teaSnacksToDate}</div>
                          <div className="text-slate-600 italic truncate mt-1">"{ra.teaSnacksPurpose}"</div>
                        </div>
                      ) : null}

                      {/* Hostel Food Item */}
                      {ra.hasHostelFood ? (
                        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-1">
                          <div className="font-bold text-amber-800 flex items-center gap-1.5">
                            <Utensils className="w-4 h-4" />
                            <span>Hostel Food ({ra.targetHostel || 'Mess'})</span>
                          </div>
                          <div className="text-slate-700 font-semibold">{ra.hostelFoodPersonsCount} Pax • {ra.hostelFoodRoomsCount} Rooms</div>
                          <div className="text-slate-500 text-[11px]">{ra.hostelFoodFromDate} to {ra.hostelFoodToDate}</div>
                          <div className="text-slate-600 italic truncate mt-1">"{ra.hostelFoodPurpose}"</div>
                        </div>
                      ) : null}

                      {/* Restaurant Food Item */}
                      {ra.hasRestaurantFood ? (
                        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs space-y-1">
                          <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                            <UtensilsCrossed className="w-4 h-4" />
                            <span>Restaurant Dining</span>
                          </div>
                          <div className="text-slate-700 font-semibold">{ra.vegCount} Veg • {ra.nonVegCount} Non-Veg</div>
                          <div className="text-slate-500 text-[11px]">Serving: {ra.restaurantFoodFromDate}</div>
                          <div className="text-slate-600 italic truncate mt-1">"{ra.restaurantFoodPurpose}"</div>
                        </div>
                      ) : null}
                    </div>

                    {/* Routing Explanatory Note */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          {isBoysHostel && 'Boys Hostel request: Upon AO acceptance, forwarded to the Boys Hostel Warden desk for room allotment.'}
                          {isGirlsHostel && 'Girls Hostel request: Upon AO acceptance, forwarded to the Girls Hostel Warden desk for room allotment.'}
                          {!isBoysHostel && !isGirlsHostel && 'AO directly coordinates external hotel bookings and restaurant arrangements.'}
                        </span>
                      </div>
                      {ra.aoAssignedHotel && (
                        <span className="text-blue-700 font-bold text-xs">Hotel: {ra.aoAssignedHotel}</span>
                      )}
                      {ra.wardenAssignedRooms && (
                        <span className="text-indigo-700 font-bold text-xs">Rooms: {ra.wardenAssignedRooms}</span>
                      )}
                    </div>

                    {/* Declined Reason */}
                    {ra.status === 'REJECTED' && ra.aoRemarks && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs">
                        <span className="font-bold text-red-900 block mb-0.5">AO Decline Reason:</span>
                        <span className="text-red-800 italic">"{ra.aoRemarks}"</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STR ACTION MODAL */}
      {/* ========================================================================= */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  actionType === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {actionType === 'APPROVE' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
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
                  disabled={isProcessingSTR}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                      : 'bg-red-600 hover:bg-red-700 shadow-xs'
                  }`}
                >
                  {isProcessingSTR
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

      {/* ========================================================================= */}
      {/* TR ACTION MODAL (VEHICLE ALLOCATION) */}
      {/* ========================================================================= */}
      {selectedTR && trActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  trActionType === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {trActionType === 'APPROVE' ? <Car className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {trActionType === 'APPROVE'
                    ? 'Allocate Vehicle & Confirm Transport'
                    : 'Decline Transport Request'}
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket: <strong className="text-slate-800">{selectedTR.id}</strong> • Requester:{' '}
                  <strong className="text-slate-800">{selectedTR.requester?.name}</strong> ({selectedTR.department?.name})
                </p>
              </div>
            </div>

            {/* Travel Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Transport Requested:</span>
                <strong className="text-slate-900">{selectedTR.transportType} ({selectedTR.personCount} Persons)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Travel Timing:</span>
                <strong className="text-slate-900">{selectedTR.startDate} at {selectedTR.startTime}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Purpose:</span>
                <span className="text-slate-800 truncate max-w-xs">{selectedTR.purpose}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmTRAction} className="space-y-4">
              {trActionType === 'APPROVE' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Allocated Vehicle Details / Registration No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={allocatedVehicle}
                      onChange={(e) => setAllocatedVehicle(e.target.value)}
                      placeholder="e.g. College Bus #04 (AP 29 TB 5678) OR Innova Crysta (TS 09 EQ 4321)"
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Vehicle Count Allocated <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      required
                      placeholder="0"
                      value={allocatedVehicleCount}
                      onChange={(e) => setAllocatedVehicleCount(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Instructions / Notes for Driver or HOD:</label>
                    <textarea
                      rows={2}
                      value={trRemarks}
                      onChange={(e) => setTrRemarks(e.target.value)}
                      placeholder="e.g. Report at Main Porch, Driver Mr. Ramesh (98480xxxxx)"
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Reason for Declining Transport <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={trRemarks}
                    onChange={(e) => setTrRemarks(e.target.value)}
                    placeholder="Enter mandatory reason for declining request..."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTR(null);
                    setTrActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingTR}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                    trActionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                      : 'bg-red-600 hover:bg-red-700 shadow-xs'
                  }`}
                >
                  {isProcessingTR
                    ? 'Processing...'
                    : trActionType === 'APPROVE'
                    ? 'Confirm & Allocate Vehicle'
                    : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RA ACTION MODAL */}
      {/* ========================================================================= */}
      {selectedRA && raActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  raActionType === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {raActionType === 'APPROVE' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {raActionType === 'APPROVE' ? 'Accept & Process Request' : 'Decline Request'}
                </h3>
                <p className="text-xs text-slate-500">
                  Ticket #{selectedRA.id} • {selectedRA.department?.name || 'Department'}
                </p>
              </div>
            </div>

            {/* Forwarding Notice */}
            {raActionType === 'APPROVE' && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                <span className="font-bold block">Hospitality Workflow Routing:</span>
                {(selectedRA.accommodationType === 'Boys Hostel' || selectedRA.targetHostel === 'Boys Hostel') ? (
                  <p>Status will move to <strong>FORWARDED_WARDEN</strong> and immediately appear on the <strong>Boys Hostel Warden</strong> desk for room allocation &amp; food coordination.</p>
                ) : (selectedRA.accommodationType === 'Girls Hostel' || selectedRA.targetHostel === 'Girls Hostel') ? (
                  <p>Status will move to <strong>FORWARDED_WARDEN</strong> and immediately appear on the <strong>Girls Hostel Warden</strong> desk for room allocation &amp; food coordination.</p>
                ) : (
                  <p>Status will be <strong>APPROVED_AO</strong> and external hotel / restaurant arrangements will be marked confirmed.</p>
                )}
              </div>
            )}

            <form onSubmit={handleConfirmRAAction} className="space-y-4">
              {raActionType === 'APPROVE' ? (
                <>
                  {/* Hotel Details (if hotel accommodation requested) */}
                  {selectedRA.hasAccommodation && selectedRA.accommodationType === 'Hotel' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Assigned Hotel Name &amp; Booking Details <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={assignedHotel}
                        onChange={(e) => setAssignedHotel(e.target.value)}
                        placeholder="e.g. Hotel Grand Minerva, AC Suite 201 & 202"
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}

                  {/* Restaurant Details (if restaurant food requested) */}
                  {selectedRA.hasRestaurantFood && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Assigned Restaurant / Caterer Name &amp; Menu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={assignedRestaurant}
                        onChange={(e) => setAssignedRestaurant(e.target.value)}
                        placeholder="e.g. Sri Annapurna Caterers - VIP Dining Hall Buffet"
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">AO Instructions / Remarks:</label>
                    <textarea
                      rows={2}
                      value={raRemarks}
                      onChange={(e) => setRaRemarks(e.target.value)}
                      placeholder="e.g. Approved and coordinated. Necessary arrangements initiated."
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Reason for Declining Request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={raRemarks}
                    onChange={(e) => setRaRemarks(e.target.value)}
                    placeholder="Enter mandatory reason for declining request..."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRA(null);
                    setRaActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRA}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                    raActionType === 'APPROVE'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-xs'
                      : 'bg-red-600 hover:bg-red-700 shadow-xs'
                  }`}
                >
                  {isProcessingRA
                    ? 'Processing...'
                    : raActionType === 'APPROVE'
                    ? 'Confirm & Process'
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
