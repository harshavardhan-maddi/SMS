import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Shield, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Principal');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    try {
      await login(email, password, role, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert('Please contact the IT Administrator to reset your password.');
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-brand-dark">
      <style>{`
        .skeuo-panel {
          background: linear-gradient(135deg, #2b3036 0%, #1a1e22 100%);
          border: 1px solid #3c434b;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            inset 0 -1px 0 rgba(0, 0, 0, 0.4);
          border-radius: 28px;
          position: relative;
        }

        .skeuo-title-box {
          background: #0f1214;
          border: 1px solid #1c2024;
          box-shadow: inset 0 3px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05);
          border-radius: 18px;
          padding: 20px;
        }

        .skeuo-input {
          background: #0e1012 !important;
          color: #f1f5f9 !important;
          border: 1px solid #23272d !important;
          box-shadow: 
            inset 0 3px 6px rgba(0, 0, 0, 0.7),
            0 1px 0 rgba(255, 255, 255, 0.05) !important;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .skeuo-input:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 
            inset 0 3px 6px rgba(0, 0, 0, 0.7),
            0 0 10px rgba(139, 92, 246, 0.3) !important;
        }

        .skeuo-select {
          background: linear-gradient(to bottom, #2d3339 0%, #1d2125 100%) !important;
          color: #f1f5f9 !important;
          border: 1px solid #3b424b !important;
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.1) !important;
          border-radius: 12px;
          cursor: pointer;
          appearance: none;
        }

        .skeuo-btn {
          background: linear-gradient(to bottom, #8b5cf6 0%, #6d28d9 100%) !important;
          border: 1px solid #5b21b6 !important;
          border-bottom: 4px solid #3b0764 !important;
          box-shadow: 
            0 6px 12px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.35) !important;
          border-radius: 14px;
          color: white !important;
          font-weight: 800 !important;
          transition: all 0.1s ease;
          cursor: pointer;
        }

        .skeuo-btn:hover {
          background: linear-gradient(to bottom, #9d70fa 0%, #7c3aed 100%) !important;
        }

        .skeuo-btn:active {
          transform: translateY(3px) !important;
          border-bottom-width: 1px !important;
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.2) !important;
        }

        .skeuo-led {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 
            0 0 10px #10b981,
            inset 0 1px 1px rgba(255,255,255,0.5);
          animation: pulse-led 2s infinite;
        }

        @keyframes pulse-led {
          0% { opacity: 0.6; box-shadow: 0 0 4px #10b981; }
          50% { opacity: 1; box-shadow: 0 0 12px #10b981; }
          100% { opacity: 0.6; box-shadow: 0 0 4px #10b981; }
        }

        .skeuo-panel-screws {
          position: absolute;
          width: 10px;
          height: 10px;
          background: radial-gradient(circle at 30% 30%, #9ca3af 0%, #4b5563 100%);
          border-radius: 50%;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.6);
        }
        .skeuo-panel-screws::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 1px;
          right: 1px;
          height: 1px;
          background: #374151;
          transform: rotate(45deg);
        }

        .screw-tl { top: 12px; left: 12px; }
        .screw-tr { top: 12px; right: 12px; }
        .screw-bl { bottom: 12px; left: 12px; }
        .screw-br { bottom: 12px; right: 12px; }

        .skeuo-credentials-plate {
          background: #111417;
          border: 1px solid #202429;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05);
          border-radius: 16px;
        }
      `}</style>

      {/* Outer panel shadows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />

      {/* Tactile console panel */}
      <div className="skeuo-panel w-full max-w-[420px] p-9 mx-4 border">
        {/* Screws */}
        <div className="skeuo-panel-screws screw-tl" />
        <div className="skeuo-panel-screws screw-tr" />
        <div className="skeuo-panel-screws screw-bl" />
        <div className="skeuo-panel-screws screw-br" />

        {/* LCD Panel Display */}
        <div className="skeuo-title-box text-center mb-7 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-brand-purple shadow-inner mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-brand-purple tracking-widest uppercase">COLLEGE SMS</h1>
          
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="skeuo-led" />
            <span className="text-[9px] text-emerald-500 font-bold tracking-widest uppercase">SYS ONLINE</span>
          </div>
        </div>

        {/* Console Controls Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role selector dial */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Select Portal Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="skeuo-select w-full pl-10 pr-4 py-3 text-xs font-bold outline-hidden focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 transition-all appearance-none cursor-pointer"
              >
                <option value="Principal">Principal</option>
                <option value="HOD">HOD</option>
                <option value="Computer Dean">Computer Dean</option>
                <option value="Hardware Technician">Hardware Technician</option>
              </select>
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
          </div>

          {/* Email input field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="principal@sms.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="skeuo-input w-full pl-10 pr-4 py-3 text-xs outline-hidden transition-all"
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Password</label>
              <a
                href="#"
                onClick={handleForgotPassword}
                className="text-[9px] font-extrabold text-brand-purple hover:underline uppercase tracking-wider"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="skeuo-input w-full pl-10 pr-10 py-3 text-xs outline-hidden transition-all"
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-hidden"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me check */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-sm border-slate-700 bg-slate-900 text-brand-purple focus:ring-brand-purple"
            />
            <label htmlFor="remember" className="ml-2 text-[10px] font-extrabold text-slate-400 cursor-pointer uppercase tracking-wider">
              Remember Me
            </label>
          </div>

          {/* Sign In push button switch */}
          <button
            type="submit"
            disabled={submitting}
            className="skeuo-btn w-full py-3.5 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Demo Credentials Panel */}
        <div className="skeuo-credentials-plate mt-6 p-4 text-[10px] text-slate-400 font-semibold space-y-1">
          <p className="font-bold text-slate-300 uppercase tracking-wide text-[9px] border-b border-slate-800 pb-1.5 mb-2">Demo Logins (Password is 'password'):</p>
          <p>• Principal: <span className="font-bold text-slate-300">principal@sms.edu</span></p>
          <p>• HOD (CSE): <span className="font-bold text-slate-300">hod.cse@sms.edu</span></p>
          <p>• Computer Dean: <span className="font-bold text-slate-300">dean@sms.edu</span></p>
          <p>• Hardware Technician: <span className="font-bold text-slate-300">tech@sms.edu</span></p>
        </div>
      </div>
    </div>
  );
};
