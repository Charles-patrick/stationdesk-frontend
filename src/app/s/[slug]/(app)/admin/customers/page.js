'use client';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Badge, Button, Empty, PageHead, useAction } from '@/components/ui';

export default function CustomersPage() {
  const s = useStation();
  const list = useApi('/users?role=customer');
  const [run] = useAction();
  const setStatus = (u, status) => run(async () => { await api.patch(`/users/${u.id}`, { status }); await list.reload(); }, status === 'active' ? 'Customer approved' : 'Customer updated');
  return (
    <div>
      <PageHead title="Customers" sub="People who have an account on your ordering page." />
      <Async state={list} empty={<Empty title="No customers yet">When people create accounts they will show here.</Empty>}>
        {(rows) => (
          <div className="tablewrap"><table className="table">
            <thead><tr><th>Name</th><th>Contact</th><th>Company</th><th className="num">Orders</th><th>Joined</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}<br /><span className="muted small">{u.phone}</span></td><td>{u.company}</td><td className="num">{u.orders}</td><td>{s.dd(u.created_at)}</td>
                <td><Badge tone={u.status === 'active' ? 'good' : u.status === 'pending' ? 'warn' : 'bad'}>{u.status === 'active' ? 'Active' : u.status === 'pending' ? 'Waiting for approval' : 'Blocked'}</Badge></td>
                <td className="right nowrap">
                  {u.status === 'pending' && <Button size="sm" variant="brand" onClick={() => setStatus(u, 'active')}>Approve</Button>}{' '}
                  {u.status === 'active' ? <Button size="sm" variant="ghost" onClick={() => setStatus(u, 'blocked')}>Block</Button> : u.status === 'blocked' ? <Button size="sm" variant="ghost" onClick={() => setStatus(u, 'active')}>Unblock</Button> : null}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Async>
    </div>
  );
}
