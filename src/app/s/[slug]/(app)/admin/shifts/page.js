'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { qs } from '@/lib/api';
import { flagText } from '@/lib/format';
import { Async, Badge, Check, Empty, PageHead } from '@/components/ui';

export default function ShiftsPage() {
  const s = useStation();
  const [status, setStatus] = useState('');
  const [flagged, setFlagged] = useState(false);
  const list = useApi(`/shifts${qs({ status, flagged: flagged ? '1' : '' })}`);
  return (
    <div>
      <PageHead title="Shifts" sub="Every shift, what was expected and what was handed over." />
      <div className="row mb">
        <select className="input" style={{ maxWidth: 200 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All shifts</option><option value="open">Open now</option><option value="closed">Closed</option>
        </select>
        <Check title="Only flagged" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />
      </div>
      <Async state={list} empty={<Empty title="No shifts match" />}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Staff</th><th>Started</th><th>Closed</th><th className="num">Expected</th><th className="num">Handed over</th><th className="num">Difference</th><th>Flags</th></tr></thead>
            <tbody>{rows.map((x) => (
              <tr key={x.id} className="clickable">
                <td><Link href={s.href(`/admin/shifts/${x.id}`)}><strong>{x.user_name}</strong></Link></td><td>{s.dt(x.started_at)}</td>
                <td>{x.status === 'open' ? <Badge tone="info">Open</Badge> : s.dt(x.closed_at)}{x.admin_closed && <> <Badge>By admin</Badge></>}</td>
                <td className="num">{x.status === 'open' ? '' : s.money(x.expected_amount)}</td><td className="num">{x.status === 'open' ? '' : s.money(x.declared)}</td>
                <td className="num" style={{ color: x.variance_amount < 0 ? 'var(--bad)' : x.variance_amount > 0 ? 'var(--warn)' : undefined }}>{x.status === 'open' ? '' : s.money(x.variance_amount)}</td>
                <td>{x.flags?.length ? x.flags.map((f, i) => <div key={i} className="small" style={{ color: 'var(--warn)' }}>{flagText(f)}</div>) : ''}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
    </div>
  );
}
