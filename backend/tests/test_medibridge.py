"""MediBridge API Backend Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

PATIENT_CREDS = {"email": "john.doe@demo.mb.com", "password": "Demo@1234"}
DOCTOR_CREDS = {"email": "dr.james.wilson@demo.mb.com", "password": "Demo@1234"}
PSYCH_CREDS = {"email": "dr.maya.patel@demo.mb.com", "password": "Demo@1234"}
NUTRI_CREDS = {"email": "lisa.rodriguez@demo.mb.com", "password": "Demo@1234"}


@pytest.fixture(scope="module")
def patient_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=PATIENT_CREDS)
    assert r.status_code == 200, f"Patient login failed: {r.text}"
    return s


@pytest.fixture(scope="module")
def doctor_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=DOCTOR_CREDS)
    assert r.status_code == 200, f"Doctor login failed: {r.text}"
    return s


# --- Auth Tests ---
class TestAuth:
    """Auth endpoint tests"""

    def test_patient_login(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=PATIENT_CREDS)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "patient"
        assert data["email"] == "john.doe@demo.mb.com"
        assert "id" in data

    def test_doctor_login(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=DOCTOR_CREDS)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "doctor"
        assert data["verification_status"] == "approved"

    def test_psychologist_login(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=PSYCH_CREDS)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "psychologist"

    def test_nutritionist_login(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=NUTRI_CREDS)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "nutritionist"

    def test_invalid_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "bad@bad.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_endpoint(self, patient_session):
        r = patient_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "john.doe@demo.mb.com"

    def test_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# --- Patient Routes ---
class TestPatientRoutes:
    """Patient-specific endpoint tests"""

    def test_get_patient_appointments(self, patient_session):
        r = patient_session.get(f"{BASE_URL}/api/appointments")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_patient_has_completed_appointment(self, patient_session):
        r = patient_session.get(f"{BASE_URL}/api/appointments")
        assert r.status_code == 200
        appointments = r.json()
        completed = [a for a in appointments if a.get("status") == "completed"]
        assert len(completed) >= 1, "John Doe should have at least 1 completed appointment"

    def test_get_professionals_list(self, patient_session):
        r = patient_session.get(f"{BASE_URL}/api/professionals/list")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_professionals_are_approved(self, patient_session):
        r = patient_session.get(f"{BASE_URL}/api/professionals/list")
        assert r.status_code == 200
        professionals = r.json()
        for p in professionals:
            assert p.get("verification_status") == "approved"


# --- Doctor Routes ---
class TestDoctorRoutes:
    """Doctor-specific endpoint tests"""

    def test_doctor_appointments(self, doctor_session):
        r = doctor_session.get(f"{BASE_URL}/api/appointments")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_doctor_availability(self, doctor_session):
        r = doctor_session.get(f"{BASE_URL}/api/availability/my")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_doctor_verification_status(self, doctor_session):
        r = doctor_session.get(f"{BASE_URL}/api/professionals/verification")
        assert r.status_code == 200
        data = r.json()
        # Demo doctor is approved
        assert data.get("status") in ["approved", "not_submitted"], f"Unexpected status: {data}"


# --- Consultation Records ---
class TestConsultationRecords:
    """Consultation record tests"""

    def test_get_consultation_record_for_completed(self, patient_session):
        # Get appointments first
        r = patient_session.get(f"{BASE_URL}/api/appointments")
        assert r.status_code == 200
        appointments = r.json()
        completed = [a for a in appointments if a.get("status") == "completed"]
        assert len(completed) >= 1
        apt_id = completed[0]["id"]

        # Get consultation record
        r2 = patient_session.get(f"{BASE_URL}/api/consultations/{apt_id}")
        assert r2.status_code == 200
        record = r2.json()
        assert "e_prescription" in record or "final_summary" in record or "patient_id" in record

    def test_eprescription_has_medications(self, patient_session):
        r = patient_session.get(f"{BASE_URL}/api/appointments")
        appointments = r.json()
        completed = [a for a in appointments if a.get("status") == "completed"]
        apt_id = completed[0]["id"]
        
        r2 = patient_session.get(f"{BASE_URL}/api/consultations/{apt_id}")
        record = r2.json()
        eprescription = record.get("e_prescription")
        if eprescription:
            medications = eprescription.get("medications", [])
            assert isinstance(medications, list)
            assert len(medications) > 0, "E-prescription should have medications"


# --- Registration ---
class TestRegistration:
    """Registration tests"""

    def test_register_new_patient(self):
        import time
        email = f"test_patient_{int(time.time())}@test.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass@123",
            "name": "Test Patient",
            "role": "patient"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == email.lower()
        assert data["role"] == "patient"

    def test_register_duplicate_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "john.doe@demo.mb.com",
            "password": "Demo@1234",
            "name": "Duplicate",
            "role": "patient"
        })
        assert r.status_code == 400

    def test_register_invalid_role(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test_invalid_role@test.com",
            "password": "TestPass@123",
            "name": "Test",
            "role": "admin"
        })
        assert r.status_code == 400
