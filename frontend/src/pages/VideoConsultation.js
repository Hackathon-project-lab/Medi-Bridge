import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneOff, FileText, User, ChevronRight, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VideoConsultation() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [roomUrl, setRoomUrl] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completing, setCompleting] = useState(false);

  // E-prescription form (doctor)
  const [rx, setRx] = useState({ diagnosis: "", instructions: "", follow_up: "", medications: [{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }] });
  // Summary form (psych/nutritionist)
  const [summary, setSummary] = useState({ summary: "", recommendations: [""], follow_up: "" });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    try {
      const { data: apt } = await axios.get(`${API}/appointments/${id}`, { withCredentials: true });
      setAppointment(apt);

      // Create room if professional or if room already exists
      const { data: roomData } = await axios.post(`${API}/video/create-room/${id}`, {}, { withCredentials: true });
      setRoomUrl(roomData.room_url);

      // Get token
      const { data: tokenData } = await axios.post(`${API}/video/token/${id}`, {}, { withCredentials: true });
      setToken(tokenData.token);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to setup video room");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!showCompletion) { setShowCompletion(true); return; }
    setCompleting(true);
    try {
      if (user.role === "doctor") {
        await axios.post(`${API}/consultations/${id}/eprescription`, rx, { withCredentials: true });
      } else {
        const summaryData = { ...summary, recommendations: summary.recommendations.filter(r => r.trim()) };
        await axios.post(`${API}/consultations/${id}/summary`, summaryData, { withCredentials: true });
      }
      navigate(`/${user.role}/consultation/${id}`);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to complete consultation");
    } finally {
      setCompleting(false);
    }
  };

  const addMedication = () => setRx(r => ({ ...r, medications: [...r.medications, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }] }));
  const updateMed = (i, k, v) => setRx(r => { const m = [...r.medications]; m[i] = { ...m[i], [k]: v }; return { ...r, medications: m }; });
  const removeMed = (i) => setRx(r => ({ ...r, medications: r.medications.filter((_, idx) => idx !== i) }));
  const addRec = () => setSummary(s => ({ ...s, recommendations: [...s.recommendations, ""] }));
  const updateRec = (i, v) => setSummary(s => { const r = [...s.recommendations]; r[i] = v; return { ...s, recommendations: r }; });

  const isProfessional = user?.role !== "patient";
  const frameUrl = roomUrl && token ? `${roomUrl}?t=${token}` : roomUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center text-white"><div className="w-10 h-10 border-4 border-[#0D7377] border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p>Setting up consultation room...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center text-white max-w-md">
          <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Room Setup Failed</h2>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          {roomUrl && <a href={roomUrl} target="_blank" rel="noreferrer" className="text-[#0D7377] underline text-sm">Open room in new tab</a>}
          <button onClick={() => navigate(-1)} className="block mt-4 mx-auto bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Main Video */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">Live Consultation</span>
            <span className="text-slate-400 text-xs">· {appointment?.professional_name || appointment?.patient_name}</span>
          </div>
          <div className="flex items-center gap-3">
            {isProfessional && (
              <button onClick={handleComplete} className="flex items-center gap-1.5 bg-[#0D7377] hover:bg-[#095457] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                <CheckCircle size={14} /> Complete Consultation
              </button>
            )}
            <button onClick={() => { isProfessional ? handleComplete() : navigate(-1); }} data-testid="end-call-btn" className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              <PhoneOff size={14} /> End Call
            </button>
          </div>
        </div>

        {/* Daily.co iFrame */}
        {frameUrl ? (
          <iframe
            src={frameUrl}
            allow="microphone; camera; autoplay; fullscreen; display-capture; screen-wake-lock"
            className="flex-1 w-full border-none"
            title="Video Consultation"
            style={{ minHeight: 0 }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400"><div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p>Connecting...</p></div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-white text-sm font-semibold">Consultation Details</h3>
        </div>

        {!showCompletion ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Patient/Professional info */}
            <div className="bg-slate-700 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {(isProfessional ? appointment?.patient_name : appointment?.professional_name)?.charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{isProfessional ? appointment?.patient_name : appointment?.professional_name}</p>
                  <p className="text-slate-400 text-xs">{isProfessional ? "Patient" : appointment?.professional_specialty}</p>
                </div>
              </div>
            </div>

            {/* Pre-consultation context for professionals */}
            {isProfessional && appointment?.pre_consultation_data && (
              <div className="bg-slate-700 rounded-xl p-3">
                <h4 className="text-slate-300 text-xs font-semibold uppercase tracking-wide mb-2">Pre-Consultation Context</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {appointment.pre_consultation_data.messages?.filter(m => m.role === "user").slice(-5).map((m, i) => (
                    <div key={i} className="bg-slate-600 rounded-lg px-2.5 py-2 text-xs text-slate-300">{m.content}</div>
                  ))}
                </div>
              </div>
            )}

            {isProfessional && (
              <button onClick={() => setShowCompletion(true)} className="w-full flex items-center justify-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                <FileText size={16} /> {user.role === "doctor" ? "Create E-Prescription" : "Create Summary"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setShowCompletion(false)} className="text-slate-400 hover:text-white text-xs">← Back</button>
              <h4 className="text-white text-sm font-semibold">
                {user.role === "doctor" ? "E-Prescription" : "Session Summary"}
              </h4>
            </div>

            {user.role === "doctor" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Diagnosis</label>
                  <input value={rx.diagnosis} onChange={e => setRx(r => ({ ...r, diagnosis: e.target.value }))} placeholder="Diagnosis..." className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0D7377]" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 text-xs">Medications</label>
                    <button onClick={addMedication} className="text-xs text-[#0D7377] flex items-center gap-1"><Plus size={11} /> Add</button>
                  </div>
                  {rx.medications.map((med, i) => (
                    <div key={i} className="bg-slate-700 rounded-xl p-3 mb-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Medication {i + 1}</span>
                        {i > 0 && <button onClick={() => removeMed(i)} className="text-rose-400 hover:text-rose-300"><Trash2 size={12} /></button>}
                      </div>
                      {[["name","Medication name"],["dosage","Dosage"],["frequency","Frequency"],["duration","Duration"]].map(([k, p]) => (
                        <input key={k} value={med[k]} onChange={e => updateMed(i, k, e.target.value)} placeholder={p} className="w-full bg-slate-600 border border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0D7377]" />
                      ))}
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Instructions</label>
                  <textarea value={rx.instructions} onChange={e => setRx(r => ({ ...r, instructions: e.target.value }))} placeholder="General instructions..." rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0D7377] resize-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Follow-up</label>
                  <input value={rx.follow_up} onChange={e => setRx(r => ({ ...r, follow_up: e.target.value }))} placeholder="Follow-up instructions..." className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0D7377]" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Session Summary</label>
                  <textarea value={summary.summary} onChange={e => setSummary(s => ({ ...s, summary: e.target.value }))} placeholder="Summary of the session..." rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0D7377] resize-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 text-xs">Recommendations</label>
                    <button onClick={addRec} className="text-xs text-[#0D7377] flex items-center gap-1"><Plus size={11} /> Add</button>
                  </div>
                  {summary.recommendations.map((r, i) => (
                    <input key={i} value={r} onChange={e => updateRec(i, e.target.value)} placeholder={`Recommendation ${i + 1}...`} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0D7377] mb-2" />
                  ))}
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Follow-up</label>
                  <input value={summary.follow_up} onChange={e => setSummary(s => ({ ...s, follow_up: e.target.value }))} placeholder="Follow-up notes..." className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0D7377]" />
                </div>
              </div>
            )}

            <button
              data-testid={user.role === "doctor" ? "submit-prescription-btn" : "submit-summary-btn"}
              onClick={handleComplete}
              disabled={completing}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {completing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
              : <><CheckCircle size={16} /> {user.role === "doctor" ? "Send E-Prescription" : "Send Summary"}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
