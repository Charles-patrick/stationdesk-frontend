import { StationProvider } from '@/lib/station';

export default function StationLayout({ children, params }) {
  return <StationProvider slug={params.slug}>{children}</StationProvider>;
}
