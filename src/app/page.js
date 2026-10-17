'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { lastSession, homePath } from '@/lib/session';

const FEATURES = [
  ['Daily sales without the paper book', 'Attendants enter pump meter readings and the system works out litres and money. Drums, kegs and shop items are recorded in a few taps.'],
  ['Stock you can trust', 'Tank levels, dipstick checks, restocks and low-stock alerts, so you know what you have and when to reorder.'],
  ['Price changes at any time', 'Change a pump price mid-day and the right litres are charged at the right price. Every change is kept in a history.'],
  ['Cash checks and flags', 'See what was expected against what was handed over. Differences are flagged to you, and closed shifts are locked.'],
  ['An online store for customers', 'Customers order drums, kegs and lubricants from your own page with just their name and phone number. No accounts needed.'],
  ['Reports and a monthly recap', 'Sales by day, product and person, expenses, and a recap on the last day of every month as PDF or Excel.'],
];

export default function Landing() {
  const [session, setSession] = useState(null);
  useEffect(() => { setSession(lastSession()); }, []);
  return (
    <div>
      <nav className="mk-nav">
        <Link href="/" aria-label="Home"><Logo /></Link>
        <div className="spacer" />
        {session && <Link className="btn ghost sm" href={homePath(session.slug, session.role)}>Open my station</Link>}
        <Link className="btn ghost sm" href="/login">Login</Link>
        <Link className="btn brand sm" href="/signup">Sign up</Link>
      </nav>

      <header className="mk-hero">
        <h1>Run your fuel station without the paper book.</h1>
        <p className="lead">StationDesk records daily pump sales, keeps track of stock, and gives your customers a simple page to order drums, kegs and lubricants.</p>
        <div className="row">
          <Link className="btn brand lg" href="/signup">Sign up your station</Link>
          <Link className="btn ghost lg" href="/login">Login</Link>
        </div>
        <div style={{ marginTop: 28 }}><span className="pump-strip" aria-hidden="true">120,450.50</span></div>
      </header>

      <section className="mk-section">
        <h2>What it does</h2>
        <div className="grid c3">
          {FEATURES.map(([t, d]) => <div key={t} className="mk-card"><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <section className="mk-section">
        <h2>How it works</h2>
        <div className="mk-steps">
          <div className="mk-step"><h3>1. Sign up</h3><p className="muted">Tell us about your station. We review it and approve your account.</p></div>
          <div className="mk-step"><h3>2. Set up in about half an hour</h3><p className="muted">Add your fuels, tanks, pumps, prices and products. You can paste a product list from a spreadsheet.</p></div>
          <div className="mk-step"><h3>3. Your team starts working</h3><p className="muted">Attendants log in on their phones with your station code, and customers order from your store link.</p></div>
        </div>
      </section>

      <div className="mk-band">
        <div className="mk-section">
          <h2 style={{ color: '#fff' }}>Ready to put the pen away?</h2>
          <p>Sign up and we will get your station running.</p>
          <Link className="btn brand lg" href="/signup">Sign up your station</Link>
        </div>
      </div>

      <footer className="mk-footer">
        <div>© {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || 'StationDesk'}</div>
        <div style={{ marginTop: 6 }}><Link href="/platform/login" className="muted">Platform owner</Link></div>
      </footer>
    </div>
  );
}
