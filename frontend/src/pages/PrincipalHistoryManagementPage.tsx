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
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface UnifiedRequestItem {
  cardType: 'SMS' | 'SHR' | 'STR';
  id: string | number;
  title: string;
  department: string;
  requesterName: string;
  status: string;
  createdAt: string;
  details: string;
}

export const PrincipalHistoryManagementPage: React.FC = () => {
  const [activeCardFilter, setActiveCardFilter] = useState<'ALL' | 'SMS' | 'SHR' | 'STR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Raw data from endpoints
  const [smsRequests, setSmsRequests] = useState<any[]>([]);
  const [shrRequests, setShrRequests] = useState<any[]>([]);
  const [strRequests, setStrRequests] = useState<any[]>([]);

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAllHistory = async () => {
    setLoading(true);
    try {
      const [smsRes, shrRes, strRes] = await Promise.allSettled([
        api.get('/repairs'),
        api.get('/seminar-requests'),
        api.get('/stationary/requests'),
      ]);

      if (smsRes.status === 'fulfilled') setSmsRequests(smsRes.value.data || []);
      if (shrRes.status === 'fulfilled') setShrRequests(shrRes.value.data || []);
      if (strRes.status === 'fulfilled') setStrRequests(strRes.value.data || []);
    } catch (err) {
      console.error('Failed to load history data:', err);
      toast.error('Failed to load some history records');
    } finally {
      setLoading(false);
      setSelectedKeys(new Set());
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, []);

  // Transform into unified items
  const unifiedItems = useMemo<UnifiedRequestItem[]>(() => {
    const list: UnifiedRequestItem[] = [];

    // SMS Items
    smsRequests.forEach((r) => {
      list.push({
        cardType: 'SMS',
        id: r.id,
        title: r.title || `Repair for ${r.inventory?.type || 'Equipment'}`,
        department: r.department?.name || r.inventory?.department?.name || 'Department',
        requesterName: r.requester?.name || 'HOD',
        status: r.status,
        createdAt: r.initiatedDate || r.createdAt || new Date().toISOString(),
        details: `${r.inventory?.type || 'Item'} (${r.inventory?.brand || 'Standard'}) • Priority: ${r.priority || 'Medium'}`,
      });
    });

    // SHR Items
    shrRequests.forEach((r) => {
      list.push({
        cardType: 'SHR',
        id: r.id,
        title: r.eventTitle || `Seminar Hall Booking: ${r.seminarHall?.name || 'Hall'}`,
        department: r.department?.name || 'Department',
        requesterName: r.requester?.name || 'HOD',
        status: r.status,
        createdAt: r.createdAt || new Date().toISOString(),
        details: `${r.seminarHall?.name || 'Hall'} (${r.seminarHall?.block || 'Block'}) • ${r.participantsCount || 0} attendees • Person: ${r.resourcePersonName || 'N/A'}`,
      });
    });

    // STR Items
    strRequests.forEach((r) => {
      const itemNames = r.items?.map((it: any) => `${it.name} (${it.count})`).slice(0, 3).join(', ');
      list.push({
        cardType: 'STR',
        id: r.id,
        title: `Stationary: ${r.purpose || `${r.totalItems || 0} items requested`}`,
        department: r.department?.name || 'Department',
        requesterName: r.requester?.name || 'HOD',
        status: r.status,
        createdAt: r.createdAt || new Date().toISOString(),
        details: `${r.totalItems || 0} distinct items (${r.totalQuantity || 0} units) • ${itemNames || ''}`,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [smsRequests, shrRequests, strRequests]);

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
      }
      toast.success(`Deleted ${item.cardType} #${item.id}`);
      fetchAllHistory();
    } catch (err: any) {
      console.error('Failed to delete request:', err);
      toast.error(err.response?.data || 'Failed to delete request');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedKeys.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedKeys.size} selected request(s)? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const smsIds: number[] = [];
      const shrIds: string[] = [];
      const strIds: string[] = [];

      selectedKeys.forEach((key) => {
        const [type, id] = key.split(':');
        if (type === 'SMS') smsIds.push(parseInt(id, 10));
        else if (type === 'SHR') shrIds.push(id);
        else if (type === 'STR') strIds.push(id);
      });

      const promises: Promise<any>[] = [];
      if (smsIds.length > 0) promises.push(api.post('/repairs/bulk-delete', { ids: smsIds }));
      if (shrIds.length > 0) promises.push(api.post('/seminar-requests/bulk-delete', { ids: shrIds }));
      if (strIds.length > 0) promises.push(api.post('/stationary/requests/bulk-delete', { ids: strIds }));

      await Promise.all(promises);
      toast.success(`Successfully deleted ${selectedKeys.size} request(s)!`);
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

      filteredItems.forEach((it) => {
        if (it.cardType === 'SMS') smsIds.push(Number(it.id));
        else if (it.cardType === 'SHR') shrIds.push(String(it.id));
        else if (it.cardType === 'STR') strIds.push(String(it.id));
      });

      const promises: Promise<any>[] = [];
      if (smsIds.length > 0) promises.push(api.post('/repairs/bulk-delete', { ids: smsIds }));
      if (shrIds.length > 0) promises.push(api.post('/seminar-requests/bulk-delete', { ids: shrIds }));
      if (strIds.length > 0) promises.push(api.post('/stationary/requests/bulk-delete', { ids: strIds }));

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

  const getCardBadge = (type: 'SMS' | 'SHR' | 'STR') => {
    switch (type) {
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Wrench className="w-3 h-3" /> SMS
          </span>
        );
      case 'SHR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <CalendarCheck2 className="w-3 h-3" /> SHR
          </span>
        );
      case 'STR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Package className="w-3 h-3" /> STR
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1e293b]/90 via-[#0f172a]/95 to-[#1e293b]/90 border border-[#334155]/60 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Principal Master Controls
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Universal History &amp; Request Management
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted">
            Filter request history by card name, select individual entries or delete entire card history archives in bulk.
          </p>
        </div>

        {/* Quick Counts */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-[#0b1329] border border-purple-500/30 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SMS</span>
            <span className="text-base font-black text-purple-400">{smsRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#0b1329] border border-indigo-500/30 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SHR</span>
            <span className="text-base font-black text-indigo-400">{shrRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#0b1329] border border-amber-500/30 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">STR</span>
            <span className="text-base font-black text-amber-400">{strRequests.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#0b1329] border border-slate-700 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
            <span className="text-base font-black text-white">{unifiedItems.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-[#1e293b]/70 border border-[#334155]/60 rounded-2xl p-4 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Card Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Card:
            </span>
            {(
              [
                { key: 'ALL', label: 'All Cards' },
                { key: 'SMS', label: 'SMS (Repairs)' },
                { key: 'SHR', label: 'SHR (Seminar Halls)' },
                { key: 'STR', label: 'STR (Stationary)' },
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
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                    : 'bg-[#0f172a] text-slate-300 hover:bg-slate-800 border border-slate-700/60'
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
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0f172a] border border-[#334155] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All Filtered'}</span>
            </button>

            <span className="text-xs text-slate-400">
              Selected: <strong className="text-white">{selectedKeys.size}</strong> of {filteredItems.length}
            </span>

            <button
              onClick={fetchAllHistory}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
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
              className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedKeys.size})</span>
            </button>

            <button
              onClick={handleDeleteAllFiltered}
              disabled={filteredItems.length === 0 || isDeleting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-extrabold shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
      <div className="bg-[#1e293b]/70 border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-xs">Loading history across cards...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs space-y-2">
            <CheckCircle className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white">No history records found</p>
            <p>No requests match the active card filter &amp; search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0b1329] text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded accent-blue-500 cursor-pointer"
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
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredItems.map((item) => {
                  const key = getItemKey(item);
                  const isSelected = selectedKeys.has(key);

                  return (
                    <tr
                      key={key}
                      className={`hover:bg-white/5 transition-colors ${
                        isSelected ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(key)}
                          className="rounded accent-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">{getCardBadge(item.cardType)}</td>

                      <td className="py-3 px-4 font-mono font-bold text-white">{item.id}</td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.department}</div>
                        <div className="text-[11px] text-slate-400">{item.requesterName}</div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-200 truncate">{item.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{item.details}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSingle(item)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer"
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
