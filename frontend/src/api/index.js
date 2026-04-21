const API_BASE = "http://10.224.213.198:8000";

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function register(fullName, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data; // { access_token, user }
}

export async function forgotPassword(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data; // { reset_token, ... }
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Reset failed");
  return data;
}

// ─── JD Parser ───────────────────────────────────────────────────────────────

export async function parseJD(jobDescription) {
  const res = await fetch(`${API_BASE}/parse-jd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_description: jobDescription }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "JD parsing failed");
  return data;
}

// ─── Resume Analysis ─────────────────────────────────────────────────────────

export async function analyzeResume(file, jobDescription) {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("job_description", jobDescription);

  const res = await fetch(`${API_BASE}/analyze-resume`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  console.log("analyze-resume response:", data);
  if (!res.ok) throw new Error(data.detail || "Resume analysis failed");
  return data;
}

// ─── Interview Questions ──────────────────────────────────────────────────────

export async function generateInterviewQuestions(resumeId) {
  const res = await fetch(`${API_BASE}/generate-interview-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to generate questions");
  return data;
}

// ─── Recruiter Chat ───────────────────────────────────────────────────────────

export async function recruiterChat(resumeId, question) {
  const res = await fetch(`${API_BASE}/recruiter-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, question }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Chat failed");
  return data;
}

// ─── Rankings ────────────────────────────────────────────────────────────────

export async function fetchRankings() {
  const res = await fetch(`${API_BASE}/rank`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch rankings");
  return data;
}
