import React, { useEffect, useState } from 'react';
import { Enrollment, getAllEnrollmentsApi, ProgressData, getEnrollmentProgressApi, facultySignoffApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FacultyReviewQueue } from './FacultyReviewQueue';
import { VerifiedProgressCard } from './VerifiedProgressCard';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected student progress inspection
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [inspectedProgress, setInspectedProgress] = useState<ProgressData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [signoffMsg, setSignoffMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEnrollments = async () => {
    try {
      const res = await getAllEnrollmentsApi();
      if (res.success && res.data) {
        setEnrollments(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleInspectStudent = async (enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    setInspectLoading(true);
    setSignoffMsg(null);
    try {
      const res = await getEnrollmentProgressApi(enrollmentId);
      if (res.success && res.data) {
        setInspectedProgress(res.data);
      }
    } finally {
      setInspectLoading(false);
    }
  };

  const handleSignoff = async () => {
    if (!selectedEnrollmentId) return;
    setSignoffMsg(null);
    const res = await facultySignoffApi(selectedEnrollmentId);
    if (res.success) {
      setSignoffMsg({ type: 'success', text: 'Final faculty sign-off successfully recorded!' });
      handleInspectStudent(selectedEnrollmentId);
      fetchEnrollments();
    } else {
      setSignoffMsg({ type: 'error', text: res.error?.message || 'Failed to complete sign-off.' });
    }
  };

  return (
    <div>
      {/* Faculty Welcome Banner */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', color: '#1e40af', fontSize: '1.25rem', fontWeight: 700 }}>
          Namaste, {user?.full_name}!
        </h2>
        <p style={{ margin: 0, color: '#2563eb', fontSize: '0.9rem' }}>
          Role: <span style={{ fontWeight: 600 }}>Faculty Reviewer</span> · Authoritative log review, verification, and final completion sign-off
        </p>
      </div>

      {/* Review Queue Component */}
      <FacultyReviewQueue />

      {/* Student Progress Inspection & Sign-Off */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#1c1917', fontWeight: 700 }}>
          🎓 Trainee Verified Progress Inspection
        </h3>

        {loading ? (
          <p style={{ color: '#78716c' }}>Loading enrolled trainees...</p>
        ) : enrollments.length === 0 ? (
          <p style={{ color: '#78716c' }}>No students currently enrolled.</p>
        ) : (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
              Select a Trainee to Inspect Verified Progress & Sign-Off:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {enrollments.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleInspectStudent(e.id)}
                  style={{
                    backgroundColor: selectedEnrollmentId === e.id ? '#0284c7' : '#f8fafc',
                    color: selectedEnrollmentId === e.id ? '#fff' : '#0f172a',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  👤 {e.student_name} ({e.program_code})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Display inspected student progress */}
        {selectedEnrollmentId && (
          <div>
            {signoffMsg && (
              <div style={{
                backgroundColor: signoffMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${signoffMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: signoffMsg.type === 'success' ? '#166534' : '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '0.88rem'
              }}>
                {signoffMsg.text}
              </div>
            )}

            <VerifiedProgressCard progress={inspectedProgress} loading={inspectLoading} />

            {inspectedProgress && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1c1917', fontSize: '0.95rem' }}>
                    Faculty Final Sign-Off Status:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: inspectedProgress.final_faculty_signoff ? '#166534' : '#b45309' }}>
                    {inspectedProgress.final_faculty_signoff
                      ? '✓ Complete: Trainee is signed off by faculty for certification.'
                      : 'Pending: Final faculty sign-off required prior to certificate issuance.'}
                  </div>
                </div>

                {!inspectedProgress.final_faculty_signoff && (
                  <button
                    onClick={handleSignoff}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      padding: '0.55rem 1.1rem',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    Complete Final Faculty Sign-Off
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
