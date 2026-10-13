'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { flagText, num, sinceHours } from '@/lib/format';
import { Async, Badge, BarChart, Banner, Card, PageHead, ProgressBar, Stat } from '@/components/ui';

export default function Dashboard() {
  const s = useStation();
  const router = useRouter();
  const d = useApi('/reports/dashboard');
  const setup = useApi('/station/setup-status');
  useEffect(() => { if (setup.data && setup.data.products === 0 && setup.data.pumps === 0) router.replace(s.href('/admin/setup')); }, [setup.data]); // eslint-disable-line

  return (
    <div>
      <PageHead title="Dashboard" sub={`${s.station?.name} today`} />
      <Async state={d}>
        {(x) => (
          <div className="stack">
            {(x.pending_approvals > 0 || x.pending_orders > 0) && (
              <div className="grid c2">
                {x.pending_approvals > 0 && <Banner tone="warn" title={`${x.pending_approvals} change${x.pending_approvals > 1 ? 's' : ''} waiting for your approval.`} action={<Link className="btn sm" href={s.href('/admin/approvals')}>Review</Link>} />}
                {x.pending_orders > 0 && <Banner tone="info" title={`${x.pending_orders} new order${x.pending_orders > 1 ? 's' : ''}.`} action={<Link className="btn sm" href={s.href('/staff/orders')}>Open</Link>} />}
              </div>
            )}
            <div className="grid c4">
              <Stat label="Sales today" value={s.money(x.today_sales)} sub="Fuel is added when shifts close" />
              <Stat label="Fuel sold today" value={`${num(x.today_litres)} L`} />
              <Stat label="Expenses today" value={s.money(x.today_expenses)} />
              <Stat label="Open shifts" value={x.open_shifts} sub={x.open_shift_list.map((o) => o.user_name).join(', ') || 'None right now'} />
              <Stat label="Low stock items" value={x.low_stock} tone={x.low_stock ? 'warn' : ''} />
              <Stat label="Flagged shifts (7 days)" value={x.flagged_shifts} tone={x.flagged_shifts ? 'bad' : ''} />
              <Stat label="Owed by credit customers" value={s.money(x.credit_owed)} />
              <Stat label="Waiting orders" value={x.pending_orders} />
            </div>
            <div className="grid c2">
              <Card title="Sales, last 14 days"><BarChart data={x.trend.map((t) => ({ label: t.date.slice(5), value: Number(t.revenue) }))} format={s.money} color="var(--ink)" /></Card>
              <Card title="Best sellers today">
                {x.top_today.length === 0 ? <p className="muted">No sales yet today.</p> : (
                  <div className="stack" style={{ gap: 8 }}>{x.top_today.map((p) => <div key={p.name} className="row between"><span>{p.name}</span><strong>{s.money(p.amount)}</strong></div>)}</div>
                )}
              </Card>
            </div>
            <div className="grid c2">
              <Card title="Tanks" actions={<Link href={s.href('/staff/stock')} className="small">Stock</Link>}>
                {x.tanks.length === 0 ? <p className="muted">No tanks set up yet.</p> : (
                  <div className="stack">{x.tanks.map((t) => (
                    <div key={t.id}><div className="row between"><span>{t.name} <span className="muted small">{t.product_name}</span></span><strong>{num(t.current_litres)} L</strong></div><ProgressBar value={t.current_litres} max={t.capacity_litres} /></div>
                  ))}</div>
                )}
              </Card>
              <Card title="Low stock" actions={<Link href={s.href('/admin/suppliers')} className="small">Reorder</Link>}>
                {x.low_stock_list.length === 0 ? <p className="muted">Everything is above its reorder level.</p> : (
                  <div className="stack" style={{ gap: 8 }}>{x.low_stock_list.map((p) => <div key={p.id} className="row between"><span>{p.name}{p.variant ? ` ${p.variant}` : ''}</span><Badge tone="warn">{num(p.stock_qty)} {p.unit} left</Badge></div>)}</div>
                )}
              </Card>
            </div>
            <div className="grid c2">
              <Card title="Open shifts">
                {x.open_shift_list.length === 0 ? <p className="muted">No one is on shift.</p> : x.open_shift_list.map((o) => (
                  <div key={o.id} className="row between" style={{ marginBottom: 6 }}><Link href={s.href(`/admin/shifts/${o.id}`)}><strong>{o.user_name}</strong></Link><span className="muted small">open for {sinceHours(o.started_at)}</span></div>
                ))}
              </Card>
              <Card title="Shifts that need a look" actions={<Link href={s.href('/admin/shifts?flagged=1')} className="small">All</Link>}>
                {x.flagged_list.length === 0 ? <p className="muted">No flags. Everything has balanced.</p> : x.flagged_list.map((f) => (
                  <div key={f.id} style={{ marginBottom: 10 }}>
                    <Link href={s.href(`/admin/shifts/${f.id}`)}><strong>{f.user_name}</strong></Link> <span className="muted small">{s.dt(f.closed_at)}</span>
                    {f.flags.map((fl, i) => <div key={i} className="small" style={{ color: 'var(--warn)' }}>{flagText(fl)}</div>)}
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
