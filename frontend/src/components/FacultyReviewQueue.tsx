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
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
            <span>⚖️</span> Faculty Review Queue
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Authoritative Review & Decision Engine · AI Grounded Briefs · Mandatory Feedback on Rejection
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending Queue</option>
            <option value="approved">Approved History</option>
            <option value="rejected">Rejected History</option>
            <option value="correction_requested">Corrections Requested</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 focus:ring-2 focus:ring-blue-500"
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
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold underline text-xs cursor-pointer ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Review Dialog/Modal if open */}
      {selectedLogId && actionType && (
        <div className="bg-sky-50/70 border-2 border-sky-600 rounded-xl p-4 sm:p-5 space-y-3">
          <h4 className="font-bold text-stone-900 text-sm capitalize flex items-center gap-2">
            <span>Decision:</span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                actionType === 'approve'
                  ? 'bg-emerald-100 text-emerald-800'
                  : actionType === 'reject'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {actionType.replace('_', ' ')}
            </span>
          </h4>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-stone-700">
              {actionType === 'approve' ? 'Faculty Constructive Feedback (Optional)' : 'Mandatory Justification / Actionable Guidance *'}
            </label>
            <textarea
              rows={3}
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              placeholder={actionType === 'approve' ? 'Great alignment and steady breath awareness...' : 'Please specify why this log requires correction or was rejected...'}
              required={actionType !== 'approve'}
              className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirmDecision}
              disabled={actionLoading}
              className={`px-4 py-2 text-white font-semibold rounded-lg text-xs shadow-xs cursor-pointer disabled:opacity-50 ${
                actionType === 'approve'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : actionType === 'reject'
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              {actionLoading ? 'Saving...' : `Confirm ${actionType.replace('_', ' ')}`}
            </button>
            <button
              onClick={handleCloseAction}
              disabled={actionLoading}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Queue List */}
      {loading ? (
        <p className="text-stone-500 text-center py-8 text-xs">Loading review queue...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 px-4 text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200 text-xs">
          No training logs currently in the <strong className="text-stone-600">{statusFilter}</strong> queue.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border border-stone-200 rounded-xl p-4 sm:p-5 bg-white hover:border-stone-300 transition-colors space-y-3 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-stone-900 text-sm sm:text-base">{log.student_name}</span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {log.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs font-bold text-stone-900">
                    {log.duration_hours}h ({log.duration_minutes} min)
                  </span>
                </div>

                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border self-start sm:self-auto ${
                    log.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : log.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {log.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="text-[11px] text-stone-500">
                Practice Date: <strong className="text-stone-700">{log.practice_date}</strong> · Submitted: {new Date(log.submitted_at).toLocaleString()}
              </div>

              {/* Reflection Journal */}
              <div className="p-3.5 bg-stone-50/80 rounded-xl border-l-4 border-sky-600 text-xs text-stone-800 space-y-1">
                <span className="font-bold text-stone-500 uppercase text-[10px] tracking-wider block">
                  Original Student Reflection
                </span>
                <p className="leading-relaxed">{log.reflection_journal}</p>
              </div>

              {/* AI Practice Brief Component */}
              <JournalSummaryCard logId={log.id} />

              {/* Feedback reason if previously reviewed */}
              {log.review_feedback && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <strong>Prior Feedback ({log.reviewed_by}):</strong> {log.review_feedback}
                </div>
              )}

              {/* Decision Action Buttons (only shown if log is actionable) */}
              {(log.status === 'pending' || log.status === 'correction_requested') && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleOpenAction(log.id, 'approve')}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                  >
                    ✓ Approve Hours
                  </button>
                  <button
                    onClick={() => handleOpenAction(log.id, 'reject')}
                    className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => handleOpenAction(log.id, 'request_correction')}
                    className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
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
