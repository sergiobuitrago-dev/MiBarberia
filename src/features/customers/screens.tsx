import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { VisitDate } from '@/features/visits/presentation';
import { cop } from '@/features/visits/validation';
import { customerPage, customerUuid } from './validation';
import { CustomerSearch } from './search';
import { CustomerForm } from './form';

type SearchParams = { q?: string | string[]; pagina?: string | string[]; estado?: string | string[] };
type Activity = { id: string; name: string; phone: string | null; total_visits: string; total_spent: string; last_visit: string | null };
const pageSize = 25;
const visitsLabel = (count: string) => `${count} ${count === '1' ? 'visita' : 'visitas'}`;

function Pagination({ page, hasNext, path, query = '', label }: { page: number; hasNext: boolean; path: string; query?: string; label: string }) {
  function href(value: number) {
    const params = new URLSearchParams({ pagina: String(value) });
    if (query) params.set('q', query);
    return `${path}?${params}`;
  }
  if (page === 1 && !hasNext) return null;
  return <nav aria-label={label} className="mt-5 flex items-center justify-between gap-2">
    {page > 1 ? <Button asChild variant="outline"><Link href={href(page - 1)}>Anterior</Link></Button> : <span />}
    <span className="text-sm text-muted-foreground">Página {page}</span>
    {hasNext ? <Button asChild variant="outline"><Link href={href(page + 1)}>Siguiente</Link></Button> : <span />}
  </nav>;
}

export async function CustomerList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase } = await requireOwner();
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
  const page = customerPage(params.pagina);
  const { data, error } = await supabase.rpc('search_customers', { p_query: query, p_page: page });
  if (error || !data) throw new Error('No se pudo cargar la lista de clientes.');
  const result = data as { total: string; customers: Activity[] };
  return <>
    <h1 className="page-title">Clientes</h1>
    <p className="mt-2 mb-6 text-sm text-muted-foreground">Busca un cliente y consulta sus visitas.</p>
    <CustomerSearch query={query} />
    {result.customers.length ? <ul aria-label="Clientes registrados" className="divide-y rounded-2xl bg-card">
      {result.customers.map(customer => <li key={customer.id}>
        <Link href={`/clientes/${customer.id}`} className="block rounded-xl px-4 py-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
          <h2 className="break-words font-semibold">{customer.name}</h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">{customer.phone || 'Sin teléfono'}</p>
          <p className="mt-2 text-sm tabular-nums">{visitsLabel(customer.total_visits)} · {cop(customer.total_spent)}</p>
        </Link>
      </li>)}
    </ul> : <section className="rounded-2xl bg-card p-5">
      <h2 className="font-semibold">{page > 1 ? 'No hay clientes en esta página.' : query ? 'No encontramos clientes con esa búsqueda.' : 'Aún no tienes clientes registrados.'}</h2>
      {!query && page === 1 && <>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Los clientes se crean automáticamente cuando registras una visita.</p>
        <Button asChild className="mt-5"><Link href="/visitas/nueva">Nueva visita</Link></Button>
      </>}
      {page > 1 && <Button asChild variant="link" className="mt-2 px-0"><Link href={query ? `/clientes?q=${encodeURIComponent(query)}` : '/clientes'}>Volver al inicio de la lista</Link></Button>}
    </section>}
    <Pagination page={page} hasNext={BigInt(result.total) > BigInt(page * pageSize)} path="/clientes" query={query} label="Páginas de clientes" />
  </>;
}

