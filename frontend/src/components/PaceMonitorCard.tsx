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
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-500 animate-pulse shadow-xs">
        <div className="w-8 h-8 mx-auto bg-stone-200 rounded-full mb-2"></div>
        Calculating schedule pace & progress projections...
      </div>
    );
  }

  if (!pace) return null;

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'on_track':
        return { label: '✓ On Track', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'behind':
        return { label: '⚠️ Behind Schedule', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'critical_shortfall':
        return { label: '🚨 Critical Shortfall / Infeasible', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'overdue':
        return { label: '⌛ Overdue / Target Passed', bg: 'bg-red-100 text-red-900 border-red-300' };
      case 'completed':
        return { label: '🏆 Requirements Met', bg: 'bg-teal-100 text-teal-800 border-teal-300' };
      default:
        return { label: status, bg: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  const statusStyle = getStatusDetails(pace.pace_status);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>⏱️</span> Progress Pace & Graduation Monitor
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Linear Schedule Projection · 8h/day Cap Respected · Target: {pace.target_graduation_date}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              🔄 Refresh
            </button>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusStyle.bg}`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* Status Warning Banner if behind or infeasible */}
      {pace.pace_status !== 'on_track' && pace.pace_status !== 'completed' && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm ${
            pace.pace_status === 'behind'
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}
        >
          <strong>Pace Notice:</strong> {pace.status_message}
        </div>
      )}

      {/* Expected vs Actual Hours Visual Bar */}
      <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-baseline text-xs sm:text-sm">
          <span className="text-stone-600">
            Expected Linear: <strong className="text-stone-900">{pace.expected_progress_hours}h</strong>
          </span>
          <span className="text-stone-600">
            Actual Approved: <strong className="text-sky-700">{pace.approved_hours}h</strong>
          </span>
        </div>

        {/* Progress Comparison Visual */}
        <div className="relative w-full h-4 bg-stone-200 rounded-full overflow-hidden">
          {/* Expected marker */}
          <div
            className="absolute h-full bg-stone-300 rounded-full"
            style={{ width: `${Math.min((pace.expected_progress_hours / pace.required_hours) * 100, 100)}%` }}
          />
          {/* Actual approved */}
          <div
            className={`absolute h-full rounded-full transition-all duration-300 ${
              pace.shortfall_hours > 0 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min((pace.approved_hours / pace.required_hours) * 100, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-stone-500 pt-0.5">
          <span>Start: {pace.start_date} ({pace.days_elapsed} days elapsed)</span>
          {pace.shortfall_hours > 0 ? (
            <span className="text-amber-800 font-bold">Shortfall: -{pace.shortfall_hours}h behind</span>
          ) : (
            <span className="text-emerald-700 font-bold">0h shortfall · On schedule</span>
          )}
        </div>
      </div>

      {/* Schedule Metrics Grid: 3 responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Days Remaining</div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${pace.days_remaining <= 0 ? 'text-rose-700' : 'text-stone-900'}`}>
            {pace.days_remaining > 0 ? `${pace.days_remaining} days` : '0 days (Overdue)'}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5 truncate">Target: {pace.target_graduation_date}</div>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Required Weekly Pace</div>
          <div className="text-xl sm:text-2xl font-black text-sky-800 mt-1">
            {pace.required_weekly_pace !== null ? `${pace.required_weekly_pace}h / wk` : 'N/A'}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5 truncate">To finish remaining {pace.remaining_hours}h</div>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Catch-Up Daily Pace</div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${pace.is_feasible ? 'text-emerald-700' : 'text-rose-700'}`}>
            {pace.realistic_daily_catchup_pace !== null ? `${pace.realistic_daily_catchup_pace}h / day` : 'N/A'}
          </div>
          <div className={`text-[11px] mt-0.5 truncate ${pace.is_feasible ? 'text-emerald-700' : 'text-rose-700'}`}>
            {pace.is_feasible ? `Within ${pace.daily_cap_hours}h/day cap` : 'Cap exceeded: Infeasible'}
          </div>
        </div>
      </div>

      {/* Active Notifications & Alerts */}
      {pace.active_alerts && pace.active_alerts.length > 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
            📢 Active Pace Shortfall Alerts Dispatched
          </div>
          <div className="divide-y divide-stone-200">
            {pace.active_alerts.map((a) => (
              <div key={a.id} className="text-xs text-stone-600 flex justify-between py-2">
                <span>Alert: <strong className="text-stone-900">{a.status.toUpperCase()}</strong> ({a.shortfall_hours}h shortfall)</span>
                <span className="text-stone-400">Dispatched: {new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Disclaimer */}
      <div className="text-[11px] text-stone-400 text-center italic">
        * Invariant Notice: Pace estimates provide linear guidance and do not constitute a completion guarantee. Only approved hours count toward certification.
      </div>
    </div>
  );
};
