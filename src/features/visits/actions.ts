'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { validateVisit, type VisitState } from './validation';
export async function registerVisit(_previous: VisitState, form: FormData): Promise<VisitState> {
  const { supabase } = await requireOwner();
  const payload = form.get('payload');
  if (typeof payload !== 'string' || payload.length > 40000) return { errors: {}, message: 'Revisa los datos de la visita.' };
  let parsed: unknown;
  try { parsed = JSON.parse(payload); } catch { return { errors: {}, message: 'Revisa los datos de la visita.' }; }
  const { draft, errors } = validateVisit(parsed);
  if (!draft) return { errors };
  const { data, error } = await supabase.rpc('create_visit', {
    p_barber_id: draft.barberId,
    p_items: draft.items.map(item => ({ service_id: item.service_id, charged_price: item.charged_price })),
    p_discount_amount: Number(draft.discount),
    p_payment_method: draft.payment,
    ...(draft.customerMode === 'existing' ? { p_customer_id: draft.customerId } : {}),
    ...(draft.customerMode === 'new' ? { p_new_customer: { name: draft.customerName.trim(), phone: draft.customerPhone.trim() || null } } : {}),
  });
  if (error || !data) {
    const messages: Record<string,string> = {
      BARBER_UNAVAILABLE: 'El barbero ya no está disponible. Actualiza la página y elige otro.',
      SERVICE_UNAVAILABLE: 'Un servicio ya no está disponible. Actualiza la página y revisa tu selección.',
      CUSTOMER_UNAVAILABLE: 'El cliente ya no está disponible. Actualiza la página y revisa tu selección.',
      DISCOUNT_EXCEEDS_SUBTOTAL: 'El descuento no puede superar el subtotal.',
    };
    return { errors: {}, message: messages[error?.message ?? ''] ?? 'No pudimos registrar la visita. Intenta nuevamente.' };
  }
  revalidatePath('/');
  revalidatePath('/(owner)/comisiones', 'layout');
  revalidatePath('/visitas');
  redirect(`/visitas/${data}/exito`);
}

export async function voidVisit(id: string, _previous: { message?: string }): Promise<{ message?: string }> {
  void _previous;
  const { supabase } = await requireOwner();
  const unavailable = { message: 'No pudimos anular esta visita. Actualiza el detalle para comprobar su estado.' };
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return unavailable;
  // RPC is the only write path; it derives the tenant independently.
  const { data, error } = await supabase.rpc('void_visit', { p_visit_id: id });
  if (error || !data) return unavailable;
  revalidatePath('/');
  revalidatePath('/(owner)/comisiones', 'layout');
  revalidatePath('/visitas');
  revalidatePath(`/visitas/${data}`);
  revalidatePath(`/visitas/${data}/exito`);
  redirect(`/visitas/${data}`);
}
