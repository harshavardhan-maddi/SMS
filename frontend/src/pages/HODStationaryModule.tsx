import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Sparkles,
  Layers,
  Send,
  Trash2,
  Plus,
  Minus,
  AlertCircle,
  Building2,
  Calendar,
  CheckCheck,
  Tag,
  Package,
  Truck,
  FileSpreadsheet
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { StationaryItem, StationaryRequest } from '../types';
import { toast } from 'react-hot-toast';

interface HODStationaryModuleProps {
  onSwitchToSMS: () => void;
  onSwitchToSHR?: () => void;
  onSwitchToTR?: () => void;
}

export const HODStationaryModule: React.FC<HODStationaryModuleProps> = ({
  onSwitchToSMS,
  onSwitchToSHR,
  onSwitchToTR,
}) => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'new_request' | 'history'>('dashboard');

  // Items catalog & selected items state
  const [itemsCatalog, setItemsCatalog] = useState<StationaryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Selected items mapping: itemId -> quantity
  const [selectedItemsMap, setSelectedItemsMap] = useState<{ [id: number]: number }>({});
  const [purpose, setPurpose] = useState('Department Academic & Laboratory Requirements');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Requests state
  const [requests, setRequests] = useState<StationaryRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pendingAO: 0,
    forwardedStationary: 0,
    fulfilled: 0,
    rejected: 0,
  });

  // Selected request for details modal
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Fetch Items Catalog
  const fetchCatalog = async () => {
    setLoadingItems(true);
    try {
      const res = await api.get('/stationary/items');
      setItemsCatalog(res.data || []);
    } catch (err) {
      console.error('Failed to load stationary catalog:', err);
      toast.error('Failed to load stationary items catalog.');
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch Requests & Stats
  const fetchRequestsData = async () => {
    setLoadingRequests(true);
    try {
      const [reqsRes, statsRes] = await Promise.all([
        api.get('/stationary/requests'),
        api.get('/stationary/stats'),
      ]);
      setRequests(reqsRes.data || []);
      setStats(statsRes.data || { total: 0, pendingAO: 0, forwardedStationary: 0, fulfilled: 0, rejected: 0 });
    } catch (err) {
      console.error('Failed to load stationary requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchRequestsData();
  }, [dashboardTick]);

  // Categories list derived from catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    itemsCatalog.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [itemsCatalog]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return itemsCatalog.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [itemsCatalog, selectedCategory, searchQuery]);

  // Handle item selection toggle
  const toggleItemSelection = (itemId: number) => {
    setSelectedItemsMap((prev) => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = 1; // Default quantity 1
      }
      return next;
    });
  };

  // Update item count
  const updateItemCount = (itemId: number, newCount: number) => {
    const val = Math.max(1, newCount);
    setSelectedItemsMap((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  // Compute selected items statistics
  const selectedItemsList = useMemo(() => {
    const list: { item: StationaryItem; count: number }[] = [];
    Object.entries(selectedItemsMap).forEach(([idStr, count]) => {
      const id = parseInt(idStr, 10);
      const found = itemsCatalog.find((i) => i.id === id);
      if (found && count > 0) {
        list.push({ item: found, count });
      }
    });
    return list;
  }, [selectedItemsMap, itemsCatalog]);

  const totalSelectedCount = selectedItemsList.length;
  const totalUnitsCount = selectedItemsList.reduce((acc, curr) => acc + curr.count, 0);

  // Submit Stationary Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemsList.length === 0) {
      toast.error('Please select at least one stationary item from the catalog.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: selectedItemsList.map(({ item, count }) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          count,
        })),
        purpose: purpose.trim(),
      };

      const res = await api.post('/stationary/requests', payload);
      toast.success(`Stationary Request ${res.data.id} submitted for AO approval!`);
      setSelectedItemsMap({});
      fetchRequestsData();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to submit stationary request:', err);
      toast.error(err.response?.data || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm(`Are you sure you want to delete request ${requestId}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/stationary/requests/${requestId}`);
      toast.success(`Request ${requestId} deleted successfully.`);
      fetchRequestsData();
    } catch (err: any) {
      console.error('Failed to delete stationary request:', err);
      toast.error(err.response?.data || 'Failed to delete request.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_AO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending AO Approval
          </span>
        );
      case 'FORWARDED_TO_STATIONARY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck className="w-3.5 h-3.5" /> Forwarded to Store
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCheck className="w-3.5 h-3.5" /> Fulfilled &amp; Issued
          </span>
        );
      case 'REJECTED_AO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Declined by AO
          </span>
        );
      case 'REJECTED_STATIONARY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Declined by Store
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Top Switcher Navigation Bar */}
      <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-slate-600">
            Active Module: <strong className="text-slate-800">STR (Stationary Requests)</strong>
          </span>
          <span className="hidden md:inline-block text-[11px] px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
            AO &amp; Store Dispatch Flow
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToSHR && (
            <button
              onClick={onSwitchToSHR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Switch to SHR</span>
            </button>
          )}

          {onSwitchToTR && (
            <button
              onClick={onSwitchToTR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold transition-all cursor-pointer"
            >
              <span>Switch to TR</span>
            </button>
          )}

          <button
            onClick={onSwitchToSMS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to SMS Core</span>
          </button>
        </div>
      </div>

      {/* Main Header & Sub-Tabs Navigation */}
      <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            <Boxes className="w-4 h-4 text-amber-600" />
            <span>Stationary Procurement &amp; Indent System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Department Stationary Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Select items from the 150+ catalog with adjacent counts. Requests route to the Administrative Officer (AO) then to Stationary Store.
          </p>
        </div>

        {/* 3 Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('new_request')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'new_request'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Req</span>
            {totalSelectedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black">
                {totalSelectedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>History</span>
            {requests.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'history' ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 text-slate-700'
              }`}>
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DASHBOARD VIEW                                          */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="admin-card p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Requests
              </span>
              <div className="text-2xl font-black text-slate-800">{stats.total}</div>
            </div>

            <div className="admin-card p-4 bg-white rounded-2xl border border-amber-200/80 shadow-xs bg-amber-50/20">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                Pending AO
              </span>
              <div className="text-2xl font-black text-amber-600">{stats.pendingAO}</div>
            </div>

            <div className="admin-card p-4 bg-white rounded-2xl border border-blue-200/80 shadow-xs bg-blue-50/20">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                Forwarded Store
              </span>
              <div className="text-2xl font-black text-blue-600">{stats.forwardedStationary}</div>
            </div>

            <div className="admin-card p-4 bg-white rounded-2xl border border-emerald-200/80 shadow-xs bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Fulfilled
              </span>
              <div className="text-2xl font-black text-emerald-600">{stats.fulfilled}</div>
            </div>

            <div className="admin-card p-4 bg-white rounded-2xl border border-red-200/80 shadow-xs bg-red-50/20 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block mb-1">
                Declined
              </span>
              <div className="text-2xl font-black text-red-600">{stats.rejected}</div>
            </div>
          </div>

          {/* Action Prompt Banner */}
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                Quick Stationary Order
              </div>
              <h2 className="text-xl font-bold text-slate-800">Need exam sheets, gel pens, marker inks or folders?</h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Pick items from our 150+ catalog, set counts right beside each item, and submit directly for Administrative Officer approval.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('new_request')}
              className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 flex-shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Raise New Request</span>
            </button>
          </div>

          {/* Recent Requests Section */}
          <div className="admin-card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                <span>Recent Department Stationary Requests</span>
              </h3>
              {requests.length > 0 && (
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                >
                  View All ({requests.length}) →
                </button>
              )}
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-3">
                <Boxes className="w-10 h-10 mx-auto text-slate-300" />
                <p>No stationary requests submitted yet.</p>
                <button
                  onClick={() => setActiveTab('new_request')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create First Request</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-300 hover:bg-white transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-extrabold text-slate-800">{req.id}</span>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>{req.totalItems} distinct items</strong> ({req.totalQuantity} total units) •{' '}
                        {req.purpose || 'Academic usage'}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Submitted on {new Date(req.createdAt).toLocaleDateString()}</span>
                        {req.aoRemarks && (
                          <span className="text-amber-700 font-semibold">AO: &quot;{req.aoRemarks}&quot;</span>
                        )}
                        {req.stationaryRemarks && (
                          <span className="text-emerald-700 font-semibold">Store: &quot;{req.stationaryRemarks}&quot;</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setExpandedRequestId(req.id);
                        setActiveTab('history');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Inspect Items</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NEW REQUEST (ITEM PICKER WITH ADJACENT COUNTS)           */}
      {/* ============================================================== */}
      {activeTab === 'new_request' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Filter & Search Bar */}
          <div className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by item name (e.g. Apsara, Gel Pen, Marker, Folder, Staples, Canon)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl border border-slate-200"
                >
                  Clear Search
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid of Items with Adjacent Counts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Showing {filteredItems.length} available items in catalog</span>
              {totalSelectedCount > 0 && (
                <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  {totalSelectedCount} item(s) selected ({totalUnitsCount} units)
                </span>
              )}
            </div>

            {loadingItems ? (
              <div className="text-center py-16 text-slate-500 text-xs">Loading stationary items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No stationary items match your search filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const isSelected = Boolean(selectedItemsMap[item.id]);
                  const currentCount = selectedItemsMap[item.id] || 1;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Left: Checkbox & Item Info */}
                      <div
                        onClick={() => toggleItemSelection(item.id)}
                        className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 mt-1 accent-amber-500 rounded cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <h4
                            className={`text-xs font-bold leading-snug transition-colors ${
                              isSelected ? 'text-amber-900' : 'text-slate-800'
                            }`}
                          >
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                              {item.category || 'General'}
                            </span>
                            <span>• Unit: {item.unit || 'Nos'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Adjacent Count Selector (Appears when Selected) */}
                      {isSelected ? (
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-amber-300 shadow-xs flex-shrink-0 animate-fade-in">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentCount > 1) {
                                updateItemCount(item.id, currentCount - 1);
                              } else {
                                toggleItemSelection(item.id);
                              }
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Decrease or Remove"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={currentCount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              updateItemCount(item.id, isNaN(val) ? 1 : val);
                            }}
                            className="w-12 text-center text-xs font-black bg-transparent text-amber-700 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateItemCount(item.id, currentCount + 1);
                            }}
                            className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center justify-center transition-colors cursor-pointer"
                            title="Increase"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleItemSelection(item.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer flex-shrink-0"
                        >
                          + Select
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Bottom Summary Tray when items are selected */}
          {totalSelectedCount > 0 && (
            <div className="fixed bottom-4 left-4 right-4 max-w-5xl mx-auto z-40 bg-white/95 border border-amber-400 rounded-2xl p-4 shadow-xl backdrop-blur-md animate-fade-in flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {totalSelectedCount} Stationary Item{totalSelectedCount > 1 ? 's' : ''} Selected
                  </span>
                  <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                    Total: {totalUnitsCount} Units
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-600">Purpose / Note:</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. End Semester Exam Stationery / Lab Documentation"
                    className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500 w-64 md:w-80"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedItemsMap({})}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Clear All</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit to AO'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: HISTORY VIEW                                            */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-600" />
              <span>Department Stationary Requests History</span>
            </h3>
            <span className="text-xs text-slate-500">{requests.length} total request(s)</span>
          </div>

          {loadingRequests ? (
            <div className="text-center py-16 text-slate-500 text-xs">Loading request history...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3">
              <Boxes className="w-10 h-10 mx-auto text-slate-300" />
              <p>No stationary request history found.</p>
              <button
                onClick={() => setActiveTab('new_request')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
              >
                Create New Request
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const isExpanded = expandedRequestId === req.id;

                return (
                  <div
                    key={req.id}
                    className="admin-card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-black text-slate-800">{req.id}</span>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-xs text-slate-600">
                          Purpose: <span className="text-slate-800 font-semibold">{req.purpose || 'Department Requirement'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 mr-1">
                          {new Date(req.createdAt).toLocaleDateString()} at{' '}
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Collapse' : 'View Items'} ({req.totalItems})</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer"
                          title="Delete this request from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Timeline & Feedback Remarks */}
                    {(req.aoRemarks || req.stationaryRemarks || req.decreaseRemarks) && (
                      <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {req.aoRemarks && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-slate-700">
                              <span className="text-[10px] font-bold uppercase text-amber-800 block mb-0.5">
                                AO Review Note ({req.aoActionBy?.name || 'Administrative Officer'}):
                              </span>
                              <p className="text-slate-800">{req.aoRemarks}</p>
                            </div>
                          )}
                          {req.stationaryRemarks && (
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-700">
                              <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-0.5">
                                Store Dispatch Note ({req.stationaryActionBy?.name || 'Stationary Store'}):
                              </span>
                              <p className="text-slate-800">{req.stationaryRemarks}</p>
                            </div>
                          )}
                        </div>

                        {req.decreaseRemarks && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-900">Store Quantity Adjustment Reason: </span>
                              &quot;{req.decreaseRemarks}&quot;
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expandable Items List Table */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 animate-fade-in space-y-2">
                        <div className="text-xs font-bold text-slate-700">Requested vs Allotted Items:</div>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">#</th>
                                <th className="py-2.5 px-3">Item Name</th>
                                <th className="py-2.5 px-3">Category</th>
                                <th className="py-2.5 px-3">Packaging / Unit</th>
                                <th className="py-2.5 px-3 text-right">Requested</th>
                                <th className="py-2.5 px-3 text-right">Allotted</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {req.items?.map((item, idx) => {
                                const isDecreased = item.allottedCount !== undefined && item.allottedCount < item.count;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/60">
                                    <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                                    <td className="py-2 px-3 font-bold text-slate-800">{item.name}</td>
                                    <td className="py-2 px-3 text-slate-600">{item.category || 'General'}</td>
                                    <td className="py-2 px-3 text-slate-600">{item.unit || 'Nos'}</td>
                                    <td className="py-2 px-3 text-right font-semibold text-slate-800">
                                      {item.count}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      {req.status === 'FULFILLED' ? (
                                        <span className={`font-black ${isDecreased ? 'text-amber-700' : 'text-emerald-700'}`}>
                                          {item.allottedCount ?? item.count}
                                          {isDecreased && (
                                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                              (-{item.count - (item.allottedCount ?? item.count)})
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">Pending Issue</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                              <tr>
                                <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">
                                  Total Units:
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-800 font-bold">
                                  {req.totalQuantity} Req
                                </td>
                                <td className="py-2.5 px-3 text-right text-emerald-700 font-black">
                                  {req.status === 'FULFILLED'
                                    ? req.items?.reduce((sum, it) => sum + (it.allottedCount ?? it.count), 0) ?? req.totalQuantity
                                    : '—'}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default HODStationaryModule;
