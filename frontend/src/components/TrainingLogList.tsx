import React, { useEffect, useState } from 'react';
import { TrainingLog, getMyLogsApi } from '../services/api';
import { JournalSummaryCard } from './JournalSummaryCard';

interface TrainingLogListProps {
  refreshTrigger: number;
}

export const TrainingLogList: React.FC<TrainingLogListProps> = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getMyLogsApi(statusFilter, categoryFilter);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger, statusFilter, categoryFilter]);

  // Aggregate stats
  const totalApprovedMinutes = logs
    .filter((l) => l.status === 'approved')
    .reduce((sum, l) => sum + l.duration_minutes, 0);

  const totalPendingMinutes = logs
    .filter((l) => l.status === 'pending')
    .reduce((sum, l) => sum + l.duration_minutes, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: '✓ Approved (Verified)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'rejected':
        return { label: '✕ Rejected', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'correction_requested':
        return { label: '↺ Correction Requested', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      default:
        return { label: '⏳ Pending Review', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'asana_practice':
        return 'Asana Practice';
      case 'anatomy':
        return 'Anatomy & Physiology';
      case 'yoga_philosophy':
        return 'Yoga Philosophy';
      case 'practical_teaching':
        return 'Practical Teaching';
      default:
        return cat.replace(/_/g, ' ');
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>📋</span> My Training Log History
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Complete practice journal entries, verification decisions & AI reflection briefs
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="correction_requested">Correction Requested</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="asana_practice">Asana Practice</option>
            <option value="anatomy">Anatomy</option>
            <option value="yoga_philosophy">Yoga Philosophy</option>
            <option value="practical_teaching">Practical Teaching</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics: 3 responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
            Approved Hours
          </div>
          <div className="text-xl font-black text-emerald-950 mt-1">
            {(totalApprovedMinutes / 60).toFixed(1)}h
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Counts toward 200h target</div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="text-[11px] text-amber-800 font-bold uppercase tracking-wider">
            Pending Hours
          </div>
          <div className="text-xl font-black text-amber-950 mt-1">
            {(totalPendingMinutes / 60).toFixed(1)}h
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">Under faculty review</div>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
          <div className="text-[11px] text-stone-600 font-bold uppercase tracking-wider">
            Total Logged Sessions
          </div>
          <div className="text-xl font-black text-stone-900 mt-1">
            {logs.length}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Across all curriculum categories</div>
        </div>
      </div>

      {/* Logs Table / Cards */}
      {loading ? (
        <p className="text-stone-500 text-center py-8 text-xs">Loading training logs...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 px-4 text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200 text-xs">
          No training logs found matching the selected filters. Submit your daily practice session using the form above.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const badge = getStatusBadge(log.status);
            return (
              <div
                key={log.id}
                className="border border-stone-200 rounded-xl p-4 sm:p-5 bg-white hover:border-stone-300 transition-colors space-y-3 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-stone-900 text-sm">{log.practice_date}</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {getCategoryLabel(log.category)}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs font-bold text-stone-900">
                      {log.duration_hours}h ({log.duration_minutes} min)
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border self-start sm:self-auto ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Reflection Text */}
                <div className="p-3.5 bg-stone-50/80 rounded-xl border-l-4 border-stone-300 text-xs text-stone-800 space-y-1">
                  <span className="font-bold text-stone-500 uppercase text-[10px] tracking-wider block">
                    Student Practice Reflection
                  </span>
                  <p className="leading-relaxed">{log.reflection_journal}</p>
                </div>

                {/* AI Practice Brief */}
                <JournalSummaryCard logId={log.id} />

                {/* Review feedback if available */}
                {log.review_feedback && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <strong>Faculty Feedback ({log.reviewed_by || 'Faculty'}):</strong> {log.review_feedback}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-stone-400 gap-1 pt-1">
                  <span>Category code: <code className="text-stone-600">{log.category}</code></span>
                  <span>Submitted: {new Date(log.submitted_at).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
