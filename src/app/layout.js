import './globals.css';
import Providers from '@/components/Providers';

const APP = process.env.NEXT_PUBLIC_APP_NAME || 'StationDesk';

export const metadata = {
  title: { default: APP, template: `%s | ${APP}` },
  description: 'Daily sales, stock and ordering for fuel stations',
  manifest: '/manifest.json',
  icons: { icon: '/logo-mark.svg' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#12202a' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
