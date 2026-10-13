'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { flagText, num, reading } from '@/lib/format';
import { Button, Loading } from '@/components/ui';

export default function ShiftPrint() {
  const { id } = useParams();
  const s = useStation();
  const router = useRouter();
  useEffect(() => { if (s.meLoaded && !s.user) router.replace(s.href('/login')); }, [s.meLoaded, s.user]); // eslint-disable-line
  const shift = useApi(`/shifts/${id}`, { skip: !s.user });
  const x = shift.data;
  if (!x) return <Loading />;
  const sales = x.sales.filter((a) => !a.voided);
  return (
    <div className="printpage">
      <div className="noprint row" style={{ marginBottom: 16 }}><Button variant="brand" onClick={() => window.print()}>Print or save as PDF</Button></div>
      <h1>{s.station?.name}: shift sheet</h1>
      <p>{x.user_name}<br />{s.dt(x.started_at)}{x.closed_at ? ` to ${s.dt(x.closed_at)}` : ' (still open)'}{x.admin_closed ? ' · closed by an admin' : ''}</p>
      {x.pumps.length > 0 && (
        <>
          <h3 style={{ margin: '14px 0 6px' }}>Pumps</h3>
          <table className="table" style={{ minWidth: 0 }}>
            <thead><tr><th>Pump</th><th className="num">Opening</th><th className="num">Closing</th><th className="num">Litres</th><th className="num">Value</th></tr></thead>
            <tbody>{x.pumps.map((p) => <tr key={p.id}><td>{p.pump_name} ({p.product_name})</td><td className="num">{reading(p.opening_reading)}</td><td className="num">{p.closing_reading != null ? reading(p.closing_reading) : ''}</td><td className="num">{num(p.litres)}</td><td className="num">{s.money(p.amount)}</td></tr>)}</tbody>
          </table>
        </>
      )}
      <h3 style={{ margin: '14px 0 6px' }}>Other sales</h3>
      <table className="table" style={{ minWidth: 0 }}>
        <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Amount</th><th>Paid by</th></tr></thead>
        <tbody>{sales.filter((a) => a.source !== 'pump').map((a) => <tr key={a.id}><td>{a.product_name}</td><td className="num">{num(a.qty)}</td><td className="num">{s.money(a.amount)}</td><td>{a.payment}</td></tr>)}</tbody>
      </table>
      <h3 style={{ margin: '14px 0 6px' }}>Cash</h3>
      <table className="table" style={{ minWidth: 0 }}><tbody>
        <tr><td>Pump sales</td><td className="num">{s.money(x.pump_sales)}</td></tr>
        <tr><td>Other sales (not credit)</td><td className="num">{s.money(x.manual_sales)}</td></tr>
        <tr><td>Credit payments received</td><td className="num">{s.money(x.credit_payments)}</td></tr>
        <tr><td>Expenses from the till</td><td className="num">−{s.money(x.till_expenses)}</td></tr>
        <tr><td><strong>Expected</strong></td><td className="num"><strong>{s.money(x.expected_amount)}</strong></td></tr>
        <tr><td>Cash handed over</td><td className="num">{s.money(x.cash_declared)}</td></tr>
        <tr><td>Transfers</td><td className="num">{s.money(x.transfer_declared)}</td></tr>
        <tr><td>POS</td><td className="num">{s.money(x.pos_declared)}</td></tr>
        <tr><td><strong>Difference</strong></td><td className="num"><strong>{s.money(x.variance_amount)}</strong></td></tr>
      </tbody></table>
      {x.flags?.length > 0 && <p style={{ marginTop: 10 }}><strong>Flags:</strong> {x.flags.map(flagText).join('; ')}</p>}
      <div className="sig"><div>Attendant signature</div><div>Manager signature</div></div>
    </div>
  );
}
