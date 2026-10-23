import React, { useEffect, useState } from 'react';
import { Program, Enrollment, getProgramsApi, updateProgramQuotasApi, getAllEnrollmentsApi, createEnrollmentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Category Quota Form State
  const [selectedProgId, setSelectedProgId] = useState<string>('');
  const [asanaHours, setAsanaHours] = useState<string>('100');
  const [anatomyHours, setAnatomyHours] = useState<string>('30');
  const [philosophyHours, setPhilosophyHours] = useState<string>('30');
  const [teachingHours, setTeachingHours] = useState<string>('40');

  // Enrollment Form State
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollProgId, setEnrollProgId] = useState('');
  const [enrollStartDate, setEnrollStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [enrollTargetDate, setEnrollTargetDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const loadData = async () => {
    try {
      const [progRes, enrollRes] = await Promise.all([getProgramsApi(), getAllEnrollmentsApi()]);
      if (progRes.success && progRes.data) {
        setPrograms(progRes.data);
        if (progRes.data.length > 0 && !selectedProgId) {
          setSelectedProgId(progRes.data[0].id);
          setEnrollProgId(progRes.data[0].id);
        }
      }
      if (enrollRes.success && enrollRes.data) {
        setEnrollments(enrollRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgId) return;

    setMsg(null);
    const quotas = {
      asana_practice: parseFloat(asanaHours) || 0,
      anatomy: parseFloat(anatomyHours) || 0,
      yoga_philosophy: parseFloat(philosophyHours) || 0,
      practical_teaching: parseFloat(teachingHours) || 0,
    };

    const res = await updateProgramQuotasApi(selectedProgId, quotas);
    if (res.success) {
      setMsg({ type: 'success', text: 'Category distribution quotas successfully configured and saved!' });
      loadData();
    } else {
      setMsg({ type: 'error', text: res.error?.message || 'Failed to update quotas.' });
    }
  };

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId || !enrollProgId) {
      setMsg({ type: 'error', text: 'Please provide both Student ID and Program.' });
      return;
    }

    setMsg(null);
    const res = await createEnrollmentApi({
      student_id: enrollStudentId,
      program_id: enrollProgId,
      enrollment_date: enrollStartDate,
      target_graduation_date: enrollTargetDate,
      is_public_name_visible: true,
    });

    if (res.success) {
      setMsg({ type: 'success', text: 'Student successfully enrolled!' });
      setEnrollStudentId('');
      loadData();
    } else {
      setMsg({ type: 'error', text: res.error?.message || 'Failed to create enrollment.' });
    }
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Admin Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-100/70 border border-purple-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-purple-950 flex items-center gap-2">
            <span>⚙️</span> Administrator Workspace — {user?.full_name}
          </h2>
          <p className="text-xs sm:text-sm text-purple-800 mt-1">
            Configure program rules, manage canonical category quotas, and enroll trainees into 200-hour TTC batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-white/80 border border-purple-200 text-purple-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs">
            Programs: {programs.length} · Trainees: {enrollments.length}
          </span>
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

      {/* Program Configuration Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <span>📜</span> Training Programs & Quota Configuration
        </h3>

        {loading ? (
          <p className="text-xs text-stone-500">Loading program rules...</p>
        ) : (
          <div className="space-y-4">
            {programs.map((p) => (
              <div
                key={p.id}
                className="border border-stone-200 rounded-xl p-4 sm:p-5 bg-stone-50/70 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-base text-stone-900">
                    {p.name} <span className="text-stone-500 font-mono font-normal text-xs">({p.code})</span>
                  </div>
                  {p.category_quotas_configured ? (
                    <span className="inline-block text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-300">
                      ✓ Canonical Quotas Configured
                    </span>
                  ) : (
                    <span className="inline-block text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded border border-amber-300">
                      ⚠️ Distribution: CONFIGURATION_REQUIRED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] uppercase font-semibold block">Total Required</span>
                    <strong className="text-stone-900 font-bold">{p.required_hours}h</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] uppercase font-semibold block">Daily Limit</span>
                    <strong className="text-stone-900 font-bold">{p.daily_max_hours}h / day</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] uppercase font-semibold block">Backdating Window</span>
                    <strong className="text-stone-900 font-bold">{p.backdating_window_hours}h max</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-stone-500 text-[10px] uppercase font-semibold block">Authoritative Timezone</span>
                    <strong className="text-stone-900 font-bold">{p.timezone}</strong>
                  </div>
                </div>

                {/* Show Current Quotas if set */}
                {p.category_quotas && (
                  <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-bold text-stone-700">Active Curriculum Quotas:</span>
                    <span>Asana: <strong>{p.category_quotas.asana_practice || 0}h</strong></span>
                    <span>Anatomy: <strong>{p.category_quotas.anatomy || 0}h</strong></span>
                    <span>Philosophy: <strong>{p.category_quotas.yoga_philosophy || 0}h</strong></span>
                    <span>Teaching: <strong>{p.category_quotas.practical_teaching || 0}h</strong></span>
                  </div>
                )}
              </div>
            ))}

            {/* Quota Config Form */}
            <form onSubmit={handleUpdateQuotas} className="p-4 sm:p-5 border border-stone-200 rounded-xl bg-stone-50/50 space-y-4">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-700">
                Update Category Hour Quotas for Selected Program
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Asana Practice (h)</label>
                  <input
                    type="number"
                    value={asanaHours}
                    onChange={(e) => setAsanaHours(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Anatomy (h)</label>
                  <input
                    type="number"
                    value={anatomyHours}
                    onChange={(e) => setAnatomyHours(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Yoga Philosophy (h)</label>
                  <input
                    type="number"
                    value={philosophyHours}
                    onChange={(e) => setPhilosophyHours(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">Practical Teaching (h)</label>
                  <input
                    type="number"
                    value={teachingHours}
                    onChange={(e) => setTeachingHours(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                Save Program Quotas
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Enrollment Management */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <span>👥</span> Trainee Batch Enrollments
        </h3>

        <form onSubmit={handleCreateEnrollment} className="p-4 sm:p-5 border border-stone-200 rounded-xl bg-stone-50/50 space-y-4">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-700">Enroll New Trainee</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">Student UUID / ID</label>
              <input
                type="text"
                placeholder="Paste Student UUID"
                value={enrollStudentId}
                onChange={(e) => setEnrollStudentId(e.target.value)}
                required
                className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">Enrollment Date</label>
              <input
                type="date"
                value={enrollStartDate}
                onChange={(e) => setEnrollStartDate(e.target.value)}
                required
                className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">Target Graduation Date</label>
              <input
                type="date"
                value={enrollTargetDate}
                onChange={(e) => setEnrollTargetDate(e.target.value)}
                required
                className="w-full p-2 bg-white rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            Submit Enrollment
          </button>
        </form>

        {/* Existing Enrollments Table with responsive horizontal overflow */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 uppercase text-[11px]">
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Student ID</th>
                <th className="py-3 px-3">Program</th>
                <th className="py-3 px-3">Dates (Start → Target)</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {enrollments.map((e) => (
                <tr key={e.id} className="hover:bg-stone-50/70">
                  <td className="py-3 px-3 font-bold text-stone-900">{e.student_name}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-stone-500">{e.student_id}</td>
                  <td className="py-3 px-3 font-semibold text-stone-800">{e.program_code}</td>
                  <td className="py-3 px-3 text-stone-600">{e.enrollment_date} → {e.target_graduation_date}</td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
