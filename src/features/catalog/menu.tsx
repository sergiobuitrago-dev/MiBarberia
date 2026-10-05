import Link from 'next/link';
export function CatalogMenu() {
  return <div className="divide-y overflow-hidden rounded-2xl bg-card">
    {[['/clientes', 'Clientes', 'Nombres, contacto e historial'], ['/mas/barberos', 'Barberos', 'Nombres y comisiones'], ['/mas/servicios', 'Servicios', 'Servicios y precios base']].map(([route, title, detail]) => <Link key={route} href={route} className="flex min-h-24 items-center gap-4 p-5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
      <span className="flex-1"><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{detail}</span></span><span aria-hidden="true">→</span>
    </Link>)}
  </div>;
}
