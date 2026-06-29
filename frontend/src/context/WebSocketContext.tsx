import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@supabase/supabase-js';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Notification } from '../types';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!(import.meta as any).env.VITE_SUPABASE_URL || !(import.meta as any).env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials not fully configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your frontend/.env file.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface WebSocketContextType {
  notifications: Notification[];
  unreadCount: number;
  dashboardTick: number; // Increment triggers charts/stats refresh
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [dashboardTick, setDashboardTick] = useState<number>(0);

  // Fetch initial notifications when user changes
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/notifications?userId=${user.userId}`);
      setNotifications(response.data);
      
      const unreadCountResponse = await api.get(`/notifications/unread/count?userId=${user.userId}`);
      setUnreadCount(unreadCountResponse.data.count);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!(import.meta as any).env.VITE_SUPABASE_URL || !(import.meta as any).env.VITE_SUPABASE_ANON_KEY) {
      return;
    }

    console.log('Initializing Supabase Realtime for user:', user.userId);

    // 1. Subscribe to notifications table inserts for the current user
    const notificationsChannel = supabase
      .channel(`notifications-user-${user.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.userId}`,
        },
        (payload) => {
          console.log('Realtime notification received:', payload);
          const raw = payload.new as any;
          const newNotif: Notification = {
            id: raw.id,
            message: raw.message,
            type: raw.type,
            readStatus: !!raw.read_status,
            createdAt: raw.created_at,
          };

          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          toast(newNotif.message, {
            icon: '🔔',
            duration: 4000,
            style: {
              background: '#0c1a30',
              color: '#fff',
              borderRadius: '12px',
            }
          });
        }
      )
      .subscribe();

    // 2. Subscribe to general database changes to trigger dashboard updates
    const dbChangesChannel = supabase
      .channel('dashboard-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_requests' },
        () => {
          console.log('Realtime dashboard sync: repair_requests updated');
          setDashboardTick((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => {
          console.log('Realtime dashboard sync: inventory updated');
          setDashboardTick((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repair_history' },
        () => {
          console.log('Realtime dashboard sync: repair_history updated');
          setDashboardTick((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'finalized_hardware_counts' },
        () => {
          console.log('Realtime dashboard sync: finalized_hardware_counts updated');
          setDashboardTick((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        () => {
          console.log('Realtime dashboard sync: departments updated');
          setDashboardTick((prev) => prev + 1);
        }
      )
      .subscribe();

    // 3. SockJS / STOMP connection to local backend broker for broadcast updates
    let stompClient: any = null;
    try {
      const backendUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
      const wsUrl = backendUrl.replace('/api', '/ws');
      const socket = new SockJS(wsUrl);
      stompClient = new Client({
        webSocketFactory: () => socket as any,
        debug: () => {},
        onConnect: () => {
          stompClient.subscribe('/topic/dashboard', () => {
            setDashboardTick((prev) => prev + 1);
          });
          stompClient.subscribe(`/topic/notifications/${user.userId}`, (message: any) => {
            try {
              const newNotif = JSON.parse(message.body);
              setNotifications((prev) => [newNotif, ...prev]);
              setUnreadCount((prev) => prev + 1);
              toast(newNotif.message, {
                icon: '🔔',
                duration: 4000,
                style: { background: '#0c1a30', color: '#fff', borderRadius: '12px' }
              });
            } catch (e) {}
          });
        }
      });
      stompClient.activate();
    } catch (e) {
      console.warn('STOMP client init error:', e);
    }

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(dbChangesChannel);
      if (stompClient) {
        try { stompClient.deactivate(); } catch (e) {}
      }
    };
  }, [user]);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readStatus: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await api.put(`/notifications/read-all?userId=${user.userId}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, readStatus: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        notifications,
        unreadCount,
        dashboardTick,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
