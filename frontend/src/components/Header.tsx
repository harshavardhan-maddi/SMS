import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Bell, Menu, Check, Eye } from 'lucide-react';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useWebSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  if (!user) return null;

  // Format roles for display
  const getDisplayRole = () => {
    if (user.role === 'ROLE_PRINCIPAL') return 'Principal';
    if (user.role === 'ROLE_DEAN') return 'Computer Dean';
    if (user.role === 'ROLE_HOD') {
      const dept = user.departmentCode ? ` (${user.departmentCode})` : '';
      return `HOD${dept}`;
    }
    return 'User';
  };

  const getDashboardSubtitle = () => {
    if (user.role === 'ROLE_PRINCIPAL') return 'Principal Dashboard - Overview of College Systems';
    if (user.role === 'ROLE_HOD') return 'HOD Dashboard - Department Overview';
    return 'Computer Dean Dashboard - Repair Management Overview';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="flex items-center justify-between px-6 h-[70px] bg-white border-b border-[#e2e8f0]">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-lg font-bold flex items-center gap-1.5 text-slate-800">
            Welcome, <span className="text-brand-purple">{user.name}</span>
          </h2>
          <p className="text-xs text-brand-textMuted font-medium hidden md:block">
            {getDashboardSubtitle()}
          </p>
        </div>
      </div>

      {/* Right side: Bell & User Info */}
      <div className="flex items-center gap-4">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[320px] bg-white rounded-2xl border border-[#e2e8f0] shadow-premium z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-[#e2e8f0]">
                <span className="text-xs font-bold text-slate-700">Notifications ({unreadCount} unread)</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-semibold text-brand-purple hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-brand-textMuted">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`flex gap-3 p-3 text-left transition-colors ${
                        notif.readStatus ? 'bg-white' : 'bg-brand-purple/5'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-800 leading-tight">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-brand-textMuted mt-1 block">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {!notif.readStatus && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          title="Mark as read"
                          className="self-center p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User initials circle & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 text-left"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-purple text-white text-xs font-bold shadow-sm">
              {getInitials(user.name)}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-brand-textMuted font-medium">{getDisplayRole()}</div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#e2e8f0] shadow-premium z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                <p className="text-[10px] text-brand-textMuted truncate">{user.email}</p>
              </div>
              <div className="py-0.5 border-b border-slate-100">
                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="block w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  My Profile
                </Link>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
