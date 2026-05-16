/**
 * Central API helper: attaches JWT and normalizes errors.
 */
const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const { signal, headers: optHeaders, ...rest } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(optHeaders || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...rest, headers, signal });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || 'Invalid response' };
  }
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function downloadUrl(path) {
  const token = getToken();
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${BASE}${path}${q}`;
}
