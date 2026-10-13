'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { useStation, homeFor } from '@/lib/station';
import { Button, Field, Tabs, Banner, useToast } from '@/components/ui';

export default function LoginPage() {
  const s = useStation();
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState('password');
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const me = await s.login(username.trim(), secret, mode === 'pin');
      router.replace(s.href(homeFor(me?.user?.role)));
    } catch (x) { setErr(x.message); toast.error(x); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PublicHeader />
      <div className="pubmain" style={{ maxWidth: 460 }}>
        <div className="card">
          <h1 style={{ marginBottom: 14 }}>Log in</h1>
          <Tabs tabs={[{ key: 'password', label: 'Password' }, { key: 'pin', label: 'Staff PIN' }]} value={mode} onChange={(m) => { setMode(m); setSecret(''); }} />
          <form onSubmit={submit} className="stack">
            <Field label={mode === 'pin' ? 'Username' : 'Username or email'}>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
            </Field>
            <Field label={mode === 'pin' ? 'PIN' : 'Password'} hint={mode === 'pin' ? 'Your 4 to 6 digit PIN, for quick sign in on a shared device.' : undefined}>
              <input className="input" type="password" inputMode={mode === 'pin' ? 'numeric' : undefined} value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="current-password" required />
            </Field>
            {err && <Banner tone="bad">{err}</Banner>}
            <Button variant="brand" size="lg" loading={busy} type="submit">Log in</Button>
          </form>
          {s.station?.ordering_enabled && s.station?.signup_open && (
            <p className="small muted" style={{ marginTop: 16 }}>New customer? <Link href={s.href('/register')}><strong>Create an account</strong></Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
