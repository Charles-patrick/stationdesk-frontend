'use client';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Badge, Banner, Button, Empty, Modal, PageHead, Tabs, useAction, useToast } from '@/components/ui';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format';

const TABS = [['pending', 'New'], ['confirmed', 'Confirmed'], ['ready', 'Ready'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['', 'All']];
const NEXT = { pending: ['confirmed', 'Confirm order'], confirmed: ['ready', 'Mark ready'], ready: ['completed', 'Complete order'] };

export default function StaffOrders() {
  const s = useStation();
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const orders = useApi(`/orders${tab ? `?status=${tab}` : ''}`);
  const [openId, setOpenId] = useState(null);
  const detail = useApi(openId ? `/orders/${openId}` : null, { skip: !openId });
  const [run, busy] = useAction();

  const move = (status) => run(async () => {
    const r = await api.post(`/orders/${openId}/status`, { status });
    await Promise.all([orders.reload(), detail.reload()]);
    if (status === 'completed') setOpenId(null);
    return r;
  }, status === 'cancelled' ? 'Order cancelled' : 'Order updated');
  const cancel = async () => { if (await toast.confirm({ title: 'Cancel this order?', message: 'The customer will be told.', confirm: 'Cancel order', cancel: 'Keep it', danger: true })) move('cancelled'); };
  const paid = (st) => run(async () => { await api.post(`/orders/${openId}/payment`, { payment_status: st }); await Promise.all([orders.reload(), detail.reload()]); });
  const o = detail.data;

  return (
    <div>
      <PageHead title="Orders" sub="Online orders from customers." />
      <Tabs tabs={TABS.map(([k, l]) => ({ key: k || 'all', label: l }))} value={tab || 'all'} onChange={(k) => setTab(k === 'all' ? '' : k)} />
      <Async state={orders} empty={<Empty title="No orders here" />}>
        {(list) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>#</th><th>Customer</th><th>Items</th><th className="num">Total</th><th>Status</th><th>Placed</th></tr></thead>
            <tbody>{list.map((x) => (
              <tr key={x.id} className="clickable" onClick={() => setOpenId(x.id)}>
                <td>{x.id}</td><td>{x.customer_name}</td><td style={{ maxWidth: 280 }}>{x.summary}</td><td className="num">{s.money(x.total)}</td>
                <td><Badge tone={STATUS_TONE[x.status]}>{STATUS_LABEL[x.status]}</Badge></td><td>{s.dt(x.created_at)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
      <Modal open={!!openId} onClose={() => setOpenId(null)} title={o ? `Order #${o.id}` : 'Order'} wide
        footer={o && ['pending', 'confirmed', 'ready'].includes(o.status) ? (
          <><Button variant="ghost" onClick={cancel} disabled={busy}>Cancel order</Button><Button variant="brand" loading={busy} onClick={() => move(NEXT[o.status][0])}>{NEXT[o.status][1]}</Button></>
        ) : null}>
        {!o ? <div className="center"><span className="spinner" /></div> : (
          <div className="stack">
            <div className="row between"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge><span className="small muted">{s.dt(o.created_at)}</span></div>
            <div><strong>{o.customer_name}</strong>{o.customer_company ? ` · ${o.customer_company}` : ''}<br /><span className="muted">{o.customer_phone} {o.customer_email}</span></div>
            <div className="tablewrap"><table className="table"><tbody>
              {o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td className="num">{i.qty} × {s.money(i.unit_price)}</td><td className="num">{s.money(i.amount)}</td></tr>)}
              <tr><td colSpan={2}><strong>Total</strong></td><td className="num"><strong>{s.money(o.total)}</strong></td></tr>
            </tbody></table></div>
            <div>{o.fulfilment === 'delivery' ? <>Deliver to: <strong>{o.delivery_address}</strong></> : <strong>Customer will collect</strong>}{o.preferred_at ? ` · wants it ${s.dt(o.preferred_at)}` : ''}</div>
            {o.vehicle && <div>Vehicle: {o.vehicle}</div>}
            {o.note && <div>Note: {o.note}</div>}
            <div className="row">
              <span>Payment: {o.payment_method === 'bank_transfer' ? 'Bank transfer' : 'Pay on pickup or delivery'} · </span>
              <Badge tone={o.payment_status === 'paid' ? 'good' : 'warn'}>{o.payment_status === 'paid' ? 'Paid' : 'Not paid'}</Badge>
              {o.status !== 'cancelled' && o.status !== 'completed' && <Button size="sm" variant="ghost" onClick={() => paid(o.payment_status === 'paid' ? 'unpaid' : 'paid')}>Mark as {o.payment_status === 'paid' ? 'unpaid' : 'paid'}</Button>}
              {o.proof_url && <a href={o.proof_url} target="_blank" rel="noreferrer">View transfer receipt</a>}
            </div>
            {o.status === 'ready' && <Banner tone="info">Completing the order takes the items out of stock and adds the sale to your open shift.</Banner>}
          </div>
        )}
      </Modal>
    </div>
  );
}
