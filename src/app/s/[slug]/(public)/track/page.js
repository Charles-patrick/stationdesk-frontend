'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { useStation } from '@/lib/station';
import { api } from '@/lib/api';
import { Banner, Button, Field } from '@/components/ui';

export default function TrackLookup() {
  const s = useStation();
  const router = useRouter();
  const [f, setF] = useState({ order_id: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api.post(`/public/station/${s.slug}/lookup`, { order_id: Number(f.order_id), phone: f.phone }); router.push(s.href(`/track/${r.token}`)); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div>
      <PublicHeader />
      <div className="pubmain" style={{ maxWidth: 480 }}>
        <form className="card stack" onSubmit={go}>
          <h1>Track an order</h1>
          <p className="muted" style={{ margin: 0 }}>Enter the order number and the phone number you used when you ordered.</p>
          <Field label="Order number"><input className="input" inputMode="numeric" value={f.order_id} onChange={(e) => setF({ ...f, order_id: e.target.value.replace(/\D/g, '') })} required /></Field>
          <Field label="Phone number"><input className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></Field>
          {err && <Banner tone="bad">{err}</Banner>}
          <Button variant="brand" loading={busy} type="submit">Find my order</Button>
        </form>
      </div>
    </div>
  );
}
