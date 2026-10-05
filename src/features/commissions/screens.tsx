import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarberProductionCard } from '@/components/ui/barber-production-card';
import { cop } from '@/features/visits/validation';
import { getWeeklyCommissions } from './data';
import { readWeek, weekHref, type WeekParams } from './period';
import { WeekNavigation } from './week-navigation';

function InvalidWeek({ error, base }: { error: string; base: string }) {
  return <div className="mt-5"><p role="alert" className="text-sm text-destructive">{error}</p><Button asChild variant="outline" className="mt-4"><Link href={base}>Volver a esta semana</Link></Button></div>;
}
export async function Commissions({ searchParams }: { searchParams: Promise<WeekParams> }) {
  const selection = readWeek(await searchParams);
  if (selection.error) return <><h1 className="page-title">Comisiones</h1><InvalidWeek error={selection.error} base="/comisiones" /></>;
  const data = await getWeeklyCommissions(selection.date);
  return <>
    <p className="eyebrow">Tu equipo</p><h1 className="page-title">Comisiones</h1>
    <p className="mt-2 text-sm text-muted-foreground">Lo que corresponde a cada barbero según las visitas activas.</p>
    <WeekNavigation data={data} />
    {data.barbers.length ? <div className="mt-6 space-y-3">{data.barbers.map(barber => <BarberProductionCard key={barber.id} barber={barber} detailHref={weekHref(`/comisiones/${barber.id}`, data.week_start)} />)}</div>
      : <p className="mt-6 rounded-2xl bg-card p-5 text-sm text-muted-foreground">No hay comisiones registradas esta semana.</p>}
  </>;
}
export async function CommissionDetail({ id, searchParams }: { id: string; searchParams: Promise<WeekParams> }) {
  const selection = readWeek(await searchParams);
  const base = `/comisiones/${id}`;
  if (selection.error) return <><h1 className="page-title">Detalle de comisiones</h1><InvalidWeek error={selection.error} base={base} /></>;
  const data = await getWeeklyCommissions(selection.date, id, selection.page);
  const barber = data.barber!;
  const date = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: data.timezone });
  return <>
    <Button asChild variant="ghost" className="-ml-4 mb-4"><Link href={weekHref('/comisiones', data.week_start)} aria-label="Volver a Comisiones">← Comisiones</Link></Button>
    <p className="eyebrow">Comisiones semanales</p><h1 className="page-title break-words">{barber.name}</h1>
    <WeekNavigation data={data} base={base} />
    <dl className="mt-6 space-y-4 rounded-2xl bg-card p-5">
      <div><dt className="text-sm text-muted-foreground">Comisión total</dt><dd data-testid="commission-total" className="mt-1 break-all text-3xl font-bold tabular-nums text-destructive">{cop(barber.commission)}</dd></div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/60 pt-4"><dt className="text-sm text-muted-foreground">Producción total</dt><dd className="break-all text-lg font-semibold tabular-nums text-success">{cop(barber.production)}</dd></div>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-sm text-muted-foreground">Visitas</dt><dd className="break-all font-semibold tabular-nums">{BigInt(barber.visits).toLocaleString('es-CO')}</dd></div>
    </dl>
    <section aria-labelledby="weekly-visits-heading" className="mt-8">
      <h2 id="weekly-visits-heading" className="text-lg font-semibold">Visitas de la semana</h2>
      {data.visits.length ? <ul className="mt-3 space-y-3">{data.visits.map(visit => <li key={visit.id} className="rounded-2xl bg-card p-5">
        <p className="text-xs text-muted-foreground"><time dateTime={visit.visited_at}>{date.format(new Date(visit.visited_at))}</time></p>
        <p className="mt-2 break-words font-semibold">{visit.services.join(' + ') || 'Visita sin servicios'}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Total visita</dt><dd className="break-all tabular-nums">{cop(visit.total)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Comisión</dt><dd className="break-all font-semibold tabular-nums text-destructive">{cop(visit.commission)}</dd></div>
        </dl>
      </li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{barber.visits === '0' ? 'No hay visitas activas de este barbero esta semana.' : 'No hay visitas en esta página.'}</p>}
      {(data.page > 1 || data.has_more) && <nav aria-label="Páginas de visitas" className="mt-5 flex flex-wrap gap-3">
        {data.page > 1 && <Button asChild variant="outline"><Link href={weekHref(base, data.week_start, data.page - 1)}>Página anterior</Link></Button>}
        {data.has_more && <Button asChild variant="outline"><Link href={weekHref(base, data.week_start, data.page + 1)}>Página siguiente</Link></Button>}
        {data.page > 1 && !data.visits.length && <Button asChild variant="ghost"><Link href={weekHref(base, data.week_start)}>Primera página</Link></Button>}
      </nav>}
    </section>
  </>;
}