export async function CustomerProfile({ id, searchParams }: { id: string; searchParams: Promise<SearchParams> }) {
  const { supabase, barbershop } = await requireOwner();
  if (!customerUuid.test(id)) notFound();
  const params = await searchParams;
  const page = customerPage(params.pagina);
  // The invoker view provides customer + live totals; history is a regular bounded
  // Supabase query. No profile RPC, client aggregation, or persisted counters.
  const { data: customer, error } = await supabase.from('customer_activity')
    .select('id,name,phone,total_visits,total_spent,last_visit')
    .eq('id', id).eq('barbershop_id', barbershop.id).maybeSingle();
  if (error) throw new Error('No se pudo cargar el cliente.');
  if (!customer) notFound();
  const { data: visits, error: historyError } = await supabase.from('visits')
    .select('id,visited_at,total_amount,barbers(name),visit_items(id,service_name)')
    .eq('barbershop_id', barbershop.id).eq('customer_id', id).eq('status', 'ACTIVE')
    .order('visited_at', { ascending: false }).order('id', { ascending: false })
    .order('id', { referencedTable: 'visit_items' })
    .range((page - 1) * pageSize, page * pageSize); // One look-ahead row; render at most 25.
  if (historyError && !(page > 1 && historyError.code === 'PGRST103')) throw new Error('No se pudo cargar el historial del cliente.');
  const rows = visits?.slice(0, pageSize) ?? [];
  return <>
    <Button asChild variant="ghost" className="-ml-4 mb-4"><Link href="/clientes">← Clientes</Link></Button>
    <h1 className="page-title break-words">{customer.name}</h1>
    <p className="mt-2 break-words text-muted-foreground">{customer.phone || 'Sin teléfono'}</p>
    <Button asChild variant="link" className="mb-4 px-0"><Link href={`/clientes/${id}/editar`}>Editar datos</Link></Button>
    {params.estado === 'editado' && <p role="status" className="mb-4 text-sm text-success">Datos del cliente actualizados.</p>}
    <section aria-label="Resumen del cliente" className="rounded-2xl bg-card p-5">
      <p className="text-xl font-bold tabular-nums">{visitsLabel(customer.total_visits ?? '0')}</p>
      <p className="mt-1 text-lg tabular-nums">{cop(customer.total_spent ?? '0')} <span className="text-sm text-muted-foreground">gastados</span></p>
      <dl className="mt-4 border-t pt-3 text-sm"><dt className="text-muted-foreground">Última visita</dt><dd className="mt-1">{customer.last_visit ? <VisitDate value={customer.last_visit} /> : 'Sin visitas activas'}</dd></dl>
    </section>
    <section aria-labelledby="customer-history" className="mt-7">
      <h2 id="customer-history" className="mb-3 text-lg font-semibold">Historial</h2>
      {rows.length ? <ul aria-label="Historial del cliente" className="divide-y rounded-2xl bg-card">
        {rows.map(visit => <li key={visit.id}><Link href={`/visitas/${visit.id}`} className="block rounded-xl p-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
          <p className="text-sm text-muted-foreground"><VisitDate value={visit.visited_at} /></p>
          <h3 className="mt-2 break-words font-semibold">{visit.visit_items.map(item => item.service_name).join(' + ')}</h3>
          <p className="mt-2 font-semibold tabular-nums">{cop(visit.total_amount)}</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">{visit.barbers?.name}</p>
        </Link></li>)}
      </ul> : <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">{page === 1 ? 'Aún no tiene visitas activas.' : 'No hay visitas en esta página.'}</p>}
      <Pagination page={page} hasNext={(visits?.length ?? 0) > pageSize} path={`/clientes/${id}`} label="Páginas del historial del cliente" />
    </section>
  </>;
}

export async function CustomerEdit({ id }: { id: string }) {
  const { supabase, barbershop } = await requireOwner();
  if (!customerUuid.test(id)) notFound();
  const { data: customer, error } = await supabase.from('customers').select('id,name,phone')
    .eq('id', id).eq('barbershop_id', barbershop.id).maybeSingle();
  if (error) throw new Error('No se pudo cargar el cliente.');
  if (!customer) notFound();
  return <>
    <Button asChild variant="ghost" className="-ml-4 mb-4"><Link href={`/clientes/${id}`}>← Perfil del cliente</Link></Button>
    <h1 className="page-title mb-6">Editar cliente</h1>
    <CustomerForm customer={customer} />
  </>;
}
