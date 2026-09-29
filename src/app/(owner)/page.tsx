import { Dashboard } from '@/features/dashboard/screen';
import type { DashboardParams } from '@/features/dashboard/period';

export default function Home({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  return <Dashboard searchParams={searchParams} />;
}
