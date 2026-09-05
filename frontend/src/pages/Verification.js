import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, CheckCircle, Clock, AlertCircle, FileText, Send } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  not_submitted: { label: "Not Submitted", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock },
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  under_review: { label: "Under Review", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertCircle },
  not_required: { label: "Not Required", color: "bg-slate-50 text-slate-500 border-slate-200", icon: CheckCircle },
};

const roleLabels = { doctor: "Medical Doctor", psychologist: "Clinical Psychologist", nutritionist: "Registered Nutritionist/Dietitian" };

export default function Verification() {
  const { user } = useAuth();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.name || "",
    specialty: user?.specialty || "",
    qualification: "",
    institution: "",
    license_number: "",
    additional_info: "",
  });

  useEffect(() => {
    axios.get(`${API}/professionals/verification`, { withCredentials: true })
      .then(r => {
        setVerification(r.data);
        if (r.data?.status !== "not_submitted") {
          setForm(f => ({
            ...f,
            full_name: r.data.full_name || f.full_name,
            specialty: r.data.specialty || f.specialty,
            qualification: r.data.qualification || "",
            institution: r.data.institution || "",
            license_number: r.data.license_number || "",
            additional_info: r.data.additional_info || "",
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/professionals/verification`, form, { withCredentials: true });
      setVerification({ status: "under_review", ...form });
      toast.success("Verification submitted successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const vs = verification?.status || user?.verification_status || "pending";
  const sc = statusConfig[vs] || statusConfig.pending;
  const StatusIcon = sc.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Professional Verification</h1>
        <p className="text-slate-500 text-sm mt-1">Submit your credentials to be verified and start accepting patients</p>
      </div>

      {/* Status Badge */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${sc.color}`}>
        <div className="flex items-center gap-3">
          <StatusIcon size={20} />
          <div>
            <p className="font-semibold text-sm">Verification Status: {sc.label}</p>
            {vs === "under_review" && <p className="text-xs mt-0.5 opacity-80">Your documents are being reviewed. This typically takes 1-2 business days.</p>}
            {vs === "approved" && <p className="text-xs mt-0.5 opacity-80">You are verified and can accept patient appointments.</p>}
            {vs === "rejected" && <p className="text-xs mt-0.5 opacity-80">Your verification was rejected. Please resubmit with correct documents.</p>}
            {vs === "pending" && <p className="text-xs mt-0.5 opacity-80">Please submit your credentials to get verified.</p>}
          </div>
        </div>
        <div className="text-xs font-semibold bg-white/50 px-2 py-1 rounded-lg">{roleLabels[user?.role]}</div>
      </div>

      {/* Demo Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Demo Verification Process</p>
          <p className="text-xs text-amber-700 mt-0.5">In this demo, verification is simulated. Submitted forms are reviewed and approved in a mock workflow. Pre-seeded demo accounts are already approved.</p>
        </div>
      </div>

      {/* Form */}
      {vs !== "approved" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {vs === "under_review" ? "Update Submission" : "Submit Credentials"}
          </h2>
          <form onSubmit={handleSubmit} data-testid="verification-form" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. Full Name" className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Specialty / Area</label>
                <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g., Cardiology, CBT, Sports Nutrition" className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Qualification <span className="text-rose-500">*</span></label>
                <input required value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="e.g., MD, PhD, RD" className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Institution <span className="text-rose-500">*</span></label>
                <input required value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="University / Medical School" className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">License / Registration Number</label>
                <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} placeholder="Professional license number" className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Information</label>
              <textarea value={form.additional_info} onChange={e => setForm(f => ({ ...f, additional_info: e.target.value }))} placeholder="Any additional relevant information (years of experience, specializations, etc.)" rows={3} className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] resize-none" />
            </div>

            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-5 text-center">
              <Upload size={24} className="text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Document Upload</p>
              <p className="text-xs text-slate-400 mt-1">Certificate & degree uploads available in the full production version.</p>
              <p className="text-xs text-slate-400">For this demo, submit the form above to proceed.</p>
            </div>

            <button type="submit" disabled={submitting} data-testid="submit-verification-btn" className="flex items-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-60">
              {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</> : <><Send size={16} /> Submit for Verification</>}
            </button>
          </form>
        </div>
      )}

      {vs === "approved" && (
        <div className="bg-white border border-emerald-200 rounded-xl p-6 text-center">
          <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Verification Complete</h3>
          <p className="text-sm text-slate-500">Your profile is verified. Patients can now find and book appointments with you. Make sure to set your availability schedule.</p>
        </div>
      )}
    </div>
  );
}
