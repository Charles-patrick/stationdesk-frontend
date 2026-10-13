'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Button, Card, Field, PageHead, Stat, useAction } from '@/components/ui';

export default function Account() {
  const s = useStation();
  const vehicles = useApi('/orders/vehicles');
  const [run, busy] = useAction();
  const [plate, setPlate] = useState('');
  const [label, setLabel] = useState('');
  const [pw, setPw] = useState({ current: '', next: '' });

  return (
    <div>
      <PageHead title="Account" sub={`${s.user.name} · ${s.user.email || ''}`} />
      {s.station?.loyalty_enabled !== false && s.user.loyalty_points > 0 && <div className="grid c4 mb"><Stat label="Loyalty points" value={s.user.loyalty_points} /></div>}
      <Card title="Your vehicles">
        <Async state={vehicles}>
          {(list) => (
            <div className="stack">
              {list.length === 0 && <p className="muted">Save your vehicles to pick them when you order.</p>}
              {list.map((v) => (
                <div key={v.id} className="row between"><span><strong>{v.plate}</strong> {v.label}</span>
                  <Button size="sm" variant="ghost" onClick={() => run(async () => { await api.del(`/orders/vehicles/${v.id}`); await vehicles.reload(); })}>Remove</Button></div>
              ))}
              <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/orders/vehicles', { plate, label }); setPlate(''); setLabel(''); await vehicles.reload(); }, 'Vehicle saved'); }}>
                <input className="input" style={{ maxWidth: 170 }} placeholder="Plate number" value={plate} onChange={(e) => setPlate(e.target.value)} required />
                <input className="input" style={{ maxWidth: 200 }} placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
                <Button type="submit" size="sm" loading={busy}>Add</Button>
              </form>
            </div>
          )}
        </Async>
      </Card>
      <Card title="Change password">
        <form className="stack" style={{ maxWidth: 360 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/auth/change-password', pw); setPw({ current: '', next: '' }); }, 'Password changed'); }}>
          <Field label="Current password"><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
          <Field label="New password"><input className="input" type="password" minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></Field>
          <Button type="submit" loading={busy}>Change password</Button>
        </form>
      </Card>
    </div>
  );
}
