import Link from 'next/link';
export function CatalogMenu() {
  return <div className="divide-y overflow-hidden rounded-2xl border bg-card">
    {[['barberos', 'Barberos', 'Nombres y comisiones', '01'], ['servicios', 'Servicios', 'Servicios y precios base', '02']].map(([route, title, detail, number]) => <Link key={route} href={`/mas/${route}`} className="flex min-h-24 items-center gap-4 p-5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
      <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-muted-foreground">{number}</span><span className="flex-1"><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{detail}</span></span><span aria-hidden="true">→</span>
    </Link>)}
  </div>;
}
