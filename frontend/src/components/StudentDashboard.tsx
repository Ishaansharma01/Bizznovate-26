import React, { useEffect, useState } from 'react';
import { Enrollment, getMyEnrollmentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyEnrollmentsApi()
      .then((res) => {
        if (res.success && res.data) {
          setEnrollments(res.data);
        } else {
          setError(res.error?.message || 'Failed to load enrollment.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Student Welcome Banner */}
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', color: '#166534', fontSize: '1.2rem' }}>
          Welcome, {user?.full_name}!
        </h2>
        <p style={{ margin: 0, color: '#15803d', fontSize: '0.9rem' }}>
          Role: <span style={{ fontWeight: 600 }}>Student Trainee</span> · Authenticated under secure server session
        </p>
      </div>

      {/* Enrollment Card */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1c1917' }}>My Active Program Enrollment</h3>

        {loading ? (
          <p style={{ color: '#78716c' }}>Loading enrollment records...</p>
        ) : error ? (
          <div style={{ color: '#dc2626' }}>{error}</div>
        ) : enrollments.length === 0 ? (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '6px', color: '#b45309' }}>
            You are not currently enrolled in any active training program. An administrator must enroll you.
          </div>
        ) : (
          enrollments.map((e) => (
            <div key={e.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1.25rem', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{e.program_name}</span>
                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {e.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Program Code:</span> <strong style={{ color: '#0f172a' }}>{e.program_code}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Enrollment Date:</span> <strong style={{ color: '#0f172a' }}>{e.enrollment_date}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Target Graduation:</span> <strong style={{ color: '#0f172a' }}>{e.target_graduation_date}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Public Name Visible:</span> <strong style={{ color: '#0f172a' }}>{e.is_public_name_visible ? 'Yes' : 'No'}</strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Next Phase Indicator */}
      <div style={{ backgroundColor: '#f5f5f4', border: '1px dashed #d6d3d1', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: '#44403c' }}>Ready for Phase 2: Core Hour Verification Engine</h4>
        <p style={{ margin: 0, color: '#78716c', fontSize: '0.9rem' }}>
          Daily training log submission with 8h daily limit across categories, 48h backdating validation, and reflection journals will be unlocked in Phase 2.
        </p>
      </div>
    </div>
  );
};
