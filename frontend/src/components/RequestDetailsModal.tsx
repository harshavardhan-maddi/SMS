import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from './Modal';
import {
  Monitor,
  Cpu,
  Keyboard,
  Mouse,
  Wifi,
  Laptop,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  MapPin,
  Activity,
  Layers,
  Calendar,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any | null;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    if (isOpen && request && request.id) {
      setLoadingTimeline(true);
      api
        .get(`/repairs/${request.id}/history`)
        .then((res) => {
          setTimeline(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to load request timeline', err);
        })
        .finally(() => {
          setLoadingTimeline(false);
        });
    }
  }, [isOpen, request]);

  if (!request) return null;

  // 1. Resolve Hardware Icon and Label
  const itemType = request.inventory?.type || 'Hardware';
  const getItemIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'MONITOR':
        return <Monitor className="w-8 h-8 text-blue-600" />;
      case 'CPU':
        return <Cpu className="w-8 h-8 text-indigo-600" />;
      case 'KEYBOARD':
        return <Keyboard className="w-8 h-8 text-emerald-600" />;
      case 'MOUSE':
        return <Mouse className="w-8 h-8 text-purple-600" />;
      case 'HOTSPOT':
      case 'WIFI':
        return <Wifi className="w-8 h-8 text-amber-600" />;
      default:
        return <Laptop className="w-8 h-8 text-slate-700" />;
    }
  };

  // 2. Parse Total Quantity and Resolved Count
  let totalCount = 1;
  const matchQty = (request.title + ' ' + request.description).match(/(\d+)\s*Units/i);
  if (matchQty && matchQty[1]) {
    totalCount = parseInt(matchQty[1], 10);
  }

  let resolvedCount = 0;
  const currentStatus = request.status || 'Initiated';
  if (currentStatus.toLowerCase() === 'resolved') {
    resolvedCount = totalCount;
  } else if (currentStatus.toLowerCase() === 'in progress' || currentStatus.toLowerCase() === 'accepted') {
    // Check if timeline or description specifies resolved count (e.g. 4/10)
    const matchRes = (request.description || '').match(/resolved\s*(\d+)\/(\d+)/i);
    if (matchRes && matchRes[1]) {
      resolvedCount = Math.min(parseInt(matchRes[1], 10), totalCount);
    } else {
      // Demo in-progress allocation (e.g. partial progress if applicable)
      resolvedCount = Math.floor(totalCount * 0.3); 
    }
  } else {
    resolvedCount = 0; // Initiated state: 0 resolved
  }

  const inProgressCount = totalCount - resolvedCount;
  const progressPercent = Math.round((resolvedCount / totalCount) * 100);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'accepted':
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'dead stock':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Repair Ticket Overview: ${request.id}`}>
      <div className="space-y-6 text-left max-h-[80vh] overflow-y-auto pr-1">
        
        {/* Header Block with Hardware Logo & Main Info */}
        <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                {getItemIcon(itemType)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/20 text-white uppercase tracking-wider">
                    {itemType}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    {request.inventory?.brand || 'Standard Brand'}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1 leading-snug">
                  {request.title}
                </h3>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 self-start sm:self-center">
              <span className={`px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider shadow-xs ${getStatusBadgeClass(currentStatus)}`}>
                {currentStatus}
              </span>
              <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(request.initiatedDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Hardware Unit Breakdown Section */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-purple" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Unit Resolution Status Breakdown ({resolvedCount}/{totalCount} Resolved)
              </h4>
            </div>
            <span className="text-xs font-extrabold text-brand-purple">{progressPercent}% Completed</span>
          </div>

          {/* Live Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Unit Grid Displays */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {Array.from({ length: totalCount }).map((_, idx) => {
              const isResolved = idx < resolvedCount;
              const isInitiatedOnly = currentStatus.toLowerCase() === 'initiated';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    isResolved
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 shadow-xs'
                      : isInitiatedOnly
                      ? 'bg-red-50/90 border-red-300 text-red-800 animate-pulse'
                      : 'bg-amber-50/90 border-amber-300 text-amber-800'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {getItemIcon(itemType)}
                    <span className="text-xs font-black">#{idx + 1}</span>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 ${
                      isResolved
                        ? 'bg-emerald-200/70 text-emerald-900'
                        : isInitiatedOnly
                        ? 'bg-red-200/80 text-red-900'
                        : 'bg-amber-200/80 text-amber-900'
                    }`}
                  >
                    {isResolved ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Resolved
                      </>
                    ) : isInitiatedOnly ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span> Initiated
                      </>
                    ) : (
                      <>
                        <Wrench className="w-3 h-3 text-amber-700 animate-spin" /> In Progress
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Request Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2.5 text-xs">
            <h5 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Location & Department
            </h5>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Department:</span>
              <span className="font-bold text-slate-800">{request.inventory?.department?.name || 'College Department'} ({request.inventory?.department?.code || 'N/A'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Primary Asset ID:</span>
              <span className="font-mono font-bold text-brand-purple">{request.inventory?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Priority Level:</span>
              <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                request.priority === 'High' ? 'bg-red-100 text-red-700' : request.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
              }`}>
                {request.priority || 'Medium'} Priority
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2.5 text-xs">
            <h5 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Personnel Assignment
            </h5>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Requested By:</span>
              <span className="font-bold text-slate-800">{request.requester?.name || 'Department HOD'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Assigned Technician:</span>
              <span className="font-extrabold text-brand-purple">{request.assignedTo?.name || 'Pending Assignment (Dean)'}</span>
            </div>
          </div>
        </div>

        {/* Detailed Fault Description */}
        <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-1.5 text-xs">
          <h5 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-500" /> Reported Problem Description
          </h5>
          <p className="text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-200/60">
            {request.description || 'No additional notes provided.'}
          </p>
        </div>

        {/* Timeline History */}
        <div className="p-4 bg-white border border-slate-200/60 rounded-2xl space-y-3 text-xs">
          <h5 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Request Progress Timeline
          </h5>

          {loadingTimeline ? (
            <div className="text-center py-4 text-slate-400 font-medium italic">Loading timeline updates...</div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-4 text-slate-400 font-medium italic">No timeline entries recorded yet.</div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 ml-2 pt-1">
              {timeline.map((stage) => (
                <div key={stage.id} className="relative">
                  <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-brand-purple">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-purple"></span>
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">{stage.status}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{stage.statusDate} {stage.statusTime?.substring(0, 5)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">{stage.description}</p>
                    {stage.updatedBy && (
                      <span className="text-[9px] text-slate-400 block font-medium">Updated by: {stage.updatedBy.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
