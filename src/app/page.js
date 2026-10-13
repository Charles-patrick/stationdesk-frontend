'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Field } from '@/components/ui';

const APP = process.env.NEXT_PUBLIC_APP_NAME || 'StationDesk';

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    const slug = code.trim().toLowerCase();
    if (!slug) return;
    setBusy(true); setErr('');
    try { await api.get(`/public/station/${slug}`); router.push(`/s/${slug}`); }
    catch (x) { setErr(x.status === 404 ? 'We could not find a station with that code.' : x.message); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <div className="hero">
        <div className="inner">
          <h1>{APP}</h1>
          <p>Daily sales, stock and customer orders for fuel stations. Replace the paper book with something that adds up for you.</p>
        </div>
      </div>
      <div className="pubmain">
        <div className="card" style={{ maxWidth: 460 }}>
          <h2 style={{ marginBottom: 12 }}>Find your station</h2>
          <form onSubmit={go} className="stack">
            <Field label="Station code" hint="This is the last part of the address your station gave you, for example demo.">
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="demo" autoCapitalize="none" autoCorrect="off" />
            </Field>
            {err && <div className="banner bad"><div className="b">{err}</div></div>}
            <Button variant="brand" loading={busy} type="submit">Continue</Button>
          </form>
        </div>
        <p className="small muted" style={{ marginTop: 18 }}><Link href="/platform/login">Platform owner sign in</Link></p>
      </div>
    </div>
  );
}
