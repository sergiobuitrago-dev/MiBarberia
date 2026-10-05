import 'server-only';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import type { BarberProduction } from '@/components/ui/barber-production-card';
export type WeeklyCommissions = {
  timezone: string; week_start: string; week_end: string;
  previous_week: string | null; next_week: string | null; is_current: boolean;
  barbers: BarberProduction[]; barber: BarberProduction | null;
  visits: { id: string; visited_at: string; total: string; commission: string; services: string[] }[];
  page: number; has_more: boolean;
};
export async function getWeeklyCommissions(date: string | undefined, barberId?: string, page = 1) {
  const { supabase } = await requireOwner();
  if (barberId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barberId)) notFound();
  const { data, error } = await supabase.rpc('get_weekly_commissions', {
    ...(date ? { p_week_date: date } : {}), ...(barberId ? { p_barber_id: barberId } : {}), p_page: page,
  });
  if (error?.code === 'P0002') notFound();
  if (error || !data) throw new Error('No se pudieron cargar las comisiones.');
  return data as unknown as WeeklyCommissions;
}
