import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface UserSession {
  userId: number;
  name: string;
  email: string;
  role: string; // ROLE_PRINCIPAL, ROLE_HOD, ROLE_DEAN
  departmentCode?: string;
  departmentId?: number;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<String | null>(null);
  const [loading, setLoading] = useState<Boolean>(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedToken = localStorage.getItem('sms_token');
    const storedUser = localStorage.getItem('sms_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, role: string, rememberMe: boolean) => {
    try {
      const response = await api.post('/auth/login', { email, password, role });
      const data = response.data;
      
      const sessionUser: UserSession = {
        userId: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
        departmentCode: data.departmentCode,
        departmentId: data.departmentId
      };

      setToken(data.token);
      setUser(sessionUser);

      // Store based on rememberMe selection
      if (rememberMe) {
        localStorage.setItem('sms_token', data.token);
        localStorage.setItem('sms_user', JSON.stringify(sessionUser));
      } else {
        sessionStorage.setItem('sms_token', data.token);
        sessionStorage.setItem('sms_user', JSON.stringify(sessionUser));
        // Also keep in localStorage temporarily for request interceptors
        localStorage.setItem('sms_token', data.token);
        localStorage.setItem('sms_user', JSON.stringify(sessionUser));
      }

      toast.success(`Welcome back, ${sessionUser.name}!`);
    } catch (error: any) {
      const errMsg = error.response?.data || 'Login failed. Please verify credentials.';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Login failed');
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    sessionStorage.removeItem('sms_token');
    sessionStorage.removeItem('sms_user');
    toast.success('Logged out successfully.');
  };

  return (
    <AuthContext.Provider value={{ user, token: token as string | null, isAuthenticated: !!user, login, logout, loading: loading as boolean }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
