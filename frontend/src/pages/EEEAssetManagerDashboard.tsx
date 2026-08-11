import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSkeleton, Modal, StatCard } from '../components/ReusableComponents';
import {
  FileText,
  Wrench,
  CheckCircle,
  Trash2,
  Clock,
  ChevronDown,
  Activity,
  UserCheck,
  Zap,
  UserPlus,
  Plus,
  Phone,
  Download,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RequestDetailsModal } from '../components/RequestDetailsModal';

export const EEEAssetManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Electricians State (Managed by EEE Asset Manager, non-login users)
  const [electricians, setElectricians] = useState<any[]>([]);
  const [elecModalOpen, setElecModalOpen] = useState(false);
  const [newElecName, setNewElecName] = useState('');

  // Modal & Selection States
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [viewDetailsReq, setViewDetailsReq] = useState<any | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [deadModalOpen, setDeadModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineHistory, setTimelineHistory] = useState<any[]>([]);

  // Action Form States
  const [assignType, setAssignType] = useState<'electrician' | 'technician'>('electrician');
  const [selectedElecId, setSelectedElecId] = useState<string>('');
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [deadReason, setDeadReason] = useState('');
  const [deadDesc, setDeadDesc] = useState('');
  // Progress Update States
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('In Progress');
  const [progressDescription, setProgressDescription] = useState<string>('');
  const [requiredParts, setRequiredParts] = useState<string>('');
  const [problemFound, setProblemFound] = useState<string>('');
  const [solution, setSolution] = useState<string>('');

  // Dropdown state for rows
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null);

  const fetchEEEData = async () => {
    try {
      const [repairsRes, techsRes, elecsRes] = await Promise.all([
        api.get('/repairs'),
        api.get('/users/technicians'),
        api.get('/electricians')
      ]);

      // EEE Asset Manager can ONLY see Electrical Hardware issue requests, not any others
      const allRequests = repairsRes.data || [];
      const electricalRequests = allRequests.filter((r: any) => {
        const typeStr = (r.inventory?.type || '').toLowerCase();
        const titleStr = (r.title || '').toLowerCase();
        const descStr = (r.description || '').toLowerCase();
        return (
          typeStr.includes('electrical') ||
          titleStr.includes('electrical') ||
          descStr.includes('electrical')
        );
      });

      setRequests(electricalRequests);

      const techs = techsRes.data || [];
      setTechnicians(techs);
      if (techs.length > 0) {
        setSelectedTechId(techs[0].id.toString());
      }

      const elecs = elecsRes.data || [];
      setElectricians(elecs);
      if (elecs.length > 0) {
        setSelectedElecId(elecs[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load EEE Asset Manager data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEEEData();
  }, [dashboardTick]);

  const handleAddElectrician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newElecName.trim()) {
      toast.error('Please enter electrician name.');
      return;
    }
    if (!window.confirm(`Are you sure you want to add electrician "${newElecName.trim()}"?`)) {
      return;
    }
    try {
      await api.post('/electricians', {
        name: newElecName.trim()
      });
      toast.success(`Electrician ${newElecName} added successfully!`);
      setNewElecName('');
      fetchEEEData();
    } catch (err: any) {
      console.error('Add electrician error:', err);
      toast.error(err.response?.data?.message || err.response?.data || 'Failed to add electrician.');
    }
  };

  const handleDeleteElectrician = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove electrician ${name}?`)) return;
    try {
      await api.delete(`/electricians/${id}`);
      toast.success(`Electrician ${name} removed.`);
      fetchEEEData();
    } catch (err) {
      toast.error('Failed to remove electrician.');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    if (!window.confirm(`Are you sure you want to confirm assignment for Request ${selectedReq.id}?`)) {
      return;
    }

    try {
      if (assignType === 'electrician') {
        const elec = electricians.find(e => e.id.toString() === selectedElecId);
        if (!elec && electricians.length > 0) {
          toast.error('Please select an electrician.');
          return;
        }
        await api.post(`/repairs/${selectedReq.id}/accept`, {
          electricianId: elec ? elec.id : undefined,
          electricianName: elec ? elec.name : selectedElecId
        });
        toast.success(`Request ${selectedReq.id} assigned to electrician successfully!`);
      } else {
        if (!selectedTechId) return;
        await api.post(`/repairs/${selectedReq.id}/accept`, {
          technicianId: parseInt(selectedTechId)
        });
        toast.success(`Request ${selectedReq.id} assigned to technician successfully!`);
      }
      setAssignModalOpen(false);
      fetchEEEData();
    } catch (err) {
      toast.error('Failed to assign request.');
    }
  };

  const handleDecommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !deadReason) {
      toast.error('Please enter a reason for decommissioning.');
      return;
    }
    if (!window.confirm(`Are you sure you want to decommission Request ${selectedReq.id} to Dead Stock?`)) {
      return;
    }

    try {
      await api.post(`/repairs/${selectedReq.id}/dead-stock`, {
        reason: deadReason,
        description: deadDesc
      });
      toast.success(`Asset marked as Dead Stock.`);
      setDeadModalOpen(false);
      setDeadReason('');
      setDeadDesc('');
      fetchEEEData();
    } catch (err: any) {
      console.error('Decommission error:', err);
      toast.error(err.response?.data?.message || err.response?.data || 'Failed to decommission asset.');
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      if (progressStatus === 'Dead Stock') {
        if (!window.confirm(`Are you sure you want to decommission Request ${selectedReq.id} to Dead Stock?`)) {
          return;
        }
        await api.post(`/repairs/${selectedReq.id}/dead-stock`, {
          reason: progressDescription || 'Marked as Dead Stock during progress update',
          description: progressDescription
        });
        toast.success(`Asset marked as Dead Stock.`);
      } else {
        await api.post(`/repairs/${selectedReq.id}/update-progress`, {
          status: progressStatus,
          description: progressDescription,
          requiredParts,
          problemFound: progressStatus === 'Resolved' ? (problemFound || 'Electrical repair completed') : undefined,
          solution: progressStatus === 'Resolved' ? (solution || progressDescription || 'Restored hardware asset functionality') : undefined
        });
        toast.success(`Progress updated for Request ${selectedReq.id}`);
      }
      setProgressModalOpen(false);
      setProgressDescription('');
      setRequiredParts('');
      setProblemFound('');
      setSolution('');
      fetchEEEData();
    } catch (err: any) {
      console.error('Update progress error:', err);
      toast.error(err.response?.data?.message || err.response?.data || 'Failed to update progress.');
    }
  };

  const handlePrintEEEReport = () => {
    if (requests.length === 0) {
      toast.error('No EEE tickets available to export.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print reports.');
      return;
    }

    const tableRowsHtml = requests.map(item => `
      <tr>
        <td>${item.id}</td>
        <td>${item.inventory?.lab ? 'Lab ' + item.inventory.lab.labNumber : 'EEE Dept'}</td>
        <td><div style="font-weight: 600;">${item.title}</div><div style="font-size: 10px; color: #64748b;">${item.description || ''}</div></td>
        <td>${item.requester?.name || 'EEE Faculty'}</td>
        <td>${item.assignedElectricianName ? item.assignedElectricianName + ' (Electrician)' : (item.assignedTo?.name || 'Unassigned')}</td>
        <td>${item.priority || 'Medium'}</td>
        <td><span class="status-badge ${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span></td>
        <td>${item.initiatedDate ? new Date(item.initiatedDate).toLocaleDateString() : '-'}</td>
        <td>${['Resolved', 'Dead Stock'].includes(item.status) && (item.completedDate || item.updatedAt) ? new Date(item.completedDate || item.updatedAt).toLocaleDateString() : 'Pending'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>EEE Electrical Repair Tickets Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; }
            .header-banner { background: linear-gradient(135deg, #d97706, #ea580c); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
            .header-banner h1 { margin: 0; font-size: 20px; font-weight: 800; }
            .header-banner p { margin: 4px 0 0 0; font-size: 11px; opacity: 0.9; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f8fafc; color: #475569; font-size: 10px; text-transform: uppercase; font-weight: 700; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .status-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .initiated { background: #fef3c7; color: #92400e; }
            .in-progress, .accepted { background: #dbeafe; color: #1e40af; }
            .resolved { background: #d1fae5; color: #065f46; }
            .dead-stock { background: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1>NARASARAOPETA ENGINEERING COLLEGE (AUTONOMOUS)</h1>
            <p>Electrical & Electronics Engineering (EEE) Asset Management - Official Repair Tickets Report</p>
          </div>
          <div style="margin-bottom: 10px; font-size: 11px; color: #475569;">
            <strong>Generated Date:</strong> ${new Date().toLocaleDateString()} | <strong>Total EEE Tickets:</strong> ${requests.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Location / Lab</th>
                <th>Electrical Issue Details</th>
                <th>Requester</th>
                <th>Assigned Electrician</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Initiated Date</th>
                <th>Completed Date</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const fetchTimeline = async (reqId: string) => {
    try {
      const res = await api.get(`/repairs/${reqId}/history`);
      setTimelineHistory(res.data);
      setTimelineModalOpen(true);
    } catch (err) {
      toast.error('Failed to fetch request timeline.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'initiated':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'accepted':
      case 'in progress':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'dead stock':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  if (loading) return <LoadingSkeleton />;

  const pendingRequests = requests.filter(r => r.status.toLowerCase() === 'initiated');
  const inProgressRequests = requests.filter(r => ['accepted', 'in progress', 'parts requested'].includes(r.status.toLowerCase()));
  const resolvedRequests = requests.filter(r => r.status.toLowerCase() === 'resolved');

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-200 fill-amber-200" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-100">EEE Department Portal</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Electrical & Electronics Asset Manager Dashboard</h2>
          <p className="text-xs text-amber-100 mt-1 max-w-xl">
            Exclusive manager portal for EEE department repair requests. Review incoming tickets from EEE HOD and Lab Assistants, assign electricians/technicians, and oversee maintenance operations.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <button
            onClick={() => setElecModalOpen(true)}
            className="px-4 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-2xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-600" />
            <span>Manage Electricians ({electricians.length})</span>
          </button>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl text-right">
            <div className="text-xs text-amber-100 font-semibold">Active User</div>
            <div className="text-sm font-bold text-white">{user?.name}</div>
            <div className="text-[10px] text-amber-200 uppercase font-black tracking-wider mt-0.5">EEE Asset Manager</div>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total EEE Tickets"
          value={requests.length.toString()}
          icon={FileText}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
          subtext="EEE Department Total"
        />
        <StatCard
          title="Pending Technician"
          value={pendingRequests.length.toString()}
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-500"
          subtext="Requires Technician Assignment"
        />
        <StatCard
          title="In Maintenance"
          value={inProgressRequests.length.toString()}
          icon={Wrench}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
          subtext="Active Technicians Working"
        />
        <StatCard
          title="Resolved Tickets"
          value={resolvedRequests.length.toString()}
          icon={CheckCircle}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
          subtext="Completed EEE Repairs"
        />
      </div>

      {/* REPAIR REQUESTS TABLE */}
      <div className="admin-card bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">EEE Department Repair Requests</h3>
            <p className="text-xs text-slate-500">Tickets initiated by EEE HOD and Lab Assistants requiring manager overview & technician assignment.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintEEEReport}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Download EEE Report</span>
            </button>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold whitespace-nowrap">
              {requests.length} EEE Tickets
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Location / Lab</th>
                <th className="py-3 px-4">Hardware Type</th>
                <th className="py-3 px-4">Issue Details</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Initiated Date</th>
                <th className="py-3 px-4">Completed Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 font-medium">
                    No repair requests logged for EEE Department yet.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const statusLower = req.status?.toLowerCase() || '';
                  const isInitiated = statusLower === 'initiated';
                  const isResolved = statusLower === 'resolved';
                  const isDead = statusLower === 'dead stock';
                  const isCompleted = isResolved || isDead;
                  const isAssigned = Boolean(req.assignedElectricianName || req.assignedTo);

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{req.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {req.inventory?.lab ? `Lab ${req.inventory.lab.labNumber}` : 'EEE Dept'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {req.inventory?.type === 'Electrical Hardware' && req.inventory?.brand && req.inventory.brand !== 'Standard'
                          ? `Electrical Hardware (${req.inventory.brand})`
                          : (req.inventory?.type || 'Electrical Hardware')}
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 flex-wrap" title={req.title}>
                          <span>{req.title}</span>
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap">
                            Qty: {req.deviceCount || 1}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5" title={req.description}>{req.description}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {req.requester?.name || 'EEE Faculty'}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {req.assignedElectricianName ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 w-fit shadow-xs">
                            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                            <span>{req.assignedElectricianName}</span>
                          </span>
                        ) : req.assignedTo ? (
                          <span className="text-slate-800 font-bold">{req.assignedTo.name}</span>
                        ) : (
                          <span className="text-amber-600 font-bold bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-xl text-[10px]">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                          req.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-200' : req.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {req.initiatedDate ? new Date(req.initiatedDate).toLocaleDateString() : '---'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {['Resolved', 'Dead Stock'].includes(req.status) && (req.completedDate || req.updatedAt)
                          ? new Date(req.completedDate || req.updatedAt).toLocaleDateString()
                          : '---'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveDropdownRow(activeDropdownRow === req.id ? null : req.id)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Action</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {activeDropdownRow === req.id && (
                            <div className="origin-top-right absolute right-0 mt-1 w-48 rounded-2xl shadow-xl bg-white ring-1 ring-black/5 divide-y divide-slate-100 z-50 border border-slate-100 py-1 text-left">
                              {!isCompleted ? (
                                <>
                                  {!isAssigned && (
                                    <button
                                      onClick={() => {
                                        setSelectedReq(req);
                                        setAssignModalOpen(true);
                                        setActiveDropdownRow(null);
                                      }}
                                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Assign Electrician</span>
                                    </button>
                                  )}

                                  {isAssigned && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedReq(req);
                                          setProgressStatus(req.status === 'Accepted' || req.status === 'Initiated' ? 'In Progress' : req.status);
                                          setProgressDescription('');
                                          setRequiredParts('');
                                          setProblemFound('');
                                          setSolution('');
                                          setProgressModalOpen(true);
                                          setActiveDropdownRow(null);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Update Progress</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setSelectedReq(req);
                                          setDeadModalOpen(true);
                                          setActiveDropdownRow(null);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        <span>Mark as Dead Stock</span>
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => {
                                      setViewDetailsReq(req);
                                      setActiveDropdownRow(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    <span>View Request Details</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setViewDetailsReq(req);
                                    setActiveDropdownRow(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  <span>View Request Details</span>
                                </button>
                              )}
                            </div>
                          )}
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

      {/* MANAGE ELECTRICIANS MODAL */}
      <Modal isOpen={elecModalOpen} onClose={() => setElecModalOpen(false)} title="Manage Department Electricians">
        <div className="space-y-6 text-left">
          {/* Add Electrician Form */}
          <form onSubmit={handleAddElectrician} className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-3">
            <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>Add New Electrician</span>
            </h4>
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Electrician Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newElecName}
                  onChange={(e) => setNewElecName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-hidden focus:border-amber-500 bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Electrician</span>
              </button>
            </div>
          </form>

          {/* Electricians List Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">Registered Electricians ({electricians.length})</h4>
            {electricians.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 font-medium">
                No electricians added yet. Add department electricians above to assign tickets.
              </div>
            ) : (
              <div className="max-h-[260px] overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Electrician Name</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {electricians.map((el) => (
                      <tr key={el.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                          <span>{el.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteElectrician(el.id, el.name)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Electrician"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ASSIGN ELECTRICIAN / TECHNICIAN MODAL */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title={`Assign Electrician to EEE Request: ${selectedReq?.id}`}>
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-left">
          <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 font-medium">
            Select an electrician or technician to take ownership and resolve this Electrical Hardware issue.
          </div>

          {/* Toggle Assign Type */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setAssignType('electrician')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                assignType === 'electrician' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Electrician ({electricians.length})
            </button>
            <button
              type="button"
              onClick={() => setAssignType('technician')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                assignType === 'technician' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              System Technician ({technicians.length})
            </button>
          </div>

          {assignType === 'electrician' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Select Assigned Electrician</label>
                {electricians.length === 0 ? (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                    No electricians added yet. Please click <strong>Manage Electricians</strong> to add department electricians.
                  </div>
                ) : (
                  <select
                    value={selectedElecId}
                    onChange={(e) => setSelectedElecId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden focus:border-amber-500 bg-white"
                  >
                    {electricians.map((el) => (
                      <option key={el.id} value={el.id.toString()}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Available Hardware Technicians</label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden focus:border-amber-500 bg-white"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm Assignment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DECOMMISSION TO DEAD STOCK MODAL */}
      <Modal isOpen={deadModalOpen} onClose={() => setDeadModalOpen(false)} title={`Decommission Asset to Dead Stock - Request: ${selectedReq?.id}`}>
        <form onSubmit={handleDecommissionSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Decommission Reason / Cause of Failure</label>
            <input
              type="text"
              required
              placeholder="e.g. PCB burnt out, irreparable motor fault"
              value={deadReason}
              onChange={(e) => setDeadReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Detailed Technical Assessment</label>
            <textarea
              rows={3}
              placeholder="Provide explanation of why the hardware asset is beyond economic repair."
              value={deadDesc}
              onChange={(e) => setDeadDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-red-500"
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
            WARNING: This action is irreversible. The asset status will update to Dead Stock immediately.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeadModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Dead Stock Decommission</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* TIMELINE MODAL */}
      <Modal isOpen={timelineModalOpen} onClose={() => setTimelineModalOpen(false)} title={`Request Status Timeline: ${selectedReq?.id}`}>
        {selectedReq && (
          <div className="space-y-6 text-left">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-2 text-xs">
              <div><span className="font-bold text-slate-500">Hardware Type:</span> <span className="font-semibold text-slate-700">{selectedReq.inventory?.type}</span></div>
              <div><span className="font-bold text-slate-500">Fault:</span> <span className="font-semibold text-slate-700">{selectedReq.title}</span></div>
              <div><span className="font-bold text-slate-500">Current Status:</span> <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ml-1.5 ${getStatusBadgeClass(selectedReq.status)}`}>{selectedReq.status}</span></div>
            </div>

            <div className="relative pl-6 border-l border-slate-200 space-y-6 ml-3">
              {timelineHistory.map((stage) => (
                <div key={stage.id} className="relative">
                  <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-amber-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{stage.status}</span>
                      <span className="text-[10px] text-slate-400">{stage.statusDate} {stage.statusTime}</span>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* REQUEST DETAILS MODAL */}
      <RequestDetailsModal
        isOpen={!!viewDetailsReq}
        onClose={() => setViewDetailsReq(null)}
        request={viewDetailsReq}
      />

      {/* UPDATE PROGRESS MODAL */}
      <Modal isOpen={progressModalOpen} onClose={() => setProgressModalOpen(false)} title={`Update Progress - Request: ${selectedReq?.id}`}>
        <form onSubmit={handleProgressSubmit} className="space-y-4 text-left">
          <div className="p-3 bg-blue-50 border border-blue-200/60 rounded-xl text-xs text-blue-800 font-medium flex items-center justify-between">
            <div>
              <span className="font-bold">Assigned Staff: </span>
              <span>{selectedReq?.assignedElectricianName ? `${selectedReq.assignedElectricianName} (Electrician)` : (selectedReq?.assignedTo?.name || 'Unassigned')}</span>
            </div>
            <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
              {selectedReq?.status}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Select Progress Status</label>
            <select
              value={progressStatus}
              onChange={(e) => setProgressStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden focus:border-blue-500 bg-white"
            >
              <option value="In Progress">In Progress (Electrician working on repair)</option>
              <option value="Parts Requested">Parts Requested (Awaiting spare parts/components)</option>
              <option value="Resolved">Resolved (Repair completed & asset restored)</option>
              <option value="Dead Stock">Dead Stock (Decommission asset to Dead Stock)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Progress Description / Work Notes</label>
            <textarea
              rows={3}
              required
              placeholder="Provide details on repair progress or work conducted..."
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-blue-500"
            />
          </div>

          {progressStatus === 'Parts Requested' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Required Spare Parts</label>
              <input
                type="text"
                required
                placeholder="e.g. 5A Fuse, 2.5sqmm copper cable, 32A MCB"
                value={requiredParts}
                onChange={(e) => setRequiredParts(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-blue-500"
              />
            </div>
          )}

          {progressStatus === 'Resolved' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Problem Identified</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Loose wiring connection causing short circuit"
                  value={problemFound}
                  onChange={(e) => setProblemFound(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Solution / Work Done</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Replaced burnt terminal block and reconnected wiring"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-emerald-500"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setProgressModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Update Ticket Progress</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
