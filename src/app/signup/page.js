'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { api } from '@/lib/api';
import { Banner, Button, Field } from '@/components/ui';

const slugify = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

export default function SignupPage() {
  const [f, setF] = useState({ business_name: '', station_code: '', owner_name: '', email: '', phone: '', password: '', address: '' });
  const [touched, setTouched] = useState(false);
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState('');
  const [avail, setAvail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (f.station_code.length < 3) { setAvail(null); return; }
    const t = setTimeout(() => api.get(`/auth/slug-available?slug=${f.station_code}`).then(setAvail).catch(() => setAvail(null)), 350);
    return () => clearTimeout(t);
  }, [f.station_code]);
  useEffect(() => { if (!logo) { setPreview(''); return; } const u = URL.createObjectURL(logo); setPreview(u); return () => URL.revokeObjectURL(u); }, [logo]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (logo) fd.append('logo', logo);
      setDone(await api.post('/auth/signup', fd));
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="authwrap"><div className="authcard">
        <div style={{ marginBottom: 18 }}><Link href="/"><Logo /></Link></div>
        <div className="card stack">
          <h1>Thank you</h1>
          <Banner tone="good" title="We received your sign-up.">We will review {done.station.name} and approve it shortly. You will be able to log in with {f.email} once it is approved.</Banner>
          <p className="muted small" style={{ margin: 0 }}>Your station code is <strong>{done.station.slug}</strong>. Your attendants will use it to log in.</p>
          <Link className="btn ghost" href="/">Back to home</Link>
        </div>
      </div></div>
    );
  }

  return (
    <div className="authwrap"><div className="authcard" style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 18 }}><Link href="/"><Logo /></Link></div>
      <form className="card stack" onSubmit={submit}>
        <h1>Sign up your station</h1>
        <p className="muted" style={{ margin: 0 }}>For business owners. We approve every new station before it goes live.</p>
        <Field label="Station or business name"><input className="input" value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value, ...(touched ? {} : { station_code: slugify(e.target.value) }) })} required /></Field>
        <Field label="Station code" hint={avail === null ? 'Used in your store address and by your attendants to log in. Lowercase letters, numbers and dashes.' : avail.valid ? (avail.available ? 'Available' : 'Already taken. Try another.') : 'Use 3 to 31 lowercase letters, numbers or dashes.'}>
          <input className="input" value={f.station_code} onChange={(e) => { setTouched(true); setF({ ...f, station_code: slugify(e.target.value) }); }} required />
        </Field>
        <div className="form-grid">
          <Field label="Your name"><input className="input" value={f.owner_name} onChange={set('owner_name')} required /></Field>
          <Field label="Phone"><input className="input" type="tel" value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Email" hint="You will log in with this."><input className="input" type="email" value={f.email} onChange={set('email')} autoCapitalize="none" required /></Field>
          <Field label="Password" hint="At least 8 characters."><input className="input" type="password" minLength={8} value={f.password} onChange={set('password')} required /></Field>
        </div>
        <Field label="Station address (optional)"><input className="input" value={f.address} onChange={set('address')} /></Field>
        <Field label="Logo (optional)" hint="You can add or change it later in Settings.">
          <div className="row">{preview && <img src={preview} alt="Logo preview" style={{ height: 48, borderRadius: 8, border: '1px solid var(--line)' }} />}<input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} /></div>
        </Field>
        {err && <Banner tone="bad">{err}</Banner>}
        <Button variant="brand" size="lg" loading={busy} disabled={avail && !avail.available} type="submit">Sign up</Button>
        <p className="small muted" style={{ margin: 0 }}>Already signed up? <Link href="/login"><strong>Login</strong></Link></p>
      </form>
    </div></div>
  );
}
