'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getOwnerMembership } from '@/lib/auth';
import { getSupabaseEnv } from '@/lib/supabase/env';
import type { LoginState, LogoutState } from './state';

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const emailValue = formData.get('email');
  const passwordValue = formData.get('password');
  const email = typeof emailValue === 'string' ? emailValue.trim() : '';
  const password = typeof passwordValue === 'string' ? passwordValue : '';
  const fieldErrors: NonNullable<LoginState['fieldErrors']> = {};
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Escribe un correo electrónico válido.';
  if (!password) fieldErrors.password = 'Escribe tu contraseña.';
  else if (password.length > 1024) fieldErrors.password = 'La contraseña es demasiado larga.';
  if (Object.keys(fieldErrors).length) return { email: email.slice(0, 254), fieldErrors };
  if (!getSupabaseEnv()) return { email, error: 'El acceso todavía no está configurado. Contacta al administrador.' };

  let hasMembership = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      const message = error?.status === 429
        ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
        : error && error.status && error.status >= 500
          ? 'No pudimos conectar. Inténtalo de nuevo.'
          : 'Correo o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.';
      return { email, error: message };
    }
    const membership = await getOwnerMembership(supabase, data.user.id);
    hasMembership = Boolean(membership?.barbershops);
  } catch {
    return { email, error: 'No pudimos verificar el acceso. Inténtalo de nuevo.' };
  }
  revalidatePath('/', 'layout');
  redirect(hasMembership ? '/' : '/acceso-denegado');
}

export async function signOut(): Promise<LogoutState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) return { error: 'No pudimos cerrar la sesión. Inténtalo de nuevo.' };
  } catch {
    return { error: 'No pudimos cerrar la sesión. Inténtalo de nuevo.' };
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}
