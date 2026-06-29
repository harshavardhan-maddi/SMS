import React from 'react';
import { Modal } from './Modal';
import {
  MapPin,
  CheckCircle2,
  Clock,
  Wrench,
  UserCheck,
  AlertTriangle,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Monitor,
  Keyboard,
  Mouse,
  Wifi,
  Laptop
} from 'lucide-react';

interface RailwayTrackTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  request: any | null;
  timelineData: any[];
}

export const RailwayTrackTimeline: React.FC<RailwayTrackTimelineProps> = ({
  isOpen,
  onClose,
  request,
  timelineData
}) => {
  if (!request) return null;

  const currentStatus = (request.status || 'Initiated').toLowerCase();

  // Helper for hardware icon
  const getItemIcon = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'MONITOR': return <Monitor className="w-5 h-5 text-blue-400" />;
      case 'CPU': return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'KEYBOARD': return <Keyboard className="w-5 h-5 text-emerald-400" />;
      case 'MOUSE': return <Mouse className="w-5 h-5 text-purple-400" />;
      case 'HOTSPOT': return <Wifi className="w-5 h-5 text-amber-400" />;
      default: return <Laptop className="w-5 h-5 text-slate-300" />;
    }
  };

  // Construct standardized Railway Stations from history and current status
  const stations = [
    {
      id: 'initiated',
      title: 'Starting Station: Request Initiated',
      stationType: 'START',
      statusName: 'Initiated',
      isCompleted: true, // Always completed if request exists
      isActive: currentStatus === 'initiated',
      date: request.initiatedDate,
      time: request.initiatedTime ? request.initiatedTime.substring(0, 5) : '09:00',
      personnel: request.requester?.name || 'Department HOD',
      role: 'Requester HOD',
      description: request.description || 'Hardware fault reported via HOD portal.',
      details: {
        title: request.title,
        priority: request.priority,
        assetId: request.inventory?.id
      }
    },
    {
      id: 'accepted',
      title: 'Station 2: Dean Delegation & Accept',
      stationType: 'MIDDLE',
      statusName: 'Accepted',
      isCompleted: ['accepted', 'in progress', 'parts requested', 'resolved', 'dead stock'].includes(currentStatus),
      isActive: currentStatus === 'accepted',
      date: timelineData.find(t => t.status === 'Accepted')?.statusDate || request.initiatedDate,
      time: timelineData.find(t => t.status === 'Accepted')?.statusTime?.substring(0, 5) || '10:30',
      personnel: request.assignedTo?.name || 'Assigned Technician',
      role: 'Hardware Technician',
      description: 'Computer Dean accepted request and delegated hardware diagnosis to technician.',
      details: {}
    },
    {
      id: 'in_progress',
      title: 'Station 3: Maintenance & Inspection',
      stationType: 'MIDDLE',
      statusName: 'In Progress',
      isCompleted: ['resolved', 'dead stock'].includes(currentStatus),
      isActive: ['in progress', 'parts requested'].includes(currentStatus),
      date: timelineData.find(t => t.status === 'In Progress' || t.status === 'Parts Requested')?.statusDate || 'Pending',
      time: timelineData.find(t => t.status === 'In Progress' || t.status === 'Parts Requested')?.statusTime?.substring(0, 5) || '--:--',
      personnel: request.assignedTo?.name || 'Hardware Technician',
      role: 'Assigned Technician',
      description: 'Diagnostic checks and physical repairs actively underway in workshop.',
      details: {
        expectedDays: timelineData.find(t => t.expectedCompletionDays)?.expectedCompletionDays || 2,
        requiredParts: timelineData.find(t => t.requiredParts)?.requiredParts
      }
    },
    {
      id: 'terminal',
      title: currentStatus === 'dead stock' ? 'Terminal Station: Scrapped Dead Stock' : 'Terminal Station: Repair Resolved',
      stationType: 'END',
      statusName: currentStatus === 'dead stock' ? 'Dead Stock' : 'Resolved',
      isCompleted: ['resolved', 'dead stock'].includes(currentStatus),
      isActive: ['resolved', 'dead stock'].includes(currentStatus),
      date: timelineData.find(t => t.status === 'Resolved' || t.status === 'Dead Stock')?.statusDate || 'Pending Completion',
      time: timelineData.find(t => t.status === 'Resolved' || t.status === 'Dead Stock')?.statusTime?.substring(0, 5) || '--:--',
      personnel: timelineData.find(t => t.status === 'Resolved' || t.status === 'Dead Stock')?.updatedBy?.name || request.assignedTo?.name || 'Technician / Dean',
      role: 'Resolution Authority',
      description: currentStatus === 'resolved' 
        ? 'All repairs successfully completed, verified, and restored to operational lab inventory.' 
        : currentStatus === 'dead stock' 
        ? 'Hardware item inspected, confirmed unrepairable, and officially archived into Dead Stock register.'
        : 'Final resolution pending completion of maintenance.',
      details: {
        problemFound: timelineData.find(t => t.problemFound)?.problemFound,
        solution: timelineData.find(t => t.solution)?.solution,
        partsReplaced: timelineData.find(t => t.partsReplaced)?.partsReplaced,
        remarks: timelineData.find(t => t.remarks)?.remarks
      }
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Railway Progress Track: ${request.id}`}>
      <div className="space-y-6 text-left max-h-[82vh] overflow-y-auto pr-1">
        
        {/* Railway Header Card */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
                {getItemIcon(request.inventory?.type)}
              </div>
              <div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                  Railway Track Journey
                </span>
                <h3 className="text-sm font-black text-white mt-1">
                  {request.title}
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Asset ID</span>
              <span className="text-xs font-mono font-black text-brand-purple">{request.inventory?.id || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* RAILWAY TRACK STEPPER VISUAL CONTAINER */}
        <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-8 relative">
          
          <div className="text-center pb-2 border-b border-slate-800">
            <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Repair Railway Track Timeline
            </h4>
          </div>

          {/* Railway Track Line & Stations */}
          <div className="relative pl-6 sm:pl-8 space-y-8">
            
            {/* Background Railway Track Steel Line */}
            <div className="absolute left-[29px] sm:left-[37px] top-4 bottom-4 w-1.5 bg-gradient-to-b from-emerald-500 via-indigo-500 to-slate-700 rounded-full shadow-inner"></div>

            {stations.map((st, idx) => {
              return (
                <div key={st.id} className="relative flex items-start gap-4 sm:gap-6 group">
                  
                  {/* Railway Station Node Icon / Light */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-4 shadow-lg transition-transform group-hover:scale-110 ${
                    st.isCompleted
                      ? 'bg-emerald-500 border-emerald-900 text-white ring-4 ring-emerald-500/20'
                      : st.isActive
                      ? 'bg-amber-500 border-amber-900 text-white ring-4 ring-amber-500/30 animate-pulse'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    {st.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                    ) : st.isActive ? (
                      <Wrench className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <span className="text-xs font-black">{idx + 1}</span>
                    )}
                  </div>

                  {/* Station Content Details Card */}
                  <div className={`flex-1 p-4 sm:p-5 rounded-2xl border transition-all ${
                    st.isActive
                      ? 'bg-slate-800/90 border-amber-500/50 shadow-lg ring-1 ring-amber-500/30'
                      : st.isCompleted
                      ? 'bg-slate-800/60 border-slate-700/80'
                      : 'bg-slate-900/50 border-slate-800/80 opacity-60'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-700/60 pb-2 mb-2.5">
                      <div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          st.stationType === 'START' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          st.stationType === 'END' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {st.stationType} STATION
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-white mt-1">{st.title}</h5>
                      </div>

                      <div className="text-right text-[11px] font-mono text-slate-400 flex items-center gap-1.5 self-start sm:self-center">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{st.date}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-indigo-400 font-bold">{st.time}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {st.description}
                    </p>

                    {/* Personnel Info */}
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500 font-semibold">Processed By:</span>{' '}
                        <span className="font-bold text-slate-200">{st.personnel}</span>
                      </div>
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">{st.role}</span>
                    </div>

                    {/* Milestone Specific Reason / Problem Details */}
                    {st.details && Object.keys(st.details).length > 0 && (
                      <div className="mt-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5 text-slate-300">
                        {st.details.title && <div>• <span className="text-slate-400 font-semibold">Title:</span> <span className="font-bold text-white">{st.details.title}</span></div>}
                        {st.details.priority && <div>• <span className="text-slate-400 font-semibold">Priority:</span> <span className="font-bold text-amber-400">{st.details.priority}</span></div>}
                        {st.details.expectedDays && <div>• <span className="text-slate-400 font-semibold">Expected Days:</span> <span className="font-bold text-blue-400">{st.details.expectedDays} Days</span></div>}
                        {st.details.requiredParts && <div>• <span className="text-slate-400 font-semibold">Required Parts:</span> <span className="font-bold text-emerald-400">{st.details.requiredParts}</span></div>}
                        {st.details.problemFound && <div>• <span className="text-slate-400 font-semibold">Problem Identified:</span> <span className="font-bold text-amber-300">{st.details.problemFound}</span></div>}
                        {st.details.solution && <div>• <span className="text-slate-400 font-semibold">Applied Solution:</span> <span className="font-bold text-emerald-300">{st.details.solution}</span></div>}
                        {st.details.partsReplaced && <div>• <span className="text-slate-400 font-semibold">Replaced Parts:</span> <span className="font-bold text-purple-300">{st.details.partsReplaced}</span></div>}
                        {st.details.remarks && <div>• <span className="text-slate-400 font-semibold">Final Remarks:</span> <span className="font-bold text-slate-200">{st.details.remarks}</span></div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
