import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, FileText, Pill, CheckCircle, User, Calendar, Download, Stethoscope, Brain, Leaf, Clock } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const roleLabel = { doctor: "Medical Consultation", psychologist: "Psychology Session", nutritionist: "Nutrition Consultation" };
const roleIcon = { doctor: Stethoscope, psychologist: Brain, nutritionist: Leaf };

export default function PostConsultation() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/consultations/${id}`, { withCredentials: true })
      .then(r => setConsultation(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const isPatient = user?.role === "patient";
  const ProfIcon = roleIcon[consultation?.professional_role] || Stethoscope;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded-lg w-1/3" />
        <div className="h-40 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="text-center py-16">
        <FileText size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Consultation not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-[#0D7377] hover:underline text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {roleLabel[consultation.professional_role] || "Consultation"} Record
          </h1>
          <p className="text-slate-500 text-sm">{formatDate(consultation.slot_iso)} at {formatTime(consultation.slot_iso)}</p>
        </div>
      </div>

      {/* Consultation Info Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#0D7377] to-[#0284C7] p-5 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ProfIcon size={24} />
              </div>
              <div>
                <p className="font-bold text-lg">{isPatient ? consultation.professional_name : consultation.patient_name}</p>
                <p className="text-white/80 text-sm">{isPatient ? consultation.professional_specialty : "Patient"}</p>
              </div>
            </div>
            <span className="bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> Completed
            </span>
          </div>
          <div className="flex gap-4 mt-4 text-sm text-white/80">
            <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(consultation.slot_iso)}</span>
            <span className="flex items-center gap-1"><Clock size={13} /> {formatTime(consultation.slot_iso)}</span>
          </div>
        </div>

        {/* Summary */}
        {consultation.final_summary && (
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText size={14} className="text-[#0D7377]" />
              {consultation.professional_role === "doctor" ? "Clinical Summary" : consultation.professional_role === "psychologist" ? "Session Summary" : "Consultation Summary"}
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed">{consultation.final_summary.summary}</p>
            {consultation.final_summary.recommendations?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recommendations</p>
                <ul className="space-y-1.5">
                  {consultation.final_summary.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {consultation.final_summary.follow_up && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <span className="font-semibold">Follow-up: </span>{consultation.final_summary.follow_up}
              </div>
            )}
          </div>
        )}
      </div>

      {/* E-Prescription */}
      {consultation.e_prescription && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="prescription-card">
          <div className="bg-[#E6F4F4] border-b border-teal-100 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill size={18} className="text-[#0D7377]" />
              <div>
                <h3 className="font-semibold text-[#0D7377]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>E-Prescription</h3>
                <p className="text-xs text-slate-500">{consultation.e_prescription.prescription_number}</p>
              </div>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs text-[#0D7377] hover:bg-white border border-[#0D7377]/30 px-3 py-1.5 rounded-lg transition-colors">
              <Download size={13} /> Save / Print
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500 text-xs uppercase tracking-wide">Patient</span><p className="font-semibold text-slate-800 mt-0.5">{consultation.e_prescription.patient_name}</p></div>
              <div><span className="text-slate-500 text-xs uppercase tracking-wide">Prescribing Doctor</span><p className="font-semibold text-slate-800 mt-0.5">{consultation.e_prescription.doctor_name}</p></div>
              {consultation.e_prescription.diagnosis && (
                <div className="col-span-2"><span className="text-slate-500 text-xs uppercase tracking-wide">Diagnosis</span><p className="font-semibold text-slate-800 mt-0.5">{consultation.e_prescription.diagnosis}</p></div>
              )}
            </div>

            {consultation.e_prescription.medications?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Medications</p>
                <div className="space-y-2">
                  {consultation.e_prescription.medications.map((med, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-slate-900 text-sm">{med.name}</p>
                        <span className="text-xs text-slate-500">{med.dosage}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-slate-500">
                        <span>{med.frequency}</span>
                        {med.duration && <span>· {med.duration}</span>}
                      </div>
                      {med.instructions && <p className="text-xs text-slate-500 mt-1 italic">{med.instructions}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {consultation.e_prescription.instructions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <span className="font-semibold">Instructions: </span>{consultation.e_prescription.instructions}
              </div>
            )}
            {consultation.e_prescription.follow_up && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                <span className="font-semibold">Follow-up: </span>{consultation.e_prescription.follow_up}
              </div>
            )}

            <p className="text-xs text-slate-400 italic mt-2">Demo prescription — Not for clinical use. Issued on {formatDate(consultation.e_prescription.issued_at)}.</p>
          </div>
        </div>
      )}

      {/* No summary yet */}
      {!consultation.final_summary && !consultation.e_prescription && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <FileText size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Summary not yet available</p>
          <p className="text-slate-400 text-sm mt-1">The healthcare professional will complete the consultation record.</p>
        </div>
      )}
    </div>
  );
}
