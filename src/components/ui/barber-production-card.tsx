import Link from 'next/link';
import { Button } from './button';
import { cop } from '@/features/visits/validation';

export type BarberProduction = { id: string; name: string; visits: string; production: string; commission: string };
export function BarberProductionCard({ barber, detailHref }: { barber: BarberProduction; detailHref?: string }) {
  const wideAmounts = barber.production.length > 9 || barber.commission.length > 9;
  return <article aria-label={barber.name} className="min-w-0 rounded-2xl bg-card p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className="min-w-0 max-w-full break-words font-semibold">{barber.name}</h3>
      <p className="text-sm text-muted-foreground">{BigInt(barber.visits).toLocaleString('es-CO')} {barber.visits === '1' ? 'visita' : 'visitas'}</p>
    </div>
    <dl className={`mt-4 grid gap-4 ${wideAmounts ? 'grid-cols-1' : 'grid-cols-2'}`}>
      <div className="min-w-0"><dt className="text-xs text-muted-foreground">Producción</dt><dd className="mt-1 break-all text-lg font-semibold tabular-nums text-success">{cop(barber.production)}</dd></div>
      <div className="min-w-0"><dt className="text-xs text-muted-foreground">{detailHref ? 'Comisión acumulada' : 'Comisión'}</dt><dd className="mt-1 break-all text-lg font-semibold tabular-nums text-destructive">{cop(barber.commission)}</dd></div>
    </dl>
    {detailHref && <Button asChild variant="ghost" className="mt-4 w-full text-primary"><Link href={detailHref} aria-label={`Ver detalle de ${barber.name}`}>Ver detalle <span aria-hidden="true">→</span></Link></Button>}
  </article>;
}
