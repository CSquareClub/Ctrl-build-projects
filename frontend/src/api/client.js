import axios from 'axios';

const api = axios.create({
  baseURL: '',  // Uses Vite proxy
  timeout: 60000, // 60s for AI generation
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Auth ─────────────────────────────────────────────────────────────────

export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const getUser = (userId) => api.get(`/auth/users/${userId}`);
export const getHistory = (userId) => api.get(`/auth/users/${userId}/history`);

// ─── Chat ─────────────────────────────────────────────────────────────────

export const askQuestion = (userId, question) =>
  api.post('/chat/ask', { user_id: userId, question });

// ─── Content ──────────────────────────────────────────────────────────────

export const generateNotes = (userId, topic) =>
  api.post('/content/generate-notes', { user_id: userId, topic });

export const generateQuiz = (userId, topic, difficulty = 'medium') =>
  api.post('/content/generate-quiz', { user_id: userId, topic, difficulty });

// ─── Download ─────────────────────────────────────────────────────────────

export const downloadNotes = async (userId, topic) => {
  const url = `/download/${userId}/${encodeURIComponent(topic)}`;
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', `ChatTutor_${topic.replace(/\s+/g, '_')}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ─── Advanced ─────────────────────────────────────────────────────────────

export const generateRoadmap = (userId) =>
  api.post('/content/generate-roadmap', { user_id: userId });

export const generateInterview = (userId) =>
  api.post('/content/generate-interview', { user_id: userId });

// ─── Tracking ─────────────────────────────────────────────────────────────

export const trackProgress = (data) =>
  api.post('/content/track-progress', data);

export const getProgress = (userId) =>
  api.get(`/content/get-progress/${userId}`);

export default api;
