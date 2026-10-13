'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { flagText, num, reading } from '@/lib/format';
import { Async, Badge, Banner, Button, Card, Check, Field, LcdInput, Modal, PageHead, Stat, useAction, useToast } from '@/components/ui';

export default function ShiftDetail() {
  const { id } = useParams();
  const s = useStation();
  const toast = useToast();
  const shift = useApi(`/shifts/${id}`);
  const forecourt = useApi('/forecourt');
  const [closing, setClosing] = useState(false);
  const [cash, setCash] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const [reason, setReason] = useState('');
  const [f, setF] = useState({ readings: {}, rollover: {}, dips: {}, cash: '', transfer: '', pos: '', note: '' });
  const [run, busy] = useAction();

  const adminClose = (x) => run(async () => {
    for (const p of x.pumps) if (!f.readings[p.id]) throw new Error(`Enter the closing reading for ${p.pump_name}`);
    const res = await api.post(`/shifts/${x.id}/admin-close`, {
      pumps: x.pumps.map((p) => ({ shift_pump_id: p.id, closing_reading: Number(f.readings[p.id]), rollover: !!f.rollover[p.id] })),
      cash: Number(f.cash || 0), transfer: Number(f.transfer || 0), pos: Number(f.pos || 0), note: f.note,
    });
    setClosing(false); await shift.reload();
    return res;
  }, 'Shift closed');
  const saveCash = (x) => run(async () => {
    await api.post('/approvals/shift-cash', { shift_id: x.id, cash: Number(cash.cash), transfer: Number(cash.transfer), pos: Number(cash.pos), reason: cash.reason });
    setCash(null); await shift.reload();
  }, 'Totals updated');
  const doVoid = () => run(async () => { await api.post(`/sales/${voiding.id}/void`, { reason }); setVoiding(null); setReason(''); await shift.reload(); }, 'Sale cancelled');

  return (
    <Async state={shift}>
      {(x) => {
        const pending = x.status === 'open';
        return (
          <div>
            <PageHead title={`${x.user_name}'s shift`} sub={`${s.dt(x.started_at)}${x.closed_at ? ' to ' + s.dt(x.closed_at) : ''}`}>
              <Link className="btn ghost" href={s.href('/admin/shifts')}>All shifts</Link>
              <Link className="btn ghost" href={s.href(`/print/shift/${x.id}`)} target="_blank">Print sheet</Link>
              {pending && <Button variant="brand" onClick={() => setClosing(true)}>Close for {x.user_name}</Button>}
              {!pending && <Button variant="ghost" onClick={() => setCash({ cash: x.cash_declared, transfer: x.transfer_declared, pos: x.pos_declared, reason: '' })}>Correct cash totals</Button>}
            </PageHead>
            {pending && <Banner tone="info">This shift is still open.</Banner>}
            {x.admin_closed && <Banner tone="warn" title="Closed by an admin.">{x.close_note}</Banner>}
            {x.flags?.length > 0 && <div className="mt"><Banner tone="warn" title="Flags:">{x.flags.map((fl, i) => <div key={i}>{flagText(fl)}</div>)}</Banner></div>}
            {!pending && (
              <div className="grid c4 mt mb">
                <Stat label="Pump sales" value={s.money(x.pump_sales)} />
                <Stat label="Other sales (not credit)" value={s.money(x.manual_sales)} />
                <Stat label="Credit sales" value={s.money(x.credit_sales)} />
                <Stat label="Expected" value={s.money(x.expected_amount)} sub={`Credit payments ${s.money(x.credit_payments)}, till expenses ${s.money(x.till_expenses)}`} />
                <Stat label="Cash" value={s.money(x.cash_declared)} />
                <Stat label="Transfers" value={s.money(x.transfer_declared)} />
                <Stat label="POS" value={s.money(x.pos_declared)} />
                <Stat label="Difference" value={s.money(x.variance_amount)} tone={x.variance_amount < 0 ? 'bad' : x.variance_amount > 0 ? 'warn' : ''} />
              </div>
            )}
            {x.pumps.length > 0 && (
              <Card title="Pumps" className="mt">
                <div className="tablewrap"><table className="table">
                  <thead><tr><th>Pump</th><th className="num">Opened</th><th className="num">Closed</th><th className="num">Litres</th><th className="num">Value</th><th>Notes</th></tr></thead>
                  <tbody>{x.pumps.map((p) => (
                    <tr key={p.id}>
                      <td>{p.pump_name} <span className="muted small">{p.product_name}</span></td>
                      <td className="num">{reading(p.opening_reading)}</td><td className="num">{p.closing_reading != null ? reading(p.closing_reading) : ''}</td>
                      <td className="num">{num(p.litres)}</td><td className="num">{s.money(p.amount)}</td>
                      <td className="small">
                        {Math.abs(p.gap_litres) > 0.004 && <div style={{ color: 'var(--warn)' }}>Opened {num(p.gap_litres)} L from last close</div>}
                        {p.rollover && <div>Meter rolled over</div>}
                        {p.price_readings.map((r, i) => <div key={i}>Price {s.money(r.old_price)} → {s.money(r.new_price)} at reading {reading(r.reading)}</div>)}
                      </td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </Card>
            )}
            {x.dips.length > 0 && (
              <Card title="Dipstick checks" className="mt">
                <div className="tablewrap"><table className="table"><thead><tr><th>Tank</th><th className="num">Book</th><th className="num">Dipstick</th><th className="num">Difference</th></tr></thead>
                  <tbody>{x.dips.map((d) => <tr key={d.id}><td>{d.tank_name}</td><td className="num">{num(d.book_litres)}</td><td className="num">{num(d.litres)}</td><td className="num" style={{ color: d.flagged ? 'var(--bad)' : undefined }}>{num(d.variance)} L</td></tr>)}</tbody></table></div>
              </Card>
            )}
            <Card title="Sales" className="mt">
              <div className="tablewrap"><table className="table">
                <thead><tr><th>Time</th><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th><th>Source</th><th>Paid by</th><th /></tr></thead>
                <tbody>{x.sales.map((a) => (
                  <tr key={a.id} className={a.voided ? 'voided' : ''}>
                    <td>{s.tm(a.created_at)}</td><td>{a.product_name}</td><td className="num">{num(a.qty)}</td><td className="num">{s.money(a.unit_price)}</td><td className="num">{s.money(a.amount)}</td>
                    <td>{a.source}</td><td>{a.payment}</td>
                    <td className="right">{!a.voided && a.source !== 'pump' && <Button size="sm" variant="ghost" onClick={() => { setVoiding(a); setReason(''); }}>Cancel</Button>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </Card>
            {x.expenses.length > 0 && (
              <Card title="Expenses" className="mt">
                {x.expenses.map((e) => <div key={e.id} className="row between"><span>{e.category}{e.from_till ? ' (from till)' : ''} {e.note}</span><strong>{s.money(e.amount)}</strong></div>)}
              </Card>
            )}

            <Modal open={closing} onClose={() => setClosing(false)} title={`Close ${x.user_name}'s shift`} wide
              footer={<><Button variant="ghost" onClick={() => setClosing(false)}>Cancel</Button><Button variant="brand" loading={busy} disabled={f.note.trim().length < 3} onClick={() => adminClose(x)}>Close shift</Button></>}>
              <div className="stack">
                <Banner tone="warn">Use this when the person left without closing. Enter the readings you can see on the pumps now. This will be marked as closed by an admin.</Banner>
                <div className="pumpgrid">
                  {x.pumps.map((p) => (
                    <div className="pumpcard" key={p.id}>
                      <div className="row between"><h4>{p.pump_name}</h4><span className="small muted">Opened at {reading(p.opening_reading)}</span></div>
                      <LcdInput id={`ac-${p.id}`} caption="Closing reading" value={f.readings[p.id] || ''} onChange={(v) => setF({ ...f, readings: { ...f.readings, [p.id]: v } })} />
                      <Check title="Meter rolled over" checked={!!f.rollover[p.id]} onChange={(e) => setF({ ...f, rollover: { ...f.rollover, [p.id]: e.target.checked } })} />
                    </div>
                  ))}
                </div>
                <div className="form-grid">
                  {[['cash', 'Cash counted'], ['transfer', 'Transfers'], ['pos', 'POS']].map(([k, l]) => <Field key={k} label={l}><input className="input" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>)}
                </div>
                <Field label="Why are you closing it? (required)"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
              </div>
            </Modal>
            <Modal open={!!cash} onClose={() => setCash(null)} title="Correct the cash totals"
              footer={<><Button variant="ghost" onClick={() => setCash(null)}>Cancel</Button><Button variant="brand" loading={busy} disabled={(cash?.reason || '').trim().length < 3} onClick={() => saveCash(x)}>Save</Button></>}>
              {cash && (
                <div className="stack">
                  <div className="form-grid">{[['cash', 'Cash'], ['transfer', 'Transfers'], ['pos', 'POS']].map(([k, l]) => <Field key={k} label={l}><input className="input" inputMode="decimal" value={cash[k]} onChange={(e) => setCash({ ...cash, [k]: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>)}</div>
                  <Field label="Reason (required)"><input className="input" value={cash.reason} onChange={(e) => setCash({ ...cash, reason: e.target.value })} /></Field>
                </div>
              )}
            </Modal>
            <Modal open={!!voiding} onClose={() => setVoiding(null)} title="Cancel this sale?"
              footer={<><Button variant="ghost" onClick={() => setVoiding(null)}>Keep it</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={doVoid}>Cancel sale</Button></>}>
              <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            </Modal>
          </div>
        );
      }}
    </Async>
  );
}
