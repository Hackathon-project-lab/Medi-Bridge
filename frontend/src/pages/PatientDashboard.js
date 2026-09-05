import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, PlayCircle, Users, FileText, Clock, CheckCircle, ArrowRight, Pill, Stethoscope, Brain, Leaf, RefreshCw } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  booked: { label: "Scheduled", cls: "status-scheduled" },
  waiting: { label: "Waiting", cls: "status-waiting" },
  in_call: { label: "In Call", cls: "status-in_call" },
  completed: { label: "Completed", cls: "status-completed" },
  rescheduled: { label: "Rescheduled", cls: "status-rescheduled" },
  cancelled: { label: "Cancelled", cls: "status-cancelled" },
  no_show: { label: "No Show", cls: "status-no_show" },
};

const roleIcon = { doctor: Stethoscope, psychologist: Brain, nutritionist: Leaf };

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await axios.get(`${API}/appointments`, { withCredentials: true });
      setAppointments(data);
    } catch {}
    finally { setLoading(false); }
  };

  const upcoming = appointments.filter(a => ["booked", "waiting", "in_call", "rescheduled"].includes(a.status)).slice(0, 3);
  const past = appointments.filter(a => a.status === "completed").slice(0, 3);
  const nextAppt = upcoming[0];

  return (
    <div className="space-y-6 animate-fade-in-up" data-testid="patient-dashboard">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#0D7377] to-[#0284C7] rounded-2xl p-6 text-white">
        <p className="text-white/70 text-sm mb-1">Good day,</p>
        <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {user?.name}
        </h1>
        <div className="flex flex-wrap gap-3">
          <button
            data-testid="start-consultation-btn"
            onClick={() => navigate("/patient/preconsultation")}
            className="flex items-center gap-2 bg-white text-[#0D7377] font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
          >
            <PlayCircle size={17} /> Start New Consultation
          </button>
          <button
            data-testid="find-professionals-btn"
            onClick={() => navigate("/patient/find")}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Users size={17} /> Find Professionals
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Upcoming", value: upcoming.length, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", value: past.length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "E-Prescriptions", value: appointments.filter(a => a.e_prescription).length, icon: Pill, color: "text-[#0D7377]", bg: "bg-[#E6F4F4]" },
          { label: "Total Sessions", value: appointments.length, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Appointment */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upcoming Appointment</h2>
            <button onClick={() => navigate("/patient/appointments")} className="text-xs text-[#0D7377] hover:underline font-medium">View all</button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : nextAppt ? (
            <div className="space-y-3">
              {upcoming.map(apt => {
                const Icon = roleIcon[apt.professional_role] || Stethoscope;
                const sc = statusConfig[apt.status] || statusConfig.booked;
                return (
                  <div key={apt.id} data-testid="appointment-card" className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-9 h-9 bg-[#E6F4F4] rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={17} className="text-[#0D7377]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{apt.professional_name}</p>
                      <p className="text-xs text-slate-500">{apt.professional_specialty}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Clock size={11} />{formatDate(apt.slot_iso)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                      {["booked", "waiting"].includes(apt.status) && (
                        <button onClick={() => navigate(`/waiting/${apt.id}`)} className="text-xs text-[#0D7377] font-semibold hover:underline">Join →</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No upcoming appointments</p>
              <button onClick={() => navigate("/patient/preconsultation")} className="mt-3 text-xs text-[#0D7377] font-semibold hover:underline">Start a consultation</button>
            </div>
          )}
        </div>

        {/* Recent Consultations */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Consultations</h2>
            <button onClick={() => navigate("/patient/appointments")} className="text-xs text-[#0D7377] hover:underline font-medium">View all</button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : past.length > 0 ? (
            <div className="space-y-3">
              {past.map(apt => {
                const Icon = roleIcon[apt.professional_role] || Stethoscope;
                return (
                  <div key={apt.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:border-[#0D7377]/30 transition-colors" onClick={() => navigate(`/patient/consultation/${apt.id}`)}>
                    <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={17} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{apt.professional_name}</p>
                      <p className="text-xs text-slate-500">{formatDate(apt.slot_iso)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.e_prescription && <span className="text-xs bg-[#E6F4F4] text-[#0D7377] px-1.5 py-0.5 rounded font-medium">Rx</span>}
                      <ArrowRight size={15} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No completed consultations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Find Doctor", icon: Stethoscope, color: "text-[#0D7377]", bg: "bg-[#E6F4F4]", action: () => navigate("/patient/find?role=doctor") },
            { label: "Find Psychologist", icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50", action: () => navigate("/patient/find?role=psychologist") },
            { label: "Find Nutritionist", icon: Leaf, color: "text-amber-600", bg: "bg-amber-50", action: () => navigate("/patient/find?role=nutritionist") },
            { label: "My Prescriptions", icon: Pill, color: "text-rose-600", bg: "bg-rose-50", action: () => navigate("/patient/appointments") },
          ].map(({ label, icon: Icon, color, bg, action }) => (
            <button key={label} onClick={action} className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 hover:border-slate-200 transition-all duration-150">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
              <span className="text-xs font-medium text-slate-600 text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
