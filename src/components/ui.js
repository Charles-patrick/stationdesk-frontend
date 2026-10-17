'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ---------- icons ----------
const PATHS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  cart: 'M3 4h2l2.4 11h10.2l2-8H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  pump: 'M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3M7 8h6',
  check: 'M5 13l4 4L19 7',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01',
  truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  building: 'M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M4 21h16',
  print: 'M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
};
export function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.more} />
    </svg>
  );
}

// ---------- basics ----------
export function Button({ variant, size, block, loading, children, className = '', ...rest }) {
  const cls = ['btn', variant, size, block ? 'block' : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
      {children}
    </button>
  );
}
export const Spinner = () => <span className="spinner" role="status" aria-label="Loading" />;
export const Loading = () => <div className="center"><Spinner /></div>;
export const Badge = ({ tone = '', children }) => <span className={`badge ${tone}`}>{children}</span>;
export const Banner = ({ tone = 'info', title, children, action }) => (
  <div className={`banner ${tone}`}>
    <div className="b">{title && <strong>{title}</strong>}{title && children ? ' ' : ''}{children}</div>
    {action}
  </div>
);
export const Empty = ({ title, children }) => (
  <div className="empty"><h3>{title}</h3>{children && <div>{children}</div>}</div>
);
export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && <div className="card-head">{title && <h3>{title}</h3>}{actions}</div>}
      {children}
    </section>
  );
}
export const PageHead = ({ title, sub, children }) => (
  <div className="pagehead"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="actions">{children}</div>}</div>
);
export const Stat = ({ label, value, sub, tone = '' }) => (
  <div className={`stat ${tone}`}><div className="label">{label}</div><div className="value">{value}</div>{sub && <div className="sub">{sub}</div>}</div>
);
export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
export const Check = ({ title, desc, ...rest }) => (
  <label className="check"><input type="checkbox" {...rest} /><span><span className="t">{title}</span>{desc && <span className="d" style={{ display: 'block' }}>{desc}</span>}</span></label>
);
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={value === t.key ? 'active' : ''} onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button className="btn ghost sm" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button></div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- confirm & toast ----------
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const [confirmState, setConfirm] = useState(null);
  const push = useCallback((message, kind = '') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, message, kind }]);
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), 4200);
  }, []);
  const api = {
    ok: (m) => push(m),
    error: (e) => push(typeof e === 'string' ? e : e?.message || 'Something went wrong', 'error'),
    confirm: (opts) => new Promise((resolve) => setConfirm({ ...opts, resolve })),
  };
  const close = (v) => { confirmState?.resolve(v); setConfirm(null); };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">{items.map((i) => <div key={i.id} className={`toast ${i.kind}`}>{i.message}</div>)}</div>
      <Modal open={!!confirmState} onClose={() => close(false)} title={confirmState?.title || 'Are you sure?'}
        footer={<><Button variant="ghost" onClick={() => close(false)}>{confirmState?.cancel || 'Go back'}</Button>
          <Button variant={confirmState?.danger ? 'danger' : 'brand'} onClick={() => close(true)}>{confirmState?.confirm || 'Yes, continue'}</Button></>}>
        <p>{confirmState?.message}</p>
      </Modal>
    </ToastCtx.Provider>
  );
}

// ---------- data helpers ----------
export function Async({ state, children, empty }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error && !state.data) return <Banner tone="bad" title="Could not load this.">{state.error}</Banner>;
  if (empty && Array.isArray(state.data) && state.data.length === 0) return empty;
  return children(state.data);
}

export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn, successMsg) => {
    setBusy(true);
    try { const r = await fn(); if (successMsg) toast.ok(successMsg); return r; }
    catch (e) { toast.error(e); return undefined; }
    finally { setBusy(false); }
  }, [toast]);
  return [run, busy];
}

