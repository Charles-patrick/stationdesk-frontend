'use client';
import Link from 'next/link';
import { useStation } from '@/lib/station';
import { Icon } from '@/components/ui';

// Header for the customer store pages
export default function PublicHeader() {
  const s = useStation();
  return (
    <header className="topbar">
      <Link href={s.href('/')} className="brand">
        {s.station?.logo_url ? <img className="logo" src={s.station.logo_url} alt="" /> : <span className="logo-fallback">{(s.station?.name || 'S')[0]}</span>}
        <span>{s.station?.name || ''}</span>
      </Link>
      <div className="spacer" />
      <Link href={s.href('/track')} className="btn sm ghost" style={{ color: '#fff', borderColor: '#5c7080' }}>Track an order</Link>
      <Link href={s.href('/help')} className="icon-btn" aria-label="Help"><Icon name="help" /></Link>
    </header>
  );
}
