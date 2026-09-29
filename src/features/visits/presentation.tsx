const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota',
});

export function VisitDate({ value }: { value: string }) {
  return <time dateTime={value}>{dateFormatter.format(new Date(value))}</time>;
}

export function VisitStatus({ status }: { status: string }) {
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold tracking-wide ${status === 'VOIDED' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
    {status === 'VOIDED' ? 'ANULADA' : 'ACTIVA'}
  </span>;
}
