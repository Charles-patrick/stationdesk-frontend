'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { Button, Loading } from '@/components/ui';

export default function ReceiptPrint() {
  const { id } = useParams();
  const key = String(id);
  const isPublicToken = !/^\d+$/.test(key);
  const s = useStation();
  const router = useRouter();
  useEffect(() => { if (!isPublicToken && s.meLoaded && !s.user) router.replace(s.href('/login')); }, [isPublicToken, s.meLoaded, s.user]); // eslint-disable-line
  const order = useApi(isPublicToken ? `/public/orders/${key}` : `/orders/${key}`, { skip: !isPublicToken && !s.user });
  const o = order.data;
  if (!o) return <Loading />;
  const station = o.station || s.station;
  return (
    <div className="printpage">
      <div className="noprint row" style={{ marginBottom: 16 }}><Button variant="brand" onClick={() => window.print()}>Print or save as PDF</Button></div>
      <h1>{station?.name}</h1>
      <p className="muted">{[station?.address, station?.phone].filter(Boolean).join(' · ')}</p>
      <hr className="sep" />
      <h2>Receipt for order #{o.id}</h2>
      <p>{s.dt(o.created_at)}<br />Customer: {o.customer_name}{o.customer_company ? `, ${o.customer_company}` : ''}</p>
      <table className="table" style={{ minWidth: 0 }}>
        <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td className="num">{i.qty}</td><td className="num">{s.money(i.unit_price)}</td><td className="num">{s.money(i.amount)}</td></tr>)}
          <tr><td colSpan={3}><strong>Total</strong></td><td className="num"><strong>{s.money(o.total)}</strong></td></tr>
        </tbody>
      </table>
      <p style={{ marginTop: 14 }}>Status: {o.status}. Payment: {o.payment_status === 'paid' ? 'Paid' : 'Not yet paid'}. {o.fulfilment === 'delivery' ? `Delivery to ${o.delivery_address}.` : 'Collect at the station.'}</p>
      <p className="muted small">Thank you for your business.</p>
    </div>
  );
}
