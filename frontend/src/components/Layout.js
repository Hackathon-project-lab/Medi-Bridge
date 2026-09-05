import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, UserCheck, Clock, FileText, Settings,
  LogOut, Menu, X, Search, Bell, ChevronDown, AlertTriangle,
  Stethoscope, Brain, Leaf, User, Users, PlayCircle, BookOpen
} from "lucide-react";

const LOGO = "https://customer-assets-v7afamib.emergentagent.net/job_22cdbcd2-07d5-4e45-a6a8-bcb0b0b223b9/artifacts/b567qsfr_MediBridge_LOGO.jpeg";

const navConfigs = {
  patient: [
    { to: "/patient/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/patient/find", icon: Users, label: "Find Professionals" },
    { to: "/patient/preconsultation", icon: PlayCircle, label: "Start Consultation" },
    { to: "/patient/appointments", icon: Calendar, label: "Appointments" },
    { to: "/patient/profile", icon: User, label: "Profile" },
  ],
  doctor: [
    { to: "/doctor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/doctor/appointments", icon: Calendar, label: "Appointments" },
    { to: "/doctor/availability", icon: Clock, label: "Availability" },
    { to: "/doctor/verification", icon: UserCheck, label: "Verification" },
    { to: "/doctor/profile", icon: User, label: "Profile" },
  ],
  psychologist: [
    { to: "/psychologist/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/psychologist/appointments", icon: Calendar, label: "Sessions" },
    { to: "/psychologist/availability", icon: Clock, label: "Availability" },
    { to: "/psychologist/verification", icon: UserCheck, label: "Verification" },
    { to: "/psychologist/profile", icon: User, label: "Profile" },
  ],
  nutritionist: [
    { to: "/nutritionist/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/nutritionist/appointments", icon: Calendar, label: "Consultations" },
    { to: "/nutritionist/availability", icon: Clock, label: "Availability" },
    { to: "/nutritionist/verification", icon: UserCheck, label: "Verification" },
    { to: "/nutritionist/profile", icon: User, label: "Profile" },
  ],
};

const roleIcons = { patient: User, doctor: Stethoscope, psychologist: Brain, nutritionist: Leaf };
const roleColors = {
  patient: "bg-emerald-50 text-emerald-700",
  doctor: "bg-teal-50 text-[#0D7377]",
  psychologist: "bg-indigo-50 text-indigo-700",
  nutritionist: "bg-amber-50 text-amber-700",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = navConfigs[user?.role] || [];
  const RoleIcon = roleIcons[user?.role] || User;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <img src={LOGO} alt="MediBridge" className="h-10 object-contain" />
      </div>

      {/* Role badge */}
      <div className="px-4 py-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider ${roleColors[user?.role]}`}>
          <RoleIcon size={14} />
          {user?.role}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-sm font-semibold">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFCFF]">
      {/* Demo Banner */}
      <div className="bg-slate-900 text-slate-100 text-xs py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2 border-b border-slate-800 sticky top-0 z-50">
        <AlertTriangle size={12} className="text-amber-400 shrink-0" />
        Demo Build — Synthetic Data Only — Not for Clinical Use
        <AlertTriangle size={12} className="text-amber-400 shrink-0" />
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 min-h-screen fixed left-0 top-8 bottom-0 z-40">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <img src={LOGO} alt="MediBridge" className="h-8 object-contain" />
                <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto"><SidebarContent /></div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 md:ml-60 flex flex-col min-h-screen">
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-8 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <div className="relative hidden sm:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377]/20 w-48 lg:w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <Bell size={18} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                  data-testid="profile-menu-btn"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                    <NavLink to={`/${user?.role}/profile`} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                      <User size={14} /> Profile
                    </NavLink>
                    <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
