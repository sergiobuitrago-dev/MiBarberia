import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { weekHref, weekRange } from './period';
import type { WeeklyCommissions } from './data';
export function WeekNavigation({ data, base = '/comisiones' }: { data: WeeklyCommissions; base?: string }) {
  return <section aria-label="Semana seleccionada" className="mt-5">
    <p className="text-xs font-semibold text-primary">{data.is_current ? 'Esta semana' : 'Semana seleccionada'}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums">{weekRange(data.week_start, data.week_end)}</p>
    <nav aria-label="Navegación semanal" className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-2">
      {data.previous_week ? <Button asChild variant="outline" className="min-w-0 px-2"><Link href={weekHref(base, data.previous_week)} aria-label="Semana anterior">← <span>Anterior</span></Link></Button> : <Button variant="outline" disabled aria-label="Semana anterior">← Anterior</Button>}
      <Button asChild variant={data.is_current ? 'selected' : 'outline'} className="px-3"><Link href={base} aria-label="Semana actual" aria-current={data.is_current ? 'date' : undefined}>Actual</Link></Button>
      {data.next_week ? <Button asChild variant="outline" className="min-w-0 px-2"><Link href={weekHref(base, data.next_week)} aria-label="Semana siguiente"><span>Siguiente</span> →</Link></Button> : <Button variant="outline" disabled aria-label="Semana siguiente">Siguiente →</Button>}
    </nav>
  </section>;
}
