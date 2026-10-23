import React from 'react';
import { PaceMetrics } from '../services/api';

interface PaceMonitorCardProps {
  pace: PaceMetrics | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const PaceMonitorCard: React.FC<PaceMonitorCardProps> = ({ pace, loading, onRefresh }) => {
  if (loading) {
    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center', color: '#78716c' }}>
        Calculating schedule pace & progress projections...
      </div>
    );
  }

  if (!pace) return null;

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'on_track':
        return { label: '✓ On Track', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'behind':
        return { label: '⚠️ Behind Schedule', bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'critical_shortfall':
        return { label: '🚨 Critical Shortfall / Infeasible', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      case 'overdue':
        return { label: '⌛ Overdue / Target Passed', bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' };
      case 'completed':
        return { label: '🏆 Requirements Met', bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' };
      default:
        return { label: status, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const statusStyle = getStatusDetails(pace.pace_status);

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1c1917', fontWeight: 700 }}>
            ⏱️ Progress Pace & Graduation Monitor
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#78716c' }}>
            Linear Schedule Projection · 8h/day Cap Respected · Target: {pace.target_graduation_date}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              🔄 Refresh
            </button>
          )}
          <span
            style={{
              backgroundColor: statusStyle.bg,
              color: statusStyle.text,
              border: `1px solid ${statusStyle.border}`,
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* Status Warning Banner if behind or infeasible */}
      {pace.pace_status !== 'on_track' && pace.pace_status !== 'completed' && (
        <div style={{
          backgroundColor: pace.pace_status === 'behind' ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${pace.pace_status === 'behind' ? '#fef3c7' : '#fecaca'}`,
          color: pace.pace_status === 'behind' ? '#92400e' : '#991b1b',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1.25rem',
          fontSize: '0.88rem'
        }}>
          <strong>Pace Notice:</strong> {pace.status_message}
        </div>
      )}

      {/* Expected vs Actual Hours Bar */}
      <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
          <div>
            Expected Progress (Linear): <strong>{pace.expected_progress_hours}h</strong>
          </div>
          <div>
            Actual Approved (Verified): <strong style={{ color: '#0284c7' }}>{pace.approved_hours}h</strong>
          </div>
        </div>

        {/* Progress Comparison Visual */}
        <div style={{ position: 'relative', width: '100%', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Expected marker */}
          <div
            style={{
              position: 'absolute',
              width: `${Math.min((pace.expected_progress_hours / pace.required_hours) * 100, 100)}%`,
              height: '100%',
              backgroundColor: '#cbd5e1',
            }}
          />
          {/* Actual approved */}
          <div
            style={{
              position: 'absolute',
              width: `${Math.min((pace.approved_hours / pace.required_hours) * 100, 100)}%`,
              height: '100%',
              backgroundColor: pace.shortfall_hours > 0 ? '#f59e0b' : '#10b981',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
          <span>Start: {pace.start_date} ({pace.days_elapsed} days elapsed)</span>
          {pace.shortfall_hours > 0 ? (
            <span style={{ color: '#b45309', fontWeight: 600 }}>Shortfall: -{pace.shortfall_hours}h behind</span>
          ) : (
            <span style={{ color: '#15803d', fontWeight: 600 }}>0h shortfall · On schedule</span>
          )}
        </div>
      </div>

      {/* Schedule Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Days Remaining</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: pace.days_remaining <= 0 ? '#dc2626' : '#0f172a', marginTop: '0.15rem' }}>
            {pace.days_remaining > 0 ? `${pace.days_remaining} days` : '0 days (Overdue)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Target: {pace.target_graduation_date}</div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Required Weekly Pace</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0284c7', marginTop: '0.15rem' }}>
            {pace.required_weekly_pace !== null ? `${pace.required_weekly_pace}h / wk` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>To finish remaining {pace.remaining_hours}h</div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Catch-Up Daily Pace</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: pace.is_feasible ? '#16a34a' : '#dc2626', marginTop: '0.15rem' }}>
            {pace.realistic_daily_catchup_pace !== null ? `${pace.realistic_daily_catchup_pace}h / day` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: pace.is_feasible ? '#15803d' : '#dc2626' }}>
            {pace.is_feasible ? `Within ${pace.daily_cap_hours}h/day cap` : `Cap exceeded: Infeasible`}
          </div>
        </div>
      </div>

      {/* Active Notifications & Alerts */}
      {pace.active_alerts && pace.active_alerts.length > 0 && (
        <div style={{ backgroundColor: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: '6px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#44403c', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            📢 Active Pace Shortfall Alerts Dispatched
          </div>
          {pace.active_alerts.map((a) => (
            <div key={a.id} style={{ fontSize: '0.82rem', color: '#57534e', display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e7e5e4' }}>
              <span>Alert: {a.status.toUpperCase()} ({a.shortfall_hours}h shortfall)</span>
              <span>Dispatched: {new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Safety Disclaimer */}
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
        * Invariant Notice: Pace estimates provide linear guidance and do not constitute a completion guarantee. Only approved hours count toward certification.
      </div>
    </div>
  );
};
