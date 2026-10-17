'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { AVAIL_LABEL, AVAIL_TONE } from '@/lib/format';
import { Async, Badge, Banner, Button, Empty, Field, Loading, Modal, Qty, useAction, useToast } from '@/components/ui';

// The customer store. No account is needed: customers fill in their details and order.
export default function StorePage() {
  const s = useStation();
  const router = useRouter();
  const toast = useToast();
  const st = s.station;
  const catalog = useApi(`/public/station/${s.slug}/catalog`, { skip: !st || s.state !== 'ready' });
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState({});
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', fulfilment: 'pickup', delivery_address: '', preferred_at: '', note: '', website: '' });
  const [run, busy] = useAction();
  const cartKey = `sd_cart:${s.slug}`;
  const meKey = 'sd_customer';

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(cartKey) || '{}')); } catch {}
    try { const m = JSON.parse(localStorage.getItem(meKey) || 'null'); if (m) setForm((f) => ({ ...f, ...m })); } catch {}
  }, [cartKey]);
  useEffect(() => { localStorage.setItem(cartKey, JSON.stringify(cart)); }, [cart, cartKey]);

  const products = catalog.data?.products || [];
  const cats = useMemo(() => ['All', ...new Set(products.map((p) => p.category || 'Other'))], [products]);
  const shown = products.filter((p) => (cat === 'All' || (p.category || 'Other') === cat) && `${p.name} ${p.variant || ''}`.toLowerCase().includes(search.toLowerCase()));
  const lines = products.filter((p) => cart[p.id] > 0).map((p) => ({ ...p, qty: cart[p.id] }));
  const total = lines.reduce((t, l) => t + l.qty * l.price, 0);
  const count = lines.reduce((t, l) => t + l.qty, 0);
  const setQty = (id, q) => setCart((c) => { const n = { ...c }; if (q > 0) n[id] = q; else delete n[id]; return n; });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const place = (e) => {
    e?.preventDefault();
    run(async () => {
      const res = await api.post(`/public/station/${s.slug}/orders`, {
        ...form, customer_email: form.customer_email || null, preferred_at: form.preferred_at ? new Date(form.preferred_at).toISOString() : null,
        items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
        // The payment method is not chosen yet. Orders default to paying at pickup or delivery.
        payment_method: 'pay_on_pickup',
      });
      localStorage.setItem(meKey, JSON.stringify({ customer_name: form.customer_name, customer_phone: form.customer_phone, customer_email: form.customer_email }));
      setCart({}); setCheckout(false);
      router.push(s.href(`/track/${res.token}?new=1`));
    });
  };

  if (s.state === 'loading') return <Loading />;
  if (s.state === 'missing') return <Empty title="Station not found">Check the address you were given.</Empty>;
  if (s.state === 'error') return <Empty title="Cannot reach the server">Check your connection and try again. If it keeps happening, the service may be waking up, so wait a minute.</Empty>;

  return (
    <div>
      <PublicHeader />
      <div className="hero">
        <div className="inner">
          <h1>{st.name}</h1>
          <p>{[st.address, st.phone].filter(Boolean).join(' · ')}</p>
          {st.delivery_enabled && st.delivery_note && <p style={{ marginTop: 6 }}>{st.delivery_note}</p>}
        </div>
      </div>
      <div className="pubmain" style={{ paddingBottom: 110 }}>
        {s.state === 'paused' ? (
          <Empty title="This store is not available right now">Please contact the station directly.</Empty>
        ) : !st.ordering_enabled ? (
          <Empty title="Online ordering is off">This station is not taking online orders. Please call or visit the station.</Empty>
        ) : (
          <>
            <h2 className="mb">What you can order</h2>
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
            <p className="small muted" style={{ marginTop: 22 }}>Fuel from the pumps is bought at the station. <Link href={s.href('/help')}>How ordering works</Link> · <Link href={s.href('/track')}>Track an order</Link></p>
          </>
        )}
        <p className="small muted" style={{ marginTop: 30 }}><Link href="/login">Staff login</Link></p>
      </div>

      {count > 0 && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 12, zIndex: 25, display: 'flex', justifyContent: 'center', padding: '0 12px' }}>
          <button className="btn brand lg" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.25)', width: '100%', maxWidth: 520, justifyContent: 'space-between' }} onClick={() => setCheckout(true)}>
            <span>View order ({count})</span><span>{s.money(total)}</span>
          </button>
        </div>
      )}

      <Modal open={checkout} onClose={() => setCheckout(false)} title="Your order" wide
        footer={<><Button variant="ghost" onClick={() => setCheckout(false)}>Keep shopping</Button><Button variant="brand" loading={busy} onClick={place} disabled={!form.customer_name || !form.customer_phone}>Place order · {s.money(total)}</Button></>}>
        <form className="stack" onSubmit={place}>
          <div className="tablewrap"><table className="table"><tbody>
            {lines.map((l) => (
              <tr key={l.id}><td>{l.name}{l.variant ? ` ${l.variant}` : ''}</td><td><Qty value={l.qty} onChange={(q) => setQty(l.id, q)} /></td><td className="num">{s.money(l.qty * l.price)}</td></tr>
            ))}
            <tr><td colSpan={2}><strong>Total</strong></td><td className="num"><strong>{s.money(total)}</strong></td></tr>
          </tbody></table></div>

          <h3>Your details</h3>
          <div className="form-grid">
            <Field label="Your name"><input className="input" value={form.customer_name} onChange={set('customer_name')} autoComplete="name" required /></Field>
            <Field label="Phone number" hint="So the station can call you."><input className="input" type="tel" value={form.customer_phone} onChange={set('customer_phone')} autoComplete="tel" required /></Field>
            <Field label="Email (optional)" hint="We will send order updates here."><input className="input" type="email" value={form.customer_email} onChange={set('customer_email')} autoComplete="email" /></Field>
          </div>
          {/* Hidden trap for bots. Real people never see or fill this in. */}
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

          <div className="form-grid">
            <Field label="How will you get it?">
              <select className="input" value={form.fulfilment} onChange={set('fulfilment')}>
                <option value="pickup">I will collect it</option>
                {st.delivery_enabled && <option value="delivery">Deliver to me</option>}
              </select>
            </Field>
            <Field label="Preferred date and time"><input className="input" type="datetime-local" value={form.preferred_at} onChange={set('preferred_at')} /></Field>
          </div>
          {form.fulfilment === 'delivery' && (
            <Field label="Delivery address" hint={st.delivery_note || undefined}><textarea className="input" value={form.delivery_address} onChange={set('delivery_address')} required /></Field>
          )}
          <Field label="Note for the station (optional)"><textarea className="input" value={form.note} onChange={set('note')} /></Field>

          {/* ADD PAYMENT METHOD UI HERE. Orders currently default to "pay on pickup or delivery".
              To accept other methods, add the key to PAYMENT_METHODS in backend/src/routes/public.js
              and send the chosen value as payment_method in the place() function above. */}
          <h1>Payment Method</h1>
          <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
        </form>
      </Modal>
    </div>
  );
}
