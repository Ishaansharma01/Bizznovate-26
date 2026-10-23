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
    <div style={{ maxWidth: '440px', margin: '2rem auto', backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2.5rem' }}>🧘</span>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.5rem 0 0.25rem', color: '#1c1917' }}>Sign In to Portal</h2>
        <p style={{ color: '#78716c', fontSize: '0.88rem', margin: 0 }}>Role-Based Access Control for Students, Faculty & Admins</p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#44403c', marginBottom: '0.4rem' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. student1@shailjayoga.com"
            required
            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.92rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#44403c', marginBottom: '0.4rem' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (default: password123)"
            required
            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.92rem', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: '#0c4a6e',
            color: '#fff',
            padding: '0.75rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background-color 0.15s ease',
          }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      {/* Quick Testing Provisioned Accounts */}
      <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px dashed #e7e5e4' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78716c', textTransform: 'uppercase', marginBottom: '0.6rem', textAlign: 'center' }}>
          One-Click Demo Accounts
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => handleQuickLogin('student1@shailjayoga.com', 'password123')}
            style={{ fontSize: '0.75rem', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
          >
            👤 Student 1 (Ananya)
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('student2@shailjayoga.com', 'password123')}
            style={{ fontSize: '0.75rem', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
          >
            👤 Student 2 (Dev)
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('faculty@shailjayoga.com', 'password123')}
            style={{ fontSize: '0.75rem', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
          >
            🎓 Faculty Reviewer
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('issuer@shailjayoga.com', 'password123')}
            style={{ fontSize: '0.75rem', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
          >
            📜 Certificate Issuer
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@shailjayoga.com', 'password123')}
            style={{ gridColumn: 'span 2', fontSize: '0.75rem', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
          >
            ⚙️ Master Administrator
          </button>
        </div>
      </div>
    </div>
  );
};
