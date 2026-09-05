import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Clock, Calendar, CheckCircle, AlertCircle, Save } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS = [];
for (let h = 6; h <= 22; h++) {
  for (let m of [0, 30]) {
    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    TIME_OPTIONS.push(`${hh}:${mm}`);
  }
}

export default function Availability() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSlot, setNewSlot] = useState({ weekday: 0, start_time: "09:00", end_time: "17:00" });
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/availability/my`, { withCredentials: true })
      .then(r => setSlots(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addSlot = async (e) => {
    e.preventDefault();
    if (newSlot.start_time >= newSlot.end_time) {
      setError("End time must be after start time");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/availability`, newSlot, { withCredentials: true });
      setSlots(prev => [...prev, data]);
      toast.success("Availability slot added");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add slot");
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (id) => {
    try {
      await axios.delete(`${API}/availability/${id}`, { withCredentials: true });
      setSlots(prev => prev.filter(s => s.id !== id));
      toast.success("Availability slot removed");
    } catch {
      toast.error("Failed to remove slot");
    }
  };

  // Group slots by weekday
  const byDay = WEEKDAYS.reduce((acc, day, i) => {
    acc[i] = slots.filter(s => s.weekday === i);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Availability</h1>
        <p className="text-slate-500 text-sm mt-1">Set your weekly recurring availability for patient bookings</p>
      </div>

      {user?.verification_status !== "approved" && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle size={16} className="text-amber-600" />
          <p className="text-sm text-amber-700">Your account needs to be verified before patients can book your slots. Get verified first to make your availability visible.</p>
        </div>
      )}

      {/* Add Slot Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add Availability Slot</h2>
        <form onSubmit={addSlot} data-testid="availability-form" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Day of Week</label>
            <select
              value={newSlot.weekday}
              onChange={e => setNewSlot(s => ({ ...s, weekday: +e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15"
            >
              {WEEKDAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Start Time</label>
            <select value={newSlot.start_time} onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">End Time</label>
            <select value={newSlot.end_time} onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {error && <p className="col-span-full text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
          <div className="col-span-full">
            <button type="submit" disabled={saving} data-testid="add-availability-btn" className="flex items-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</> : <><Plus size={16} /> Add Slot</>}
            </button>
          </div>
        </form>
      </div>

      {/* Weekly View */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Weekly Schedule</h2>
          <p className="text-xs text-slate-500 mt-0.5">Patients can book 30-minute slots within these windows</p>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className="flex items-start gap-4 px-5 py-3.5">
                <div className="w-24 shrink-0">
                  <p className={`text-sm font-semibold ${byDay[i].length > 0 ? "text-slate-800" : "text-slate-400"}`}>{day}</p>
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {byDay[i].length > 0 ? (
                    byDay[i].map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 bg-[#E6F4F4] border border-teal-200 rounded-lg px-3 py-1.5">
                        <Clock size={13} className="text-[#0D7377]" />
                        <span className="text-xs font-semibold text-[#0D7377]">{slot.start_time} – {slot.end_time}</span>
                        <button onClick={() => deleteSlot(slot.id)} className="text-slate-400 hover:text-rose-500 transition-colors ml-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No availability</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {slots.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle size={16} />
          You have {slots.length} active availability slot{slots.length !== 1 ? "s" : ""}. Patients can now book appointments with you.
        </div>
      )}
    </div>
  );
}
