'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStation, homeFor } from '@/lib/station';
import { Icon } from '@/components/ui';

export default function PublicHeader() {
  const s = useStation();
  const router = useRouter();
  return (
    <header className="topbar">
      <Link href={s.href('/')} className="brand">
        {s.station?.logo_url ? <img className="logo" src={s.station.logo_url} alt="" /> : <span className="logo-fallback">{(s.station?.name || 'S')[0]}</span>}
        <span>{s.station?.name || ''}</span>
      </Link>
      <div className="spacer" />
      <Link href={s.href('/help')} className="icon-btn" aria-label="Help"><Icon name="help" /></Link>
      {s.user
        ? <button className="btn brand sm" onClick={() => router.push(s.href(homeFor(s.role)))}>Open app</button>
        : <Link className="btn brand sm" href={s.href('/login')}>Log in</Link>}
    </header>
  );
}
