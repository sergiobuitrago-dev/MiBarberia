'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const entries = [
  { href: '/', label: 'Inicio', path: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z' },
  { href: '/visitas', label: 'Visitas', path: 'M8 3h8v4H8z M8 5H5v16h14V5h-3 M8 12h8 M8 16h5' },
  { href: '/comisiones', label: 'Comisiones', path: 'M4 4h16v16H4z M8 8h8 M8 12h3 M8 16h8 M15 11v3' },
  { href: '/mas', label: 'Más', path: 'M4 6h16 M4 12h16 M4 18h16' },
];
export function OwnerNavigation() {
  const path = usePathname();
  return <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-10 border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom)]">
    <div className="mx-auto flex max-w-xl gap-2 p-2">
      {entries.map(entry => {
        const active = entry.href === '/' ? path === '/' : (path.startsWith(entry.href) || (entry.href === '/mas' && path.startsWith('/clientes')));
        return <Link key={entry.href} href={entry.href} aria-current={active ? 'page' : undefined} className="navigation-item">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={entry.path} /></svg>
          <span>{entry.label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
