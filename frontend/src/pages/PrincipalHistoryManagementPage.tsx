import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  Filter,
  Layers,
  CalendarCheck2,
  Package,
  Wrench,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Building2,
  Clock,
  User,
  ShieldAlert,
  Car,
  Hotel
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface UnifiedRequestItem {
  cardType: 'SMS' | 'SHR' | 'STR' | 'TR' | 'RA';
  id: string | number;
  title: string;
  department: string;
  requesterName: string;
  status: string;
  createdAt: string;
  details: string;
}

export const PrincipalHistoryManagementPage: React.FC = () => {
  const [activeCardFilter, setActiveCardFilter] = useState<'ALL' | 'SMS' | 'SHR' | 'STR' | 'TR' | 'RA'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Raw data from endpoints
  const [smsRequests, setSmsRequests] = useState<any[]>([]);
  const [shrRequests, setShrRequests] = useState<any[]>([]);
  const [strRequests, setStrRequests] = useState<any[]>([]);
  const [trRequests, setTrRequests] = useState<any[]>([]);
  const [raRequests, setRaRequests] = useState<any[]>([]);

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAllHistory = async () => {
    setLoading(true);
    try {
      const [smsRes, shrRes, strRes, trRes, raRes] = await Promise.allSettled([
        api.get('/repairs'),
        api.get('/seminar-requests'),
        api.get('/stationary/requests'),
        api.get('/transport/requests'),
        api.get('/ra/requests'),
      ]);

      if (smsRes.status === 'fulfilled') setSmsRequests(smsRes.value.data || []);
      if (shrRes.status === 'fulfilled') setShrRequests(shrRes.value.data || []);
      if (strRes.status === 'fulfilled') setStrRequests(strRes.value.data || []);
      if (trRes.status === 'fulfilled') setTrRequests(trRes.value.data || []);
      if (raRes.status === 'fulfilled') setRaRequests(raRes.value.data || []);
    } catch (err) {
      console.error('Failed to load history items:', err);
      toast.error('Failed to refresh history records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, []);

  // Transform and harmonize all 3 request types into UnifiedRequestItem
  const unifiedItems = useMemo<UnifiedRequestItem[]>(() => {
    const list: UnifiedRequestItem[] = [];

    // 1. SMS (Repairs)
    smsRequests.forEach((r) => {
      list.push({
        cardType: 'SMS',
        id: r.id,
        title: r.issueTitle || r.customIssueTitle || `Repair for ${r.inventory?.itemType || 'Equipment'}`,
        department: r.departmentName || r.departmentCode || r.inventory?.departmentCode || 'SMS Lab',
        requesterName: r.requester?.name || r.userName || 'Faculty/HOD',
        status: r.status || 'Initiated',
        createdAt: r.createdAt || r.created_at || new Date().toISOString(),
        details: `${r.inventory?.itemType || 'Item'} (Tag: ${r.inventoryId || '---'}) - Lab ${r.labNumber || 'Main'}`,
      });
    });

    // 2. SHR (Seminar Halls)
    shrRequests.forEach((r) => {
      const timing =
        r.noOfDays === 1
          ? `${r.eventDate} (${r.timeSlot})`
          : `${r.startDate} to ${r.endDate} (${r.noOfDays} Days)`;
      list.push({
        cardType: 'SHR',
        id: r.id,
        title: r.eventTitle || `Seminar by ${r.resourcePersonName}`,
        department: r.department?.name || r.departmentCode || 'Academic Dept',
        requesterName: r.requester?.name || 'HOD',
        status: r.status || 'Pending',
        createdAt: r.createdAt || new Date().toISOString(),
        details: `${r.seminarHall?.name || 'Hall'} • ${r.participantsCount} Attendees • ${timing}`,
      });
    });

    // 3. STR (Stationary)
    strRequests.forEach((r) => {
      list.push({
        cardType: 'STR',
        id: r.id,
        title: r.purpose || 'Stationary Indent Order',
        department: r.department?.name || r.departmentCode || 'Department',
        requesterName: r.requester?.name || 'HOD',
        status: r.status || 'PENDING_AO',
        createdAt: r.createdAt || new Date().toISOString(),
        details: `${r.totalItems} Items (${r.totalQuantity} Units)`,
      });
    });

    // 4. TR (Transport)
    trRequests.forEach((r) => {
      list.push({
        cardType: 'TR',
        id: r.id,
        title: r.purpose || 'Transport Indent',
        department: r.department?.name || r.departmentCode || 'Department',
        requesterName: r.requester?.name || 'HOD',
        status: r.status || 'PENDING_AO',
        createdAt: r.createdAt || new Date().toISOString(),
        details: `${r.transportType} (${r.personCount} Persons) • ${r.startDate} at ${r.startTime}${r.allocatedVehicle ? ` • Allocated: ${r.allocatedVehicle}` : ''}`,
      });
    });

    // 5. R&A (Refreshments & Accommodations)
    raRequests.forEach((r) => {
      const services = [];
      if (r.hasAccommodation) services.push(`Stay: ${r.accommodationType} (${r.accommodationPersonsCount} Pax)`);
      if (r.hasTeaSnacks) services.push(`Tea & Snacks (${r.teaCount}T, ${r.snacksCount}S)`);
      if (r.hasHostelFood) services.push(`Hostel Mess (${r.hostelFoodPersonsCount} Pax, ${r.hostelFoodRoomsCount} Rms)`);
      if (r.hasRestaurantFood) services.push(`Restaurant (${r.vegCount}V, ${r.nonVegCount}NV)`);

      list.push({
        cardType: 'RA',
        id: r.id,
        title: services.join(' • ') || 'Refreshment & Accommodation Request',
        department: r.department?.name || r.department?.code || 'Campus Dept',
        requesterName: r.requester?.name || 'HOD',
        status: r.status || 'PENDING_AO',
        createdAt: r.createdAt || new Date().toISOString(),
        details: r.accommodationPurpose || r.hostelFoodPurpose || r.teaSnacksPurpose || r.restaurantFoodPurpose || 'Hospitality Request',
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [smsRequests, shrRequests, strRequests, trRequests, raRequests]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      const matchesCard = activeCardFilter === 'ALL' || item.cardType === activeCardFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(item.id).toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.requesterName.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q);
      return matchesCard && matchesSearch;
    });
  }, [unifiedItems, activeCardFilter, searchQuery]);

  // Selection handlers
  const getItemKey = (item: UnifiedRequestItem) => `${item.cardType}:${item.id}`;

  const isAllSelected = filteredItems.length > 0 && filteredItems.every((it) => selectedKeys.has(getItemKey(it)));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      const newKeys = new Set<string>();
      filteredItems.forEach((it) => newKeys.add(getItemKey(it)));
      setSelectedKeys(newKeys);
    }
  };

  const handleToggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Delete single item
  const handleDeleteSingle = async (item: UnifiedRequestItem) => {
    if (!window.confirm(`Are you sure you want to delete ${item.cardType} request #${item.id}? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      if (item.cardType === 'SMS') {
        await api.delete(`/repairs/${item.id}`);
      } else if (item.cardType === 'SHR') {
        await api.delete(`/seminar-requests/${item.id}`);
      } else if (item.cardType === 'STR') {
        await api.delete(`/stationary/requests/${item.id}`);
      } else if (item.cardType === 'TR') {
        await api.delete(`/transport/requests/${item.id}`);
      } else if (item.cardType === 'RA') {
        await api.delete(`/ra/requests/${item.id}`);
      }
      toast.success(`${item.cardType} Request #${item.id} deleted successfully.`);
      fetchAllHistory();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err.response?.data || `Failed to delete ${item.cardType} request.`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete selected batch
  const handleDeleteSelected = async () => {
    const total = selectedKeys.size;
    if (total === 0) return;

    if (!window.confirm(`Are you sure you want to permanently delete ${total} selected request(s)? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const smsIds: number[] = [];
      const shrIds: string[] = [];
      const strIds: string[] = [];
      const trIds: string[] = [];
      const raIds: string[] = [];

      selectedKeys.forEach((key) => {
        const [type, id] = key.split(':');
        if (type === 'SMS') smsIds.push(Number(id));
        else if (type === 'SHR') shrIds.push(id);
        else if (type === 'STR') strIds.push(id);
        else if (type === 'TR') trIds.push(id);
        else if (type === 'RA') raIds.push(id);
      });

      const promises: Promise<any>[] = [];
      if (smsIds.length > 0) promises.push(api.post('/repairs/bulk-delete', { ids: smsIds }));
      if (shrIds.length > 0) promises.push(api.post('/seminar-requests/bulk-delete', { ids: shrIds }));
      if (strIds.length > 0) promises.push(api.post('/stationary/requests/bulk-delete', { ids: strIds }));
      if (trIds.length > 0) promises.push(api.post('/transport/requests/bulk-delete', { ids: trIds }));
      if (raIds.length > 0) promises.push(api.post('/ra/requests/bulk-delete', { ids: raIds }));

      await Promise.all(promises);
      toast.success(`Successfully deleted ${total} selected requests!`);
      setSelectedKeys(new Set());
      fetchAllHistory();
    } catch (err: any) {
      console.error('Failed bulk delete:', err);
      toast.error(err.response?.data || 'Failed to delete selected requests');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all in current filter
  const handleDeleteAllFiltered = async () => {
    const count = filteredItems.length;
    if (count === 0) {
      toast.error('No requests to delete in current filter.');
      return;
    }

    const cardLabel = activeCardFilter === 'ALL' ? 'ALL modules' : activeCardFilter;
    const confirmPrompt = window.prompt(
      `⚠️ CAUTION: You are about to permanently delete all ${count} request(s) for ${cardLabel}.\nType "CONFIRM" to proceed:`
    );

    if (confirmPrompt !== 'CONFIRM') {
      toast.error('Deletion cancelled.');
      return;
    }

    setIsDeleting(true);
    try {
      const smsIds: number[] = [];
      const shrIds: string[] = [];
      const strIds: string[] = [];
      const trIds: string[] = [];
      const raIds: string[] = [];

      filteredItems.forEach((it) => {
        if (it.cardType === 'SMS') smsIds.push(Number(it.id));
        else if (it.cardType === 'SHR') shrIds.push(String(it.id));
        else if (it.cardType === 'STR') strIds.push(String(it.id));
        else if (it.cardType === 'TR') trIds.push(String(it.id));
        else if (it.cardType === 'RA') raIds.push(String(it.id));
      });

      const promises: Promise<any>[] = [];
      if (smsIds.length > 0) promises.push(api.post('/repairs/bulk-delete', { ids: smsIds }));
      if (shrIds.length > 0) promises.push(api.post('/seminar-requests/bulk-delete', { ids: shrIds }));
      if (strIds.length > 0) promises.push(api.post('/stationary/requests/bulk-delete', { ids: strIds }));
      if (trIds.length > 0) promises.push(api.post('/transport/requests/bulk-delete', { ids: trIds }));
      if (raIds.length > 0) promises.push(api.post('/ra/requests/bulk-delete', { ids: raIds }));

      await Promise.all(promises);
      toast.success(`Successfully deleted all ${count} requests from ${cardLabel}!`);
      fetchAllHistory();
    } catch (err: any) {
      console.error('Failed delete all in filter:', err);
      toast.error(err.response?.data || 'Failed to delete requests');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCardBadge = (type: 'SMS' | 'SHR' | 'STR' | 'TR' | 'RA') => {
    switch (type) {
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Wrench className="w-3 h-3" /> SMS
          </span>
        );
      case 'SHR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CalendarCheck2 className="w-3 h-3" /> SHR
          </span>
        );
      case 'STR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Package className="w-3 h-3" /> STR
          </span>
        );
      case 'TR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Car className="w-3 h-3" /> TR
          </span>
        );
      case 'RA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <Hotel className="w-3 h-3" /> R&amp;A
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Top Header Banner */}
      <div className="admin-card p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Principal Master Controls
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Universal History &amp; Request Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Filter request history by card name, select individual entries or delete entire card history archives in bulk.
          </p>
        </div>

        {/* Quick Counts */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-purple-50/70 border border-purple-200 text-center">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">SMS</span>
            <span className="text-base font-black text-purple-700">{smsRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200 text-center">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">SHR</span>
            <span className="text-base font-black text-indigo-700">{shrRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">STR</span>
            <span className="text-base font-black text-amber-700">{strRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">TR</span>
            <span className="text-base font-black text-emerald-700">{trRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-rose-50/70 border border-rose-200 text-center">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">R&amp;A</span>
            <span className="text-base font-black text-rose-700">{raRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total</span>
            <span className="text-base font-black text-slate-800">{unifiedItems.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Card Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Card:
            </span>
            {(
              [
                { key: 'ALL', label: 'All Cards' },
                { key: 'SMS', label: 'SMS (Repairs)' },
                { key: 'SHR', label: 'SHR (Seminar Halls)' },
                { key: 'STR', label: 'STR (Stationary)' },
                { key: 'TR', label: 'TR (Transport)' },
                { key: 'RA', label: 'R&A (Hospitality)' },
              ] as const
            ).map((card) => (
              <button
                key={card.key}
                onClick={() => {
                  setActiveCardFilter(card.key);
                  setSelectedKeys(new Set());
                }}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeCardFilter === card.key
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {card.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, department, requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2 border border-slate-200 transition-all cursor-pointer"
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All Filtered'}</span>
            </button>

            <span className="text-xs text-slate-500">
              Selected: <strong className="text-slate-800">{selectedKeys.size}</strong> of {filteredItems.length}
            </span>

            <button
              onClick={fetchAllHistory}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Deletion Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedKeys.size === 0 || isDeleting}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedKeys.size})</span>
            </button>

            <button
              onClick={handleDeleteAllFiltered}
              disabled={filteredItems.length === 0 || isDeleting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                Delete All in Filter ({activeCardFilter === 'ALL' ? 'All Cards' : activeCardFilter})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* History Items Table */}
      <div className="admin-card bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-xs">Loading history across cards...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-xs space-y-2">
            <CheckCircle className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-800">No history records found</p>
            <p>No requests match the active card filter &amp; search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse text-slate-600">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Card</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Department &amp; Requester</th>
                  <th className="py-3 px-4">Subject / Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const key = getItemKey(item);
                  const isSelected = selectedKeys.has(key);

                  return (
                    <tr
                      key={key}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(key)}
                          className="rounded accent-blue-600 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">{getCardBadge(item.cardType)}</td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.id}</td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{item.department}</div>
                        <div className="text-[11px] text-slate-500">{item.requesterName}</div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">{item.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">{item.details}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSingle(item)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer"
                          title="Delete this request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
  );
};

export default PrincipalHistoryManagementPage;
