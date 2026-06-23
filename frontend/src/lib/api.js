import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export function apiError(err, fallback = 'Something went wrong.') {
  const d = err?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(', ');
  if (d && typeof d === 'object' && typeof d.msg === 'string') return d.msg;
  return d ? String(d) : (err?.message || fallback);
}

export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 60000,
  withCredentials: true,
});

// ---------- Public ----------
export const joinWaitlist = (payload) => api.post('/waitlist', payload).then((r) => r.data);

// ---------- Auth ----------
export const signup = (data) => api.post('/auth/signup', data).then((r) => r.data);
export const login = (data) => api.post('/auth/login', data).then((r) => r.data);
export const logout = () => api.post('/auth/logout').then((r) => r.data);
export const fetchMe = () => api.get('/auth/me').then((r) => r.data);

export const createInvite = (data = {}) => api.post('/auth/invite', data).then((r) => r.data);
export const getInvite = (token) => api.get(`/auth/invite/${token}`).then((r) => r.data);
export const acceptInvite = (data) => api.post('/auth/accept-invite', data).then((r) => r.data);

// ---------- Family ----------
export const fetchFamily = () => api.get('/family').then((r) => r.data);
export const addMember = (data) => api.post('/members', data).then((r) => r.data);
export const getMember = (id) => api.get(`/members/${id}`).then((r) => r.data);
export const updateMember = (id, data) => api.patch(`/members/${id}`, data).then((r) => r.data);
export const deleteMember = (id) => api.delete(`/members/${id}`).then((r) => r.data);

// ---------- Stories ----------
export const listStories = (memberId) => api.get(`/members/${memberId}/stories`).then((r) => r.data);
export const addStory = (memberId, data) => api.post(`/members/${memberId}/stories`, data).then((r) => r.data);
export const updateStory = (id, data) => api.patch(`/stories/${id}`, data).then((r) => r.data);
export const deleteStory = (id) => api.delete(`/stories/${id}`).then((r) => r.data);

// ---------- Whisper transcription ----------
export const transcribeAudio = async (blob, language) => {
  const form = new FormData();
  const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('wav') ? 'wav' : 'm4a';
  form.append('file', blob, `recording.${ext}`);
  if (language) form.append('language', language);
  const { data } = await api.post('/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data; // { text, language, duration }
};

// ---------- Ask Aangan ----------
export async function askAanganStream(question, sessionId, onDelta, onDone, onError, opts = {}) {
  const path = opts.demo ? '/ask-demo' : '/ask/stream';
  try {
    if (opts.demo) {
      const { data } = await api.post(path, { question, session_id: sessionId });
      onDelta?.(data.answer || '');
      onDone?.();
      return;
    }
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, session_id: sessionId }),
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const evs = buf.split('\n\n');
      buf = evs.pop() || '';
      for (const e of evs) {
        const line = e.replace(/^data: /, '');
        if (line === '[DONE]') return onDone?.();
        if (line.startsWith('[ERROR]')) return onError?.(line);
        onDelta?.(line.replace(/\\n/g, '\n'));
      }
    }
    onDone?.();
  } catch (e) {
    onError?.(e.message || 'stream error');
  }
}
