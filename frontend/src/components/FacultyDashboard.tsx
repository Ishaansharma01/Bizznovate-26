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
import { CertificateEligibilityCard } from './CertificateEligibilityCard';

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
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Faculty Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100/70 border border-blue-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-blue-950 flex items-center gap-2">
            <span>🎓</span>
            Namaste, {user?.full_name}!
          </h2>
          <p className="text-xs sm:text-sm text-blue-800 mt-1">
            Role: <span className="font-semibold text-blue-900">Faculty Reviewer</span> · Authoritative log review, progress verification & pace shortfall monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-white/80 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs">
            Enrolled Trainees: {enrollments.length}
          </span>
        </div>
      </div>

      {/* Review Queue Component: Full Width */}
      <FacultyReviewQueue />

      {/* Student Progress & Pace Inspection: Full Width */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <span>🔍</span> Trainee Verified Progress & Schedule Pace Inspection
        </h3>

        {loading ? (
          <p className="text-xs text-stone-500">Loading enrolled trainees...</p>
        ) : enrollments.length === 0 ? (
          <p className="text-xs text-stone-500">No students currently enrolled.</p>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              Select Trainee to Inspect Verified Progress, Pace & Sign-Off:
            </label>
            <div className="flex flex-wrap gap-2">
              {enrollments.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleInspectStudent(e.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                    selectedEnrollmentId === e.id
                      ? 'bg-sky-700 text-white border-sky-800'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                  }`}
                >
                  👤 {e.student_name} ({e.program_code})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Display inspected student progress & pace */}
        {selectedEnrollmentId && (
          <div className="space-y-6 pt-2 border-t border-stone-100">
            {signoffMsg && (
              <div
                className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
                  signoffMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>{signoffMsg.text}</span>
                <button
                  onClick={() => setSignoffMsg(null)}
                  className="font-bold underline text-xs cursor-pointer ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            <VerifiedProgressCard progress={inspectedProgress} loading={inspectLoading} />

            <div className="flex justify-end">
              <button
                onClick={handleTriggerPaceEvaluation}
                disabled={evalLoading}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {evalLoading ? 'Evaluating Pace...' : '⚡ Trigger Trainee Pace Check & Alert'}
              </button>
            </div>

            <PaceMonitorCard pace={inspectedPace} loading={inspectLoading} />

            {/* Certification Eligibility and Issuance Card */}
            <div>
              <CertificateEligibilityCard
                enrollmentId={selectedEnrollmentId}
                onCertificateIssued={() => handleInspectStudent(selectedEnrollmentId)}
              />
            </div>

            {inspectedProgress && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-stone-900 text-sm">
                    Faculty Final Sign-Off Status:
                  </div>
                  <div className={`mt-0.5 font-medium ${inspectedProgress.final_faculty_signoff ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {inspectedProgress.final_faculty_signoff
                      ? '✓ Complete: Trainee is signed off by faculty for certification.'
                      : 'Pending: Final faculty sign-off required prior to certificate issuance.'}
                  </div>
                </div>

                {!inspectedProgress.final_faculty_signoff && (
                  <button
                    onClick={handleSignoff}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
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
