import React, { useState, useEffect } from 'react';
import { submitLogApi, getDailyCapacityApi, DailyCapacity } from '../services/api';

interface TrainingLogFormProps {
  enrollmentId: string;
  onLogSubmitted: () => void;
}

export const TrainingLogForm: React.FC<TrainingLogFormProps> = ({ enrollmentId, onLogSubmitted }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [practiceDate, setPracticeDate] = useState<string>(todayStr);
  const [category, setCategory] = useState<string>('asana_practice');
  const [hours, setHours] = useState<string>('1');
  const [minutes, setMinutes] = useState<string>('30');
  const [journal, setJournal] = useState<string>('');
  
  const [capacity, setCapacity] = useState<DailyCapacity | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch daily capacity whenever practiceDate or enrollmentId changes
  useEffect(() => {
    if (enrollmentId && practiceDate) {
      getDailyCapacityApi(enrollmentId, practiceDate)
        .then((res) => {
          if (res.success && res.data) {
            setCapacity(res.data);
          }
        })
        .catch(() => {});
    }
  }, [enrollmentId, practiceDate]);

  const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (totalMinutes <= 0) {
      setErrorMsg('Duration must be greater than 0 minutes.');
      return;
    }
    if (totalMinutes > 480) {
      setErrorMsg('Single log duration cannot exceed 8 hours (480 minutes).');
      return;
    }
    if (!journal.trim() || journal.trim().length < 10) {
      setErrorMsg('Reflection journal must be at least 10 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitLogApi({
        enrollment_id: enrollmentId,
        practice_date: practiceDate,
        category,
        duration_minutes: totalMinutes,
        reflection_journal: journal.trim(),
      });

      if (res.success && res.data) {
        setSuccessMsg(
          `Log for ${res.data.duration_hours}h (${res.data.category}) submitted successfully and queued as PENDING for faculty review.`
        );
        // Clear only journal and reset duration; retain date for convenience
        setJournal('');
        setHours('1');
        setMinutes('0');
        // Refresh capacity
        getDailyCapacityApi(enrollmentId, practiceDate).then((capRes) => {
          if (capRes.success && capRes.data) setCapacity(capRes.data);
        });
        onLogSubmitted();
      } else {
        // Preserve form inputs so student does not lose work!
        setErrorMsg(res.error?.message || res.message || 'Log submission failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error submitting log.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1c1917', fontWeight: 700 }}>
          📝 Daily Training Log Submission
        </h3>
        <span style={{ fontSize: '0.8rem', backgroundColor: '#f5f5f4', padding: '0.2rem 0.6rem', borderRadius: '4px', color: '#57534e' }}>
          Server-Validated · 8h Daily Cap · 48h Window
        </span>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.88rem', marginBottom: '1rem' }}>
          <strong>Submission Error:</strong> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.88rem', marginBottom: '1rem' }}>
          <strong>Success:</strong> {successMsg}
        </div>
      )}

      {/* Real-time daily cap allowance preview */}
      {capacity && (
        <div style={{ display: 'flex', gap: '1rem', backgroundColor: '#fafaf9', padding: '0.65rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem', border: '1px solid #e7e5e4' }}>
          <div>
            <span style={{ color: '#78716c' }}>Date:</span> <strong>{capacity.practice_date}</strong>
          </div>
          <div>
            <span style={{ color: '#78716c' }}>Already Logged:</span>{' '}
            <strong style={{ color: '#0369a1' }}>{capacity.existing_hours}h</strong> / {capacity.daily_max_hours}h
          </div>
          <div>
            <span style={{ color: '#78716c' }}>Remaining Cap:</span>{' '}
            <strong style={{ color: capacity.remaining_hours > 0 ? '#15803d' : '#b91c1c' }}>
              {capacity.remaining_hours}h remaining
            </strong>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Practice Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#44403c', marginBottom: '0.35rem' }}>
              Practice Date (Max 48h Past)
            </label>
            <input
              type="date"
              max={todayStr}
              value={practiceDate}
              onChange={(e) => setPracticeDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Canonical Category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#44403c', marginBottom: '0.35rem' }}>
              Canonical Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.9rem', boxSizing: 'border-box', backgroundColor: '#fff' }}
            >
              <option value="asana_practice">Asana Practice (asana_practice)</option>
              <option value="anatomy">Anatomy & Physiology (anatomy)</option>
              <option value="yoga_philosophy">Yoga Philosophy & Ethics (yoga_philosophy)</option>
              <option value="practical_teaching">Practical Teaching (practical_teaching)</option>
            </select>
          </div>

          {/* Duration in Hours and Minutes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#44403c', marginBottom: '0.35rem' }}>
              Duration: {totalMinutes} mins ({(totalMinutes / 60).toFixed(2)}h)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Hours"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
              <span style={{ alignSelf: 'center', color: '#78716c', fontWeight: 600 }}>h</span>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="Minutes"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
              <span style={{ alignSelf: 'center', color: '#78716c', fontWeight: 600 }}>m</span>
            </div>
          </div>
        </div>

        {/* Reflection Journal */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#44403c' }}>
              Personal Reflection Journal & Notes
            </label>
            <span style={{ fontSize: '0.78rem', color: journal.length < 10 ? '#ef4444' : '#78716c' }}>
              {journal.length} characters (min 10)
            </span>
          </div>
          <textarea
            rows={4}
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            placeholder="Describe techniques practiced, postures explored, anatomical observations, or questions for your faculty mentors..."
            required
            style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #d6d3d1', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#0c4a6e',
            color: '#fff',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '6px',
            fontSize: '0.92rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Validating & Submitting...' : 'Submit Log Entry'}
        </button>
      </form>
    </div>
  );
};
