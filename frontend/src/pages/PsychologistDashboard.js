import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, CheckCircle, AlertCircle, Brain, Shield, ChevronRight, Video } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusConfig = {
  booked: { label: "Scheduled", cls: "status-scheduled" },
  waiting: { label: "Waiting", cls: "status-waiting" },
  in_call: { label: "In Call", cls: "status-in_call" },
  completed: { label: "Completed", cls: "status-completed" },
};

export default function PsychologistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/appointments`, { withCredentials: true })
      .then(r => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isApproved = user?.verification_status === "approved";
  const upcoming = appointments.filter(a => ["booked", "waiting", "in_call"].includes(a.status));
  const completed = appointments.filter(a => a.status === "completed");
  const today = new Date().toDateString();
  const todaySessions = upcoming.filter(a => new Date(a.slot_iso).toDateString() === today);

  return (
    <div className="space-y-6 animate-fade-in-up" data-testid="professional-dashboard">
      {!isApproved && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle size={18} className="text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Verification Required</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {user?.verification_status === "under_review" ? "Your credentials are under review." : "Submit your qualifications to start accepting sessions."}
            </p>
          </div>
          <button onClick={() => navigate("/psychologist/verification")} className="text-xs text-[#0D7377] font-semibold hover:underline">
            {user?.verification_status === "pending" ? "Submit Now →" : "View →"}
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 text-white">
        <p className="text-white/70 text-sm mb-1">Welcome back,</p>
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.name}</h1>
        <p className="text-sm text-white/80">{user?.specialty || "Clinical Psychology"} · MediBridge Psychologist</p>
        {isApproved && (
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={() => navigate("/psychologist/appointments")} className="flex items-center gap-2 bg-white text-indigo-700 font-semibold px-4 py-2 rounded-xl text-sm">
              <Calendar size={16} /> My Sessions
            </button>
            <button onClick={() => navigate("/psychologist/availability")} className="flex items-center gap-2 bg-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm">
              <Clock size={16} /> Set Availability
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Sessions", value: todaySessions.length, icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Upcoming", value: upcoming.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", value: completed.length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Sessions", value: appointments.length, icon: Calendar, color: "text-slate-600", bg: "bg-slate-100" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}><Icon size={18} className={color} /></div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Today's Sessions</h2>
            <button onClick={() => navigate("/psychologist/appointments")} className="text-xs text-[#0D7377] hover:underline font-medium">View all</button>
          </div>
          {loading ? <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          : todaySessions.length > 0 ? (
            <div className="space-y-3">
              {todaySessions.map(apt => {
                const sc = statusConfig[apt.status] || statusConfig.booked;
                return (
                  <div key={apt.id} data-testid="professional-appointment-card" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">{apt.patient_name?.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{apt.patient_name}</p>
                      <p className="text-xs text-slate-500">{formatDate(apt.slot_iso)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                      {["booked", "waiting"].includes(apt.status) && isApproved && (
                        <button onClick={() => navigate(`/video/${apt.id}`)} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-indigo-700">
                          <Video size={12} /> Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8"><Calendar size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No sessions today</p></div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upcoming Sessions</h2>
          </div>
          {upcoming.slice(0, 4).length > 0 ? (
            <div className="space-y-2">
              {upcoming.slice(0, 4).map(apt => (
                <div key={apt.id} onClick={() => navigate(`/psychologist/consultation/${apt.id}`)} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-100 transition-all">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">{apt.patient_name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800">{apt.patient_name}</p><p className="text-xs text-slate-500">{formatDate(apt.slot_iso)}</p></div>
                  <ChevronRight size={15} className="text-slate-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8"><Clock size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No upcoming sessions</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
