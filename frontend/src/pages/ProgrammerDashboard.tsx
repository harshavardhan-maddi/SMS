import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSkeleton, Modal } from '../components/ReusableComponents';
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
  const [wizardStage, setWizardStage] = useState<'select_lab' | 'select_type' | 'enter_total_count' | 'ask_more' | 'final_submit'>('select_lab');
  const [currentType, setCurrentType] = useState('CPU');
  
  // Current Type Configuration States
  const [typeTotalCount, setTypeTotalCount] = useState<number | string>('');

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
      const [countsRes, recentRes, assetsRes, labsRes] = await Promise.all([
        api.get(`/inventory/counts/department/${deptIdParam}`),
        api.get(`/repairs?departmentId=${deptIdParam}`),
        api.get(`/inventory?departmentId=${deptIdParam}`),
        api.get(`/departments/${deptIdParam}/labs`)
      ]);

      setStats(countsRes.data);
      setAllRequests(recentRes.data);
      setRecentRequests(recentRes.data.slice(0, 5));
      setDepartmentAssets(assetsRes.data.filter((a: any) => a.status === 'Working' || a.status === 'New Stock'));
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
        <form onSubmit={handleReportIssue} className="space-y-4 text-left">
          {wizardStage === 'select_lab' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Select Laboratory</label>
                <select
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple bg-white"
                >
                  <option value="">Choose lab room...</option>
                  {labs.map(l => (
                    <option key={l.id} value={l.id.toString()}>{l.name} (Room {l.labNumber})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple bg-white"
                >
                  <option value="Low">Low (Non-urgent diagnostics)</option>
                  <option value="Medium">Medium (General standard fault)</option>
                  <option value="High">High (Urgent lab downtime)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!selectedLabId) {
                    toast.error('Please select a laboratory.');
                    return;
                  }
                  setWizardStage('select_type');
                }}
                className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold transition-all cursor-pointer text-center"
              >
                Continue Setup
              </button>
            </div>
          )}

          {wizardStage === 'select_type' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Configure Faulty Devices</h4>
                <div className="text-[10px] text-slate-400 font-medium">Select a device hardware category below to report faulty counts:</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {remainingTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setCurrentType(t);
                      setTypeTotalCount('');
                      setWizardStage('enter_total_count');
                    }}
                    className="p-3 border border-slate-200 hover:border-brand-purple bg-slate-50 hover:bg-purple-50/20 rounded-xl text-xs font-bold text-slate-700 text-center cursor-pointer transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
              {reportedIssues.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Queue:</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {reportedIssues.map(i => (
                      <span key={i.type} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        {i.type} (x{i.count})
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const generatedTitle = `Repair: ${reportedIssues.map(i => `${i.type} x${i.count}`).join(', ')}`;
                      const generatedDesc = `Programmer reported the following hardware issues:\n` + 
                        reportedIssues.map(i => `- ${i.type}: Quantity: ${i.count}`).join('\n');
                      setIssueTitle(generatedTitle);
                      setDescription(generatedDesc);
                      setWizardStage('final_submit');
                    }}
                    className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Proceed to Review
                  </button>
                </div>
              )}
            </div>
          )}

          {wizardStage === 'enter_total_count' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Quantity of Faulty {currentType}s</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Enter the number of devices requiring repair.</p>
              </div>
              <input
                type="number"
                min={1}
                required
                placeholder="e.g. 5"
                value={typeTotalCount}
                onChange={(e) => setTypeTotalCount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setWizardStage('select_type')}
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
                    const limitData = selectedLabCounts[currentType];
                    const actualLimit = limitData ? limitData.total : 999;
                    if (parsedCount > actualLimit) {
                      toast.error('Quantity exceeds verified systems present in the lab.');
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
                  className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Add to Queue
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'ask_more' && (
            <div className="space-y-4 text-center">
              <h4 className="text-xs font-bold text-slate-800">Add Another Hardware Issue?</h4>
              <p className="text-[10px] text-slate-400 font-medium">Would you like to log faults for another device category in this lab?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const generatedTitle = `Repair: ${reportedIssues.map(i => `${i.type} x${i.count}`).join(', ')}`;
                    const generatedDesc = `Programmer reported the following hardware issues:\n` + 
                      reportedIssues.map(i => `- ${i.type}: Quantity: ${i.count}`).join('\n');
                    setIssueTitle(generatedTitle);
                    setDescription(generatedDesc);
                    setWizardStage('final_submit');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  No, Proceed to Review
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStage('select_type')}
                  className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Yes, Add Category
                </button>
              </div>
            </div>
          )}

          {wizardStage === 'final_submit' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Repair Title</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of request"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Problem Description & Symptoms</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail fault symptoms..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 outline-hidden focus:border-brand-purple"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setWizardStage('select_type')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleHover text-white text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Submit Repair Ticket
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
