'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Async, Button, Empty, PageHead } from '@/components/ui';

export default function Notifications() {
  const s = useStation();
  const router = useRouter();
  const n = useApi('/notifications');
  useEffect(() => { if (n.data?.unread) { const t = setTimeout(() => api.post('/notifications/read', {}).then(() => s.loadMe()), 2500); return () => clearTimeout(t); } }, [n.data]); // eslint-disable-line
  return (
    <div>
      <PageHead title="Notifications"><Button variant="ghost" size="sm" onClick={() => api.post('/notifications/read', {}).then(() => { n.reload(); s.loadMe(); })}>Mark all as read</Button></PageHead>
      <Async state={{ ...n, data: n.data?.items }} empty={<Empty title="Nothing yet" />}>
        {(items) => (
          <div className="stack" style={{ gap: 8 }}>
            {items.map((i) => (
              <button key={i.id} className="card" style={{ textAlign: 'left', cursor: i.link ? 'pointer' : 'default', marginTop: 0, borderLeft: i.read ? undefined : '4px solid var(--brand)' }}
                onClick={() => i.link && router.push(s.href(i.link))}>
                <div className="row between"><strong>{i.title}</strong><span className="small muted">{s.dt(i.created_at)}</span></div>
                {i.body && <div className="small" style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{i.body}</div>}
              </button>
            ))}
          </div>
        )}
      </Async>
    </div>
  );
}
