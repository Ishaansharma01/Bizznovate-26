import React from 'react';
import { ProgressData } from '../services/api';

interface VerifiedProgressCardProps {
  progress: ProgressData | null;
  loading: boolean;
}

export const VerifiedProgressCard: React.FC<VerifiedProgressCardProps> = ({ progress, loading }) => {
  if (loading) {
    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center', color: '#78716c' }}>
        Calculating verified hours...
      </div>
    );
  }

  if (!progress) return null;

  const categories = [
    { code: 'asana_practice', label: 'Asana Practice', color: '#0284c7' },
    { code: 'anatomy', label: 'Anatomy & Physiology', color: '#16a34a' },
    { code: 'yoga_philosophy', label: 'Yoga Philosophy', color: '#9333ea' },
    { code: 'practical_teaching', label: 'Practical Teaching', color: '#ea580c' },
  ];

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1c1917', fontWeight: 700 }}>
            🎯 Verified Progress & Hours Tracker
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#78716c' }}>
            Authoritative Server Calculations · Minimum {progress.required_hours}h Faculty-Approved Required
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {progress.final_faculty_signoff ? (
            <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700 }}>
              ✓ Faculty Sign-Off Complete
            </span>
          ) : (
            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
              Pending Final Sign-Off
            </span>
          )}
        </div>
      </div>

      {/* Main Overall Progress Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 600, color: '#1c1917' }}>
            Overall Certification Progress: <span style={{ color: '#0284c7' }}>{progress.approved_hours}h</span> / {progress.required_hours}h
          </span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{progress.completion_percentage}%</span>
        </div>

        <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '7px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(progress.completion_percentage, 100)}%`,
              height: '100%',
              backgroundColor: progress.completion_percentage >= 100 ? '#10b981' : '#0284c7',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Approved Hours</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#166534', marginTop: '0.15rem' }}>{progress.approved_hours}h</div>
          <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Verified & count towards 200h</div>
        </div>

        <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>Pending Hours</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#854d0e', marginTop: '0.15rem' }}>{progress.pending_hours}h</div>
          <div style={{ fontSize: '0.75rem', color: '#a16207' }}>Under review (Does not count)</div>
        </div>

        <div style={{ backgroundColor: '#fafaf9', border: '1px solid #e7e5e4', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#57534e', textTransform: 'uppercase' }}>Remaining Hours</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#292524', marginTop: '0.15rem' }}>{progress.remaining_hours}h</div>
          <div style={{ fontSize: '0.75rem', color: '#78716c' }}>To reach 200h certification</div>
        </div>

        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Rejected Hours</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#991b1b', marginTop: '0.15rem' }}>{progress.rejected_hours}h</div>
          <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Excluded from verified total</div>
        </div>
      </div>

      {/* Canonical Category Breakdown */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#334155' }}>
            Canonical Category Distribution
          </h4>
          {!progress.category_quotas_configured ? (
            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
              ⚠️ Category Distribution: CONFIGURATION_REQUIRED
            </span>
          ) : (
            <span style={{ backgroundColor: progress.category_eligibility_status === 'SATISFIED' ? '#dcfce7' : '#fee2e2', color: progress.category_eligibility_status === 'SATISFIED' ? '#15803d' : '#991b1b', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
              {progress.category_eligibility_status === 'SATISFIED' ? '✓ All Category Quotas Met' : '⚠️ Category Quotas Incomplete'}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {categories.map((c) => {
            const completed = progress.category_totals[c.code] || 0;
            const quotaDetail = progress.category_quota_details[c.code];
            const requiredQuota = quotaDetail?.required_hours;
            const pct = requiredQuota ? Math.min(Math.round((completed / requiredQuota) * 100), 100) : null;

            return (
              <div key={c.code} style={{ padding: '0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{c.label}</span>
                  <span style={{ fontWeight: 700, color: c.color, fontSize: '0.92rem' }}>{completed}h</span>
                </div>

                {requiredQuota !== null && requiredQuota !== undefined ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>
                      <span>Target: {requiredQuota}h</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: c.color }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Hours verified (Quota not configured)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
