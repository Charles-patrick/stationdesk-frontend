'use client';
import { useEffect, useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api, qs } from '@/lib/api';
import { monthLabel, num } from '@/lib/format';
import { Async, Banner, BarChart, Button, Card, Empty, Field, PageHead, Stat, Tabs, useAction } from '@/components/ui';

const GROUPS = [['day', 'By day'], ['product', 'By product'], ['category', 'By category'], ['pump', 'By pump'], ['staff', 'By person'], ['payment', 'By payment']];
const EXPORTS = [['sales', 'Sales'], ['expenses', 'Expenses'], ['stock', 'Stock movements'], ['orders', 'Orders'], ['restocks', 'Restocks'], ['shifts', 'Shifts'], ['price-history', 'Price history'], ['credit-ledger', 'Credit ledger'], ['audit', 'Audit trail'], ['compliance', 'Fuel volumes (for regulators)']];

export default function ReportsPage() {
  const [tab, setTab] = useState('recap');
  return (
    <div>
      <PageHead title="Reports" />
      <Tabs tabs={[{ key: 'recap', label: 'Monthly recap' }, { key: 'sales', label: 'Sales' }, { key: 'reorder', label: 'What to reorder' }, { key: 'exports', label: 'Downloads' }]} value={tab} onChange={setTab} />
      {tab === 'recap' && <Recap />}
      {tab === 'sales' && <Sales />}
      {tab === 'reorder' && <Reorder />}
      {tab === 'exports' && <Exports />}
    </div>
  );
}

