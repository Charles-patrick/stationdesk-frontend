'use client';
import { useMemo, useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { num } from '@/lib/format';
import { Async, Banner, Button, Card, Empty, Field, PageHead, useAction, useToast } from '@/components/ui';

const blank = { product_id: '', tank_id: '', qty: '', supplier_name: '', cost_price: '', waybill: '', dip_before: '', dip_after: '', note: '' };

export default function RestockPage() {
  const s = useStation();
  const toast = useToast();
  const products = useApi('/catalog/products?active=1');
  const forecourt = useApi('/forecourt');
  const recent = useApi('/inventory/restocks');
  const [f, setF] = useState(blank);
  const [photo, setPhoto] = useState(null);
  const [run, busy] = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const prods = (products.data || []).filter((p) => p.sale_type !== 'service');
  const product = prods.find((p) => String(p.id) === String(f.product_id));
  const tanks = useMemo(() => (forecourt.data?.tanks || []).filter((t) => product && t.product_id === product.id && t.active), [forecourt.data, product]);
  const metered = product?.sale_type === 'metered';
  const numOrNull = (v) => (v === '' ? null : Number(v));

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const row = await api.post('/inventory/restock', {
        product_id: Number(f.product_id), tank_id: metered ? Number(f.tank_id) || null : null, qty: Number(f.qty),
        supplier_name: f.supplier_name || null,
        cost_price: numOrNull(f.cost_price), waybill: f.waybill || null,
        dip_before: metered ? numOrNull(f.dip_before) : null, dip_after: metered ? numOrNull(f.dip_after) : null, note: f.note || null,
      });
      if (photo) await api.upload(`/inventory/restock/${row.id}/photo`, photo).catch(() => toast.error('Restock saved, but the photo did not upload'));
      setF(blank); setPhoto(null);
      await Promise.all([recent.reload(), products.reload(), forecourt.reload()]);
      if (row.short_delivery > 0.5) toast.error(`Stock added, but the tank rose ${num(row.short_delivery)} L less than the delivery. The admin has been told.`);
    }, 'Restock recorded');
  };

  return (
    <div>
      <PageHead title="Restock" sub="Record deliveries so stock stays right." />
      <Card title="New delivery">
        <form className="stack" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Product">
              <select className="input" value={f.product_id} onChange={(e) => setF({ ...blank, product_id: e.target.value })} required>
                <option value="">Choose a product</option>
                {prods.map((p) => <option key={p.id} value={p.id}>{p.name}{p.variant ? ` ${p.variant}` : ''}</option>)}
              </select>
            </Field>
            {metered && (
              <Field label="Tank that received it">
                <select className="input" value={f.tank_id} onChange={set('tank_id')} required>
                  <option value="">Choose a tank</option>
                  {tanks.map((t) => <option key={t.id} value={t.id}>{t.name} ({num(t.current_litres)} L now)</option>)}
                </select>
              </Field>
            )}
            <Field label={`Quantity delivered${product ? ` (${product.unit})` : ''}`}><input className="input" inputMode="decimal" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value.replace(/[^0-9.]/g, '') })} required /></Field>
          </div>
          {metered && (
            <div className="form-grid">
              <Field label="Dipstick before (litres)" hint="Optional. Lets the system check for a short delivery."><input className="input" inputMode="decimal" value={f.dip_before} onChange={(e) => setF({ ...f, dip_before: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>
              <Field label="Dipstick after (litres)"><input className="input" inputMode="decimal" value={f.dip_after} onChange={(e) => setF({ ...f, dip_after: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>
            </div>
          )}
          <div className="form-grid">
            <Field label="Supplier"><input className="input" value={f.supplier_name} onChange={set('supplier_name')} /></Field>
            <Field label="Waybill or delivery number"><input className="input" value={f.waybill} onChange={set('waybill')} /></Field>
            {s.role === 'admin' && <Field label="Cost price per unit"><input className="input" inputMode="decimal" value={f.cost_price} onChange={(e) => setF({ ...f, cost_price: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>}
          </div>
          <Field label="Photo of the delivery note (optional)"><input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /></Field>
          <Field label="Note"><input className="input" value={f.note} onChange={set('note')} /></Field>
          <div><Button type="submit" variant="brand" size="lg" loading={busy}>Save delivery</Button></div>
        </form>
      </Card>
      <Card title="Recent deliveries" className="mt">
        <Async state={recent} empty={<Empty title="No deliveries yet" />}>
          {(list) => (
            <div className="tablewrap"><table className="table">
              <thead><tr><th>Date</th><th>Product</th><th className="num">Quantity</th><th>Supplier</th><th>Waybill</th><th>Received by</th></tr></thead>
              <tbody>{list.slice(0, 30).map((r) => (
                <tr key={r.id} className={r.voided ? 'voided' : ''}>
                  <td>{s.dt(r.created_at)}</td><td>{r.product_name}{r.variant ? ` ${r.variant}` : ''}{r.tank_name ? ` → ${r.tank_name}` : ''}</td>
                  <td className="num">{num(r.qty)}{r.short_delivery > 0.5 ? <><br /><span className="small" style={{ color: 'var(--bad)' }}>short {num(r.short_delivery)} L</span></> : null}</td>
                  <td>{r.supplier_name}</td><td>{r.waybill}</td><td>{r.received_by_name}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Async>
      </Card>
    </div>
  );
}
