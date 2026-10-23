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
          `Log for ${res.data.duration_hours}h (${res.data.category.replace(/_/g, ' ')}) submitted successfully and queued as PENDING for faculty review.`
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
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <h3 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
          <span>📝</span> Log Practice Session
        </h3>
        <span className="text-[10px] uppercase font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200 self-start sm:self-auto">
          8h Daily Cap · 48h Window
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <span><strong>Error:</strong> {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold underline text-xs cursor-pointer ml-2">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <span><strong>Success:</strong> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold underline text-xs cursor-pointer ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Real-time daily cap allowance preview */}
      {capacity && (
        <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
          <div>
            <span className="text-stone-400 text-[10px] uppercase block font-semibold">Date</span>
            <span className="font-semibold text-stone-800 truncate block mt-0.5">{capacity.practice_date}</span>
          </div>
          <div>
            <span className="text-stone-400 text-[10px] uppercase block font-semibold">Logged</span>
            <span className="font-bold text-sky-800 block mt-0.5">{capacity.existing_hours}h / {capacity.daily_max_hours}h</span>
          </div>
          <div>
            <span className="text-stone-400 text-[10px] uppercase block font-semibold">Remaining</span>
            <span className={`font-bold block mt-0.5 ${capacity.remaining_hours > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {capacity.remaining_hours}h left
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Practice Date */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Practice Date (Within 48h Window)
          </label>
          <input
            type="date"
            max={todayStr}
            value={practiceDate}
            onChange={(e) => setPracticeDate(e.target.value)}
            required
            className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Canonical Category */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Canonical Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-sky-500"
          >
            <option value="asana_practice">Asana Practice</option>
            <option value="anatomy">Anatomy & Physiology</option>
            <option value="yoga_philosophy">Yoga Philosophy & Ethics</option>
            <option value="practical_teaching">Practical Teaching & Methodology</option>
          </select>
        </div>

        {/* Duration in Hours and Minutes */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Duration: <span className="text-sky-700 font-bold">{totalMinutes} mins ({(totalMinutes / 60).toFixed(2)}h)</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="8"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Hours"
                className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <span className="text-xs font-semibold text-stone-500">hrs</span>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="59"
                step="5"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Minutes"
                className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <span className="text-xs font-semibold text-stone-500">min</span>
          </div>
        </div>

        {/* Reflection Journal */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-stone-700">
              Personal Reflection Journal & Notes
            </label>
            <span className={`text-[10px] ${journal.length < 10 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
              {journal.length} chars (min 10)
            </span>
          </div>
          <textarea
            rows={4}
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            placeholder="Describe techniques practiced, postures explored, anatomical observations, or questions for your faculty mentors..."
            required
            className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-sky-800 hover:bg-sky-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
        >
          {loading ? 'Validating & Submitting...' : 'Submit Log Entry'}
        </button>
      </form>
    </div>
  );
};
