import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { StudentDashboard } from './components/StudentDashboard';
import { FacultyDashboard } from './components/FacultyDashboard';
import { AdminDashboard } from './components/AdminDashboard';

const MainLayout: React.FC = () => {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui' }}>
        <p style={{ color: '#78716c', fontSize: '1.1rem' }}>Loading application session...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Navbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e7e5e4', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2.2rem' }}>🧘</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1c1917', fontWeight: 700 }}>
              Shailja Yoga
            </h1>
            <p style={{ margin: '0.15rem 0 0', color: '#78716c', fontSize: '0.88rem' }}>
              200-Hour TTC Verification & Hours Logger
            </p>
          </div>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1c1917' }}>{user.full_name}</div>
              <span style={{
                backgroundColor: user.role === 'admin' ? '#f3e8ff' : user.role === 'faculty' ? '#dbeafe' : '#dcfce7',
                color: user.role === 'admin' ? '#7e22ce' : user.role === 'faculty' ? '#1e40af' : '#15803d',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main>
        {!user ? (
          <LoginForm />
        ) : user.role === 'student' ? (
          <StudentDashboard />
        ) : user.role === 'faculty' ? (
          <FacultyDashboard />
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e7e5e4', textAlign: 'center', color: '#a8a29e', fontSize: '0.82rem' }}>
        Shailja Yoga Platform · Phase 1 Complete (Authentication, Role RBAC & Program Enrollment) · Next: Phase 2
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
