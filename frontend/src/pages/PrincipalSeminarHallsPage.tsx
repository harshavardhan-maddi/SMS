import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Building2,
  Users,
  Plus,
  Calendar,
  CalendarCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  Key,
  Trash2,
  Edit,
  Sparkles,
  Layers,
  FileText,
  ShieldAlert,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeminarHall, SeminarHallRequest, CalendarBooking } from '../types';
import { SeminarHallCalendar } from '../components/SeminarHallCalendar';

export const PrincipalSeminarHallsPage: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'halls' | 'allocators' | 'bookings' | 'new_booking'>('halls');
  const [halls, setHalls] = useState<SeminarHall[]>([]);
  const [allocators, setAllocators] = useState<any[]>([]);
  const [bookings, setBookings] = useState<SeminarHallRequest[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Hall Modal State
  const [hallModalOpen, setHallModalOpen] = useState(false);
  const [hallName, setHallName] = useState('');
  const [hallCode, setHallCode] = useState('');
  const [hallBlock, setHallBlock] = useState('');
  const [hallCapacity, setHallCapacity] = useState<number | string>(150);
  const [hallFacilities, setHallFacilities] = useState('');
  const [isSubmittingHall, setIsSubmittingHall] = useState(false);

  // Add Allocator Modal State
  const [allocatorModalOpen, setAllocatorModalOpen] = useState(false);
  const [allocatorName, setAllocatorName] = useState('');
  const [allocatorEmail, setAllocatorEmail] = useState('');
  const [allocatorPassword, setAllocatorPassword] = useState('');
  const [allocatorHallId, setAllocatorHallId] = useState<number | string>('');
  const [isSubmittingAllocator, setIsSubmittingAllocator] = useState(false);

  // Delete State
  const [hallToDelete, setHallToDelete] = useState<SeminarHall | null>(null);
  const [isDeletingHall, setIsDeletingHall] = useState(false);

  const [allocatorToDelete, setAllocatorToDelete] = useState<any | null>(null);
  const [isDeletingAllocator, setIsDeletingAllocator] = useState(false);

  // Override Booking Modal State
  const [bookingToOverride, setBookingToOverride] = useState<SeminarHallRequest | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  // Principal Booking Wizard State
  const [bookingHall, setBookingHall] = useState<SeminarHall | null>(null);
  const [resourcePersonName, setResourcePersonName] = useState('');
  const [participantsCount, setParticipantsCount] = useState<number | string>(0);
  const [noOfDays, setNoOfDays] = useState<number>(1);
  const [eventDate, setEventDate] = useState('');
  const [timeSlot, setTimeSlot] = useState<'FN' | 'AN' | 'Full Day'>('FN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [overrideConfirm, setOverrideConfirm] = useState(true); // Default true for Principal
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Filter
  const [searchTerm, setSearchTerm] = useState('');

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
      const [hallsRes, allocsRes, bookingsRes] = await Promise.all([
        api.get('/seminar-halls'),
        api.get('/seminar-halls/allocators'),
        api.get('/seminar-requests')
      ]);
      setHalls(hallsRes.data);
      if (!bookingHall && hallsRes.data.length > 0) {
        setBookingHall(hallsRes.data[0]);
      }
      setAllocators(allocsRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      console.error('Failed to load seminar halls data:', err);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dashboardTick]);

  useEffect(() => {
    if (bookingHall) {
      fetchCalendarBookings(bookingHall.id);
    } else {
      fetchCalendarBookings();
    }
  }, [bookingHall?.id, dashboardTick]);

  const handleDirectOverride = async () => {
    if (!bookingToOverride) return;
    if (!overrideReason.trim()) {
      toast.error('Please enter a reason for overriding this reservation');
      return;
    }

    setIsOverriding(true);
    try {
      await api.post(`/seminar-requests/${bookingToOverride.id}/override`, {
        remarks: overrideReason.trim()
      });
      toast.success(`Booking ${bookingToOverride.id} overridden & cancelled successfully!`);
      setBookingToOverride(null);
      setOverrideReason('');
      fetchData();
      if (bookingHall) fetchCalendarBookings(bookingHall.id);
    } catch (err: any) {
      console.error('Failed to override booking:', err);
      toast.error(err.response?.data || 'Failed to override booking');
    } finally {
      setIsOverriding(false);
    }
  };

  const handlePrincipalCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingHall) {
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

    setIsSubmittingBooking(true);
    try {
      const payload = {
        seminarHallId: bookingHall.id,
        resourcePersonName: resourcePersonName.trim(),
        participantsCount: Number(participantsCount),
        eventTitle: eventTitle.trim() || `Event by ${resourcePersonName.trim()}`,
        eventDescription: eventDescription.trim(),
        noOfDays,
        eventDate: noOfDays === 1 ? eventDate : null,
        timeSlot: noOfDays === 1 ? timeSlot : null,
        startDate: noOfDays > 1 ? startDate : null,
        endDate: noOfDays > 1 ? endDate : null,
        override: overrideConfirm
      };

      const res = await api.post('/seminar-requests', payload);
      toast.success(`Reservation ${res.data.id} created & approved by Principal!`);
      // Reset
      setResourcePersonName('');
      setParticipantsCount(0);
      setNoOfDays(1);
      setEventDate('');
      setTimeSlot('FN');
      setStartDate('');
      setEndDate('');
      setEventTitle('');
      setEventDescription('');
      setActiveTab('bookings');
      fetchData();
      if (bookingHall) fetchCalendarBookings(bookingHall.id);
    } catch (err: any) {
      if (err.response?.status === 409) {
        const errorData = err.response.data;
        toast.error(errorData?.message || 'Slot has a conflict. Enable override to proceed as Principal.');
      } else {
        const msg = err.response?.data || 'Failed to create booking';
        toast.error(typeof msg === 'string' ? msg : 'Error creating booking');
      }
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleAddHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallName.trim() || !hallBlock.trim()) {
      toast.error('Hall name and block location are required');
      return;
    }

    setIsSubmittingHall(true);
    try {
      await api.post('/seminar-halls', {
        name: hallName.trim(),
        code: hallCode.trim() || undefined,
        block: hallBlock.trim(),
        capacity: Number(hallCapacity) || 100,
        facilities: hallFacilities.trim() || undefined
      });
      toast.success(`Seminar Hall "${hallName}" added successfully!`);
      setHallModalOpen(false);
      setHallName('');
      setHallCode('');
      setHallBlock('');
      setHallCapacity(150);
      setHallFacilities('');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to add seminar hall';
      toast.error(typeof msg === 'string' ? msg : 'Error adding hall');
    } finally {
      setIsSubmittingHall(false);
    }
  };

  const handleAddAllocator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatorName.trim() || !allocatorEmail.trim() || !allocatorPassword || !allocatorHallId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmittingAllocator(true);
    try {
      await api.post('/seminar-halls/allocators', {
        name: allocatorName.trim(),
        email: allocatorEmail.trim().toLowerCase(),
        password: allocatorPassword,
        seminarHallId: Number(allocatorHallId)
      });
      toast.success(`Allocator account created for ${allocatorName}!`);
      setAllocatorModalOpen(false);
      setAllocatorName('');
      setAllocatorEmail('');
      setAllocatorPassword('');
      setAllocatorHallId('');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to create allocator account';
      toast.error(typeof msg === 'string' ? msg : 'Error creating allocator');
    } finally {
      setIsSubmittingAllocator(false);
    }
  };

  const handleDeleteHall = async () => {
    if (!hallToDelete) return;
    setIsDeletingHall(true);
    try {
      await api.delete(`/seminar-halls/${hallToDelete.id}`);
      toast.success(`Seminar Hall "${hallToDelete.name}" deleted successfully!`);
      setHallToDelete(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to delete seminar hall';
      toast.error(typeof msg === 'string' ? msg : 'Error deleting seminar hall');
    } finally {
      setIsDeletingHall(false);
    }
  };

  const handleDeleteAllocator = async () => {
    if (!allocatorToDelete) return;
    setIsDeletingAllocator(true);
    try {
      await api.delete(`/seminar-halls/allocators/${allocatorToDelete.id}`);
      toast.success(`Allocator "${allocatorToDelete.name}" removed successfully!`);
      setAllocatorToDelete(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to remove allocator';
      toast.error(typeof msg === 'string' ? msg : 'Error removing allocator');
    } finally {
      setIsDeletingAllocator(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Top Banner Header */}
      <div className="admin-card p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Institution Hall Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Seminar Halls &amp; Allocator Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Principal control panel to register institutional halls, configure allocator credentials, and oversee college-wide reservations.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab('new_booking');
              if (!bookingHall && halls.length > 0) setBookingHall(halls[0]);
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <CalendarCheck2 className="w-4 h-4" />
            Book &amp; Override
          </button>

          <button
            onClick={() => setHallModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Seminar Hall
          </button>

          <button
            onClick={() => setAllocatorModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            Add Hall Allocator
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('halls')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'halls'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Seminar Halls ({halls.length})
        </button>

        <button
          onClick={() => setActiveTab('allocators')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'allocators'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Hall Allocators ({allocators.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'bookings'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          All Bookings ({bookings.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('new_booking');
            if (!bookingHall && halls.length > 0) setBookingHall(halls[0]);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'new_booking'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          Book Hall &amp; Override
        </button>
      </div>

      {/* TAB 1: SEMINAR HALLS */}
      {activeTab === 'halls' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {halls.map((hall, idx) => (
              <div
                key={hall.id}
                className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 flex flex-col justify-between shadow-xs hover:border-indigo-300 transition-all"
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

                  <h3 className="text-lg font-bold text-slate-800 mb-2">{hall.name}</h3>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div>Block / Location: <strong className="text-slate-800">{hall.block}</strong></div>
                    <div>Seating Capacity: <strong className="text-emerald-700">{hall.capacity} Seats</strong></div>
                    <div>
                      Assigned Allocator:{' '}
                      {hall.allocatorName ? (
                        <strong className="text-indigo-700">{hall.allocatorName}</strong>
                      ) : (
                        <span className="text-amber-700 font-semibold">Not Assigned</span>
                      )}
                    </div>
                  </div>

                  {hall.facilities && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4">
                      {hall.facilities}
                    </p>
                  )}
                </div>

                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider">
                    Hall #{hall.id}
                  </span>
                  <button
                    onClick={() => setHallToDelete(hall)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Delete this seminar hall"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HALL ALLOCATORS */}
      {activeTab === 'allocators' && (
        <div className="admin-card bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-fade-in">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Registered Seminar Hall Allocators</h3>
            <button
              onClick={() => setAllocatorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Allocator Login
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Allocator Name</th>
                  <th className="py-3 px-4">Login ID / Email</th>
                  <th className="py-3 px-4">Assigned Seminar Hall</th>
                  <th className="py-3 px-4">Block Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocators.map(alloc => (
                  <tr key={alloc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{alloc.name}</td>
                    <td className="py-3.5 px-4 font-mono text-indigo-700">{alloc.email}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {alloc.seminar_hall_name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4">{alloc.seminar_hall_block || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setAllocatorToDelete(alloc)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Delete Allocator"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALL BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="admin-card bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-fade-in">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">College-Wide Seminar Hall Reservations</h3>
            <button
              onClick={() => {
                setActiveTab('new_booking');
                if (!bookingHall && halls.length > 0) setBookingHall(halls[0]);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Book Seminar Hall
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Seminar Hall</th>
                  <th className="py-3 px-4">Dept / HOD</th>
                  <th className="py-3 px-4">Resource Person</th>
                  <th className="py-3 px-4">Attendees</th>
                  <th className="py-3 px-4">Timing</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Principal Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{b.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{b.seminarHall?.name}</td>
                    <td className="py-3 px-4">{b.department?.code || b.requester?.name}</td>
                    <td className="py-3 px-4 text-slate-700">{b.resourcePersonName}</td>
                    <td className="py-3 px-4 text-indigo-700 font-semibold">{b.participantsCount}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {b.noOfDays === 1 ? `${b.eventDate} (${b.timeSlot})` : `${b.startDate} to ${b.endDate}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'Rejected' || b.status === 'Cancelled'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status !== 'Cancelled' && b.status !== 'Rejected' && (
                        <button
                          onClick={() => {
                            setBookingToOverride(b);
                            setOverrideReason('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Override or Cancel this Department Booking"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          <span>Override</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRINCIPAL BOOKING CONSOLE & OVERRIDE */}
      {activeTab === 'new_booking' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="admin-card p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Principal Direct Booking &amp; Override Authority
              </div>
              <h2 className="text-xl font-bold text-slate-800">Book Seminar Hall (Principal Console)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select any institutional hall, inspect date availability, and create reservations with full override authority over department bookings.
              </p>
            </div>

            {/* STEP 1: SELECT HALL */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Step 1: Select Seminar Hall <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {halls.map((hall, idx) => {
                  const isSelected = bookingHall?.id === hall.id;
                  return (
                    <div
                      key={hall.id}
                      onClick={() => setBookingHall(hall)}
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
            {bookingHall && (
              <div className="mb-6 animate-fade-in">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2">
                  Step 2: Check Availability &amp; Select Date from Calendar <span className="text-red-500">*</span>
                </label>
                <SeminarHallCalendar
                  bookings={calendarBookings}
                  selectedDate={eventDate}
                  onSelectDate={(d) => {
                    setEventDate(d);
                    if (noOfDays > 1 && !startDate) setStartDate(d);
                  }}
                  hallName={bookingHall.name}
                />
              </div>
            )}

            {/* STEP 3: DETAILS FORM */}
            {bookingHall && (
              <form onSubmit={handlePrincipalCreateBooking} className="space-y-5 animate-fade-in border-t border-slate-100 pt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Step 3: Reservation Details &amp; Override Settings
                </label>

                {/* Event Duration */}
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
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      More than 1 Day
                    </button>
                  </div>
                </div>

                {/* 1 Day Event Session */}
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
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700">
                          Select Session <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-500">
                          FN (Forenoon) • AN (Afternoon) • Full Day
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setTimeSlot('FN')}
                          className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                            timeSlot === 'FN'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block font-black text-base mb-0.5">FN</span>
                          <span className="text-[11px] opacity-85">Forenoon</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTimeSlot('AN')}
                          className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                            timeSlot === 'AN'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block font-black text-base mb-0.5">AN</span>
                          <span className="text-[11px] opacity-85">Afternoon</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTimeSlot('Full Day')}
                          className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                            timeSlot === 'Full Day'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block font-black text-base mb-0.5">Full Day</span>
                          <span className="text-[11px] opacity-85">Full Day</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
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
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
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
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Resource Person */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Name of the Resource Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Guest / Keynote Speaker"
                    value={resourcePersonName}
                    onChange={e => setResourcePersonName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Event or Topic */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Event or Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Institutional Academic Senate Meeting"
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Specific AV / Facility Requirements (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Specific AV / Facility Requirements (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Recording equipment, wireless mic, presidential podium"
                    value={eventDescription}
                    onChange={e => setEventDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
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
                    max={bookingHall.capacity * 1.5}
                    placeholder="0"
                    value={participantsCount}
                    onChange={e => setParticipantsCount(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Principal Override Confirmation Box */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={overrideConfirm}
                      onChange={e => setOverrideConfirm(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Automatically override any conflicting department reservations (Principal Privilege)</span>
                  </label>
                  <p className="text-[11px] text-slate-600 mt-1 pl-6">
                    If any department has booked this hall on the selected dates/session, that reservation will be superseded, marked as cancelled, and the HOD notified.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase tracking-wider transition-all transform active:scale-95 shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingBooking ? (
                      <span>Reserving Hall...</span>
                    ) : (
                      <>
                        <span>Confirm Principal Reservation</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PRINCIPAL OVERRIDE RESERVATION */}
      {bookingToOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Override Reservation</h3>
                  <span className="text-xs text-slate-500 font-mono">Ticket {bookingToOverride.id}</span>
                </div>
              </div>
              <button onClick={() => setBookingToOverride(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 mb-4">
              <div className="text-slate-800 font-semibold">
                Hall: {bookingToOverride.seminarHall?.name} ({bookingToOverride.seminarHall?.block})
              </div>
              <div className="text-slate-600">
                Booked by: <strong>{bookingToOverride.requester?.name}</strong> ({bookingToOverride.department?.code || 'HOD'})
              </div>
              <div className="text-slate-600">
                Event: {bookingToOverride.eventTitle || bookingToOverride.resourcePersonName}
              </div>
              <div className="text-amber-700 font-bold">
                Timing: {bookingToOverride.noOfDays === 1 ? `${bookingToOverride.eventDate} (${bookingToOverride.timeSlot})` : `${bookingToOverride.startDate} to ${bookingToOverride.endDate}`}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Overriding / Cancelling (Notified to HOD) *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Overridden for College Annual Academic Council Meeting convened by Principal"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBookingToOverride(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isOverriding || !overrideReason.trim()}
                onClick={handleDirectOverride}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isOverriding ? 'Processing...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SEMINAR HALL */}
      {hallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Add New Seminar Hall
              </h3>
              <button onClick={() => setHallModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddHall} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Seminar Hall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block-3 seminar hall"
                  value={hallName}
                  onChange={e => setHallName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Block / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block-3, 2nd Floor"
                  value={hallBlock}
                  onChange={e => setHallBlock(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HALL-B3"
                    value={hallCode}
                    onChange={e => setHallCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min={10}
                    value={hallCapacity}
                    onChange={e => setHallCapacity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Facilities &amp; Equipment</label>
                <textarea
                  rows={2}
                  placeholder="e.g. High-res projector, 7.1 surround sound, podium mic, AC"
                  value={hallFacilities}
                  onChange={e => setHallFacilities(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setHallModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHall}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  {isSubmittingHall ? 'Saving...' : 'Create Hall'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ALLOCATOR */}
      {allocatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Add Seminar Hall Allocator
              </h3>
              <button onClick={() => setAllocatorModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddAllocator} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Allocator Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block-3 Hall Allocator"
                  value={allocatorName}
                  onChange={e => setAllocatorName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Assigned Seminar Hall *</label>
                <select
                  required
                  value={allocatorHallId}
                  onChange={e => setAllocatorHallId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Seminar Hall --</option>
                  {halls.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.block})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Login ID / Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. allocator.block3@sms.edu"
                  value={allocatorEmail}
                  onChange={e => setAllocatorEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Create strong password"
                  value={allocatorPassword}
                  onChange={e => setAllocatorPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAllocatorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAllocator}
                  className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-xs"
                >
                  {isSubmittingAllocator ? 'Creating...' : 'Create Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE SEMINAR HALL */}
      {hallToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4 border border-red-200">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Seminar Hall</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-slate-800">&quot;{hallToDelete.name}&quot;</strong>?
              This will remove the hall from the booking catalog, delete any associated requests, and unlink its allocator.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setHallToDelete(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingHall}
                onClick={handleDeleteHall}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isDeletingHall ? 'Deleting...' : 'Yes, Delete Hall'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE ALLOCATOR */}
      {allocatorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4 border border-red-200">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">Remove Allocator Account</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to remove allocator <strong className="text-slate-800">&quot;{allocatorToDelete.name}&quot;</strong> ({allocatorToDelete.email})?
              They will no longer be able to log in to allocate seminar halls.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAllocatorToDelete(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingAllocator}
                onClick={handleDeleteAllocator}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isDeletingAllocator ? 'Removing...' : 'Yes, Remove Allocator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PrincipalSeminarHallsPage;
