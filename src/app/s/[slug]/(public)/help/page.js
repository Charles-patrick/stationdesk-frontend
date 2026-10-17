'use client';
import PublicHeader from '@/components/PublicHeader';
import GuideList from '@/components/GuideList';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';

// Customers only see guides written for customers
export default function CustomerHelp() {
  const s = useStation();
  const guides = useApi(`/public/station/${s.slug}/help`);
  return (
    <div>
      <PublicHeader />
      <div className="pubmain" style={{ maxWidth: 820 }}>
        <h1 className="mb">How to order from {s.station?.name || 'this station'}</h1>
        <GuideList guides={guides.data} loading={guides.loading} />
      </div>
    </div>
  );
}
