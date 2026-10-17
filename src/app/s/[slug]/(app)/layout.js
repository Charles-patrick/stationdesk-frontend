'use client';
import AppShell from '@/components/Shell';
import { useStation } from '@/lib/station';
import { Loading, Empty } from '@/components/ui';

export default function AppLayout({ children }) {
  const s = useStation();
  if (s.state === 'loading') return <Loading />;
  if (s.state === 'paused') return <Empty title="This station is paused">Please contact StationDesk.</Empty>;
  if (s.state === 'missing') return <Empty title="Station not found">Check the address you were given.</Empty>;
  return <AppShell>{children}</AppShell>;
}
