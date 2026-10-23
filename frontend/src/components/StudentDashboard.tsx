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
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Student Welcome Banner: Full width responsive header card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-950 flex items-center gap-2">
            <span>🙏</span>
            Namaste, {user?.full_name}!
          </h2>
          <p className="text-xs sm:text-sm text-emerald-800 mt-1">
            Role: <span className="font-semibold text-emerald-900">TTC Trainee</span> · 200-Hour Certification Track · Authoritative Server Tracking
          </p>
        </div>

        {activeEnrollment && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-white/80 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg font-semibold shadow-2xs">
              Batch: {activeEnrollment.program_code}
            </span>
            <span className="bg-white/80 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-lg font-semibold shadow-2xs">
              Target: {activeEnrollment.target_graduation_date}
            </span>
          </div>
        )}
      </div>

      {/* Main Responsive Grid Layout: Fills wide screens, stacks cleanly on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* Primary Column: Verified Progress, Pace Evaluation, and Certificate Eligibility (8 of 12 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Authoritative Verified Progress Card */}
          <VerifiedProgressCard progress={progress} loading={progressLoading} />

          {/* Progress Pace Monitor Card */}
          <PaceMonitorCard pace={pace} loading={paceLoading} onRefresh={() => setRefreshTrigger((p) => p + 1)} />

          {/* Graduation Certificate & Eligibility Status */}
          {activeEnrollment && (
            <CertificateEligibilityCard
              enrollmentId={activeEnrollment.id}
              onCertificateIssued={() => setRefreshTrigger((p) => p + 1)}
            />
          )}
        </div>

        {/* Sidebar Column: Daily Logging Action & Program Info (4 of 12 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-20">
          {/* Core Hour Logging Form */}
          {activeEnrollment && (
            <TrainingLogForm
              enrollmentId={activeEnrollment.id}
              onLogSubmitted={handleLogSubmitted}
            />
          )}

          {/* Active Enrollment Info Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <span>📋</span> Program & Cohort Details
            </h3>

            {loading ? (
              <p className="text-xs text-stone-500">Loading enrollment records...</p>
            ) : error ? (
              <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">{error}</div>
            ) : !activeEnrollment ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-xs text-amber-800">
                You are not currently enrolled in any active training program. An administrator must enroll you.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <span className="text-stone-500 text-[10px] uppercase font-semibold block">Program</span>
                  <span className="font-bold text-stone-900 truncate block mt-0.5">{activeEnrollment.program_name}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <span className="text-stone-500 text-[10px] uppercase font-semibold block">Batch Code</span>
                  <span className="font-bold text-stone-900 block mt-0.5">{activeEnrollment.program_code}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <span className="text-stone-500 text-[10px] uppercase font-semibold block">Enrolled Date</span>
                  <span className="font-semibold text-stone-800 block mt-0.5">{activeEnrollment.enrollment_date}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                  <span className="text-stone-500 text-[10px] uppercase font-semibold block">Target Graduation</span>
                  <span className="font-semibold text-stone-800 block mt-0.5">{activeEnrollment.target_graduation_date}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-width Training Log History Table at Bottom */}
      <div className="w-full pt-2">
        <TrainingLogList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};
