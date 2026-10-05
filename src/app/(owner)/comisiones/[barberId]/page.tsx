import { CommissionDetail } from '@/features/commissions/screens';
import type { WeekParams } from '@/features/commissions/period';
export const metadata = { title: 'Detalle de comisiones | MiBarbería' };
export default async function Page({ params, searchParams }: { params: Promise<{ barberId: string }>; searchParams: Promise<WeekParams> }) {
  const { barberId } = await params;
  return <CommissionDetail id={barberId} searchParams={searchParams} />;
}
