export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

// Each station keeps its own login in the browser, so one phone can use several stations.
let scope = 'platform';
export const setScope = (s) => { scope = s; };
const key = () => `sd_token:${scope}`;
export const getToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem(key()));
export const setToken = (t) => { if (t) window.localStorage.setItem(key(), t); else window.localStorage.removeItem(key()); };

export class ApiError extends Error {
  constructor(message, status, network = false) { super(message); this.status = status; this.network = network; }
}

async function request(method, path, body, opts = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload, cache: 'no-store' });
  } catch {
    throw new ApiError('No connection. Check your network and try again.', 0, true);
  }
  if (opts.blob) {
    if (!res.ok) throw new ApiError('Could not download the file', res.status);
    return res.blob();
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401 && token && !opts.quiet401) {
      window.dispatchEvent(new CustomEvent('sd:unauthorized'));
    }
    throw new ApiError(data?.error || 'Something went wrong', res.status);
  }
  return data;
}

export const api = {
  get: (p, o) => request('GET', p, undefined, o),
  post: (p, b, o) => request('POST', p, b ?? {}, o),
  patch: (p, b, o) => request('PATCH', p, b ?? {}, o),
  put: (p, b, o) => request('PUT', p, b ?? {}, o),
  del: (p, b, o) => request('DELETE', p, b, o),
  upload: (p, file, field = 'file') => { const f = new FormData(); f.append(field, file); return request('POST', p, f); },
  async download(path, filename) {
    const blob = await request('GET', path, undefined, { blob: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const setTokenFor = (slug, t) => window.localStorage.setItem(`sd_token:${slug}`, t);
