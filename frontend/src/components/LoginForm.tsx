import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginForm: React.FC = () => {
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    clearError();
    login(demoEmail, demoPass);
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6 my-6 sm:my-10">
      <div className="text-center space-y-1">
        <span className="text-4xl">🧘</span>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Sign In to Portal</h2>
        <p className="text-xs sm:text-sm text-stone-500">Role-Based Access Control for Students, Faculty & Admins</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs sm:text-sm flex items-center justify-between">
          <span><strong>Error:</strong> {error}</span>
          <button onClick={clearError} className="text-xs underline font-bold cursor-pointer ml-2">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. student1@shailjayoga.com"
            required
            className="w-full p-2.5 sm:p-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (default: password123)"
            required
            className="w-full p-2.5 sm:p-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-sky-900 hover:bg-sky-950 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      {/* Quick Testing Provisioned Accounts */}
      <div className="pt-4 border-t border-dashed border-stone-200 space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 text-center">
          One-Click Demo Accounts
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickLogin('student1@shailjayoga.com', 'password123')}
            className="p-2 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold cursor-pointer transition-colors text-center"
          >
            👤 Student 1 (Ananya)
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('student2@shailjayoga.com', 'password123')}
            className="p-2 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold cursor-pointer transition-colors text-center"
          >
            👤 Student 2 (Dev)
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('faculty@shailjayoga.com', 'password123')}
            className="p-2 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold cursor-pointer transition-colors text-center"
          >
            🎓 Faculty Reviewer
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('issuer@shailjayoga.com', 'password123')}
            className="p-2 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold cursor-pointer transition-colors text-center"
          >
            📜 Certificate Issuer
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@shailjayoga.com', 'password123')}
            className="col-span-2 p-2 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold cursor-pointer transition-colors text-center"
          >
            ⚙️ Master Administrator
          </button>
        </div>
      </div>
    </div>
  );
};
