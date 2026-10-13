'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { useStation, homeFor } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { Loading, Empty, Badge } from '@/components/ui';
import { AVAIL_LABEL, AVAIL_TONE } from '@/lib/format';

export default function StationHome() {
  const s = useStation();
  const router = useRouter();
  const st = s.station;
  const cat = useApi(`/public/station/${s.slug}/catalog`, { skip: !st?.ordering_enabled });

  useEffect(() => { if (s.meLoaded && s.user) router.replace(s.href(homeFor(s.role))); }, [s.meLoaded, s.user]); // eslint-disable-line

  if (s.state === 'loading') return <Loading />;
  if (s.state === 'missing') return <Empty title="Station not found">Check the address you were given.</Empty>;
  if (s.state === 'error') return <Empty title="Cannot reach the server">Check your connection and try again.</Empty>;

  const products = cat.data?.products || [];
  const groups = products.reduce((m, p) => { (m[p.category || 'Other'] ||= []).push(p); return m; }, {});
  return (
    <div>
      <PublicHeader />
      <div className="hero">
        <div className="inner">
          <h1>{st.name}</h1>
          <p>{[st.address, st.phone].filter(Boolean).join(' · ')}</p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link href={s.href('/login')} className="btn brand lg">Log in</Link>
            {st.ordering_enabled && st.signup_open && <Link href={s.href('/register')} className="btn ghost lg" style={{ color: '#fff', borderColor: '#5c7080' }}>Create customer account</Link>}
          </div>
        </div>
      </div>
      <div className="pubmain">
        {st.ordering_enabled ? (
          <>
            <h2 className="mb">What you can order</h2>
            {!st.public_prices && <div className="banner info mb"><div className="b">Log in to see prices and place an order.</div></div>}
            {cat.loading && <Loading />}
            {Object.entries(groups).map(([name, list]) => (
              <section key={name} className="mb">
                <h3 style={{ marginBottom: 8 }}>{name}</h3>
                <div className="grid c3">
                  {list.map((p) => (
                    <div key={p.id} className="product">
                      <div className="name">{p.name}{p.variant ? ` ${p.variant}` : ''}</div>
                      <div className="row between">
                        {st.public_prices && p.price !== null ? <span className="price">{s.money(p.price)}</span> : <span className="muted small">Price after login</span>}
                        <Badge tone={AVAIL_TONE[p.availability]}>{AVAIL_LABEL[p.availability]}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {!cat.loading && products.length === 0 && <Empty title="Nothing listed yet">The station has not added products for online ordering.</Empty>}
          </>
        ) : (
          <Empty title="Staff sign in">This station uses {`its`} system for daily sales and stock. Staff can log in above.</Empty>
        )}
      </div>
    </div>
  );
}
