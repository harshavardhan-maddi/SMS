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

  // Filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [hallsRes, allocsRes, reqsRes] = await Promise.all([
        api.get('/seminar-halls'),
        api.get('/seminar-halls/allocators'),
        api.get('/seminar-requests')
      ]);
      setHalls(hallsRes.data);
      setAllocators(allocsRes.data);
      setBookings(reqsRes.data);
    } catch (err) {
      console.error('Failed to load Principal seminar data:', err);
      toast.error('Failed to load seminar halls catalog');
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
      toast.error('Hall Name and Block are required');
      return;
    }

    setIsSubmittingHall(true);
    try {
      await api.post('/seminar-halls', {
        name: hallName.trim(),
        code: hallCode.trim(),
        block: hallBlock.trim(),
        capacity: Number(hallCapacity),
        facilities: hallFacilities.trim()
      });
      toast.success('Seminar Hall added successfully!');
      setHallModalOpen(false);
      setHallName('');
      setHallCode('');
      setHallBlock('');
      setHallCapacity(150);
      setHallFacilities('');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to add seminar hall';
      toast.error(typeof msg === 'string' ? msg : 'Error adding seminar hall');
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

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1e293b]/90 via-[#0f172a]/95 to-[#1e293b]/90 border border-[#334155]/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4" />
            Institution Hall Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Seminar Halls & Allocator Console
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Principal control panel to register institutional halls, configure allocator credentials, and oversee college-wide reservations.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setHallModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Add Seminar Hall
          </button>

          <button
            onClick={() => setAllocatorModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/30"
          >
            <Users className="w-4 h-4" />
            Add Hall Allocator
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#334155]/60 pb-3">
        <button
          onClick={() => setActiveTab('halls')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'halls'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-[#1e293b]/60 text-brand-textMuted hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Seminar Halls ({halls.length})
        </button>

        <button
          onClick={() => setActiveTab('allocators')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'allocators'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-[#1e293b]/60 text-brand-textMuted hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Hall Allocators ({allocators.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'bookings'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-[#1e293b]/60 text-brand-textMuted hover:text-white'
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
                className="rounded-2xl bg-[#1e293b]/80 border border-[#334155]/60 p-6 flex flex-col justify-between backdrop-blur-xl shadow-md hover:border-indigo-400/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {hall.code || `HALL-${idx + 1}`}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{hall.name}</h3>

                  <div className="space-y-1.5 text-xs text-brand-textMuted mb-4">
                    <div>Block / Location: <strong className="text-white">{hall.block}</strong></div>
                    <div>Seating Capacity: <strong className="text-emerald-400">{hall.capacity} Seats</strong></div>
                    <div>
                      Assigned Allocator:{' '}
                      {hall.allocatorName ? (
                        <strong className="text-indigo-300">{hall.allocatorName}</strong>
                      ) : (
                        <span className="text-amber-400">Not Assigned</span>
                      )}
                    </div>
                  </div>

                  {hall.facilities && (
                    <p className="text-[11px] text-brand-textMuted bg-[#0f172a]/60 p-2.5 rounded-lg border border-[#334155]/40 mb-4">
                      {hall.facilities}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HALL ALLOCATORS */}
      {activeTab === 'allocators' && (
        <div className="rounded-2xl bg-[#1e293b]/80 border border-[#334155]/60 overflow-hidden backdrop-blur-xl shadow-md animate-fade-in">
          <div className="p-4 border-b border-[#334155]/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Registered Seminar Hall Allocators</h3>
            <button
              onClick={() => setAllocatorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              New Allocator Login
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-brand-textMuted">
              <thead className="bg-[#0f172a]/60 text-white font-semibold uppercase tracking-wider text-[11px] border-b border-[#334155]/60">
                <tr>
                  <th className="py-3 px-4">Allocator Name</th>
                  <th className="py-3 px-4">Login ID / Email</th>
                  <th className="py-3 px-4">Assigned Seminar Hall</th>
                  <th className="py-3 px-4">Block Location</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/40">
                {allocators.map(alloc => (
                  <tr key={alloc.id} className="hover:bg-[#1e293b]/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{alloc.name}</td>
                    <td className="py-3.5 px-4 font-mono text-indigo-300">{alloc.email}</td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {alloc.seminar_hall_name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4">{alloc.seminar_hall_block || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
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
        <div className="rounded-2xl bg-[#1e293b]/80 border border-[#334155]/60 overflow-hidden backdrop-blur-xl shadow-md animate-fade-in">
          <div className="p-4 border-b border-[#334155]/60">
            <h3 className="text-sm font-bold text-white">College-Wide Seminar Hall Reservations</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-brand-textMuted">
              <thead className="bg-[#0f172a]/60 text-white font-semibold uppercase tracking-wider text-[11px] border-b border-[#334155]/60">
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
              <tbody className="divide-y divide-[#334155]/40">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-[#1e293b]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">{b.id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{b.seminarHall?.name}</td>
                    <td className="py-3 px-4">{b.department?.code || b.requester?.name}</td>
                    <td className="py-3 px-4">{b.resourcePersonName}</td>
                    <td className="py-3 px-4 text-indigo-300">{b.participantsCount}</td>
                    <td className="py-3 px-4">
                      {b.noOfDays === 1 ? `${b.eventDate} (${b.timeSlot})` : `${b.startDate} to ${b.endDate}`}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.status === 'Approved'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : b.status === 'Rejected'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e293b] border border-[#334155] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Add New Seminar Hall
              </h3>
              <button onClick={() => setHallModalOpen(false)} className="text-brand-textMuted hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddHall} className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-bold mb-1">Seminar Hall Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block-3 seminar hall"
                  value={hallName}
                  onChange={e => setHallName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Block / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block-3, 2nd Floor"
                  value={hallBlock}
                  onChange={e => setHallBlock(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white font-bold mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HALL-B3"
                    value={hallCode}
                    onChange={e => setHallCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-white font-bold mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min={10}
                    value={hallCapacity}
                    onChange={e => setHallCapacity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Facilities & Equipment</label>
                <textarea
                  rows={2}
                  placeholder="e.g. High-res projector, 7.1 surround sound, podium mic, AC"
                  value={hallFacilities}
                  onChange={e => setHallFacilities(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setHallModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#334155] text-brand-textMuted hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHall}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1e293b] border border-[#334155] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Add Seminar Hall Allocator
              </h3>
              <button onClick={() => setAllocatorModalOpen(false)} className="text-brand-textMuted hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddAllocator} className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-bold mb-1">Allocator Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block-3 Hall Allocator"
                  value={allocatorName}
                  onChange={e => setAllocatorName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Assigned Seminar Hall *</label>
                <select
                  required
                  value={allocatorHallId}
                  onChange={e => setAllocatorHallId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white focus:outline-none focus:border-indigo-500"
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
                <label className="block text-white font-bold mb-1">Login ID / Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. allocator.block3@sms.edu"
                  value={allocatorEmail}
                  onChange={e => setAllocatorEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Create strong password"
                  value={allocatorPassword}
                  onChange={e => setAllocatorPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a]/70 border border-[#334155]/60 text-white placeholder:text-brand-textMuted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAllocatorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#334155] text-brand-textMuted hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAllocator}
                  className="px-6 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold shadow-md shadow-brand-purple/30"
                >
                  {isSubmittingAllocator ? 'Creating...' : 'Create Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
