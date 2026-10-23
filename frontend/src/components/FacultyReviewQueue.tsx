import React, { useEffect, useState } from 'react';
import { TrainingLog, getReviewQueueApi, reviewLogApi } from '../services/api';
import { JournalSummaryCard } from './JournalSummaryCard';

export const FacultyReviewQueue: React.FC = () => {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Review Action State
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_correction' | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getReviewQueueApi(statusFilter, undefined, categoryFilter);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, categoryFilter]);

  const handleOpenAction = (logId: string, action: 'approve' | 'reject' | 'request_correction') => {
    setSelectedLogId(logId);
    setActionType(action);
    setFeedbackReason('');
    setMsg(null);
  };

  const handleCloseAction = () => {
    setSelectedLogId(null);
    setActionType(null);
    setFeedbackReason('');
  };

  const handleConfirmDecision = async () => {
    if (!selectedLogId || !actionType) return;

    if ((actionType === 'reject' || actionType === 'request_correction') && !feedbackReason.trim()) {
      setMsg({ type: 'error', text: 'A clear feedback reason is mandatory for rejections and correction requests.' });
      return;
    }

    setActionLoading(true);
    setMsg(null);
    try {
      const res = await reviewLogApi(selectedLogId, actionType, feedbackReason.trim() || undefined);
      if (res.success && res.data) {
        setMsg({
          type: 'success',
          text: `Log for ${res.data.student_name} successfully updated to '${res.data.status}'.`,
        });
        handleCloseAction();
        fetchQueue();
      } else {
        setMsg({ type: 'error', text: res.error?.message || 'Failed to submit review decision.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Network error submitting review.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1c1917', fontWeight: 700 }}>
            ⚖️ Faculty Review Queue
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#78716c' }}>
            Authoritative Review & Decision Engine · AI Grounded Briefs · Mandatory Feedback
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.85rem' }}
          >
            <option value="pending">Pending Queue</option>
            <option value="approved">Approved History</option>
            <option value="rejected">Rejected History</option>
            <option value="correction_requested">Corrections Requested</option>
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

      {msg && (
        <div style={{
          backgroundColor: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.88rem'
        }}>
          {msg.text}
        </div>
      )}

      {/* Review Dialog/Modal if open */}
      {selectedLogId && actionType && (
        <div style={{ backgroundColor: '#f8fafc', border: '2px solid #0284c7', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', textTransform: 'capitalize' }}>
            Confirm Review Decision: <span style={{ color: actionType === 'approve' ? '#16a34a' : actionType === 'reject' ? '#dc2626' : '#d97706' }}>{actionType.replace('_', ' ')}</span>
          </h4>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
              {actionType === 'approve' ? 'Faculty Notes (Optional)' : 'Mandatory Justification / Feedback for Student *'}
            </label>
            <textarea
              rows={3}
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              placeholder={actionType === 'approve' ? 'Great alignment notes...' : 'Please specify why this log requires correction or was rejected...'}
              required={actionType !== 'approve'}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleConfirmDecision}
              disabled={actionLoading}
              style={{
                backgroundColor: actionType === 'approve' ? '#16a34a' : actionType === 'reject' ? '#dc2626' : '#d97706',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {actionLoading ? 'Saving...' : `Confirm ${actionType.replace('_', ' ')}`}
            </button>
            <button
              onClick={handleCloseAction}
              disabled={actionLoading}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Queue List */}
      {loading ? (
        <p style={{ color: '#78716c', textAlign: 'center', padding: '1rem' }}>Loading review queue...</p>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#a8a29e', backgroundColor: '#fafaf9', borderRadius: '6px' }}>
          No logs currently waiting in the {statusFilter} queue.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {logs.map((log) => (
            <div key={log.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{log.student_name}</span>
                  <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>·</span>
                  <span style={{ fontWeight: 600, color: '#0369a1' }}>{log.category.replace('_', ' ')}</span>
                  <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>·</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{log.duration_hours}h ({log.duration_minutes}m)</span>
                </div>

                <span style={{ backgroundColor: '#fef9c3', color: '#854d0e', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {log.status.replace('_', ' ')}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.65rem' }}>
                Practice Date: <strong>{log.practice_date}</strong> · Submitted: {new Date(log.submitted_at).toLocaleString()}
              </div>

              {/* Reflection Journal */}
              <div style={{ fontSize: '0.9rem', color: '#334155', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', borderLeft: '4px solid #0284c7', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem', fontSize: '0.78rem' }}>Original Student Reflection:</span>
                {log.reflection_journal}
              </div>

              {/* AI Practice Brief Component */}
              <JournalSummaryCard logId={log.id} />

              {/* Feedback reason if previously reviewed */}
              {log.review_feedback && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.82rem', color: '#92400e', marginTop: '0.75rem' }}>
                  <strong>Prior Feedback ({log.reviewed_by}):</strong> {log.review_feedback}
                </div>
              )}

              {/* Decision Action Buttons (only shown if log is actionable) */}
              {(log.status === 'pending' || log.status === 'correction_requested') && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => handleOpenAction(log.id, 'approve')}
                    style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✓ Approve Hours
                  </button>
                  <button
                    onClick={() => handleOpenAction(log.id, 'reject')}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => handleOpenAction(log.id, 'request_correction')}
                    style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ↺ Request Correction
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
