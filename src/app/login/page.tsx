import { getSupabaseEnv } from '@/lib/supabase/env';
import { LoginForm } from '@/features/auth/login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-6">
      <section className="rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar a MiBarbería</h1>
        <p className="mt-2 text-sm text-muted-foreground">Usa la cuenta de propietario que te entregó el administrador.</p>
        {getSupabaseEnv()
          ? <LoginForm />
          : <p role="status" className="mt-6 text-sm">El acceso todavía no está configurado. Contacta al administrador para habilitarlo.</p>}
      </section>
    </main>
  );
}
