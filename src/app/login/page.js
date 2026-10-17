'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { api, setScope, setToken } from '@/lib/api';
import { saveSession, homePath, rememberedCode, rememberCode } from '@/lib/session';
import { Banner, Button, Field, Tabs } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('admin');
  const [f, setF] = useState({ email: '', password: '', code: '', username: '', secret: '' });
  const [usePin, setUsePin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { const c = rememberedCode(); if (c) { setF((x) => ({ ...x, code: c })); setTab('staff'); } }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      let res;
      if (tab === 'admin') {
        res = await api.post('/auth/login', { email: f.email, password: f.password }, { quiet401: true });
      } else {
        res = await api.post('/auth/staff-login', { slug: f.code.trim().toLowerCase(), username: f.username.trim(), ...(usePin ? { pin: f.secret } : { password: f.secret }) }, { quiet401: true });
        rememberCode(res.station.slug);
      }
      saveSession(res.station.slug, res.token, res.user.role);
      router.replace(homePath(res.station.slug, res.user.role));
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="authwrap">
      <div className="authcard">
        <div style={{ marginBottom: 18 }}><Link href="/"><Logo /></Link></div>
        <div className="card">
          <h1 style={{ marginBottom: 14 }}>Login</h1>
          <Tabs tabs={[{ key: 'admin', label: 'Owner or admin' }, { key: 'staff', label: 'Staff' }]} value={tab} onChange={(t) => { setTab(t); setErr(''); }} />
          <form onSubmit={submit} className="stack">
            {tab === 'admin' ? (
              <>
                <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} autoCapitalize="none" autoComplete="username" required /></Field>
                <Field label="Password"><input className="input" type="password" value={f.password} onChange={set('password')} autoComplete="current-password" required /></Field>
              </>
            ) : (
              <>
                <Field label="Station code" hint="Your manager gives you this. This phone remembers it after you log in.">
                  <input className="input" value={f.code} onChange={set('code')} autoCapitalize="none" autoCorrect="off" required />
                </Field>
                <Field label="Username"><input className="input" value={f.username} onChange={set('username')} autoCapitalize="none" autoCorrect="off" autoComplete="username" required /></Field>
                <Field label={usePin ? 'PIN' : 'Password'}>
                  <input className="input" type="password" inputMode={usePin ? 'numeric' : undefined} value={f.secret} onChange={set('secret')} autoComplete="current-password" required />
                </Field>
                <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setUsePin(!usePin); setF({ ...f, secret: '' }); }}>
                  {usePin ? 'Use my password instead' : 'Use my PIN instead'}
                </button>
              </>
            )}
            {err && <Banner tone="bad">{err}</Banner>}
            <Button variant="brand" size="lg" loading={busy} type="submit">Login</Button>
          </form>
          <p className="small muted" style={{ marginTop: 16 }}>New business? <Link href="/signup"><strong>Sign up your station</strong></Link></p>
        </div>
      </div>
    </div>
  );
}
