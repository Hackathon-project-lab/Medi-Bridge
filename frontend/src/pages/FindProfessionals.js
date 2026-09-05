import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Star, Calendar, MapPin, Filter, Stethoscope, Brain, Leaf, BadgeCheck, Clock } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleConfig = {
  all: { label: "All Professionals", icon: Stethoscope },
  doctor: { label: "Doctors", icon: Stethoscope, color: "text-[#0D7377]", bg: "bg-[#E6F4F4]", badge: "bg-teal-50 text-[#0D7377] border-teal-200" },
  psychologist: { label: "Psychologists", icon: Brain, color: "text-indigo-700", bg: "bg-indigo-50", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  nutritionist: { label: "Nutritionists", icon: Leaf, color: "text-amber-700", bg: "bg-amber-50", badge: "bg-amber-50 text-amber-700 border-amber-200" },
};

function ProfessionalCard({ prof, onBook }) {
  const rc = roleConfig[prof.role] || roleConfig.doctor;
  const Icon = rc.icon;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 card-hover">
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl ${rc.bg} flex items-center justify-center shrink-0`}>
          <span className="text-2xl font-bold" style={{ color: rc.color?.replace('text-', '') }}>{prof.name?.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{prof.name}</h3>
                <BadgeCheck size={16} className="text-[#0D7377]" title="Verified" />
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 ${rc.badge}`}>
                <Icon size={11} /> {prof.specialty || prof.role}
              </span>
            </div>
          </div>
          {prof.bio && <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">{prof.bio}</p>}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={12} /> Available this week
            </div>
            <button
              data-testid="book-professional-btn"
              onClick={() => onBook(prof)}
              className="flex items-center gap-1.5 bg-[#0D7377] hover:bg-[#095457] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Calendar size={13} /> Book Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FindProfessionals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "all");

  useEffect(() => {
    fetchProfessionals();
  }, [roleFilter]);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter !== "all") params.role = roleFilter;
      const { data } = await axios.get(`${API}/professionals/list`, { params, withCredentials: true });
      setProfessionals(data);
    } catch {}
    finally { setLoading(false); }
  };

  const filtered = professionals.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBook = (prof) => {
    navigate(`/patient/preconsultation?professional=${prof.id}&role=${prof.role}`);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Find Healthcare Professionals</h1>
        <p className="text-slate-500 text-sm mt-1">Browse verified doctors, psychologists, and nutritionists</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="search-professionals-input"
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#0D7377] focus:ring-2 focus:ring-[#0D7377]/15"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(roleConfig).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              data-testid={`filter-${key}`}
              onClick={() => setRoleFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${roleFilter === key ? "bg-[#0D7377] text-white border-[#0D7377]" : "bg-white text-slate-600 border-slate-200 hover:border-[#0D7377] hover:text-[#0D7377]"}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-36 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <p className="text-sm text-slate-500">{filtered.length} professional{filtered.length !== 1 ? "s" : ""} found</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(prof => <ProfessionalCard key={prof.id} prof={prof} onBook={handleBook} />)}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <Search size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No professionals found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  );
}
