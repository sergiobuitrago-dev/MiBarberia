'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function OwnerNavigation() {
  const path = usePathname();
  return <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)]">
    <div className="mx-auto flex max-w-xl p-2">
      {[['/', 'Inicio', '⌂'], ['/visitas', 'Visitas', '≡'], ['/mas', 'Más', '☰']].map(([href, label, icon]) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><span aria-hidden="true" className="text-xl leading-6">{icon}</span><span>{label}</span></Link>;
      })}
    </div>
  </nav>;
}
