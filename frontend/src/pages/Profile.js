import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Phone, Stethoscope, Brain, Leaf, Save, CheckCircle, Edit3, BadgeCheck } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleConfig = {
  patient: { label: "Patient", icon: User, color: "bg-emerald-50 text-emerald-700", badge: "Verified Patient" },
  doctor: { label: "Doctor", icon: Stethoscope, color: "bg-[#E6F4F4] text-[#0D7377]", badge: "Medical Doctor" },
  psychologist: { label: "Psychologist", icon: Brain, color: "bg-indigo-50 text-indigo-700", badge: "Clinical Psychologist" },
  nutritionist: { label: "Nutritionist", icon: Leaf, color: "bg-amber-50 text-amber-700", badge: "Registered Nutritionist" },
};

export default function Profile() {
  const { user, checkAuth } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", specialty: user?.specialty || "", bio: user?.bio || "", phone: user?.phone || "" });

  const rc = roleConfig[user?.role] || roleConfig.patient;
  const RoleIcon = rc.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/users/profile`, form, { withCredentials: true });
      await checkAuth();
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account information</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm text-[#0D7377] border border-[#0D7377]/30 hover:bg-[#E6F4F4] px-4 py-2 rounded-xl transition-colors font-medium">
            <Edit3 size={15} /> Edit Profile
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D7377] to-[#0284C7] p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.name}</h2>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white`}>
                  <RoleIcon size={12} /> {rc.badge}
                </span>
                {user?.verification_status === "approved" && (
                  <span className="flex items-center gap-1 text-xs text-emerald-300 font-medium">
                    <BadgeCheck size={13} /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-6 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15" />
              </div>
              {user?.role !== "patient" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Specialty / Area</label>
                  <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g., Cardiology, CBT" className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]" />
                </div>
              )}
              {user?.role !== "patient" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short professional bio..." rows={3} className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377] resize-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D7377]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><Save size={15} /> Save Changes</>}
                </button>
                <button onClick={() => { setEditing(false); setForm({ name: user?.name || "", specialty: user?.specialty || "", bio: user?.bio || "", phone: user?.phone || "" }); }} className="px-5 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { icon: User, label: "Full Name", value: user?.name },
                { icon: Mail, label: "Email Address", value: user?.email },
                ...(user?.phone ? [{ icon: Phone, label: "Phone", value: user.phone }] : []),
                ...(user?.specialty ? [{ icon: Stethoscope, label: "Specialty", value: user.specialty }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || "—"}</p>
                  </div>
                </div>
              ))}

              {user?.bio && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">About</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{user.bio}</p>
                </div>
              )}

              <div className="bg-[#E6F4F4] rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Account Details</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Role</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rc.color}`}>{rc.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-600">Verification</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${user?.verification_status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {user?.verification_status === "not_required" ? "N/A" : user?.verification_status || "Pending"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
