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
  Plus,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  Layers,
  Sparkles,
  HelpCircle,
  FileText,
  ChevronRight,
  Info,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeminarHall, SeminarHallRequest } from '../types';

interface HODSHRModuleProps {
  onSwitchToSMS: () => void;
}

export const HODSHRModule: React.FC<HODSHRModuleProps> = ({ onSwitchToSMS }) => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'new_req'>('dashboard');
  const [halls, setHalls] = useState<SeminarHall[]>([]);
  const [requests, setRequests] = useState<SeminarHallRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  // New Request Wizard State
  const [selectedHall, setSelectedHall] = useState<SeminarHall | null>(null);
  const [resourcePersonName, setResourcePersonName] = useState('');
  const [participantsCount, setParticipantsCount] = useState<number | string>('');
  const [noOfDays, setNoOfDays] = useState<number>(1);
  const [eventDate, setEventDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<'FN' | 'AN' | 'Full Day'>('FN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<SeminarHallRequest | null>(null);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [viewRequestDetail, setViewRequestDetail] = useState<SeminarHallRequest | null>(null);

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm(`Are you sure you want to delete seminar hall request ${requestId}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/seminar-requests/${requestId}`);
      toast.success(`Request ${requestId} deleted successfully.`);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete seminar hall request:', err);
      toast.error(err.response?.data || 'Failed to delete request.');
    }
  };

  const fetchData = async () => {
    try {
      const [hallsRes, requestsRes, statsRes] = await Promise.all([
        api.get('/seminar-halls'),
        api.get('/seminar-requests'),
        api.get('/seminar-requests/stats')
      ]);
      setHalls(hallsRes.data);
      setRequests(requestsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load SHR data:', err);
      toast.error('Failed to refresh seminar hall data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dashboardTick]);

  const resetForm = () => {
    setSelectedHall(null);
    setResourcePersonName('');
    setParticipantsCount('');
    setNoOfDays(1);
    setEventDate('');
    setTimeSlot('FN');
    setStartDate('');
    setEndDate('');
    setEventTitle('');
    setEventDescription('');
    setSubmittedTicket(null);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHall) {
      toast.error('Please select a seminar hall');
      return;
    }
    if (!resourcePersonName.trim()) {
      toast.error('Please enter the name of the Resource Person');
      return;
    }
    if (!participantsCount || Number(participantsCount) <= 0) {
      toast.error('Please enter a valid participants count');
      return;
    }

    if (noOfDays === 1) {
      if (!eventDate) {
        toast.error('Please select the event date');
        return;
      }
      if (!timeSlot) {
        toast.error('Please select a time slot (FN, AN, or Full Day)');
        return;
      }
    } else {
      if (!startDate || !endDate) {
        toast.error('Please select both start date and end date');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error('Start date cannot be after end date');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        seminarHallId: selectedHall.id,
        resourcePersonName: resourcePersonName.trim(),
        participantsCount: Number(participantsCount),
        eventTitle: eventTitle.trim() || `Event by ${resourcePersonName.trim()}`,
        eventDescription: eventDescription.trim(),
        noOfDays,
        eventDate: noOfDays === 1 ? eventDate : null,
        timeSlot: noOfDays === 1 ? timeSlot : null,
        startDate: noOfDays > 1 ? startDate : null,
        endDate: noOfDays > 1 ? endDate : null
      };

      const res = await api.post('/seminar-requests', payload);
      setSubmittedTicket(res.data);
      toast.success(`Request ${res.data.id} submitted successfully!`);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to submit seminar hall request';
      toast.error(typeof msg === 'string' ? msg : 'Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesStatus = historyStatusFilter === 'All' || r.status === historyStatusFilter;
    const matchesSearch =
      r.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      (r.resourcePersonName && r.resourcePersonName.toLowerCase().includes(historySearch.toLowerCase())) ||
      (r.eventTitle && r.eventTitle.toLowerCase().includes(historySearch.toLowerCase())) ||
      (r.seminarHall?.name && r.seminarHall.name.toLowerCase().includes(historySearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner Navigation */}
      <div className="bg-gradient-to-r from-[#1e293b]/90 via-[#0f172a]/95 to-[#1e293b]/90 border border-[#334155]/60 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <CalendarCheck2 className="w-4 h-4" />
            SHR Module • Seminar Hall Booking System
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Seminar Hall Request Portal
          </h1>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Department: <span className="text-white font-semibold">{user?.departmentCode || 'HOD'}</span> • Logged in as <span className="text-white font-semibold">{user?.name}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Module Switcher button */}
          <button
            onClick={onSwitchToSMS}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-purple/15 hover:bg-brand-purple/25 border border-brand-purple/30 text-brand-purple text-xs font-bold transition-all transform active:scale-95 shadow-sm"
          >
            <Layers className="w-4 h-4" />
            Switch to SMS Portal
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs: Dashboard, History, New Req */}
      <div className="flex items-center gap-2 border-b border-[#334155]/60 pb-3">
        <button
          onClick={() => { setActiveTab('dashboard'); setSubmittedTicket(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-[#1e293b]/60 text-brand-textMuted hover:text-white hover:bg-[#1e293b]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Dashboard
        </button>

        <button
          onClick={() => { setActiveTab('history'); setSubmittedTicket(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-[#1e293b]/60 text-brand-textMuted hover:text-white hover:bg-[#1e293b]'
          }`}
        >
          <Clock className="w-4 h-4" />
          History
          {requests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('new_req'); resetForm(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'new_req'
              ? 'bg-gradient-to-r from-brand-purple to-indigo-600 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-brand-purple/15 text-indigo-300 hover:bg-brand-purple/25 border border-brand-purple/30'
          }`}
        >
          <Plus className="w-4 h-4" />
          New Req
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-[#334155]/60 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase text-brand-textMuted">Total Bookings</span>
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">{stats.total}</div>
              <p className="text-[11px] text-brand-textMuted mt-1">Total requests initiated</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-[#334155]/60 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase text-amber-400">Pending Review</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-400">{stats.pending}</div>
              <p className="text-[11px] text-brand-textMuted mt-1">Awaiting allocator action</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-[#334155]/60 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase text-emerald-400">Allocated / Approved</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">{stats.approved}</div>
              <p className="text-[11px] text-brand-textMuted mt-1">Confirmed seminar hall events</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/95 border border-[#334155]/60 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase text-red-400">Declined / Rejected</span>
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-red-400">{stats.rejected}</div>
              <p className="text-[11px] text-brand-textMuted mt-1">Slot unavailable / declined</p>
            </div>
          </div>

          {/* Quick Action Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/20 border border-indigo-500/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Need a Seminar Hall for an Upcoming Event?</h2>
              <p className="text-xs text-indigo-200">
                Submit an event proposal for Block-3, Tech Hub, or Block-4 Seminar Halls. The designated allocator will review and confirm your slot instantly.
              </p>
            </div>
            <button
              onClick={() => { setActiveTab('new_req'); resetForm(); }}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-indigo-600/40 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Book Seminar Hall Now
            </button>
          </div>

          {/* Available Halls Overview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Available Institutional Seminar Halls
              </h3>
              <span className="text-xs text-brand-textMuted">{halls.length} Halls Available</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {halls.map((hall, idx) => (
                <div
                  key={hall.id}
                  className="rounded-2xl bg-[#1e293b]/70 border border-[#334155]/60 hover:border-indigo-400/50 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl group backdrop-blur-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {hall.code || `HALL-${idx + 1}`}
                      </span>
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">
                      {hall.name}
                    </h4>

                    <div className="space-y-1.5 text-xs text-brand-textMuted mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Location: <strong className="text-white">{hall.block}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Capacity: <strong className="text-white">{hall.capacity} Seats</strong></span>
                      </div>
                    </div>

                    {hall.facilities && (
                      <p className="text-[11px] text-brand-textMuted bg-[#0f172a]/60 p-2.5 rounded-lg border border-[#334155]/40 line-clamp-2 mb-4">
                        {hall.facilities}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedHall(hall);
                      setActiveTab('new_req');
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:border-indigo-400/60"
                  >
                    <span>Request This Hall</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Requests Section */}
          <div className="rounded-2xl bg-[#1e293b]/70 border border-[#334155]/60 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Recent Department Bookings
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View Full History
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-xs text-brand-textMuted">
                No seminar hall bookings found yet. Click "New Req" to submit your first request.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-brand-textMuted">
                  <thead className="bg-[#0f172a]/60 text-white font-semibold uppercase tracking-wider text-[11px] border-b border-[#334155]/60">
                    <tr>
                      <th className="py-3 px-4">Ticket ID</th>
                      <th className="py-3 px-4">Seminar Hall</th>
                      <th className="py-3 px-4">Resource Person</th>
                      <th className="py-3 px-4">Timing / Duration</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/40">
                    {requests.slice(0, 5).map(r => (
                      <tr key={r.id} className="hover:bg-[#1e293b]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-300">{r.id}</td>
                        <td className="py-3 px-4 text-white font-medium">{r.seminarHall?.name}</td>
                        <td className="py-3 px-4">{r.resourcePersonName}</td>
                        <td className="py-3 px-4">
                          {r.noOfDays === 1
                            ? `${r.eventDate} (${r.timeSlot})`
                            : `${r.startDate} to ${r.endDate} (${r.noOfDays} Days)`}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            r.status === 'Approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'Rejected'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}>
                            {r.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                            {r.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                            {r.status === 'Pending' && <Clock className="w-3 h-3" />}
                            {r.status}
                          </span>
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

      {/* ========================================================================= */}
      {/* 2. HISTORY VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-5 animate-fade-in">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1e293b]/80 border border-[#334155]/60 rounded-2xl p-4 backdrop-blur-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted" />
              <input
                type="text"
                placeholder="Search ticket, resource person, hall..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white text-xs placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-brand-textMuted">Status:</span>
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyStatusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#0f172a]/60 text-brand-textMuted hover:text-white border border-[#334155]/40'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* History Request Cards List */}
          {filteredRequests.length === 0 ? (
            <div className="rounded-2xl bg-[#1e293b]/50 border border-[#334155]/60 py-16 text-center text-xs text-brand-textMuted">
              No matching seminar hall requests found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.map(req => (
                <div
                  key={req.id}
                  className="rounded-2xl bg-gradient-to-r from-[#1e293b]/90 to-[#0f172a]/95 border border-[#334155]/60 hover:border-indigo-500/50 p-5 backdrop-blur-xl shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#334155]/40 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-extrabold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                        {req.id}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-white">{req.seminarHall?.name}</h4>
                        <span className="text-xs text-brand-textMuted">{req.seminarHall?.block}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer ml-1"
                        title="Delete this request from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                    <div className="bg-[#0f172a]/60 p-3 rounded-xl border border-[#334155]/40">
                      <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Resource Person</span>
                      <strong className="text-white text-sm block">{req.resourcePersonName}</strong>
                    </div>

                    <div className="bg-[#0f172a]/60 p-3 rounded-xl border border-[#334155]/40">
                      <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Participants Count</span>
                      <strong className="text-indigo-300 text-sm block">{req.participantsCount} Attendees</strong>
                    </div>

                    <div className="bg-[#0f172a]/60 p-3 rounded-xl border border-[#334155]/40">
                      <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Duration & Slot</span>
                      {req.noOfDays === 1 ? (
                        <div>
                          <strong className="text-white block">{req.eventDate}</strong>
                          <span className="text-amber-400 font-semibold">{req.timeSlot}</span>
                        </div>
                      ) : (
                        <div>
                          <strong className="text-white block">{req.noOfDays} Days Event</strong>
                          <span className="text-brand-textMuted">{req.startDate} to {req.endDate}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#0f172a]/60 p-3 rounded-xl border border-[#334155]/40">
                      <span className="text-[10px] uppercase font-bold text-brand-textMuted block mb-1">Allocated By</span>
                      {req.allocatedBy ? (
                        <strong className="text-emerald-400 block">{req.allocatedBy.name}</strong>
                      ) : (
                        <span className="text-brand-textMuted block">Assigned Hall Allocator</span>
                      )}
                    </div>
                  </div>

                  {/* Topic / Event Title */}
                  {req.eventTitle && (
                    <div className="text-xs mb-3 text-brand-textMuted">
                      <strong className="text-white">Event Topic:</strong> {req.eventTitle}
                    </div>
                  )}

                  {/* Allocator Remarks */}
                  {req.allocatorRemarks && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2">
                      <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Allocator Remarks:</strong> {req.allocatorRemarks}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. NEW REQUEST VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'new_req' && (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
          {/* Submission Success Screen */}
          {submittedTicket ? (
            <div className="rounded-3xl bg-gradient-to-b from-[#1e293b]/90 to-[#0f172a]/95 border border-emerald-500/40 p-8 text-center backdrop-blur-2xl shadow-2xl animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Request Dispatched Successfully!</h2>
              <p className="text-sm text-brand-textMuted max-w-md mx-auto mb-6">
                Your Seminar Hall booking request has been submitted and routed directly to the designated Allocator for <strong className="text-white">{submittedTicket.seminarHall?.name}</strong>.
              </p>

              <div className="inline-block p-4 rounded-2xl bg-[#0f172a]/80 border border-[#334155]/60 text-left text-xs space-y-2 mb-8 min-w-[280px]">
                <div className="flex justify-between gap-4">
                  <span className="text-brand-textMuted">Ticket ID:</span>
                  <span className="font-mono font-bold text-indigo-400">{submittedTicket.id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-brand-textMuted">Seminar Hall:</span>
                  <span className="font-semibold text-white">{submittedTicket.seminarHall?.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-brand-textMuted">Resource Person:</span>
                  <span className="font-semibold text-white">{submittedTicket.resourcePersonName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-brand-textMuted">Participants:</span>
                  <span className="font-semibold text-indigo-300">{submittedTicket.participantsCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-brand-textMuted">Timing:</span>
                  <span className="font-semibold text-amber-400">
                    {submittedTicket.noOfDays === 1
                      ? `${submittedTicket.eventDate} (${submittedTicket.timeSlot})`
                      : `${submittedTicket.startDate} to ${submittedTicket.endDate} (${submittedTicket.noOfDays} Days)`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => { setActiveTab('history'); setSubmittedTicket(null); }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  View in History
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white text-xs font-bold transition-all border border-[#334155]/60"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-b from-[#1e293b]/90 to-[#0f172a]/95 border border-[#334155]/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Create New Seminar Hall Request</h2>
                <p className="text-xs text-brand-textMuted mt-1">
                  Select your requested seminar hall and provide event details for allocator approval.
                </p>
              </div>

              {/* STEP 1: WHICH SEMINAR HALL? */}
              <div className="mb-6">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-indigo-300 mb-3">
                  Step 1: Which Hall to be Requested? <span className="text-red-400">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {halls.map((hall, idx) => {
                    const isSelected = selectedHall?.id === hall.id;
                    return (
                      <div
                        key={hall.id}
                        onClick={() => setSelectedHall(hall)}
                        className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500'
                            : 'bg-[#0f172a]/60 border-[#334155]/60 hover:border-indigo-400/40 hover:bg-[#0f172a]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                            {idx + 1}. {hall.block}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{hall.name}</h4>
                        <p className="text-[11px] text-brand-textMuted">Capacity: {hall.capacity} seats</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: EVENT & RESOURCE PERSON DETAILS */}
              {selectedHall && (
                <form onSubmit={handleCreateRequest} className="space-y-5 animate-fade-in border-t border-[#334155]/40 pt-6">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                    <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span>
                      Booking Request for: <strong className="text-white">{selectedHall.name}</strong> ({selectedHall.block} • Max Capacity: {selectedHall.capacity})
                    </span>
                  </div>

                  {/* Resource Person Name */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Name of the Resource Person <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Kumar, Principal AI Architect"
                      value={resourcePersonName}
                      onChange={e => setResourcePersonName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white text-xs placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Participants Count */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Participants Count <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedHall.capacity * 1.5}
                      placeholder={`Expected number of attendees (Capacity: ${selectedHall.capacity})`}
                      value={participantsCount}
                      onChange={e => setParticipantsCount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white text-xs placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* No of Days */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">
                      Number of Days <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setNoOfDays(1)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          noOfDays === 1
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                            : 'bg-[#0f172a]/60 text-brand-textMuted border-[#334155]/60 hover:text-white'
                        }`}
                      >
                        1 Day Event
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (noOfDays === 1) setNoOfDays(2); }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          noOfDays > 1
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                            : 'bg-[#0f172a]/60 text-brand-textMuted border-[#334155]/60 hover:text-white'
                        }`}
                      >
                        More than 1 Day
                      </button>
                    </div>
                  </div>

                  {/* CONDITION A: IF 1 DAY */}
                  {noOfDays === 1 ? (
                    <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-[#334155]/60 space-y-4 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-white mb-1.5">
                          Event Date <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={eventDate}
                          onChange={e => setEventDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b]/70 border border-[#334155]/60 text-white text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-white mb-2">
                          Select Time Slot <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setTimeSlot('FN')}
                            className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                              timeSlot === 'FN'
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                                : 'bg-[#1e293b]/50 text-brand-textMuted border-[#334155]/40 hover:text-white'
                            }`}
                          >
                            <span className="block font-extrabold text-sm mb-0.5">FN</span>
                            <span className="text-[10px] opacity-80">Forenoon (09:00 - 13:00)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTimeSlot('AN')}
                            className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                              timeSlot === 'AN'
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                                : 'bg-[#1e293b]/50 text-brand-textMuted border-[#334155]/40 hover:text-white'
                            }`}
                          >
                            <span className="block font-extrabold text-sm mb-0.5">AN</span>
                            <span className="text-[10px] opacity-80">Afternoon (13:30 - 17:00)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTimeSlot('Full Day')}
                            className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                              timeSlot === 'Full Day'
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                                : 'bg-[#1e293b]/50 text-brand-textMuted border-[#334155]/40 hover:text-white'
                            }`}
                          >
                            <span className="block font-extrabold text-sm mb-0.5">Full Day</span>
                            <span className="text-[10px] opacity-80">All Day (09:00 - 17:00)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CONDITION B: IF MORE THAN 1 DAY */
                    <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-[#334155]/60 space-y-4 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-white">Event Duration (Days):</label>
                        <input
                          type="number"
                          min={2}
                          max={30}
                          value={noOfDays}
                          onChange={e => setNoOfDays(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-24 px-3 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155]/60 text-white text-xs text-center font-bold focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-white mb-1.5">
                            Event Start Date <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b]/70 border border-[#334155]/60 text-white text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-white mb-1.5">
                            Event End Date <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b]/70 border border-[#334155]/60 text-white text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Event Title / Topic */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Event Title / Topic (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2-Day Hands-on Workshop on Cloud Security"
                      value={eventTitle}
                      onChange={e => setEventTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white text-xs placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Special Audio-Visual or Seating Requests */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Specific AV / Facility Requirements (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Wireless podium mic, HDMI connection for guest laptop, live Zoom broadcast rack"
                      value={eventDescription}
                      onChange={e => setEventDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white text-xs placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-brand-textMuted hover:text-white text-xs font-bold transition-all"
                    >
                      Clear
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3 rounded-xl bg-gradient-to-r from-brand-purple to-indigo-600 hover:from-brand-purple/90 hover:to-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider transition-all transform active:scale-95 shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Dispatching to Allocator...</span>
                      ) : (
                        <>
                          <span>Submit Seminar Hall Request</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
