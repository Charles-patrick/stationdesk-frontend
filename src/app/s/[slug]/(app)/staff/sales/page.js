'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { enqueue, getFailed, getQueue, clearFailed } from '@/lib/offline';
import { uuid } from '@/lib/format';
import { Async, Badge, Banner, Button, Card, Empty, Field, Modal, PageHead, Qty, useAction, useToast } from '@/components/ui';

const PAY = [['cash', 'Cash'], ['transfer', 'Transfer'], ['pos', 'POS'], ['credit', 'Credit']];

export default function SalesPage() {
  const s = useStation();
  const toast = useToast();
  const products = useApi('/catalog/products?active=1');
  const shift = useApi('/shifts/current');
  const credit = useApi('/credit/customers');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState('cash');
  const [cust, setCust] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [voiding, setVoiding] = useState(null);
  const [reason, setReason] = useState('');
  const [run, busy] = useAction();
  const [, force] = useState(0);

  const list = useMemo(() => (products.data || []).filter((p) => p.sale_type !== 'metered'), [products.data]);
  const cats = ['All', ...new Set(list.map((p) => p.category || 'Other'))];
  const shown = list.filter((p) => (cat === 'All' || (p.category || 'Other') === cat) && `${p.name} ${p.variant || ''}`.toLowerCase().includes(search.toLowerCase()));
  const queue = getQueue(s.slug);
  const failed = getFailed(s.slug);
  const hasShift = !!shift.data;

  const open = (p) => { setSel(p); setQty(1); setPay('cash'); setCust(''); setPrice(''); setNote(''); };

  const record = async () => {
    if (!sel) return;
    const payload = {
      product_id: sel.id, qty: Number(qty), payment: pay, client_id: uuid(), note: note || null,
      credit_customer_id: pay === 'credit' ? Number(cust) || null : null,
      ...(sel.sale_type === 'service' && price ? { unit_price: Number(price) } : {}),
    };
    if (pay === 'credit' && !payload.credit_customer_id) return toast.error('Choose the credit customer');
    try {
      await run(async () => {
        try { await api.post('/sales', payload); toast.ok('Sale recorded'); }
        catch (e) {
          if (!e.network) throw e;
          enqueue(s.slug, { path: '/sales', payload, label: `${qty} × ${sel.name}${sel.variant ? ' ' + sel.variant : ''}` });
          toast.ok('No network. Saved on this phone and will send automatically.');
        }
        setSel(null);
        await Promise.all([shift.reload(), products.reload()]);
        force((x) => x + 1);
      });
    } catch { /* handled */ }
  };

  const doVoid = () => run(async () => {
    const r = await api.post(`/sales/${voiding.id}/void`, { reason });
    toast.ok(r.requested ? 'Sent to the admin for approval' : 'Sale cancelled');
    setVoiding(null); setReason('');
    await Promise.all([shift.reload(), products.reload()]);
  });

  return (
    <div>
      <PageHead title="Sales" sub="Drums, kegs, packs and shop items. Fuel is counted from the pump readings." />
      {!shift.loading && !hasShift && s.role === 'staff' && (
        <Banner tone="warn" title="Start your shift first.">You need an open shift to record sales. <Link href={s.href('/staff/shift')}><strong>Go to Shift</strong></Link></Banner>
      )}
      {queue.length > 0 && <Banner tone="info" title={`${queue.length} sale${queue.length > 1 ? 's' : ''} waiting to send.`}>They are saved on this phone and will go through when the network is back. Do not enter them again. Wait until this reaches zero before you close your shift.</Banner>}
      {failed.length > 0 && (
        <Banner tone="bad" title="Some saved entries were refused by the server:" action={<Button size="sm" variant="ghost" onClick={() => { clearFailed(s.slug); force((x) => x + 1); }}>Dismiss</Button>}>
          {failed.map((f, i) => <div key={i}>{f.label}: {f.error}</div>)}
        </Banner>
      )}
      <div className="row mb mt">
        <input className="input" style={{ maxWidth: 300 }} placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
      </div>
      <div className="chips mb">{cats.map((c) => <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <Async state={products} empty={<Empty title="No products yet">Ask the admin to add products.</Empty>}>
        {() => (
          <div className="grid c4">
            {shown.map((p) => (
              <button key={p.id} className={`product ${p.stock_status === 'out' ? 'out' : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => open(p)} disabled={p.stock_status === 'out' && p.sale_type !== 'service'}>
                <div className="name">{p.name}{p.variant ? ` ${p.variant}` : ''}</div>
                <div className="price">{s.money(p.selling_price)}</div>
                <div className="small muted">{p.sale_type === 'service' ? 'Service' : `${p.stock_qty} ${p.unit} in stock`}</div>
              </button>
            ))}
          </div>
        )}
      </Async>

      {hasShift && (
        <Card title="Sales on this shift" className="mt">
          {shift.data.sales.filter((x) => x.source !== 'pump').length === 0 ? <p className="muted">Nothing recorded yet.</p> : (
            <div className="tablewrap"><table className="table">
              <thead><tr><th>Time</th><th>Item</th><th className="num">Qty</th><th className="num">Amount</th><th>Paid by</th><th /></tr></thead>
              <tbody>{shift.data.sales.filter((x) => x.source !== 'pump').map((x) => (
                <tr key={x.id} className={x.voided ? 'voided' : ''}>
                  <td>{s.tm(x.created_at)}</td><td>{x.product_name}</td><td className="num">{x.qty}</td><td className="num">{s.money(x.amount)}</td><td>{x.payment}</td>
                  <td className="right">{!x.voided && <Button size="sm" variant="ghost" onClick={() => { setVoiding(x); setReason(''); }}>Cancel</Button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.name}${sel.variant ? ' ' + sel.variant : ''}` : ''}
        footer={<><Button variant="ghost" onClick={() => setSel(null)}>Cancel</Button><Button variant="brand" loading={busy} onClick={record}>Record sale · {sel ? s.money((sel.sale_type === 'service' && price ? Number(price) : sel.selling_price) * qty) : ''}</Button></>}>
        {sel && (
          <div className="stack">
            <Field label="Quantity"><Qty value={qty} onChange={setQty} min={1} /></Field>
            {sel.sale_type === 'service' && <Field label="Price (leave empty to use the listed price)"><input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} /></Field>}
            <Field label="Paid by">
              <div className="chips">{PAY.map(([k, l]) => <button key={k} type="button" className={`chip ${pay === k ? 'active' : ''}`} onClick={() => setPay(k)}>{l}</button>)}</div>
            </Field>
            {pay === 'credit' && (
              <Field label="Credit customer">
                <select className="input" value={cust} onChange={(e) => setCust(e.target.value)}>
                  <option value="">Choose a customer</option>
                  {(credit.data || []).filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name} (owes {s.money(c.balance)})</option>)}
                </select>
              </Field>
            )}
            <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!voiding} onClose={() => setVoiding(null)} title="Cancel this sale?"
        footer={<><Button variant="ghost" onClick={() => setVoiding(null)}>Keep it</Button><Button variant="danger" loading={busy} onClick={doVoid} disabled={reason.trim().length < 3}>Cancel sale</Button></>}>
        {voiding && <p>{voiding.qty} × {voiding.product_name} for {s.money(voiding.amount)}. The stock is put back.</p>}
        <Field label="Why?"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: entered the wrong item" /></Field>
      </Modal>
    </div>
  );
}
