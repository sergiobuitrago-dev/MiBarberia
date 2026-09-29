export const periods = { today: 'Hoy', week: 'Esta semana', month: 'Este mes', custom: 'Personalizado' } as const;
export type Period = keyof typeof periods;
export type DashboardParams = { periodo?: string | string[]; desde?: string | string[]; hasta?: string | string[] };
function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function readPeriod(params: DashboardParams) {
  const raw = params.periodo ?? 'today';
  const period: Period = typeof raw === 'string' && Object.hasOwn(periods, raw) ? raw as Period : 'today';
  const start = typeof params.desde === 'string' ? params.desde.slice(0, 10) : '';
  const end = typeof params.hasta === 'string' ? params.hasta.slice(0, 10) : '';
  const requested = params.desde !== undefined || params.hasta !== undefined;
  let error = raw !== period ? 'Selecciona un periodo válido.' : '';
  if (period === 'custom' && requested) {
    if (!calendarDate(start) || !calendarDate(end) || start !== params.desde || end !== params.hasta) error = 'Escribe una fecha inicial y una fecha final válidas.';
    else if (start > end) error = 'La fecha final debe ser igual o posterior a la inicial.';
  }
  return { period, start, end, error, ready: !error && (period !== 'custom' || requested) };
}
