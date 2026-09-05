import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowRight, Video, Pill, Shield, UserCheck, ChevronRight } from "lucide-react";
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
  rescheduled: { label: "Rescheduled", cls: "status-rescheduled" },
};

export default function DoctorDashboard() {
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

  const verificationStatus = user?.verification_status;
  const isApproved = verificationStatus === "approved";
  const upcoming = appointments.filter(a => ["booked", "waiting", "in_call"].includes(a.status));
  const completed = appointments.filter(a => a.status === "completed");
  const today = new Date().toDateString();
  const todayApts = upcoming.filter(a => new Date(a.slot_iso).toDateString() === today);

  return (
    <div className="space-y-6 animate-fade-in-up" data-testid="professional-dashboard">
      {/* Verification Alert */}
      {!isApproved && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${verificationStatus === "pending" ? "bg-amber-50 border-amber-200" : verificationStatus === "under_review" ? "bg-blue-50 border-blue-200" : verificationStatus === "rejected" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>
          <AlertCircle size={18} className={verificationStatus === "rejected" ? "text-rose-600" : "text-amber-600"} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {verificationStatus === "pending" && "Verification Required"}
              {verificationStatus === "under_review" && "Verification Under Review"}
              {verificationStatus === "rejected" && "Verification Rejected"}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {verificationStatus === "pending" && "Submit your qualifications to start accepting appointments."}
              {verificationStatus === "under_review" && "Your documents are being reviewed. You'll be notified once approved."}
              {verificationStatus === "rejected" && "Your verification was rejected. Please re-submit with correct documents."}
            </p>
          </div>
          <button onClick={() => navigate("/doctor/verification")} className="text-xs text-[#0D7377] font-semibold hover:underline whitespace-nowrap">
            {verificationStatus === "pending" ? "Submit Now" : "View Details"} →
          </button>
        </div>
      )}

      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#0D7377] to-[#0284C7] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.name}</h1>
            <p className="text-sm text-white/80">{user?.specialty || "General Practice"} · MediBridge Doctor</p>
          </div>
          {isApproved && <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold"><Shield size={13} /> Verified</div>}
        </div>
        {isApproved && (
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={() => navigate("/doctor/appointments")} className="flex items-center gap-2 bg-white text-[#0D7377] font-semibold px-4 py-2 rounded-xl text-sm hover:bg-white/90 transition-colors">
              <Calendar size={16} /> My Appointments
            </button>
            <button onClick={() => navigate("/doctor/availability")} className="flex items-center gap-2 bg-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-white/30 transition-colors">
              <Clock size={16} /> Set Availability
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Appointments", value: todayApts.length, icon: Calendar, color: "text-[#0D7377]", bg: "bg-[#E6F4F4]" },
          { label: "Upcoming", value: upcoming.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", value: completed.length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "E-Prescriptions", value: appointments.filter(a => a.e_prescription).length, icon: Pill, color: "text-indigo-600", bg: "bg-indigo-50" },
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
        {/* Today's Appointments */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Today's Appointments</h2>
            <button onClick={() => navigate("/doctor/appointments")} className="text-xs text-[#0D7377] hover:underline font-medium">View all</button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : todayApts.length > 0 ? (
            <div className="space-y-3">
              {todayApts.map(apt => {
                const sc = statusConfig[apt.status] || statusConfig.booked;
                return (
                  <div key={apt.id} data-testid="professional-appointment-card" className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-9 h-9 bg-[#E6F4F4] rounded-full flex items-center justify-center text-[#0D7377] font-bold text-sm">
                      {apt.patient_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{apt.patient_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={11} />{formatDate(apt.slot_iso)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                      {["booked", "waiting"].includes(apt.status) && isApproved && (
                        <button onClick={() => navigate(`/video/${apt.id}`)} className="flex items-center gap-1 text-xs bg-[#0D7377] text-white px-2.5 py-1 rounded-lg font-medium hover:bg-[#095457]">
                          <Video size={12} /> Join
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No appointments today</p>
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upcoming Appointments</h2>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : upcoming.slice(0, 4).length > 0 ? (
            <div className="space-y-2">
              {upcoming.slice(0, 4).map(apt => (
                <div key={apt.id} onClick={() => navigate(`/doctor/consultation/${apt.id}`)} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-100 transition-all">
                  <div className="w-8 h-8 bg-[#E6F4F4] rounded-full flex items-center justify-center text-[#0D7377] font-bold text-sm">
                    {apt.patient_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{apt.patient_name}</p>
                    <p className="text-xs text-slate-500">{formatDate(apt.slot_iso)}</p>
                  </div>
                  <ChevronRight size={15} className="text-slate-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No upcoming appointments</p>
              {!isApproved && <p className="text-xs text-amber-600 mt-1">Get verified to receive appointments</p>}
            </div>
          )}
        </div>
      </div>

      {/* Verification CTA for approved docs */}
      {isApproved && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E6F4F4] rounded-xl flex items-center justify-center">
                <UserCheck size={20} className="text-[#0D7377]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Verification Status</p>
                <p className="text-xs text-slate-500">Your profile is verified and active</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <CheckCircle size={13} /> Approved
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
