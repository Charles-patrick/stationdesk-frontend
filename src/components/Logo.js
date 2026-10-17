// Placeholder StationDesk logo. Replace public/logo-mark.svg (and the text below) when you have the real one.
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#12202a" />
      <path d="M20 50V16a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v34M16 50h28M40 26h4a4 4 0 0 1 4 4v10a3 3 0 0 0 6 0V24l-6-6" fill="none" stroke="#f2a900" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="25" y="19" width="10" height="9" rx="1.5" fill="#b8f26b" />
    </svg>
  );
}

export default function Logo({ size = 36, light = false, name }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.72, color: light ? '#fff' : 'var(--ink)', letterSpacing: '0.01em' }}>
        {name || process.env.NEXT_PUBLIC_APP_NAME || 'StationDesk'}
      </span>
    </span>
  );
}
