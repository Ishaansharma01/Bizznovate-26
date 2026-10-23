import React, { useEffect, useState } from 'react';
import { Program, Enrollment, getProgramsApi, updateProgramQuotasApi, getAllEnrollmentsApi, createEnrollmentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Category Quota Form State
  const [selectedProgId, setSelectedProgId] = useState<string>('');
  const [asanaHours, setAsanaHours] = useState<string>('100');
  const [anatomyHours, setAnatomyHours] = useState<string>('30');
  const [philosophyHours, setPhilosophyHours] = useState<string>('35');
  const [teachingHours, setTeachingHours] = useState<string>('35');

  // Enrollment Form State
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollProgId, setEnrollProgId] = useState('');
  const [enrollStartDate, setEnrollStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [enrollTargetDate, setEnrollTargetDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const loadData = async () => {
    try {
      const [progRes, enrollRes] = await Promise.all([getProgramsApi(), getAllEnrollmentsApi()]);
      if (progRes.success && progRes.data) {
        setPrograms(progRes.data);
        if (progRes.data.length > 0 && !selectedProgId) {
          setSelectedProgId(progRes.data[0].id);
          setEnrollProgId(progRes.data[0].id);
        }
      }
      if (enrollRes.success && enrollRes.data) {
        setEnrollments(enrollRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgId) return;

    setMsg(null);
    const quotas = {
      asana_practice: parseFloat(asanaHours) || 0,
      anatomy: parseFloat(anatomyHours) || 0,
      yoga_philosophy: parseFloat(philosophyHours) || 0,
      practical_teaching: parseFloat(teachingHours) || 0,
    };

    const res = await updateProgramQuotasApi(selectedProgId, quotas);
    if (res.success) {
      setMsg({ type: 'success', text: 'Category distribution quotas successfully configured and saved!' });
      loadData();
    } else {
      setMsg({ type: 'error', text: res.error?.message || 'Failed to update quotas.' });
    }
  };

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId || !enrollProgId) {
      setMsg({ type: 'error', text: 'Please provide both Student ID and Program.' });
      return;
    }

    setMsg(null);
    const res = await createEnrollmentApi({
      student_id: enrollStudentId,
      program_id: enrollProgId,
      enrollment_date: enrollStartDate,
      target_graduation_date: enrollTargetDate,
      is_public_name_visible: true,
    });

    if (res.success) {
      setMsg({ type: 'success', text: 'Student successfully enrolled!' });
      setEnrollStudentId('');
      loadData();
    } else {
      setMsg({ type: 'error', text: res.error?.message || 'Failed to create enrollment.' });
    }
  };

  return (
    <div>
      {/* Admin Welcome Banner */}
      <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', color: '#6b21a8', fontSize: '1.2rem' }}>
          Administrator Workspace — {user?.full_name}
        </h2>
        <p style={{ margin: 0, color: '#7e22ce', fontSize: '0.9rem' }}>
          Configure program rules, manage canonical category quotas, and enroll trainees into 200-hour TTC batches.
        </p>
      </div>

      {msg && (
        <div style={{
          backgroundColor: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1.25rem',
          fontSize: '0.9rem'
        }}>
          {msg.text}
        </div>
      )}

      {/* Program Configuration Section */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1c1917' }}>Training Programs & Quota Configuration</h3>
        {loading ? (
          <p style={{ color: '#78716c' }}>Loading program rules...</p>
        ) : (
          <div>
            {programs.map((p) => (
              <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1.25rem', marginBottom: '1rem', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{p.name}</strong> ({p.code})
                  </div>
                  {p.category_quotas_configured ? (
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      ✓ Quotas Configured
                    </span>
                  ) : (
                    <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      ⚠️ Distribution: CONFIGURATION_REQUIRED
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  <div>Total Hours Required: <strong>{p.required_hours}h</strong></div>
                  <div>Daily Max Limit: <strong>{p.daily_max_hours}h/day</strong></div>
                  <div>Backdating Window: <strong>{p.backdating_window_hours}h</strong></div>
                  <div>Timezone: <strong>{p.timezone}</strong></div>
                </div>

                {/* Show Current Quotas if set */}
                {p.category_quotas && (
                  <div style={{ marginTop: '0.75rem', padding: '0.6rem', backgroundColor: '#fff', borderRadius: '4px', fontSize: '0.82rem', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Active Quotas:</span>{' '}
                    Asana: {p.category_quotas.asana_practice || 0}h |{' '}
                    Anatomy: {p.category_quotas.anatomy || 0}h |{' '}
                    Philosophy: {p.category_quotas.yoga_philosophy || 0}h |{' '}
                    Practical: {p.category_quotas.practical_teaching || 0}h
                  </div>
                )}
              </div>
            ))}

            {/* Quota Config Form */}
            <form onSubmit={handleUpdateQuotas} style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff' }}>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#1e293b' }}>
                Configure Category Hour Quotas (Non-invented; fully configurable per program)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Asana Practice (h)</label>
                  <input type="number" value={asanaHours} onChange={(e) => setAsanaHours(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Anatomy (h)</label>
                  <input type="number" value={anatomyHours} onChange={(e) => setAnatomyHours(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Yoga Philosophy (h)</label>
                  <input type="number" value={philosophyHours} onChange={(e) => setPhilosophyHours(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Practical Teaching (h)</label>
                  <input type="number" value={teachingHours} onChange={(e) => setTeachingHours(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Save Program Quotas
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Enrollment Management */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1c1917' }}>Trainee Enrollments</h3>

        <form onSubmit={handleCreateEnrollment} style={{ padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#1e293b' }}>Enroll Student</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Student UUID / ID</label>
              <input
                type="text"
                placeholder="Paste Student UUID"
                value={enrollStudentId}
                onChange={(e) => setEnrollStudentId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Enrollment Start Date</label>
              <input
                type="date"
                value={enrollStartDate}
                onChange={(e) => setEnrollStartDate(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Target Graduation Date</label>
              <input
                type="date"
                value={enrollTargetDate}
                onChange={(e) => setEnrollTargetDate(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
          <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            Submit Enrollment
          </button>
        </form>

        {/* Existing Enrollments Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
              <th style={{ padding: '0.6rem' }}>Student Name</th>
              <th style={{ padding: '0.6rem' }}>Student ID</th>
              <th style={{ padding: '0.6rem' }}>Program</th>
              <th style={{ padding: '0.6rem' }}>Dates (Start → Target)</th>
              <th style={{ padding: '0.6rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.6rem', fontWeight: 600, color: '#0f172a' }}>{e.student_name}</td>
                <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>{e.student_id}</td>
                <td style={{ padding: '0.6rem', color: '#0f172a' }}>{e.program_code}</td>
                <td style={{ padding: '0.6rem', color: '#334155' }}>{e.enrollment_date} → {e.target_graduation_date}</td>
                <td style={{ padding: '0.6rem' }}>
                  <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
