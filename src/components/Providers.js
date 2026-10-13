'use client';
import { useEffect } from 'react';
import { ToastProvider } from '@/components/ui';

export default function Providers({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return <ToastProvider>{children}</ToastProvider>;
}
