import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { ChevronRight, ChevronDown, Building2, Laptop, HardDrive, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: string;
  department: { id: number; name: string; code: string } | null;
  lab: { id: number; name: string; labNumber: string } | null;
}

export const DeadStockPage: React.FC = () => {
  const { user } = useAuth();
  const { dashboardTick } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [deadStockItems, setDeadStockItems] = useState<InventoryItem[]>([]);

  // Tree expanded nodes tracking (IDs of expanded nodes)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchDeadStock = async () => {
    try {
      let url = '/inventory';
      if (user?.role === 'ROLE_HOD' && user.departmentId) {
        url = `/inventory?departmentId=${user.departmentId}`;
      }
      const res = await api.get(url);
      const items: InventoryItem[] = res.data.filter((item: any) => item.status === 'Dead Stock');
      setDeadStockItems(items);
      
      // Auto expand root level departments by default
      const initialExpanded: Record<string, boolean> = {};
      items.forEach(item => {
        const deptKey = `dept-${item.department?.id || 0}`;
        initialExpanded[deptKey] = true;
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      toast.error('Failed to load dead stock registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadStock();
  }, [user, dashboardTick]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  if (loading) return <div className="p-12 text-center text-xs text-brand-textMuted font-bold">Loading Dead Stock Tree Registry...</div>;

  // Group items by Department -> Lab -> Device Type
  const treeData: Record<string, { deptName: string; deptCode: string; labs: Record<string, { labName: string; labNumber: string; types: Record<string, InventoryItem[]> }> }> = {};

  deadStockItems.forEach(item => {
    const deptId = item.department?.id || 0;
    const deptKey = `dept-${deptId}`;
    const deptName = item.department?.name || 'Unassigned Department';
    const deptCode = item.department?.code || 'UN';

    if (!treeData[deptKey]) {
      treeData[deptKey] = { deptName, deptCode, labs: {} };
    }

    const labId = item.lab?.id || 0;
    const labKey = `lab-${labId}`;
    const labName = item.lab?.name || 'General Inventory / Storage';
    const labNumber = item.lab?.labNumber || 'N/A';

    if (!treeData[deptKey].labs[labKey]) {
      treeData[deptKey].labs[labKey] = { labName, labNumber, types: {} };
    }

    const deviceType = item.type || 'Other';
    if (!treeData[deptKey].labs[labKey].types[deviceType]) {
      treeData[deptKey].labs[labKey].types[deviceType] = [];
    }

    treeData[deptKey].labs[labKey].types[deviceType].push(item);
  });

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Dead Stock Registry</h2>
        <p className="text-xs text-brand-textMuted font-medium">Decommissioned and faulty hardware assets categorized hierarchically by Department, Lab, and Device Type</p>
      </div>

      <div className="admin-card bg-white p-6 min-h-[400px]">
        {Object.keys(treeData).length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-textMuted font-medium border border-dashed border-slate-200 rounded-2xl">
            No dead stock assets logged in the repository.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(treeData).map(([deptKey, deptObj]) => {
              const isDeptExpanded = !!expandedNodes[deptKey];
              const totalDeptItems = Object.values(deptObj.labs).reduce(
                (acc, l) => acc + Object.values(l.types).reduce((tAcc, tItems) => tAcc + tItems.length, 0), 0
              );

              return (
                <div key={deptKey} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  {/* LEVEL 1: Department Node */}
                  <div
                    onClick={() => toggleNode(deptKey)}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer select-none transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      {isDeptExpanded ? <ChevronDown className="w-4 h-4 text-brand-purple" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <Building2 className="w-5 h-5 text-brand-purple" />
                      <span className="font-bold text-sm text-slate-800">{deptObj.deptName} ({deptObj.deptCode})</span>
                    </div>
                    <span className="bg-red-100 text-red-700 font-bold text-xs px-2.5 py-1 rounded-full">
                      {totalDeptItems} Dead Assets
                    </span>
                  </div>

                  {/* LEVEL 2: Labs */}
                  {isDeptExpanded && (
                    <div className="p-4 bg-white space-y-3 pl-8 border-t border-slate-100">
                      {Object.entries(deptObj.labs).map(([labKey, labObj]) => {
                        const fullLabKey = `${deptKey}-${labKey}`;
                        const isLabExpanded = !!expandedNodes[fullLabKey];
                        const totalLabItems = Object.values(labObj.types).reduce((acc, items) => acc + items.length, 0);

                        return (
                          <div key={fullLabKey} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/40">
                            <div
                              onClick={() => toggleNode(fullLabKey)}
                              className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 cursor-pointer select-none transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                {isLabExpanded ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                <Laptop className="w-4 h-4 text-slate-600" />
                                <span className="font-semibold text-xs text-slate-800">{labObj.labName}</span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-mono font-bold text-slate-500">{labObj.labNumber}</span>
                              </div>
                              <span className="text-xs font-semibold text-slate-500">{totalLabItems} items</span>
                            </div>

                            {/* LEVEL 3: Devices */}
                            {isLabExpanded && (
                              <div className="p-3 pl-8 space-y-3 bg-slate-50/50 border-t border-slate-100">
                                {Object.entries(labObj.types).map(([deviceType, items]) => {
                                  const deviceKey = `${fullLabKey}-${deviceType}`;
                                  const isDeviceExpanded = expandedNodes[deviceKey] !== false; // expanded by default when lab is open

                                  return (
                                    <div key={deviceKey} className="bg-white border border-slate-200/60 rounded-xl overflow-hidden">
                                      <div
                                        onClick={() => toggleNode(deviceKey)}
                                        className="flex items-center justify-between px-3 py-2 bg-slate-100/50 hover:bg-slate-100 cursor-pointer select-none"
                                      >
                                        <div className="flex items-center gap-2">
                                          {isDeviceExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                                          <span className="font-bold text-xs text-slate-700">{deviceType}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                                          {items.length} Faulty
                                        </span>
                                      </div>

                                      {/* LEVEL 4: Inventory Items Table */}
                                      {isDeviceExpanded && (
                                        <div className="overflow-x-auto p-2">
                                          <table className="w-full text-left border-collapse">
                                            <thead>
                                              <tr className="border-b border-slate-100 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                <th className="py-2 px-3">Asset ID</th>
                                                <th className="py-2 px-3">Brand / Model</th>
                                                <th className="py-2 px-3">Serial Number</th>
                                                <th className="py-2 px-3">Status</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                              {items.map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                  <td className="py-2 px-3 font-bold text-slate-800">{item.id}</td>
                                                  <td className="py-2 px-3 font-medium text-slate-600">{item.brand} {item.model}</td>
                                                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{item.serialNumber || 'N/A'}</td>
                                                  <td className="py-2 px-3">
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[10px] font-bold">
                                                      Dead Stock
                                                    </span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default DeadStockPage;
