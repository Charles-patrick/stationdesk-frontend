'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { useStation } from '@/lib/station';
import { Button, Field, Banner, useToast } from '@/components/ui';

export default function RegisterPage() {
  const s = useStation();
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', phone: '', company: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await s.register(f);
      if (res.pending) setDone(res.message);
      else router.replace(s.href('/shop'));
    } catch (x) { toast.error(x); }
    finally { setBusy(false); }
  };

  const closed = s.station && (!s.station.ordering_enabled || !s.station.signup_open);
  return (
    <div>
      <PublicHeader />
      <div className="pubmain" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1 style={{ marginBottom: 14 }}>Create your account</h1>
          {closed && <Banner tone="warn">This station is not taking new online accounts. Please contact the station.</Banner>}
          {done && <Banner tone="good" title="Almost there.">{done}</Banner>}
          {!closed && !done && (
            <form onSubmit={submit} className="stack">
              <Field label="Your name"><input className="input" value={f.name} onChange={set('name')} required /></Field>
              <Field label="Email" hint="You will log in with this."><input className="input" type="email" value={f.email} onChange={set('email')} required autoCapitalize="none" /></Field>
              <Field label="Phone number"><input className="input" type="tel" value={f.phone} onChange={set('phone')} /></Field>
              <Field label="Company (optional)"><input className="input" value={f.company} onChange={set('company')} /></Field>
              <Field label="Password" hint="At least 6 characters."><input className="input" type="password" value={f.password} onChange={set('password')} minLength={6} required /></Field>
              <Button variant="brand" size="lg" loading={busy} type="submit">Create account</Button>
            </form>
          )}
          <p className="small muted" style={{ marginTop: 16 }}>Already have an account? <Link href={s.href('/login')}><strong>Log in</strong></Link></p>
        </div>
      </div>
    </div>
  );
}
