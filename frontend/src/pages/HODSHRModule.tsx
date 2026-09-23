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
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeminarHall, SeminarHallRequest, CalendarBooking } from '../types';
import { SeminarHallCalendar } from '../components/SeminarHallCalendar';

interface HODSHRModuleProps {
  onSwitchToSMS: () => void;
  onSwitchToSTR?: () => void;
  onSwitchToTR?: () => void;
}

export const HODSHRModule: React.FC<HODSHRModuleProps> = ({
  onSwitchToSMS,
  onSwitchToSTR,
  onSwitchToTR,
}) => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const isPrincipal = user?.role === 'ROLE_PRINCIPAL';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'new_req'>('dashboard');
  const [halls, setHalls] = useState<SeminarHall[]>([]);
  const [requests, setRequests] = useState<SeminarHallRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  // Calendar bookings across all departments
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);

  // New Request Wizard State
  const [selectedHall, setSelectedHall] = useState<SeminarHall | null>(null);
  const [resourcePersonName, setResourcePersonName] = useState('');
  const [participantsCount, setParticipantsCount] = useState<number | string>(0);
  const [noOfDays, setNoOfDays] = useState<number>(1);
  const [eventDate, setEventDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<'FN' | 'AN' | 'Full Day'>('FN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<SeminarHallRequest | null>(null);
  const [principalOverride, setPrincipalOverride] = useState(false);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm(`Are you sure you want to delete seminar hall request ${requestId}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/seminar-requests/${requestId}`);
      toast.success(`Request ${requestId} deleted successfully.`);
      fetchData();
      if (selectedHall) fetchCalendarBookings(selectedHall.id);
    } catch (err: any) {
      console.error('Failed to delete seminar hall request:', err);
      toast.error(err.response?.data || 'Failed to delete request.');
    }
  };

  const fetchCalendarBookings = async (hallId?: number) => {
    try {
      const url = hallId
        ? `/seminar-requests/calendar-bookings?seminarHallId=${hallId}`
        : '/seminar-requests/calendar-bookings';
      const res = await api.get(url);
      setCalendarBookings(res.data);
    } catch (err) {
      console.error('Failed to load calendar bookings:', err);
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
      if (!selectedHall && hallsRes.data.length > 0) {
        setSelectedHall(hallsRes.data[0]);
      }
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

  useEffect(() => {
    if (selectedHall) {
      fetchCalendarBookings(selectedHall.id);
    } else {
      fetchCalendarBookings();
    }
  }, [selectedHall?.id, dashboardTick]);

  const resetForm = () => {
    setResourcePersonName('');
    setParticipantsCount(0);
    setNoOfDays(1);
    setEventDate('');
    setTimeSlot('FN');
    setStartDate('');
    setEndDate('');
    setEventTitle('');
    setEventDescription('');
    setSubmittedTicket(null);
    setPrincipalOverride(false);
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
        toast.error('Please select the event date from calendar');
        return;
      }
      if (!timeSlot) {
        toast.error('Please select a session (FN, AN, or Full Day)');
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
        endDate: noOfDays > 1 ? endDate : null,
        override: isPrincipal ? principalOverride : false
      };

      const res = await api.post('/seminar-requests', payload);
      setSubmittedTicket(res.data);
      toast.success(`Request ${res.data.id} submitted successfully!`);
      fetchData();
      if (selectedHall) fetchCalendarBookings(selectedHall.id);
    } catch (err: any) {
      if (err.response?.status === 409) {
        const errorData = err.response.data;
        if (errorData?.canOverride && isPrincipal) {
          setPrincipalOverride(true);
          toast.error(errorData.message || 'Slot already booked. Check the override option to proceed as Principal.');
        } else {
          const msg = typeof errorData === 'string' ? errorData : (errorData?.error || errorData?.message || 'Slot already booked by another department.');
          toast.error(msg, { duration: 6000 });
        }
      } else {
        const msg = err.response?.data || 'Failed to submit seminar hall request';
        toast.error(typeof msg === 'string' ? msg : 'Error submitting request');
      }
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

  const normalizeDateKey = (val?: string | null): string => {
    if (!val) return '';
    return String(val).substring(0, 10);
  };

  // Calculate bookings and slot availability for selected date
  const selectedDateBookings = eventDate ? calendarBookings.filter(b => {
    const target = normalizeDateKey(eventDate);
    const bDate = normalizeDateKey(b.eventDate);
    const bStart = normalizeDateKey(b.startDate);
    const bEnd = normalizeDateKey(b.endDate);
    if (b.noOfDays === 1) return bDate === target;
    return bStart && bEnd && target >= bStart && target <= bEnd;
  }) : [];

  const multiDayConflicts = (noOfDays > 1 && startDate && endDate) ? calendarBookings.filter(b => {
    const candStart = normalizeDateKey(startDate);
    const candEnd = normalizeDateKey(endDate);
    const isMulti = b.noOfDays > 1;
    const existStart = normalizeDateKey(isMulti ? b.startDate : b.eventDate);
    const existEnd = normalizeDateKey(isMulti ? b.endDate : b.eventDate);
    if (!existStart || !existEnd) return false;
    return candStart <= existEnd && existStart <= candEnd;
  }) : [];

  const fullDayBooking = selectedDateBookings.find(b => b.noOfDays > 1 || b.timeSlot === 'Full Day');
  const fnBooking = selectedDateBookings.find(b => b.noOfDays === 1 && b.timeSlot === 'FN');
  const anBooking = selectedDateBookings.find(b => b.noOfDays === 1 && b.timeSlot === 'AN');

  const isFNDisabled = !isPrincipal && (!!fullDayBooking || !!fnBooking);
  const isANDisabled = !isPrincipal && (!!fullDayBooking || !!anBooking);
  const isFullDayDisabled = !isPrincipal && (!!fullDayBooking || !!fnBooking || !!anBooking);

  const hasConflictOnSlot = noOfDays === 1
    ? (timeSlot === 'Full Day' ? (!!fullDayBooking || !!fnBooking || !!anBooking) : (timeSlot === 'FN' ? (!!fullDayBooking || !!fnBooking) : (!!fullDayBooking || !!anBooking)))
    : multiDayConflicts.length > 0;

  const handleSelectDate = (date: string) => {
    setEventDate(date);
    if (noOfDays > 1 && !startDate) setStartDate(date);

    // Auto-select available slot if one half of the day is already reserved
    const target = normalizeDateKey(date);
    const dayBookings = calendarBookings.filter(b => {
      const bDate = normalizeDateKey(b.eventDate);
      const bStart = normalizeDateKey(b.startDate);
      const bEnd = normalizeDateKey(b.endDate);
      if (b.noOfDays === 1) return bDate === target;
      return bStart && bEnd && target >= bStart && target <= bEnd;
    });

    const hasFull = dayBookings.some(b => b.noOfDays > 1 || b.timeSlot === 'Full Day');
    const hasFN = dayBookings.some(b => b.noOfDays === 1 && b.timeSlot === 'FN');
    const hasAN = dayBookings.some(b => b.noOfDays === 1 && b.timeSlot === 'AN');

    if (!isPrincipal && !hasFull) {
      if (hasFN && !hasAN) {
        setTimeSlot('AN');
      } else if (hasAN && !hasFN) {
        setTimeSlot('FN');
      } else if (!hasFN && !hasAN) {
        setTimeSlot('FN');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner Navigation */}
      <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
            <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
            SHR Module • Seminar Hall Booking System
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Seminar Hall Request Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department: <span className="text-slate-800 font-semibold">{user?.departmentCode || 'HOD'}</span> • Logged in as <span className="text-slate-800 font-semibold">{user?.name}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <button
            onClick={onSwitchToSMS}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>SMS Core</span>
          </button>
          {onSwitchToSTR && (
            <button
              onClick={onSwitchToSTR}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold transition-all"
            >
              <span>STR (Stationary)</span>
            </button>
          )}
          {onSwitchToTR && (
            <button
              onClick={onSwitchToTR}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold transition-all"
            >
              <span>TR (Transport)</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs: Dashboard, History, New Req */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => { setActiveTab('dashboard'); setSubmittedTicket(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Dashboard
        </button>

        <button
          onClick={() => { setActiveTab('history'); setSubmittedTicket(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          History
          {requests.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'history' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('new_req'); resetForm(); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'new_req'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
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
            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-500">Total Bookings</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-800">{stats.total}</div>
              <p className="text-[11px] text-slate-500 mt-1">Total requests initiated</p>
            </div>

            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-amber-600">Pending Review</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600">{stats.pending}</div>
              <p className="text-[11px] text-slate-500 mt-1">Awaiting allocator action</p>
            </div>

            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-emerald-600">Allocated / Approved</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600">{stats.approved}</div>
              <p className="text-[11px] text-slate-500 mt-1">Confirmed seminar hall events</p>
            </div>

            <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-red-500">Declined / Rejected</span>
                <div className="p-2 rounded-xl bg-red-50 text-red-500">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-red-600">{stats.rejected}</div>
              <p className="text-[11px] text-slate-500 mt-1">Slot unavailable / declined</p>
            </div>
          </div>

          {/* Quick Action Banner */}
          <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Need a Seminar Hall for an Upcoming Event?</h2>
              <p className="text-xs text-slate-600">
                Submit an event proposal for Block-3, Tech Hub, or Block-4 Seminar Halls. The designated allocator will review and confirm your slot.
              </p>
            </div>
            <button
              onClick={() => { setActiveTab('new_req'); resetForm(); }}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all transform active:scale-95 shadow-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Book Seminar Hall Now
            </button>
          </div>

          {/* Available Halls Overview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Available Institutional Seminar Halls
              </h3>
              <span className="text-xs text-slate-500">{halls.length} Halls Available</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {halls.map((hall, idx) => (
                <div
                  key={hall.id}
                  className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-400/80 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {hall.code || `HALL-${idx + 1}`}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2">
                      {hall.name}
                    </h4>

                    <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Location: <strong className="text-slate-800">{hall.block}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Capacity: <strong className="text-slate-800">{hall.capacity} Seats</strong></span>
                      </div>
                    </div>

                    {hall.facilities && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 mb-4">
                        {hall.facilities}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedHall(hall);
                      setActiveTab('new_req');
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:border-indigo-300"
                  >
                    <span>Request This Hall</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Requests Section */}
          <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Recent Department Bookings
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View Full History
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No seminar hall bookings found yet. Click "New Req" to submit your first request.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Ticket ID</th>
                      <th className="py-3 px-4">Seminar Hall</th>
                      <th className="py-3 px-4">Resource Person</th>
                      <th className="py-3 px-4">Timing / Duration</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.slice(0, 5).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.id}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{r.seminarHall?.name}</td>
                        <td className="py-3 px-4 text-slate-700">{r.resourcePersonName}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.noOfDays === 1
                            ? `${r.eventDate} (${r.timeSlot})`
                            : `${r.startDate} to ${r.endDate} (${r.noOfDays} Days)`}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            r.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'Rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
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
          <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket, resource person, hall..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* History Request Cards List */}
          {filteredRequests.length === 0 ? (
            <div className="admin-card py-16 bg-white rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
              No matching seminar hall requests found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.map(req => (
                <div
                  key={req.id}
                  className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-xs transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                        {req.id}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">{req.seminarHall?.name}</h4>
                        <span className="text-xs text-slate-500">{req.seminarHall?.block}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer ml-1"
                        title="Delete this request from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Resource Person</span>
                      <strong className="text-slate-800 text-sm block">{req.resourcePersonName}</strong>
                    </div>

                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Participants Count</span>
                      <strong className="text-indigo-700 text-sm block">{req.participantsCount} Attendees</strong>
                    </div>

                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Duration & Slot</span>
                      {req.noOfDays === 1 ? (
                        <div>
                          <strong className="text-slate-800 block">{req.eventDate}</strong>
                          <span className="text-amber-700 font-semibold">{req.timeSlot}</span>
                        </div>
                      ) : (
                        <div>
                          <strong className="text-slate-800 block">{req.noOfDays} Days Event</strong>
                          <span className="text-slate-500">{req.startDate} to {req.endDate}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Allocated By</span>
                      {req.allocatedBy ? (
                        <strong className="text-emerald-700 block">{req.allocatedBy.name}</strong>
                      ) : (
                        <span className="text-slate-500 block">Assigned Hall Allocator</span>
                      )}
                    </div>
                  </div>

                  {/* Topic / Event Title */}
                  {req.eventTitle && (
                    <div className="text-xs mb-3 text-slate-600">
                      <strong className="text-slate-800">Event Topic:</strong> {req.eventTitle}
                    </div>
                  )}

                  {/* Allocator Remarks */}
                  {req.allocatorRemarks && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 flex items-start gap-2">
                      <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
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
            <div className="admin-card p-8 bg-white rounded-3xl border border-emerald-200 text-center shadow-xs animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Request Dispatched Successfully!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                Your Seminar Hall booking request has been submitted and routed directly to the designated Allocator for <strong className="text-slate-800">{submittedTicket.seminarHall?.name}</strong>.
              </p>

              <div className="inline-block p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 mb-8 min-w-[280px]">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Ticket ID:</span>
                  <span className="font-mono font-bold text-indigo-700">{submittedTicket.id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Seminar Hall:</span>
                  <span className="font-semibold text-slate-800">{submittedTicket.seminarHall?.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Resource Person:</span>
                  <span className="font-semibold text-slate-800">{submittedTicket.resourcePersonName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Participants:</span>
                  <span className="font-semibold text-indigo-700">{submittedTicket.participantsCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Timing:</span>
                  <span className="font-semibold text-amber-700">
                    {submittedTicket.noOfDays === 1
                      ? `${submittedTicket.eventDate} (${submittedTicket.timeSlot})`
                      : `${submittedTicket.startDate} to ${submittedTicket.endDate} (${submittedTicket.noOfDays} Days)`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => { setActiveTab('history'); setSubmittedTicket(null); }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  View in History
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-card p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Create New Seminar Hall Request</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select a seminar hall and choose your dates directly from the interactive availability calendar.
                </p>
              </div>

              {/* STEP 1: WHICH SEMINAR HALL? */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                  Step 1: Select Seminar Hall <span className="text-red-500">*</span>
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
                            ? 'bg-indigo-50/70 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                            : 'bg-slate-50/60 border-slate-200 hover:border-indigo-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {idx + 1}. {hall.block}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">{hall.name}</h4>
                        <p className="text-[11px] text-slate-500">Capacity: {hall.capacity} seats</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: SELECT DATE FROM INTERACTIVE CALENDAR */}
              {selectedHall && (
                <div className="mb-6 animate-fade-in">
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2">
                    Step 2: Check Availability &amp; Select Date from Calendar <span className="text-red-500">*</span>
                  </label>
                  <SeminarHallCalendar
                    bookings={calendarBookings}
                    selectedDate={eventDate}
                    onSelectDate={handleSelectDate}
                    hallName={selectedHall.name}
                    isPrincipal={isPrincipal}
                  />
                </div>
              )}

              {/* STEP 3: EVENT & SESSION DETAILS */}
              {selectedHall && (
                <form onSubmit={handleCreateRequest} className="space-y-5 animate-fade-in border-t border-slate-100 pt-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700">
                    Step 3: Reservation Details &amp; Requirements
                  </label>

                  {/* Duration Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Event Duration <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setNoOfDays(1)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          noOfDays === 1
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        1 Day Event
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (noOfDays === 1) {
                            setNoOfDays(2);
                            if (!startDate && eventDate) setStartDate(eventDate);
                          }
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          noOfDays > 1
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        More than 1 Day
                      </button>
                    </div>
                  </div>

                  {/* CONDITION A: IF 1 DAY */}
                  {noOfDays === 1 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Selected Event Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={eventDate}
                          onChange={e => setEventDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                      </div>

                      {/* SESSION SELECTION: FN, AN, FULL DAY (NO TIMINGS AS REQUESTED) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-700">
                            Select Session <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">
                            FN (Forenoon) • AN (Afternoon) • Full Day
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* FN BUTTON */}
                          <button
                            type="button"
                            disabled={isFNDisabled && !isPrincipal}
                            onClick={() => {
                              if (!isFNDisabled || isPrincipal) setTimeSlot('FN');
                            }}
                            className={`p-3.5 rounded-2xl text-xs font-bold border text-center transition-all relative flex flex-col items-center justify-between min-h-[105px] ${
                              isFNDisabled && !isPrincipal
                                ? fnBooking
                                  ? 'bg-amber-100 text-amber-950 border-2 border-amber-400 cursor-not-allowed shadow-2xs pointer-events-none'
                                  : 'bg-rose-100 text-rose-950 border-2 border-rose-400 cursor-not-allowed shadow-2xs pointer-events-none'
                                : timeSlot === 'FN'
                                ? 'bg-indigo-600 text-white border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-full">
                              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                {isFNDisabled && !isPrincipal && <Lock className="w-3.5 h-3.5 text-amber-800" />}
                                <span className="font-black text-base">FN</span>
                              </div>
                              <span className="text-[11px] opacity-85 block">Forenoon</span>
                            </div>

                            {fnBooking && (
                              <div className="w-full mt-2 pt-1.5 border-t border-amber-300/80 text-[10px] leading-tight">
                                <span className="font-extrabold text-amber-950 block truncate">
                                  🔒 Booked: {fnBooking.hodName}
                                </span>
                                <span className="text-[9px] text-amber-900 font-semibold block truncate">
                                  {fnBooking.departmentCode ? `(${fnBooking.departmentCode}) • ` : ''}{fnBooking.status}
                                </span>
                                {!isPrincipal && (
                                  <span className="text-[8px] font-black text-rose-700 uppercase tracking-wider block mt-0.5">
                                    Access Restricted
                                  </span>
                                )}
                              </div>
                            )}

                            {fullDayBooking && !fnBooking && (
                              <div className="w-full mt-2 pt-1.5 border-t border-rose-300/80 text-[10px] leading-tight">
                                <span className="font-extrabold text-rose-950 block truncate">
                                  🔒 Full Day Booked
                                </span>
                                <span className="text-[9px] text-rose-900 font-semibold block truncate">
                                  {fullDayBooking.hodName} ({fullDayBooking.departmentCode || 'Dept'})
                                </span>
                                {!isPrincipal && (
                                  <span className="text-[8px] font-black text-rose-700 uppercase tracking-wider block mt-0.5">
                                    Access Restricted
                                  </span>
                                )}
                              </div>
                            )}

                            {!isFNDisabled && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-2">
                                Available
                              </span>
                            )}
                          </button>

                          {/* AN BUTTON */}
                          <button
                            type="button"
                            disabled={isANDisabled && !isPrincipal}
                            onClick={() => {
                              if (!isANDisabled || isPrincipal) setTimeSlot('AN');
                            }}
                            className={`p-3.5 rounded-2xl text-xs font-bold border text-center transition-all relative flex flex-col items-center justify-between min-h-[105px] ${
                              isANDisabled && !isPrincipal
                                ? anBooking
                                  ? 'bg-blue-100 text-blue-950 border-2 border-blue-400 cursor-not-allowed shadow-2xs pointer-events-none'
                                  : 'bg-rose-100 text-rose-950 border-2 border-rose-400 cursor-not-allowed shadow-2xs pointer-events-none'
                                : timeSlot === 'AN'
                                ? 'bg-indigo-600 text-white border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-full">
                              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                {isANDisabled && !isPrincipal && <Lock className="w-3.5 h-3.5 text-blue-800" />}
                                <span className="font-black text-base">AN</span>
                              </div>
                              <span className="text-[11px] opacity-85 block">Afternoon</span>
                            </div>

                            {anBooking && (
                              <div className="w-full mt-2 pt-1.5 border-t border-blue-300/80 text-[10px] leading-tight">
                                <span className="font-extrabold text-blue-950 block truncate">
                                  🔒 Booked: {anBooking.hodName}
                                </span>
                                <span className="text-[9px] text-blue-900 font-semibold block truncate">
                                  {anBooking.departmentCode ? `(${anBooking.departmentCode}) • ` : ''}{anBooking.status}
                                </span>
                                {!isPrincipal && (
                                  <span className="text-[8px] font-black text-rose-700 uppercase tracking-wider block mt-0.5">
                                    Access Restricted
                                  </span>
                                )}
                              </div>
                            )}

                            {fullDayBooking && !anBooking && (
                              <div className="w-full mt-2 pt-1.5 border-t border-rose-300/80 text-[10px] leading-tight">
                                <span className="font-extrabold text-rose-950 block truncate">
                                  🔒 Full Day Booked
                                </span>
                                <span className="text-[9px] text-rose-900 font-semibold block truncate">
                                  {fullDayBooking.hodName} ({fullDayBooking.departmentCode || 'Dept'})
                                </span>
                                {!isPrincipal && (
                                  <span className="text-[8px] font-black text-rose-700 uppercase tracking-wider block mt-0.5">
                                    Access Restricted
                                  </span>
                                )}
                              </div>
                            )}

                            {!isANDisabled && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-2">
                                Available
                              </span>
                            )}
                          </button>

                          {/* FULL DAY BUTTON */}
                          <button
                            type="button"
                            disabled={isFullDayDisabled && !isPrincipal}
                            onClick={() => {
                              if (!isFullDayDisabled || isPrincipal) setTimeSlot('Full Day');
                            }}
                            className={`p-3.5 rounded-2xl text-xs font-bold border text-center transition-all relative flex flex-col items-center justify-between min-h-[105px] ${
                              isFullDayDisabled && !isPrincipal
                                ? 'bg-rose-100 text-rose-950 border-2 border-rose-400 cursor-not-allowed shadow-2xs pointer-events-none'
                                : timeSlot === 'Full Day'
                                ? 'bg-indigo-600 text-white border-2 border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-full">
                              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                {isFullDayDisabled && !isPrincipal && <Lock className="w-3.5 h-3.5 text-rose-800" />}
                                <span className="font-black text-base">Full Day</span>
                              </div>
                              <span className="text-[11px] opacity-85 block">Full Day</span>
                            </div>

                            {isFullDayDisabled && (
                              <div className="w-full mt-2 pt-1.5 border-t border-rose-300/80 text-[10px] leading-tight">
                                <span className="font-extrabold text-rose-950 block truncate">
                                  🔒 Slot Conflict
                                </span>
                                <span className="text-[9px] text-rose-900 font-semibold block truncate">
                                  {fullDayBooking ? `Booked: ${fullDayBooking.hodName}` : (fnBooking ? `FN: ${fnBooking.hodName}` : `AN: ${anBooking?.hodName}`)}
                                </span>
                                {!isPrincipal && (
                                  <span className="text-[8px] font-black text-rose-700 uppercase tracking-wider block mt-0.5">
                                    Access Restricted
                                  </span>
                                )}
                              </div>
                            )}

                            {!isFullDayDisabled && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-2">
                                Available
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* CONFLICT WARNING & PRINCIPAL OVERRIDE OPTION */}
                      {hasConflictOnSlot && (
                        <div className={`p-4 rounded-2xl border text-xs shadow-xs ${
                          isPrincipal ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-rose-50 border-2 border-rose-300 text-rose-900'
                        }`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                              isPrincipal ? 'bg-amber-200/70 text-amber-800' : 'bg-rose-200 text-rose-800'
                            }`}>
                              <Lock className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-sm">
                                  {isPrincipal ? 'Slot Overlap Detected' : '⛔ Access Blocked: Hall Already Reserved by Another HOD'}
                                </p>
                              </div>
                              <p className="text-xs">
                                {fullDayBooking
                                  ? `This hall is fully booked for this date by ${fullDayBooking.hodName} (${fullDayBooking.departmentCode || 'Dept'}).`
                                  : fnBooking && timeSlot === 'FN'
                                  ? `The Forenoon (FN) session is reserved by ${fnBooking.hodName} (${fnBooking.departmentCode || 'Dept'}). You can select the Afternoon (AN) session instead.`
                                  : anBooking && timeSlot === 'AN'
                                  ? `The Afternoon (AN) session is reserved by ${anBooking.hodName} (${anBooking.departmentCode || 'Dept'}). You can select the Forenoon (FN) session instead.`
                                  : `This session is unavailable on the chosen date for ${selectedHall.name}.`}
                              </p>
                              {isPrincipal ? (
                                <div className="pt-2 border-t border-amber-200 mt-2">
                                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-indigo-900">
                                    <input
                                      type="checkbox"
                                      checked={principalOverride}
                                      onChange={e => setPrincipalOverride(e.target.checked)}
                                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span>Principal Override: Supersede existing department booking</span>
                                  </label>
                                  <p className="text-[11px] text-slate-600 mt-1">
                                    Checking this will cancel the conflicting department booking, notify the HOD, and confirm your reservation.
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] font-semibold text-rose-800 pt-1">
                                  Another department's booking cannot be accessed or overridden. Only the Principal has permission to override existing bookings.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* CONDITION B: IF MORE THAN 1 DAY */
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-700">Event Duration (Days):</label>
                        <input
                          type="number"
                          min={2}
                          max={30}
                          value={noOfDays}
                          onChange={e => setNoOfDays(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-24 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs text-center font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Event Start Date (From) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Event End Date (To) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                        </div>
                      </div>

                      {isPrincipal ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                          <label className="flex items-center gap-2 cursor-pointer font-bold">
                            <input
                              type="checkbox"
                              checked={principalOverride}
                              onChange={e => setPrincipalOverride(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <span>Override any overlapping bookings during this date range (Principal Authority)</span>
                          </label>
                        </div>
                      ) : (
                        multiDayConflicts.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900">
                              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                              <span>Date Range Conflict: The selected range conflicts with existing bookings for {selectedHall.name}.</span>
                            </div>
                            <div className="space-y-0.5 pt-1 pl-5">
                              {multiDayConflicts.map(c => (
                                <div key={c.id} className="text-[11px] text-rose-800 font-medium">
                                  • {c.eventDate || `${c.startDate} to ${c.endDate}`} ({c.timeSlot || 'Full Day'}) - Booked by {c.hodName} ({c.departmentCode || 'Dept'}) [{c.status}]
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Resource Person Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Name of the Resource Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Kumar, Principal AI Architect"
                      value={resourcePersonName}
                      onChange={e => setResourcePersonName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Event Title / Topic */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Event or Topic <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hands-on Workshop on Cloud Security & AI Infrastructure"
                      value={eventTitle}
                      onChange={e => setEventTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Special Audio-Visual or Seating Requests */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Specific AV / Facility Requirements (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Wireless podium mic, HDMI connection for guest laptop, live Zoom broadcast rack"
                      value={eventDescription}
                      onChange={e => setEventDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Participants Count */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Participants Count <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedHall.capacity * 1.5}
                      placeholder="0"
                      value={participantsCount}
                      onChange={e => setParticipantsCount(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all border border-slate-200"
                    >
                      Clear
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || (hasConflictOnSlot && !principalOverride)}
                      className={`px-7 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all transform active:scale-95 shadow-sm flex items-center gap-2 ${
                        hasConflictOnSlot && !principalOverride
                          ? 'bg-rose-500 text-white cursor-not-allowed opacity-90'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      }`}
                    >
                      {isSubmitting ? (
                        <span>Processing Request...</span>
                      ) : hasConflictOnSlot && !principalOverride ? (
                        <>
                          <Lock className="w-4 h-4 text-white" />
                          <span>Hall Reserved by Another HOD – Access Restricted</span>
                        </>
                      ) : (
                        <>
                          <span>{principalOverride ? 'Override & Confirm Reservation' : 'Submit Seminar Hall Request'}</span>
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
