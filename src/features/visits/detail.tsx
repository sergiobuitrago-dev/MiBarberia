import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { cop, payments, type Payment } from './validation';
import { VisitDate, VisitStatus } from './presentation';
import { voidVisit } from './actions';

export async function VisitDetail({ id, success = false }: { id: string; success?: boolean }) {
  const { supabase, barbershop } = await requireOwner();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { data: visit, error } = await supabase.from('visits')
    .select('id,visited_at,subtotal_amount,discount_amount,total_amount,status,payment_method,customers(name),barbers(name),visit_items(id,service_name,charged_price)')
    .eq('id', id).eq('barbershop_id', barbershop.id).maybeSingle();
  if (error) throw new Error('No se pudo cargar la visita.');
  if (!visit) notFound();
  const registered = success && visit.status === 'ACTIVE';
  return <>
    <Button asChild variant="ghost" className="-ml-4 mb-4"><Link href="/visitas">← Visitas</Link></Button>
    {registered && <div><span aria-hidden="true" className="mb-5 inline-flex size-12 items-center justify-center rounded-full bg-success/10 text-2xl text-success">✓</span></div>}
    <p className="eyebrow">{registered ? 'Todo listo' : 'Registro'}</p>
    <h1 className="page-title">{registered ? 'Visita registrada' : 'Detalle de visita'}</h1>
    <p className="mt-2 mb-5 text-sm text-muted-foreground"><VisitDate value={visit.visited_at} /></p>
    <div role="status" className="mb-5">
      <VisitStatus status={visit.status} />
      {visit.status === 'VOIDED' && <p className="mt-2 text-sm text-muted-foreground">Esta visita está anulada. Sus datos se conservan. Si necesitas corregirla, registra una nueva visita.</p>}
    </div>
    <section className="rounded-2xl bg-card p-5">
      <h2 className="break-words text-xl font-semibold">{visit.customers?.name ?? 'Cliente ocasional'}</h2>
      <p className="mt-2 break-words text-sm text-muted-foreground">{visit.barbers?.name} · {payments[visit.payment_method as Payment]}</p>
      <div className="mt-5 flex justify-between gap-3 border-t pt-4 text-xs text-muted-foreground"><span>Servicios</span><span>Precio cobrado</span></div>
      <ul className="mt-3 space-y-3">{visit.visit_items.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm"><span className="min-w-0 break-words">{item.service_name}</span><span className="break-all tabular-nums">{cop(item.charged_price)}</span></li>)}</ul>
      <dl className="mt-5 space-y-2 border-t pt-4">
        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><dt>Subtotal</dt><dd className="break-all tabular-nums">{cop(visit.subtotal_amount)}</dd></div>
        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><dt>Descuento</dt><dd className="break-all tabular-nums">{cop(visit.discount_amount)}</dd></div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 pt-3"><dt className="font-semibold">Total</dt><dd className="break-all text-3xl font-bold tracking-tight tabular-nums">{cop(visit.total_amount)}</dd></div>
      </dl>
    </section>
    <div className="mt-6 flex flex-col gap-2">
      <Button asChild><Link href="/visitas/nueva">Registrar otra visita</Link></Button>
      {registered && <Button asChild variant="outline"><Link href={`/visitas/${visit.id}`}>Ver visita</Link></Button>}
    </div>
    {!success && visit.status === 'ACTIVE' && <ConfirmAction action={voidVisit.bind(null, visit.id)}
      triggerLabel="Anular visita" title="¿Anular esta visita?"
      description="La visita dejará de contar en ventas, comisiones y fidelización. Esta acción es definitiva. Sus datos se conservarán."
      cancelLabel="Cancelar" confirmLabel="Anular visita" pendingLabel="Anulando…"
      errorHelp={<Button asChild variant="link" className="mt-2 px-0"><Link href={`/visitas/${visit.id}`}>Actualizar detalle</Link></Button>} />}
  </>;
}
