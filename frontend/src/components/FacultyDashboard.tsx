import React, { useEffect, useState } from 'react';
import { Enrollment, getAllEnrollmentsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllEnrollmentsApi()
      .then((res) => {
        if (res.success && res.data) {
          setEnrollments(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Faculty Welcome Banner */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', color: '#1e40af', fontSize: '1.2rem' }}>
          Welcome, {user?.full_name}!
        </h2>
        <p style={{ margin: 0, color: '#2563eb', fontSize: '0.9rem' }}>
          Role: <span style={{ fontWeight: 600 }}>Faculty Reviewer</span> · Authorized to verify training hours and sign off certifications
        </p>
      </div>

      {/* Enrolled Students Overview */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#1c1917' }}>Enrolled Students Under Review</h3>
        {loading ? (
          <p style={{ color: '#78716c' }}>Loading students...</p>
        ) : enrollments.length === 0 ? (
          <p style={{ color: '#78716c' }}>No students enrolled in active programs yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '0.6rem' }}>Student Name</th>
                <th style={{ padding: '0.6rem' }}>Email</th>
                <th style={{ padding: '0.6rem' }}>Program</th>
                <th style={{ padding: '0.6rem' }}>Target Graduation</th>
                <th style={{ padding: '0.6rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.6rem', fontWeight: 600, color: '#0f172a' }}>{e.student_name}</td>
                  <td style={{ padding: '0.6rem', color: '#64748b' }}>{e.student_email}</td>
                  <td style={{ padding: '0.6rem', color: '#0f172a' }}>{e.program_code}</td>
                  <td style={{ padding: '0.6rem', color: '#0f172a' }}>{e.target_graduation_date}</td>
                  <td style={{ padding: '0.6rem' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Next Phase Indicator */}
      <div style={{ backgroundColor: '#f5f5f4', border: '1px dashed #d6d3d1', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: '#44403c' }}>Ready for Phase 3: Faculty Review Queue & Audit Trail</h4>
        <p style={{ margin: 0, color: '#78716c', fontSize: '0.9rem' }}>
          Interactive review queue, mandatory rejection justifications, and verified progress recalculations will be delivered in Phase 3.
        </p>
      </div>
    </div>
  );
};
