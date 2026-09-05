# MediBridge — Product Requirements Document

## Original Problem Statement
MediBridge is a multilingual-ready telemedicine and healthcare consultation platform using **synthetic data only**. It connects patients with three types of healthcare professionals (Doctors, Psychologists, Nutritionists) via secure 1-to-1 video consultations powered by Daily.co, with AI-assisted pre-consultation intake and a global floating health chatbot.

---

## User Personas
| Role | Description |
|---|---|
| **Patient** | Books consultations, completes AI pre-screening, receives e-prescriptions and session summaries |
| **Doctor** | Conducts video consultations, issues e-prescriptions, manages availability |
| **Psychologist** | Provides mental health sessions, delivers session summaries and follow-up plans |
| **Nutritionist** | Guides on diet & lifestyle, delivers personalized consultation summaries |
| **Admin** | `medibridge26@gmail.com` — manages seed data, platform owner |

---

## Core Requirements

### Authentication & Roles
- JWT-based authentication using httpOnly cookies
- Role selection at landing page (Patient / Doctor / Psychologist / Nutritionist)
- Role-based dashboards and route protection
- Persistent **"Demo Build — Synthetic Data Only — Not for Clinical Use"** banner on all pages

### Professional Workflow
- Verification submission form (qualifications, institution, license number)
- Availability management (weekly recurring slots, 30-min increments)
- Appointments page with status tracking

### Patient Workflow
- Find & browse verified professionals (with search/filter by role/specialty)
- Book appointments via slot picker (linked to professional availability)
- AI Pre-Consultation intake (conversational, file upload, specialty recommendation)
- View e-prescriptions and session summaries in appointment records

### AI Features (Gemini 3 Flash via Emergent Universal Key)
1. **Floating Health Chatbot** — global, always visible when logged in, general wellness info only
2. **Pre-Consultation AI Intake** — conversational symptom intake → specialty/professional recommendation

### Video Consultation (Daily.co)
- Waiting room with camera/mic preview
- 1-to-1 video via Daily.co iframe (private rooms, JWT meeting tokens)
- Professional side panel with pre-consultation context + completion form

### Post-Consultation Records
- **Doctor** → E-Prescription (medications, diagnosis, instructions, follow-up)
- **Psychologist / Nutritionist** → Session Summary (summary, recommendations, follow-up)
- All records are **patient-facing** only (no private professional notes)

### File Uploads (Object Storage)
- Patients can upload PDFs/images during pre-consultation intake
- Max 10MB per file, types: PDF, JPG, PNG

### Seed Data
- 4 Doctors (Cardiology, General Practice, Dermatology, Neurology)
- 2 Psychologists (CBT, Stress Management)
- 2 Nutritionists (Sports, Clinical)
- 2 Patients (John Doe, Jane Smith)
- Admin: `medibridge26@gmail.com` / `MediBridge@2024!`
- Demo password for all other accounts: `Demo@1234`

---

## Tech Stack
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI + lucide-react
- **Database**: MongoDB (local)
- **AI**: Gemini 3 Flash via `emergentintegrations` (Emergent Universal Key)
- **Video**: Daily.co REST API + iframe embed
- **Storage**: Emergent Object Storage

---

## What's Been Implemented (as of 2026-09-05)
- ✅ Phase 1: JWT Auth, role selection, demo banner, seed data
- ✅ Phase 2: Professional verification workflow, availability management
- ✅ Phase 3: Patient professional discovery, booking system
- ✅ Phase 4: AI pre-consultation flow (Gemini 3 Flash, file uploads)
- ✅ Phase 5: File storage (Object Storage integration), appointment detail pages
- ✅ Phase 6: Daily.co waiting room + video consultation (iframe + meeting tokens)
- ✅ Phase 7: E-prescriptions (doctors) + session summaries (psych/nutritionist)
- ✅ Phase 8: No-show guardrail (5-min delay warning in waiting room), reschedule endpoint
- ✅ Phase 9: Global floating Health Assistant chatbot (Gemini 3 Flash, streaming SSE)
- ✅ Phase 10: Responsive design, loading/skeleton states, demo credentials panel

---

## Architecture
```
/app/
├── backend/
│   └── server.py          # FastAPI app — all routes (~1010 lines)
├── frontend/
│   └── src/
│       ├── App.js          # Router + protected routes
│       ├── index.css       # Tailwind + custom CSS vars
│       ├── contexts/
│       │   └── AuthContext.js
│       ├── components/
│       │   ├── Layout.js       # Sidebar + header (role-aware nav)
│       │   └── FloatingChatbot.js
│       └── pages/
│           ├── RoleSelection.js
│           ├── Auth.js
│           ├── PatientDashboard.js
│           ├── DoctorDashboard.js
│           ├── PsychologistDashboard.js
│           ├── NutritionistDashboard.js
│           ├── FindProfessionals.js
│           ├── PreConsultation.js
│           ├── WaitingRoom.js
│           ├── VideoConsultation.js
│           ├── PostConsultation.js
│           ├── Availability.js
│           ├── Verification.js
│           ├── Appointments.js
│           └── Profile.js
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

---

## Key API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login (sets httpOnly cookies) |
| GET | /api/auth/me | Get current user |
| GET | /api/professionals/list | List verified professionals |
| GET | /api/professionals/{pid}/slots | Available slots for a professional |
| POST | /api/professionals/verification | Submit verification |
| GET | /api/professionals/verification | Get verification status |
| POST | /api/availability | Add availability slot |
| GET | /api/availability/my | Get my slots |
| POST | /api/appointments | Book appointment |
| GET | /api/appointments | List my appointments |
| GET | /api/appointments/{id} | Get single appointment |
| PUT | /api/appointments/{id}/status | Update status |
| POST | /api/intake/start | Start AI pre-consultation |
| POST | /api/intake/{sid}/message | Send message to intake AI |
| POST | /api/chatbot/message | Health chatbot (SSE streaming) |
| POST | /api/files/upload | Upload document |
| POST | /api/video/create-room/{aid} | Create Daily.co room |
| POST | /api/video/token/{aid} | Get Daily.co meeting token |
| POST | /api/consultations/{aid}/eprescription | Issue e-prescription |
| POST | /api/consultations/{aid}/summary | Issue session summary |

---

## Prioritized Backlog

### P0 — Critical
_None. All core features implemented and tested._

### P1 — High Value
- Admin panel UI for approving/rejecting professional verifications (currently requires direct DB access)
- Automatic no-show status update (cron job after appointment slot passes by 30+ mins without joining)
- Rescheduling flow UI for patients

### P2 — Nice to Have
- Email notifications (appointment confirmation, reminder)
- Patient medical history timeline
- Multi-language support (i18n)
- Dark mode
- Push notifications for appointment reminders

---

## Known Issues / Notes
- `server.py` is monolithic (~1010 lines); should be split into route modules for maintainability
- Demo professional verifications: approved via `user.verification_status` field (no document in `verifications` collection), GET endpoint now falls back to user field correctly
