import { cop } from '@/features/visits/validation';
export type DashboardTotals = { sales: string; visits: string; commissions: string; shop: string };
const metrics = [
  { key: 'sales', label: 'Ventas', color: 'text-success' },
  { key: 'visits', label: 'Visitas', color: 'text-foreground' },
  { key: 'commissions', label: 'Comisiones', color: 'text-destructive' },
  { key: 'shop', label: 'Para barbería', color: 'text-primary' },
] as const;
export function DashboardMetrics({ totals }: { totals: DashboardTotals }) {
  return <dl className="mt-4 grid grid-cols-2 gap-3">
    {metrics.map(({ key, label, color }) => <div key={key} className={`min-w-0 rounded-2xl bg-card p-4 ${totals[key].length > 9 ? 'col-span-2' : ''}`}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd data-testid={`metric-${key}`} className={`mt-2 break-all text-2xl leading-tight font-bold tracking-tight tabular-nums ${color}`}>
        {key === 'visits' ? BigInt(totals[key]).toLocaleString('es-CO') : cop(totals[key])}
      </dd>
      {key === 'sales' && <dd className="mt-2 text-xs text-muted-foreground">{BigInt(totals.visits).toLocaleString('es-CO')} {totals.visits === '1' ? 'visita' : 'visitas'}</dd>}
    </div>)}
  </dl>;
}
