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
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeminarHall, SeminarHallRequest } from '../types';

export const PrincipalSeminarHallsPage: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'halls' | 'allocators' | 'bookings'>('halls');
  const [halls, setHalls] = useState<SeminarHall[]>([]);
  const [allocators, setAllocators] = useState<any[]>([]);
  const [bookings, setBookings] = useState<SeminarHallRequest[]>([]);
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

  // Filter
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const [hallsRes, allocsRes, bookingsRes] = await Promise.all([
        api.get('/seminar-halls'),
        api.get('/seminar-halls/allocators'),
        api.get('/seminar-requests')
      ]);
      setHalls(hallsRes.data);
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
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setHallModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Seminar Hall
          </button>

          <button
            onClick={() => setAllocatorModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Users className="w-4 h-4" />
            Add Hall Allocator
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('halls')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'bookings'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          All Bookings ({bookings.length})
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
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">College-Wide Seminar Hall Reservations</h3>
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
                          : b.status === 'Rejected'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
