import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSkeleton } from '../components/ReusableComponents';
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
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PrincipalDashboard: React.FC = () => {
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  
  // Dashboard statistics and lists
  const [stats, setStats] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [deptCount, setDeptCount] = useState<number>(0);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch counts
      const countsRes = await api.get('/inventory/counts');
      // 2. Fetch recent requests
      const recentRes = await api.get('/repairs/recent');
      // 3. Fetch departments
      const deptsRes = await api.get('/departments');
      
      setStats(countsRes.data);
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
              <div className="text-xxs text-brand-textMuted">Recent Requests</div>
              <div className="text-sm font-extrabold text-slate-800">{recentRequests.length}</div>
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

      {/* 4. Recent Repair Requests Table */}
      <div className="admin-card bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Repair Requests</h4>
          <span className="text-[10px] font-semibold text-brand-purple flex items-center gap-1">
            Live Feed <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Initiated On</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-slate-700">{req.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">
                    {req.inventory.department.code}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{req.inventory.type}</td>
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
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(req.initiatedDate).toLocaleDateString()} {req.initiatedTime.substring(0, 5)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="px-3 py-1 bg-slate-50 hover:bg-brand-purple hover:text-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 transition-all">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View All Requests Button */}
        <div className="flex justify-center mt-6">
          <button className="px-6 py-2 bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold rounded-xl shadow-md shadow-brand-purple/20 transition-all flex items-center gap-2">
            <span>View All Requests</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
