import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Video, Mic, MicOff, VideoOff, Clock, AlertCircle, ArrowRight, RefreshCw, Stethoscope, Brain, Leaf } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const roleIcon = { doctor: Stethoscope, psychologist: Brain, nutritionist: Leaf };

export default function WaitingRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showDelayMsg, setShowDelayMsg] = useState(false);
  const [stream, setStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchAppointment();
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (appointment?.status === "waiting") {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= 300) { setShowDelayMsg(true); clearInterval(timerRef.current); }
          return e + 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [appointment?.status]);

  const fetchAppointment = async () => {
    try {
      const { data } = await axios.get(`${API}/appointments/${id}`, { withCredentials: true });
      setAppointment(data);
      if (data.status === "booked") {
        await axios.put(`${API}/appointments/${id}/status`, { status: "waiting" }, { withCredentials: true });
        setAppointment(d => ({ ...d, status: "waiting" }));
      }
    } catch {}
    finally { setLoading(false); }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {}
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  const toggleMic = () => {
    if (stream) stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(m => !m);
  };

  const toggleCam = () => {
    if (stream) stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(c => !c);
  };

  const joinCall = async () => {
    setJoining(true);
    stopCamera();
    navigate(`/video/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center text-white"><div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p>Loading...</p></div>
      </div>
    );
  }

  const ProfIcon = roleIcon[appointment?.professional_role] || Stethoscope;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-slate-400 text-sm mb-2">Waiting Room</p>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {user?.role === "patient" ? `Consultation with ${appointment?.professional_name}` : `Session with ${appointment?.patient_name}`}
          </h1>
          <p className="text-slate-400 text-sm flex items-center justify-center gap-1.5">
            <Clock size={14} /> {formatTime(appointment?.slot_iso)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Preview */}
          <div className="space-y-4">
            <div className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video">
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${!camOn ? "opacity-0" : ""}`} />
              {!camOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user?.name?.charAt(0)}
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${micOn ? "bg-slate-700 hover:bg-slate-600" : "bg-rose-600 hover:bg-rose-700"}`}>
                  {micOn ? <Mic size={18} className="text-white" /> : <MicOff size={18} className="text-white" />}
                </button>
                <button onClick={toggleCam} className={`p-3 rounded-full transition-colors ${camOn ? "bg-slate-700 hover:bg-slate-600" : "bg-rose-600 hover:bg-rose-700"}`}>
                  {camOn ? <Video size={18} className="text-white" /> : <VideoOff size={18} className="text-white" />}
                </button>
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs">{micOn ? "Microphone on" : "Microphone off"} · {camOn ? "Camera on" : "Camera off"}</p>
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            {/* Professional info */}
            <div className="bg-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">
                {user?.role === "patient" ? "Your Healthcare Professional" : "Patient"}
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
                  <ProfIcon size={22} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-white font-semibold">{user?.role === "patient" ? appointment?.professional_name : appointment?.patient_name}</p>
                  {user?.role === "patient" && <p className="text-slate-400 text-sm">{appointment?.professional_specialty}</p>}
                </div>
              </div>
            </div>

            {/* Delay message */}
            {showDelayMsg && (
              <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-amber-300 text-sm font-semibold">The professional appears to be delayed.</p>
                    <p className="text-amber-400 text-xs mt-1">It has been over 5 minutes.</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setShowDelayMsg(false)} className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600">
                        Continue Waiting
                      </button>
                      <button onClick={() => navigate("/patient/appointments")} className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 flex items-center gap-1">
                        <RefreshCw size={12} /> Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Join button */}
            <button
              data-testid="join-video-call-btn"
              onClick={joinCall}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 bg-[#0D7377] hover:bg-[#095457] text-white font-bold py-4 rounded-2xl text-lg transition-colors disabled:opacity-60"
            >
              {joining ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Joining...</>
              : <><Video size={22} /> Join Consultation <ArrowRight size={18} /></>}
            </button>

            <div className="bg-slate-800 rounded-xl p-4 text-xs text-slate-400">
              <p className="font-semibold text-slate-300 mb-1">Before you join:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Ensure you are in a quiet, private space</li>
                <li>Test your microphone and camera above</li>
                <li>Have any relevant documents ready</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
