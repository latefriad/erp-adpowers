import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Mail, Link2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getGasApiUrl, setGasApiUrl } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@adpowrs.com');
  const [password, setPassword] = useState('Admin@2026');
  const [gasUrl, setGasUrl] = useState(() => getGasApiUrl());
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setGasApiUrl(gasUrl);
      const user = await login(email, password);
      toast.success(`مرحباً ${user.name}`);
      navigate(user.role === 'TEAM' ? '/tasks' : user.role === 'MEDIA_BUYER' ? '/leads' : '/dashboard');
    } catch (err) {
      toast.error(err.message || 'خطأ في تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="w-full max-w-md card p-7 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
            A
          </div>
          <h1 className="text-2xl font-extrabold">Adpowrs Digital ERP</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Google Sheets + Apps Script Agency Operating System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field ps-9"
                placeholder="admin@adpowrs.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field ps-9"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowApiConfig((v) => !v)}
            className="text-xs text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{gasUrl ? 'Google Apps Script URL متصل ✓' : 'ربط رابط Google Apps Script (أو اتركه فارغاً للتجربة)'}</span>
          </button>

          {showApiConfig && (
            <div>
              <input
                type="url"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="input-field text-xs"
                dir="ltr"
              />
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? '...' : 'تسجيل الدخول / Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
