import React from 'react';
import { ProgressData } from '../services/api';

interface VerifiedProgressCardProps {
  progress: ProgressData | null;
  loading: boolean;
}

export const VerifiedProgressCard: React.FC<VerifiedProgressCardProps> = ({ progress, loading }) => {
  if (loading) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-500 animate-pulse shadow-xs">
        <div className="w-8 h-8 mx-auto bg-stone-200 rounded-full mb-2"></div>
        Calculating authoritative verified hours...
      </div>
    );
  }

  if (!progress) return null;

  const categories = [
    { code: 'asana_practice', label: 'Asana Practice', color: '#0284c7', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700' },
    { code: 'anatomy', label: 'Anatomy & Physiology', color: '#16a34a', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    { code: 'yoga_philosophy', label: 'Yoga Philosophy', color: '#9333ea', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    { code: 'practical_teaching', label: 'Practical Teaching', color: '#ea580c', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  ];

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>🎯</span> Verified Progress & Hours Tracker
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Authoritative Server Calculations · Minimum {progress.required_hours}h Faculty-Approved Required
          </p>
        </div>

        <div>
          {progress.final_faculty_signoff ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span>✓</span> Faculty Sign-Off Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
              Pending Final Faculty Sign-Off
            </span>
          )}
        </div>
      </div>

      {/* Main Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline text-xs sm:text-sm">
          <span className="font-semibold text-stone-800">
            Overall Certification Progress:{' '}
            <span className="text-sky-700 font-bold">{progress.approved_hours}h</span> / {progress.required_hours}h
          </span>
          <span className="font-bold text-stone-900 text-sm sm:text-base">
            {progress.completion_percentage}%
          </span>
        </div>

        <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress.completion_percentage >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-sky-500 to-blue-600'
            }`}
            style={{ width: `${Math.min(progress.completion_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics Row: 4 responsive columns across resolutions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 sm:p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Approved Hours</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">{progress.approved_hours}h</div>
          <div className="text-[11px] text-emerald-700 mt-0.5 truncate">Verified & count toward 200h</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 sm:p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Hours</div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">{progress.pending_hours}h</div>
          <div className="text-[11px] text-amber-700 mt-0.5 truncate">Under faculty review</div>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 sm:p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Remaining Hours</div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 mt-1">{progress.remaining_hours}h</div>
          <div className="text-[11px] text-stone-500 mt-0.5 truncate">To reach 200h goal</div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 sm:p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Rejected Hours</div>
          <div className="text-xl sm:text-2xl font-black text-rose-900 mt-1">{progress.rejected_hours}h</div>
          <div className="text-[11px] text-rose-700 mt-0.5 truncate">Excluded from total</div>
        </div>
      </div>

      {/* Canonical Category Breakdown: 4 responsive columns across resolutions */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-700">
            Canonical Category Distribution
          </h4>
          {!progress.category_quotas_configured ? (
            <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded border border-amber-300">
              ⚠️ Quotas: CONFIGURATION_REQUIRED
            </span>
          ) : (
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                progress.category_eligibility_status === 'SATISFIED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {progress.category_eligibility_status === 'SATISFIED'
                ? '✓ All Category Quotas Satisfied'
                : '⚠️ Category Quotas Incomplete'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((c) => {
            const completed = progress.category_totals[c.code] || 0;
            const quotaDetail = progress.category_quota_details[c.code];
            const requiredQuota = quotaDetail?.required_hours;
            const pct = requiredQuota ? Math.min(Math.round((completed / requiredQuota) * 100), 100) : null;

            return (
              <div
                key={c.code}
                className="p-3.5 bg-stone-50/70 border border-stone-200 rounded-xl space-y-2 hover:bg-white transition-colors"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-800">{c.label}</span>
                  <span className={`font-black text-sm ${c.text}`}>{completed}h</span>
                </div>

                {requiredQuota !== null && requiredQuota !== undefined ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-stone-500">
                      <span>Target: {requiredQuota}h</span>
                      <span className="font-semibold text-stone-700">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-stone-400">Hours verified (Quota pending)</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