function Recap() {
  const s = useStation();
  const months = useApi('/reports/months');
  const [month, setMonth] = useState('');
  useEffect(() => { if (months.data && !month) setMonth(months.data[0]); }, [months.data, month]);
  const recap = useApi(month ? `/reports/monthly/${month}` : null, { skip: !month });
  const [run, busy] = useAction();
  const dl = (ext) => run(() => api.download(`/reports/monthly/${month}/${ext}`, `recap-${month}.${ext}`));
  return (
    <div className="stack">
      <div className="row">
        <select className="input" style={{ maxWidth: 240 }} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          {(months.data || []).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <Button variant="ghost" loading={busy} onClick={() => dl('pdf')}>Download PDF</Button>
        <Button variant="ghost" loading={busy} onClick={() => dl('xlsx')}>Download Excel</Button>
      </div>
      <Async state={recap}>
        {(r) => (
          <div className="stack">
            {r.shifts.still_open > 0 && <Banner tone="warn">{r.shifts.still_open} shift{r.shifts.still_open > 1 ? 's are' : ' is'} still open. Their sales are counted once they close.</Banner>}
            <div className="grid c4">
              <Stat label="Total sales" value={s.money(r.totals.revenue)} sub={r.totals.change_pct === null ? 'No earlier month to compare' : `${r.totals.change_pct > 0 ? '+' : ''}${r.totals.change_pct}% vs last month`} />
              <Stat label="Fuel sold" value={`${num(r.totals.litres)} L`} />
              <Stat label="Other items sold" value={num(r.totals.units)} />
              <Stat label="Expenses" value={s.money(r.totals.expenses)} />
              {r.totals.profit_coverage_pct > 0 && <Stat label="Estimated profit after expenses" value={s.money(r.totals.net_after_expenses)} sub={`Based on products with a cost price (${r.totals.profit_coverage_pct}% of sales)`} />}
              <Stat label="Online orders" value={r.orders.count} sub={s.money(r.orders.value)} />
              <Stat label="Cash shortages" value={s.money(r.shifts.shortages)} tone={r.shifts.shortages < 0 ? 'bad' : ''} sub={`${r.shifts.flagged} flagged shift${r.shifts.flagged === 1 ? '' : 's'} of ${r.shifts.count}`} />
              <Stat label="Stock losses" value={s.money(r.losses.value)} sub={`${r.losses.count} adjustments`} />
            </div>
            <div className="grid c2">
              <Card title="Sales by day"><BarChart data={r.daily.map((d) => ({ label: d.date.slice(5), value: d.revenue }))} format={s.money} /></Card>
              <Card title="Sales by category">{r.by_category.map((c) => <div key={c.name} className="row between" style={{ marginBottom: 6 }}><span>{c.name}</span><strong>{s.money(c.revenue)}</strong></div>)}</Card>
              <Card title="Best sellers">{r.top_products.map((p) => <div key={p.name} className="row between" style={{ marginBottom: 6 }}><span>{p.name} <span className="muted small">({num(p.qty)})</span></span><strong>{s.money(p.revenue)}</strong></div>)}</Card>
              <Card title="Slowest sellers">{r.slowest_products.map((p) => <div key={p.name} className="row between" style={{ marginBottom: 6 }}><span>{p.name} <span className="muted small">({num(p.qty)})</span></span><strong>{s.money(p.revenue)}</strong></div>)}</Card>
              <Card title="Expenses">{r.expenses.length ? r.expenses.map((e) => <div key={e.category} className="row between" style={{ marginBottom: 6 }}><span>{e.category}</span><strong>{s.money(e.amount)}</strong></div>) : <p className="muted">None recorded.</p>}</Card>
              <Card title="Other">
                <div className="row between"><span>Restocks received</span><strong>{r.restocks.count} ({s.money(r.restocks.value)})</strong></div>
                <div className="row between"><span>Credit sales</span><strong>{s.money(r.totals.credit_sales)}</strong></div>
                <div className="row between"><span>Owed by credit customers now</span><strong>{s.money(r.credit_outstanding)}</strong></div>
              </Card>
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}

function Sales() {
  const s = useStation();
  const [by, setBy] = useState('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const data = useApi(`/reports/sales${qs({ by, from: from ? new Date(from).toISOString() : '', to: to ? new Date(new Date(to).getTime() + 86400000).toISOString() : '' })}`);
  return (
    <div className="stack">
      <div className="row">
        <select className="input" style={{ maxWidth: 200 }} value={by} onChange={(e) => setBy(e.target.value)} aria-label="Group by">{GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <Field label=""><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" /></Field>
        <Field label=""><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" /></Field>
      </div>
      <Async state={data} empty={<Empty title="No sales in this range" />}>
        {(rows) => (
          <>
            {by === 'day' && <Card title="Sales per day"><BarChart data={rows.map((r) => ({ label: r.label.slice(5), value: Number(r.amount) }))} format={s.money} /></Card>}
            <div className="tablewrap"><table className="table">
              <thead><tr><th>{GROUPS.find((g) => g[0] === by)[1].replace('By ', '')}</th><th className="num">Quantity</th><th className="num">Sales</th><th className="num">Lines</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.label}><td>{r.label}</td><td className="num">{num(r.qty)}</td><td className="num">{s.money(r.amount)}</td><td className="num">{r.lines}</td></tr>)}
                <tr><td><strong>Total</strong></td><td /><td className="num"><strong>{s.money(rows.reduce((t, r) => t + Number(r.amount), 0))}</strong></td><td /></tr></tbody>
            </table></div>
          </>
        )}
      </Async>
    </div>
  );
}

function Reorder() {
  const data = useApi('/reports/reorder-suggestions');
  return (
    <Async state={data} empty={<Empty title="Nothing to reorder yet" />}>
      {(rows) => (
        <div className="stack">
          <p className="muted">Based on how fast each item sold over the last 14 days. The suggested quantity covers about two more weeks.</p>
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Product</th><th className="num">In stock</th><th className="num">Sells per day</th><th className="num">Lasts about</th><th className="num">Suggested order</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td>{r.name}{r.variant ? ` ${r.variant}` : ''}</td><td className="num">{num(r.stock_qty)} {r.unit}</td><td className="num">{num(r.daily_rate)}</td>
                <td className="num" style={{ color: r.days_left !== null && r.days_left < 4 ? 'var(--bad)' : undefined, fontWeight: 650 }}>{r.days_left === null ? '' : `${r.days_left} days`}</td>
                <td className="num">{r.suggested_qty > 0 ? `${r.suggested_qty} ${r.unit}` : ''}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </Async>
  );
}

function Exports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [run, busy] = useAction();
  const get = (k) => run(() => api.download(`/exports/${k}${qs({ from: from ? new Date(from).toISOString() : '', to: to ? new Date(new Date(to).getTime() + 86400000).toISOString() : '' })}`, `${k}.csv`));
  return (
    <div className="stack">
      <p className="muted">Download your records as spreadsheet files for your accountant, tax or regulators. Leave the dates empty for everything.</p>
      <div className="row"><Field label="From"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
      <div className="grid c3">{EXPORTS.map(([k, l]) => <Button key={k} variant="ghost" disabled={busy} onClick={() => get(k)}>{l}</Button>)}</div>
    </div>
  );
}
