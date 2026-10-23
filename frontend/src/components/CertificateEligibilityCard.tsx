import React, { useState, useEffect } from 'react';
import {
  CertificateEligibility,
  CertificateRecord,
  getCertificateEligibilityApi,
  issueCertificateApi,
  getEnrollmentCertificatesApi,
  revokeCertificateApi,
  supersedeCertificateApi,
  downloadCertificatePdf,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  enrollmentId: string;
  onCertificateIssued?: () => void;
}

export const CertificateEligibilityCard: React.FC<Props> = ({ enrollmentId, onCertificateIssued }) => {
  const { user } = useAuth();
  const [eligibility, setEligibility] = useState<CertificateEligibility | null>(null);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states for Revoke & Supersede
  const [activeModal, setActiveModal] = useState<'revoke' | 'supersede' | null>(null);
  const [targetCertId, setTargetCertId] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const canManageCertificates = user?.role === 'admin' || user?.role === 'certificate_issuer';

  const fetchData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [eligRes, certsRes] = await Promise.all([
        getCertificateEligibilityApi(enrollmentId),
        getEnrollmentCertificatesApi(enrollmentId),
      ]);

      if (eligRes.success && eligRes.data) {
        setEligibility(eligRes.data);
      } else {
        setActionError(eligRes.error?.message || 'Could not load certification eligibility.');
      }

      if (certsRes.success && certsRes.data) {
        setCertificates(certsRes.data);
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error fetching certificate status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enrollmentId) {
      fetchData();
    }
  }, [enrollmentId]);

  const handleIssue = async () => {
    if (!canManageCertificates) return;
    setIssuing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await issueCertificateApi(enrollmentId);
      if (res.success && res.data) {
        setActionSuccess(`Certificate ${res.data.certificate_id} issued successfully!`);
        fetchData();
        if (onCertificateIssued) onCertificateIssued();
      } else {
        const msg = res.error?.message || 'Certificate issuance failed.';
        setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error issuing certificate.');
    } finally {
      setIssuing(false);
    }
  };

  const handleDownload = async (certId: string) => {
    setDownloading(certId);
    setActionError(null);
    const result = await downloadCertificatePdf(certId);
    if (!result.success) {
      setActionError(result.error || 'Failed to download certificate PDF.');
    }
    setDownloading(null);
  };

  const handleOpenModal = (action: 'revoke' | 'supersede', certId: string) => {
    setActiveModal(action);
    setTargetCertId(certId);
    setReasonInput('');
    setActionError(null);
  };

  const handleModalSubmit = async () => {
    if (!targetCertId || !reasonInput.trim()) return;
    setModalSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (activeModal === 'revoke') {
        const res = await revokeCertificateApi(targetCertId, reasonInput.trim());
        if (res.success) {
          setActionSuccess(`Certificate ${targetCertId} has been officially revoked.`);
          setActiveModal(null);
          fetchData();
        } else {
          setActionError(res.error?.message || 'Revocation failed.');
        }
      } else if (activeModal === 'supersede') {
        const res = await supersedeCertificateApi(targetCertId, reasonInput.trim());
        if (res.success && res.data) {
          setActionSuccess(`New superseding certificate ${res.data.certificate_id} issued successfully!`);
          setActiveModal(null);
          fetchData();
        } else {
          setActionError(res.error?.message || 'Superseding issuance failed.');
        }
      }
    } catch (err: any) {
      setActionError(err.message || 'Error executing lifecycle action.');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-stone-100 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-stone-100 rounded w-1/2"></div>
      </div>
    );
  }

  const activeCertificate = certificates.find((c) => c.status === 'issued');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-amber-900 to-amber-950 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-800/60 rounded-lg border border-amber-700/50">
            <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-amber-50">Graduation & Certificate Status</h3>
            <p className="text-xs text-amber-200/80">Authoritative 200-Hour TTC Certification & Verification</p>
          </div>
        </div>
        {activeCertificate ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            ✓ Certificate Active
          </span>
        ) : eligibility?.is_eligible ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
            ★ Eligible for Graduation
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-stone-700/50 text-stone-300">
            In Progress
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Success/Error Alerts */}
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">Dismiss</button>
          </div>
        )}
        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 text-xs">Dismiss</button>
          </div>
        )}

        {/* ACTIVE CERTIFICATE SHOWCASE */}
        {activeCertificate && (
          <div className="p-5 bg-gradient-to-br from-amber-50 to-stone-50 border border-amber-200/80 rounded-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-800 font-semibold">Official Credential</span>
                <h4 className="text-lg font-bold text-stone-900">{activeCertificate.certificate_id}</h4>
                <p className="text-xs text-stone-600">
                  Completed: <span className="font-medium text-stone-800">{activeCertificate.completion_date}</span> | 
                  Issued: <span className="font-medium text-stone-800">{new Date(activeCertificate.issue_date).toLocaleDateString()}</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(activeCertificate.certificate_id)}
                  disabled={downloading === activeCertificate.certificate_id}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{downloading === activeCertificate.certificate_id ? 'Downloading...' : 'Download Official PDF'}</span>
                </button>
                <a
                  href={`/verify/${activeCertificate.certificate_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Public Verifier ↗
                </a>
              </div>
            </div>

            {/* Approved Hours Breakdown Pill Group */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-center">
                <div className="text-[10px] uppercase text-stone-500 font-semibold">Total Verified</div>
                <div className="text-sm font-bold text-amber-900">{activeCertificate.total_approved_hours} hrs</div>
              </div>
              {Object.entries(activeCertificate.category_hours).map(([cat, hrs]) => (
                <div key={cat} className="bg-white p-2.5 rounded-lg border border-stone-200 text-center">
                  <div className="text-[10px] uppercase text-stone-500 font-semibold truncate">{cat.replace('_', ' ')}</div>
                  <div className="text-sm font-bold text-stone-800">{hrs.toFixed(1)} hrs</div>
                </div>
              ))}
            </div>

            {/* Admin/Issuer Lifecycle Actions */}
            {canManageCertificates && (
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenModal('supersede', activeCertificate.certificate_id)}
                  className="px-3 py-1.5 text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-100/60 border border-amber-300 rounded-md font-medium"
                >
                  Correct / Supersede
                </button>
                <button
                  onClick={() => handleOpenModal('revoke', activeCertificate.certificate_id)}
                  className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-300 rounded-md font-medium"
                >
                  Revoke Certificate
                </button>
              </div>
            )}
          </div>
        )}

        {/* ELIGIBILITY CRITERIA CHECKLIST */}
        {eligibility && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-semibold text-stone-500 tracking-wider">
              Graduation Certification Invariants (6 Mandatory Checks)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Required Hours */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-start space-x-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  eligibility.criteria.hours_satisfied ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {eligibility.criteria.hours_satisfied ? '✓' : '✗'}
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-stone-800">1. Approved Hours Threshold</div>
                  <div className="text-stone-600">
                    {eligibility.criteria.hours_completed} of {eligibility.criteria.hours_required} hrs completed
                  </div>
                </div>
              </div>

              {/* 2. Category Quotas */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-start space-x-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  eligibility.criteria.category_quotas_satisfied ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {eligibility.criteria.category_quotas_satisfied ? '✓' : '✗'}
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-stone-800">2. Category Distribution Rules</div>
                  <div className="text-stone-600">
                    Status: <span className="font-medium">{eligibility.criteria.category_eligibility_status}</span>
                  </div>
                </div>
              </div>

              {/* 3. Unresolved Logs */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-start space-x-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  !eligibility.criteria.has_unresolved_logs ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {!eligibility.criteria.has_unresolved_logs ? '✓' : '✗'}
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-stone-800">3. Log Review Queue</div>
                  <div className="text-stone-600">
                    {eligibility.criteria.pending_logs_count} pending or correction logs
                  </div>
                </div>
              </div>

              {/* 4. Faculty Sign-Off */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-start space-x-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  eligibility.criteria.faculty_signoff_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {eligibility.criteria.faculty_signoff_completed ? '✓' : '✗'}
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-stone-800">4. Mandatory Faculty Final Sign-Off</div>
                  <div className="text-stone-600">
                    {eligibility.criteria.faculty_signoff_completed ? 'Completed' : 'Pending faculty review'}
                  </div>
                </div>
              </div>

              {/* 5. Student Status */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-start space-x-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  eligibility.criteria.student_is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {eligibility.criteria.student_is_active ? '✓' : '✗'}
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-stone-800">5. Student Account Status</div>
                  <div className="text-stone-600">
                    {eligibility.criteria.student_is_active ? 'Active & Good Standing' : 'Inactive'}
                  </div>
                </div>
              </div>

              {/* 6. Active Certificate Invariant */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-start space-x-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  !eligibility.criteria.has_active_certificate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {!eligibility.criteria.has_active_certificate ? '✓' : 'ℹ'}
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-stone-800">6. Duplicate Issuance Protection</div>
                  <div className="text-stone-600">
                    {eligibility.criteria.has_active_certificate ? 'Already issued' : 'No prior active certificate'}
                  </div>
                </div>
              </div>
            </div>

            {/* Ineligibility Reasons Banner */}
            {!eligibility.is_eligible && eligibility.reasons.length > 0 && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5">
                <div className="font-semibold text-amber-900 flex items-center space-x-1.5">
                  <svg className="w-4 h-4 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Criteria Pending Fulfillment:</span>
                </div>
                <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1">
                  {eligibility.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Admin/Issuer Issuance Action */}
            {canManageCertificates && !activeCertificate && (
              <div className="pt-2 flex items-center justify-end">
                <button
                  onClick={handleIssue}
                  disabled={!eligibility.is_eligible || issuing}
                  className={`px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center space-x-2 ${
                    eligibility.is_eligible && !issuing
                      ? 'bg-amber-700 hover:bg-amber-800 text-white cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{issuing ? 'Generating Verifiable Certificate...' : 'Issue Official Certificate'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* HISTORICAL / SUPERSEDED CERTIFICATES */}
        {certificates.filter((c) => c.status !== 'issued').length > 0 && (
          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-xs uppercase font-semibold text-stone-500 tracking-wider mb-2">
              Certificate Lifecycle History
            </h4>
            <div className="space-y-2">
              {certificates
                .filter((c) => c.status !== 'issued')
                .map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-stone-800">{cert.certificate_id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            cert.status === 'revoked'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {cert.status}
                        </span>
                      </div>
                      <div className="text-stone-500 text-[11px] mt-0.5">
                        Issued: {new Date(cert.issue_date).toLocaleDateString()}
                        {cert.revocation_reason && ` | Reason: ${cert.revocation_reason}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(cert.certificate_id)}
                      className="text-amber-800 hover:text-amber-900 font-medium"
                    >
                      Download Archived PDF
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Revoke / Supersede Reason Dialog */}
      {activeModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h4 className="text-base font-bold text-stone-900">
              {activeModal === 'revoke' ? 'Revoke Active Certificate' : 'Issue Superseding Certificate'}
            </h4>
            <p className="text-xs text-stone-600">
              {activeModal === 'revoke'
                ? 'Revoking will permanently invalidate the credential in public verification. An immutable audit record will be preserved.'
                : 'Superseding will retire the current credential and issue a new verifiable certificate with updated details.'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mandatory Detailed Reason (min 5 characters) *
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder={
                  activeModal === 'revoke'
                    ? 'State official administrative reason for revocation...'
                    : 'State reason for correction/superseding (e.g. legal name amendment)...'
                }
                rows={3}
                className="w-full text-xs p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={reasonInput.trim().length < 5 || modalSubmitting}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${
                  activeModal === 'revoke'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-700 hover:bg-amber-800'
                } disabled:opacity-50`}
              >
                {modalSubmitting ? 'Processing...' : activeModal === 'revoke' ? 'Confirm Revocation' : 'Issue Superseding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
