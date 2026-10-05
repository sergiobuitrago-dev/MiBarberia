import { CatalogMenu } from '@/features/catalog/menu';
import { LogoutButton } from '@/features/auth/logout-button';
import { requireOwner } from '@/lib/auth';
export default async function MorePage() {
  const { user } = await requireOwner();
  return <><p className="eyebrow">A tu manera</p><h1 className="page-title">Más</h1><p className="mt-2 mb-7 text-muted-foreground">Clientes, configuración y cuenta.</p><CatalogMenu />
    <section aria-labelledby="account-heading" className="mt-10 border-t pt-5"><h2 id="account-heading" className="text-sm font-medium">Tu cuenta</h2><p className="mt-1 break-words text-sm text-muted-foreground">{user.email}</p><LogoutButton /></section>
  </>;
}
