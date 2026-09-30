'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { customerUuid, validateCustomer, type CustomerState } from './validation';

export async function saveCustomer(id: string, _previous: CustomerState, form: FormData): Promise<CustomerState> {
  const { supabase, barbershop } = await requireOwner();
  const state = validateCustomer(String(form.get('name') ?? ''), String(form.get('phone') ?? ''));
  if (Object.keys(state.errors).length) return state;
  if (!customerUuid.test(id)) return { ...state, message: 'Este cliente no está disponible.' };
  const { data, error } = await supabase.from('customers')
    .update({ name: state.values.name, phone: state.values.phone || null })
    .eq('id', id).eq('barbershop_id', barbershop.id).select('id').maybeSingle();
  if (error) return { ...state, message: 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.' };
  if (!data) return { ...state, message: 'Este cliente no está disponible.' };
  revalidatePath('/clientes', 'layout');
  // Existing visit screens display the customer's current name.
  revalidatePath('/visitas', 'layout');
  redirect(`/clientes/${id}?estado=editado`);
}
