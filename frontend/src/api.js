// Talks to the NYCE 90.7 FM backend (see /backend in this project). Set VITE_API_URL in .env
// to point at your deployed API; defaults to a local dev server on :4000.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'nyce_admin_token';
let authToken = localStorage.getItem(TOKEN_KEY) || null;

export function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken() {
  return authToken;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (e) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 401) {
    setToken(null); // stale/expired token — clear it so the UI drops back to the login screen
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const body = await res.json(); if (body.error) message = body.error; } catch (e) {}
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function crud(base) {
  return {
    list: (query = '') => request(`${base}${query}`),
    get: (id) => request(`${base}/${id}`),
    create: (data) => request(base, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`${base}/${id}`, { method: 'DELETE' }),
  };
}

export const api = {
  auth: {
    login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    me: () => request('/auth/me'),
    changePassword: (currentPassword, newPassword) =>
      request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  },
  categories: crud('/categories'),
  articles: crud('/articles'),
  live: crud('/live'),
  team: crud('/team'),
  research: crud('/research'),
  ads: crud('/ads'),
  contact: {
    get: () => request('/contact'),
    update: (data) => request('/contact', { method: 'PUT', body: JSON.stringify(data) }),
  },
  donate: {
    get: () => request('/donate'),
    updateIntro: (intro) => request('/donate/intro', { method: 'PUT', body: JSON.stringify({ intro }) }),
    addMethod: (data) => request('/donate/methods', { method: 'POST', body: JSON.stringify(data) }),
    updateMethod: (id, data) => request(`/donate/methods/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeMethod: (id) => request(`/donate/methods/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  comments: {
    list: (targetType, targetId) => request(`/comments?targetType=${targetType}&targetId=${targetId}`),
    create: (data) => request('/comments', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
  },
  upload: {
    // For admin-only media (article covers, team photos, live post pictures).
    file: (file) => {
      const form = new FormData();
      form.append('file', file);
      return request('/upload', { method: 'POST', body: form });
    },
    // For anonymous listener voice comments — no admin token attached.
    commentAudio: (blob, filename = 'comment.webm') => {
      const form = new FormData();
      form.append('file', blob, filename);
      return request('/upload/comment-audio', { method: 'POST', body: form });
    },
  },
};
