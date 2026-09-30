import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { VisitForm } from '@/features/visits/form';
import { Button } from '@/components/ui/button';
export default async function NewVisitPage() {
  const { supabase,barbershop } = await requireOwner();
  const [barbers,services] = await Promise.all([
    supabase.from('barbers').select('id,name').eq('barbershop_id',barbershop.id).eq('is_active',true).order('name').order('id'),
    supabase.from('services').select('id,name,base_price').eq('barbershop_id',barbershop.id).eq('is_active',true).order('name').order('id'),
  ]);
  if (barbers.error || services.error) throw new Error('No se pudo cargar la configuración.');
  return <><p className="eyebrow">Una visita. Un registro.</p><h1 className="page-title">Nueva visita</h1><p className="mt-2 mb-7 text-sm text-muted-foreground">Tú eliges. MiBarbería hace las cuentas.</p>
    {!barbers.data.length || !services.data.length ? <section className="rounded-2xl bg-card p-5"><h2 className="text-lg font-semibold">Prepara tu primera visita</h2><p className="mt-2 mb-5 text-sm text-muted-foreground">Necesitas al menos un barbero y un servicio activos.</p><div className="flex flex-col gap-2">{!barbers.data.length && <Button asChild><Link href="/mas/barberos">Agregar barberos</Link></Button>}{!services.data.length && <Button asChild><Link href="/mas/servicios">Agregar servicios</Link></Button>}</div></section>
    : <VisitForm barbers={barbers.data} services={services.data} />}
  </>;
}
