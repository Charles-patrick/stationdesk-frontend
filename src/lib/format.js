export const money = (n, currency = 'NGN') => {
  const v = Number(n || 0);
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: Number.isInteger(v) ? 0 : 2 }).format(v);
};
export const num = (n, max = 2) => new Intl.NumberFormat('en-NG', { maximumFractionDigits: max }).format(Number(n || 0));
export const dateTime = (d, tz) => (d ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz || undefined }).format(new Date(d)) : '');
export const dateOnly = (d, tz) => (d ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: tz || undefined }).format(new Date(d)) : '');
export const timeOnly = (d, tz) => (d ? new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: tz || undefined }).format(new Date(d)) : '');
export const sinceHours = (d) => {
  const h = (Date.now() - new Date(d).getTime()) / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  return `${Math.round(h * 10) / 10} h`;
};
export const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};
export const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Show a pump reading like a pump display: 120450.5 -> 120,450.50
export const reading = (n) => new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
export const STATUS_TONE = { pending: 'warn', confirmed: 'info', ready: 'info', completed: 'good', cancelled: '' };
export const AVAIL_LABEL = { in_stock: 'In stock', low: 'Low', out: 'Out of stock' };
export const AVAIL_TONE = { in_stock: 'good', low: 'warn', out: 'bad' };

// Pick black or white text for a brand colour
export function contrastInk(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#12202a';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#12202a' : '#ffffff';
}

export const flagText = (f) => {
  if (f.type === 'cash') return `Cash ${f.amount < 0 ? 'short' : 'over'} by ${money(Math.abs(f.amount))}`;
  if (f.type === 'dip') return `${f.tank}: dipstick differs from book by ${num(f.litres)} L`;
  if (f.type === 'meter_gap') return `${f.pump}: opening reading was ${num(f.litres)} L ${f.litres > 0 ? 'above' : 'below'} the last close`;
  return f.type;
};
