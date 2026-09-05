import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, Video, ChevronRight, FileText, RefreshCw, Stethoscope, Brain, Leaf, CheckCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

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

const FILTERS = ["all", "booked", "waiting", "in_call", "completed", "cancelled"];

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const isPatient = user?.role === "patient";

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/appointments`, { withCredentials: true });
      setAppointments(data);
    } catch {}
    finally { setLoading(false); }
  };

  const filtered = filter === "all" ? appointments : appointments.filter(a => a.status === filter);

  const canJoin = (apt) => ["booked", "waiting", "in_call"].includes(apt.status);

  const handleJoin = (apt) => {
    if (apt.status === "in_call" || apt.status === "waiting") {
      navigate(isPatient ? `/waiting/${apt.id}` : `/video/${apt.id}`);
    } else {
      navigate(isPatient ? `/waiting/${apt.id}` : `/video/${apt.id}`);
    }
  };

  const handleView = (apt) => {
    navigate(`/${user.role}/consultation/${apt.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {isPatient ? "My Appointments" : user?.role === "psychologist" ? "My Sessions" : "My Appointments"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{appointments.length} total · {appointments.filter(a => ["booked", "waiting", "in_call"].includes(a.status)).length} upcoming</p>
        </div>
        <button onClick={fetchAppointments} className="p-2 text-slate-400 hover:text-[#0D7377] hover:bg-[#E6F4F4] rounded-lg transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const sc = statusConfig[f];
          return (
            <button
              key={f}
              data-testid={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filter === f ? "bg-[#0D7377] text-white border-[#0D7377]" : "bg-white text-slate-600 border-slate-200 hover:border-[#0D7377]/50"}`}
            >
              {f === "all" ? "All" : sc?.label || f}
              {f !== "all" && <span className="ml-1.5 text-xs opacity-70">({appointments.filter(a => a.status === f).length})</span>}
            </button>
          );
        })}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(apt => {
            const sc = statusConfig[apt.status] || statusConfig.booked;
            const Icon = roleIcon[apt.professional_role] || Stethoscope;
            return (
              <div key={apt.id} data-testid="appointment-card" className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#E6F4F4] rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={22} className="text-[#0D7377]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-base">
                          {isPatient ? apt.professional_name : apt.patient_name}
                        </p>
                        <p className="text-sm text-slate-500">{isPatient ? apt.professional_specialty : "Patient"}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(apt.slot_iso)}</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatTime(apt.slot_iso)}</span>
                          {apt.consultation_type && <span className="flex items-center gap-1"><Video size={11} /> Video</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                        {apt.e_prescription && <span className="text-xs bg-[#E6F4F4] text-[#0D7377] px-2 py-0.5 rounded font-medium">Rx</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {canJoin(apt) && (
                        <button
                          onClick={() => handleJoin(apt)}
                          data-testid="join-appointment-btn"
                          className="flex items-center gap-1.5 bg-[#0D7377] hover:bg-[#095457] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          <Video size={13} /> {apt.status === "in_call" ? "Rejoin Call" : "Join Call"}
                        </button>
                      )}
                      {apt.status === "completed" && (
                        <button onClick={() => handleView(apt)} className="flex items-center gap-1.5 text-slate-600 hover:text-[#0D7377] text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 hover:border-[#0D7377]/30 transition-all">
                          <FileText size={13} /> View Record
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <Calendar size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No {filter === "all" ? "" : filter + " "}appointments</p>
          {isPatient && filter === "all" && (
            <button onClick={() => navigate("/patient/preconsultation")} className="mt-3 text-sm text-[#0D7377] font-semibold hover:underline">
              Start your first consultation →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
