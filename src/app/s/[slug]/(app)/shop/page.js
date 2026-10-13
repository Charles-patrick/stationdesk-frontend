'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { AVAIL_LABEL, AVAIL_TONE } from '@/lib/format';
import { Async, Badge, Banner, Button, Empty, Field, Modal, PageHead, Qty, useAction, useToast } from '@/components/ui';

export default function ShopPage() {
  const s = useStation();
  const router = useRouter();
  const toast = useToast();
  const catalog = useApi('/orders/catalog');
  const vehicles = useApi('/orders/vehicles');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState({});
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ fulfilment: 'pickup', delivery_address: '', preferred_at: '', vehicle: '', note: '' });
  const [run, busy] = useAction();
  const key = `sd_cart:${s.slug}`;

  useEffect(() => { try { setCart(JSON.parse(localStorage.getItem(key) || '{}')); } catch {} }, [key]);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(cart)); }, [cart, key]);

  const products = catalog.data || [];
  const cats = useMemo(() => ['All', ...new Set(products.map((p) => p.category || 'Other'))], [products]);
  const shown = products.filter((p) => (cat === 'All' || (p.category || 'Other') === cat)
    && `${p.name} ${p.variant || ''}`.toLowerCase().includes(search.toLowerCase()));
  const lines = products.filter((p) => cart[p.id] > 0).map((p) => ({ ...p, qty: cart[p.id] }));
  const total = lines.reduce((t, l) => t + l.qty * l.price, 0);
  const count = lines.reduce((t, l) => t + l.qty, 0);
  const setQty = (id, q) => setCart((c) => { const n = { ...c }; if (q > 0) n[id] = q; else delete n[id]; return n; });

  const place = () => run(async () => {
    const order = await api.post('/orders', {
      items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
      fulfilment: form.fulfilment, delivery_address: form.delivery_address || null,
      preferred_at: form.preferred_at ? new Date(form.preferred_at).toISOString() : null,
      vehicle: form.vehicle || null, note: form.note || null,
      // The payment method is not chosen yet. Orders default to paying at pickup or delivery.
      payment_method: 'pay_on_pickup',
    });
    setCart({}); setCheckout(false);
    toast.ok('Order placed. The station will confirm it shortly.');
    router.push(s.href(`/orders/${order.id}`));
  });

  if (!s.station?.ordering_enabled) return <Empty title="Online ordering is off">This station is not taking online orders right now.</Empty>;

  return (
    <div>
      <PageHead title="Shop" sub="Drums, kegs and lubricants. Fuel from the pumps is bought at the station." />
      <div className="row mb">
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
      </div>
      <div className="chips mb">{cats.map((c) => <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <Async state={catalog} empty={<Empty title="Nothing to order yet">The station has not listed products for online ordering.</Empty>}>
        {() => (
          <div className="grid c3">
            {shown.map((p) => (
              <div key={p.id} className={`product ${p.availability === 'out' ? 'out' : ''}`}>
                <div className="name">{p.name}{p.variant ? ` ${p.variant}` : ''}</div>
                <div className="row between"><span className="price">{s.money(p.price)}</span><Badge tone={AVAIL_TONE[p.availability]}>{AVAIL_LABEL[p.availability]}</Badge></div>
                {p.availability === 'out' ? <div className="muted small">Not available right now</div>
                  : cart[p.id] ? <Qty value={cart[p.id]} onChange={(q) => setQty(p.id, q)} min={0} />
                  : <Button size="sm" variant="ghost" onClick={() => setQty(p.id, 1)}>Add to order</Button>}
              </div>
            ))}
            {shown.length === 0 && <div className="muted">No products match.</div>}
          </div>
        )}
      </Async>

      {count > 0 && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(var(--bottom-h) + 8px)', zIndex: 25, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <button className="btn brand lg" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.25)', width: '100%', maxWidth: 520, justifyContent: 'space-between' }} onClick={() => setCheckout(true)}>
            <span>View order ({count})</span><span>{s.money(total)}</span>
          </button>
        </div>
      )}

      <Modal open={checkout} onClose={() => setCheckout(false)} title="Your order" wide
        footer={<><Button variant="ghost" onClick={() => setCheckout(false)}>Keep shopping</Button><Button variant="brand" loading={busy} onClick={place}>Place order · {s.money(total)}</Button></>}>
        <div className="stack">
          <div className="tablewrap"><table className="table"><tbody>
            {lines.map((l) => (
              <tr key={l.id}><td>{l.name}{l.variant ? ` ${l.variant}` : ''}</td><td><Qty value={l.qty} onChange={(q) => setQty(l.id, q)} /></td><td className="num">{s.money(l.qty * l.price)}</td></tr>
            ))}
            <tr><td colSpan={2}><strong>Total</strong></td><td className="num"><strong>{s.money(total)}</strong></td></tr>
          </tbody></table></div>

          <div className="form-grid">
            <Field label="How will you get it?">
              <select className="input" value={form.fulfilment} onChange={(e) => setForm({ ...form, fulfilment: e.target.value })}>
                <option value="pickup">I will collect it</option>
                {s.station.delivery_enabled && <option value="delivery">Deliver to me</option>}
              </select>
            </Field>
            <Field label="Preferred date and time"><input className="input" type="datetime-local" value={form.preferred_at} onChange={(e) => setForm({ ...form, preferred_at: e.target.value })} /></Field>
          </div>
          {form.fulfilment === 'delivery' && (
            <Field label="Delivery address" hint={s.station.delivery_note || undefined}>
              <textarea className="input" value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
            </Field>
          )}
          {(vehicles.data || []).length > 0 && (
            <Field label="Vehicle (optional)">
              <select className="input" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}>
                <option value="">None</option>
                {vehicles.data.map((v) => <option key={v.id} value={v.plate}>{v.plate}{v.label ? ` (${v.label})` : ''}</option>)}
              </select>
            </Field>
          )}
          <Field label="Note for the station (optional)"><textarea className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>

          {/* ADD PAYMENT METHOD UI HERE. Orders currently default to "pay on pickup or delivery".
              To accept other methods, add the key to PAYMENT_METHODS in backend/src/routes/orders.js
              and send the chosen value as payment_method in the place() function above. */}
          <h1>Payment Method</h1>
        </div>
      </Modal>
    </div>
  );
}
