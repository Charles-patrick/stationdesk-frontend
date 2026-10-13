'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setScope, setToken } from '@/lib/api';
import { Banner, Button, Field } from '@/components/ui';

export default function PlatformLogin() {
  const router = useRouter();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      setScope('platform');
      const r = await api.post('/auth/platform-login', { username: u, password: p });
      setToken(r.token);
      router.replace('/platform');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="authwrap">
      <form className="card authcard stack" onSubmit={go}>
        <h1>Platform owner</h1>
        <Field label="Username"><input className="input" value={u} onChange={(e) => setU(e.target.value)} autoCapitalize="none" required /></Field>
        <Field label="Password"><input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} required /></Field>
        {err && <Banner tone="bad">{err}</Banner>}
        <Button variant="brand" size="lg" loading={busy} type="submit">Log in</Button>
      </form>
    </div>
  );
}
