import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSkeleton, Modal } from '../components/ReusableComponents';
import { HardwareThreeDViewer } from '../components/HardwareThreeDViewer';
import {
  HelpCircle,
  FileText,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Send,
  PlusCircle,
  CheckCircle,
  Clock,
  Wrench,
  Laptop,
  Users,
  ShieldCheck,
  XCircle,
  Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useNavigate, useLocation } from 'react-router-dom';
import { RequestDetailsModal } from '../components/RequestDetailsModal';
import { RailwayTrackTimeline } from '../components/RailwayTrackTimeline';

export const ProgrammerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [hoveredType, setHoveredType] = useState<string>('CPU');
  const [departmentAssets, setDepartmentAssets] = useState<any[]>([]);

  // Modals state
  const [reportModalOpen, setReportModalOpen] = useState(location.pathname === '/report-issue');
  const [myRequestsModalOpen, setMyRequestsModalOpen] = useState(location.pathname === '/my-requests');
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<any[]>([]);

  // Wizard States
  const [reportedIssues, setReportedIssues] = useState<{ type: string; brand: string; count: number }[]>([]);
  const [remainingTypes, setRemainingTypes] = useState<string[]>(['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot']);
  const [wizardStage, setWizardStage] = useState<'select_lab' | 'select_type' | 'enter_custom_type' | 'enter_total_count' | 'ask_more' | 'final_submit' | 'confirm_submit'>('select_lab');
  const [currentType, setCurrentType] = useState('CPU');
  
  // Current Type Configuration States
  const [typeTotalCount, setTypeTotalCount] = useState<number | string>('');
  const [customTypeName, setCustomTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report Issue General Form State
  const [labs, setLabs] = useState<any[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [priority, setPriority] = useState('Medium');
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLabCounts, setSelectedLabCounts] = useState<Record<string, any>>({});

  const fetchSelectedLabCounts = async (labId: string) => {
    if (!labId) {
      setSelectedLabCounts({});
      return;
    }
    try {
      const deptIdParam = user?.departmentId || 0;
      const res = await api.get(`/inventory/finalized-counts/department/${deptIdParam}?labId=${labId}`);
      setSelectedLabCounts(res.data);
    } catch (err) {
      console.error('Failed to load selected lab counts', err);
    }
  };

  useEffect(() => {
    fetchSelectedLabCounts(selectedLabId);
  }, [selectedLabId]);

  const fetchProgrammerData = async () => {
    const deptIdParam = user?.departmentId || 0;
    try {
      const [countsRes, recentRes, labsRes] = await Promise.all([
        api.get(`/inventory/counts/department/${deptIdParam}`),
        api.get(`/repairs?departmentId=${deptIdParam}`),
        api.get(`/departments/${deptIdParam}/labs`)
      ]);

      setStats(countsRes.data);
      setAllRequests(recentRes.data);
      setRecentRequests(recentRes.data.slice(0, 5));
      setLabs(labsRes.data);
      if (labsRes.data && labsRes.data.length > 0 && !selectedLabId) {
        const firstFinalized = labsRes.data.find((l: any) => l.hasFinalizedCounts);
        if (firstFinalized) {
          setSelectedLabId(firstFinalized.id.toString());
        } else {
          setSelectedLabId('');
        }
      }
    } catch (err) {
      console.error('Failed to load Programmer metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammerData();
  }, [user, dashboardTick]);

  useEffect(() => {
    if (location.pathname === '/report-issue') {
      handleOpenReportModal();
    } else if (location.pathname === '/my-requests') {
      setMyRequestsModalOpen(true);
    }
  }, [location.pathname]);

  const handleOpenReportModal = () => {
    setReportedIssues([]);
    setRemainingTypes(['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot']);
    setWizardStage('select_lab');
    setCurrentType('CPU');
    setTypeTotalCount('');
    setIssueTitle('');
    setDescription('');
    
    // Auto-select lab
    const firstFinalized = labs.find((l: any) => l.hasFinalizedCounts);
    if (firstFinalized) {
      setSelectedLabId(firstFinalized.id.toString());
    } else if (labs.length > 0) {
      setSelectedLabId(labs[0].id.toString());
    }

    setReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setReportModalOpen(false);
    setReportedIssues([]);
    setRemainingTypes(['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot']);
    setWizardStage('select_lab');
    setCurrentType('CPU');
    setTypeTotalCount('');
    setIssueTitle('');
    setDescription('');
    setCustomTypeName('');
    setIsSubmitting(false);
    if (location.pathname === '/report-issue') {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleCloseMyRequestsModal = () => {
    setMyRequestsModalOpen(false);
    if (location.pathname === '/my-requests') {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportedIssues.length === 0) {
      toast.error('Please report at least one hardware issue.');
      return;
    }
    if (!issueTitle) {
      toast.error('Please enter a request title.');
      return;
    }

    if (wizardStage !== 'confirm_submit') {
      setWizardStage('confirm_submit');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/repairs/initiate-wizard', {
        requesterId: user?.userId,
        labId: selectedLabId ? parseInt(selectedLabId) : null,
        priority,
        title: issueTitle,
        description,
        issues: reportedIssues
      });
      
      toast.success('Hardware repair request submitted successfully.');
      handleCloseReportModal();
      fetchProgrammerData();
    } catch (err) {
      toast.error('Failed to submit repair request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTimeline = async (req: any) => {
    try {
      const res = await api.get(`/repairs/${req.id}/timeline`);
      setSelectedRequest(req);
      setSelectedTimeline(res.data);
      setTimelineModalOpen(true);
    } catch (err) {
      toast.error('Failed to retrieve timeline details.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated': return 'bg-amber-100 text-amber-700';
      case 'in progress': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      case 'dead stock': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="grid" />
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* 1. Programmer Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">Programmer Workspace</h2>
            <p className="text-xs text-indigo-200 mt-1 font-medium">
              Manage diagnostics, raise repair tickets, and audit device hardware counts for department: {user?.departmentCode || 'CSE'}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">Access Scope</div>
              <div className="text-xs font-black text-white">Programmer (Departmental)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Component Cards Row (CPU, Monitor, Keyboard, Mouse) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['CPU', 'Monitor', 'Keyboard', 'Mouse'].map((type) => {
          const typeData = stats[type] || { Total: 0, Working: 0, Repairing: 0, Dead: 0, NewStock: 0 };
          return (
            <div key={type} className="admin-card p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">{type}</h3>
                    <div className="text-2xl font-black text-slate-800 mt-0.5">{typeData.Total}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold mt-2">
                  <div className="bg-blue-50/50 p-2 rounded-xl">
                    <div className="text-blue-600">Working</div>
                    <div className="text-sm font-extrabold text-blue-700 mt-0.5">{typeData.Working}</div>
                  </div>
                  <div className="bg-amber-50/50 p-2 rounded-xl">
                    <div className="text-amber-600">In Repair</div>
                    <div className="text-sm font-extrabold text-amber-700 mt-0.5">{typeData.Repairing}</div>
                  </div>
                  <div className="bg-red-50/50 p-2 rounded-xl">
                    <div className="text-red-500">Dead</div>
                    <div className="text-sm font-extrabold text-red-600 mt-0.5">{typeData.Dead}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-4 text-[10px] font-bold text-blue-600 flex justify-between items-center">
                <span>New Stock:</span>
                <span className="bg-blue-50 px-2 py-0.5 rounded-md">{typeData.NewStock}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Middle Row: Quick Actions */}
      <div className="admin-card p-6 bg-white">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          <button
            onClick={handleOpenReportModal}
            className="flex items-center justify-between w-full p-3.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-2xl text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Report New Issue</div>
                <div className="text-[10px] text-slate-500 font-medium">Raise a repair request</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => setMyRequestsModalOpen(true)}
            className="flex items-center justify-between w-full p-3.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-2xl text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">View Requests</div>
                <div className="text-[10px] text-slate-500 font-medium">Track repair tickets</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/finalize-counts')}
            className="flex items-center justify-between w-full p-3.5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-2xl text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Finalize Counts</div>
                <div className="text-[10px] text-slate-500 font-medium">Verify hardware counts</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center justify-between w-full p-3.5 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-2xl text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Add Inventory Stock</div>
                <div className="text-[10px] text-slate-500 font-medium">Manage hardware assets</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/dead-stock')}
            className="flex items-center justify-between w-full p-3.5 bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-2xl text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Dead Stock registry</div>
                <div className="text-[10px] text-slate-500 font-medium">View decommissioned stock</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-red-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

        </div>
      </div>

      {/* 4. Recent Repair Requests Table */}
      <div className="admin-card bg-white p-6">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Recent Repair Requests</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 italic">No repair requests logged yet.</td>
                </tr>
              ) : (
                recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-700">{req.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{req.title}</td>
                    <td className="py-3.5 px-4 font-bold">
                      <span className={`px-2 py-0.5 rounded-full ${
                        req.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' : req.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getStatusBadgeClass(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleViewTimeline(req)}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-brand-purple hover:text-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Department Labs Directory */}
      <div className="admin-card bg-white p-6">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Department Labs</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {labs.map((lab) => (
            <div key={lab.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{lab.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Room: {lab.labNumber}</div>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  lab.hasFinalizedCounts ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {lab.hasFinalizedCounts ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALS */}

      {/* Raise Repair Modal Wizard */}
      <Modal isOpen={reportModalOpen} onClose={handleCloseReportModal} title="Report System Repair Request">
        <form onSubmit={handleReportIssue} className="text-left">
          
          {wizardStage === 'select_lab' && (
            <div className="space-y-5">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-[10px] bg-brand-purple/10 px-2.5 py-0.5 rounded-md text-brand-purple font-bold uppercase tracking-wider">Step 1 of 4</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Select Laboratory Number</h3>
                <p className="text-[11px] text-brand-textMuted mt-0.5">Which lab number has the hardware issue to report?</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Choose Lab Location</label>
                {labs.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
                    Loading department labs catalog... Default department allocation will be used if unselected.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {labs.map((lab) => {
                      const isSelected = selectedLabId === lab.id.toString();
                      const isFinalized = !!lab.hasFinalizedCounts;
                      return (
                        <div
                          key={lab.id}
                          onClick={() => {
                            if (isFinalized) {
                              setSelectedLabId(lab.id.toString());
                            } else {
                              toast.error(`Counts for Lab ${lab.labNumber} are not finalized yet.`);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                            !isFinalized
                              ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                              : isSelected 
                              ? 'border-brand-purple bg-brand-purple/5 shadow-xs cursor-pointer' 
                              : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand-purple text-white' : 'bg-slate-100 text-slate-600'}`}>
                              <Laptop className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{lab.name}</h4>
                              <span className="text-[10px] font-extrabold text-brand-purple">
                                {isFinalized ? `Lab Number: ${lab.labNumber}` : `Lab Number: ${lab.labNumber} (Not Finalized)`}
                              </span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-brand-purple bg-brand-purple text-white' : 'border-slate-300'}`}>
                            {isSelected && <CheckCircle className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedLabId) {
                      toast.error('Please select a finalized lab location.');
                      return;
                    }
                    setWizardStage('select_type');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Next: Select Hardware Type</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'select_type' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-[10px] bg-brand-purple/10 px-2 py-0.5 rounded-md text-brand-purple font-bold uppercase tracking-wider">Step 2 of 4</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Select Hardware Category</h3>
                <p className="text-[11px] text-brand-textMuted mt-0.5">Which hardware type has an issue in this lab?</p>
              </div>

              {/* Dynamic 3D interactive hardware viewer */}
              <HardwareThreeDViewer type={hoveredType} />

              <div className="grid grid-cols-2 gap-3">
                {remainingTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onMouseEnter={() => setHoveredType(type)}
                    onClick={() => {
                      setCurrentType(type);
                      setTypeTotalCount('');
                      setWizardStage('enter_total_count');
                    }}
                    className="p-4 border border-slate-200 hover:border-brand-purple hover:bg-brand-purple/5 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center gap-2 group"
                  >
                    <div className="p-2.5 bg-slate-50 text-slate-600 group-hover:bg-brand-purple/10 group-hover:text-brand-purple rounded-xl transition-all">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-brand-purple transition-all">{type}</span>
                  </button>
                ))}

                {/* Special Others category button */}
                <button
                  type="button"
                  onMouseEnter={() => setHoveredType('Others')}
                  onClick={() => {
                    setCustomTypeName('');
                    setWizardStage('enter_custom_type');
                  }}
                  className="p-4 border border-dashed border-slate-300 hover:border-brand-purple hover:bg-brand-purple/5 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center gap-2 group"
                >
                  <div className="p-2.5 bg-slate-50 text-slate-600 group-hover:bg-brand-purple/10 group-hover:text-brand-purple rounded-xl transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-brand-purple transition-all">Others</span>
                </button>
              </div>

              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStage('select_lab')}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition-all cursor-pointer"
                >
                  ← Back to Lab Selection
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'enter_custom_type' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-[10px] bg-brand-purple/10 px-2.5 py-0.5 rounded-md text-brand-purple font-bold uppercase tracking-wider">Custom Category</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Specify Hardware Type</h3>
                <p className="text-[11px] text-brand-textMuted mt-0.5">What is the custom hardware category needing repair?</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Hardware Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Printer, Projector, UPS"
                  value={customTypeName}
                  onChange={(e) => setCustomTypeName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setWizardStage('select_type')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = customTypeName.trim();
                    if (!trimmed) {
                      toast.error('Please specify the hardware category name.');
                      return;
                    }
                    setCurrentType(trimmed);
                    setTypeTotalCount('');
                    setWizardStage('enter_total_count');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all cursor-pointer text-center"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'enter_total_count' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-[10px] bg-brand-purple/10 px-2 py-0.5 rounded-md text-brand-purple font-bold uppercase tracking-wider">{currentType} Quantity</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">How many {currentType}s have issues in total?</h3>
                <p className="text-[11px] text-brand-textMuted mt-0.5">Enter the total quantity to be reported for {currentType}</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Total Quantity</label>
                <input
                  type="number"
                  required
                  placeholder="Enter quantity count"
                  min={1}
                  value={typeTotalCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setTypeTotalCount('');
                    } else {
                      setTypeTotalCount(Math.max(1, parseInt(val) || 1));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (customTypeName) {
                      setWizardStage('enter_custom_type');
                    } else {
                      setWizardStage('select_type');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsedCount = parseInt(typeTotalCount as string) || 0;
                    if (parsedCount <= 0) {
                      toast.error('Please enter a valid quantity of at least 1.');
                      return;
                    }
                    // Validate against actual finalized counts
                    const isStandard = ['CPU', 'Monitor', 'Keyboard', 'Mouse', 'Hotspot'].includes(currentType);
                    const limitData = selectedLabCounts[currentType];
                    const actualLimit = limitData ? limitData.total : 0;
                    if (isStandard && parsedCount > actualLimit) {
                      toast.error('The systems are not present in the lab by your req count');
                      return;
                    }
                    const newIssue = { type: currentType, brand: 'Standard', count: parsedCount };
                    const finalUpdatedIssues = [...reportedIssues.filter(i => i.type !== currentType), newIssue];
                    setReportedIssues(finalUpdatedIssues);

                    const nextRemaining = remainingTypes.filter(t => t !== currentType);
                    setRemainingTypes(nextRemaining);

                    if (nextRemaining.length === 0) {
                      const generatedTitle = `Repair: ${finalUpdatedIssues.map(i => `${i.type} x${i.count}`).join(', ')}`;
                      const generatedDesc = `Programmer reported the following hardware issues:\n` + 
                        finalUpdatedIssues.map(i => `- ${i.type}: Quantity: ${i.count}`).join('\n');
                      setIssueTitle(generatedTitle);
                      setDescription(generatedDesc);
                      setWizardStage('final_submit');
                    } else {
                      setWizardStage('ask_more');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all cursor-pointer text-center"
                >
                  Add Hardware Issue
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'ask_more' && (
            <div className="space-y-6 text-center py-2">
              <div className="pb-2 border-b border-slate-100">
                <span className="text-[10px] bg-brand-purple/10 px-2 py-0.5 rounded-md text-brand-purple font-bold uppercase tracking-wider">Multi-item Report</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Any other hardware type has an issue?</h3>
                <p className="text-[11px] text-brand-textMuted mt-0.5">
                  You've configured {reportedIssues.length} category brands. Add more or submit.
                </p>
              </div>

              {/* Current list summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-left max-w-sm mx-auto space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Added Items</span>
                {reportedIssues.map((issue, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-600 font-semibold">
                    <span>{issue.type} ({issue.brand})</span>
                    <span className="text-slate-800 font-bold">Qty: {issue.count}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 max-w-md mx-auto justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const generatedTitle = `Repair: ${reportedIssues.map(i => `${i.type} (${i.brand}) x${i.count}`).join(', ')}`;
                    const generatedDesc = `Programmer reported the following hardware issues:\n` + 
                      reportedIssues.map(i => `- ${i.type}: Brand: ${i.brand}, Quantity: ${i.count}`).join('\n');
                    setIssueTitle(generatedTitle);
                    setDescription(generatedDesc);
                    setWizardStage('final_submit');
                  }}
                  className="flex-1 py-3.5 px-4 border border-slate-200 hover:bg-slate-50 rounded-2xl font-bold text-xs text-slate-600 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5 text-slate-400" />
                  <span>No, Submit Request</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (remainingTypes.length === 1) {
                      const nextType = remainingTypes[0];
                      setCurrentType(nextType);
                      setTypeTotalCount('');
                      setWizardStage('enter_total_count');
                    } else {
                      setWizardStage('select_type');
                    }
                  }}
                  className="flex-1 py-3.5 px-4 bg-brand-purple hover:bg-brand-purpleHover text-white rounded-2xl font-bold text-xs shadow-md shadow-brand-purple/20 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-5 h-5 text-white/90" />
                  <span>Yes, Add Another</span>
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'final_submit' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-[10px] bg-brand-purple/10 px-2 py-0.5 rounded-md text-brand-purple font-bold uppercase tracking-wider">Final Step</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Review & Submit Repair Request</h3>
              </div>

              {/* Items Summary list */}
              <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Issues Summary</span>
                <div className="flex flex-wrap gap-2">
                  {reportedIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                      <span className="w-2.5 h-2.5 bg-brand-purple rounded-full"></span>
                      <span>{issue.type}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({issue.brand})</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold text-[10px] ml-1">x{issue.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Select Lab Number</label>
                  <select
                    value={selectedLabId}
                    onChange={(e) => setSelectedLabId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
                  >
                    {labs.length === 0 && <option value="">-- Main Department / General Systems --</option>}
                    {labs.map((lab) => (
                      <option key={lab.id} value={lab.id}>
                        Lab {lab.labNumber} ({lab.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 bg-white"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Issue Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CPU and Monitor issues in lab"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Detailed Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a detailed description of the hardware faults to assist the technician."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setReportedIssues([]);
                    setRemainingTypes(['CPU', 'Monitor', 'Keyboard', 'Mouse']);
                    setWizardStage('select_type');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-red-500 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Start Over
                </button>
                
                <button
                  type="button"
                  onClick={() => setWizardStage('confirm_submit')}
                  className="flex-2 py-2.5 px-6 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Review & Confirm</span>
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'confirm_submit' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-[10px] bg-emerald-100 px-2.5 py-0.5 rounded-md text-emerald-800 font-bold uppercase tracking-wider">Confirmation</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Confirm Request Details</h3>
                <p className="text-[11px] text-brand-textMuted mt-0.5">Please review the details below before submitting.</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Laboratory Room</span>
                  <span className="font-bold text-slate-700">
                    {(() => {
                      const selectedLab = labs.find(l => l.id.toString() === selectedLabId);
                      return selectedLab ? `${selectedLab.name} (Room ${selectedLab.labNumber})` : 'General / Main Department';
                    })()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' : priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {priority}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Request Title</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">{issueTitle}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Description</span>
                  <span className="text-slate-600 block mt-0.5 whitespace-pre-wrap">{description}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Issues Selected</span>
                  <div className="flex flex-wrap gap-2">
                    {reportedIssues.map((issue, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-slate-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-brand-purple rounded-full"></span>
                        <span>{issue.type}</span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.25 rounded-md font-bold text-[9px]">x{issue.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setWizardStage('final_submit')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Back to Edit
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold shadow-md shadow-brand-purple/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm & Submit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Submitted Requests List Modal */}
      <Modal isOpen={myRequestsModalOpen} onClose={handleCloseMyRequestsModal} title="My Submitted Requests">
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="overflow-x-auto text-left">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const myRequests = allRequests.filter(r => r.requester?.id === user?.userId);
                  if (myRequests.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">No request history found.</td>
                      </tr>
                    );
                  }
                  return myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-700">{req.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{req.title}</td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                          req.priority === 'High' ? 'bg-red-50 text-red-700' : req.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setMyRequestsModalOpen(false);
                            handleViewTimeline(req);
                          }}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-brand-purple hover:text-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                        >
                          Timeline
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Rich Request Overview Modal */}
      <RequestDetailsModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />

      {/* Railway Track Timeline Modal */}
      <RailwayTrackTimeline
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
        request={selectedRequest}
        timelineData={selectedTimeline}
      />
    </div>
  );
};
export default ProgrammerDashboard;
