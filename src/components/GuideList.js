'use client';
import { useState } from 'react';
import RichText from '@/components/RichText';
import { Empty, Loading } from '@/components/ui';

// A list of help guides that open and close. Used by customers, staff and admins.
export default function GuideList({ guides, loading }) {
  const [open, setOpen] = useState(null);
  if (loading) return <Loading />;
  if (!guides?.length) return <Empty title="No guides yet" />;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {guides.map((a) => (
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
  );
}
