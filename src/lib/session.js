'use client';
import { setScope, setToken, getToken } from '@/lib/api';

// One browser can be signed in to several stations. We also remember the last one for the landing page.
const LAST = 'sd_last_session';
const CODE = 'sd_station_code';

export function saveSession(slug, token, role) {
  setScope(slug);
  setToken(token);
  window.localStorage.setItem(LAST, JSON.stringify({ slug, role }));
}
export function lastSession() {
  try {
    const s = JSON.parse(window.localStorage.getItem(LAST) || 'null');
    if (s && window.localStorage.getItem(`sd_token:${s.slug}`)) return s;
  } catch {}
  return null;
}
export const clearLast = () => window.localStorage.removeItem(LAST);
export const rememberedCode = () => (typeof window === 'undefined' ? '' : window.localStorage.getItem(CODE) || '');
export const rememberCode = (c) => window.localStorage.setItem(CODE, c);
export const homePath = (slug, role) => `/s/${slug}${role === 'admin' ? '/admin' : '/staff/shift'}`;
export { getToken };
