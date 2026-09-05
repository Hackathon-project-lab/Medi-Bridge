export const HOME = { emergentLink: "emergent-link" };

export const AUTH = {
  loginForm: "login-form",
  registerForm: "register-form",
  emailInput: "auth-email-input",
  passwordInput: "auth-password-input",
  nameInput: "auth-name-input",
  submitBtn: "auth-submit-btn",
  roleCard: (role) => `role-select-${role}`,
};

export const PATIENT = {
  dashboard: "patient-dashboard",
  startConsultationBtn: "start-consultation-btn",
  findProfessionalsBtn: "find-professionals-btn",
  appointmentCard: "appointment-card",
  prescriptionCard: "prescription-card",
};

export const PROFESSIONAL = {
  dashboard: "professional-dashboard",
  appointmentCard: "professional-appointment-card",
  availabilityForm: "availability-form",
  verificationForm: "verification-form",
};

export const CONSULTATION = {
  joinCallBtn: "join-video-call-btn",
  endCallBtn: "end-call-btn",
  prescriptionForm: "eprescription-form",
  summaryForm: "consultation-summary-form",
  submitPrescriptionBtn: "submit-prescription-btn",
  submitSummaryBtn: "submit-summary-btn",
};

export const CHATBOT = {
  fab: "chatbot-fab",
  panel: "chatbot-panel",
  input: "chatbot-input",
  sendBtn: "chatbot-send-btn",
};

export const INTAKE = {
  startBtn: "start-ai-preconsultation-btn",
  chatInput: "intake-chat-input",
  sendBtn: "intake-send-btn",
  uploadArea: "intake-upload-area",
};
