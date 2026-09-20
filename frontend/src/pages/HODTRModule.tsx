import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Car,
  Bus,
  Bike,
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
  Navigation,
  Play,
  Square,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TransportRequest, TransportType, TransportRequestStatus } from '../types';

interface HODTRModuleProps {
  onSwitchToSMS: () => void;
  onSwitchToSHR?: () => void;
  onSwitchToSTR?: () => void;
}

export const HODTRModule: React.FC<HODTRModuleProps> = ({
  onSwitchToSMS,
  onSwitchToSHR,
  onSwitchToSTR,
}) => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'new_req'>('dashboard');
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingAO: 0,
    approved: 0,
    started: 0,
    completed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  // New Request Form State
  const [transportType, setTransportType] = useState<TransportType>('Car');
  const [purpose, setPurpose] = useState('');
  const [personCount, setPersonCount] = useState<number | string>(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:30 AM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<TransportRequest | null>(null);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | TransportRequestStatus>('All');
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<TransportRequest | null>(null);

  // Action Modals State
  const [confirmStartModal, setConfirmStartModal] = useState<TransportRequest | null>(null);
  const [confirmEndModal, setConfirmEndModal] = useState<TransportRequest | null>(null);
  const [deleteModalReq, setDeleteModalReq] = useState<TransportRequest | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Fetch Requests & Stats
  const fetchTransportData = async () => {
    setLoading(true);
    try {
      const [reqsRes, statsRes] = await Promise.all([
        api.get('/transport/requests'),
        api.get('/transport/stats'),
      ]);
      setRequests(reqsRes.data || []);
      setStats(statsRes.data || { total: 0, pendingAO: 0, approved: 0, started: 0, completed: 0, rejected: 0 });
    } catch (err) {
      console.error('Failed to load transport data:', err);
      toast.error('Failed to load transport requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, [dashboardTick]);

  // Handle Form Submission
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      toast.error('Please enter the purpose of travel.');
      return;
    }
    const count = parseInt(String(personCount), 10);
    if (isNaN(count) || count < 1) {
      toast.error('Please specify a valid person count (at least 1).');
      return;
    }
    if (!startDate || !startTime) {
      toast.error('Please select both start date and start timing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        transportType,
        purpose: purpose.trim(),
        personCount: count,
        startDate,
        startTime,
      };

      const res = await api.post('/transport/requests', payload);
      toast.success(`Transport Request ${res.data.id} submitted to AO successfully!`);
      setSubmittedTicket(res.data);
      fetchTransportData();
    } catch (err: any) {
      console.error('Failed to submit transport request:', err);
      toast.error(err.response?.data || 'Failed to submit transport request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setTransportType('Car');
    setPurpose('');
    setPersonCount(4);
    setStartDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:30 AM');
    setSubmittedTicket(null);
  };

  // Handle Start Trip
  const handleStartTrip = async () => {
    if (!confirmStartModal) return;
    setActionProcessing(true);
    try {
      await api.patch(`/transport/requests/${confirmStartModal.id}/start`);
      toast.success(`Trip for ${confirmStartModal.id} marked as STARTED! Safe travels.`);
      setConfirmStartModal(null);
      fetchTransportData();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to start trip.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle End Trip
  const handleEndTrip = async () => {
    if (!confirmEndModal) return;
    setActionProcessing(true);
    try {
      await api.patch(`/transport/requests/${confirmEndModal.id}/end`);
      toast.success(`Trip for ${confirmEndModal.id} marked as COMPLETED! Timings logged.`);
      setConfirmEndModal(null);
      fetchTransportData();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to complete trip.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Delete Request
  const handleDeleteRequest = async () => {
    if (!deleteModalReq) return;
    setActionProcessing(true);
    try {
      await api.delete(`/transport/requests/${deleteModalReq.id}`);
      toast.success(`Transport request ${deleteModalReq.id} deleted successfully.`);
      setDeleteModalReq(null);
      if (selectedRequestDetails?.id === deleteModalReq.id) {
        setSelectedRequestDetails(null);
      }
      fetchTransportData();
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to delete transport request.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return requests.filter((req) => {
      const matchesStatus = historyStatusFilter === 'All' || req.status === historyStatusFilter;
      const q = historySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.id.toLowerCase().includes(q) ||
        req.purpose.toLowerCase().includes(q) ||
        req.transportType.toLowerCase().includes(q) ||
        (req.allocatedVehicle && req.allocatedVehicle.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [requests, historyStatusFilter, historySearch]);

  // Active or ready trips for Dashboard highlight
  const activeTrips = useMemo(() => {
    return requests.filter((r) => r.status === 'APPROVED' || r.status === 'STARTED');
  }, [requests]);

  const getVehicleIcon = (type: TransportType, className = 'w-5 h-5') => {
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

  const getStatusBadge = (status: TransportRequestStatus) => {
    switch (status) {
      case 'PENDING_AO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Awaiting AO
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Vehicle Allocated
          </span>
        );
      case 'STARTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-800 animate-pulse">
            <Navigation className="w-3.5 h-3.5" /> Trip In Progress
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

  // Duration formatter
  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff <= 0) return 'Just started';
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) return `${hours} hr ${remMins} min`;
    return `${remMins} min`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Module Switcher & Title Bar */}
      <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                TR Module
              </span>
              <span className="text-xs text-slate-500 font-medium">Department Transport &amp; Fleet Logistics</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Transport Requests <span className="text-slate-400 font-normal">({user?.departmentCode || 'HOD'})</span>
            </h1>
          </div>
        </div>

        {/* Quick Switch Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={onSwitchToSMS}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors flex items-center gap-1.5"
          >
            <span>Switch to SMS</span>
          </button>
          {onSwitchToSHR && (
            <button
              onClick={onSwitchToSHR}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors flex items-center gap-1.5"
            >
              <span>Switch to SHR</span>
            </button>
          )}
          {onSwitchToSTR && (
            <button
              onClick={onSwitchToSTR}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold transition-colors flex items-center gap-1.5"
            >
              <span>Switch to STR</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="admin-card p-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          id="btn-tab-tr-dashboard"
          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          id="btn-tab-tr-history"
          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>History</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-black">
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('new_req')}
          id="btn-tab-tr-new"
          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'new_req'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Request</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Indents</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-slate-900">{stats.total}</span>
                <span className="text-xs text-slate-400 font-medium">all time</span>
              </div>
            </div>

            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending AO
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-700">{stats.pendingAO}</span>
                <span className="text-xs text-slate-400 font-medium">allocating</span>
              </div>
            </div>

            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Vehicle Ready
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-700">{stats.approved}</span>
                <span className="text-xs text-slate-400 font-medium">approved</span>
              </div>
            </div>

            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 animate-pulse" /> In Transit
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-blue-700">{stats.started}</span>
                <span className="text-xs text-slate-400 font-medium">traveling</span>
              </div>
            </div>

            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Completed
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-slate-800">{stats.completed}</span>
                <span className="text-xs text-slate-400 font-medium">trips</span>
              </div>
            </div>
          </div>

          {/* Active Trips Alert Box */}
          {activeTrips.length > 0 && (
            <div className="admin-card p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-300 rounded-3xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Active &amp; Ready Trips Requiring Live Actions
                  </h3>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                  {activeTrips.length} Actionable Trip{activeTrips.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white flex items-center gap-1.5">
                            {getVehicleIcon(trip.transportType, 'w-4 h-4')}
                            {trip.transportType}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{trip.id}</span>
                        </div>
                        {getStatusBadge(trip.status)}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mt-2.5 line-clamp-1">{trip.purpose}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <strong>{trip.personCount}</strong> Persons
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {trip.startDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {trip.startTime}
                        </span>
                      </div>

                      {trip.allocatedVehicle && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                          <span className="font-semibold text-slate-500">Allocated Vehicle: </span>
                          <strong className="text-slate-900">{trip.allocatedVehicle}</strong>
                          {trip.allocatedVehicleCount && trip.allocatedVehicleCount > 1 && (
                            <span className="text-emerald-700 font-bold ml-1">
                              ({trip.allocatedVehicleCount} Vehicles)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Live Trip Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {trip.status === 'APPROVED' && (
                        <button
                          onClick={() => setConfirmStartModal(trip)}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Start Trip Now</span>
                        </button>
                      )}

                      {trip.status === 'STARTED' && (
                        <div className="w-full flex items-center gap-3">
                          <div className="flex-1 text-xs text-blue-800">
                            <span className="font-medium">Started at: </span>
                            <strong>
                              {trip.tripStartedAt ? new Date(trip.tripStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In transit'}
                            </strong>
                          </div>
                          <button
                            onClick={() => setConfirmEndModal(trip)}
                            className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2"
                          >
                            <Square className="w-4 h-4 fill-white" />
                            <span>End Trip</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions & Recent Requests */}
          <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Department Transport Indents</h3>
                <p className="text-xs text-slate-500">Overview of recent logistics requests for {user?.departmentCode || 'your department'}</p>
              </div>
              <button
                onClick={() => setActiveTab('new_req')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Request</span>
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No transport requests logged yet. Click "New Request" to book a Bus, Car, or Bike.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 px-3">Ticket ID</th>
                      <th className="pb-3 px-3">Vehicle</th>
                      <th className="pb-3 px-3">Purpose</th>
                      <th className="pb-3 px-3">Persons</th>
                      <th className="pb-3 px-3">Date &amp; Start Time</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.slice(0, 5).map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{req.id}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                            {getVehicleIcon(req.transportType, 'w-3.5 h-3.5')}
                            {req.transportType}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 max-w-xs truncate">{req.purpose}</td>
                        <td className="py-3 px-3 font-bold text-slate-700">{req.personCount}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {req.startDate} at {req.startTime}
                        </td>
                        <td className="py-3 px-3">{getStatusBadge(req.status)}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedRequestDetails(req)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Search & Filters */}
          <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, purpose, vehicle..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {(['All', 'PENDING_AO', 'APPROVED', 'STARTED', 'COMPLETED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    historyStatusFilter === st
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'All' ? 'All' : st === 'PENDING_AO' ? 'Pending AO' : st}
                </button>
              ))}
            </div>
          </div>

          {/* History Cards List */}
          {filteredHistory.length === 0 ? (
            <div className="admin-card p-12 bg-white rounded-2xl border border-slate-200/80 text-center text-slate-500 text-sm">
              No transport requests match your filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHistory.map((req) => (
                <div
                  key={req.id}
                  className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white flex items-center gap-1.5">
                          {getVehicleIcon(req.transportType, 'w-4 h-4')}
                          {req.transportType}
                        </span>
                        <span className="font-black text-slate-900 text-sm">{req.id}</span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    {/* Purpose */}
                    <h4 className="text-base font-bold text-slate-900 mt-3">{req.purpose}</h4>

                    {/* Trip Specs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 p-3 rounded-xl bg-slate-50 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Passengers</span>
                        <strong className="text-slate-800">{req.personCount} Persons</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Departure Date</span>
                        <strong className="text-slate-800">{req.startDate}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Start Timing</span>
                        <strong className="text-slate-800">{req.startTime}</strong>
                      </div>
                    </div>

                    {/* Allocation Details if approved */}
                    {req.allocatedVehicle && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900">Vehicle Allotted by AO:</span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            Count: {req.allocatedVehicleCount || 1}
                          </span>
                        </div>
                        <p className="font-extrabold text-slate-900 text-sm">{req.allocatedVehicle}</p>
                        {req.aoRemarks && (
                          <p className="text-xs text-emerald-800 italic">"{req.aoRemarks}"</p>
                        )}
                      </div>
                    )}

                    {/* Rejection Reason if rejected */}
                    {req.status === 'REJECTED' && req.aoRemarks && (
                      <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1">
                        <span className="font-bold text-red-900">AO Decline Reason:</span>
                        <p className="text-red-800 italic">"{req.aoRemarks}"</p>
                      </div>
                    )}

                    {/* Live Timing Timeline */}
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Submitted on:</span>
                        <span className="font-semibold text-slate-700">{new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                      {req.aoActionAt && (
                        <div className="flex items-center justify-between">
                          <span>AO Allotted:</span>
                          <span className="font-semibold text-emerald-700">{new Date(req.aoActionAt).toLocaleString()}</span>
                        </div>
                      )}
                      {req.tripStartedAt && (
                        <div className="flex items-center justify-between">
                          <span>Trip Started:</span>
                          <span className="font-semibold text-blue-700">{new Date(req.tripStartedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {req.tripEndedAt && (
                        <div className="flex items-center justify-between">
                          <span>Trip Ended:</span>
                          <span className="font-semibold text-slate-900">{new Date(req.tripEndedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {req.tripStartedAt && req.tripEndedAt && (
                        <div className="flex items-center justify-between font-bold text-emerald-800 pt-1 border-t border-dashed border-slate-200">
                          <span>Total Duration:</span>
                          <span>{calculateDuration(req.tripStartedAt, req.tripEndedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {req.status === 'APPROVED' && (
                        <button
                          onClick={() => setConfirmStartModal(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Start Trip</span>
                        </button>
                      )}

                      {req.status === 'STARTED' && (
                        <button
                          onClick={() => setConfirmEndModal(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>End Trip</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedRequestDetails(req)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                      >
                        Details
                      </button>
                    </div>

                    <button
                      onClick={() => setDeleteModalReq(req)}
                      title="Delete this request from history"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NEW REQUEST */}
      {activeTab === 'new_req' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {submittedTicket ? (
            /* Submission Success Screen */
            <div className="admin-card p-8 bg-white rounded-3xl border border-emerald-200 text-center shadow-xs space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Request Dispatched to Administrative Officer (AO)
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
                  Transport Ticket #{submittedTicket.id}
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Your department transport booking for <strong>{submittedTicket.transportType}</strong> on <strong>{submittedTicket.startDate}</strong> ({submittedTicket.startTime}) has been forwarded to the AO for vehicle allotment.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle Type:</span>
                  <strong className="text-slate-800">{submittedTicket.transportType}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Passengers:</span>
                  <strong className="text-slate-800">{submittedTicket.personCount} Persons</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timing:</span>
                  <strong className="text-slate-800">{submittedTicket.startDate} at {submittedTicket.startTime}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold text-amber-700">Pending AO Allotment</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('history');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs"
                >
                  View in History
                </button>
                <button
                  onClick={() => resetForm()}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors"
                >
                  Raise Another Transport Request
                </button>
              </div>
            </div>
          ) : (
            /* New Request Form */
            <form onSubmit={handleCreateRequest} className="space-y-6">
              <div className="admin-card p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Book Department Transport (TR)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill in the travel requirements. The Administrative Officer (AO) will assign the vehicle with registration details.
                  </p>
                </div>

                {/* Step 1: Select Transport Type */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    1. Select the Type of Transport <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        type: 'BUS' as const,
                        label: 'BUS',
                        sub: 'College Bus',
                        desc: 'Group tours, industrial visits, 10-60 passengers',
                        icon: Bus,
                        defaultCount: 35,
                      },
                      {
                        type: 'Car' as const,
                        label: 'Car',
                        sub: 'Official Sedan / SUV',
                        desc: 'Faculty travels, guest pickups, 1-7 passengers',
                        icon: Car,
                        defaultCount: 4,
                      },
                      {
                        type: 'Bike' as const,
                        label: 'Bike',
                        sub: 'Two-Wheeler',
                        desc: 'Quick official errands, single faculty / courier',
                        icon: Bike,
                        defaultCount: 1,
                      },
                    ].map((item) => {
                      const IconComp = item.icon;
                      const isSelected = transportType === item.type;
                      return (
                        <div
                          key={item.type}
                          onClick={() => {
                            setTransportType(item.type);
                            setPersonCount(item.defaultCount);
                          }}
                          className={`cursor-pointer p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <IconComp className="w-5 h-5" />
                              </div>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-extrabold text-slate-900">{item.label}</h4>
                            <p className="text-xs font-semibold text-emerald-800 mt-0.5">{item.sub}</p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Purpose of Travel */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    2. Purpose of Transport / Travel <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g., Industrial Visit for 3rd Year CSE students to Tech Park, OR Airport pickup for National Conference Chief Guest Dr. Sharma"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full p-3.5 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* Step 3: Count of Persons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      3. Count of Persons (Passengers) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {transportType === 'Bike'
                        ? 'Max 2 passengers recommended'
                        : transportType === 'Car'
                        ? 'Typically 1 to 7 passengers'
                        : 'Typically 10 to 60 passengers'}
                    </span>
                  </div>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={1}
                      max={transportType === 'Bike' ? 2 : transportType === 'Car' ? 10 : 100}
                      required
                      value={personCount}
                      onChange={(e) => setPersonCount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Step 4: Date and Timing - Start */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      4. Travel Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      5. Timing - Start (Departure) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 09:30 AM or 14:00"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Trigger */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Will be routed directly to the Administrative Officer (AO).
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Transport Indent</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* CONFIRM START TRIP MODAL */}
      {confirmStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <Play className="w-6 h-6 fill-emerald-700" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Mark Trip as Started?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will record the departure timestamp for Ticket #{confirmStartModal.id} and change status to <strong>Trip In Progress</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <strong className="text-slate-900">{confirmStartModal.allocatedVehicle || confirmStartModal.transportType}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Purpose:</span>
                <span className="text-slate-800 truncate max-w-xs">{confirmStartModal.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <strong className="text-emerald-700">{new Date().toLocaleTimeString()} (Current Time)</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmStartModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={handleStartTrip}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
              >
                {actionProcessing ? 'Starting...' : 'Confirm Started'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM END TRIP MODAL */}
      {confirmEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-inner">
              <Square className="w-6 h-6 fill-blue-700" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Mark Trip as Completed?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will record the completion timestamp for Ticket #{confirmEndModal.id} and calculate the total journey duration.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Started At:</span>
                <strong className="text-slate-800">
                  {confirmEndModal.tripStartedAt ? new Date(confirmEndModal.tripStartedAt).toLocaleTimeString() : '---'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Completion Time:</span>
                <strong className="text-blue-700">{new Date().toLocaleTimeString()} (Current Time)</strong>
              </div>
              {confirmEndModal.tripStartedAt && (
                <div className="flex justify-between pt-1 border-t border-slate-200 text-emerald-800 font-bold">
                  <span>Estimated Duration:</span>
                  <span>{calculateDuration(confirmEndModal.tripStartedAt, new Date().toISOString())}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEndModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={handleEndTrip}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                {actionProcessing ? 'Completing...' : 'Confirm Trip Ended'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Delete Transport Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete Ticket <strong>#{deleteModalReq.id}</strong> from your department's history? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalReq(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={handleDeleteRequest}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors"
              >
                {actionProcessing ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS VIEW MODAL */}
      {selectedRequestDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-900 text-white inline-flex items-center gap-1.5">
                  {getVehicleIcon(selectedRequestDetails.transportType, 'w-4 h-4')}
                  {selectedRequestDetails.transportType}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1.5">
                  Ticket #{selectedRequestDetails.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequestDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Status Pill */}
            <div>{getStatusBadge(selectedRequestDetails.status)}</div>

            {/* Purpose */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purpose of Travel</span>
              <p className="text-sm font-semibold text-slate-800">{selectedRequestDetails.purpose}</p>
            </div>

            {/* Travel Specs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Count of Persons</span>
                <strong className="text-slate-900 text-sm">{selectedRequestDetails.personCount} Persons</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Date &amp; Start Time</span>
                <strong className="text-slate-900 text-sm">{selectedRequestDetails.startDate} ({selectedRequestDetails.startTime})</strong>
              </div>
            </div>

            {/* Allocation Info */}
            {selectedRequestDetails.allocatedVehicle && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 uppercase tracking-wide text-[10px]">AO Allocation</span>
                  <span className="font-bold text-emerald-700">Count: {selectedRequestDetails.allocatedVehicleCount || 1}</span>
                </div>
                <p className="text-base font-extrabold text-slate-900">{selectedRequestDetails.allocatedVehicle}</p>
                {selectedRequestDetails.aoRemarks && (
                  <p className="text-xs text-emerald-800 italic">"{selectedRequestDetails.aoRemarks}"</p>
                )}
              </div>
            )}

            {/* Complete Timing Tracking Timeline */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Timings Audit</span>
              <div className="space-y-1.5 divide-y divide-slate-200/60">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">1. Indent Submitted:</span>
                  <span className="font-medium text-slate-800">{new Date(selectedRequestDetails.createdAt).toLocaleString()}</span>
                </div>
                {selectedRequestDetails.aoActionAt && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500">2. AO Allocated:</span>
                    <span className="font-bold text-emerald-700">{new Date(selectedRequestDetails.aoActionAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedRequestDetails.tripStartedAt && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500">3. Trip Started:</span>
                    <span className="font-bold text-blue-700">{new Date(selectedRequestDetails.tripStartedAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedRequestDetails.tripEndedAt && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-slate-500">4. Trip Completed:</span>
                    <span className="font-bold text-slate-900">{new Date(selectedRequestDetails.tripEndedAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedRequestDetails.tripStartedAt && selectedRequestDetails.tripEndedAt && (
                  <div className="flex justify-between pt-1.5 text-emerald-800 font-extrabold">
                    <span>Total Trip Duration:</span>
                    <span>{calculateDuration(selectedRequestDetails.tripStartedAt, selectedRequestDetails.tripEndedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRequestDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODTRModule;
