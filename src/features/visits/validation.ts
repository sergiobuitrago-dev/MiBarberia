export const payments = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro' } as const;
export type Payment = keyof typeof payments;
export type VisitDraft = {
  customerMode: 'occasional' | 'existing' | 'new';
  customerId: string;
  customerName: string;
  customerPhone: string;
  barberId: string;
  items: { service_id: string; charged_price: string }[];
  discount: string;
  payment: Payment;
};
export type VisitState = { errors: Record<string, string>; message?: string };
export const MAX_MONEY = 9007199254740991n;
export function money(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^\d{1,16}$/.test(value)) return null;
  const amount = BigInt(value);
  return amount <= MAX_MONEY ? amount : null;
}
export function validateVisit(value: unknown): { draft?: VisitDraft; errors: Record<string, string> } {
  const errors: Record<string,string> = {};
  if (!value || typeof value !== 'object') return { errors: { form: 'Revisa los datos de la visita.' } };
  const v = value as Partial<VisitDraft>;
  const uuid = (id: unknown) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!uuid(v.barberId)) errors.barber = 'Selecciona un barbero.';
  if (!v.payment || !Object.hasOwn(payments, v.payment)) errors.payment = 'Selecciona un método de pago.';
  if (!['occasional','existing','new'].includes(v.customerMode ?? '')) errors.customer = 'Elige una opción de cliente.';
  if (v.customerMode === 'existing' && !uuid(v.customerId)) errors.customer = 'Selecciona un cliente de los resultados.';
  if (v.customerMode === 'new') {
    if (typeof v.customerName !== 'string' || !v.customerName.trim() || v.customerName.trim().length > 120) errors.customerName = 'Escribe un nombre de 1 a 120 caracteres.';
    if (typeof v.customerPhone !== 'string' || v.customerPhone.trim().length > 30) errors.customerPhone = 'El teléfono debe tener máximo 30 caracteres.';
  }
  let subtotal = 0n;
  const ids = new Set<string>();
  if (!Array.isArray(v.items) || v.items.length < 1 || v.items.length > 100) errors.items = 'Selecciona al menos un servicio (máximo 100).';
  else for (const item of v.items) {
    if (!item || !uuid(item.service_id) || ids.has(item.service_id)) { errors.items = 'Revisa los servicios seleccionados.'; continue; }
    ids.add(item.service_id);
    const price = money(item.charged_price);
    if (price === null) errors[`price-${item.service_id}`] = 'Escribe un precio entero en pesos, sin puntos ni decimales.';
    else subtotal += price;
  }
  if (subtotal > MAX_MONEY) errors.items = 'El subtotal supera el máximo permitido.';
  const discount = money(v.discount);
  if (discount === null) errors.discount = 'Escribe un descuento entero en pesos, igual o mayor que cero.';
  else if (discount > subtotal) errors.discount = 'El descuento no puede superar el subtotal.';
  return Object.keys(errors).length ? { errors } : { draft: v as VisitDraft, errors };
}
export function cop(value: bigint | number | string) {
  return '$' + BigInt(value).toLocaleString('es-CO');
}
