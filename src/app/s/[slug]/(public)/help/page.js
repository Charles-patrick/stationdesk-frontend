'use client';
import { useEffect, useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import RichText from '@/components/RichText';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { Tabs, Loading, Empty } from '@/components/ui';

const LABEL = { customer: 'Customers', staff: 'Staff', admin: 'Admin' };

export default function HelpPage() {
  const s = useStation();
  const { data, loading } = useApi('/public/help');
  const [tab, setTab] = useState('customer');
  const [open, setOpen] = useState(null);
  useEffect(() => { if (s.role === 'staff' || s.role === 'admin') setTab(s.role); }, [s.role]);

  const tabs = ['customer', 'staff', 'admin'].map((k) => ({ key: k, label: LABEL[k] }));
  const list = (data || []).filter((a) => a.audience === tab);
  return (
    <div>
      <PublicHeader />
      <div className="pubmain" style={{ maxWidth: 820 }}>
        <h1 className="mb">How to use {s.station?.name || 'this system'}</h1>
        <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setOpen(null); }} />
        {loading && <Loading />}
        {!loading && list.length === 0 && <Empty title="No guides yet" />}
        <div className="stack" style={{ gap: 10 }}>
          {list.map((a) => (
            <div key={a.id} className="card" style={{ padding: 0 }}>
              <button onClick={() => setOpen(open === a.id ? null : a.id)} aria-expanded={open === a.id}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                <h3 style={{ flex: 1 }}>{a.title}</h3><span aria-hidden="true">{open === a.id ? '−' : '+'}</span>
              </button>
              {open === a.id && (
                <div style={{ padding: '0 16px 16px' }}>
                  {a.video_url && (/\.(mp4|webm)$/i.test(a.video_url)
                    ? <video src={a.video_url} controls style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />
                    : <div style={{ aspectRatio: '16/9', marginBottom: 12 }}><iframe src={a.video_url} title={a.title} style={{ width: '100%', height: '100%', border: 0, borderRadius: 8 }} allowFullScreen /></div>)}
                  <RichText text={a.body} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
