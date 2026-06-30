import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileText, Download, FileSpreadsheet, Eye, Calendar, Filter, Building2, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();

  // Filters State
  const [departments, setDepartments] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  
  const [timePeriod, setTimePeriod] = useState<'all' | 'today' | 'weekly' | 'monthly' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch departments and labs on mount
  useEffect(() => {
    const initFilters = async () => {
      try {
        // Fetch departments
        const deptsRes = await api.get('/departments');
        setDepartments(deptsRes.data || []);

        // Fetch labs
        const initialDeptId = user?.role === 'ROLE_HOD' ? user?.departmentId : 'all';
        if (initialDeptId && initialDeptId !== 'all') {
          const labsRes = await api.get(`/departments/${initialDeptId}/labs`);
          setLabs(labsRes.data || []);
        } else {
          const labsRes = await api.get('/departments/labs/all');
          setLabs(labsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to initialize report filters', err);
      }
    };
    initFilters();
  }, [user]);

  // Update labs list when department selection changes
  useEffect(() => {
    const fetchDeptLabs = async () => {
      const activeDept = user?.role === 'ROLE_HOD' ? user?.departmentId : selectedDeptId;
      try {
        if (activeDept && activeDept !== 'all') {
          const res = await api.get(`/departments/${activeDept}/labs`);
          setLabs(res.data || []);
        } else {
          const res = await api.get('/departments/labs/all');
          setLabs(res.data || []);
        }
        setSelectedLabId('all'); // reset lab selection
      } catch (err) {
        console.error('Failed to fetch labs for selected department', err);
      }
    };
    fetchDeptLabs();
  }, [selectedDeptId, user]);

  const handleExport = (reportName: string, format: 'PDF' | 'CSV' | 'Excel') => {
    // Calculate range dates
    let sDate = '';
    let eDate = '';
    const today = new Date().toISOString().split('T')[0];

    if (timePeriod === 'today') {
      sDate = today;
      eDate = today;
    } else if (timePeriod === 'weekly') {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      sDate = pastDate.toISOString().split('T')[0];
      eDate = today;
    } else if (timePeriod === 'monthly') {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      sDate = pastDate.toISOString().split('T')[0];
      eDate = today;
    } else if (timePeriod === 'custom') {
      sDate = startDate;
      eDate = endDate;
    }

    toast.loading(`Preparing ${reportName} in ${format} format...`, { duration: 1500 });
    
    // Resolve report type parameter
    let type = 'inventory';
    if (reportName.toLowerCase().includes('repair') || reportName.toLowerCase().includes('history') || reportName.toLowerCase().includes('performance')) {
      type = 'repairs';
    }

    const activeDeptId = user?.role === 'ROLE_HOD' ? user?.departmentId : selectedDeptId;

    setTimeout(() => {
      let url = `/api/reports/export/csv?reportType=${type}`;
      if (activeDeptId && activeDeptId !== 'all') url += `&deptId=${activeDeptId}`;
      if (selectedLabId && selectedLabId !== 'all') url += `&labId=${selectedLabId}`;
      if (sDate) url += `&startDate=${sDate}`;
      if (eDate) url += `&endDate=${eDate}`;

      window.location.href = url;
      toast.success(`${reportName} successfully downloaded.`);
    }, 1500);
  };

  const getPrincipalReportsList = () => [
    { name: 'Department Wise Inventory Ledger', desc: 'Complete breakdown of CPU, Monitor, Keyboard, and Mouse assets across CSE, ECE, EEE etc.' },
    { name: 'Repair Request Logs & Audit History', desc: 'Timeline audit logs of all reported hardware issues, technicians diagnostics, and status.' },
    { name: 'Decommissioned Dead Stock Register', desc: 'List of decommissioned hardware assets with logged reasons for decommissioning.' },
    { name: 'Unallocated New Stock Inventory', desc: 'List of unallocated hardware items in stock across department stores.' },
  ];

  const getHodReportsList = () => [
    { name: 'Department Hardware Asset Register', desc: 'Complete list of CSE/ECE CPU, Monitor, Mouse, and Keyboard units.' },
    { name: 'Active Repair Tickets Tracker', desc: 'Current state and timeline logs of all pending reported repair requests.' },
    { name: 'Resolved Repairs Solution Logs', desc: 'Completed repair jobs with technicians diagnosis and replacement parts details.' },
  ];

  const getDeanReportsList = () => [
    { name: 'Technician Performance & Repairs log', desc: 'Turnaround statistics, completed jobs, and average repair times by technician.' },
    { name: 'Component Failure Frequency Index', desc: 'Asset components frequency counts showing hardware types that fail most frequently.' },
    { name: 'Resolved Hardware Resolution Logs', desc: 'Detailed tracking of parts replaced and resolutions by date range.' },
  ];

  const getReports = () => {
    if (user?.role === 'ROLE_PRINCIPAL') return getPrincipalReportsList();
    if (user?.role === 'ROLE_HOD') return getHodReportsList();
    return getDeanReportsList();
  };

  const reportsList = getReports();

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Reports & Analytical Ledger Downloads</h2>
        <p className="text-xs text-brand-textMuted font-medium">Apply custom filters below to compile and download tailored reports in CSV/Excel</p>
      </div>

      {/* Filter Options Panel */}
      <div className="admin-card p-6 bg-white space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-brand-purple" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Report Filter Criteria</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Department Selection (locked/hidden for HOD) */}
          {user?.role !== 'ROLE_HOD' ? (
            <div className="space-y-1">
              <label className="text-xxs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Select Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden focus:border-brand-purple bg-white cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xxs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Department
              </label>
              <input
                type="text"
                disabled
                value={user?.departmentCode || 'HOD Department'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-400 bg-slate-50 outline-hidden"
              />
            </div>
          )}

          {/* Lab Selection */}
          <div className="space-y-1">
            <label className="text-xxs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Select Laboratory
            </label>
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden focus:border-brand-purple bg-white cursor-pointer"
            >
              <option value="all">All Labs</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>Lab {lab.labNumber} ({lab.name})</option>
              ))}
            </select>
          </div>

          {/* Time Period Presets */}
          <div className="space-y-1">
            <label className="text-xxs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Time Period
            </label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden focus:border-brand-purple bg-white cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Daily (Today)</option>
              <option value="weekly">Weekly (Last 7 Days)</option>
              <option value="monthly">Monthly (Last 30 Days)</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {timePeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-2 col-span-1 md:col-span-2 lg:col-span-1">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-hidden focus:border-brand-purple cursor-pointer bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-hidden focus:border-brand-purple cursor-pointer bg-white"
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportsList.map((rep) => (
          <div key={rep.name} className="admin-card p-6 bg-white flex flex-col justify-between hover:border-brand-purple transition-all">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-brand-purple/10 text-brand-purple rounded-2xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 tracking-tight">{rep.name}</h4>
                <p className="text-xs text-brand-textMuted font-medium leading-relaxed">{rep.desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 mt-6">
              <button
                onClick={() => handleExport(rep.name, 'CSV')}
                className="flex-1 py-2 bg-slate-50 hover:bg-brand-purple hover:text-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
              <button
                onClick={() => handleExport(rep.name, 'Excel')}
                className="flex-1 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => handleExport(rep.name, 'PDF')}
                className="flex-1 py-2 bg-slate-50 hover:bg-red-50 hover:text-red-700 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ReportsPage;
