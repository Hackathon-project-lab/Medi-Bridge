import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bot, Send, Upload, X, FileText, Image, Calendar, Stethoscope, Brain, Leaf, BadgeCheck, Clock, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleIcon = { doctor: Stethoscope, psychologist: Brain, nutritionist: Leaf };
const roleColor = { doctor: "text-[#0D7377]", psychologist: "text-indigo-600", nutritionist: "text-amber-600" };
const roleBg = { doctor: "bg-[#E6F4F4]", psychologist: "bg-indigo-50", nutritionist: "bg-amber-50" };

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function PreConsultation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSession = async () => {
    setStarting(true);
    try {
      const { data } = await axios.post(`${API}/intake/start`, {}, { withCredentials: true });
      setSessionId(data.session_id);
      setMessages([{ role: "assistant", content: data.response }]);
      setStarted(true);
    } catch (err) {
      alert("Failed to start session. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/intake/${sessionId}/message`, { message: msg }, { withCredentials: true });
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      if (data.has_recommendation) {
        setRecommendation({ specialty: data.recommended_specialty, type: data.recommended_type, professionals: data.recommended_professionals, data: data.recommendation_data });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm sorry, I couldn't process that. Please try again.", error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post(`${API}/files/upload?session_id=${sessionId}`, form, { withCredentials: true, headers: { "Content-Type": "multipart/form-data" } });
      setFiles(prev => [...prev, data]);
      setMessages(prev => [...prev, { role: "user", content: `Uploaded file: ${file.name}`, isFile: true }]);
    } catch (err) {
      alert(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectProfessional = async (prof) => {
    setSelectedPro(prof);
    setLoadingSlots(true);
    try {
      const { data } = await axios.get(`${API}/professionals/${prof.id}/slots`, { withCredentials: true });
      setSlots(data);
    } catch {}
    finally { setLoadingSlots(false); }
  };

  const bookAppointment = async () => {
    if (!selectedPro || !selectedSlot) return;
    setBooking(true);
    try {
      await axios.post(`${API}/appointments`, {
        professional_id: selectedPro.id,
        slot_iso: selectedSlot.slot_iso,
        consultation_type: "video",
        pre_consultation_session_id: sessionId
      }, { withCredentials: true });
      navigate("/patient/appointments");
    } catch (err) {
      alert(err.response?.data?.detail || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Pre-Consultation</h1>
          <p className="text-slate-500 text-sm mt-1">Our AI assistant will help identify the right healthcare professional for you</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#E6F4F4] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-[#0D7377]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>MediBridge Pre-Consultation AI</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            I'll ask you a few questions about your health concern, then suggest the most appropriate healthcare professional for you. You can also upload relevant documents.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6 text-xs text-slate-500">
            {["Conversational & empathetic", "Upload reports & images", "Specialist recommendations", "No diagnosis provided"].map(f => (
              <span key={f} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5"><CheckCircle size={11} className="text-[#0D7377]" />{f}</span>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-xs text-amber-700 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>This AI assistant does not provide medical diagnoses. It helps identify the right professional for your needs. All information is for demo purposes only.</span>
          </div>
          <button data-testid="start-ai-preconsultation-btn" onClick={startSession} disabled={starting} className="flex items-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white font-semibold px-8 py-3 rounded-xl mx-auto transition-colors">
            {starting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Starting...</> : <><Bot size={18} /> Start Pre-Consultation</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pre-Consultation AI</h1>
          <p className="text-xs text-slate-500">Answer the questions to get matched with the right professional</p>
        </div>
        <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">Demo — Not for clinical use</div>
      </div>

      {/* Chat */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-[#0D7377] px-4 py-3 flex items-center gap-2 text-white">
          <Bot size={18} />
          <div>
            <p className="text-sm font-semibold">Pre-Consultation Assistant</p>
            <p className="text-xs text-white/70">Helps identify the right specialist for you</p>
          </div>
        </div>

        <div className="h-80 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 bg-[#E6F4F4] rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Bot size={13} className="text-[#0D7377]" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "bg-[#0D7377] text-white rounded-tr-sm" : msg.isFile ? "bg-blue-50 text-blue-700 border border-blue-200 rounded-tl-sm" : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-[#E6F4F4] rounded-full flex items-center justify-center mr-2 shrink-0"><Bot size={13} className="text-[#0D7377]" /></div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                <span className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}} />)}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Files uploaded */}
        {files.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2 flex flex-wrap gap-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
                {f.content_type?.includes("pdf") ? <FileText size={12} className="text-rose-500" /> : <Image size={12} className="text-blue-500" />}
                <span className="max-w-[120px] truncate">{f.original_filename}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-100 px-3 py-3">
          <div className="flex items-center gap-2">
            <input
              data-testid="intake-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Type your response..."
              disabled={loading || !!recommendation}
              className="flex-1 px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D7377] disabled:opacity-50"
            />
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" data-testid="intake-upload-area" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !sessionId} title="Upload document" className="p-2.5 text-slate-400 hover:text-[#0D7377] hover:bg-[#E6F4F4] rounded-xl transition-colors disabled:opacity-40">
              {uploading ? <div className="w-4 h-4 border-2 border-[#0D7377] border-t-transparent rounded-full animate-spin" /> : <Upload size={17} />}
            </button>
            <button data-testid="intake-send-btn" onClick={sendMessage} disabled={!input.trim() || loading || !!recommendation} className="p-2.5 bg-[#0D7377] hover:bg-[#095457] text-white rounded-xl disabled:opacity-40 transition-colors">
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Consultation Recommendation</h3>
          </div>
          {recommendation.data?.reasoning && <p className="text-sm text-slate-600 mb-4">{recommendation.data.reasoning}</p>}
          {recommendation.data?.urgency === "urgent" && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={14} /> This may require urgent attention. Consider seeking immediate medical care.
            </div>
          )}

          <h4 className="text-sm font-semibold text-slate-700 mb-3">Suggested Professionals ({recommendation.professionals?.length || 0})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendation.professionals?.map(prof => {
              const Icon = roleIcon[prof.role] || Stethoscope;
              return (
                <div key={prof.id} onClick={() => selectProfessional(prof)} className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedPro?.id === prof.id ? "border-[#0D7377] shadow-md" : "border-slate-200 hover:border-[#0D7377]/50"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${roleBg[prof.role]} rounded-xl flex items-center justify-center`}>
                      <Icon size={18} className={roleColor[prof.role]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1"><p className="text-sm font-bold text-slate-900 truncate">{prof.name}</p><BadgeCheck size={13} className="text-[#0D7377]" /></div>
                      <p className="text-xs text-slate-500">{prof.specialty}</p>
                    </div>
                    {selectedPro?.id === prof.id && <CheckCircle size={16} className="text-[#0D7377] shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slot Selection */}
      {selectedPro && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-fade-in-up">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Clock size={16} className="text-[#0D7377]" /> Available Slots for {selectedPro.name}</h3>
          {loadingSlots ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[1,2,3,4,5,6].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : slots.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {slots.map((slot, i) => (
                  <button key={i} onClick={() => setSelectedSlot(slot)} className={`text-xs p-2.5 rounded-xl border text-left transition-all ${selectedSlot?.slot_iso === slot.slot_iso ? "border-[#0D7377] bg-[#E6F4F4] text-[#0D7377] font-semibold" : "border-slate-200 text-slate-600 hover:border-[#0D7377]/50"}`}>
                    {slot.display}
                  </button>
                ))}
              </div>
              {selectedSlot && (
                <button
                  data-testid="confirm-booking-btn"
                  onClick={bookAppointment}
                  disabled={booking}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {booking ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking...</> : <><Calendar size={16} /> Confirm Appointment<ArrowRight size={16} /></>}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">No available slots. Please check back later.</div>
          )}
        </div>
      )}
    </div>
  );
}
