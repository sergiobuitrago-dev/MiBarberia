export type CatalogKind = 'barbers' | 'services';
export type CatalogState = {
  values: { name: string; amount: string };
  errors: { name?: string; amount?: string };
  message?: string;
};

export function validateCatalog(kind: CatalogKind, rawName: string, rawAmount: string) {
  const name = rawName.trim();
  const value = rawAmount.trim();
  const errors: CatalogState['errors'] = {};
  if (!name || name.length > 120) errors.name = 'Escribe un nombre de 1 a 120 caracteres.';
  const amount = Number(value.replace(',', '.'));
  if (kind === 'barbers') {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value) || !Number.isFinite(amount) || amount < 0 || amount > 100) {
      errors.amount = 'Escribe una comisión entre 0 y 100, con máximo 2 decimales.';
    }
  } else if (!/^\d+$/.test(value) || !Number.isSafeInteger(amount) || amount < 0) {
    errors.amount = 'Escribe un precio entero en pesos, sin puntos ni decimales (máximo 9.007.199.254.740.991).';
  }
  return { name, amount, errors };
}

export function formatCOP(value: number) {
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
}
