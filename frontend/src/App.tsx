import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { StudentDashboard } from './components/StudentDashboard';
import { FacultyDashboard } from './components/FacultyDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicCertificateVerifier } from './components/PublicCertificateVerifier';

const MainLayout: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [view, setView] = useState<'app' | 'verify'>('app');

  useEffect(() => {
    // Check if initial path is /verify or /verify/...
    if (window.location.pathname.startsWith('/verify')) {
      setView('verify');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-stone-50 font-sans">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">🧘</div>
          <p className="text-stone-600 font-medium text-base">Loading Shailja Yoga application session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-stone-50 flex flex-col font-sans text-stone-900">
      {/* Top Navbar: Full-width responsive with crisp borders & container bounds */}
      <header className="w-full bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/95">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-3.5 flex justify-between items-center flex-wrap gap-4">
          <div
            onClick={() => setView('app')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <span className="text-3xl sm:text-4xl transition-transform group-hover:scale-105">🧘</span>
            <div>
              <h1 className="m-0 text-lg sm:text-xl md:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                Shailja Yoga
                <span className="hidden sm:inline-block text-[11px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  TTC 200
                </span>
              </h1>
              <p className="m-0 text-xs text-stone-500 font-medium">
                200-Hour TTC Verification & Practice Hours Logger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Public Verification Quick Switch Button */}
            <button
              onClick={() => setView(view === 'verify' ? 'app' : 'verify')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                view === 'verify'
                  ? 'bg-amber-100/80 text-amber-900 border-amber-300'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
              }`}
            >
              <span>{view === 'verify' ? '👤 Portal View' : '🔍 Verify Certificate'}</span>
            </button>

            {user && (
              <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-stone-200">
                <div className="text-right hidden sm:block">
                  <div className="font-semibold text-xs text-stone-900">{user.full_name}</div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'faculty'
                        ? 'bg-blue-100 text-blue-800'
                        : user.role === 'certificate_issuer'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body: Full width responsive container fitting all screen resolutions */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
        {view === 'verify' ? (
          <PublicCertificateVerifier onBackToApp={() => setView('app')} />
        ) : !user ? (
          <LoginForm />
        ) : user.role === 'student' ? (
          <StudentDashboard />
        ) : user.role === 'faculty' ? (
          <FacultyDashboard />
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Footer: Full width responsive footer */}
      <footer className="w-full bg-white border-t border-stone-200 mt-auto py-5 text-center text-xs text-stone-500">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Shailja Yoga Academy · Official 200-Hour TTC Verification Platform</span>
          <span className="text-[11px] text-stone-400">All Invariants Enforced · Non-Negotiable Graduation Rules</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
