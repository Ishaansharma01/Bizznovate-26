import React, { useEffect, useState } from 'react';
import {
  Enrollment,
  getAllEnrollmentsApi,
  ProgressData,
  getEnrollmentProgressApi,
  facultySignoffApi,
  PaceMetrics,
  getEnrollmentPaceApi,
  evaluatePaceApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FacultyReviewQueue } from './FacultyReviewQueue';
import { VerifiedProgressCard } from './VerifiedProgressCard';
import { PaceMonitorCard } from './PaceMonitorCard';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected student progress & pace inspection
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [inspectedProgress, setInspectedProgress] = useState<ProgressData | null>(null);
  const [inspectedPace, setInspectedPace] = useState<PaceMetrics | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
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
      const [progRes, paceRes] = await Promise.all([
        getEnrollmentProgressApi(enrollmentId),
        getEnrollmentPaceApi(enrollmentId),
      ]);
      if (progRes.success && progRes.data) {
        setInspectedProgress(progRes.data);
      }
      if (paceRes.success && paceRes.data) {
        setInspectedPace(paceRes.data);
      }
    } finally {
      setInspectLoading(false);
    }
  };

  const handleTriggerPaceEvaluation = async () => {
    if (!selectedEnrollmentId) return;
    setEvalLoading(true);
    setSignoffMsg(null);
    try {
      const res = await evaluatePaceApi(selectedEnrollmentId);
      if (res.success && res.data) {
        setInspectedPace(res.data);
        const alertText = res.data.alert_created
          ? 'Pace evaluated: New shortfall warning alert created and dispatched to trainee!'
          : 'Pace evaluated: Trainee is either on track or an active alert already exists.';
        setSignoffMsg({ type: 'success', text: alertText });
      } else {
        setSignoffMsg({ type: 'error', text: res.error?.message || 'Failed to evaluate pace.' });
      }
    } finally {
      setEvalLoading(false);
    }
  };

  const handleSignoff = async () => {
    if (!selectedEnrollmentId) return;
    setSignoffMsg(null);
    const res = await facultySignoffApi(selectedEnrollmentId);
    if (res.success) {
      setSignoffMsg({ type: 'success', text: 'Final faculty sign-off successfully recorded in audit log!' });
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
          Role: <span style={{ fontWeight: 600 }}>Faculty Reviewer</span> · Authoritative log review, progress verification & pace shortfall monitoring
        </p>
      </div>

      {/* Review Queue Component */}
      <FacultyReviewQueue />

      {/* Student Progress & Pace Inspection */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#1c1917', fontWeight: 700 }}>
          🎓 Trainee Verified Progress & Schedule Pace Inspection
        </h3>

        {loading ? (
          <p style={{ color: '#78716c' }}>Loading enrolled trainees...</p>
        ) : enrollments.length === 0 ? (
          <p style={{ color: '#78716c' }}>No students currently enrolled.</p>
        ) : (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
              Select a Trainee to Inspect Verified Progress, Pace & Sign-Off:
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

        {/* Display inspected student progress & pace */}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
              <button
                onClick={handleTriggerPaceEvaluation}
                disabled={evalLoading}
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: evalLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {evalLoading ? 'Evaluating Pace...' : '⚡ Trigger Trainee Pace Check & Alert'}
              </button>
            </div>

            <PaceMonitorCard pace={inspectedPace} loading={inspectLoading} />

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
