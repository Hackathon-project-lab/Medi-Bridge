import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, AlertCircle, User, Stethoscope, Brain, Leaf, ArrowLeft, AlertTriangle } from "lucide-react";

const LOGO = "https://customer-assets-v7afamib.emergentagent.net/job_22cdbcd2-07d5-4e45-a6a8-bcb0b0b223b9/artifacts/b567qsfr_MediBridge_LOGO.jpeg";

const roleConfig = {
  patient: { icon: User, label: "Patient", color: "text-emerald-700", bg: "bg-emerald-50" },
  doctor: { icon: Stethoscope, label: "Doctor", color: "text-[#0D7377]", bg: "bg-[#E6F4F4]" },
  psychologist: { icon: Brain, label: "Psychologist", color: "text-indigo-700", bg: "bg-indigo-50" },
  nutritionist: { icon: Leaf, label: "Nutritionist", color: "text-amber-700", bg: "bg-amber-50" },
};

function formatError(detail) {
  if (!detail) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function Auth({ mode }) {
  const navigate = useNavigate();
  const { role } = useParams();
  const { login, register, getDashboardPath } = useAuth();

  const [form, setForm] = useState({ email: "", password: "", name: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const config = roleConfig[role] || roleConfig.patient;
  const RoleIcon = config.icon;
  const isRegister = mode === "register";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister) {
      if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    }

    setLoading(true);
    try {
      let user;
      if (isRegister) {
        user = await register(form.email, form.password, form.name, role);
      } else {
        user = await login(form.email, form.password);
      }
      navigate(getDashboardPath(user));
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFCFF] flex flex-col">
      {/* Demo Banner */}
      <div className="bg-slate-900 text-slate-100 text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <AlertTriangle size={12} className="text-amber-400" />
        Demo Build — Synthetic Data Only — Not for Clinical Use
        <AlertTriangle size={12} className="text-amber-400" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          {/* Back */}
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0D7377] mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to role selection
          </Link>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {/* Logo + Role */}
            <div className="text-center mb-8">
              <img src={LOGO} alt="MediBridge" className="h-10 mx-auto mb-4 object-contain" />
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-4 ${config.bg} ${config.color}`}>
                <RoleIcon size={15} />
                {config.label}
              </div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isRegister ? `Create ${config.label} Account` : `Sign in as ${config.label}`}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isRegister ? "Join MediBridge today" : "Welcome back to MediBridge"}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3 mb-4">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} data-testid={isRegister ? "register-form" : "login-form"} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input
                    data-testid="auth-name-input"
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Dr. John Smith"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input
                  data-testid="auth-email-input"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    data-testid="auth-password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={isRegister ? "Min. 6 characters" : "Your password"}
                    className="w-full px-4 py-2.5 pr-10 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat password"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15 transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                data-testid="auth-submit-btn"
                disabled={loading}
                className="w-full bg-[#0D7377] hover:bg-[#095457] disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-sm transition-all duration-150 active:scale-[0.99] mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isRegister ? "Creating account..." : "Signing in..."}
                  </span>
                ) : (
                  isRegister ? "Create Account" : "Sign In"
                )}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-center text-sm text-slate-500 mt-6">
              {isRegister ? "Already have an account? " : "Don't have an account? "}
              <Link to={isRegister ? `/login/${role}` : `/register/${role}`} className="text-[#0D7377] font-semibold hover:underline">
                {isRegister ? "Sign In" : "Create one"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
