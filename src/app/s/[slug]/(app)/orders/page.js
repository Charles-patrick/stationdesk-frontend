'use client';
import Link from 'next/link';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { Async, Badge, Empty, PageHead } from '@/components/ui';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format';

export default function MyOrders() {
  const s = useStation();
  const orders = useApi('/orders');
  return (
    <div>
      <PageHead title="My orders">
        <Link className="btn brand" href={s.href('/shop')}>Order something</Link>
      </PageHead>
      <Async state={orders} empty={<Empty title="No orders yet">When you place an order it will show here.</Empty>}>
        {(list) => (
          <div className="stack" style={{ gap: 10 }}>
            {list.map((o) => (
              <Link key={o.id} href={s.href(`/orders/${o.id}`)} className="card" style={{ textDecoration: 'none', display: 'block', marginTop: 0 }}>
                <div className="row between">
                  <strong>Order #{o.id}</strong><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                </div>
                <div className="small muted" style={{ margin: '4px 0' }}>{s.dt(o.created_at)}</div>
                <div className="small">{o.summary}</div>
                <div style={{ fontWeight: 650, marginTop: 6 }}>{s.money(o.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </Async>
    </div>
  );
}
