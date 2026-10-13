'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Badge, Banner, Button, Card, PageHead, useAction, useToast } from '@/components/ui';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format';

const STEPS = ['pending', 'confirmed', 'ready', 'completed'];

export default function OrderDetail() {
  const { id } = useParams();
  const s = useStation();
  const toast = useToast();
  const order = useApi(`/orders/${id}`);
  const [run, busy] = useAction();

  const cancel = async () => {
    if (!(await toast.confirm({ title: 'Cancel this order?', message: 'The station will be told you cancelled it.', confirm: 'Cancel order', cancel: 'Keep it', danger: true }))) return;
    run(async () => { await api.post(`/orders/${id}/status`, { status: 'cancelled' }); await order.reload(); }, 'Order cancelled');
  };
  const proof = (e) => {
    const f = e.target.files?.[0];
    if (f) run(async () => { await api.upload(`/orders/${id}/proof`, f); await order.reload(); }, 'Receipt uploaded');
  };

  return (
    <Async state={order}>
      {(o) => (
        <div>
          <PageHead title={`Order #${o.id}`} sub={s.dt(o.created_at)}>
            <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
            <Link className="btn ghost sm" href={s.href(`/print/receipt/${o.id}`)} target="_blank"><span>Print receipt</span></Link>
          </PageHead>
          {o.status !== 'cancelled' && (
            <div className="row mb" style={{ gap: 6 }}>
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
              <div><span className="muted">Collection: </span>{o.fulfilment === 'delivery' ? `Delivery to ${o.delivery_address}` : 'Pickup at the station'}</div>
              {o.preferred_at && <div><span className="muted">Preferred time: </span>{s.dt(o.preferred_at)}</div>}
              {o.vehicle && <div><span className="muted">Vehicle: </span>{o.vehicle}</div>}
              {o.note && <div><span className="muted">Your note: </span>{o.note}</div>}
              <div><span className="muted">Payment: </span>{o.payment_status === 'paid' ? 'Paid' : 'Not yet paid'}</div>
              {o.points_awarded > 0 && <div><span className="muted">Points earned: </span>{o.points_awarded}</div>}
            </div>
          </Card>
          {o.payment_method === 'bank_transfer' && o.status !== 'cancelled' && (
            <Card title="Transfer receipt">
              {o.proof_url ? <p><a href={o.proof_url} target="_blank" rel="noreferrer">View uploaded receipt</a></p> : <p className="muted">Upload a photo of your transfer receipt so the station can confirm payment.</p>}
              <input type="file" accept="image/*,application/pdf" onChange={proof} disabled={busy} />
            </Card>
          )}
          {o.status === 'pending' && <div className="mt"><Button variant="ghost" onClick={cancel} loading={busy}>Cancel this order</Button></div>}
        </div>
      )}
    </Async>
  );
}
