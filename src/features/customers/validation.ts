export type CustomerState = {
  values: { name: string; phone: string };
  errors: { name?: string; phone?: string };
  message?: string;
};
export function validateCustomer(name: string, phone: string): CustomerState {
  const values = { name: name.trim(), phone: phone.trim() };
  const errors: CustomerState['errors'] = {};
  if (!values.name || values.name.length > 120) errors.name = 'Escribe un nombre de hasta 120 caracteres.';
  if (values.phone.length > 30) errors.phone = 'El teléfono debe tener hasta 30 caracteres.';
  return { values, errors };
}
export function customerPage(value: string | string[] | undefined) {
  const page = typeof value === 'string' && /^\d{1,6}$/.test(value) ? Number(value) : 1;
  return page >= 1 && page <= 100000 ? page : 1;
}
export const customerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
