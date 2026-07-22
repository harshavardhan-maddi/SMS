import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSkeleton, Modal } from '../components/ReusableComponents';
import {
  Laptop,
  CheckCircle,
  AlertTriangle,
  FolderMinus,
  Sparkles,
  ClipboardList,
  Wrench,
  Trash2,
  Building,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  CheckSquare,
  Square,
  AlertOctagon,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RequestDetailsModal } from '../components/RequestDetailsModal';

export const PrincipalDashboard: React.FC = () => {
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  
  // Dashboard statistics and lists
  const [stats, setStats] = useState<any>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [showAllRequests, setShowAllRequests] = useState<boolean>(false);
  const [deptCount, setDeptCount] = useState<number>(0);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Selection & Deletion State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [countsRes, repairsRes, recentRes, deptsRes] = await Promise.all([
        api.get('/inventory/counts'),
        api.get('/repairs'),
        api.get('/repairs/recent'),
        api.get('/departments')
      ]);
      
      setStats(countsRes.data);
      setAllRequests(repairsRes.data);
      setRecentRequests(recentRes.data.slice(0, 5)); // Show top 5
      setDeptCount(deptsRes.data.length);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
      toast.error('Failed to refresh live statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dashboardTick]); // Refetch instantly on real-time WS ticks!

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="grid" />
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  const displayedRequests = showAllRequests ? allRequests : recentRequests;
  const isAllSelected = displayedRequests.length > 0 && displayedRequests.every((req) => selectedIds.includes(req.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedRequests.map((r) => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenDeleteModal = (id?: string) => {
    if (id) {
      setRequestToDelete(id);
    } else {
      setRequestToDelete(null);
    }
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const idsToDelete = requestToDelete ? [requestToDelete] : selectedIds;
      if (idsToDelete.length === 1) {
        await api.delete(`/repairs/${idsToDelete[0]}`);
      } else {
        await api.delete('/repairs/bulk', { data: { requestIds: idsToDelete } });
      }
      toast.success(`Successfully deleted ${idsToDelete.length} request(s). Live computer counts updated!`);
      setSelectedIds([]);
      setRequestToDelete(null);
      setDeleteModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      console.error('Failed to delete request(s)', err);
      toast.error(err.response?.data || 'Failed to delete repair request(s).');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated':
        return 'bg-amber-100 text-amber-700';
      case 'in progress':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700';
      case 'dead stock':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Section: Four Detailed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: College Systems */}
        <div className="admin-card p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">College Systems</h3>
                <p className="text-[10px] text-brand-textMuted font-medium">(Overall)</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>CPU</span>
                <span className="font-bold text-blue-600">{stats.CollegeSystems?.CPU ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Monitor</span>
                <span className="font-bold text-blue-600">{stats.CollegeSystems?.Monitor ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mouse</span>
                <span className="font-bold text-blue-600">{stats.CollegeSystems?.Mouse ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Keyboard</span>
                <span className="font-bold text-blue-600">{stats.CollegeSystems?.Keyboard ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hotspot</span>
                <span className="font-bold text-blue-600">{stats.CollegeSystems?.Hotspot ?? 0}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-semibold">Total Systems</span>
            <span className="text-lg font-black text-blue-600">{stats.CollegeSystems?.Total ?? 0}</span>
          </div>
        </div>

        {/* Card 2: New Stock */}
        <div className="admin-card p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">New Stock</h3>
                <p className="text-[10px] text-brand-textMuted font-medium">(Not Used)</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>CPU</span>
                <span className="font-bold text-emerald-600">{stats.NewStock?.CPU ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Monitor</span>
                <span className="font-bold text-emerald-600">{stats.NewStock?.Monitor ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mouse</span>
                <span className="font-bold text-emerald-600">{stats.NewStock?.Mouse ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Keyboard</span>
                <span className="font-bold text-emerald-600">{stats.NewStock?.Keyboard ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hotspot</span>
                <span className="font-bold text-emerald-600">{stats.NewStock?.Hotspot ?? 0}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-semibold">Total New Stock</span>
            <span className="text-lg font-black text-emerald-600">{stats.NewStock?.Total ?? 0}</span>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="admin-card p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">In Progress</h3>
                <p className="text-[10px] text-brand-textMuted font-medium">(Repairing)</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>CPU</span>
                <span className="font-bold text-amber-600">{stats.Repairing?.CPU ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Monitor</span>
                <span className="font-bold text-amber-600">{stats.Repairing?.Monitor ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mouse</span>
                <span className="font-bold text-amber-600">{stats.Repairing?.Mouse ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Keyboard</span>
                <span className="font-bold text-amber-600">{stats.Repairing?.Keyboard ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hotspot</span>
                <span className="font-bold text-amber-600">{stats.Repairing?.Hotspot ?? 0}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-semibold">Total In Progress</span>
            <span className="text-lg font-black text-amber-600">{stats.Repairing?.Total ?? 0}</span>
          </div>
        </div>

        {/* Card 4: Dead Stock */}
        <div className="admin-card p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dead Stock</h3>
                <p className="text-[10px] text-brand-textMuted font-medium">(Not Working)</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>CPU</span>
                <span className="font-bold text-red-600">{stats.DeadStock?.CPU ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Monitor</span>
                <span className="font-bold text-red-600">{stats.DeadStock?.Monitor ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mouse</span>
                <span className="font-bold text-red-600">{stats.DeadStock?.Mouse ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Keyboard</span>
                <span className="font-bold text-red-600">{stats.DeadStock?.Keyboard ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hotspot</span>
                <span className="font-bold text-red-600">{stats.DeadStock?.Hotspot ?? 0}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-semibold">Total Dead Stock</span>
            <span className="text-lg font-black text-red-600">{stats.DeadStock?.Total ?? 0}</span>
          </div>
        </div>

      </div>

      {/* 2. Quick Statistics Row */}
      <div className="bg-white p-4 rounded-[16px] border border-[#e2e8f0] shadow-soft">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Quick Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Building className="w-4 h-4" /></div>
            <div>
              <div className="text-xxs text-brand-textMuted">Departments</div>
              <div className="text-sm font-extrabold text-slate-800">{deptCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle className="w-4 h-4" /></div>
            <div>
              <div className="text-xxs text-brand-textMuted">Systems Working</div>
              <div className="text-sm font-extrabold text-slate-800">{stats.Working?.Total ?? 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Wrench className="w-4 h-4" /></div>
            <div>
              <div className="text-xxs text-brand-textMuted">Systems Under Repair</div>
              <div className="text-sm font-extrabold text-slate-800">{stats.Repairing?.Total ?? 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="p-2 rounded-lg bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></div>
            <div>
              <div className="text-xxs text-brand-textMuted">Dead Stock</div>
              <div className="text-sm font-extrabold text-slate-800">{stats.DeadStock?.Total ?? 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><ClipboardList className="w-4 h-4" /></div>
            <div>
              <div className="text-xxs text-brand-textMuted">Total Requests</div>
              <div className="text-sm font-extrabold text-slate-800">{allRequests.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600"><Calendar className="w-4 h-4" /></div>
            <div>
              <div className="text-xxs text-brand-textMuted">Pending Repairs</div>
              <div className="text-sm font-extrabold text-slate-800">{stats.Repairing?.Total ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Repair Requests Table & Principal Admin Management */}
      <div className="admin-card bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {showAllRequests ? 'All Repair Requests' : 'Recent Repair Requests'} ({displayedRequests.length})
            </h4>
            <span className="text-[10px] font-semibold text-brand-purple flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-full">
              Live Feed <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={() => handleOpenDeleteModal()}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setShowAllRequests(!showAllRequests)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{showAllRequests ? 'Show Top 5' : 'View All Requests'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllRequests ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center text-slate-500 hover:text-brand-purple transition-colors cursor-pointer"
                    title="Select All / Deselect All"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-purple" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Lab Number</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Initiated Date</th>
                <th className="py-3 px-4">Completed Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No repair requests available.
                  </td>
                </tr>
              ) : (
                displayedRequests.map((req) => {
                  const isSelected = selectedIds.includes(req.id);
                  return (
                    <tr key={req.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-purple-50/40' : ''}`}>
                      <td className="py-3.5 px-4">
                        <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={() => handleToggleSelect(req.id)}
                           className="w-4 h-4 accent-brand-purple rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{req.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {req.inventory?.department?.code || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {req.inventory?.lab?.labNumber || '---'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{req.inventory?.type || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                          req.priority === 'High' ? 'bg-red-50 text-red-600' : req.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {req.initiatedDate ? new Date(req.initiatedDate).toLocaleDateString() : '---'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {['Resolved', 'Dead Stock'].includes(req.status) && req.completedDate ? new Date(req.completedDate).toLocaleDateString() : '---'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="p-1.5 bg-slate-50 hover:bg-brand-purple hover:text-white rounded-lg border border-slate-200 text-slate-600 transition-all cursor-pointer"
                            title="View Request Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(req.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg border border-red-200 text-red-600 transition-all cursor-pointer"
                            title="Delete Request (Main Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Confirmation Modal for Deletion */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="⚠️ Warning: Delete Repair Request(s)"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-800">
            <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h5 className="font-extrabold text-red-900">Are you sure you want to delete?</h5>
              <p>
                You are about to delete{' '}
                <span className="font-bold underline">
                  {requestToDelete ? `Request ${requestToDelete}` : `${selectedIds.length} selected request(s)`}
                </span>.
              </p>
              <p className="text-red-700">
                Deleting active repair request(s) will cancel the repair in progress and automatically restore the computer hardware status back to <span className="font-bold">Working</span> across all user logins and dashboards in real-time.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete Request(s)'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rich Request Details Overlay Modal */}
      <RequestDetailsModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />
    </div>
  );
};
