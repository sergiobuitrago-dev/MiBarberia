import 'server-only';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

export async function getOwnerMembership(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from('barbershop_users')
    .select('barbershop_id, barbershops(id, name)')
    .eq('user_id', userId)
    .eq('role', 'OWNER')
    .order('created_at')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('No se pudo verificar el acceso.');
  return data;
}

export async function requireUser() {
  if (!getSupabaseEnv()) redirect('/login');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

export async function requireOwner() {
  const { supabase, user } = await requireUser();
  const membership = await getOwnerMembership(supabase, user.id);
  if (!membership?.barbershops) redirect('/acceso-denegado');
  return { supabase, user, barbershop: membership.barbershops };
}
