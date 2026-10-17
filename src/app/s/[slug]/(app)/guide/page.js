'use client';
import GuideList from '@/components/GuideList';
import { useStation } from '@/lib/station';
import { useApi } from '@/lib/hooks';
import { PageHead } from '@/components/ui';

// Staff and admins only see the guides written for their own role
export default function Guide() {
  const s = useStation();
  const guides = useApi('/help');
  return (
    <div>
      <PageHead title={s.role === 'admin' ? 'Help for admins' : 'Help for staff'} sub="Step by step guides." />
      <GuideList guides={guides.data} loading={guides.loading} />
    </div>
  );
}
