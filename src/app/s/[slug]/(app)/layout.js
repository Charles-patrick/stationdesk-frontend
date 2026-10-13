'use client';
import AppShell from '@/components/Shell';
import { useStation } from '@/lib/station';
import { Loading, Empty } from '@/components/ui';

export default function AppLayout({ children }) {
  const s = useStation();
  if (s.state === 'loading') return <Loading />;
  if (s.state === 'missing') return <Empty title="Station not found">Check the address you were given.</Empty>;
  return <AppShell>{children}</AppShell>;
}
