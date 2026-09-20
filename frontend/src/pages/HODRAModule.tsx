import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Hotel,
  Coffee,
  Utensils,
  UtensilsCrossed,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  Sparkles,
  HelpCircle,
  FileText,
  ChevronRight,
  Info,
  Trash2,
  BedDouble,
  ShieldCheck,
  CheckCheck,
  Building2,
  DoorClosed,
  LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RefreshmentAccommodationRequest, AccommodationType, RAStatus } from '../types';

interface HODRAModuleProps {
  onSwitchToSMS: () => void;
  onSwitchToSHR?: () => void;
  onSwitchToSTR?: () => void;
  onSwitchToTR?: () => void;
}

export const HODRAModule: React.FC<HODRAModuleProps> = ({
  onSwitchToSMS,
  onSwitchToSHR,
  onSwitchToSTR,
  onSwitchToTR,
}) => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'new_req'>('dashboard');
  const [requests, setRequests] = useState<RefreshmentAccommodationRequest[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingAO: 0,
    forwardedWarden: 0,
    wardenAssigned: 0,
    activeHostel: 0,
    completed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  // Form State: Multi-service toggles
  const [hasAccommodation, setHasAccommodation] = useState(false);
  const [accommodationType, setAccommodationType] = useState<AccommodationType>('Boys Hostel');
  const [accommodationPurpose, setAccommodationPurpose] = useState('');
  const [accommodationPersonsCount, setAccommodationPersonsCount] = useState<number | string>(0);
  const [accommodationRoomsCount, setAccommodationRoomsCount] = useState<number | string>(0);
  const [accommodationFromDate, setAccommodationFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [accommodationToDate, setAccommodationToDate] = useState(new Date().toISOString().split('T')[0]);

  // Target Hostel for Tea/Hostel Food when accommodation isn't selected or specified
  const [targetHostel, setTargetHostel] = useState<'Boys Hostel' | 'Girls Hostel'>('Boys Hostel');

  // Tea & Snacks State
  const [hasTeaSnacks, setHasTeaSnacks] = useState(false);
  const [teaSnacksVenue, setTeaSnacksVenue] = useState<'Boys Hostel' | 'Girls Hostel' | 'Campus'>('Boys Hostel');
  const [teaSnacksFromDate, setTeaSnacksFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [teaSnacksToDate, setTeaSnacksToDate] = useState(new Date().toISOString().split('T')[0]);
  const [teaCount, setTeaCount] = useState<number | string>(0);
  const [snacksCount, setSnacksCount] = useState<number | string>(0);
  const [teaSnacksPurpose, setTeaSnacksPurpose] = useState('');

  // Hostel Food State
  const [hasHostelFood, setHasHostelFood] = useState(false);
  const [hostelFoodType, setHostelFoodType] = useState<'Boys Hostel' | 'Girls Hostel'>('Boys Hostel');
  const [hostelFoodPersonsCount, setHostelFoodPersonsCount] = useState<number | string>(0);
  const [hostelFoodRoomsCount, setHostelFoodRoomsCount] = useState<number | string>(0);
  const [hostelFoodFromDate, setHostelFoodFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [hostelFoodToDate, setHostelFoodToDate] = useState(new Date().toISOString().split('T')[0]);
  const [hostelFoodPurpose, setHostelFoodPurpose] = useState('');

  // Restaurant Food State
  const [hasRestaurantFood, setHasRestaurantFood] = useState(false);
  const [restaurantFoodPersonsCount, setRestaurantFoodPersonsCount] = useState<number | string>(0);
  const [restaurantFoodFromDate, setRestaurantFoodFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [restaurantFoodToDate, setRestaurantFoodToDate] = useState(new Date().toISOString().split('T')[0]);
  const [vegCount, setVegCount] = useState<number | string>(0);
  const [nonVegCount, setNonVegCount] = useState<number | string>(0);
  const [restaurantFoodPurpose, setRestaurantFoodPurpose] = useState('');

  // Derived rules
  const isHotelSelected = hasAccommodation && accommodationType === 'Hotel';
  const isHostelAccommodation = hasAccommodation && (accommodationType === 'Boys Hostel' || accommodationType === 'Girls Hostel');

  // Auto-fix accommodation selection
  const handleSelectAccommodationType = (type: AccommodationType) => {
    setAccommodationType(type);
    if (type === 'Hotel') {
      setHasTeaSnacks(false);
      setHasHostelFood(false);
      setHasRestaurantFood(false);
      toast('When Hotel accommodation is selected, Tea & Snacks, Hostel Food, and Restaurant Food are not accessible.', {
        icon: '🏨',
      });
    } else if (type === 'Boys Hostel') {
      setTeaSnacksVenue('Boys Hostel');
      setHostelFoodType('Boys Hostel');
      setTargetHostel('Boys Hostel');
    } else if (type === 'Girls Hostel') {
      setTeaSnacksVenue('Girls Hostel');
      setHostelFoodType('Girls Hostel');
      setTargetHostel('Girls Hostel');
    }
  };

  // Toggle Accommodation Card
  const handleToggleAccommodation = () => {
    const next = !hasAccommodation;
    setHasAccommodation(next);
    if (next) {
      if (accommodationType === 'Hotel') {
        setHasTeaSnacks(false);
        setHasHostelFood(false);
        setHasRestaurantFood(false);
      } else {
        setTeaSnacksVenue(accommodationType);
        setHostelFoodType(accommodationType);
        setTargetHostel(accommodationType);
        if (accommodationPersonsCount) setHostelFoodPersonsCount(accommodationPersonsCount);
        if (accommodationRoomsCount) setHostelFoodRoomsCount(accommodationRoomsCount);
        if (accommodationFromDate) {
          setTeaSnacksFromDate(accommodationFromDate);
          setHostelFoodFromDate(accommodationFromDate);
        }
        if (accommodationToDate) {
          setTeaSnacksToDate(accommodationToDate);
          setHostelFoodToDate(accommodationToDate);
        }
      }
    }
  };

  // Toggle Tea & Snacks Card
  const handleToggleTeaSnacks = () => {
    if (isHotelSelected) {
      toast.error('Tea & Snacks is not accessible when Hotel accommodation is selected.');
      return;
    }
    const next = !hasTeaSnacks;
    setHasTeaSnacks(next);
    if (next && isHostelAccommodation) {
      setTeaSnacksVenue(accommodationType as 'Boys Hostel' | 'Girls Hostel');
      if (accommodationFromDate) setTeaSnacksFromDate(accommodationFromDate);
      if (accommodationToDate) setTeaSnacksToDate(accommodationToDate);
    }
  };

  // Toggle Hostel Food Card
  const handleToggleHostelFood = () => {
    if (isHotelSelected) {
      toast.error('Hostel Food is not accessible when Hotel accommodation is selected.');
      return;
    }
    const next = !hasHostelFood;
    setHasHostelFood(next);
    if (next && isHostelAccommodation) {
      setHostelFoodType(accommodationType as 'Boys Hostel' | 'Girls Hostel');
      if (accommodationPersonsCount) setHostelFoodPersonsCount(accommodationPersonsCount);
      if (accommodationRoomsCount) setHostelFoodRoomsCount(accommodationRoomsCount);
      if (accommodationFromDate) setHostelFoodFromDate(accommodationFromDate);
      if (accommodationToDate) setHostelFoodToDate(accommodationToDate);
    }
  };

  // Toggle Restaurant Food Card
  const handleToggleRestaurantFood = () => {
    if (isHotelSelected) {
      toast.error('Restaurant Food is not accessible when Hotel accommodation is selected.');
      return;
    }
    setHasRestaurantFood(!hasRestaurantFood);
  };

  // Input matching handlers
  const handleAccommodationPersonsChange = (val: string) => {
    setAccommodationPersonsCount(val);
    setHostelFoodPersonsCount(val);
  };

  const handleAccommodationRoomsChange = (val: string) => {
    setAccommodationRoomsCount(val);
    setHostelFoodRoomsCount(val);
  };

  const handleAccommodationFromDateChange = (val: string) => {
    setAccommodationFromDate(val);
    setTeaSnacksFromDate(val);
    setHostelFoodFromDate(val);
    setRestaurantFoodFromDate(val);
  };

  const handleAccommodationToDateChange = (val: string) => {
    setAccommodationToDate(val);
    setTeaSnacksToDate(val);
    setHostelFoodToDate(val);
    setRestaurantFoodToDate(val);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<RefreshmentAccommodationRequest | null>(null);

  // History & Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | RAStatus>('All');
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<RefreshmentAccommodationRequest | null>(null);
  const [deleteModalReq, setDeleteModalReq] = useState<RefreshmentAccommodationRequest | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Fetch Requests & Stats
  const fetchRARequests = async () => {
    setLoading(true);
    try {
      const [reqRes, statRes] = await Promise.all([
        api.get('/ra/requests'),
        api.get('/ra/stats'),
      ]);
      setRequests(reqRes.data || []);
      setStats(statRes.data || {
        total: 0,
        pendingAO: 0,
        forwardedWarden: 0,
        wardenAssigned: 0,
        activeHostel: 0,
        completed: 0,
        rejected: 0,
      });
    } catch (err) {
      console.error('Failed to load R&A requests:', err);
      toast.error('Failed to refresh Refreshments & Accommodations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRARequests();
  }, [dashboardTick]);

  // Form Reset
  const resetForm = () => {
    setHasAccommodation(false);
    setAccommodationType('Boys Hostel');
    setAccommodationPurpose('');
    setAccommodationPersonsCount(0);
    setAccommodationRoomsCount(0);
    setAccommodationFromDate(new Date().toISOString().split('T')[0]);
    setAccommodationToDate(new Date().toISOString().split('T')[0]);

    setHasTeaSnacks(false);
    setTeaSnacksVenue('Boys Hostel');
    setTeaSnacksFromDate(new Date().toISOString().split('T')[0]);
    setTeaSnacksToDate(new Date().toISOString().split('T')[0]);
    setTeaCount(0);
    setSnacksCount(0);
    setTeaSnacksPurpose('');

    setHasHostelFood(false);
    setHostelFoodType('Boys Hostel');
    setHostelFoodPersonsCount(0);
    setHostelFoodRoomsCount(0);
    setHostelFoodFromDate(new Date().toISOString().split('T')[0]);
    setHostelFoodToDate(new Date().toISOString().split('T')[0]);
    setHostelFoodPurpose('');

    setHasRestaurantFood(false);
    setRestaurantFoodPersonsCount(0);
    setRestaurantFoodFromDate(new Date().toISOString().split('T')[0]);
    setRestaurantFoodToDate(new Date().toISOString().split('T')[0]);
    setVegCount(0);
    setNonVegCount(0);
    setRestaurantFoodPurpose('');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAccommodation && !hasTeaSnacks && !hasHostelFood && !hasRestaurantFood) {
      toast.error('Please select at least one service: Accommodation, Tea & Snacks, Hostel Food, or Restaurant Food.');
      return;
    }

    // Hotel Exclusion Rule
    if (hasAccommodation && accommodationType === 'Hotel') {
      if (hasTeaSnacks || hasHostelFood || hasRestaurantFood) {
        toast.error('When Hotel accommodation is selected, Tea & Snacks, Hostel Food, and Restaurant Food are not accessible.');
        return;
      }
    }

    if (hasAccommodation) {
      if (!accommodationPurpose.trim()) {
        toast.error('Please enter the Purpose for Accommodation.');
        return;
      }
      const accP = Number(accommodationPersonsCount) || 0;
      const accR = Number(accommodationRoomsCount) || 0;
      if (accP <= 0) {
        toast.error('Please enter a valid count of persons for Accommodation (greater than 0).');
        return;
      }
      if (accR <= 0) {
        toast.error('Please enter the number of rooms required for Accommodation (greater than 0).');
        return;
      }
    }

    if (hasTeaSnacks) {
      if (!teaSnacksPurpose.trim()) {
        toast.error('Please enter the Purpose for Tea & Snacks.');
        return;
      }
      const tc = Number(teaCount) || 0;
      const sc = Number(snacksCount) || 0;
      if (tc <= 0 && sc <= 0) {
        toast.error('Please enter quantity for Tea or Snacks (must be greater than 0).');
        return;
      }
    }

    if (hasHostelFood) {
      if (!hostelFoodPurpose.trim()) {
        toast.error('Please enter the Purpose for Hostel Food.');
        return;
      }
      const hp = Number(hostelFoodPersonsCount) || Number(accommodationPersonsCount) || 0;
      if (hp <= 0) {
        toast.error('Please enter valid number of persons for Hostel Food.');
        return;
      }
    }

    if (hasRestaurantFood) {
      if (!restaurantFoodPurpose.trim()) {
        toast.error('Please enter the Purpose for Restaurant Food.');
        return;
      }
      const rp = Number(restaurantFoodPersonsCount) || 0;
      const vc = Number(vegCount) || 0;
      const nvc = Number(nonVegCount) || 0;
      if (rp <= 0) {
        toast.error('Please enter valid number of persons for Restaurant Food.');
        return;
      }
      if (vc + nvc <= 0) {
        toast.error('Please enter quantity for Veg or Non-Veg meals.');
        return;
      }
    }

    // Determine target hostel routing
    let effectiveTargetHostel: 'Boys Hostel' | 'Girls Hostel' | null = null;
    if (hasAccommodation) {
      if (accommodationType === 'Boys Hostel') effectiveTargetHostel = 'Boys Hostel';
      else if (accommodationType === 'Girls Hostel') effectiveTargetHostel = 'Girls Hostel';
    } else if (hasHostelFood) {
      effectiveTargetHostel = hostelFoodType;
    } else if (hasTeaSnacks && teaSnacksVenue !== 'Campus') {
      effectiveTargetHostel = teaSnacksVenue;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        hasAccommodation,
        accommodationType: hasAccommodation ? accommodationType : null,
        accommodationPurpose: hasAccommodation ? accommodationPurpose.trim() : null,
        accommodationPersonsCount: hasAccommodation ? Number(accommodationPersonsCount) : 0,
        accommodationRoomsCount: hasAccommodation ? Number(accommodationRoomsCount) : 0,
        accommodationFromDate: hasAccommodation ? accommodationFromDate : null,
        accommodationToDate: hasAccommodation ? accommodationToDate : null,

        targetHostel: effectiveTargetHostel,

        hasTeaSnacks,
        teaSnacksFromDate: hasTeaSnacks ? teaSnacksFromDate : null,
        teaSnacksToDate: hasTeaSnacks ? teaSnacksToDate : null,
        teaCount: hasTeaSnacks ? Number(teaCount) : 0,
        snacksCount: hasTeaSnacks ? Number(snacksCount) : 0,
        teaSnacksPurpose: hasTeaSnacks ? teaSnacksPurpose.trim() : null,

        hasHostelFood,
        hostelFoodPersonsCount: hasHostelFood ? (Number(hostelFoodPersonsCount) || Number(accommodationPersonsCount) || 0) : 0,
        hostelFoodRoomsCount: hasAccommodation ? Number(accommodationRoomsCount) : (Number(hostelFoodRoomsCount) || 0),
        hostelFoodFromDate: hasHostelFood ? hostelFoodFromDate : null,
        hostelFoodToDate: hasHostelFood ? hostelFoodToDate : null,
        hostelFoodPurpose: hasHostelFood ? hostelFoodPurpose.trim() : null,

        hasRestaurantFood,
        restaurantFoodPersonsCount: hasRestaurantFood ? Number(restaurantFoodPersonsCount) : 0,
        restaurantFoodFromDate: hasRestaurantFood ? restaurantFoodFromDate : null,
        restaurantFoodToDate: hasRestaurantFood ? restaurantFoodToDate : null,
        vegCount: hasRestaurantFood ? Number(vegCount) : 0,
        nonVegCount: hasRestaurantFood ? Number(nonVegCount) : 0,
        restaurantFoodPurpose: hasRestaurantFood ? restaurantFoodPurpose.trim() : null,
      };

      const res = await api.post('/ra/requests', payload);
      setSubmittedTicket(res.data);
      toast.success(`Request ${res.data.id} submitted successfully to AO!`);
      resetForm();
      fetchRARequests();
    } catch (err: any) {
      console.error('Failed to submit R&A request:', err);
      toast.error(err.response?.data || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Request
  const handleDeleteRequest = async () => {
    if (!deleteModalReq) return;
    setActionProcessing(true);
    try {
      await api.delete(`/ra/requests/${deleteModalReq.id}`);
      toast.success(`Request ${deleteModalReq.id} deleted successfully.`);
      setDeleteModalReq(null);
      fetchRARequests();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to delete request.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Filtered History
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        r.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        (r.accommodationPurpose || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (r.teaSnacksPurpose || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (r.hostelFoodPurpose || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (r.restaurantFoodPurpose || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (r.requester?.name || '').toLowerCase().includes(historySearch.toLowerCase());

      const matchStatus = historyStatusFilter === 'All' || r.status === historyStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, historySearch, historyStatusFilter]);

  // Helper Badge Color
  const getStatusBadge = (status: RAStatus) => {
    switch (status) {
      case 'PENDING_AO':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Pending AO Review',
        };
      case 'APPROVED_AO':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Approved by AO',
        };
      case 'FORWARDED_WARDEN':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          label: 'Forwarded to Warden',
        };
      case 'WARDEN_ASSIGNED':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Rooms Assigned / Active',
        };
      case 'PARTIALLY_CHECKED_OUT':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: 'In Progress (Partial Checkout)',
        };
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Fully Completed',
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Declined',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          label: status,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Switchers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-[#1e293b]/90 via-[#0f172a]/95 to-[#1e293b]/90 border border-[#334155]/60 rounded-2xl px-5 py-3 text-xs shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
          <span className="text-brand-textMuted">
            Active Module: <strong className="text-white">R&A (Refreshments & Accommodations)</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onSwitchToSMS}
            className="px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-[#334155] text-brand-textMuted hover:text-white font-medium transition-all border border-[#334155]/40 cursor-pointer"
          >
            SMS
          </button>
          {onSwitchToSHR && (
            <button
              onClick={onSwitchToSHR}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>SHR</span>
            </button>
          )}
          {onSwitchToSTR && (
            <button
              onClick={onSwitchToSTR}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>STR</span>
            </button>
          )}
          {onSwitchToTR && (
            <button
              onClick={onSwitchToTR}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>TR</span>
            </button>
          )}
          <button
            onClick={onSwitchToSMS}
            className="px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-[#334155] text-brand-textMuted hover:text-white font-medium transition-all border border-[#334155]/40 cursor-pointer"
          >
            Portal Hub
          </button>
        </div>
      </div>

      {/* 2. Top Title & Tabs Banner */}
      <div className="admin-card p-6 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">
            <Hotel className="w-4 h-4" />
            <span>Campus Hospitality & Logistics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Refreshments &amp; Accommodations (R&amp;A)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department request portal for Boys/Girls Hostel &amp; Hotel Accommodations, Tea &amp; Snacks, Hostel Food, and Restaurant Meals.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview &amp; Stats
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Department History ({requests.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('new_req');
              setSubmittedTicket(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'new_req'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="admin-card p-4 bg-white border-l-4 border-slate-700">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Requests</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.total}</div>
            </div>

            <div className="admin-card p-4 bg-white border-l-4 border-amber-500">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending AO</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.pendingAO}</div>
            </div>

            <div className="admin-card p-4 bg-white border-l-4 border-purple-500">
              <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">At Warden</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.forwardedWarden}</div>
            </div>

            <div className="admin-card p-4 bg-white border-l-4 border-indigo-500">
              <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Assigned / Active</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.wardenAssigned + stats.activeHostel}</div>
            </div>

            <div className="admin-card p-4 bg-white border-l-4 border-emerald-500">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.completed}</div>
            </div>

            <div className="admin-card p-4 bg-white border-l-4 border-rose-500">
              <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Declined</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.rejected}</div>
            </div>
          </div>

          {/* Quick Action CTA Card */}
          <div className="admin-card p-6 bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 border border-rose-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-rose-200 text-rose-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Need Accommodation or Hospitality Services?</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Choose between Boys Hostel, Girls Hostel, or Hotel for overnight stays, plus Tea &amp; Snacks, Mess Dining, and Restaurant meals.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('new_req');
                setSubmittedTicket(null);
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Raise R&amp;A Request</span>
            </button>
          </div>

          {/* Recent Requests Section */}
          <div className="admin-card p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Recent Department R&amp;A Requests</h2>
                <p className="text-[11px] text-slate-400">Latest hospitality requests raised by your department</p>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No R&amp;A requests recorded yet. Click "Raise R&amp;A Request" to submit one.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.slice(0, 5).map((req) => {
                  const badge = getStatusBadge(req.status);
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
                          {req.hasAccommodation ? <Hotel className="w-4 h-4 text-rose-600" /> :
                           req.hasHostelFood ? <Utensils className="w-4 h-4 text-amber-600" /> :
                           req.hasRestaurantFood ? <UtensilsCrossed className="w-4 h-4 text-emerald-600" /> :
                           <Coffee className="w-4 h-4 text-purple-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">{req.id}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                            {/* Live Remaining Badge */}
                            {req.status === 'PARTIALLY_CHECKED_OUT' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-300">
                                {req.stillInHostel} still in hostel
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                            {req.hasAccommodation && <span>🏨 {req.accommodationType} ({req.accommodationPersonsCount} pax, {req.accommodationRoomsCount || 0} rms)</span>}
                            {req.hasTeaSnacks && <span>☕ Tea ({req.teaCount}) &amp; Snacks ({req.snacksCount})</span>}
                            {req.hasHostelFood && <span>🍲 Hostel Food ({req.hostelFoodPersonsCount} pax, {req.hostelFoodRoomsCount} rms)</span>}
                            {req.hasRestaurantFood && <span>🍽️ Restaurant ({req.vegCount} Veg, {req.nonVegCount} Non-Veg)</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRequestDetails(req)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NEW REQUEST FORM */}
      {activeTab === 'new_req' && (
        <div className="space-y-6">
          {submittedTicket ? (
            /* Ticket Confirmation View */
            <div className="admin-card p-8 bg-white border-2 border-emerald-500 text-center max-w-2xl mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Hospitality Request Submitted!</h2>
              <p className="text-xs text-slate-600">
                Your request <strong className="text-slate-900 font-bold">{submittedTicket.id}</strong> has been transmitted to the Administrative Officer (AO) for approval.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Ticket ID:</span>
                  <span className="font-bold text-slate-800">{submittedTicket.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-bold text-slate-800">{user?.departmentCode || 'HOD'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Initial Status:</span>
                  <span className="font-bold text-amber-600">Pending AO Approval</span>
                </div>
                {submittedTicket.hasAccommodation && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Accommodation:</span>
                    <span className="font-bold text-slate-800">
                      {submittedTicket.accommodationType} • {submittedTicket.accommodationPersonsCount} Persons • {submittedTicket.accommodationRoomsCount} Rooms
                    </span>
                  </div>
                )}
                {submittedTicket.hasTeaSnacks && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Tea &amp; Snacks:</span>
                    <span className="font-bold text-slate-800">
                      {submittedTicket.teaCount} Teas, {submittedTicket.snacksCount} Snacks
                    </span>
                  </div>
                )}
                {submittedTicket.hasHostelFood && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Hostel Food:</span>
                    <span className="font-bold text-slate-800">
                      {submittedTicket.hostelFoodPersonsCount} Persons • {submittedTicket.hostelFoodRoomsCount} Rooms
                    </span>
                  </div>
                )}
                {submittedTicket.hasRestaurantFood && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Restaurant Food:</span>
                    <span className="font-bold text-slate-800">
                      {submittedTicket.vegCount} Veg, {submittedTicket.nonVegCount} Non-Veg
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSubmittedTicket(null);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Raise Another Request
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  View in Department History
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="admin-card p-6 bg-white max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-800">Raise Refreshments &amp; Accommodation Request</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the services needed below. You can choose one or multiple services in a single request.
                </p>
              </div>

              {/* Service Selection Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Service 1: Accommodation */}
                <div
                  onClick={handleToggleAccommodation}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    hasAccommodation
                      ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${hasAccommodation ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Hotel className="w-5 h-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={hasAccommodation}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Accommodation</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Boys/Girls Hostel or Hotel stay</p>
                  </div>
                </div>

                {/* Service 2: Tea & Snacks */}
                <div
                  onClick={handleToggleTeaSnacks}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between relative ${
                    isHotelSelected
                      ? 'opacity-40 cursor-not-allowed bg-slate-100/80 border-dashed border-slate-300'
                      : hasTeaSnacks
                      ? 'border-purple-600 bg-purple-50/50 shadow-sm cursor-pointer'
                      : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                  }`}
                >
                  {isHotelSelected && (
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                      Inaccessible
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${hasTeaSnacks ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Coffee className="w-5 h-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={hasTeaSnacks}
                      disabled={isHotelSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Tea &amp; Snacks</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isHotelSelected ? 'Not allowed with Hotel' : 'High tea, coffee & refreshments'}
                    </p>
                  </div>
                </div>

                {/* Service 3: Hostel Food */}
                <div
                  onClick={handleToggleHostelFood}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between relative ${
                    isHotelSelected
                      ? 'opacity-40 cursor-not-allowed bg-slate-100/80 border-dashed border-slate-300'
                      : hasHostelFood
                      ? 'border-amber-600 bg-amber-50/50 shadow-sm cursor-pointer'
                      : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                  }`}
                >
                  {isHotelSelected && (
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                      Inaccessible
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${hasHostelFood ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Utensils className="w-5 h-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={hasHostelFood}
                      disabled={isHotelSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Hostel Food</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isHotelSelected ? 'Not allowed with Hotel' : 'Mess breakfast, lunch & dinner'}
                    </p>
                  </div>
                </div>

                {/* Service 4: Restaurant Food */}
                <div
                  onClick={handleToggleRestaurantFood}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between relative ${
                    isHotelSelected
                      ? 'opacity-40 cursor-not-allowed bg-slate-100/80 border-dashed border-slate-300'
                      : hasRestaurantFood
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm cursor-pointer'
                      : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                  }`}
                >
                  {isHotelSelected && (
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                      Inaccessible
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${hasRestaurantFood ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={hasRestaurantFood}
                      disabled={isHotelSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Restaurant Food</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isHotelSelected ? 'Not allowed with Hotel' : 'Catered Veg / Non-Veg meals'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. ACCOMMODATION FORM SECTION */}
              {hasAccommodation && (
                <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
                    <Hotel className="w-4 h-4" />
                    <span>Accommodation Details</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Select Accommodation Type *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Boys Hostel', 'Girls Hostel', 'Hotel'] as AccommodationType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleSelectAccommodationType(type)}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            accommodationType === type
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{type}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {accommodationType === 'Boys Hostel' && 'Auto-fixes Tea & Snacks and Hostel Food to Boys Hostel. Once AO accepts, forwarded directly to the Boys Hostel Warden.'}
                      {accommodationType === 'Girls Hostel' && 'Auto-fixes Tea & Snacks and Hostel Food to Girls Hostel. Once AO accepts, forwarded directly to the Girls Hostel Warden.'}
                      {accommodationType === 'Hotel' && 'Hotel booking is self-contained. Hostel Food, Tea & Snacks, and Restaurant Food are completely disabled.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Number of Persons *</label>
                      <input
                        type="number"
                        min="0"
                        value={accommodationPersonsCount}
                        onChange={(e) => handleAccommodationPersonsChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Number of Rooms Required *</label>
                      <input
                        type="number"
                        min="0"
                        value={accommodationRoomsCount}
                        onChange={(e) => handleAccommodationRoomsChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Check-in Date *</label>
                      <input
                        type="date"
                        value={accommodationFromDate}
                        onChange={(e) => handleAccommodationFromDateChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Check-out Date *</label>
                      <input
                        type="date"
                        value={accommodationToDate}
                        onChange={(e) => handleAccommodationToDateChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purpose of Accommodation *</label>
                    <input
                      type="text"
                      value={accommodationPurpose}
                      onChange={(e) => setAccommodationPurpose(e.target.value)}
                      placeholder="e.g. Guest Faculty for Workshop / NBA Committee Visit / Conference Dignitaries"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 2. TEA & SNACKS FORM SECTION */}
              {hasTeaSnacks && (
                <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
                    <Coffee className="w-4 h-4" />
                    <span>Tea &amp; Snacks Details</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700">Service Location / Venue *</label>
                      {isHostelAccommodation && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                          🔒 Fixed to {accommodationType} from Accommodation
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Boys Hostel', 'Girls Hostel', 'Campus'] as const).map((venue) => {
                        const isFixedSelected = isHostelAccommodation ? venue === accommodationType : teaSnacksVenue === venue;
                        return (
                          <button
                            key={venue}
                            type="button"
                            disabled={isHostelAccommodation}
                            onClick={() => !isHostelAccommodation && setTeaSnacksVenue(venue)}
                            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                              isHostelAccommodation
                                ? isFixedSelected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                                : teaSnacksVenue === venue
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs cursor-pointer'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer'
                            }`}
                          >
                            <span>{venue === 'Campus' ? 'Campus / Dept' : venue}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isHostelAccommodation
                        ? `Auto-fixed to ${accommodationType}. Forwarded to ${accommodationType} Warden upon AO acceptance.`
                        : teaSnacksVenue === 'Boys Hostel'
                        ? 'Forwarded to Boys Hostel Warden desk upon AO acceptance.'
                        : teaSnacksVenue === 'Girls Hostel'
                        ? 'Forwarded to Girls Hostel Warden desk upon AO acceptance.'
                        : 'AO coordinates college pantry / campus cafeteria arrangements.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tea / Coffee Count *</label>
                      <input
                        type="number"
                        min="0"
                        value={teaCount}
                        onChange={(e) => setTeaCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Snacks Count *</label>
                      <input
                        type="number"
                        min="0"
                        value={snacksCount}
                        onChange={(e) => setSnacksCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">From Date *</label>
                      <input
                        type="date"
                        value={teaSnacksFromDate}
                        onChange={(e) => setTeaSnacksFromDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">To Date *</label>
                      <input
                        type="date"
                        value={teaSnacksToDate}
                        onChange={(e) => setTeaSnacksToDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purpose for Tea &amp; Snacks *</label>
                    <input
                      type="text"
                      value={teaSnacksPurpose}
                      onChange={(e) => setTeaSnacksPurpose(e.target.value)}
                      placeholder="e.g. Department Faculty Meeting / Student Hackathon Break / Guest Welcome"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 3. HOSTEL FOOD FORM SECTION */}
              {hasHostelFood && (
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                    <Utensils className="w-4 h-4" />
                    <span>Hostel Food Details</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700">Select Hostel Mess *</label>
                      {isHostelAccommodation && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                          🔒 Fixed to {accommodationType} Mess from Accommodation
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['Boys Hostel', 'Girls Hostel'] as const).map((type) => {
                        const isFixedSelected = isHostelAccommodation ? type === accommodationType : hostelFoodType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            disabled={isHostelAccommodation}
                            onClick={() => !isHostelAccommodation && setHostelFoodType(type)}
                            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                              isHostelAccommodation
                                ? isFixedSelected
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                                : hostelFoodType === type
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs cursor-pointer'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{type} Mess</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isHostelAccommodation
                        ? `Auto-fixed to ${accommodationType} Mess. Forwarded directly to the ${accommodationType} Warden upon AO acceptance.`
                        : `Once AO accepts, forwarded directly to the ${hostelFoodType} Warden desk for food arrangement.`}
                    </p>
                  </div>

                  {/* Accommodation match banner */}
                  {hasAccommodation && (
                    <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-amber-600" />
                        <span>Room Allocation: <strong>{accommodationRoomsCount || 0} Rooms</strong> (Input defined in Accommodation section)</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider">
                        Auto-Matched
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Number of Persons *</label>
                      <input
                        type="number"
                        min="0"
                        value={hostelFoodPersonsCount}
                        onChange={(e) => setHostelFoodPersonsCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">From Date *</label>
                      <input
                        type="date"
                        value={hostelFoodFromDate}
                        onChange={(e) => setHostelFoodFromDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">To Date *</label>
                      <input
                        type="date"
                        value={hostelFoodToDate}
                        onChange={(e) => setHostelFoodToDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purpose for Hostel Food *</label>
                    <input
                      type="text"
                      value={hostelFoodPurpose}
                      onChange={(e) => setHostelFoodPurpose(e.target.value)}
                      placeholder="e.g. Sports Team Visiting / External Examination Evaluators / Fest Participants"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* 4. RESTAURANT FOOD FORM SECTION */}
              {hasRestaurantFood && (
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Restaurant Food Details (Direct AO Coordination)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Total Persons *</label>
                      <input
                        type="number"
                        min="0"
                        value={restaurantFoodPersonsCount}
                        onChange={(e) => setRestaurantFoodPersonsCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Veg Meals Count *</label>
                      <input
                        type="number"
                        min="0"
                        value={vegCount}
                        onChange={(e) => setVegCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Non-Veg Meals Count *</label>
                      <input
                        type="number"
                        min="0"
                        value={nonVegCount}
                        onChange={(e) => setNonVegCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Serving Date *</label>
                      <input
                        type="date"
                        value={restaurantFoodFromDate}
                        onChange={(e) => setRestaurantFoodFromDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purpose for Restaurant Food *</label>
                    <input
                      type="text"
                      value={restaurantFoodPurpose}
                      onChange={(e) => setRestaurantFoodPurpose(e.target.value)}
                      placeholder="e.g. Chief Guest Luncheon / National Conference Dinner / Advisory Board Catering"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      <span>Submit Request to AO</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: DEPARTMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="admin-card p-4 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search requests by ID, purpose, requester..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['All', 'PENDING_AO', 'FORWARDED_WARDEN', 'WARDEN_ASSIGNED', 'PARTIALLY_CHECKED_OUT', 'COMPLETED', 'REJECTED'] as const).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setHistoryStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      historyStatusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'All' ? 'All Requests' : st.replace('_', ' ')}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Table / Card List */}
          <div className="admin-card bg-white overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">Loading R&amp;A requests...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">No matching R&amp;A requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Ticket</th>
                      <th className="py-3.5 px-4">Services Requested</th>
                      <th className="py-3.5 px-4">Counts &amp; Logistics</th>
                      <th className="py-3.5 px-4">Status &amp; Live Tracking</th>
                      <th className="py-3.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((req) => {
                      const badge = getStatusBadge(req.status);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <span className="font-bold text-slate-900">{req.id}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 font-medium">
                              By {req.requester?.name || 'HOD'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top space-y-1">
                            {req.hasAccommodation && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold mr-1">
                                <Hotel className="w-3 h-3" />
                                <span>{req.accommodationType}</span>
                              </div>
                            )}
                            {req.hasTeaSnacks && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold mr-1">
                                <Coffee className="w-3 h-3" />
                                <span>Tea &amp; Snacks</span>
                              </div>
                            )}
                            {req.hasHostelFood && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold mr-1">
                                <Utensils className="w-3 h-3" />
                                <span>Hostel Food</span>
                              </div>
                            )}
                            {req.hasRestaurantFood && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold mr-1">
                                <UtensilsCrossed className="w-3 h-3" />
                                <span>Restaurant</span>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                              {req.accommodationPurpose || req.hostelFoodPurpose || req.teaSnacksPurpose || req.restaurantFoodPurpose}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top space-y-1">
                            {req.hasAccommodation && (
                              <div className="text-[11px] text-slate-600">
                                <strong>{req.accommodationPersonsCount}</strong> Guests • <strong>{req.accommodationRoomsCount || 0}</strong> Rooms ({req.accommodationFromDate} to {req.accommodationToDate})
                              </div>
                            )}
                            {req.hasTeaSnacks && (
                              <div className="text-[11px] text-slate-600">
                                <strong>{req.teaCount}</strong> Teas • <strong>{req.snacksCount}</strong> Snacks
                              </div>
                            )}
                            {req.hasHostelFood && (
                              <div className="text-[11px] text-slate-600">
                                <strong>{req.hostelFoodPersonsCount}</strong> Pax • <strong>{req.hostelFoodRoomsCount}</strong> Rooms
                              </div>
                            )}
                            {req.hasRestaurantFood && (
                              <div className="text-[11px] text-slate-600">
                                <strong>{req.vegCount}</strong> Veg, <strong>{req.nonVegCount}</strong> Non-Veg
                              </div>
                            )}

                            {/* Assigned info */}
                            {req.aoAssignedHotel && (
                              <div className="text-[10px] text-blue-700 font-semibold mt-1">
                                Hotel: {req.aoAssignedHotel}
                              </div>
                            )}
                            {req.wardenAssignedRooms && (
                              <div className="text-[10px] text-indigo-700 font-semibold mt-1">
                                Assigned Rooms: {req.wardenAssignedRooms}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>

                            {/* Live Checkout Indicator */}
                            {req.totalGuests > 0 && req.status === 'PARTIALLY_CHECKED_OUT' && (
                              <div className="mt-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-300">
                                  <DoorClosed className="w-3 h-3" />
                                  <span>{req.stillInHostel} still in hostel ({req.checkedOutCount}/{req.totalGuests} checked out)</span>
                                </span>
                              </div>
                            )}

                            {req.status === 'COMPLETED' && req.totalGuests > 0 && (
                              <div className="mt-1 text-[10px] text-emerald-700 font-bold">
                                All {req.totalGuests} guests checked out
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedRequestDetails(req)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                onClick={() => setDeleteModalReq(req)}
                                title="Delete request"
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Request Details View */}
      {selectedRequestDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospitality Request</span>
                <h3 className="text-lg font-black text-slate-800">{selectedRequestDetails.id}</h3>
              </div>
              <button
                onClick={() => setSelectedRequestDetails(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Request Breakdown */}
            <div className="space-y-3 text-xs">
              {selectedRequestDetails.hasAccommodation && (
                <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-1">
                  <div className="font-bold text-rose-800 flex items-center gap-1.5">
                    <Hotel className="w-3.5 h-3.5" />
                    <span>Accommodation: {selectedRequestDetails.accommodationType}</span>
                  </div>
                  <div className="text-slate-600">Guests: <strong>{selectedRequestDetails.accommodationPersonsCount}</strong> • Rooms: <strong>{selectedRequestDetails.accommodationRoomsCount || 0}</strong></div>
                  <div className="text-slate-600">Dates: {selectedRequestDetails.accommodationFromDate} to {selectedRequestDetails.accommodationToDate}</div>
                  <div className="text-slate-700 mt-1">Purpose: <em>{selectedRequestDetails.accommodationPurpose}</em></div>
                </div>
              )}

              {selectedRequestDetails.hasTeaSnacks && (
                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-1">
                  <div className="font-bold text-purple-800 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Tea &amp; Snacks</span>
                  </div>
                  <div className="text-slate-600">Count: <strong>{selectedRequestDetails.teaCount}</strong> Teas, <strong>{selectedRequestDetails.snacksCount}</strong> Snacks</div>
                  <div className="text-slate-600">Dates: {selectedRequestDetails.teaSnacksFromDate} to {selectedRequestDetails.teaSnacksToDate}</div>
                  <div className="text-slate-700 mt-1">Purpose: <em>{selectedRequestDetails.teaSnacksPurpose}</em></div>
                </div>
              )}

              {selectedRequestDetails.hasHostelFood && (
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-1">
                  <div className="font-bold text-amber-800 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Hostel Food</span>
                  </div>
                  <div className="text-slate-600">Persons: <strong>{selectedRequestDetails.hostelFoodPersonsCount}</strong> • Rooms: <strong>{selectedRequestDetails.hostelFoodRoomsCount}</strong></div>
                  <div className="text-slate-600">Dates: {selectedRequestDetails.hostelFoodFromDate} to {selectedRequestDetails.hostelFoodToDate}</div>
                  <div className="text-slate-700 mt-1">Purpose: <em>{selectedRequestDetails.hostelFoodPurpose}</em></div>
                </div>
              )}

              {selectedRequestDetails.hasRestaurantFood && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Restaurant Food</span>
                  </div>
                  <div className="text-slate-600">Serving: <strong>{selectedRequestDetails.vegCount}</strong> Veg, <strong>{selectedRequestDetails.nonVegCount}</strong> Non-Veg</div>
                  <div className="text-slate-700 mt-1">Purpose: <em>{selectedRequestDetails.restaurantFoodPurpose}</em></div>
                </div>
              )}

              {/* AO Actions */}
              {selectedRequestDetails.aoActionBy && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-800">AO Action by {selectedRequestDetails.aoActionBy.name}</div>
                  {selectedRequestDetails.aoAssignedHotel && <div>Hotel Booked: {selectedRequestDetails.aoAssignedHotel}</div>}
                  {selectedRequestDetails.aoAssignedRestaurant && <div>Restaurant Caterer: {selectedRequestDetails.aoAssignedRestaurant}</div>}
                  {selectedRequestDetails.aoRemarks && <div>Remarks: {selectedRequestDetails.aoRemarks}</div>}
                </div>
              )}

              {/* Warden Actions */}
              {selectedRequestDetails.warden && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900">
                  <div className="font-bold">Hostel Warden: {selectedRequestDetails.warden.name}</div>
                  {selectedRequestDetails.wardenAssignedRooms && <div>Assigned Rooms: {selectedRequestDetails.wardenAssignedRooms}</div>}
                  {selectedRequestDetails.wardenRemarks && <div>Warden Remarks: {selectedRequestDetails.wardenRemarks}</div>}
                </div>
              )}

              {/* Live Checkout Summary */}
              {selectedRequestDetails.totalGuests > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Hostel Guest Checkout Tracking</span>
                    <div className="text-slate-500">{selectedRequestDetails.checkedOutCount} of {selectedRequestDetails.totalGuests} guests checked out</div>
                  </div>
                  {selectedRequestDetails.stillInHostel > 0 ? (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs border border-amber-300">
                      {selectedRequestDetails.stillInHostel} still in that hostel
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300">
                      All Checked Out
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRequestDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete */}
      {deleteModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Delete Request {deleteModalReq.id}?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this request record? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalReq(null)}
                disabled={actionProcessing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={actionProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {actionProcessing ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
