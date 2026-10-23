import React, { useEffect, useState } from 'react';
import { fetchHealth, HealthData } from './services/api';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((res) => {
        if (res.success && res.data) {
          setHealth(res.data);
        } else {
          setError(res.error?.message || 'Failed to connect to backend service.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Network error connecting to backend API.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '2px solid #e7e5e4', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🧘</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#1c1917', fontWeight: 700 }}>
              Shailja Yoga
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#78716c', fontSize: '1rem' }}>
              200-Hour Yoga Teacher Training Verification & Hours Logger
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Foundation Status Banner */}
        <div style={{
          backgroundColor: '#f5f5f4',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          border: '1px solid #e7e5e4'
        }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#292524' }}>
            Phase 0: System Foundation & Contracts
          </h2>
          <p style={{ margin: '0 0 1rem', color: '#57534e', fontSize: '0.95rem' }}>
            Authoritative foundation established for core hour verification, faculty review, progress monitoring, practice summaries, and tamper-evident certificate issuance.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #d6d3d1' }}>
              <div style={{ fontSize: '0.8rem', color: '#78716c', textTransform: 'uppercase' }}>Backend API</div>
              <div style={{ fontWeight: 600, color: loading ? '#f59e0b' : error ? '#ef4444' : '#10b981', marginTop: '0.25rem' }}>
                {loading ? 'Checking...' : error ? 'Degraded / Offline' : 'Operational (Healthy)'}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #d6d3d1' }}>
              <div style={{ fontSize: '0.8rem', color: '#78716c', textTransform: 'uppercase' }}>Database Engine</div>
              <div style={{ fontWeight: 600, color: '#1c1917', marginTop: '0.25rem' }}>
                {health?.database || 'SQLite / PostgreSQL'}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #d6d3d1' }}>
              <div style={{ fontSize: '0.8rem', color: '#78716c', textTransform: 'uppercase' }}>Program Timezone</div>
              <div style={{ fontWeight: 600, color: '#1c1917', marginTop: '0.25rem' }}>
                {health?.timezone || 'Asia/Kolkata'}
              </div>
            </div>
          </div>
        </div>

        {/* Canonical Categories Reference */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#1c1917', marginBottom: '0.75rem' }}>
            Canonical Training Categories (200-Hour TTC)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {[
              { code: 'asana_practice', label: 'Asana Practice', desc: 'Techniques, training and daily physical practice' },
              { code: 'anatomy', label: 'Anatomy & Physiology', desc: 'Bodily systems, mechanics and yoga biomechanics' },
              { code: 'yoga_philosophy', label: 'Yoga Philosophy & Ethics', desc: 'Tradition, yoga sutras, lifestyle and code of ethics' },
              { code: 'practical_teaching', label: 'Practical Teaching', desc: 'Methodology, cueing, adjustments and practicum' },
            ].map((cat) => (
              <div key={cat.code} style={{ padding: '0.85rem', backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, color: '#0c4a6e', fontSize: '0.95rem' }}>{cat.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>{cat.code}</div>
                <div style={{ fontSize: '0.82rem', color: '#78716c', marginTop: '0.4rem' }}>{cat.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Business Invariants Card */}
        <section style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#1c1917' }}>Core Rules & Invariants</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#44403c', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <li><strong>200 Verified Hours:</strong> Only faculty-approved hours count. Pending & rejected hours never count.</li>
            <li><strong>8-Hour Daily Limit:</strong> Maximum 8 hours per student per program calendar day across all categories combined.</li>
            <li><strong>48-Hour Backdating Window:</strong> Submissions older than 48 hours from practice date are rejected.</li>
            <li><strong>Authoritative Server:</strong> Server evaluates all eligibility, verification, and progress metrics.</li>
            <li><strong>AI Decision Support:</strong> AI summaries assist faculty but never approve logs or determine graduation.</li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e7e5e4', textAlign: 'center', color: '#a8a29e', fontSize: '0.85rem' }}>
        Shailja Yoga Platform · Phase 0 Foundation Complete · Next: Phase 1 (Auth & Enrollment)
      </footer>
    </div>
  );
};

export default App;
