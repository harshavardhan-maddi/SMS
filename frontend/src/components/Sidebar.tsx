import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  HardDrive,
  FolderOpen,
  Wrench,
  XCircle,
  FileBarChart,
  Users,
  Settings,
  User,
  LogOut,
  PlusCircle,
  HelpCircle,
  Clock,
  Menu,
  ShieldCheck,
  ClipboardCheck,
  Laptop
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const formatDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      dayStr: `${time.getDate()} ${months[time.getMonth()]} ${time.getFullYear()}`,
      weekday: days[time.getDay()],
      timeStr: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const { dayStr, weekday, timeStr } = formatDate();

  // Role based menu structures
  const getPrincipalMenu = () => [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Overview', path: '/overview', icon: ShieldCheck },
    { name: 'Departments', path: '/departments', icon: Building2 },
    { name: 'Department Labs', path: '/labs', icon: Laptop },
    { name: 'Inventory', path: '/inventory', icon: HardDrive },
    { name: 'New Stock', path: '/new-stock', icon: PlusCircle },
    { name: 'In Progress', path: '/in-progress', icon: Wrench },
    { name: 'Dead Stock', path: '/dead-stock', icon: XCircle },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
    { name: 'Analytics', path: '/analytics', icon: FolderOpen },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const getHodMenu = () => [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Department', path: '/my-department', icon: Building2 },
    { name: 'Department Labs', path: '/labs', icon: Laptop },
    { name: 'Inventory Overview', path: '/inventory', icon: HardDrive },
    { name: 'Finalize Count', path: '/finalize-counts', icon: ClipboardCheck },
    { name: 'Report Issue', path: '/report-issue', icon: AlertCircleIcon },
    { name: 'My Requests', path: '/my-requests', icon: FolderOpen },
    { name: 'In Progress', path: '/in-progress', icon: Wrench },
    { name: 'Resolved', path: '/resolved', icon: ShieldCheck },
    { name: 'Dead Stock', path: '/dead-stock', icon: XCircle },
    { name: 'New Stock', path: '/new-stock', icon: PlusCircle },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const getDeanMenu = () => [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Repair Requests', path: '/repair-requests', icon: FolderOpen },
    { name: 'Department Labs', path: '/labs', icon: Laptop },
    { name: 'In Progress', path: '/in-progress', icon: Wrench },
    { name: 'Resolved', path: '/resolved', icon: ShieldCheck },
    { name: 'Dead Stock', path: '/dead-stock', icon: XCircle },
    { name: 'Inventory', path: '/inventory', icon: HardDrive },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
    { name: 'Analytics', path: '/analytics', icon: FolderOpen },
    { name: 'Spare Parts', path: '/spare-parts', icon: HelpCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const getTechnicianMenu = () => [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Dead Stock', path: '/dead-stock', icon: XCircle },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];


  const AlertCircleIcon = HelpCircle; // Quick fallback for simple mapping

  const getMenu = () => {
    if (user.role === 'ROLE_PRINCIPAL') return getPrincipalMenu();
    if (user.role === 'ROLE_HOD') return getHodMenu();
    if (user.role === 'ROLE_TECHNICIAN') return getTechnicianMenu();
    return getDeanMenu();
  };

  const menuItems = getMenu();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[260px] bg-brand-dark text-white border-r border-[#1e293b]/20 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-6 h-[70px] border-b border-[#1e293b]/30">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-purple/20 text-brand-purple">
            <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SMS</h1>
            <p className="text-[10px] text-brand-textMuted font-medium">Systems Management System</p>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-purple text-white shadow-md'
                    : 'text-gray-400 hover:bg-slate-800/40 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}

          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all mt-4"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>

        {/* Ticking Clock Box (Bottom) */}
        <div className="p-4 mx-4 mb-6 rounded-2xl bg-slate-800/40 border border-slate-700/30">
          <div className="flex items-center gap-3 text-slate-300">
            <Clock className="w-5 h-5 text-brand-purple" />
            <div className="text-xs">
              <div className="font-semibold">{dayStr}</div>
              <div className="text-slate-400 font-medium text-[10px]">{weekday}</div>
              <div className="font-bold text-slate-200 mt-1 text-sm">{timeStr}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
