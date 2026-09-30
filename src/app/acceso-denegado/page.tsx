import { redirect } from 'next/navigation';
import { getOwnerMembership, requireUser } from '@/lib/auth';
import { LogoutButton } from '@/features/auth/logout-button';

export const dynamic = 'force-dynamic';

export default async function AccessDeniedPage() {
  const { user, supabase } = await requireUser();
  const membership = await getOwnerMembership(supabase, user.id);
  if (membership?.barbershops) redirect('/');
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-6">
      <section className="rounded-xl bg-card p-6">
        <h1 className="text-2xl font-semibold">Acceso no habilitado</h1>
        <p className="mt-4 text-sm text-muted-foreground">Tu cuenta todavía no tiene acceso de propietario a una barbería. Contacta al administrador.</p>
        <LogoutButton />
      </section>
    </main>
  );
}
