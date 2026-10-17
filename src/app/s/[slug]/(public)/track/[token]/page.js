'use client';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import PublicHeader from '@/components/PublicHeader';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format';
import { Async, Badge, Banner, Button, Card, useAction, useToast } from '@/components/ui';

const STEPS = ['pending', 'confirmed', 'ready', 'completed'];

export default function TrackOrder() {
  const { token } = useParams();
  const isNew = useSearchParams().get('new') === '1';
  const s = useStation();
  const toast = useToast();
  const order = useApi(`/public/orders/${token}`);
  const [run, busy] = useAction();
  useEffect(() => { const t = setInterval(() => order.reload(), 30000); return () => clearInterval(t); }, [order.reload]); // eslint-disable-line

  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href.split('?')[0]); toast.ok('Link copied'); } catch { toast.error('Could not copy. Long-press the address bar to copy it.'); } };
  const cancel = async () => {
    if (!(await toast.confirm({ title: 'Cancel this order?', message: 'The station will be told you cancelled it.', confirm: 'Cancel order', cancel: 'Keep it', danger: true }))) return;
    run(async () => { await api.post(`/public/orders/${token}/cancel`); await order.reload(); }, 'Order cancelled');
  };
  const proof = (e) => { const f = e.target.files?.[0]; if (f) run(async () => { await api.upload(`/public/orders/${token}/proof`, f); await order.reload(); }, 'Receipt uploaded'); };

  return (
    <div>
      <PublicHeader />
      <div className="pubmain" style={{ maxWidth: 720 }}>
        <Async state={order}>
          {(o) => (
            <div className="stack">
              {isNew && (
                <Banner tone="good" title={`Thank you. Your order number is #${o.id}.`} action={<Button size="sm" variant="ghost" onClick={copy}>Copy link</Button>}>
                  Save this page or take a screenshot. You can come back to it to check your order. {o.customer_email ? `We also emailed the link to ${o.customer_email}.` : ''}
                </Banner>
              )}
              <div className="row between">
                <div><h1>Order #{o.id}</h1><div className="muted small">{s.dt(o.created_at)}</div></div>
                <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
              </div>
              {o.status !== 'cancelled' && (
                <div className="row" style={{ gap: 6 }}>
                  {STEPS.map((st, i) => (
                    <div key={st} style={{ flex: 1, minWidth: 70 }}>
                      <div style={{ height: 6, borderRadius: 3, background: STEPS.indexOf(o.status) >= i ? 'var(--ink)' : 'var(--line)' }} />
                      <div className="small" style={{ marginTop: 4, fontWeight: STEPS.indexOf(o.status) === i ? 700 : 400 }}>{STATUS_LABEL[st]}</div>
                    </div>
                  ))}
                </div>
              )}
              <Card title="Items">
                <div className="tablewrap"><table className="table"><tbody>
                  {o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td className="num">{i.qty} × {s.money(i.unit_price)}</td><td className="num">{s.money(i.amount)}</td></tr>)}
                  <tr><td colSpan={2}><strong>Total</strong></td><td className="num"><strong>{s.money(o.total)}</strong></td></tr>
                </tbody></table></div>
              </Card>
              <Card title="Details">
                <div className="stack" style={{ gap: 6 }}>
                  <div><span className="muted">Name: </span>{o.customer_name}</div>
                  <div><span className="muted">Collection: </span>{o.fulfilment === 'delivery' ? `Delivery to ${o.delivery_address}` : 'Pickup at the station'}</div>
                  {o.preferred_at && <div><span className="muted">Preferred time: </span>{s.dt(o.preferred_at)}</div>}
                  {o.note && <div><span className="muted">Your note: </span>{o.note}</div>}
                  <div><span className="muted">Payment: </span>{o.payment_status === 'paid' ? 'Paid' : 'Pay on pickup or delivery'}</div>
                  {o.station.phone && <div><span className="muted">Station phone: </span>{o.station.phone}</div>}
                </div>
              </Card>
              {o.payment_method === 'bank_transfer' && !['cancelled', 'completed'].includes(o.status) && (
                <Card title="Transfer receipt">
                  {o.proof_url ? <p><a href={o.proof_url} target="_blank" rel="noreferrer">View uploaded receipt</a></p> : <p className="muted">Upload a photo of your transfer receipt so the station can confirm payment.</p>}
                  <input type="file" accept="image/*,application/pdf" onChange={proof} disabled={busy} />
                </Card>
              )}
              <div className="row">
                <Link className="btn ghost" href={s.href(`/print/receipt/${token}`)} target="_blank">Print receipt</Link>
                {o.status === 'pending' && <Button variant="ghost" onClick={cancel} loading={busy}>Cancel this order</Button>}
                <Link className="btn ghost" href={s.href('/')}>Back to the store</Link>
              </div>
            </div>
          )}
        </Async>
      </div>
    </div>
  );
}
