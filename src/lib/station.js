'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setScope, setToken, getToken } from '@/lib/api';
import { contrastInk, money as fmtMoney, dateTime as fmtDateTime, timeOnly as fmtTime, dateOnly as fmtDate } from '@/lib/format';
import { flushQueue, getQueue, getFailed, subscribe } from '@/lib/offline';

const Ctx = createContext(null);
export const useStation = () => useContext(Ctx);

export function StationProvider({ slug, children }) {
  setScope(slug);
  const [station, setStation] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [me, setMe] = useState(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const loadMe = useCallback(async () => {
    if (!getToken()) { setMe(null); setMeLoaded(true); return null; }
    try {
      const data = await api.get('/auth/me', { quiet401: true });
      setMe(data);
      return data;
    } catch (e) {
      if (e.status === 401) { setToken(null); setMe(null); }
      return null;
    } finally { setMeLoaded(true); }
  }, []);

  const loadStation = useCallback(async () => {
    try {
      const s = await api.get(`/public/station/${slug}`);
      setStation(s);
      setState('ready');
    } catch (e) {
      setState(e.status === 404 ? 'missing' : 'error');
    }
  }, [slug]);

  useEffect(() => { loadStation(); loadMe(); }, [loadStation, loadMe]);

  // Station colours become CSS variables so every screen picks up the station's branding
  useEffect(() => {
    if (!station) return;
    document.documentElement.style.setProperty('--brand', station.brand_color);
    document.documentElement.style.setProperty('--brand-ink', contrastInk(station.brand_color));
    document.title = station.name;
    return () => { document.documentElement.style.removeProperty('--brand'); document.documentElement.style.removeProperty('--brand-ink'); };
  }, [station]);

  useEffect(() => {
    const onUnauthorized = () => { setToken(null); setMe(null); };
    window.addEventListener('sd:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sd:unauthorized', onUnauthorized);
  }, []);

  // Send anything entered while offline
  useEffect(() => {
    const refresh = () => { setQueueCount(getQueue(slug).length); setFailedCount(getFailed(slug).length); };
    refresh();
    const unsub = subscribe(refresh);
    const run = () => { if (getToken() && navigator.onLine) flushQueue(slug, api); };
    window.addEventListener('online', run);
    const t = setInterval(run, 30000);
    run();
    return () => { unsub(); window.removeEventListener('online', run); clearInterval(t); };
  }, [slug, me?.user?.id]);

  const login = useCallback(async (username, secret, usePin) => {
    const res = await api.post('/auth/login', { slug, username, ...(usePin ? { pin: secret } : { password: secret }) });
    setToken(res.token);
    const data = await loadMe();
    return data;
  }, [slug, loadMe]);

  const register = useCallback(async (form) => {
    const res = await api.post('/auth/register', { slug, ...form });
    if (res.token) { setToken(res.token); await loadMe(); }
    return res;
  }, [slug, loadMe]);

  const logout = useCallback(() => { setToken(null); setMe(null); }, []);

  const switchStation = useCallback(async (id) => {
    const res = await api.post('/auth/switch-station', { station_id: id });
    return res.station;
  }, []);

  const value = useMemo(() => {
    const currency = station?.currency || 'NGN';
    const tz = me?.station?.timezone || 'Africa/Lagos';
    return {
      slug, station, state, me, user: me?.user || null, role: me?.user?.role || null, meLoaded, loadMe, login, register, logout, switchStation,
      fullStation: me?.station || null, queueCount, failedCount,
      money: (n) => fmtMoney(n, currency), dt: (d) => fmtDateTime(d, tz), tm: (d) => fmtTime(d, tz), dd: (d) => fmtDate(d, tz),
      href: (p) => `/s/${slug}${p === '/' ? '' : p}`,
    };
  }, [slug, station, state, me, meLoaded, loadMe, login, register, logout, switchStation, queueCount, failedCount]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'staff' ? '/staff/shift' : '/shop');
