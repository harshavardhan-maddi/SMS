import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, FileSpreadsheet, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();

  const handleExport = (reportName: string, format: 'PDF' | 'CSV' | 'Excel') => {
    toast.loading(`Preparing ${reportName} in ${format} format...`, { duration: 1500 });
    
    // Determine report type parameter
    let type = 'inventory';
    if (reportName.toLowerCase().includes('repair') || reportName.toLowerCase().includes('history')) {
      type = 'repairs';
    }

    setTimeout(() => {
      // Direct link to backend download
      const queryParam = user?.role === 'ROLE_HOD' && user?.departmentId ? `&deptId=${user.departmentId}` : '';
      window.location.href = `/api/reports/export/csv?reportType=${type}${queryParam}`;
      toast.success(`${reportName} successfully downloaded.`);
    }, 1500);
  };

  const getPrincipalReportsList = () => [
    { name: 'Department Wise Inventory', desc: 'Breakdown of CPU, Monitor, Keyboard, Mouse assets across CSE, ECE, EEE etc.' },
    { name: 'Repair History log', desc: 'Timeline audit logs of all reported hardware issues, diagnostics, and repairs.' },
    { name: 'Dead Stock Report', desc: 'List of decommissioned hardware assets with reasons for decommissioning.' },
    { name: 'New Stock Report', desc: 'List of unallocated hardware items in stock across departments.' },
    { name: 'Monthly Repair Performance', desc: 'Summarized repair turnaround times and status distribution for this month.' },
  ];

  const getHodReportsList = () => [
    { name: 'Department Inventory Ledger', desc: 'Complete list of CPU, Monitor, Mouse, Keyboard units in your department.' },
    { name: 'Repair Requests status', desc: 'Current state and logs of all reported repair tickets.' },
    { name: 'Resolved Repairs history', desc: 'Completed repair jobs with technicians solutions and replacement parts.' },
    { name: 'Pending Repairs queue', desc: 'Active issues currently Initiated or In Progress under technicians.' },
  ];

  const getDeanReportsList = () => [
    { name: 'Repair Turnaround Performance', desc: 'Detailed tracking of average repair times and technician completion counts.' },
    { name: 'Average Repair Time index', desc: 'Turnaround statistics compared with previous monthly benchmarks.' },
    { name: 'Monthly Repairs log', desc: 'Total closed issues sorted by department and technicians.' },
    { name: 'Most Repaired Components frequency', desc: 'Frequency counts identifying hardware types that fail most often.' },
  ];

  const getReports = () => {
    if (user?.role === 'ROLE_PRINCIPAL') return getPrincipalReportsList();
    if (user?.role === 'ROLE_HOD') return getHodReportsList();
    return getDeanReportsList();
  };

  const reportsList = getReports();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Reports & Analytics Exports</h2>
        <p className="text-xs text-brand-textMuted font-medium">Download audit ledgers and repair metrics in Excel, CSV, or PDF formats</p>
      </div>

      {/* Reports grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportsList.map((rep) => (
          <div key={rep.name} className="admin-card p-6 bg-white flex flex-col justify-between">
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
                <span>Export CSV</span>
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
