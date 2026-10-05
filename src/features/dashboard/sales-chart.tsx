import { cop } from '@/features/visits/validation';
import { salesChart, type DailySale } from './chart';
const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' });
const day = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export function SalesChart({ days }: { days: DailySale[] }) {
  const chart = salesChart(days.map(d => d.sales));
  return <section aria-labelledby="sales-chart-heading" className="mt-8">
    <h2 id="sales-chart-heading" className="text-lg font-semibold">Ventas — últimos 7 días</h2>
    <p className="mt-1 text-sm text-muted-foreground">Incluye hoy. Independiente del periodo seleccionado.</p>
    <div className="mt-4 rounded-2xl bg-card p-4">
      <p className="text-xs text-muted-foreground">Máximo diario <span className="ml-1 break-all font-semibold tabular-nums text-success">{cop(chart.max)}</span></p>
      <svg role="img" aria-labelledby="sales-chart-title sales-chart-description" viewBox="0 0 280 152" className="mt-3 block w-full overflow-visible">
        <title id="sales-chart-title">Ventas diarias en pesos colombianos</title>
        <desc id="sales-chart-description">{days.map(d => `${d.date}: ${cop(d.sales)}`).join('; ')}</desc>
        {[12, 76, 140].map(y => <line key={y} x1="20" x2="260" y1={y} y2={y} className="stroke-border" strokeWidth="1" strokeDasharray={y === 140 ? undefined : '3 5'} />)}
        <polyline points={chart.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" className="stroke-success" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {chart.points.map((p, i) => <circle key={days[i].date} cx={p.x} cy={p.y} r="3" className="fill-success" />)}
      </svg>
      <div aria-hidden="true" className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {days.map(d => <div key={d.date}><span className="capitalize">{weekday.format(new Date(`${d.date}T00:00:00Z`)).replace('.', '')}</span><span className="mt-1 block text-[10px] tabular-nums">{d.date.slice(8)}</span></div>)}
      </div>
      {chart.max === '0' && <p className="mt-4 text-sm text-muted-foreground">Sin ventas activas en los últimos 7 días.</p>}
      <details className="mt-3 border-t border-border/60 pt-1">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary">Ver ventas por día</summary>
        <dl className="space-y-2 pb-2">{days.map(d => <div key={d.date} className="flex flex-wrap justify-between gap-2 text-sm"><dt><time dateTime={d.date}>{day.format(new Date(`${d.date}T00:00:00Z`))}</time></dt><dd className="break-all tabular-nums">{cop(d.sales)}</dd></div>)}</dl>
      </details>
    </div>
  </section>;
}
