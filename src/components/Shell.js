'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, Loading, Modal, Button } from '@/components/ui';
import { useStation, homeFor } from '@/lib/station';

const NAV = {
  customer: [
    { group: null, items: [
      { href: '/shop', label: 'Shop', icon: 'cart' }, { href: '/orders', label: 'My orders', icon: 'list' }, { href: '/account', label: 'Account', icon: 'user' },
    ] },
  ],
  staff: [
    { group: null, items: [
      { href: '/staff/shift', label: 'Shift', icon: 'clock' }, { href: '/staff/sales', label: 'Sales', icon: 'cart' },
      { href: '/staff/orders', label: 'Orders', icon: 'list' }, { href: '/staff/restock', label: 'Restock', icon: 'truck' },
      { href: '/staff/stock', label: 'Stock', icon: 'box' }, { href: '/staff/expenses', label: 'Expenses', icon: 'wallet' },
      { href: '/staff/credit', label: 'Credit', icon: 'users' },
    ] },
  ],
  admin: [
    { group: null, items: [{ href: '/admin', label: 'Dashboard', icon: 'home' }] },
    { group: 'Daily work', items: [
      { href: '/staff/shift', label: 'My shift', icon: 'clock' }, { href: '/staff/sales', label: 'Sales', icon: 'cart' },
      { href: '/staff/orders', label: 'Orders', icon: 'list' }, { href: '/staff/restock', label: 'Restock', icon: 'truck' },
      { href: '/staff/stock', label: 'Stock', icon: 'box' }, { href: '/staff/expenses', label: 'Expenses', icon: 'wallet' },
      { href: '/staff/credit', label: 'Credit', icon: 'users' },
    ] },
    { group: 'Manage', items: [
      { href: '/admin/shifts', label: 'Shifts', icon: 'clock' }, { href: '/admin/approvals', label: 'Approvals', icon: 'check' },
      { href: '/admin/products', label: 'Products', icon: 'box' }, { href: '/admin/prices', label: 'Prices', icon: 'tag' },
      { href: '/admin/forecourt', label: 'Tanks and pumps', icon: 'pump' }, { href: '/admin/suppliers', label: 'Suppliers', icon: 'truck' },
      { href: '/admin/team', label: 'Team', icon: 'users' }, { href: '/admin/customers', label: 'Customers', icon: 'user' },
      { href: '/admin/reports', label: 'Reports', icon: 'chart' }, { href: '/admin/audit', label: 'Audit trail', icon: 'shield' },
      { href: '/admin/settings', label: 'Settings', icon: 'gear' },
    ] },
  ],
};
const BOTTOM = {
  customer: ['/shop', '/orders', '/account'],
  staff: ['/staff/shift', '/staff/sales', '/staff/orders', '/staff/stock'],
  admin: ['/admin', '/admin/shifts', '/staff/orders', '/admin/reports'],
};

// Who may open which part of the app
function allowed(role, path) {
  if (path.startsWith('/admin')) return role === 'admin';
  if (path.startsWith('/staff')) return role === 'admin' || role === 'staff';
  if (path === '/shop' || path.startsWith('/orders') || path.startsWith('/account')) return role === 'customer';
  return true;
}

export default function AppShell({ children }) {
  const s = useStation();
  const pathname = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const rel = pathname.replace(`/s/${s.slug}`, '') || '/';

  useEffect(() => {
    if (!s.meLoaded) return;
    if (!s.user) router.replace(s.href('/login'));
    else if (!allowed(s.role, rel)) router.replace(s.href(homeFor(s.role)));
  }, [s.meLoaded, s.user, s.role, rel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s.meLoaded || !s.user || !allowed(s.role, rel)) return <Loading />;

  const groups = NAV[s.role] || [];
  const flat = groups.flatMap((g) => g.items);
  const isActive = (href) => (href === '/admin' ? rel === '/admin' : rel === href || rel.startsWith(`${href}/`));
  const bottom = (BOTTOM[s.role] || []).map((h) => flat.find((i) => i.href === h)).filter(Boolean);
  const stations = s.me?.stations || [];

  return (
    <div className="app">
      <header className="topbar">
        <Link href={s.href(homeFor(s.role))} className="brand">
          {s.station?.logo_url ? <img className="logo" src={s.station.logo_url} alt="" /> : <span className="logo-fallback">{(s.station?.name || 'S')[0]}</span>}
          <span>{s.station?.name}</span>
        </Link>
        <div className="spacer" />
        {s.queueCount > 0 && <Link href={s.href('/staff/sales')} className="queue" title="Entries saved on this phone, waiting for the network">{s.queueCount} waiting to send</Link>}
        {s.failedCount > 0 && <Link href={s.href('/staff/sales')} className="queue" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}>{s.failedCount} need attention</Link>}
        <Link href={s.href('/help')} className="icon-btn" aria-label="Help"><Icon name="help" /></Link>
        <Link href={s.href('/notifications')} className="icon-btn" aria-label="Notifications">
          <Icon name="bell" />{(s.me?.unread || 0) > 0 && <span className="dot">{s.me.unread > 9 ? '9+' : s.me.unread}</span>}
        </Link>
      </header>
      <div className="shell">
        <nav className="sidenav" aria-label="Main">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.group && <h4>{g.group}</h4>}
              {g.items.map((i) => (
                <Link key={i.href} href={s.href(i.href)} className={`navlink ${isActive(i.href) ? 'active' : ''}`}><Icon name={i.icon} size={19} />{i.label}</Link>
              ))}
            </div>
          ))}
          {s.role === 'admin' && stations.length > 1 && (
            <div><h4>Stations</h4><Link href={s.href('/admin/overview')} className={`navlink ${rel === '/admin/overview' ? 'active' : ''}`}><Icon name="building" size={19} />All stations</Link></div>
          )}
          <div style={{ marginTop: 18, padding: '0 10px' }}>
            <div className="small muted" style={{ marginBottom: 6 }}>{s.user.name}</div>
            <Button variant="ghost" size="sm" block onClick={() => { s.logout(); router.replace(s.href('/login')); }}>Log out</Button>
          </div>
        </nav>
        <main className="main">{children}</main>
      </div>
      <nav className="bottomnav" aria-label="Quick links">
        {bottom.map((i) => (
          <Link key={i.href} href={s.href(i.href)} className={isActive(i.href) ? 'active' : ''}><Icon name={i.icon} />{i.label}</Link>
        ))}
        <button onClick={() => setMore(true)} className={more ? 'active' : ''}><Icon name="more" />More</button>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="Menu">
        <div className="stack" style={{ gap: 4 }}>
          {flat.map((i) => (
            <Link key={i.href} href={s.href(i.href)} className="navlink" onClick={() => setMore(false)}><Icon name={i.icon} size={20} />{i.label}</Link>
          ))}
          {s.role === 'admin' && stations.length > 1 && <Link href={s.href('/admin/overview')} className="navlink" onClick={() => setMore(false)}><Icon name="building" size={20} />All stations</Link>}
          <Link href={s.href('/notifications')} className="navlink" onClick={() => setMore(false)}><Icon name="bell" size={20} />Notifications</Link>
          <Link href={s.href('/help')} className="navlink" onClick={() => setMore(false)}><Icon name="help" size={20} />Help</Link>
          <hr className="sep" />
          <div className="small muted">Signed in as {s.user.name}</div>
          <Button variant="ghost" onClick={() => { setMore(false); s.logout(); router.replace(s.href('/login')); }}>Log out</Button>
        </div>
      </Modal>
    </div>
  );
}
