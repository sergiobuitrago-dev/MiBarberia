import { Wordmark } from '@/components/ui/wordmark';
import { requireOwner } from '@/lib/auth';
import { OwnerNavigation } from '@/features/catalog/navigation';
export const dynamic = 'force-dynamic';
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { barbershop } = await requireOwner();
  return <div className="min-h-svh">
    <a href="#contenido" className="sr-only focus:not-sr-only focus:block focus:p-3">Ir al contenido</a>
    <header className="border-b bg-card"><div className="mx-auto flex max-w-xl items-center justify-between gap-4 px-5 py-5"><Wordmark /><span className="max-w-[55%] truncate text-xs text-muted-foreground">{barbershop.name}</span></div></header>
    <main id="contenido" className="mx-auto max-w-xl px-5 pt-7 pb-32">{children}</main>
    <OwnerNavigation />
  </div>;
}
