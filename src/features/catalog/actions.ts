'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { catalogConfig } from './config';
import { validateCatalog, type CatalogKind, type CatalogState } from './validation';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bound arguments are still untrusted: authenticate and scope every mutation.
export async function saveCatalog(kind: CatalogKind, _previous: CatalogState, form: FormData): Promise<CatalogState> {
  const { supabase, barbershop } = await requireOwner();
  if (kind !== 'barbers' && kind !== 'services') throw new Error('Tipo no válido.');
  const values = { name: String(form.get('name') ?? ''), amount: String(form.get('amount') ?? '') };
  const { name, amount, errors } = validateCatalog(kind, values.name, values.amount);
  if (Object.keys(errors).length) return { values, errors };
  const id = String(form.get('id') ?? '');
  if (id && !uuid.test(id)) return { values, errors: {}, message: 'Este registro no está disponible.' };
  const query = kind === 'barbers'
    ? (id
      ? supabase.from('barbers').update({ name, commission_rate: amount }).eq('id', id).eq('barbershop_id', barbershop.id).eq('is_active', true)
      : supabase.from('barbers').insert({ name, commission_rate: amount, barbershop_id: barbershop.id, is_active: true }))
    : (id
      ? supabase.from('services').update({ name, base_price: amount }).eq('id', id).eq('barbershop_id', barbershop.id).eq('is_active', true)
      : supabase.from('services').insert({ name, base_price: amount, barbershop_id: barbershop.id, is_active: true }));
  const { data, error } = await query.select('id').maybeSingle();
  if (error) return { values, errors: {}, message: 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.' };
  if (!data) return { values, errors: {}, message: 'Este registro ya no está disponible. Vuelve a la lista.' };
  const path = catalogConfig[kind].path;
  revalidatePath(path);
  redirect(`${path}?estado=${id ? 'editado' : 'creado'}`);
}

export async function deactivateCatalog(kind: CatalogKind, id: string, _previous: { message?: string }): Promise<{ message?: string }> {
  void _previous;
  const { supabase, barbershop } = await requireOwner();
  if ((kind !== 'barbers' && kind !== 'services') || !uuid.test(id)) return { message: 'Este registro no está disponible.' };
  const { data, error } = await supabase.from(kind).update({ is_active: false })
    .eq('id', id).eq('barbershop_id', barbershop.id).eq('is_active', true).select('id').maybeSingle();
  if (error || !data) return { message: 'No pudimos desactivar el registro. Vuelve a la lista e inténtalo de nuevo.' };
  revalidatePath(catalogConfig[kind].path);
  redirect(`${catalogConfig[kind].path}?estado=desactivado`);
}
