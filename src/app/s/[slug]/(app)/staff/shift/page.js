'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { flagText, num, reading, sinceHours } from '@/lib/format';
import { Async, Badge, Banner, Button, Card, Check, Empty, Field, Lcd, LcdInput, Modal, PageHead, Stat, useAction, useToast } from '@/components/ui';

export default function ShiftPage() {
  const s = useStation();
  if (s.role === 'admin') return <Empty title="Admins do not work shifts">Shifts are for attendants. You can review every shift under Shifts.</Empty>;
  return <ShiftPageInner />;
}

function ShiftPageInner() {
  const s = useStation();
  const cur = useApi('/shifts/current');
  const [result, setResult] = useState(null);
  const history = useApi('/shifts?status=closed');
  const refresh = async () => { await cur.reload(); await history.reload(); await s.loadMe(); };

  return (
    <div>
      <PageHead title="Shift" sub="Start when you begin, close when you are done." />
      {result && <ShiftResult result={result} onDone={() => setResult(null)} />}
      <Async state={cur}>
        {(shift) => shift
          ? <OpenShift shift={shift} reload={refresh} onClosed={(r) => { setResult(r); refresh(); }} />
          : !result && <StartShift onStarted={refresh} />}
      </Async>
      <Card title="My recent shifts" className="mt">
        <Async state={history} empty={<div className="muted">Closed shifts will show here.</div>}>
          {(list) => (
            <div className="tablewrap"><table className="table">
              <thead><tr><th>Started</th><th>Closed</th><th className="num">Sales</th><th>Result</th><th /></tr></thead>
              <tbody>{list.slice(0, 12).map((x) => (
                <tr key={x.id}>
                  <td>{s.dt(x.started_at)}</td><td>{s.dt(x.closed_at)}</td>
                  <td className="num">{s.money(Number(x.pump_sales) + Number(x.manual_sales))}</td>
                  <td>{x.flags?.length ? <Badge tone="warn">Flagged</Badge> : <Badge tone="good">Balanced</Badge>}{x.admin_closed && <> <Badge>Closed by admin</Badge></>}</td>
                  <td className="right"><Link className="btn ghost sm" href={s.href(`/print/shift/${x.id}`)} target="_blank">Sheet</Link></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Async>
      </Card>
    </div>
  );
}

function ShiftResult({ result, onDone }) {
  const s = useStation();
  return (
    <Card title="Shift closed" className="mb">
      <div className="grid c3 mb">
        <Stat label="Expected" value={s.money(result.expected)} />
        <Stat label="You handed over" value={s.money(result.declared)} />
        <Stat label={result.variance === 0 ? 'Difference' : result.variance < 0 ? 'Short by' : 'Over by'} value={s.money(Math.abs(result.variance))} tone={result.variance === 0 ? '' : 'warn'} />
      </div>
      {result.flags.length > 0
        ? <Banner tone="warn" title="The admin has been told about:">{result.flags.map((f, i) => <div key={i}>{flagText(f)}</div>)}</Banner>
        : <Banner tone="good">Everything matched. Well done.</Banner>}
      <div className="row mt">
        <Link className="btn ghost" href={s.href(`/print/shift/${result.id}`)} target="_blank">Print shift sheet</Link>
        <Button variant="brand" onClick={onDone}>Done</Button>
      </div>
    </Card>
  );
}

function StartShift({ onStarted }) {
  const s = useStation();
  const pumps = useApi('/shifts/available-pumps');
  const [picked, setPicked] = useState({});
  const [run, busy] = useAction();
  const toggle = (p) => setPicked((x) => { const n = { ...x }; if (n[p.id] !== undefined) delete n[p.id]; else n[p.id] = String(p.current_reading); return n; });

  const start = () => run(async () => {
    await api.post('/shifts/start', { pumps: Object.entries(picked).map(([pump_id, v]) => ({ pump_id: Number(pump_id), opening_reading: v === '' ? null : Number(v) })) });
    await onStarted();
  }, 'Shift started');

  return (
    <Card title="Start your shift">
      <Async state={pumps}>
        {(list) => (
          <div className="stack">
            {list.length === 0
              ? <p className="muted">This station has no pumps set up. You can still start a shift to record shop and lubricant sales.</p>
              : <p>Choose the pumps you are responsible for. Check each reading against the number on the pump.</p>}
            <div className="pumpgrid">
              {list.map((p) => {
                const on = picked[p.id] !== undefined;
                const diff = on && picked[p.id] !== '' && Math.abs(Number(picked[p.id]) - Number(p.current_reading)) > 0.004;
                return (
                  <div key={p.id} className={`pumpcard ${on ? 'selected' : ''} ${p.taken_by ? 'taken' : ''}`}>
                    <div className="row between"><h4>{p.name}</h4><span className="small muted">{p.product_name}</span></div>
                    {p.taken_by ? <Badge tone="warn">On {p.taken_by}&apos;s shift</Badge> : (
                      <>
                        {on
                          ? <LcdInput id={`open-${p.id}`} caption="Opening reading" value={picked[p.id]} alert={diff} onChange={(v) => setPicked({ ...picked, [p.id]: v })} />
                          : <Lcd caption="Last closing reading" value={reading(p.current_reading)} />}
                        {diff && <div className="small" style={{ color: 'var(--warn)' }}>This is different from the last close ({reading(p.current_reading)}). The admin will be told, and the difference will not be counted against you.</div>}
                        <Button variant={on ? 'ghost' : 'brand'} size="sm" onClick={() => toggle(p)}>{on ? 'Remove from my shift' : 'Take this pump'}</Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <Button variant="brand" size="lg" loading={busy} onClick={start}>Start shift{Object.keys(picked).length ? ` with ${Object.keys(picked).length} pump${Object.keys(picked).length > 1 ? 's' : ''}` : ''}</Button>
          </div>
        )}
      </Async>
    </Card>
  );
}

function OpenShift({ shift, reload, onClosed }) {
  const s = useStation();
  const toast = useToast();
  const forecourt = useApi('/forecourt');
  const [readings, setReadings] = useState({});
  const [run, busy] = useAction();
  const [closing, setClosing] = useState(false);
  const pending = shift.pending_readings || [];

  const saveReadings = () => run(async () => {
    const list = pending.map((p) => ({ shift_pump_id: p.shift_pump_id, price_history_id: p.price_history_id, reading: Number(readings[`${p.shift_pump_id}-${p.price_history_id}`]) }));
    if (list.some((r) => !Number.isFinite(r.reading))) throw new Error('Enter the pump reading for each price change');
    await api.post(`/shifts/${shift.id}/price-readings`, { readings: list });
    setReadings({});
    await reload();
  }, 'Readings saved');

  return (
    <div className="stack">
      <div className="grid c3">
        <Stat label="Started" value={s.tm(shift.started_at)} sub={`${sinceHours(shift.started_at)} ago`} />
        <Stat label="Sales so far" value={s.money(shift.running_sales)} sub="Fuel is added when you close" />
        <Stat label="Pumps" value={shift.pumps.length} sub={shift.pumps.map((p) => p.pump_name).join(', ') || 'Shop and lubricants only'} />
      </div>

      {pending.length > 0 && (
        <Banner tone="warn" title="A price changed during your shift.">
          Read the meter on each pump now and enter it below. Litres before this reading use the old price, litres after use the new price. You cannot close your shift until this is saved.
        </Banner>
      )}
      {pending.length > 0 && (
        <Card title="Pump readings for the price change">
          <div className="pumpgrid">
            {pending.map((p) => {
              const k = `${p.shift_pump_id}-${p.price_history_id}`;
              return (
                <div className="pumpcard" key={k}>
                  <div className="row between"><h4>{p.pump_name}</h4><span className="small muted">{p.product_name}</span></div>
                  <div className="small">{s.money(p.old_price)} → {s.money(p.new_price)} at {s.tm(p.effective_at)}</div>
                  <LcdInput id={`pr-${k}`} caption="Reading on the pump now" value={readings[k] || ''} onChange={(v) => setReadings({ ...readings, [k]: v })} />
                </div>
              );
            })}
          </div>
          <Button variant="brand" className="mt" loading={busy} onClick={saveReadings}>Save readings</Button>
        </Card>
      )}

      {shift.pumps.length > 0 && (
        <div className="pumpgrid">
          {shift.pumps.map((p) => (
            <div className="pumpcard" key={p.id}>
              <div className="row between"><h4>{p.pump_name}</h4><span className="small muted">{p.product_name}</span></div>
              <Lcd caption="Opening reading" value={reading(p.opening_reading)} />
              {Math.abs(p.gap_litres) > 0.004 && <Badge tone="warn">Differed from last close by {num(p.gap_litres)} L</Badge>}
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <Link className="btn ghost" href={s.href('/staff/sales')}>Record sales</Link>
        <Button variant="brand" size="lg" disabled={pending.length > 0} onClick={() => setClosing(true)}>Close shift</Button>
      </div>
      {closing && <CloseModal shift={shift} forecourt={forecourt.data} onClose={() => setClosing(false)} onClosed={onClosed} />}
    </div>
  );
}

function CloseModal({ shift, forecourt, onClose, onClosed }) {
  const s = useStation();
  const [closingR, setClosingR] = useState({});
  const [rollover, setRollover] = useState({});
  const [dips, setDips] = useState({});
  const [money, setMoney] = useState({ cash: '', transfer: '', pos: '' });
  const [note, setNote] = useState('');
  const [run, busy] = useAction();
  const toast = useToast();

  const tanks = useMemo(() => {
    if (!forecourt) return [];
    const ids = new Set(shift.pumps.map((sp) => forecourt.pumps.find((p) => p.id === sp.pump_id)?.tank_id).filter(Boolean));
    return forecourt.tanks.filter((t) => ids.has(t.id));
  }, [forecourt, shift]);

  const submit = async () => {
    for (const p of shift.pumps) if (closingR[p.id] === undefined || closingR[p.id] === '') return toast.error(`Enter the closing reading for ${p.pump_name}`);
    const declared = Number(money.cash || 0) + Number(money.transfer || 0) + Number(money.pos || 0);
    const ok = await toast.confirm({
      title: 'Close your shift?',
      message: `You are handing over ${s.money(declared)}. Once closed, your shift is locked and changes need the admin's approval.`,
      confirm: 'Close shift', cancel: 'Check again',
    });
    if (!ok) return;
    const res = await run(() => api.post(`/shifts/${shift.id}/close`, {
      pumps: shift.pumps.map((p) => ({ shift_pump_id: p.id, closing_reading: Number(closingR[p.id]), rollover: !!rollover[p.id] })),
      dips: tanks.map((t) => ({ tank_id: t.id, litres: dips[t.id] === undefined ? '' : dips[t.id] })),
      cash: Number(money.cash || 0), transfer: Number(money.transfer || 0), pos: Number(money.pos || 0), note: note || null,
    }));
    if (res) { onClose(); onClosed(res); }
  };

  return (
    <Modal open onClose={onClose} title="Close your shift" wide
      footer={<><Button variant="ghost" onClick={onClose}>Not yet</Button><Button variant="brand" loading={busy} onClick={submit}>Close shift</Button></>}>
      <div className="stack">
        {shift.pumps.length > 0 && <h3>Closing readings</h3>}
        <div className="pumpgrid">
          {shift.pumps.map((p) => (
            <div className="pumpcard" key={p.id}>
              <div className="row between"><h4>{p.pump_name}</h4><span className="small muted">Opened at {reading(p.opening_reading)}</span></div>
              <LcdInput id={`close-${p.id}`} caption="Closing reading" value={closingR[p.id] ?? ''} onChange={(v) => setClosingR({ ...closingR, [p.id]: v })} />
              <Check title="Meter rolled over" desc="Tick only if the meter went past its maximum and started again." checked={!!rollover[p.id]} onChange={(e) => setRollover({ ...rollover, [p.id]: e.target.checked })} />
            </div>
          ))}
        </div>
        {tanks.length > 0 && (
          <>
            <h3>Dipstick check (litres)</h3>
            <p className="muted small" style={{ margin: 0 }}>Optional but recommended. Enter what the dipstick shows now for the tanks your pumps draw from.</p>
            <div className="form-grid">
              {tanks.map((t) => (
                <Field key={t.id} label={`${t.name} (${t.product_name})`}>
                  <input className="input" inputMode="decimal" placeholder="Litres in the tank" value={dips[t.id] ?? ''} onChange={(e) => setDips({ ...dips, [t.id]: e.target.value.replace(/[^0-9.]/g, '') })} />
                </Field>
              ))}
            </div>
          </>
        )}
        <h3>Money you are handing over</h3>
        <div className="form-grid">
          {[['cash', 'Cash'], ['transfer', 'Transfers received'], ['pos', 'POS']].map(([k, label]) => (
            <Field key={k} label={label}><input className="input" inputMode="decimal" placeholder="0" value={money[k]} onChange={(e) => setMoney({ ...money, [k]: e.target.value.replace(/[^0-9.]/g, '') })} /></Field>
          ))}
        </div>
        <Field label="Note (optional)"><textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
