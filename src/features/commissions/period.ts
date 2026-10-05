export type WeekParams = { semana?: string | string[]; pagina?: string | string[] };
export function readWeek(params: WeekParams) {
  const date = typeof params.semana === 'string' ? params.semana : undefined;
  const page = params.pagina === undefined ? 1 : Number(params.pagina);
  let error = '';
  if (params.semana !== undefined && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000') ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
    error = 'Selecciona una fecha válida para consultar la semana.';
  } else if (params.pagina !== undefined && (typeof params.pagina !== 'string' || !/^[1-9]\d*$/.test(params.pagina) || !Number.isInteger(page) || page > 2147483647)) {
    error = 'Selecciona una página válida.';
  }
  return { date, page, error };
}
const shortDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export function weekRange(start: string, end: string) {
  // These are calendar dates supplied by PostgreSQL, never browser-local instants.
  const label = (date: string) => {
    const parts = shortDate.formatToParts(new Date(`${date}T00:00:00Z`));
    return `${parts.find(p => p.type === 'day')!.value} ${parts.find(p => p.type === 'month')!.value.slice(0, 3)}`;
  };
  const from = label(start);
  const to = label(end);
  return `${from}${start.slice(0, 4) !== end.slice(0, 4) ? ` ${start.slice(0, 4)}` : ''} – ${to} ${end.slice(0, 4)}`;
}
export function weekHref(base: string, date: string, page = 1) {
  const query = new URLSearchParams({ semana: date });
  if (page !== 1) query.set('pagina', String(page));
  return `${base}?${query}`;
}
