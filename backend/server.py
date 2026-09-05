from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from pydantic.functional_validators import BeforeValidator
from typing import Optional, List, Annotated
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os, jwt, bcrypt, uuid, logging, requests, json, asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

# --- Configuration ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "fallback-not-secure-please-change")
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
DAILY_API_KEY = os.environ.get("DAILY_API_KEY", "")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "medibridge"
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
DAILY_API = "https://api.daily.co/v1"

# Object Storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
storage_key = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# --- Database ---
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# --- App ---
app = FastAPI(title="MediBridge API")
api_router = APIRouter(prefix="/api")

# --- Helpers ---
def to_str(v) -> str:
    return str(v) if isinstance(v, ObjectId) else v

PyObjectId = Annotated[str, BeforeValidator(to_str)]


def hash_pwd(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def check_pwd(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_access_token(uid: str, email: str) -> str:
    return jwt.encode({"sub": uid, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=4), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def make_refresh_token(uid: str) -> str:
    return jwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def fmt_user(u: dict) -> dict:
    u = dict(u)
    u["id"] = str(u.pop("_id", ""))
    u.pop("password_hash", None)
    return u


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        ah = request.headers.get("Authorization", "")
        if ah.startswith("Bearer "):
            token = ah[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if p.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return fmt_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def set_cookies(r: Response, at: str, rt: str):
    r.set_cookie("access_token", at, httponly=True, secure=True, samesite="none", max_age=14400, path="/")
    r.set_cookie("refresh_token", rt, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def clear_cookies(r: Response):
    r.delete_cookie("access_token", path="/", samesite="none", secure=True)
    r.delete_cookie("refresh_token", path="/", samesite="none", secure=True)


def daily_headers():
    return {"Authorization": f"Bearer {DAILY_API_KEY}", "Content-Type": "application/json"}


# --- Pydantic Models ---
class RegisterReq(BaseModel):
    email: str
    password: str
    name: str
    role: str


class LoginReq(BaseModel):
    email: str
    password: str


class VerificationReq(BaseModel):
    full_name: str
    specialty: Optional[str] = None
    qualification: str
    institution: str
    license_number: Optional[str] = None
    additional_info: Optional[str] = None


class AvailabilityReq(BaseModel):
    weekday: int
    start_time: str
    end_time: str


class AppointmentReq(BaseModel):
    professional_id: str
    slot_iso: str
    consultation_type: str = "video"
    pre_consultation_session_id: Optional[str] = None
    notes: Optional[str] = None


class IntakeMsgReq(BaseModel):
    message: str


class ChatbotMsgReq(BaseModel):
    message: str
    session_id: Optional[str] = None


class EPrescriptionReq(BaseModel):
    medications: List[dict] = []
    diagnosis: Optional[str] = None
    instructions: Optional[str] = None
    follow_up: Optional[str] = None


class SummaryReq(BaseModel):
    summary: str
    recommendations: List[str] = []
    follow_up: Optional[str] = None


class ProfileUpdateReq(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None


class RescheduleReq(BaseModel):
    new_slot_iso: str


# ========================
# AUTH ROUTES
# ========================
@api_router.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    if req.role not in ["patient", "doctor", "psychologist", "nutritionist"]:
        raise HTTPException(400, "Invalid role")
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email, "password_hash": hash_pwd(req.password),
        "name": req.name, "role": req.role,
        "verification_status": "not_required" if req.role == "patient" else "pending",
        "specialty": None, "bio": None, "phone": None, "avatar": None,
        "is_demo": False, "created_at": datetime.now(timezone.utc).isoformat()
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    set_cookies(response, make_access_token(uid, email), make_refresh_token(uid))
    doc["_id"] = uid
    return fmt_user(doc)


@api_router.post("/auth/login")
async def login(req: LoginReq, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not check_pwd(req.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    set_cookies(response, make_access_token(uid, email), make_refresh_token(uid))
    return fmt_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_cookies(response)
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if p.get("type") != "refresh":
            raise HTTPException(401, "Invalid token")
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        response.set_cookie("access_token", make_access_token(str(user["_id"]), user["email"]), httponly=True, secure=True, samesite="none", max_age=14400, path="/")
        return {"message": "Refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ========================
# USER ROUTES
# ========================
@api_router.put("/users/profile")
async def update_profile(req: ProfileUpdateReq, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in req.model_dump().items() if v is not None}
    if upd:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": upd})
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return fmt_user(u)


# ========================
# PROFESSIONAL ROUTES
# ========================
@api_router.post("/professionals/verification")
async def submit_verification(req: VerificationReq, user: dict = Depends(get_current_user)):
    if user["role"] not in ["doctor", "psychologist", "nutritionist"]:
        raise HTTPException(403, "Professionals only")
    doc = {
        "user_id": user["id"], "role": user["role"],
        "full_name": req.full_name, "specialty": req.specialty,
        "qualification": req.qualification, "institution": req.institution,
        "license_number": req.license_number, "additional_info": req.additional_info,
        "status": "under_review", "submitted_at": datetime.now(timezone.utc).isoformat(), "documents": []
    }
    await db.verifications.replace_one({"user_id": user["id"]}, doc, upsert=True)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"verification_status": "under_review", "specialty": req.specialty}})
    return {"message": "Verification submitted", "status": "under_review"}


@api_router.get("/professionals/verification")
async def get_verification(user: dict = Depends(get_current_user)):
    doc = await db.verifications.find_one({"user_id": user["id"]})
    if not doc:
        # Fall back to user record verification_status for demo/pre-approved accounts
        vs = user.get("verification_status", "pending")
        if vs == "not_submitted":
            vs = "pending"
        return {"status": vs, "full_name": user.get("name"), "specialty": user.get("specialty")}
    doc["id"] = str(doc.pop("_id", ""))
    return doc


@api_router.get("/professionals/list")
async def list_professionals(role: Optional[str] = Query(None), specialty: Optional[str] = Query(None), _u: dict = Depends(get_current_user)):
    q = {"verification_status": "approved", "role": {"$in": ["doctor", "psychologist", "nutritionist"]}}
    if role:
        q["role"] = role
    if specialty:
        q["specialty"] = {"$regex": specialty, "$options": "i"}
    profs = await db.users.find(q, {"password_hash": 0}).to_list(100)
    return [fmt_user(p) for p in profs]


@api_router.get("/professionals/{pid}/slots")
async def get_slots(pid: str, _u: dict = Depends(get_current_user)):
    avail = await db.availability.find({"professional_id": pid, "is_active": True}).to_list(100)
    booked_docs = await db.appointments.find({"professional_id": pid, "status": {"$in": ["booked", "waiting", "in_call"]}}).to_list(1000)
    booked_times = {a["slot_iso"] for a in booked_docs}
    today = datetime.now(timezone.utc)
    slots = []
    for day_offset in range(1, 22):
        target = today + timedelta(days=day_offset)
        wday = target.weekday()
        for a in avail:
            if a["weekday"] != wday:
                continue
            sh, sm = map(int, a["start_time"].split(":"))
            eh, em = map(int, a["end_time"].split(":"))
            cur = target.replace(hour=sh, minute=sm, second=0, microsecond=0)
            end = target.replace(hour=eh, minute=em, second=0, microsecond=0)
            while cur < end:
                iso = cur.isoformat()
                if iso not in booked_times:
                    slots.append({"slot_iso": iso, "display": cur.strftime("%A, %b %d at %I:%M %p UTC")})
                cur += timedelta(minutes=30)
    return slots[:50]


@api_router.get("/professionals/{pid}")
async def get_professional(pid: str, _u: dict = Depends(get_current_user)):
    try:
        p = await db.users.find_one({"_id": ObjectId(pid)}, {"password_hash": 0})
    except Exception:
        raise HTTPException(404, "Not found")
    if not p:
        raise HTTPException(404, "Not found")
    return fmt_user(p)


# ========================
# AVAILABILITY ROUTES
# ========================
@api_router.post("/availability")
async def add_avail(req: AvailabilityReq, user: dict = Depends(get_current_user)):
    if user["role"] not in ["doctor", "psychologist", "nutritionist"]:
        raise HTTPException(403, "Professionals only")
    doc = {"professional_id": user["id"], "weekday": req.weekday, "start_time": req.start_time, "end_time": req.end_time, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.availability.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/availability/my")
async def my_avail(user: dict = Depends(get_current_user)):
    slots = await db.availability.find({"professional_id": user["id"], "is_active": True}).to_list(100)
    result = []
    for s in slots:
        s["id"] = str(s.pop("_id", ""))
        result.append(s)
    return result


@api_router.delete("/availability/{sid}")
async def del_avail(sid: str, user: dict = Depends(get_current_user)):
    try:
        await db.availability.update_one({"_id": ObjectId(sid), "professional_id": user["id"]}, {"$set": {"is_active": False}})
    except Exception:
        raise HTTPException(404, "Not found")
    return {"message": "Removed"}


# ========================
# APPOINTMENT ROUTES
# ========================
@api_router.post("/appointments")
async def create_appointment(req: AppointmentReq, user: dict = Depends(get_current_user)):
    if user["role"] != "patient":
        raise HTTPException(403, "Patients only")
    try:
        prof = await db.users.find_one({"_id": ObjectId(req.professional_id)})
    except Exception:
        raise HTTPException(404, "Professional not found")
    if not prof or prof.get("verification_status") != "approved":
        raise HTTPException(400, "Professional not available")
    existing = await db.appointments.find_one({"professional_id": req.professional_id, "slot_iso": req.slot_iso, "status": {"$in": ["booked", "waiting", "in_call"]}})
    if existing:
        raise HTTPException(400, "Slot already booked")
    doc = {
        "patient_id": user["id"], "patient_name": user["name"],
        "professional_id": req.professional_id, "professional_name": prof["name"],
        "professional_role": prof["role"], "professional_specialty": prof.get("specialty"),
        "slot_iso": req.slot_iso, "consultation_type": req.consultation_type,
        "status": "booked", "pre_consultation_session_id": req.pre_consultation_session_id,
        "notes": req.notes, "daily_room_url": None,
        "final_summary": None, "e_prescription": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    r = await db.appointments.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/appointments")
async def list_appointments(status: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    q = {}
    if user["role"] == "patient":
        q["patient_id"] = user["id"]
    else:
        q["professional_id"] = user["id"]
    if status:
        q["status"] = status
    apts = await db.appointments.find(q).sort("slot_iso", -1).to_list(100)
    result = []
    for a in apts:
        a["id"] = str(a.pop("_id", ""))
        result.append(a)
    return result


@api_router.get("/appointments/{aid}")
async def get_appointment(aid: str, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] not in [apt["patient_id"], apt["professional_id"]]:
        raise HTTPException(403, "Access denied")
    apt["id"] = str(apt.pop("_id", ""))
    if apt.get("pre_consultation_session_id"):
        try:
            sess = await db.intake_sessions.find_one({"_id": ObjectId(apt["pre_consultation_session_id"])})
            if sess:
                sess["id"] = str(sess.pop("_id", ""))
                apt["pre_consultation_data"] = sess
        except Exception:
            pass
    return apt


@api_router.put("/appointments/{aid}/status")
async def update_status(aid: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    new_status = body.get("status")
    valid = ["booked", "waiting", "in_call", "completed", "no_show", "rescheduled", "cancelled"]
    if new_status not in valid:
        raise HTTPException(400, "Invalid status")
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] not in [apt["patient_id"], apt["professional_id"]]:
        raise HTTPException(403, "Access denied")
    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": new_status}


@api_router.put("/appointments/{aid}/reschedule")
async def reschedule(aid: str, req: RescheduleReq, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] != apt["patient_id"]:
        raise HTTPException(403, "Patients only")
    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"slot_iso": req.new_slot_iso, "status": "rescheduled", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Rescheduled"}


# ========================
# INTAKE AI ROUTES
# ========================
INTAKE_SYSTEM = """You are MediBridge's AI Pre-Consultation Assistant. Conduct a structured, empathetic intake conversation with patients to understand their health concerns and identify the most appropriate type of healthcare professional.

Ask 4-6 conversational questions covering: main concern, symptoms, duration, severity, and relevant medical history. Ask 1-2 questions at a time. Keep responses to 2-4 sentences.

After gathering sufficient information, provide a RECOMMENDATION on its own line in this EXACT format:
RECOMMENDATION: {"specialty": "<general_practice|cardiology|dermatology|psychiatry|psychology|nutrition|pediatrics|orthopedics|gynecology|neurology>", "professional_type": "<doctor|psychologist|nutritionist>", "reasoning": "<brief 1-2 sentence explanation>", "urgency": "<routine|moderate|urgent>"}

Critical rules:
- NEVER diagnose. Say "a consultation with a [specialist] may be appropriate" not "you have X"
- Be empathetic and professional
- If urgency is urgent, recommend immediate medical attention"""


@api_router.post("/intake/start")
async def start_intake(user: dict = Depends(get_current_user)):
    if user["role"] != "patient":
        raise HTTPException(403, "Patients only")
    doc = {
        "patient_id": user["id"], "patient_name": user["name"],
        "messages": [], "uploaded_files": [], "recommended_specialty": None,
        "recommended_type": None, "recommended_professionals": [],
        "structured_context": {}, "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    r = await db.intake_sessions.insert_one(doc)
    return {
        "session_id": str(r.inserted_id),
        "response": "Hello! I'm MediBridge's Pre-Consultation Assistant. I'm here to help understand your health concern and connect you with the right healthcare professional.\n\nCould you tell me — what is the main health concern you'd like to discuss today?"
    }


@api_router.post("/intake/{sid}/message")
async def intake_message(sid: str, req: IntakeMsgReq, user: dict = Depends(get_current_user)):
    try:
        session = await db.intake_sessions.find_one({"_id": ObjectId(sid)})
    except Exception:
        raise HTTPException(404, "Session not found")
    if not session:
        raise HTTPException(404, "Session not found")
    if session["patient_id"] != user["id"]:
        raise HTTPException(403, "Access denied")

    messages = session.get("messages", [])
    messages.append({"role": "user", "content": req.message, "timestamp": datetime.now(timezone.utc).isoformat()})
    conv = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages[-12:]])

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"intake_{sid}", system_message=INTAKE_SYSTEM).with_model("gemini", "gemini-3-flash-preview")
    ai_response = await chat.send_message(UserMessage(text=f"Conversation so far:\n{conv}\n\nRespond to the patient's latest message:"))

    messages.append({"role": "assistant", "content": ai_response, "timestamp": datetime.now(timezone.utc).isoformat()})

    result = {"response": ai_response, "has_recommendation": False, "recommended_specialty": None, "recommended_type": None, "recommended_professionals": []}

    if "RECOMMENDATION:" in ai_response:
        import re
        m = re.search(r'RECOMMENDATION:\s*(\{[^}]+\})', ai_response, re.DOTALL)
        if m:
            try:
                rec = json.loads(m.group(1))
                specialty = rec.get("specialty", "")
                pro_type = rec.get("professional_type", "doctor")
                q = {"verification_status": "approved", "role": pro_type}
                if specialty and specialty not in ["general_practice"]:
                    q["specialty"] = {"$regex": specialty.replace("_", " "), "$options": "i"}
                profs = await db.users.find(q, {"password_hash": 0}).to_list(10)
                if not profs:
                    profs = await db.users.find({"verification_status": "approved", "role": pro_type}, {"password_hash": 0}).to_list(10)
                rec_profs = [fmt_user(p) for p in profs]
                await db.intake_sessions.update_one({"_id": ObjectId(sid)}, {"$set": {
                    "messages": messages, "recommended_specialty": specialty,
                    "recommended_type": pro_type, "recommended_professionals": rec_profs,
                    "recommendation_data": rec, "status": "completed"
                }})
                result.update({"has_recommendation": True, "recommended_specialty": specialty, "recommended_type": pro_type, "recommended_professionals": rec_profs, "recommendation_data": rec})
                return result
            except Exception as e:
                logger.error(f"Recommendation parse error: {e}")

    await db.intake_sessions.update_one({"_id": ObjectId(sid)}, {"$set": {"messages": messages}})
    return result


@api_router.get("/intake/{sid}")
async def get_intake(sid: str, user: dict = Depends(get_current_user)):
    try:
        session = await db.intake_sessions.find_one({"_id": ObjectId(sid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not session:
        raise HTTPException(404, "Not found")
    if user["role"] == "patient" and session["patient_id"] != user["id"]:
        raise HTTPException(403, "Access denied")
    session["id"] = str(session.pop("_id", ""))
    return session


# ========================
# CHATBOT ROUTES
# ========================
CHATBOT_SYSTEM = """You are MediBridge's Health Assistant — a general health information chatbot for all users of the MediBridge platform (patients, doctors, psychologists, nutritionists).

Purpose: Provide general health information, wellness tips, and healthcare education. You are NOT a diagnostic tool.

Guidelines:
- General health information and wellness tips
- Explain medical terms in plain language
- Help users prepare for consultations
- Empathetic, friendly, professional
- Keep responses concise (3-5 sentences)
- NEVER diagnose or prescribe
- For urgent/emergency symptoms: advise immediate emergency care

End responses involving symptoms with: "For personalized advice, please consult a healthcare professional through MediBridge."
"""


@api_router.post("/chatbot/message")
async def chatbot_msg(req: ChatbotMsgReq, user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    sid = req.session_id or f"chat_{user['id']}_{today}"
    session = await db.chatbot_sessions.find_one({"session_id": sid, "user_id": user["id"]})
    messages = session.get("messages", []) if session else []
    if not session:
        await db.chatbot_sessions.insert_one({"session_id": sid, "user_id": user["id"], "messages": [], "created_at": datetime.now(timezone.utc).isoformat()})

    messages.append({"role": "user", "content": req.message, "timestamp": datetime.now(timezone.utc).isoformat()})
    conv = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages[-8:]])
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid, system_message=CHATBOT_SYSTEM).with_model("gemini", "gemini-3-flash-preview")

    async def stream():
        full = ""
        async for ev in chat.stream_message(UserMessage(text=f"Conversation:\n{conv}\n\nRespond to the user's latest message:")):
            if isinstance(ev, TextDelta):
                full += ev.content
                yield f"data: {json.dumps({'content': ev.content})}\n\n"
            elif isinstance(ev, StreamDone):
                messages.append({"role": "assistant", "content": full, "timestamp": datetime.now(timezone.utc).isoformat()})
                await db.chatbot_sessions.update_one({"session_id": sid, "user_id": user["id"]}, {"$set": {"messages": messages}}, upsert=True)
                yield f"data: {json.dumps({'done': True, 'session_id': sid})}\n\n"
                break

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.get("/chatbot/history")
async def chatbot_history(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    sid = f"chat_{user['id']}_{today}"
    session = await db.chatbot_sessions.find_one({"session_id": sid, "user_id": user["id"]})
    if not session:
        return {"messages": [], "session_id": sid}
    session["id"] = str(session.pop("_id", ""))
    return session


# ========================
# FILE ROUTES
# ========================
@api_router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), appointment_id: Optional[str] = Query(None), session_id: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, "Only PDF, JPG, PNG files allowed")
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, file.content_type)
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(500, "Upload failed")
    doc = {
        "user_id": user["id"], "appointment_id": appointment_id,
        "intake_session_id": session_id, "storage_path": result["path"],
        "original_filename": file.filename, "content_type": file.content_type,
        "size": result.get("size", len(data)), "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    r = await db.files.insert_one(doc)
    doc["id"] = str(r.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/files/{fid}/download")
async def download_file(fid: str, user: dict = Depends(get_current_user)):
    try:
        f = await db.files.find_one({"_id": ObjectId(fid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not f or f.get("is_deleted"):
        raise HTTPException(404, "Not found")
    if f["user_id"] != user["id"]:
        if user["role"] in ["doctor", "psychologist", "nutritionist"]:
            apt = await db.appointments.find_one({"professional_id": user["id"], "patient_id": f["user_id"]})
            if not apt:
                raise HTTPException(403, "Access denied")
        else:
            raise HTTPException(403, "Access denied")
    try:
        data, ct = get_object(f["storage_path"])
    except Exception as e:
        raise HTTPException(500, f"Download failed: {e}")
    return Response(content=data, media_type=f.get("content_type", ct))


@api_router.get("/files")
async def list_files(appointment_id: Optional[str] = Query(None), session_id: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    q = {"is_deleted": False}
    if user["role"] == "patient":
        q["user_id"] = user["id"]
    if appointment_id:
        q["appointment_id"] = appointment_id
    if session_id:
        q["intake_session_id"] = session_id
    files = await db.files.find(q).to_list(100)
    result = []
    for f in files:
        f["id"] = str(f.pop("_id", ""))
        result.append(f)
    return result


# ========================
# VIDEO ROUTES
# ========================
@api_router.post("/video/create-room/{aid}")
async def create_video_room(aid: str, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] not in [apt["patient_id"], apt["professional_id"]]:
        raise HTTPException(403, "Access denied")
    if apt.get("daily_room_url"):
        return {"room_url": apt["daily_room_url"]}

    room_name = f"mb-{aid[:20]}"
    exp = int((datetime.now(timezone.utc) + timedelta(hours=4)).timestamp())
    try:
        r = requests.post(f"{DAILY_API}/rooms", headers=daily_headers(), json={"name": room_name, "privacy": "private", "properties": {"max_participants": 2, "enable_chat": True, "exp": exp}}, timeout=30)
        if r.status_code == 400:
            r2 = requests.get(f"{DAILY_API}/rooms/{room_name}", headers=daily_headers(), timeout=30)
            if r2.status_code == 200:
                room_url = r2.json().get("url", "")
            else:
                raise HTTPException(500, f"Daily.co error: {r.text}")
        else:
            r.raise_for_status()
            room_url = r.json().get("url", "")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Daily.co error: {e}")
        raise HTTPException(500, "Failed to create video room")

    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"daily_room_url": room_url, "status": "in_call", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"room_url": room_url}


@api_router.post("/video/token/{aid}")
async def get_video_token(aid: str, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] not in [apt["patient_id"], apt["professional_id"]]:
        raise HTTPException(403, "Access denied")
    if not apt.get("daily_room_url"):
        raise HTTPException(400, "Room not created yet")

    room_name = apt["daily_room_url"].rstrip("/").split("/")[-1]
    is_owner = user["id"] == apt["professional_id"]
    exp = int((datetime.now(timezone.utc) + timedelta(hours=4)).timestamp())
    try:
        r = requests.post(f"{DAILY_API}/meeting-tokens", headers=daily_headers(), json={"properties": {"room_name": room_name, "user_name": user["name"], "is_owner": is_owner, "exp": exp}}, timeout=30)
        r.raise_for_status()
        return {"token": r.json().get("token"), "room_url": apt["daily_room_url"]}
    except Exception as e:
        logger.error(f"Daily token error: {e}")
        raise HTTPException(500, "Failed to create meeting token")


# ========================
# CONSULTATION ROUTES
# ========================
@api_router.post("/consultations/{aid}/eprescription")
async def create_eprescription(aid: str, req: EPrescriptionReq, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] != apt["professional_id"]:
        raise HTTPException(403, "Professional only")
    if user["role"] != "doctor":
        raise HTTPException(403, "Doctors only")
    rx = {
        "prescription_number": f"RX-{aid[:8].upper()}-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
        "doctor_id": user["id"], "doctor_name": user["name"],
        "patient_id": apt["patient_id"], "patient_name": apt["patient_name"],
        "medications": req.medications, "diagnosis": req.diagnosis,
        "instructions": req.instructions, "follow_up": req.follow_up,
        "issued_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"e_prescription": rx, "status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return rx


@api_router.post("/consultations/{aid}/summary")
async def create_summary(aid: str, req: SummaryReq, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] != apt["professional_id"]:
        raise HTTPException(403, "Professional only")
    summary = {
        "professional_id": user["id"], "professional_name": user["name"],
        "professional_role": user["role"], "summary": req.summary,
        "recommendations": req.recommendations, "follow_up": req.follow_up,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"final_summary": summary, "status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return summary


@api_router.post("/consultations/{aid}/complete")
async def complete_consultation(aid: str, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] != apt["professional_id"]:
        raise HTTPException(403, "Professional only")
    await db.appointments.update_one({"_id": ObjectId(aid)}, {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Completed"}


@api_router.get("/consultations/{aid}")
async def get_consultation(aid: str, user: dict = Depends(get_current_user)):
    try:
        apt = await db.appointments.find_one({"_id": ObjectId(aid)})
    except Exception:
        raise HTTPException(404, "Not found")
    if not apt:
        raise HTTPException(404, "Not found")
    if user["id"] not in [apt["patient_id"], apt["professional_id"]]:
        raise HTTPException(403, "Access denied")
    apt["id"] = str(apt.pop("_id", ""))
    return apt


# ========================
# SEED DATA
# ========================
async def seed_admin_and_demo():
    admin_email = "medibridge26@gmail.com"
    admin_pwd = os.environ.get("ADMIN_PASSWORD", "MediBridge@2024!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_pwd(admin_pwd),
            "name": "MediBridge Admin", "role": "admin",
            "verification_status": "approved", "is_demo": False,
            "specialty": None, "bio": None, "phone": None, "avatar": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    elif not check_pwd(admin_pwd, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_pwd(admin_pwd)}})

    if await db.users.find_one({"is_demo": True}):
        return

    demo_pwd = hash_pwd("Demo@1234")
    now_iso = datetime.now(timezone.utc).isoformat()

    professionals = [
        {"email": "dr.sarah.chen@demo.mb.com", "name": "Dr. Sarah Chen", "role": "doctor", "specialty": "Cardiology", "bio": "Board-certified cardiologist with 12 years experience in heart disease prevention and management."},
        {"email": "dr.james.wilson@demo.mb.com", "name": "Dr. James Wilson", "role": "doctor", "specialty": "General Practice", "bio": "Family medicine physician focused on preventive care and chronic disease management."},
        {"email": "dr.amara.osei@demo.mb.com", "name": "Dr. Amara Osei", "role": "doctor", "specialty": "Dermatology", "bio": "Dermatologist specializing in skin conditions, acne management, and cosmetic dermatology."},
        {"email": "dr.elena.vasquez@demo.mb.com", "name": "Dr. Elena Vasquez", "role": "doctor", "specialty": "Neurology", "bio": "Neurologist with expertise in migraines, epilepsy, and neurodegenerative conditions."},
        {"email": "dr.maya.patel@demo.mb.com", "name": "Dr. Maya Patel", "role": "psychologist", "specialty": "Cognitive Behavioral Therapy", "bio": "Clinical psychologist specializing in anxiety, depression, and CBT."},
        {"email": "dr.tom.nakamura@demo.mb.com", "name": "Dr. Tom Nakamura", "role": "psychologist", "specialty": "Stress Management", "bio": "Licensed psychologist focused on stress management and mindfulness-based therapy."},
        {"email": "lisa.rodriguez@demo.mb.com", "name": "Lisa Rodriguez", "role": "nutritionist", "specialty": "Sports Nutrition", "bio": "Registered dietitian specializing in sports nutrition and weight management."},
        {"email": "mark.thompson@demo.mb.com", "name": "Mark Thompson", "role": "nutritionist", "specialty": "Clinical Nutrition", "bio": "Clinical nutritionist with expertise in chronic disease management through diet."},
    ]

    patients_data = [
        {"email": "john.doe@demo.mb.com", "name": "John Doe"},
        {"email": "jane.smith@demo.mb.com", "name": "Jane Smith"},
    ]

    inserted_ids = {}

    for p in professionals:
        ex = await db.users.find_one({"email": p["email"]})
        if not ex:
            r = await db.users.insert_one({
                "email": p["email"], "password_hash": demo_pwd, "name": p["name"],
                "role": p["role"], "specialty": p["specialty"], "bio": p["bio"],
                "verification_status": "approved", "is_demo": True, "avatar": None,
                "phone": None, "created_at": now_iso
            })
            inserted_ids[p["email"]] = str(r.inserted_id)
        else:
            inserted_ids[p["email"]] = str(ex["_id"])

    for p in patients_data:
        ex = await db.users.find_one({"email": p["email"]})
        if not ex:
            r = await db.users.insert_one({
                "email": p["email"], "password_hash": demo_pwd, "name": p["name"],
                "role": "patient", "verification_status": "not_required",
                "is_demo": True, "specialty": None, "bio": None, "phone": None,
                "avatar": None, "created_at": now_iso
            })
            inserted_ids[p["email"]] = str(r.inserted_id)
        else:
            inserted_ids[p["email"]] = str(ex["_id"])

    for email, uid in inserted_ids.items():
        u = await db.users.find_one({"_id": ObjectId(uid)})
        if not u or u.get("role") in ["patient", "admin"]:
            continue
        if await db.availability.find_one({"professional_id": uid}):
            continue
        for wd, st, et in [(0, "09:00", "12:00"), (1, "14:00", "18:00"), (2, "09:00", "13:00"), (3, "10:00", "16:00"), (4, "09:00", "12:00")]:
            await db.availability.insert_one({"professional_id": uid, "weekday": wd, "start_time": st, "end_time": et, "is_active": True, "is_demo": True, "created_at": now_iso})

    john_id = inserted_ids.get("john.doe@demo.mb.com")
    dr_james_id = inserted_ids.get("dr.james.wilson@demo.mb.com")

    if john_id and dr_james_id and not await db.appointments.find_one({"patient_id": john_id, "is_demo": True}):
        past = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        await db.appointments.insert_one({
            "patient_id": john_id, "patient_name": "John Doe",
            "professional_id": dr_james_id, "professional_name": "Dr. James Wilson",
            "professional_role": "doctor", "professional_specialty": "General Practice",
            "slot_iso": past, "consultation_type": "video", "status": "completed",
            "is_demo": True, "daily_room_url": None,
            "pre_consultation_session_id": None, "notes": None,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat(),
            "updated_at": past,
            "final_summary": {
                "professional_name": "Dr. James Wilson", "professional_role": "doctor",
                "summary": "Patient presented with mild fatigue and occasional headaches. Examination was normal. Recommended lifestyle improvements including better sleep hygiene and hydration.",
                "recommendations": ["Increase daily water intake to 8 glasses", "Maintain 7-8 hours sleep", "30 minutes exercise 3x per week", "Reduce screen time before bed"],
                "follow_up": "Follow-up in 4 weeks if symptoms persist", "created_at": past
            },
            "e_prescription": {
                "prescription_number": "RX-DEMO001-20250601",
                "doctor_name": "Dr. James Wilson", "patient_name": "John Doe",
                "diagnosis": "Mild fatigue - lifestyle-related",
                "medications": [
                    {"name": "Vitamin D3", "dosage": "1000 IU", "frequency": "Once daily", "duration": "3 months", "instructions": "Take with breakfast"},
                    {"name": "Magnesium Glycinate", "dosage": "200mg", "frequency": "Once at bedtime", "duration": "3 months", "instructions": "May improve sleep quality"}
                ],
                "instructions": "Take medications as directed. Stay well hydrated. Avoid heavy meals 2 hours before bedtime.",
                "follow_up": "Review in 4 weeks", "issued_at": past
            }
        })

    logger.info("Demo data seeded successfully")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.availability.create_index("professional_id")
    await db.appointments.create_index("patient_id")
    await db.appointments.create_index("professional_id")
    await db.chatbot_sessions.create_index([("session_id", 1), ("user_id", 1)])
    await seed_admin_and_demo()
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init (non-critical): {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "https://medibridge-demo-2.preview.emergentagent.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
