import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogoutButton } from '@/features/auth/logout-button';
import { cop, payments, type Payment } from '@/features/visits/validation';
import { periods, readPeriod, type DashboardParams } from './period';

type DashboardData = {
  timezone: string; start: string; end: string; today: string;
  totals: { sales: string; visits: string; commissions: string; shop: string };
  payments: { method: Payment; amount: string }[];
  barbers: { id: string; name: string; visits: string; production: string; commission: string }[];
  services: { id: string; name: string; quantity: string }[];
};
const count = (value: string) => BigInt(value).toLocaleString('es-CO');

export async function Dashboard({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  const { supabase, barbershop, user } = await requireOwner();
  const selection = readPeriod(await searchParams);
  // One RPC also supplies the shop's local date for the custom form's defaults.
  const { data: raw, error } = await supabase.rpc('get_dashboard', {
    p_period: selection.ready ? selection.period : 'today',
    ...(selection.ready && selection.period === 'custom' ? { p_start_date: selection.start, p_end_date: selection.end } : {}),
  });
  if (error || !raw) throw new Error('No se pudo cargar el resumen.');
  const data = raw as unknown as DashboardData;
  const empty = data.totals.visits === '0';
  const localDate = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: data.timezone });
  return <>
    <p className="eyebrow">Resumen de tu operación</p>
    <h1 className="page-title break-words">{barbershop.name}</h1>
    <nav aria-label="Periodo del Dashboard" className="mt-5 grid grid-cols-2 gap-2">
      {Object.entries(periods).map(([key, label]) => <Button key={key} asChild variant={selection.period === key ? 'selected' : 'outline'}>
        <Link href={key === 'today' ? '/' : `/?periodo=${key}`} aria-current={selection.period === key ? 'page' : undefined}>{label}</Link>
      </Button>)}
    </nav>
    {selection.period === 'custom' && <form action="/" method="get" noValidate aria-label="Periodo personalizado" className="mt-4 space-y-4 rounded-xl bg-card p-4">
      <input type="hidden" name="periodo" value="custom" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0"><label htmlFor="desde" className="field-label">Fecha inicial</label><Input id="desde" name="desde" type="date" autoFocus={!!selection.error} min="0001-01-01" max="9999-12-31" defaultValue={selection.start || data.today} aria-invalid={!!selection.error} aria-describedby={selection.error ? 'period-error' : undefined} /></div>
        <div className="min-w-0"><label htmlFor="hasta" className="field-label">Fecha final</label><Input id="hasta" name="hasta" type="date" min="0001-01-01" max="9999-12-31" defaultValue={selection.end || data.today} aria-invalid={!!selection.error} aria-describedby={selection.error ? 'period-error' : undefined} /></div>
      </div>
      {selection.error && <p id="period-error" role="alert" className="text-sm text-destructive">{selection.error}</p>}
      <p className="text-sm text-muted-foreground">Se incluyen ambos días, según la hora de tu barbería.</p>
      <Button type="submit" className="w-full">Aplicar periodo</Button>
    </form>}
    {selection.error && selection.period !== 'custom' && <p role="alert" className="mt-4 text-sm text-destructive">{selection.error}</p>}
    <Button asChild className="my-5 h-14 w-full text-base"><Link href="/visitas/nueva">+ Nueva visita</Link></Button>
    {selection.ready ? <>
      <section aria-label="Métricas del periodo" className="rounded-2xl bg-card p-5">
        <h2 className="text-sm font-semibold">{periods[selection.period]}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{selection.period === 'custom' ? `${selection.start} al ${selection.end}` : selection.period === 'today' ? localDate.format(new Date(data.start)) : `Desde ${localDate.format(new Date(data.start))} · hasta ahora`}</p>
        <dl className="mt-5">
          <div className="border-b border-border/60 pb-5"><dt className="text-sm text-muted-foreground">Ventas</dt><dd data-testid="metric-sales" className="sales-amount">{cop(data.totals.sales)}</dd></div>
          {([['visits', 'Visitas'], ['commissions', 'Comisiones'], ['shop', 'Para barbería']] as const).map(([key,label]) => <div key={key} className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt className={key === 'shop' ? 'font-semibold' : 'text-muted-foreground'}>{label}</dt><dd data-testid={`metric-${key}`} className="break-all text-lg font-semibold tabular-nums">{key === 'visits' ? count(data.totals[key]) : cop(data.totals[key])}</dd></div>)}
        </dl>
      </section>
      {empty ? <div className="mt-6 text-center"><p className="text-sm text-muted-foreground">{selection.period === 'today' ? 'Aún no tienes visitas registradas hoy.' : 'No hay visitas activas en este periodo.'}</p><Button asChild variant="outline" className="mt-3"><Link href="/visitas/nueva">Registrar primera visita</Link></Button></div> : <>
        <section aria-labelledby="payments-heading" className="mt-8"><h2 id="payments-heading" className="text-lg font-semibold">Métodos de pago</h2><dl className="mt-3 divide-y">{data.payments.map(item => <div key={item.method} className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">{payments[item.method]}</dt><dd className="break-all font-semibold tabular-nums">{cop(item.amount)}</dd></div>)}</dl></section>
        <section aria-labelledby="barbers-heading" className="mt-8"><h2 id="barbers-heading" className="text-lg font-semibold">Producción por barbero</h2><ul className="mt-3 divide-y">{data.barbers.map(barber => <li key={barber.id} className="py-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="min-w-0 max-w-full break-words font-semibold">{barber.name}</h3><p className="text-sm text-muted-foreground">{count(barber.visits)} {barber.visits === '1' ? 'visita' : 'visitas'}</p></div><dl className="mt-2 space-y-1 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Producción</dt><dd className="break-all font-semibold tabular-nums">{cop(barber.production)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Comisión</dt><dd className="break-all tabular-nums">{cop(barber.commission)}</dd></div></dl></li>)}</ul></section>
        <section aria-labelledby="services-heading" className="mt-8"><h2 id="services-heading" className="text-lg font-semibold">Top servicios</h2><p className="mt-1 text-sm text-muted-foreground">Los más vendidos en este periodo.</p><ol className="mt-3 divide-y">{data.services.map(service => <li key={service.id} className="flex items-baseline justify-between gap-4 py-3"><span className="min-w-0 break-words">{service.name}</span><span className="shrink-0 font-semibold tabular-nums">{count(service.quantity)}<span className="sr-only"> ventas</span></span></li>)}</ol></section>
      </>}
    </> : !selection.error && <p className="text-sm text-muted-foreground">Elige las fechas y aplica el periodo para consultar el resumen.</p>}
    <section className="mt-10 border-t pt-5"><p className="text-sm font-medium">Acceso de propietario verificado</p><p className="mt-1 break-words text-sm text-muted-foreground">{user.email}</p><LogoutButton /></section>
  </>;
}
