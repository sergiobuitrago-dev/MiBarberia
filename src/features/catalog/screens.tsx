import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CatalogForm, DeactivateForm } from './form';
import { catalogConfig } from './config';
import { formatCOP, type CatalogKind } from './validation';

export async function CatalogList({ kind, searchParams }: { kind: CatalogKind; searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const { supabase, barbershop } = await requireOwner();
  const config = catalogConfig[kind];
  const params = await searchParams;
  const page = Math.min(100000, Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1));
  const { data, error, count } = await supabase.from(kind).select('*', { count: 'exact' })
    .eq('barbershop_id', barbershop.id).eq('is_active', true).order('name').order('id').range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error('No se pudo cargar la lista.');
  const message = { creado: 'Guardado correctamente.', editado: 'Cambios guardados.', desactivado: 'Registro desactivado. Sus datos se conservaron.' }[params.estado ?? ''];
  return <>
    <Button asChild variant="ghost" className="-ml-4 mb-4"><Link href="/mas">← Más</Link></Button>
    <div className="mb-6"><p className="eyebrow">Configuración</p><h1 className="page-title">{config.title}</h1><p className="mt-2 text-muted-foreground">{config.description}</p></div>
    {message && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}
    {data?.length ? <>
      <Button asChild className="mb-5 w-full"><Link href={`${config.path}/nuevo`}>+ Agregar {config.singular}</Link></Button>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {data.map(item => <li key={item.id} className="flex items-center gap-3 p-4 sm:p-5">
          <div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground tabular-nums">{'commission_rate' in item ? `${new Intl.NumberFormat('es-CO').format(item.commission_rate)}% comisión` : formatCOP(item.base_price)}</p></div>
          <Button asChild variant="outline"><Link aria-label={`Editar ${item.name}`} href={`${config.path}/${item.id}/editar`}>Editar</Link></Button>
        </li>)}
      </ul>
    </> : <section className="rounded-2xl border border-dashed bg-card px-5 py-10 text-center">
      <h2 className="text-lg font-semibold">{page === 1 ? config.empty : 'No hay registros en esta página'}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{page === 1 ? `Agrega tu primer ${config.singular} para dejar lista la operación.` : 'Vuelve a la página anterior para ver tus registros.'}</p>
      <Button asChild className="mt-6"><Link href={page === 1 ? `${config.path}/nuevo` : config.path}>{page === 1 ? `Agregar primer ${config.singular}` : 'Volver a la lista'}</Link></Button>
    </section>}
    {(page > 1 || (count ?? 0) > 20) && <nav aria-label="Páginas de resultados" className="mt-5 flex items-center justify-between gap-2">
      {page > 1 ? <Button asChild variant="outline"><Link href={`${config.path}?pagina=${page - 1}`}>Anterior</Link></Button> : <span />}
      <span className="text-sm">Página {page}</span>
      {page * 20 < (count ?? 0) ? <Button asChild variant="outline"><Link href={`${config.path}?pagina=${page + 1}`}>Siguiente</Link></Button> : <span />}
    </nav>}
  </>;
}

export async function CatalogEditor({ kind, id }: { kind: CatalogKind; id?: string }) {
  const { supabase, barbershop } = await requireOwner();
  const config = catalogConfig[kind];
  let record;
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { data, error } = await supabase.from(kind).select('*').eq('id', id).eq('barbershop_id', barbershop.id).eq('is_active', true).maybeSingle();
    if (error) throw new Error('No se pudo cargar el registro.');
    if (!data) notFound();
    record = { id: data.id, name: data.name, amount: 'commission_rate' in data ? data.commission_rate : data.base_price };
  }
  return <>
    <Button asChild variant="ghost" className="-ml-4 mb-4"><Link href={config.path}>← {config.title}</Link></Button>
    <p className="eyebrow">{config.title}</p>
    <h1 className="page-title mb-6">{id ? 'Editar' : 'Agregar'} {config.singular}</h1>
    <CatalogForm kind={kind} record={record} />
    {record && <DeactivateForm kind={kind} id={record.id} name={record.name} />}
  </>;
}
