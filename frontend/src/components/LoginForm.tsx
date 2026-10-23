import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginForm: React.FC = () => {
  const { login, signup, loading, error, clearError } = useAuth();
  
  // Tab mode: 'signin' | 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up State
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Show staff/demo helper toggle
  const [showDemoLogins, setShowDemoLogins] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    clearError();
    setValidationError(null);
    await login(loginEmail, loginPassword);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setValidationError('Please enter your full legal name (minimum 2 characters).');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setValidationError('Passwords do not match. Please re-enter.');
      return;
    }

    await signup(fullName.trim(), signupEmail.trim(), signupPassword);
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setLoginEmail(demoEmail);
    setLoginPassword(demoPass);
    clearError();
    setValidationError(null);
    login(demoEmail, demoPass);
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden my-6 sm:my-10">
      {/* Header Tabs: Sign In vs Sign Up (New Student) */}
      <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-50/70 text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            clearError();
            setValidationError(null);
          }}
          className={`py-3.5 sm:py-4 px-4 text-center cursor-pointer transition-all border-b-2 ${
            mode === 'signin'
              ? 'border-sky-800 bg-white text-sky-950 font-bold shadow-xs'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
          }`}
        >
          🔑 Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            clearError();
            setValidationError(null);
          }}
          className={`py-3.5 sm:py-4 px-4 text-center cursor-pointer transition-all border-b-2 ${
            mode === 'signup'
              ? 'border-emerald-600 bg-white text-emerald-950 font-bold shadow-xs'
              : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/60'
          }`}
        >
          ✨ Sign Up (New Student)
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Title & Description */}
        <div className="text-center space-y-1">
          <span className="text-4xl">{mode === 'signin' ? '🧘' : '🎓'}</span>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            {mode === 'signin' ? 'Sign In to Portal' : 'New Student Sign Up'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            {mode === 'signin'
              ? 'Access your 200-Hour TTC hours logger, pace monitor & reviews'
              : 'Create your trainee account & automatically enroll in the 200-Hour TTC program'}
          </p>
        </div>

        {/* Error Alerts */}
        {(error || validationError) && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between">
            <span><strong>Notice:</strong> {error || validationError}</span>
            <button
              onClick={() => {
                clearError();
                setValidationError(null);
              }}
              className="text-xs underline font-bold cursor-pointer ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===================== MODE: SIGN IN ===================== */}
        {mode === 'signin' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
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
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
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

            {/* Switch to Sign Up Prompt */}
            <div className="pt-3 text-center text-xs text-stone-600 border-t border-stone-100">
              New student joining the academy?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearError();
                  setValidationError(null);
                }}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                Sign Up as New Student →
              </button>
            </div>
          </form>
        )}

        {/* ===================== MODE: SIGN UP (NEW STUDENT) ===================== */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name (Printed on Certificate) *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                required
                className="w-full p-2.5 sm:p-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Student Email Address *
              </label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="e.g. priya@example.com"
                required
                className="w-full p-2.5 sm:p-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Create Password *
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full p-2.5 sm:p-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full p-2.5 sm:p-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Instant Program Enrollment Guarantee Badge */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>✓</span> Automatic Program Enrollment Included:
              </div>
              <p className="text-[11px] text-emerald-800">
                You will be enrolled into the <strong>200-Hour TTC Certification Track (Batch: TTC-200-2026)</strong> and can start logging practice sessions immediately.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering & Enrolling...' : 'Sign Up as New Student'}
            </button>

            {/* Switch to Sign In Prompt */}
            <div className="pt-3 text-center text-xs text-stone-600 border-t border-stone-100">
              Already enrolled with an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  clearError();
                  setValidationError(null);
                }}
                className="text-sky-700 hover:text-sky-900 font-bold underline cursor-pointer"
              >
                Sign In to Existing Account →
              </button>
            </div>
          </form>
        )}

        {/* Collapsible Quick Test Helper (Discreet dropdown for testing staff & roles) */}
        <div className="pt-4 border-t border-dashed border-stone-200 text-center">
          <button
            type="button"
            onClick={() => setShowDemoLogins(!showDemoLogins)}
            className="text-[11px] font-semibold text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            {showDemoLogins ? '▲ Hide Quick Demo Staff Accounts' : '▼ Need Quick Staff/Faculty Demo Logins?'}
          </button>

          {showDemoLogins && (
            <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="text-[10px] uppercase font-bold text-stone-400">
                Click any role to auto-sign in:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('faculty@shailjayoga.com', 'password123')}
                  className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 font-medium cursor-pointer text-center text-[11px]"
                >
                  🎓 Faculty Reviewer
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('issuer@shailjayoga.com', 'password123')}
                  className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 font-medium cursor-pointer text-center text-[11px]"
                >
                  📜 Certificate Issuer
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('student1@shailjayoga.com', 'password123')}
                  className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 font-medium cursor-pointer text-center text-[11px]"
                >
                  👤 Student 1 (Ananya)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('student2@shailjayoga.com', 'password123')}
                  className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 font-medium cursor-pointer text-center text-[11px]"
                >
                  👤 Student 2 (Dev - Grad)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@shailjayoga.com', 'password123')}
                  className="col-span-2 p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 font-medium cursor-pointer text-center text-[11px]"
                >
                  ⚙️ Master Administrator
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
