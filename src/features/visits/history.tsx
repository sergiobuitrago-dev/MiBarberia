import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cop, payments, type Payment } from './validation';
import { VisitDate, VisitStatus } from './presentation';

const pageSize = 25;
export async function VisitHistory({ searchParams }: { searchParams: Promise<{ pagina?: string | string[] }> }) {
  const { supabase, barbershop } = await requireOwner();
  const { pagina } = await searchParams;
  const requested = typeof pagina === 'string' && /^\d{1,6}$/.test(pagina) ? Number(pagina) : 1;
  const page = Math.min(100000, Math.max(1, requested));
  const { data, error, count } = await supabase.from('visits')
    .select('id,visited_at,total_amount,payment_method,status,customers(name),barbers(name),visit_items(service_name)', { count: 'exact' })
    .eq('barbershop_id', barbershop.id)
    .order('visited_at', { ascending: false }).order('id', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  // PostgREST returns 416 for an offset beyond the last row. Treat it as an empty page.
  if (error && !(page > 1 && error.code === 'PGRST103')) throw new Error('No se pudo cargar el historial.');
  return <>
    <p className="eyebrow">Historial</p>
    <h1 className="page-title">Visitas</h1>
    <p className="mt-2 mb-6 text-sm text-muted-foreground">Las atenciones más recientes de tu barbería.</p>
    <Button asChild className="mb-5 h-14 w-full text-base"><Link href="/visitas/nueva">+ Nueva visita</Link></Button>
    {data?.length ? <ul aria-label="Historial de visitas" className="divide-y rounded-2xl border bg-card">
      {data.map(visit => <li key={visit.id}>
        <Link href={`/visitas/${visit.id}`} className="block rounded-xl p-5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
          <h2 className="break-words text-lg font-semibold">{visit.customers?.name ?? 'Cliente ocasional'}</h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">{visit.visit_items.map(item => item.service_name).join(' + ')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="break-all text-xl font-bold tabular-nums">{cop(visit.total_amount)}</p>
            {visit.status === 'VOIDED' && <VisitStatus status={visit.status} />}
          </div>
          <p className="mt-3 break-words text-sm">{visit.barbers?.name} · {payments[visit.payment_method as Payment]}</p>
          <p className="mt-1 text-sm text-muted-foreground"><VisitDate value={visit.visited_at} /></p>
        </Link>
      </li>)}
    </ul> : <section className="rounded-2xl border border-dashed bg-card px-5 py-10 text-center">
      <h2 className="text-lg font-semibold">{page === 1 ? 'Aún no hay visitas' : 'No hay visitas en esta página'}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{page === 1 ? 'Registra la primera atención para verla aquí.' : 'Vuelve al inicio del historial para ver tus visitas.'}</p>
      {page > 1 && <Button asChild variant="outline" className="mt-5"><Link href="/visitas">Volver al historial</Link></Button>}
    </section>}
    {(page > 1 || (count ?? 0) > pageSize) && <nav aria-label="Páginas de visitas" className="mt-5 flex items-center justify-between gap-2">
      {page > 1 ? <Button asChild variant="outline"><Link href={`/visitas?pagina=${page - 1}`}>Anterior</Link></Button> : <span />}
      <span className="text-sm">Página {page}</span>
      {page * pageSize < (count ?? 0) ? <Button asChild variant="outline"><Link href={`/visitas?pagina=${page + 1}`}>Siguiente</Link></Button> : <span />}
    </nav>}
  </>;
}
