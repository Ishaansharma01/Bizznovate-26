import React, { useState, useEffect } from 'react';
import {
  PublicCertificateData,
  verifyCertificatePublicApi,
  downloadPublicCertificatePdf,
} from '../services/api';

interface Props {
  initialCertificateId?: string;
  onBackToApp?: () => void;
}

export const PublicCertificateVerifier: React.FC<Props> = ({ initialCertificateId, onBackToApp }) => {
  const [certIdInput, setCertIdInput] = useState(initialCertificateId || '');
  const [certData, setCertData] = useState<PublicCertificateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Extract ID from pathname if present (e.g., /verify/SY-TTC200-2026-...)
  useEffect(() => {
    let idToSearch = initialCertificateId;
    if (!idToSearch) {
      const pathParts = window.location.pathname.split('/');
      const verifyIdx = pathParts.indexOf('verify');
      if (verifyIdx !== -1 && pathParts[verifyIdx + 1]) {
        idToSearch = decodeURIComponent(pathParts[verifyIdx + 1]);
      } else {
        const params = new URLSearchParams(window.location.search);
        idToSearch = params.get('id') || undefined;
      }
    }

    if (idToSearch && idToSearch.trim()) {
      setCertIdInput(idToSearch.trim());
      handleVerify(idToSearch.trim());
    }
  }, [initialCertificateId]);

  const handleVerify = async (idToLookup: string) => {
    const trimmed = idToLookup.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid Certificate ID.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCertData(null);

    try {
      const res = await verifyCertificatePublicApi(trimmed);
      if (res.success && res.data) {
        setCertData(res.data);
      } else {
        setErrorMsg(
          res.error?.message ||
            `Certificate ID "${trimmed}" was not found in the official registry. Please check for typos and verify the code format.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected network error occurred while verifying the certificate.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!certData || !certData.has_pdf) return;
    setDownloading(true);
    const result = await downloadPublicCertificatePdf(certData.certificate_id);
    if (!result.success) {
      setErrorMsg(result.error || 'Failed to download certificate PDF.');
    }
    setDownloading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 font-sans">
      {/* Top Header & Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-800 text-3xl mb-3 shadow-inner">
          🧘
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Shailja Yoga Academy
        </h1>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-800 mt-1">
          Official Alumni Credential Verification Registry
        </p>
        <p className="text-xs text-stone-500 max-w-lg mx-auto mt-2">
          Verify the authenticity, approved training hours, and current certification status of Shailja Yoga 200-Hour TTC graduates worldwide.
        </p>

        {onBackToApp && (
          <div className="mt-4">
            <button
              onClick={onBackToApp}
              className="text-xs text-stone-600 hover:text-stone-900 font-medium inline-flex items-center space-x-1"
            >
              <span>← Return to Portal Login</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-xl shadow-md border border-stone-200 p-6 mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(certIdInput);
          }}
          className="space-y-3"
        >
          <label htmlFor="certIdInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700">
            Enter Certificate ID (Printed on Official Diploma or Credential Card)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="certIdInput"
                type="text"
                value={certIdInput}
                onChange={(e) => setCertIdInput(e.target.value)}
                placeholder="e.g. SY-TTC200-2026-A1B2C3D4"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-amber-600 font-mono"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                🔍
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !certIdInput.trim()}
              className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify Credential'}
            </button>
          </div>
          <p className="text-[11px] text-stone-400">
            Format: Standard non-sequential identifier issued by the academy (e.g. SY-TTC200-YYYY-XXXX).
          </p>
        </form>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center animate-pulse space-y-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full mx-auto"></div>
          <div className="h-5 bg-stone-200 rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-stone-100 rounded w-2/3 mx-auto"></div>
        </div>
      )}

      {/* Error / Not Found Alert */}
      {!loading && errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-700 text-2xl">
            ✕
          </div>
          <h3 className="text-base font-bold text-rose-900">Credential Not Verified</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{errorMsg}</p>
          <div className="text-[11px] text-stone-500 pt-2 border-t border-rose-200/60">
            If you believe this is in error, please contact the Shailja Yoga Academy Certification Office at verification@shailjayoga.com.
          </div>
        </div>
      )}

      {/* Verification Result Card */}
      {!loading && certData && (
        <div className="bg-white rounded-xl shadow-md border border-stone-200 overflow-hidden mb-8">
          {/* Status Header Banner */}
          <div
            className={`px-6 py-4 text-white flex items-center justify-between ${
              certData.status === 'issued'
                ? 'bg-gradient-to-r from-emerald-800 to-teal-900'
                : certData.status === 'revoked'
                ? 'bg-gradient-to-r from-rose-800 to-red-950'
                : 'bg-gradient-to-r from-amber-700 to-amber-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {certData.status === 'issued' ? '✓' : certData.status === 'revoked' ? '⚠️' : 'ℹ️'}
              </span>
              <div>
                <h3 className="font-bold text-base sm:text-lg">
                  {certData.status === 'issued'
                    ? 'Authentic Verified Credential'
                    : certData.status === 'revoked'
                    ? 'Officially Revoked Credential'
                    : 'Superseded Credential'}
                </h3>
                <p className="text-xs opacity-90">
                  {certData.status === 'issued'
                    ? 'Valid & active in the official Shailja Yoga alumni registry'
                    : certData.status === 'revoked'
                    ? 'This certificate has been revoked and is no longer valid'
                    : 'This certificate has been retired and replaced with an updated issuance'}
                </p>
              </div>
            </div>
            <span className="uppercase text-xs font-bold tracking-wider px-3 py-1 rounded-full bg-white/20 border border-white/30">
              {certData.status}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Revocation Banner */}
            {certData.status === 'revoked' && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg text-xs space-y-1">
                <div className="font-bold text-rose-900">Official Revocation Notice:</div>
                <div className="text-rose-800">
                  {certData.revocation_reason || 'Certificate has been administratively revoked by the academy directorate.'}
                </div>
                {certData.revoked_at && (
                  <div className="text-[11px] text-rose-600">
                    Revocation Date: {new Date(certData.revoked_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Superseded Banner */}
            {certData.status === 'superseded' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-2">
                <div className="font-bold text-amber-900">Credential Replacement Notice:</div>
                <div className="text-amber-800">
                  This certificate has been retired and superseded by an updated credential.
                </div>
                {certData.superseded_by && (
                  <button
                    onClick={() => {
                      setCertIdInput(certData.superseded_by!);
                      handleVerify(certData.superseded_by!);
                    }}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-900 underline hover:text-amber-950"
                  >
                    <span>View Superseding Credential ({certData.superseded_by}) →</span>
                  </button>
                )}
              </div>
            )}

            {/* Graduate Details */}
            <div className="border-b border-stone-200 pb-5">
              <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
                Graduate Name
              </span>
              <h2 className="text-2xl font-bold text-stone-900 mt-0.5">{certData.student_name}</h2>
              <div className="text-xs text-stone-600 mt-1">
                Program: <span className="font-semibold text-stone-800">{certData.program_name}</span> ({certData.program_code})
              </div>
            </div>

            {/* Credential Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="text-[10px] uppercase font-bold text-stone-500">Certificate ID</div>
                <div className="text-xs font-mono font-bold text-stone-900 truncate mt-0.5">{certData.certificate_id}</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="text-[10px] uppercase font-bold text-stone-500">Total Hours</div>
                <div className="text-xs font-bold text-amber-900 mt-0.5">{certData.total_approved_hours} hrs</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="text-[10px] uppercase font-bold text-stone-500">Completion Date</div>
                <div className="text-xs font-semibold text-stone-800 mt-0.5">{certData.completion_date}</div>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="text-[10px] uppercase font-bold text-stone-500">Issue Date</div>
                <div className="text-xs font-semibold text-stone-800 mt-0.5">{new Date(certData.issue_date).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Approved Hours Breakdown Table */}
            <div>
              <h4 className="text-xs uppercase font-bold text-stone-600 tracking-wider mb-2">
                Verified Curriculum Category Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(certData.category_hours).map(([catKey, hours]) => (
                  <div key={catKey} className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/70 text-center">
                    <div className="text-[10px] uppercase font-semibold text-amber-900 truncate">
                      {catKey.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-bold text-stone-900 mt-1">{hours.toFixed(1)} hrs</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Hash & Signatory */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-stone-500 font-medium">Authorized Signatory:</span>
                <span className="font-semibold text-stone-800">{certData.signatory_title}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-stone-500 font-medium">Cryptographic Digest:</span>
                <span className="font-mono text-[11px] text-stone-700 break-all">{certData.signature_digest}</span>
              </div>
            </div>

            {/* Actions: Download PDF */}
            {certData.status === 'issued' && certData.has_pdf && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{downloading ? 'Downloading Official PDF...' : 'Download Official Certificate PDF'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Minimization & Privacy Footer */}
      <div className="p-4 bg-stone-100 rounded-xl border border-stone-200 text-stone-500 text-[11px] text-center space-y-1">
        <p className="font-semibold text-stone-700">Official Data Minimization Guarantee</p>
        <p>
          In accordance with strict privacy principles, this public registry verifies only essential graduation credentials.
          Personal reflection journals, contact numbers, trainee emails, and internal faculty evaluation notes remain strictly private and are never disclosed.
        </p>
      </div>
    </div>
  );
};