// ---------- pump readout ----------
export function Lcd({ caption, value, alert }) {
  return <div className={`lcd ${alert ? 'alert' : ''}`}><div className="cap">{caption}</div><div className="num">{value}</div></div>;
}
export function LcdInput({ caption, value, onChange, alert, id, placeholder = '0.00' }) {
  return (
    <div className={`lcd ${alert ? 'alert' : ''}`}>
      <label className="cap" htmlFor={id}>{caption}</label>
      <input id={id} className="lcd-input" inputMode="decimal" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))} />
    </div>
  );
}

export function Qty({ value, onChange, min = 0, max }) {
  const set = (v) => { let n = Number(v); if (!Number.isFinite(n)) n = min; n = Math.max(min, n); if (max !== undefined) n = Math.min(max, n); onChange(n); };
  return (
    <div className="qty">
      <button type="button" onClick={() => set(Number(value) - 1)} aria-label="Less">−</button>
      <input inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} aria-label="Quantity" />
      <button type="button" onClick={() => set(Number(value) + 1)} aria-label="More">+</button>
    </div>
  );
}

export function ProgressBar({ value, max, lowAt = 0.2, midAt = 0.4 }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const cls = pct <= lowAt ? 'low' : pct <= midAt ? 'mid' : '';
  return <div className={`bar ${cls}`}><i style={{ width: `${pct * 100}%` }} /></div>;
}

// Bar chart with a labelled money axis, gridlines and a readout for the bar you touch or hover
const niceMax = (v) => {
  if (v <= 0) return 4;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
};
export const compact = (n, symbol = '₦') => {
  const v = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (v >= 1e9) return `${sign}${symbol}${+(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${sign}${symbol}${+(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${sign}${symbol}${+(v / 1e3).toFixed(1)}k`;
  return `${sign}${symbol}${+v.toFixed(0)}`;
};
export function BarChart({ data, height = 260, format = (v) => v, yFormat = compact, color = 'var(--ink)', xTitle = 'Date', yTitle = 'Amount' }) {
  const ref = useRef(null);
  const [w, setW] = useState(560);
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(260, Math.floor(e[0].contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  if (!data?.length) return <div className="muted small">No data yet.</div>;
  const left = 58, right = 10, top = 10, bottom = 44;
  const pw = w - left - right, ph = height - top - bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const slot = pw / data.length;
  const bw = Math.min(slot * 0.7, 46);
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(pw / 62))));
  const y = (v) => top + ph - (v / max) * ph;
  const sel = active !== null ? data[active] : null;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <div className="small" style={{ minHeight: 22, marginBottom: 4, fontWeight: 650 }}>
        {sel ? `${sel.label}: ${format(sel.value)}` : <span className="muted" style={{ fontWeight: 400 }}>Tap or hover a bar to see the amount</span>}
      </div>
      <svg width={w} height={height} role="img" aria-label={`${yTitle} by ${xTitle.toLowerCase()}`} style={{ display: 'block', maxWidth: '100%' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#9aa7a1' : '#e1e6e3'} strokeWidth="1" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#667782">{yFormat(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * ph, d.value > 0 ? 2 : 0);
          const x = left + i * slot + (slot - bw) / 2;
          return (
            <g key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(i)} style={{ cursor: 'pointer' }}>
              <rect x={left + i * slot} y={top} width={slot} height={ph} fill="transparent" />
              <rect x={x} y={top + ph - h} width={bw} height={h} rx="3" fill={active === i ? 'var(--brand)' : color} />
              {i % every === 0 && <text x={x + bw / 2} y={top + ph + 16} textAnchor="middle" fontSize="11" fill="#667782">{d.label}</text>}
            </g>
          );
        })}
        <text x={left + pw / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="#667782">{xTitle}</text>
        <text x={12} y={top + ph / 2} textAnchor="middle" fontSize="11" fill="#667782" transform={`rotate(-90 12 ${top + ph / 2})`}>{yTitle}</text>
      </svg>
    </div>
  );
}

export const Json = ({ v }) => <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.85rem' }}>{JSON.stringify(v, null, 1)}</pre>;
