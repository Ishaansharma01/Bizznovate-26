import React, { useEffect, useState } from 'react';
import { Enrollment, getMyEnrollmentsApi, ProgressData, getMyProgressApi, PaceMetrics, getMyPaceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VerifiedProgressCard } from './VerifiedProgressCard';
import { PaceMonitorCard } from './PaceMonitorCard';
import { TrainingLogForm } from './TrainingLogForm';
import { TrainingLogList } from './TrainingLogList';
import { CertificateEligibilityCard } from './CertificateEligibilityCard';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [pace, setPace] = useState<PaceMetrics | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [paceLoading, setPaceLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadData = async () => {
    try {
      const [enrollRes, progRes, paceRes] = await Promise.all([
        getMyEnrollmentsApi(),
        getMyProgressApi(),
        getMyPaceApi(),
      ]);

      if (enrollRes.success && enrollRes.data) {
        setEnrollments(enrollRes.data);
      } else {
        setError(enrollRes.error?.message || 'Failed to load enrollment.');
      }

      if (progRes.success && progRes.data) {
        setProgress(progRes.data);
      }

      if (paceRes.success && paceRes.data) {
        setPace(paceRes.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgressLoading(false);
      setPaceLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleLogSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const activeEnrollment = enrollments.length > 0 ? enrollments[0] : null;

  return (
    <div>
      {/* Student Welcome Banner */}
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', color: '#166534', fontSize: '1.25rem', fontWeight: 700 }}>
          Namaste, {user?.full_name}!
        </h2>
        <p style={{ margin: 0, color: '#15803d', fontSize: '0.9rem' }}>
          Role: <span style={{ fontWeight: 600 }}>TTC Trainee</span> · 200-Hour Certification Track
        </p>
      </div>

      {/* Authoritative Verified Progress Card */}
      <VerifiedProgressCard progress={progress} loading={progressLoading} />

      {/* Progress Pace Monitor Card */}
      <PaceMonitorCard pace={pace} loading={paceLoading} onRefresh={() => setRefreshTrigger((p) => p + 1)} />

      {/* Graduation Certificate & Eligibility Status */}
      {activeEnrollment && (
        <div style={{ marginBottom: '1.5rem' }}>
          <CertificateEligibilityCard
            enrollmentId={activeEnrollment.id}
            onCertificateIssued={() => setRefreshTrigger((p) => p + 1)}
          />
        </div>
      )}

      {/* Active Enrollment Info Card */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#1c1917', fontWeight: 600 }}>
          Batch & Enrollment Information
        </h3>

        {loading ? (
          <p style={{ color: '#78716c' }}>Loading enrollment records...</p>
        ) : error ? (
          <div style={{ color: '#dc2626' }}>{error}</div>
        ) : !activeEnrollment ? (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '6px', color: '#b45309' }}>
            You are not currently enrolled in any active training program. An administrator must enroll you.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.88rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ color: '#64748b' }}>Program:</span> <strong style={{ color: '#0f172a' }}>{activeEnrollment.program_name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Batch Code:</span> <strong style={{ color: '#0f172a' }}>{activeEnrollment.program_code}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Enrolled On:</span> <strong style={{ color: '#0f172a' }}>{activeEnrollment.enrollment_date}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Target Graduation:</span> <strong style={{ color: '#0f172a' }}>{activeEnrollment.target_graduation_date}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Core Hour Logging Form */}
      {activeEnrollment && (
        <TrainingLogForm
          enrollmentId={activeEnrollment.id}
          onLogSubmitted={handleLogSubmitted}
        />
      )}

      {/* Training Log History */}
      <TrainingLogList refreshTrigger={refreshTrigger} />
    </div>
  );
};
