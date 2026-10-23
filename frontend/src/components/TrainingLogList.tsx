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
        return { label: '✓ Approved (Verified)', bg: '#dcfce7', text: '#15803d' };
      case 'rejected':
        return { label: '✕ Rejected', bg: '#fee2e2', text: '#991b1b' };
      case 'correction_requested':
        return { label: '↺ Correction Requested', bg: '#fef3c7', text: '#b45309' };
      default:
        return { label: '⏳ Pending Review', bg: '#fef9c3', text: '#854d0e' };
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
        return cat;
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1c1917', fontWeight: 700 }}>
          📋 My Training Log History
        </h3>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.85rem' }}
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
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.85rem' }}
          >
            <option value="all">All Categories</option>
            <option value="asana_practice">Asana Practice</option>
            <option value="anatomy">Anatomy</option>
            <option value="yoga_philosophy">Yoga Philosophy</option>
            <option value="practical_teaching">Practical Teaching</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
            Approved Hours
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#166534', marginTop: '0.2rem' }}>
            {(totalApprovedMinutes / 60).toFixed(1)}h
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534' }}>Counts toward 200h target</div>
        </div>

        <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
          <div style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 700, textTransform: 'uppercase' }}>
            Pending Hours
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#854d0e', marginTop: '0.2rem' }}>
            {(totalPendingMinutes / 60).toFixed(1)}h
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a16207' }}>Awaiting review (Does not count)</div>
        </div>

        <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Submitted Entries
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
            {logs.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Across all categories</div>
        </div>
      </div>

      {/* Logs Table / Cards */}
      {loading ? (
        <p style={{ color: '#78716c', textAlign: 'center', padding: '1rem' }}>Loading training logs...</p>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#a8a29e', backgroundColor: '#fafaf9', borderRadius: '6px' }}>
          No training logs found matching the selected filters. Submit your daily practice session using the form above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logs.map((log) => {
            const badge = getStatusBadge(log.status);
            return (
              <div
                key={log.id}
                style={{
                  border: '1px solid #e7e5e4',
                  borderRadius: '6px',
                  padding: '1rem',
                  backgroundColor: '#fff',
                  transition: 'box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#1c1917', fontSize: '0.98rem' }}>
                      {log.practice_date}
                    </span>
                    <span style={{ margin: '0 0.5rem', color: '#d6d3d1' }}>·</span>
                    <span style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.9rem' }}>
                      {getCategoryLabel(log.category)}
                    </span>
                    <span style={{ margin: '0 0.5rem', color: '#d6d3d1' }}>·</span>
                    <span style={{ color: '#44403c', fontSize: '0.9rem', fontWeight: 600 }}>
                      {log.duration_hours}h ({log.duration_minutes} min)
                    </span>
                  </div>

                  <span
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Reflection Text */}
                <div style={{ fontSize: '0.88rem', color: '#57534e', lineHeight: 1.5, backgroundColor: '#fafaf9', padding: '0.65rem 0.85rem', borderRadius: '4px', borderLeft: '3px solid #cbd5e1', marginBottom: '0.5rem' }}>
                  {log.reflection_journal}
                </div>

                {/* AI Practice Brief */}
                <JournalSummaryCard logId={log.id} />

                {/* Review feedback if available */}
                {log.review_feedback && (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem', color: '#92400e', marginTop: '0.5rem' }}>
                    <strong>Faculty Feedback ({log.reviewed_by || 'Faculty'}):</strong> {log.review_feedback}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a8a29e', marginTop: '0.4rem' }}>
                  <span>Category code: <code>{log.category}</code></span>
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
