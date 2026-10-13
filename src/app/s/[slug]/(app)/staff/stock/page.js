'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { AVAIL_LABEL, AVAIL_TONE, num } from '@/lib/format';
import { Async, Badge, Button, Card, Check, Field, Modal, PageHead, ProgressBar, useAction } from '@/components/ui';

export default function StockPage() {
  const s = useStation();
  const stock = useApi('/inventory/overview');
  const [search, setSearch] = useState('');
  const [dip, setDip] = useState(null);
  const [adj, setAdj] = useState(null);
  const [hist, setHist] = useState(null);
  const [form, setForm] = useState({ litres: '', reconcile: false, qty: '', reason: '' });
  const movements = useApi(hist ? `/inventory/movements?${hist.tank ? 'tank_id' : 'product_id'}=${hist.id}` : null, { skip: !hist });
  const [run, busy] = useAction();

  const saveDip = () => run(async () => {
    const r = await api.post('/inventory/dip', { tank_id: dip.id, litres: Number(form.litres), reconcile: form.reconcile });
    setDip(null); await stock.reload();
    return r;
  }, 'Dip check saved');
  const saveAdj = () => run(async () => {
    await api.post('/inventory/adjust', { product_id: adj.product_id || adj.id, tank_id: adj.tank ? adj.id : null, qty: Number(form.qty), reason: form.reason });
    setAdj(null); await stock.reload();
  }, 'Stock adjusted');

  return (
    <div>
      <PageHead title="Stock" sub="What is in the tanks and on the shelves." />
      <Async state={stock}>
        {(d) => (
          <>
            {d.tanks.length > 0 && (
              <div className="grid c3 mb">
                {d.tanks.map((t) => (
                  <Card key={t.id} title={t.name} actions={<span className="small muted">{t.product_name}</span>}>
                    <div className="row between"><strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem' }}>{num(t.current_litres)} L</strong><span className="muted small">of {num(t.capacity_litres)} L</span></div>
                    <div style={{ margin: '8px 0' }}><ProgressBar value={t.current_litres} max={t.capacity_litres} /></div>
                    {t.last_dip && <div className="small muted">Last dip {num(t.last_dip.litres)} L ({t.last_dip.variance >= 0 ? '+' : ''}{num(t.last_dip.variance)} L) · {s.dt(t.last_dip.created_at)}</div>}
                    <div className="row mt">
                      <Button size="sm" variant="ghost" onClick={() => { setDip(t); setForm({ ...form, litres: '', reconcile: false }); }}>Dip check</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAdj({ ...t, tank: true }); setForm({ ...form, qty: '', reason: '' }); }}>Adjust</Button>
                      <Button size="sm" variant="ghost" onClick={() => setHist({ id: t.id, tank: true, name: t.name })}>History</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <div className="row mb"><input className="input" style={{ maxWidth: 300 }} placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" /></div>
            <div className="tablewrap"><table className="table">
              <thead><tr><th>Product</th><th>Category</th><th className="num">In stock</th><th>Status</th><th /></tr></thead>
              <tbody>{d.products.filter((p) => p.sale_type !== 'metered' && `${p.name} ${p.variant || ''}`.toLowerCase().includes(search.toLowerCase())).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}{p.variant ? ` ${p.variant}` : ''}</td><td className="muted">{p.category}</td>
                  <td className="num">{num(p.stock_qty)} {p.unit}</td>
                  <td><Badge tone={AVAIL_TONE[p.stock_status]}>{AVAIL_LABEL[p.stock_status]}</Badge></td>
                  <td className="right nowrap">
                    <Button size="sm" variant="ghost" onClick={() => { setAdj(p); setForm({ ...form, qty: '', reason: '' }); }}>Adjust</Button>{' '}
                    <Button size="sm" variant="ghost" onClick={() => setHist({ id: p.id, name: p.name })}>History</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          </>
        )}
      </Async>

      <Modal open={!!dip} onClose={() => setDip(null)} title={`Dip check: ${dip?.name || ''}`}
        footer={<><Button variant="ghost" onClick={() => setDip(null)}>Cancel</Button><Button variant="brand" loading={busy} onClick={saveDip} disabled={form.litres === ''}>Save</Button></>}>
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>The system thinks there are {num(dip?.current_litres)} L in this tank. Enter what the dipstick shows.</p>
          <Field label="Litres on the dipstick"><input className="input" inputMode="decimal" value={form.litres} onChange={(e) => setForm({ ...form, litres: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>
          {s.role === 'admin' && <Check title="Set the system stock to match this reading" desc="Use this after you are sure the dipstick is right. The change is recorded." checked={form.reconcile} onChange={(e) => setForm({ ...form, reconcile: e.target.checked })} />}
        </div>
      </Modal>

      <Modal open={!!adj} onClose={() => setAdj(null)} title={`Adjust stock: ${adj?.name || ''}`}
        footer={<><Button variant="ghost" onClick={() => setAdj(null)}>Cancel</Button><Button variant="brand" loading={busy} onClick={saveAdj} disabled={!form.qty || form.reason.trim().length < 3}>Save adjustment</Button></>}>
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>Use for damage, spillage, expiry, theft or a recount. Use a minus sign to remove stock, for example -2.</p>
          <Field label={`Change in quantity${adj?.unit ? ` (${adj.unit})` : ' (litres)'}`}><input className="input" inputMode="decimal" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value.replace(/[^0-9.-]/g, '') })} /></Field>
          <Field label="Reason (required)"><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!hist} onClose={() => setHist(null)} title={`History: ${hist?.name || ''}`} wide>
        <Async state={movements} empty={<p className="muted">No movements yet.</p>}>
          {(list) => (
            <div className="tablewrap"><table className="table">
              <thead><tr><th>When</th><th>What</th><th className="num">Change</th><th className="num">Balance</th><th>Who</th><th>Note</th></tr></thead>
              <tbody>{list.map((m) => (
                <tr key={m.id}><td>{s.dt(m.created_at)}</td><td>{m.type.replace('_', ' ')}</td>
                  <td className="num" style={{ color: m.qty < 0 ? 'var(--bad)' : 'var(--good)' }}>{m.qty > 0 ? '+' : ''}{num(m.qty)}</td>
                  <td className="num">{num(m.balance_after)}</td><td>{m.user_name}</td><td>{m.note}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Async>
      </Modal>
    </div>
  );
}
