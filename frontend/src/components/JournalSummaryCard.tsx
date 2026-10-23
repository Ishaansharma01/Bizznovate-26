import React, { useState } from 'react';
import { JournalSummary, getLogSummaryApi, generateLogSummaryApi } from '../services/api';

interface JournalSummaryCardProps {
  logId: string;
}

export const JournalSummaryCard: React.FC<JournalSummaryCardProps> = ({ logId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (force: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = force
        ? await generateLogSummaryApi(logId, true)
        : await getLogSummaryApi(logId);
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        setError(res.error?.message || 'AI summary unavailable. Faculty review may proceed without interruption.');
      }
    } catch (err: any) {
      setError(err.message || 'AI summary unavailable. Faculty review may proceed without interruption.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen && !summary) {
      fetchSummary(false);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ marginTop: '0.65rem' }}>
      <button
        type="button"
        onClick={handleToggle}
        style={{
          backgroundColor: isOpen ? '#e0f2fe' : '#f0fdf4',
          color: isOpen ? '#0369a1' : '#15803d',
          border: `1px solid ${isOpen ? '#bae6fd' : '#bbf7d0'}`,
          padding: '0.35rem 0.75rem',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {isOpen ? '▲ Hide AI Practice Brief' : '🤖 View AI Practice Brief (NLP Decision Support)'}
      </button>

      {isOpen && (
        <div style={{ marginTop: '0.75rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '1rem' }}>
          {/* AI Banner / Disclaimer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
              🤖 AI Practice Brief (Decision Support Only)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Provider: {summary?.provider || 'local-mock'} · Invariant: Never approves hours
            </span>
          </div>

          {loading ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', margin: '0.5rem 0' }}>
              Synthesizing grounded reflections...
            </p>
          ) : error ? (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.65rem', borderRadius: '4px', color: '#92400e', fontSize: '0.82rem' }}>
              <strong>Notice:</strong> {error}
            </div>
          ) : summary ? (
            <div>
              {/* Stale Warning */}
              {summary.is_stale && (
                <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚠️ Reflection text was updated since this brief was generated.</span>
                  <button
                    onClick={() => fetchSummary(true)}
                    style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Regenerate
                  </button>
                </div>
              )}

              {/* Side-by-side or stacked grounded sections */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: '0.35rem' }}>
                    📌 Key Learning
                  </div>
                  <div style={{ color: '#334155', whiteSpace: 'pre-line', lineHeight: 1.45 }}>
                    {summary.key_learning}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: '0.35rem' }}>
                    🧘 Practice Reflection
                  </div>
                  <div style={{ color: '#334155', whiteSpace: 'pre-line', lineHeight: 1.45 }}>
                    {summary.practice_reflection}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 700, color: '#9333ea', marginBottom: '0.35rem' }}>
                    🔍 Topics for Faculty Review
                  </div>
                  <div style={{ color: '#334155', whiteSpace: 'pre-line', lineHeight: 1.45 }}>
                    {summary.topics_for_review}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                <span>SHA-256 Hash: <code>{summary.source_journal_hash.slice(0, 16)}...</code></span>
                <button
                  type="button"
                  onClick={() => fetchSummary(true)}
                  style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.72rem' }}
                >
                  Regenerate Brief
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
