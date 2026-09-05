import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Stethoscope, Brain, Leaf, ArrowRight, Shield, AlertTriangle, CheckCircle } from "lucide-react";

const LOGO = "https://customer-assets-v7afamib.emergentagent.net/job_22cdbcd2-07d5-4e45-a6a8-bcb0b0b223b9/artifacts/b567qsfr_MediBridge_LOGO.jpeg";

const roles = [
  {
    id: "patient",
    icon: User,
    label: "Patient",
    description: "Book consultations, access AI pre-screening, receive e-prescriptions and session summaries.",
    color: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50",
    iconBg: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
    tag: "For Patients",
  },
  {
    id: "doctor",
    icon: Stethoscope,
    label: "Doctor",
    description: "Conduct video consultations, manage appointments, issue e-prescriptions.",
    color: "border-teal-200 hover:border-[#0D7377] hover:bg-[#E6F4F4]/50",
    iconBg: "bg-[#E6F4F4] text-[#0D7377]",
    badge: "bg-[#E6F4F4] text-[#0D7377]",
    tag: "Medical Doctor",
  },
  {
    id: "psychologist",
    icon: Brain,
    label: "Psychologist",
    description: "Provide mental health sessions, deliver session summaries and follow-up recommendations.",
    color: "border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50",
    iconBg: "bg-indigo-100 text-indigo-700",
    badge: "bg-indigo-50 text-indigo-700",
    tag: "Mental Health",
  },
  {
    id: "nutritionist",
    icon: Leaf,
    label: "Nutritionist",
    description: "Guide patients on diet, lifestyle, and nutrition with personalized consultation summaries.",
    color: "border-amber-200 hover:border-amber-500 hover:bg-amber-50/50",
    iconBg: "bg-amber-100 text-amber-700",
    badge: "bg-amber-50 text-amber-700",
    tag: "Nutrition & Diet",
  },
];

const features = [
  "AI-assisted pre-consultation intake",
  "1-to-1 secure video consultations",
  "E-prescriptions & session summaries",
  "Professional verification system",
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen bg-[#FAFCFF]">
      {/* Demo Banner */}
      <div className="bg-slate-900 text-slate-100 text-xs py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <AlertTriangle size={12} className="text-amber-400" />
        Demo Build — Synthetic Data Only — Not for Clinical Use
        <AlertTriangle size={12} className="text-amber-400" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <img src={LOGO} alt="MediBridge" className="h-16 mx-auto mb-6 object-contain" />
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome to <span className="text-[#0D7377]">MediBridge</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-6">
            Your seamless telehealth platform connecting patients with doctors, psychologists, and nutritionists.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {features.map((f) => (
              <span key={f} className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1.5">
                <CheckCircle size={12} className="text-[#0D7377]" /> {f}
              </span>
            ))}
          </div>
        </div>

        {/* Role Cards */}
        <div className="mb-8">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400 mb-6">Select your role to continue</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map(({ id, icon: Icon, label, description, color, iconBg, badge, tag }) => (
              <div
                key={id}
                data-testid={`role-select-${id}`}
                onClick={() => setSelected(id)}
                className={`relative bg-white border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 ${color} ${selected === id ? "ring-2 ring-offset-1 ring-[#0D7377] shadow-md" : "shadow-sm"}`}
              >
                {selected === id && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-[#0D7377] rounded-full flex items-center justify-center">
                    <CheckCircle size={12} className="text-white" />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
                  <Icon size={22} />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge} mb-3 inline-block`}>{tag}</span>
                <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {selected && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up">
            <button
              data-testid="continue-login-btn"
              onClick={() => navigate(`/login/${selected}`)}
              className="flex items-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white font-semibold px-8 py-3 rounded-xl shadow-sm transition-all duration-150 active:scale-[0.99]"
            >
              Sign In as {roles.find(r => r.id === selected)?.label}
              <ArrowRight size={18} />
            </button>
            <button
              data-testid="continue-register-btn"
              onClick={() => navigate(`/register/${selected}`)}
              className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-[#0D7377] text-slate-700 hover:text-[#0D7377] font-semibold px-8 py-3 rounded-xl transition-all duration-150"
            >
              Create Account
            </button>
          </div>
        )}

        {!selected && (
          <p className="text-center text-slate-400 text-sm mt-4">Select a role above to continue</p>
        )}

        {/* Demo credentials hint */}
        <div className="mt-10 max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-[#0D7377] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Demo Credentials</p>
              <p className="text-xs text-slate-500">
                Patient: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">john.doe@demo.mb.com</code> / <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Demo@1234</code>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Doctor: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">dr.james.wilson@demo.mb.com</code> / <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Demo@1234</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
