'use client';
import { useRouter } from 'next/navigation';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api, setTokenFor } from '@/lib/api';
import { num } from '@/lib/format';
import { Async, Badge, Button, PageHead, useAction } from '@/components/ui';

export default function Overview() {
  const s = useStation();
  const router = useRouter();
  const data = useApi('/reports/multi-station');
  const [run] = useAction();
  const open = (st) => run(async () => {
    if (st.slug !== s.slug) {
      const res = await api.post('/auth/switch-station', { station_id: st.id });
      setTokenFor(st.slug, res.token);
    }
    window.location.href = `/s/${st.slug}/admin`;
  });
  return (
    <div>
      <PageHead title="All your stations" sub="Today at every station you manage." />
      <Async state={data}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Station</th><th className="num">Sales today</th><th className="num">Fuel today</th><th className="num">Open shifts</th><th className="num">Low stock</th><th className="num">Orders waiting</th><th className="num">Flagged</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong>{r.slug === s.slug && <> <Badge>You are here</Badge></>}</td>
                <td className="num">{s.money(r.today_sales)}</td><td className="num">{num(r.today_litres)} L</td><td className="num">{r.open_shifts}</td>
                <td className="num">{r.low_stock || ''}</td><td className="num">{r.pending_orders || ''}</td><td className="num" style={{ color: r.flagged_shifts ? 'var(--bad)' : undefined }}>{r.flagged_shifts || ''}</td>
                <td className="right"><Button size="sm" variant="brand" onClick={() => open(r)}>Open</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
    </div>
  );
}
